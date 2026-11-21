#!/usr/bin/env python
import os
from flask import Flask, make_response, jsonify, request, send_from_directory, redirect, url_for
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson.json_util import dumps
import logging
from collections import defaultdict
import copy
import re
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)
app = Flask(__name__)
CORS(app)

import sys

from flask import request

import secrets
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(16)  # not used for sessions; set SECRET_KEY to pin it
# One process serves one browser. Defaults = Service Registry Browser (srb);
# the prescription browser (ptb) runs with MONGO_URI=.../ptb, EDGES_COLLECTION=edges_2500_cap, DIST_DIR=.../ptb
app.config["MONGO_URI"] = os.environ.get("MONGO_URI", "mongodb://mongodb:27017/srb")
EDGES_COLLECTION = os.environ.get("EDGES_COLLECTION", "edges")
NODES_COLLECTION = os.environ.get("NODES_COLLECTION", "nodes")
# How Men/Women is applied:
#   "edge"          (srb) edges belong to one sex -> filter on data.gender_trajectories
#   "patient_count" (ptb) edges are shared -> filter on male_/female_patient_count instead
SEX_MODE = os.environ.get("SEX_MODE", "edge")
# Number of leading code characters that identify a chapter (srb: '80…' -> 2, ptb ATC 'N06AB' -> 1)
CHAPTER_PREFIX_LEN = int(os.environ.get("CHAPTER_PREFIX_LEN", "2"))


def apply_sex(match, gender):
    """Adapt an edge $match built for srb to the configured SEX_MODE."""
    if SEX_MODE != "patient_count":
        return match
    match = dict(match)
    match.pop("data.gender_trajectories", None)
    if "data.patient_count" in match:
        field = {"male": "data.male_patient_count", "female": "data.female_patient_count"}.get(gender, "data.patient_count")
        match[field] = match.pop("data.patient_count")
    return match
mongo = PyMongo(app)

DIST_DIR = os.environ.get("DIST_DIR", '/home/app/dist/srb')

import gzip
import json
import threading
from collections import OrderedDict

# ---------------------------------------------------------------------------
# Performance helpers
# ---------------------------------------------------------------------------

def ensure_indexes():
    """Create the indexes the query routes rely on (idempotent, runs once in background)."""
    specs = {
        "edges": [
            [("data.trajectory_list", 1), ("data.gender_trajectories", 1), ("data.trajectory_length", 1)],
            [("data.trajectory", 1), ("data.gender_trajectories", 1)],
            [("data.shared_name", 1), ("data.gender_trajectories", 1)],
        ],
        "nodes": [
            [("data.SUID", 1)],
            [("data.shared_name", 1)],
            [("data.id", 1)],
            [("data.gender_trajectories", 1)],
        ],
    }
    names = {"edges": EDGES_COLLECTION, "nodes": NODES_COLLECTION}
    for coll, indexes in specs.items():
        for keys in indexes:
            try:
                mongo.db[names[coll]].create_index(keys)
            except Exception as e:  # e.g. an equivalent index already exists under another name
                logger.warning("index %s on %s not created: %s", keys, coll, e)

threading.Thread(target=ensure_indexes, daemon=True).start()


class ResponseCache:
    """Tiny thread-safe LRU cache. The trajectory data is static, so identical
    requests (same filters / page) can be answered from memory."""

    def __init__(self, maxsize=128):
        self.maxsize = maxsize
        self._data = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key):
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
                return self._data[key]
        return None

    def set(self, key, value):
        with self._lock:
            self._data[key] = value
            self._data.move_to_end(key)
            while len(self._data) > self.maxsize:
                self._data.popitem(last=False)
        return value


response_cache = ResponseCache(maxsize=128)
trajectory_cache = ResponseCache(maxsize=256)


# ---------------------------------------------------------------------------
# Compact edge index for /network (ptb)
# ---------------------------------------------------------------------------
# A broad code (e.g. N02BE) matches ~300k of ptb's 2.2M edges, twice per /network
# request; with the 1.2 GB collection larger than Mongo's cache that takes 20-45 s.
# The data is static, so the trajectory/edge filtering is done in Python on a
# compact binary index (~100 MB) built once from Mongo and memory-mapped, so all
# gunicorn workers share one copy. Only the chosen edges are then read from Mongo.
# Results equal the Mongo pipeline: same filters, and per shared_name the first
# edge in (trajectory, natural) order, which is what $group/$first returns when
# scanning the data.trajectory index.
# Only used when SEX_MODE=patient_count (ptb), so srb keeps its exact code path.
import fcntl
import mmap
import struct
import tempfile
import time
from array import array

NETWORK_INDEX = os.environ.get("NETWORK_INDEX", "1" if SEX_MODE == "patient_count" else "0") == "1"


class EdgeIndex:
    MAGIC = b"NETIDX01"
    # name -> array typecode. Arrays are stored in this order in the file.
    ARRAYS = [
        ("traj_off", "I"),    # [T+1] offsets into traj_codes (trajectories sorted by name)
        ("traj_codes", "H"),  # code ids of each trajectory
        ("edge_off", "I"),    # [T+1] offsets into the per-edge arrays (edges grouped by trajectory)
        ("inv_off", "I"),     # [C+1] offsets into inv_tids
        ("inv_tids", "I"),    # trajectory ids containing each code (ascending)
        ("pc", "I"), ("mpc", "I"), ("fpc", "I"),  # patient_count, male_, female_
        ("rr", "d"),          # relativerisk
        ("pair", "H"),        # shared_name id
        ("oid", "B"),         # 12-byte ObjectId per edge
    ]

    def __init__(self, path):
        with open(path, "rb") as f:
            self._mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        if self._mm[:8] != self.MAGIC:
            raise ValueError("bad index file")
        hlen = struct.unpack("<Q", self._mm[8:16])[0]
        self.header = json.loads(self._mm[16:16 + hlen])
        view = memoryview(self._mm)
        for name, (tc, off, n) in self.header["arrays"].items():
            size = array(tc).itemsize
            setattr(self, name, view[off:off + n * size].cast(tc))
        self.codes = self.header["codes"]
        self.code_id = {c: i for i, c in enumerate(self.codes)}
        self.count = self.header["count"]

    # -- build ---------------------------------------------------------------
    @classmethod
    def build(cls, coll, path):
        t0 = time.time()
        traj_tmp = {}                      # trajectory -> temporary id (scan order)
        pair_id = {}
        e_traj = array("I")
        cols = {k: array(tc) for k, tc in cls.ARRAYS[5:]}
        proj = {"data.trajectory": 1, "data.shared_name": 1, "data.patient_count": 1,
                "data.male_patient_count": 1, "data.female_patient_count": 1,
                "data.relativerisk": 1}
        nan = float("nan")
        for d in coll.find({}, proj, batch_size=20000).hint([("$natural", 1)]):
            x = d["data"]
            e_traj.append(traj_tmp.setdefault(x["trajectory"], len(traj_tmp)))
            cols["pc"].append(int(x["patient_count"]))
            cols["mpc"].append(int(x["male_patient_count"]))
            cols["fpc"].append(int(x["female_patient_count"]))
            rr = x.get("relativerisk")
            cols["rr"].append(rr if isinstance(rr, (int, float)) else nan)
            cols["pair"].append(pair_id.setdefault(x["shared_name"], len(pair_id)))
            cols["oid"].frombytes(d["_id"].binary)

        # Final trajectory ids in sorted name order (= order of the data.trajectory index)
        names = sorted(traj_tmp)
        final = array("I", bytes(4 * len(names)))
        for i, name in enumerate(names):
            final[traj_tmp[name]] = i
        del traj_tmp

        # Group edges by trajectory, keeping natural order inside a trajectory
        n_edges = len(e_traj)
        edge_off = array("I", bytes(4 * (len(names) + 1)))
        for t in e_traj:
            edge_off[final[t] + 1] += 1
        for i in range(len(names)):
            edge_off[i + 1] += edge_off[i]
        cursor = array("I", edge_off[:-1])
        perm = array("I", bytes(4 * n_edges))
        for j, t in enumerate(e_traj):
            ft = final[t]
            perm[cursor[ft]] = j
            cursor[ft] += 1
        del e_traj, cursor, final
        out = {}
        for k, col in cols.items():
            if k == "oid":
                out[k] = array("B", b"".join(col[j * 12:(j + 1) * 12].tobytes() for j in perm))
            else:
                out[k] = array(col.typecode, (col[j] for j in perm))
        del cols, perm

        # Trajectory codes and the code -> trajectories inverted index
        codes = sorted({c for name in names for c in name.split("_")})
        cid = {c: i for i, c in enumerate(codes)}
        traj_off = array("I", [0])
        traj_codes = array("H")
        postings = [array("I") for _ in codes]
        for t, name in enumerate(names):
            ids = [cid[c] for c in name.split("_")]
            traj_codes.extend(ids)
            traj_off.append(len(traj_codes))
            for i in set(ids):
                postings[i].append(t)
        inv_off = array("I", [0])
        inv_tids = array("I")
        for p in postings:
            inv_tids.extend(p)
            inv_off.append(len(inv_tids))
        out.update(traj_off=traj_off, traj_codes=traj_codes, edge_off=edge_off,
                   inv_off=inv_off, inv_tids=inv_tids)

        # Write: magic | header length | JSON header | 8-byte aligned arrays
        rel, off = {}, 0
        for name, tc in cls.ARRAYS:
            rel[name] = off
            off += (len(out[name]) * out[name].itemsize + 7) // 8 * 8
        base = 0
        while True:  # the header holds absolute offsets, so its length depends on base
            arrays = {name: [tc, base + rel[name], len(out[name])] for name, tc in cls.ARRAYS}
            hbytes = json.dumps({"count": n_edges, "codes": codes, "arrays": arrays}).encode()
            if 16 + len(hbytes) <= base:
                break
            base = (16 + len(hbytes) + 7) // 8 * 8 + 64
        tmp = path + ".tmp%d" % os.getpid()
        with open(tmp, "wb") as f:
            f.write(cls.MAGIC + struct.pack("<Q", len(hbytes)) + hbytes)
            for name, tc in cls.ARRAYS:
                f.seek(arrays[name][1])
                f.write(out[name].tobytes())
        os.replace(tmp, path)
        logger.warning("network index: %d edges, %d trajectories built in %.1fs -> %s",
                       n_edges, len(names), time.time() - t0, path)

    # -- queries -------------------------------------------------------------
    def matching_trajectories(self, codes, min_len, max_len, pc_field, min_pc, max_pc, min_rr, max_rr):
        """{name: id} of trajectories containing all codes, with length in range and at
        least one edge with patient count and relative risk in range (= /network's first $match)."""
        ids = [self.code_id.get(c) for c in set(codes)]
        if not ids or None in ids:
            return {}
        inv_off, inv_tids = self.inv_off, self.inv_tids
        postings = sorted((inv_tids[inv_off[i]:inv_off[i + 1]] for i in ids), key=len)
        cand = postings[0]
        for other in postings[1:]:
            other = set(other)
            cand = [t for t in cand if t in other]
        traj_off, edge_off, rr = self.traj_off, self.edge_off, self.rr
        pc = {"male": self.mpc, "female": self.fpc}.get(pc_field, self.pc)
        names, codes_arr, code_names = {}, self.traj_codes, self.codes
        for t in cand:
            a, b = traj_off[t], traj_off[t + 1]
            if not (min_len <= b - a <= max_len):
                continue
            for j in range(edge_off[t], edge_off[t + 1]):
                if min_pc <= pc[j] <= max_pc and min_rr <= rr[j] <= max_rr:
                    names["_".join([code_names[c] for c in codes_arr[a:b]])] = t
                    break
        return names

    def cooccurring_codes(self, codes):
        """All codes appearing in a trajectory together with every code in `codes`."""
        ids = [self.code_id.get(c) for c in set(codes)]
        if not ids or None in ids:
            return set()
        inv_off, inv_tids = self.inv_off, self.inv_tids
        postings = sorted((inv_tids[inv_off[i]:inv_off[i + 1]] for i in ids), key=len)
        cand = postings[0]
        for other in postings[1:]:
            other = set(other)
            cand = [t for t in cand if t in other]
        traj_off, traj_codes = self.traj_off, self.traj_codes
        found = set()
        for t in cand:
            found.update(traj_codes[traj_off[t]:traj_off[t + 1]])
        return {self.codes[c] for c in found}

    def first_edge_ids(self, tids):
        """ObjectIds of the first edge per shared_name over the given trajectory ids,
        in (trajectory, natural) order (= /network's second pipeline $group/$first)."""
        from bson import ObjectId
        seen, out = set(), []
        edge_off, pair, oid = self.edge_off, self.pair, self.oid
        for t in sorted(tids):
            for j in range(edge_off[t], edge_off[t + 1]):
                p = pair[j]
                if p not in seen:
                    seen.add(p)
                    out.append(ObjectId(oid[j * 12:(j + 1) * 12].tobytes()))
        return out


_edge_index = None


def load_edge_index():
    """Load (building it first if needed) the edge index; runs once in the background."""
    global _edge_index
    db_name = mongo.db.name
    path = os.environ.get("NETWORK_INDEX_PATH") or os.path.join(
        tempfile.gettempdir(), "network_index_%s_%s.bin" % (db_name, EDGES_COLLECTION))
    coll = mongo.db[EDGES_COLLECTION]
    try:
        count = coll.estimated_document_count()
        with open(path + ".lock", "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)  # one worker builds, the others wait and load
            try:
                idx = EdgeIndex(path)
                if idx.count != count:
                    raise ValueError("stale index")
            except (OSError, ValueError):
                EdgeIndex.build(coll, path)
                idx = EdgeIndex(path)
        _edge_index = idx
    except Exception as e:
        logger.warning("network index unavailable, using Mongo: %s", e)


if NETWORK_INDEX:
    threading.Thread(target=load_edge_index, daemon=True).start()


cooccurrence_cache = ResponseCache(maxsize=256)


def cooccurring_codes(codes, gender):
    """Codes that share at least one trajectory with all of `codes` (for the active sex),
    i.e. the codes that can still narrow down the current search."""
    codes = sorted(set(c for c in codes if c))
    key = gender + ":" + ",".join(codes)
    cached = cooccurrence_cache.get(key)
    if cached is not None:
        return cached
    edge_index = _edge_index if NETWORK_INDEX else None
    if edge_index is not None:
        found = edge_index.cooccurring_codes(codes)
    else:
        gender_condition = {"$eq": gender} if gender in ["male", "female"] else {"$ne": "all"}
        query = apply_sex({"data.trajectory_list": {"$all": codes},
                           "data.gender_trajectories": gender_condition}, gender)
        found = set(mongo.db[EDGES_COLLECTION].distinct("data.trajectory_list", query))
    return cooccurrence_cache.set(key, found)


def clean_shared_name(name):
    """'NoneS01AE (pp) NoneJ07BA' -> 'S01AE (pp) J07BA' (ptb data); unchanged for srb."""
    return name.replace("None", "") if isinstance(name, str) else name


def cache_key(route, body, drop=()):
    body = {k: v for k, v in (body or {}).items() if k not in drop}
    return route + ":" + json.dumps(body, sort_keys=True, default=str)


_gzip_static_cache = {}  # hashed bundle path -> gzipped bytes (contents never change)


@app.after_request
def compress_and_cache(response):
    """gzip text responses and let browsers cache hashed static bundles."""
    path = request.path
    if response.status_code == 200 and re.search(r"\.[0-9a-f]{16,}\.(js|css)$", path):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=86400"
    elif path == "/" or path.endswith(".html"):
        response.headers["Cache-Control"] = "no-cache"

    if (response.status_code < 200 or response.status_code >= 300
            or "gzip" not in request.headers.get("Accept-Encoding", "").lower()
            or "Content-Encoding" in response.headers):
        return response
    mimetype = response.mimetype or ""
    if not (mimetype.startswith("text/") or mimetype in (
            "application/json", "application/javascript", "image/svg+xml")):
        return response

    immutable = response.headers.get("Cache-Control", "").endswith("immutable")
    compressed = _gzip_static_cache.get(path) if immutable else None
    if compressed is None:
        response.direct_passthrough = False  # send_from_directory streams files
        data = response.get_data()
        if len(data) < 1024:
            return response
        compressed = gzip.compress(data, compresslevel=6 if immutable else 5)
        if immutable:
            _gzip_static_cache[path] = compressed
    response.direct_passthrough = False
    response.set_data(compressed)
    response.headers["Content-Encoding"] = "gzip"
    response.headers["Content-Length"] = str(len(response.get_data()))
    response.vary.add("Accept-Encoding")
    return response

#fejl med at vi omdøber source og target til de forkerte noder sådan at de peger på de forskellige noder
def expand_trajectories(json_response):
    trajectories = json_response

    nodes = trajectories["elements"]["nodes"]
    edges = trajectories["elements"]["edges"]
    edge_mapper = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    for edge in edges:
        data = edge["data"]
        data["shared_name"] = clean_shared_name(data["shared_name"])
        edge_mapper[data.get("gender_trajectories")][data["trajectory"]][data["shared_name"]] = {"data":data}
    node_mapper = defaultdict(dict)
    for node in nodes:
        data = node["data"]
        node_mapper[data["id"]] = {"data":data}

    trajectories = list(set([(edge["data"]["trajectory"],edge["data"].get("gender_trajectories")) for edge in edges]))
    newNodes = []
    newEdges = []

    for i, traj in enumerate(trajectories):
        steps = traj[0].split("_")
        length = len(steps)
        
        for j, step in enumerate(steps):
            if j == length - 1:
                break

            shared_name = f"{step} (pp) {steps[j+1]}"
            newEdge = edge_mapper[traj[1]][traj[0]][shared_name]["data"]

            # Parse source and target base IDs
            source, sC = newEdge["source"].split("@") if "@" in newEdge["source"] else [newEdge["source"], 0]
            target, sT = newEdge["target"].split("@") if "@" in newEdge["target"] else [newEdge["target"], 0]

            # Deepcopy nodes to avoid mutating originals
            source_node_data = dict(node_mapper[source]["data"])
            target_node_data = dict(node_mapper[target]["data"])

            # Assign unique IDs for this trajectory iteration
            source_node_data["id"] = f"{source}@{i}"
            target_node_data["id"] = f"{target}@{i}"

            # Append nodes to newNodes
            newNodes.append({"data": source_node_data})
            newNodes.append({"data": target_node_data})

            # Update edge to point to new node IDs
            newEdge_copy = dict(newEdge)  # copy to avoid mutating the original edge
            newEdge_copy["source"] = source_node_data["id"]
            newEdge_copy["target"] = target_node_data["id"]

            newEdges.append({"data": newEdge_copy})

    json_response["elements"]["nodes"] = newNodes
    json_response["elements"]["edges"] = newEdges

    return json_response


sys.stdout = open("flask_output.log", "a")
sys.stderr = sys.stdout

import re
import string

def is_numeric_regex(pattern_str: str) -> bool:
    """Return True if the pattern looks like a numeric regex (digits + safe regex symbols)."""
    try:
        re.compile(pattern_str)  # check valid regex
    except re.error:
        return False

    allowed_symbols = set("^$+*?{}[]()|\\._")  # regex metacharacters + underscore
    allowed_digits = set(string.digits)

    for ch in pattern_str:
        if ch.isalpha():  # letters not allowed
            return False
        if ch not in allowed_digits and ch not in allowed_symbols:
            return False

    return True

@app.route('/search', methods=['GET'])
def search():
    raw_query = request.args.get('q', '').strip()
    query = re.escape(raw_query)
    gender = request.args.get('g','')
    # Codes already in the search bar: only suggest codes that share a trajectory with all of them
    selected = [c for c in request.args.get('with', '').split(',') if c]
    nodes = mongo.db[NODES_COLLECTION]

    if gender in ["male","female"]:
        gender_condition = {"$eq":gender}
    else:
        gender_condition = {"$ne": "all"}

    match_stage = {
        "$or": [
            {"data.chapter_description": {"$regex": f"^{query}", "$options": "i"}},
            {"data.shared_name": {"$regex": f"^{query}", "$options": "i"}},
            {"data.diagnose_text": {"$regex": f"{query}", "$options": "i"}},
            {"data.chapter_shared_name": {"$regex": re.escape(raw_query.replace(' ','')), "$options": "i"}},
            {"data.subgroup": {"$regex": query, "$options": "i"}},
        ],
        "data.gender_trajectories":gender_condition
    }
    if selected:
        allowed = cooccurring_codes(selected, gender) - set(selected)
        match_stage["data.shared_name"] = {"$in": sorted(allowed)}



    pipeline = [
        {"$match": match_stage},
        {"$project": {
            "data.shared_name": 1,
            "data.diagnose_text": 1,
            "data.chapter": 1,
            "data.fn": {
                "$concat": [
                    {"$ifNull": ["$data.chapter_description", ""]},
                    " : ",
                    # ptb: "<drug group description> (<ATC code>)"; srb: service text
                    {"$cond": [
                        {"$ifNull": ["$data.subgroup", False]},
                        {"$concat": ["$data.subgroup", " (", "$data.shared_name", ")"]},
                        "$data.diagnose_text",
                    ]},
                ]
            }

        }},
        {"$group": {"_id": "$data.shared_name", "fn": {"$first": "$data.fn"}}},
        {"$sort": {"fn": 1}},
        {"$limit": 20}
    ]


    key = f"search:{gender}:{raw_query.lower()}:{','.join(sorted(selected))}"
    cached = response_cache.get(key)
    if cached is not None:
        return app.response_class(cached, mimetype="application/json")
    response = dumps(list(nodes.aggregate(pipeline)))
    response_cache.set(key, response)
    return app.response_class(response, mimetype="application/json")


@app.route('/test_mongo')
def test_mongo():
    try:
        nodes_count = mongo.db[NODES_COLLECTION].count_documents({})
        edges_count = mongo.db[EDGES_COLLECTION].count_documents({})
        return f"Connected! Nodes: {nodes_count}, Edges: {edges_count}"
    except Exception as e:
        return f"Connection failed: {e}"


@app.route('/finddropdown', methods=['POST'])
def find_linear_dropdown():
    ## Business logic
    nodes = mongo.db[NODES_COLLECTION] # node collection
    edges = mongo.db[EDGES_COLLECTION] # edge collection

    min_linear_length = 2
    max_linear_length = 18
    min_ppl_count = 5
    max_ppl_count = 4000000
    min_ch = 1
    max_ch = 25
    min_rr = 1.0
    max_rr = 62.0
    
    # HTTP request
    gender = request.json['g']      # g = gender
    registry_code = request.json['c']   # c = codes
    service_registry_codes = registry_code.split(",")

    ll_body = request.json['l']         # l = linear length
    pc_body = request.json['p']         # p = patient cound
    chapters = request.json['ch']         # ch = chapters
    rr_body = request.json['r']         # r = relative risk

    #############
    #   EDGES   #
    #############

    # Split requsts into variables
    if not ll_body == None:
        ll_body = ll_body.split(',')
        min_linear_length = int(ll_body[0])
        max_linear_length = int(ll_body[1])

    if not pc_body == None:
        pc_body = pc_body.split(',')
        min_ppl_count = int(pc_body[0])
        max_ppl_count = int(pc_body[1])
    
    if not rr_body == None:
        rr_body = rr_body.split(',')
        min_rr = float(rr_body[0])
        max_rr = float(rr_body[1])
    
    if not chapters == None:
        chapters = chapters.split(',')
        min_ch = int(chapters[0])
        max_ch = int(chapters[1])

    if gender in ["male","female"]:
        gender_condition = {"$eq":gender}
    else:
        gender_condition = {"$ne": "all"}

    match_stage = {
        "data.trajectory_list": { "$all": service_registry_codes },
        "data.trajectory_length": {
            "$gte": min_linear_length,
            "$lte": max_linear_length
        },
        "data.patient_count": {
            "$gte": min_ppl_count,
            "$lte": max_ppl_count
        },
        "data.relativerisk": {
            "$gte": min_rr,
            "$lte": max_rr
        },
        "data.gender_trajectories": gender_condition
    }
    match_stage = apply_sex(match_stage, gender)

    # Get all the unique edges with a IDs from icd10 code
    find_edges_with_code_in_trajectory_pipeline = [
        {
            "$match": {
                "match":match_stage
            }
        },
        {
            "$project": {
                "_id": 0,
                "data.id": 1,
                "data.shared_name": 1,
                "data.source": 1,
                "data.target": 1,
                "data.time_days_delta":1,
            }
        }
    ]
    results = list(edges.aggregate(find_edges_with_code_in_trajectory_pipeline))
    unique_shared_name_edge_results = set()
    all_edges_results = list()
    nodes_ids_set = set()

    # Remove all duplicate edges on shared_name
    for result in results:
        result['data']['shared_name'] = clean_shared_name(result['data']['shared_name'])
        if result['data']['shared_name'] not in unique_shared_name_edge_results:
            # Temp unique set of all 'seen' edges
            unique_shared_name_edge_results.add(result['data']['shared_name'])

            # Grab source and target ID's for later use while querying nodes
            nodes_ids_set.add(result['data']['source'])
            nodes_ids_set.add(result['data']['target'])

            # Change source and target from ID number to shared_name (ICD-10 code)
            source_target = result['data']['shared_name'].split(' (pp) ')
            result['data']['source'] = source_target[0]
            result['data']['target'] = source_target[1]

            # Resulting list of edges
            all_edges_results.append(result)

    #############
    #   NODES   #
    #############
    # Get all nodes from edge source and target shared_names
    find_all_nodes_from_edge_source_target_pipeline = [
        {
            "$match": {
                "data.SUID": { "$in": list(nodes_ids_set) }
            }
        },
        {
            "$group": {
                "_id":  "$data.shared_name",
                "shared_name": { "$first": "$data.shared_name" },
                "full_name": { "$first": "$data.full_name" }
            }
        },
        {
            "$project": {
                "_id": 0
            }
        }


    ]
    all_nodes = nodes.aggregate(find_all_nodes_from_edge_source_target_pipeline)

    all_nodes_results = list(all_nodes)
    response = dumps(all_nodes_results)

    # Return response
    return response

@app.route('/findnode', methods=['POST'])
def find_in_linear():
    print("find in linear")
    # Default values
    min_linear_length = 2
    max_linear_length = 6
    min_rr = 0
    max_rr = 1000
    min_ppl_count = 5
    max_ppl_count = 4000000
    page_number = 0     # Used for keeping track of pages
    num_entries = 10    # Used for number of trajectories shown

    # HTTP request
    gender = request.json['g']      # g = gender
    icd10code = request.json['c']   # c = codes
    find_node = request.json['f']   # f = find node

    icd10codes = icd10code.replace(',','|')
    ll_body = request.json['l']         # l = linear length
    rr_body = request.json['r']         # r = relative risk
    pc_body = request.json['p']         # p = patient cound
    page_number = request.json['pn']    # p = page number
    page_number = page_number+1         # Page numbers start from 0 (frontend)
    num_entries = request.json['ps']    # ps = page size

    # Split requsts into variables
    if not ll_body == None:
        ll_body = ll_body.split(',')
        min_linear_length = int(ll_body[0])
        max_linear_length = int(ll_body[1])

    if not ll_body == None:
        rr_body = rr_body.split(',')
        min_rr = float(rr_body[0])
        max_rr = float(rr_body[1])

    if not pc_body == None:
        pc_body = pc_body.split(',')
        min_ppl_count = int(pc_body[0])
        max_ppl_count = int(pc_body[1])

    if gender in ["male","female"]:
        gender_condition = {"$eq":gender}
    else:
        gender_condition = {"$ne": "all"}


    ## Business logic
    nodes = mongo.db[NODES_COLLECTION] # node collection
    edges = mongo.db[EDGES_COLLECTION] # edge collection

    # Get all the trajectories in edges with a IDs in the above list
    find_edges_with_code_in_trajectory_pipeline = [
        {
            "$match": {
                "data.gender_trajectories" : gender_condition,
                "$and": [
                    {
                        "data.trajectory": {
                            "$regex": icd10codes
                        }
                    },
                    {
                        "data.trajectory": {
                            "$regex": find_node
                        }
                    }
                ],
                "data.relativerisk": {
                    "$gt": min_rr,
                    "$lt": max_rr
                },
                "$or": [
                    {
                        "data.patient_count": {
                            "$gte": min_ppl_count,
                            "$lte": max_ppl_count
                        }
                    },
                    {
                        "data.patient_count":{
                            "$eq": "N/A"
                        }
                    }
                ],
                "data.trajectory_length":
                    {
                        "$gte": min_linear_length,
                        "$lte": max_linear_length
                    }
            }
        },
        {
            "$project": {
                '_id': 0,
                "data.trajectory": 1
            }
        }
    ]
    results = list(edges.aggregate(find_edges_with_code_in_trajectory_pipeline))
    parsed_trajectories_sorted_unique = sorted(list(set(map(map_trajectories, results))))

    # Pagination of trajectories to show
    paginated_trajectories = parsed_trajectories_sorted_unique[num_entries*(page_number-1):num_entries*page_number]

    # Get all edges in trajectories filtering on relative risk, patient count, linear length and gender
    find_all_edges_from_trajectories_pipeline = [
        {
            "$match": {
                "data.trajectory": {
                    "$in": paginated_trajectories
                },
                "data.relativerisk": {
                    "$gt": min_rr,
                    "$lt": max_rr
                },
                "$or": [
                    {
                        "data.patient_count": {
                            "$gte": min_ppl_count,
                            "$lte": max_ppl_count
                        }
                    },
                    {
                        "data.patient_count":{
                            "$eq": "N/A"
                        }
                    }
                ],
                "data.trajectory_length":
                    {
                        "$gte": min_linear_length,
                        "$lte": max_linear_length
                    },
                "data.gender_trajectories":gender_condition
            }
        },
        {
            "$project": {
                "_id": 0,
                "data.id": "$data.SUID",
                "data.gender": "$data.gender_trajectories",
                "data.patient_count": 1,
                "data.relativerisk": 1,
                "data.source": 1,
                "data.target": 1,
                "data.trajectory": 1,
                "data.time_days_delta":1,
            }
        },
        {
            "$sort": {
                "data.trajectory": 1
            }
        }
    ]
    # All edges with data
    all_edges = edges.aggregate(find_all_edges_from_trajectories_pipeline).limit(10)
    all_edges_results = list(all_edges)

    unique_trajectories = set()
    for edge in results:
        #print(edge)
        unique_trajectories.add(edge['data']['trajectory'])


    # Get source and target IDs
    source_ids = set(map(map_source, all_edges_results))
    target_ids = set(map(map_target, all_edges_results))
    node_ids_from_edges = list(set.union(source_ids,target_ids))

    # Get all nodes from edge source and target ids
    find_all_nodes_from_edge_source_target_ids_pipeline = [
        {
            "$match": {
                "data.id": { "$in": node_ids_from_edges }
            }
        },
        {
            "$project": {
                "_id": 0,
                "data.id": 1,
                "data.shared_name": 1,
                "data.gender": "$data.gender_trajectories",
                "data.color": 1,
                "data.full_name": "$data.diagnose_text",
                "position.x": 1,
                "position.y": 1
            }
        },
        #{
        #    "$sort": {
        #        "data.trajectory": 1,
        #        "data.linear_degree": 1
        #    }
        #}
    ]
    all_nodes = nodes.aggregate(find_all_nodes_from_edge_source_target_ids_pipeline)
    all_nodes_results = list(all_nodes)


    # Combine nodes and edges
    respose_package = dict()
    respose_package['elements'] = {}
    respose_package['elements']['edges'] = all_edges_results
    respose_package['elements']['nodes'] = all_nodes_results
    respose_package['num_trajectories'] = len(unique_trajectories)
    json_response = respose_package

    # Return response
    return dumps(json_response)

def remove_subtrajectories(data):
    # group per sex (srb: male/female; datasets without a sex field: one group)
    groups = defaultdict(list)
    for x in data:
        groups[x[1]].append(x[0].split("_"))

    def remove_subs(trajectories):
        # Build trie
        Trie = lambda: defaultdict(Trie)
        trie = Trie()
        for traj in trajectories:
            node = trie
            for step in traj:
                node = node[step]
            node["_end_"] = True  # mark end of trajectory

        # Collect only trajectories that are not prefix of others
        def dfs(node, path, results):
            if "_end_" in node and len(node) == 1:
                results.append(path)
            for key, child in node.items():
                if key != "_end_":
                    dfs(child, path + [key], results)

        results = []
        dfs(trie, [], results)
        return results
    kept = []
    for trajectories in groups.values():
        kept += remove_subs(trajectories)
    return sorted(["_".join(x) for x in kept])

def chapter_filter(trajectories,min_ch,max_ch):

    get_chapters = lambda x: len(set([code[:CHAPTER_PREFIX_LEN] for code in x.split("_")]))
    to_remove = []
    for traj in trajectories:
        chapters = get_chapters(traj)
        if chapters < min_ch or chapters > max_ch:
            to_remove.append(traj)
    to_remove = set(to_remove)

    return [x for x in trajectories if x not in to_remove]

@app.route('/linear', methods=['POST'])
def linear():
    full_key = cache_key("linear", request.json)
    cached = response_cache.get(full_key)
    if cached is not None:
        return app.response_class(cached, mimetype="application/json")
    traj_key = cache_key("linear-traj", request.json, drop=("pn", "ps"))

    # Default values
    min_linear_length = 2
    max_linear_length = 18
    min_ppl_count = 5
    max_ppl_count = 4000000
    min_ch = 1
    max_ch = 25
    min_rr = 1.0
    max_rr = 62.0

    page_number = 0     # Used for keeping track of pages
    num_entries = 10    # Used for number of trajectories shown
    
    # HTTP request
    gender = request.json['g']      # g = gender
    registry_code = request.json['c']   # c = codes
    service_registry_codes = registry_code.split(",")

    ll_body = request.json['l']         # l = linear length
    pc_body = request.json['p']         # p = patient cound
    chapters = request.json['ch']         # ch = chapters
    rr_body = request.json['r']         # r = relative risk

    page_number = request.json['pn']    # p = page number
    page_number = page_number+1         # Page numbers start from 0 (frontend)
    num_entries = request.json['ps']    # ps = page size

    # Split requsts into variables
    if not ll_body == None:
        ll_body = ll_body.split(',')
        min_linear_length = int(ll_body[0])
        max_linear_length = int(ll_body[1])

    if not pc_body == None:
        pc_body = pc_body.split(',')
        min_ppl_count = int(pc_body[0])
        max_ppl_count = int(pc_body[1])
    
    if not rr_body == None:
        rr_body = rr_body.split(',')
        min_rr = float(rr_body[0])
        max_rr = float(rr_body[1])
    
    if not chapters == None:
        chapters = chapters.split(',')
        min_ch = int(chapters[0])
        max_ch = int(chapters[1])
    

    ## Business logic
    nodes = mongo.db[NODES_COLLECTION] # node collection
    edges = mongo.db[EDGES_COLLECTION] # edge collection
    if gender in ["male","female"]:
        gender_condition = {"$eq":gender}
    else:
        gender_condition = {"$ne": "all"}

    match_stage = {
        "data.trajectory_list": { "$all": service_registry_codes },
        "data.trajectory_length": {
            "$gte": min_linear_length,
            "$lte": max_linear_length
        },
        "data.patient_count": {
            "$gte": min_ppl_count,
            "$lte": max_ppl_count
        },
        "data.relativerisk": {
            "$gte": min_rr,
            "$lte": max_rr
        },
        "data.gender_trajectories": gender_condition
    }
    match_stage = apply_sex(match_stage, gender)

    # Only the unique (trajectory, gender) pairs are needed here -> let Mongo dedupe
    find_edges_with_code_in_trajectory_pipeline = [
        {"$match": match_stage},
        {"$group": {"_id": {"t": "$data.trajectory", "g": "$data.gender_trajectories"}}},
    ]


    paginated_trajectories = trajectory_cache.get(traj_key)
    if paginated_trajectories is None:
        results = edges.aggregate(find_edges_with_code_in_trajectory_pipeline)
        parsed_trajectories_sorted_unique = sorted({(r["_id"]["t"], r["_id"].get("g")) for r in results})
        paginated_trajectories = remove_subtrajectories(parsed_trajectories_sorted_unique)
        paginated_trajectories = sorted(chapter_filter(paginated_trajectories,min_ch,max_ch),key=lambda x: len(x.split("_")),reverse=True)
        trajectory_cache.set(traj_key, paginated_trajectories)
    subset_paginated_trajectories = paginated_trajectories[num_entries*(page_number-1):num_entries*page_number]

    # Get all edges in trajectories filtering on relative risk, patient count, linear length and gender
    find_all_edges_from_trajectories_pipeline = [
        {
            "$match": {
                "data.trajectory": {
                    "$in": subset_paginated_trajectories
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "data.id": "$data.SUID",
                "data.patient_count": 1,
                "data.relativerisk": 1,
                "data.source": 1,
                "data.target": 1,
                "data.trajectory": 1,
                "data.gender_trajectories":1,
                "data.shared_name":1,
                "data.time_days_delta":1,
                "data.chapter":1
            }
        }
    ]
    # All edges with data
    all_edges = edges.aggregate(find_all_edges_from_trajectories_pipeline)
    logger.info("query pipeline: %s", find_all_edges_from_trajectories_pipeline)
    all_edges_results = list(all_edges)

    # Get source and target IDs
    source_ids = set(map(map_source, all_edges_results))
    target_ids = set(map(map_target, all_edges_results))
    node_ids_from_edges = list(set.union(source_ids,target_ids))

    # Get all nodes from edge source and target ids
    find_all_nodes_from_edge_source_target_ids_pipeline = [
        {
            "$match": {
                "data.SUID": { "$in": node_ids_from_edges }
            }
        },
        {
            "$project": {
                "_id": 0,
                "data.id": "$data.SUID",
                "data.shared_name": 1,
                "data.color": 1,
                "data.full_name": {"$ifNull": ["$data.subgroup", "$data.diagnose_text"]},
                "data.diagnose_text":"$data.diagnose_text",
                "data.subgroup": 1,
                "data.chapter_description":1,
                "data.chapter":1
            }
        }
    ]

    all_nodes_results = list(nodes.aggregate(find_all_nodes_from_edge_source_target_ids_pipeline))
    all_nodes_results_str = [
        {**ele, "data": {**ele["data"], "id": str(ele["data"]["id"])}} for ele in all_nodes_results
    ]

    # Combine nodes and edges
    respose_package = dict()
    respose_package['elements'] = {}
    respose_package['elements']['edges'] = removeSourcelessTargets(all_edges_results, all_nodes_results)
    # respose_package['elements']['edges'] = all_edges_results, all_nodes_results
    respose_package['elements']['nodes'] = all_nodes_results_str
    respose_package['num_trajectories'] = len(paginated_trajectories)
    json_response = expand_trajectories(respose_package)

    # Return response
    body = response_cache.set(full_key, dumps(json_response))
    return app.response_class(body, mimetype="application/json")

def removeSourcelessTargets(edge_elements, node_elements):
    # print(node_elements)
    source_targets = [v['data']['source'] for v in edge_elements if 'source' in v['data']]
    node_sources = set([v['data']['id'] for v in node_elements if 'id' in v['data']])
    list_of_edges = [e for e in source_targets if e in node_sources]
    final_list = []
    for e in edge_elements:
        if e['data']['source'] in list_of_edges:
            e['data']['source'] = str(e['data']['source'])
            e['data']['target'] = str(e['data']['target'])
            final_list.append(e)
    # print(node_sources)
    return final_list

def map_suid(x):
    return x['data']['id']

def map_trajectories(x):
    return x['data']['trajectory']

def map_trajectories_gender(x):
    return (x['data']['trajectory'], x['data']['gender_trajectories'])

def map_shared_name(x):
    return x['data']['trajectory']

def map_source(x):
    return x['data']['source']

def map_target(x):
    return x['data']['target']

@app.route('/network', methods=['POST'])
def network(if_capped_length=None,is_capped=False):
    full_key = cache_key("network", request.json)
    cached = response_cache.get(full_key)
    if cached is not None:
        return app.response_class(cached, mimetype="application/json")

    min_linear_length = 2
    max_linear_length = 12 #shorten this by default to reduce load time
    min_ppl_count = 5
    max_ppl_count = 4000000
    min_ch = 1
    max_ch = 25
    min_rr = 1.0
    max_rr = 62.0

    page_number = 0     # Used for keeping track of pages
    num_entries = 10    # Used for number of trajectories shown
    
    # HTTP request
    gender = request.json['g']      # g = gender
    registry_code = request.json['c']   # c = codes
    service_registry_codes = registry_code.split(',')

    ll_body = request.json['l'] if if_capped_length == None else if_capped_length       # l = linear length
    pc_body = request.json['p']         # p = patient cound
    chapters = request.json['ch']         # ch = chapters
    rr_body = request.json['r']         # r = relative risk
    
    # Safely read the optional `filter` flag, defaulting to 'false'
    filter_applied = request.json.get('filter', 'false')
    if isinstance(filter_applied, bool):
        filter_applied = 'true' if filter_applied else 'false'
    filter_applied = str(filter_applied).lower()

    if not ll_body == None:
        ll_body = ll_body.split(',')
        min_linear_length = int(ll_body[0])
        max_linear_length = int(ll_body[1])

    if not pc_body == None:
        pc_body = pc_body.split(',')
        min_ppl_count = int(pc_body[0])
        max_ppl_count = int(pc_body[1])

    if not chapters == None:
        chapters = chapters.split(',')
        min_ch = int(chapters[0])
        max_ch = int(chapters[1])
    
    if not rr_body == None:
        rr_body = rr_body.split(',')
        min_rr = float(rr_body[0])
        max_rr = float(rr_body[1])

    # registry_code = registry_code.replace(',','|') # Do replace of comma to separator | for RegEx use
    service_registry_codes = registry_code.split(",")


    if gender in ["male","female"]:
        gender_condition = {"$eq":gender}
    else:
        gender_condition = {"$ne": "all"}

    ## Business logic
    nodes = mongo.db[NODES_COLLECTION] # node collection
    edges = mongo.db[EDGES_COLLECTION] # edge collection


    #############
    #   EDGES   #
    #############

    match_stage = {
        "data.trajectory_list": { "$all": service_registry_codes },
        "data.trajectory_length": {
            "$gte": min_linear_length,
            "$lte": max_linear_length
        },
        "data.patient_count": {
            "$gte": min_ppl_count,
            "$lte": max_ppl_count
        },
        "data.relativerisk": {
            "$gte": min_rr,
            "$lte": max_rr
        },
        "data.gender_trajectories": gender_condition
    }
    match_stage = apply_sex(match_stage, gender)

    # Get all the unique edges with a IDs from icd10 code
    # Only the unique (trajectory, gender) pairs are needed here -> let Mongo dedupe
    find_edges_with_code_in_trajectory_pipeline = [
        {"$match": match_stage},
        {"$group": {"_id": {"t": "$data.trajectory", "g": "$data.gender_trajectories"}}},
    ]

    edge_index = _edge_index if NETWORK_INDEX else None
    if edge_index is not None:
        trajectory_ids = edge_index.matching_trajectories(
            service_registry_codes, min_linear_length, max_linear_length, gender,
            min_ppl_count, max_ppl_count, min_rr, max_rr)
        parsed_trajectories_sorted_unique = sorted((t, None) for t in trajectory_ids)
    else:
        results = edges.aggregate(find_edges_with_code_in_trajectory_pipeline)
        parsed_trajectories_sorted_unique = sorted({(r["_id"]["t"], r["_id"].get("g")) for r in results})
    paginated_trajectories = remove_subtrajectories(parsed_trajectories_sorted_unique)
    paginated_trajectories = sorted(chapter_filter(paginated_trajectories,min_ch,max_ch),key=lambda x: len(x.split("_")),reverse=True)

    '''
    # If filter is not applied and there are more than 1000 trajectories,
    # retry once with max_linear_length capped to 3 (avoid recursion/modifying request.json).
    if filter_applied != 'true' and len(paginated_trajectories) > 50 and max_linear_length > 3:
        is_capped = True
        max_linear_length = 2
        # update the match stage and re-run the aggregation with the smaller length
        match_stage["data.trajectory_length"]["$lte"] = max_linear_length
        find_edges_with_code_in_trajectory_pipeline[0]["$match"] = match_stage
        results = list(edges.aggregate(find_edges_with_code_in_trajectory_pipeline))
        parsed_trajectories_sorted_unique = sorted(list(set(map(map_trajectories_gender, results))))
        paginated_trajectories = remove_subtrajectories(parsed_trajectories_sorted_unique)
        paginated_trajectories = sorted(chapter_filter(paginated_trajectories,min_ch,max_ch),key=lambda x: len(x.split("_")),reverse=True)
    '''

    # Get all edges in trajectories filtering on relative risk, patient count, linear length and gender
    find_all_edges_from_trajectories_pipeline = [
        {
            "$match": apply_sex({
                "data.trajectory": {
                    "$in": paginated_trajectories
                },
                "data.gender_trajectories": gender_condition
            }, gender)
        },
        {
            "$project": {
                '_id': 1,
                "data.id": "$data.SUID",
                "data.patient_count": 1,
                "data.relativerisk": 1,
                "data.source": 1,
                "data.target": 1,
                "data.trajectory": 1,
                "data.gender_trajectories":1,
                "data.shared_name":1,
                "data.time_days_delta":1,
                "data.trajectory_list":1
            }
        },
        # Keep the first edge per shared_name (same rule as the loop below) inside
        # Mongo, so only unique edges are sent to Python instead of every copy.
        {"$group": {"_id": "$data.shared_name", "doc": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$doc"}},
    ]
    if edge_index is not None:
        # The index already picked the first edge per shared_name: fetch just those
        edge_ids = edge_index.first_edge_ids(trajectory_ids[t] for t in paginated_trajectories)
        find_all_edges_from_trajectories_pipeline = [
            {"$match": {"_id": {"$in": edge_ids}}},
            find_all_edges_from_trajectories_pipeline[1],
        ]
    # All edges with data
    all_edges = edges.aggregate(find_all_edges_from_trajectories_pipeline, allowDiskUse=True)
    results = list(all_edges)

    unique_shared_name_edge_results = set()
    all_edges_results = list()
    nodes_ids_set = set()

    # Remove all duplicate edges on shared_name
    for result in results:
        result['data']['shared_name'] = clean_shared_name(result['data']['shared_name'])
        if result['data']['shared_name'] not in unique_shared_name_edge_results:
            # Temp unique set of all 'seen' edges
            unique_shared_name_edge_results.add(result['data']['shared_name'])

            # Grab source and target ID's for later use while querying nodes
            nodes_ids_set.add(result['data']['source'])
            nodes_ids_set.add(result['data']['target'])

            # Change source and target from ID number to shared_name (ICD-10 code)
            source_target = result['data']['shared_name'].split(' (pp) ')
            result['data']['source'] = source_target[0]
            result['data']['target'] = source_target[1]

            # Resulting list of edges
            all_edges_results.append(result)

    #############
    #   NODES   #
    #############
    # Get all nodes from edge source and target shared_names
    find_all_nodes_from_edge_source_target_pipeline = [
        {
            "$match": {
                "data.SUID": { "$in": list(nodes_ids_set) },
            }
        },
        {
            "$project": {
                "_id": 1,
                "data.color": 1,
                "data.gender": "$data.gender_trajectories",
                "data.shared_name": 1,
                "data.id": "$data.shared_name",
                "data.full_name": {"$ifNull": ["$data.subgroup", "$data.diagnose_text"]},
                "data.subgroup": 1
            }
        }
    ]
    all_nodes = nodes.aggregate(find_all_nodes_from_edge_source_target_pipeline)
    all_nodes_results = list(all_nodes)

    # Combine nodes and edges
    respose_package = dict()
    respose_package['elements'] = {}
    respose_package['elements']['edges'] = all_edges_results
    respose_package['elements']['nodes'] = removeNoEdgeNodes(all_edges_results,all_nodes_results)
    respose_package['elements']["is_capped"] = is_capped
    json_response = respose_package

    # Return response
    body = response_cache.set(full_key, dumps(json_response))
    return app.response_class(body, mimetype="application/json")


    

def removeNoEdgeNodes(edges,nodes):
    res = []
    nodes_ids = set([node["data"]["id"] for node in nodes])
    source_target = set([edge["data"]["source"] for edge in edges]+[edge["data"]["target"] for edge in edges])

    for node in nodes:
        if node["data"]["id"] in source_target:
            res.append(node)
    return res


@app.route('/lookup', methods=['GET'])
def lookup():
    print('Get info about (lookup) the node or edge, like pvalues, time between etc.')

    # HTTP request
    id = request.args.get('id')
    gender = request.args.get('g') # g = gender
    element_type = request.args.get('t') # t = element type (node or edge)
    shared_name = request.args.get('shared_name')
    network = request.args.get("network")

    if element_type == "edges" and shared_name and "(pp)" in shared_name:
        a, b = [x.strip() for x in shared_name.split("(pp)", 1)]
        shared_name = f"{a} (pp) {b}"
        stored_names = [shared_name, f"None{a} (pp) None{b}"]  # ptb stores "None" prefixes

    # If a ID is specified by an ICD10 code (not nummeric) then query node differently
    if id.isnumeric():
        if (element_type == 'nodes'):
            nodes = mongo.db[NODES_COLLECTION] # node collection
            find_from_id_pipeline = [
                {
                    "$match": {
                        "data.shared_name": shared_name
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "data.color": 1,
                        "data.shared_name": 1,
                        "data.dead_after_5_years_count": 1,
                        "data.patient_count": 1,
                        "data.diagnose_text": 1,
                        "data.subgroup": 1,
                        "data.chapter_description": 1
                    }
                }
            ]
            node_meta = list(nodes.aggregate(find_from_id_pipeline))[0] # Unpack cursor
            return dumps(node_meta)

        elif (element_type == 'edges'):
            nodes = mongo.db[NODES_COLLECTION] # edge collection
            edges = mongo.db[EDGES_COLLECTION] # node collection
            find_from_id_pipeline = [
                {
                    "$match": {
                        "data.shared_name": {"$in": stored_names},
                        "data.gender_trajectories": {"$in": [gender, None]}  # None: datasets without sex
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "data.id": 1,
                        "data.source_name": 1,
                        "data.target_name": 1,
                        "data.source": 1,
                        "data.target": 1,
                        "data.pvalue": 1,
                        "data.pvalue_dir": 1,
                        "data.age_years": 1,
                        "data.age_days": 1,
                        "data.time_days": 1,
                        "data.time_days_delta": 1,
                        "data.trajectory_length": 1,
                        "data.dead_after_5_years_count": 1,
                        "data.gender_trajectories": 1,
                        "data.patient_count": 1,
                        "data.patient_count_pair": 1,
                        "data.relativerisk": 1,
                        "data.time_months": 1,
                        "data.time_months_delta": 1,
                        "data.shared_name": 1,
                        "data.trajectory": 1,
                        "data.source_color": 1,
                        "data.target_color": 1,
                        "data.target_id": 1,
                        "data.source_id": 1,
                        "data.male_patient_count": 1,
                        "data.female_patient_count": 1,
                        "data.death": 1
                    }
                }
            ]
        edge_meta = list(edges.aggregate(find_from_id_pipeline))[0] # Unpack cursor
        edge_meta['data']['shared_name'] = clean_shared_name(edge_meta['data']['shared_name'])

        for node_id in [(int(edge_meta['data']['source']),'source'),(int(edge_meta['data']['target']),'target')]:
            find_node_pipeline = [
                {
                    "$match": {
                        "data.SUID": { "$in":[node_id[0]]}
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "data.color": 1,
                        "data.shared_name": 1,
                        "data.diagnose_text": 1,
                        "data.subgroup": 1,
                        "data.chapter_description": 1
                    }
                }
            ]
            nodes_meta = list(nodes.aggregate(find_node_pipeline))
            edge_meta['data'][f'{node_id[1]}_node'] = nodes_meta[0]['data']
        return dumps(edge_meta)

    else:
        print('got a ICD10 code')
        if (element_type == 'nodes'):
            nodes = mongo.db[NODES_COLLECTION] # node collection
            node_meta = nodes.find_one({"data.shared_name": id},{ "_id": 0, "data.color": 1, "data.shared_name": 1, "data.dead_after_5_years_count": 1, "data.patient_count": 1})

            return dumps(node_meta)

@app.route('/<path:path>', methods=['GET'])
def static_proxy(path):
    return send_from_directory(DIST_DIR, path) # Original path: /home/app/dist/dtb/

@app.route('/')
def index():
    return send_from_directory(DIST_DIR, 'index.html') # Original path: /home/app/dist/dtb/

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(DIST_DIR, 'index.html')
