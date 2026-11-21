#!/usr/bin/env python
import os
from flask import Flask, make_response, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_pymongo import PyMongo
from bson.json_util import dumps
import logging
from IPython import embed
from collections import defaultdict
logging.basicConfig(level=logging.WARNING)
app = Flask(__name__)
CORS(app)

import sys


def remove_subtrajectories(data):
    men = [x[0].split("_") for x in data if x[1] == 'male']
    women = [x[0].split("_") for x in data if x[1] == 'female']

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
    return sorted(["_".join(x) for x in remove_subs(men) + remove_subs(women)])

def get_degree(trajectories):
    deegree_dict = defaultdict(int)
    for traj in trajectories:
        steps = traj.split("_")
        for step in steps:
            deegree_dict[step] +=1
    return deegree_dict

def expand_trajectories(json_response):
    trajectories = json_response

    nodes = trajectories["elements"]["nodes"]
    edges = trajectories["elements"]["edges"]
    edges
    edge_mapper = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    for edge in edges:
        data = edge["data"]
        edge_mapper[data["gender_trajectories"]][data["trajectory"]][data["shared_name"]] = {"data":data}
    node_mapper = defaultdict(dict)
    for node in nodes:
        data = node["data"]
        node_mapper[data["id"]] = {"data":data}

    trajectories = list(set([(edge["data"]["trajectory"],edge["data"]["gender_trajectories"]) for edge in edges]))
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
            source_node_data = copy.deepcopy(node_mapper[source]["data"])
            target_node_data = copy.deepcopy(node_mapper[target]["data"])

            # Assign unique IDs for this trajectory iteration
            source_node_data["id"] = f"{source}@{i}"
            target_node_data["id"] = f"{target}@{i}"

            # Append nodes to newNodes
            newNodes.append({"data": source_node_data})
            newNodes.append({"data": target_node_data})

            # Update edge to point to new node IDs
            newEdge_copy = copy.deepcopy(newEdge)  # deepcopy to avoid mutating the original edge
            newEdge_copy["source"] = source_node_data["id"]
            newEdge_copy["target"] = target_node_data["id"]

            newEdges.append({"data": newEdge_copy})

        print("processing trajectory", traj)

    print("before returning from expand_trajectories")
    json_response["elements"]["nodes"] = newNodes
    json_response["elements"]["edges"] = newEdges

    return json_response
            





#sys.stdout = open("/Users/bdq178/Desktop/xxb_browser/flask_output.log", "a")
#sys.stderr = sys.stdout

import secrets
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(16)
app.config["MONGO_URI"] = "mongodb://localhost:27017/srb"
# app.config["MONGO_URI"] = "mongodb://sharded-mongodb-docker_mongodb_1:27017/srb"


# app.config["MONGO_URI"] = "mongodb://127.0.0.1:27017/srb"
# app.config["MONGO_URI"] = "mongodb://localhost:27017/srb"
# app.config["MONGO_URI"] = "mongodb://localhost:27017,localhost:27018/srb"
# app.config["MONGO_URI"] = "mongodb://sharded-mongodb-docker_mongos-router0_1:27017,sharded-mongodb-docker_mongos-router1_1:27018/srb"
# app.config["MONGO_URI"] = "mongodb://sharded-mongodb-docker_mongos-router_1:27017/srb"

mongo = PyMongo(app)

# Reference collections
nodes = mongo.db.nodes
edges = mongo.db.edges

# Default values
min_linear_length = 2
max_linear_length = 18
min_rr = 0
max_rr = 1000
min_ppl_count = 5
max_ppl_count = 1000000
page_number = 0     # Used for keeping track of pages
num_entries = 10    # Used for number of trajectories shown

# HTTP request
gender = "all"      # g = gender
registry_code = "01100004"   # c = codes
# service_registry_codes = request.json['c']   # c = codes
service_registry_codes = registry_code.replace(',','_')

ll_body = "2,18"         # l = linear length
rr_body = "1,150"         # r = relative risk
pc_body = "20,200000000000000"         # p = patient cound
page_number = 0    # p = page number
page_number = page_number+1         # Page numbers start from 0 (frontend)
num_entries = "10"    # ps = page size

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

## Business logic
nodes = mongo.db.nodes # node collection
edges = mongo.db.edges # edge collection
print(service_registry_codes)

if gender in ["male","female"]:
    gender_condition = {"$eq":gender}
else:
    gender_condition = {"$ne": "all"}

match_stage = {
    "data.trajectory": {
        "$regex": service_registry_codes, "$options": "i"
    },
    "data.relativerisk": {
        "$gt": min_rr,
        "$lt": max_rr
    },
    "data.trajectory_length": {
        "$gte": min_linear_length,
        "$lte": max_linear_length
    },
    "data.patient_count": {
        "$gte": min_ppl_count,
        "$lte": max_ppl_count
    },
    "data.gender_trajectories": gender_condition
}

find_edges_with_code_in_trajectory_pipeline = [
    {
        "$match": match_stage
    },
    {
        "$project": {
            "_id": 0,
            "data.trajectory": 1,
            "data.source": 1,
            "data.target": 1,
            "data.gender_trajectories":1
        }
    }
]


def map_trajectories(x):
    return x['data']['trajectory']

def map_source(x):
    return x['data']['source']
    
def map_target(x):
    return x['data']['target']

def map_trajectories_gender(x):
    return (x['data']['trajectory'], x['data']['gender_trajectories'])


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


print('query', find_edges_with_code_in_trajectory_pipeline)
results = list(edges.aggregate(find_edges_with_code_in_trajectory_pipeline))

#paginated_trajectories = sorted(list(set(map(map_trajectories, results))))

print("paginated_trajectories")

parsed_trajectories_sorted_unique = sorted(list(set(map(map_trajectories_gender, results))))
paginated_trajectories = remove_subtrajectories(parsed_trajectories_sorted_unique)
paginated_trajectories = paginated_trajectories[:20]
degrees = get_degree(paginated_trajectories)

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
            "data.patient_count": {
                "$gte": min_ppl_count,
                "$lte": max_ppl_count
            },
            "data.trajectory_length":{
                "$gte": min_linear_length,
                "$lte": max_linear_length
            },
            "data.gender_trajectories": gender_condition
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
            "data.shared_name":1
        }
    },
    {
        "$sort": {
            "data.trajectory": 1
        }
    }
]
# All edges with data
all_edges = edges.aggregate(find_all_edges_from_trajectories_pipeline)
# all_edges_results = list(all_edges)
# all_edges = results
all_edges_results = list(all_edges)
print("find_all_edges_from_trajectories_pipeline === ",all_edges_results)
# for edge in all_edges_results:
#     edge['data']['source'] = edge['data']['source']
#     edge['data']['target'] = edge['data']['target']
unique_trajectories = set()
for edge in results:
    #print(edge)
    unique_trajectories.add(edge['data']['trajectory'])


# Get source and target IDs
source_ids = set(map(map_source, all_edges_results))
target_ids = set(map(map_target, all_edges_results))
node_ids_from_edges = list(set.union(source_ids,target_ids))
# print('query_comparison', len(node_ids_from_edges))

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
            "data.gender": "$data.gender_trajectories",
            "data.color": 1,
            "data.full_name": { "$concat": [ "$data.shared_name", " : ", "$data.diagnose_text" ]},
            # "position.x": 1,
            # "position.y": 1
        }
    }
]

print('node_query', find_all_nodes_from_edge_source_target_ids_pipeline)
import copy
all_nodes = list(nodes.aggregate(find_all_nodes_from_edge_source_target_ids_pipeline))
for node in all_nodes:
    shared_name = node['data']['shared_name']
    if shared_name in degrees:
        node['data']['degree'] = degrees[shared_name]
    else:
        node['data']['degree'] = 1

all_nodes_results = copy.deepcopy(all_nodes)
all_nodes_results_str = copy.deepcopy(all_nodes)

for ele in all_nodes_results_str:
    ele['data']['id'] = str(ele['data']['id'])

# Combine nodes and edges
response_package = dict()
response_package['elements'] = {}
response_package['elements']['edges'] = removeSourcelessTargets(all_edges_results, all_nodes_results)
# response_package['elements']['edges'] = all_edges_results, all_nodes_results
response_package['elements']['nodes'] = all_nodes_results_str
response_package['num_trajectories'] = len(unique_trajectories)

print("before")
embed()
json_response = expand_trajectories(response_package)
print("after returning from expand_trajectories")
embed()