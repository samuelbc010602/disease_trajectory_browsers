# The Danish Primary Care Browser (Service Registry Browser, SRB)

Interactive browser for population-wide primary care trajectories from the
Danish National Health Service Registry. Public site: **https://primcare.sund.ku.dk**

> The Prescription Trajectory Browser (PTB, https://ptb.sund.ku.dk) lives on the `ptb` branch
> and shares the same code base.

## Architecture

```
browser ──► nginx (80) ──► Flask/gunicorn (5000) ──► MongoDB (27017, db "srb")
                              └─ serves the built Angular app from flask/frontend/dist/srb
```

| Path | What |
|------|------|
| `flask/app.py` | REST API (`/search`, `/linear`, `/network`, `/lookup`, `/finddropdown`) + static files |
| `flask/frontend/projects/srb` | Angular app for this browser (all texts, chapters, ranges in `src/app/app.module.ts`) |
| `flask/frontend/projects/shared` | Components shared by all browsers |
| `flask/frontend/dist/srb` | Committed production build (served as-is) |
| `nginx/` | Reverse proxy; `SERVER_NAME` sets the domain |

## Run with Docker

```bash
docker compose up -d --build
```

Then open http://localhost (nginx) or http://localhost:5000 (Flask directly).

The backend is configured through environment variables in `compose.yaml`:

| Variable | SRB value | Meaning |
|----------|-----------|---------|
| `MONGO_URI` | `mongodb://mongodb:27017/srb` | database |
| `EDGES_COLLECTION` / `NODES_COLLECTION` | `edges` / `nodes` | collections |
| `DIST_DIR` | `/home/app/dist/srb` | Angular build to serve |
| `SEX_MODE` | `edge` | edges belong to one sex |
| `CHAPTER_PREFIX_LEN` | `2` | chapter = first 2 digits of a service code |
| `SERVER_NAME` (nginx) | `primcare.sund.ku.dk` | public domain |

Indexes are created automatically when the backend starts.

## Data

The `srb` database is bundled in `data/srb/` as a gzipped MongoDB dump, split
into parts below GitHub's file-size limit. On the **first** start (empty Mongo
volume) `docker/mongo-init/10-restore-seed.sh` joins the parts and restores
them, so this is all you need:

```bash
git clone -b srb https://github.com/samuelbc010602/disease_trajectory_browsers.git
cd disease_trajectory_browsers
docker compose up -d --build      # first start restores ~2.3 M documents (a few minutes)
```

Follow progress with `docker compose logs -f mongodb` (look for `[seed] done`).
Machines that already have data in the Mongo volume are not touched.

Expected collections: `srb.nodes` (955 docs) and `srb.edges` (~2.26 M docs).
To restore into another MongoDB manually: join the parts
(`cat edges.bson.gz.part* > edges.bson.gz`) and run `mongorestore --gzip --dir <folder>`.

## Develop the frontend

```bash
cd flask/frontend
npm install
npx ng serve srb          # dev server on :4200 (set base_url in app.module.ts to your backend)
npx ng build srb          # production build -> dist/srb (commit it)
```

Keep `base_url: "/"` in `projects/srb/src/app/app.module.ts` when committing.

## Run the backend without Docker

```bash
python -m venv venv && venv/bin/pip install -r flask/requirements.txt
MONGO_URI=mongodb://127.0.0.1:27017/srb DIST_DIR=$PWD/flask/frontend/dist/srb \
  venv/bin/gunicorn -b 0.0.0.0:5000 --chdir flask app:app
```
