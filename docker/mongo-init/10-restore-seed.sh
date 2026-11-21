#!/bin/bash
# Restores the bundled database dump(s) from /data-seed on the FIRST start of the
# MongoDB container (the official mongo image runs /docker-entrypoint-initdb.d/*
# only when its data directory is empty). Existing databases are never touched.
#
# Layout:  /data-seed/<db>/<collection>.metadata.json.gz
#          /data-seed/<db>/<collection>.bson.gz.part000, .part001, ...
set -euo pipefail

SEED=/data-seed
WORK=/tmp/seed-restore

if [ ! -d "$SEED" ] || [ -z "$(ls -A "$SEED" 2>/dev/null)" ]; then
  echo "[seed] no bundled data in $SEED, skipping"
  exit 0
fi

mkdir -p "$WORK"
for dbdir in "$SEED"/*/; do
  db=$(basename "$dbdir")
  mkdir -p "$WORK/$db"
  for meta in "$dbdir"*.metadata.json.gz; do
    [ -e "$meta" ] || continue
    coll=$(basename "$meta" .metadata.json.gz)
    echo "[seed] assembling $db.$coll"
    cp "$meta" "$WORK/$db/"
    cat "$dbdir$coll".bson.gz.part* > "$WORK/$db/$coll.bson.gz"
  done
done

echo "[seed] restoring (this takes a few minutes for ~2 million edges per database)"
mongorestore --gzip --dir "$WORK" --numInsertionWorkersPerCollection 4
rm -rf "$WORK"
echo "[seed] done"
