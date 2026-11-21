# The Danish Prescription Trajectory Browser (PTB)

Interactive browser for population-wide prescription trajectories from the
Danish National Prescription Registry (ATC level-5 drug groups). Public site: **https://ptb.sund.ku.dk**

> The Service Registry Browser (SRB, https://primcare.sund.ku.dk) lives on the `srb` branch
> and shares the same code base.

## Architecture

```
browser ──► nginx (80) ──► Flask/gunicorn (5000) ──► MongoDB (27017, db "ptb")
                              └─ serves the built Angular app from flask/frontend/dist/ptb
```

| Path | What |
|------|------|
| `flask/app.py` | REST API (`/search`, `/linear`, `/network`, `/lookup`, `/finddropdown`) + static files |
| `flask/frontend/projects/ptb` | Angular app for this browser (all texts, chapters, ranges in `src/app/app.module.ts`) |
| `flask/frontend/projects/shared` | Components shared by all browsers |
| `flask/frontend/dist/ptb` | Committed production build (served as-is) |
| `nginx/` | Reverse proxy; `SERVER_NAME` sets the domain |

## Run with Docker

```bash
docker compose up -d --build
```

Then open http://localhost (nginx) or http://localhost:5000 (Flask directly).

The backend is configured through environment variables in `compose.yaml`:

| Variable | PTB value | Meaning |
|----------|-----------|---------|
| `MONGO_URI` | `mongodb://mongodb:27017/ptb` | database |
| `EDGES_COLLECTION` / `NODES_COLLECTION` | `edges_2500_cap` / `nodes` | collections |
| `DIST_DIR` | `/home/app/dist/ptb` | Angular build to serve |
| `SEX_MODE` | `patient_count` | edges are shared; Men/Women filters `male_/female_patient_count` |
| `CHAPTER_PREFIX_LEN` | `1` | chapter = ATC main group letter |
| `SERVER_NAME` (nginx) | `ptb.sund.ku.dk` | public domain |

Indexes are created automatically when the backend starts.

## Data

The `ptb` database is bundled in `data/ptb/` as a gzipped MongoDB dump, split
into parts below GitHub's file-size limit. On the **first** start (empty Mongo
volume) `docker/mongo-init/10-restore-seed.sh` joins the parts and restores
them, so this is all you need:

```bash
git clone -b ptb https://github.com/samuelbc010602/disease_trajectory_browsers.git
cd disease_trajectory_browsers
docker compose up -d --build      # first start restores ~2.2 M documents (a few minutes)
```

Follow progress with `docker compose logs -f mongodb` (look for `[seed] done`).
Machines that already have data in the Mongo volume are not touched.

Expected collections: `ptb.nodes` (858 docs, one per ATC code and sex) and
`ptb.edges_2500_cap` (~2.21 M docs; every transition has at least 2,501 patients in total).
To restore into another MongoDB manually: join the parts
(`cat edges_2500_cap.bson.gz.part* > edges_2500_cap.bson.gz`) and run `mongorestore --gzip --dir <folder>`.

## Develop the frontend

```bash
cd flask/frontend
npm install
npx ng serve ptb          # dev server on :4200 (set base_url in app.module.ts to your backend)
npx ng build ptb          # production build -> dist/ptb (commit it)
```

Keep `base_url: "/"` in `projects/ptb/src/app/app.module.ts` when committing.

## Run the backend without Docker

```bash
python -m venv venv && venv/bin/pip install -r flask/requirements.txt
MONGO_URI=mongodb://127.0.0.1:27017/ptb EDGES_COLLECTION=edges_2500_cap SEX_MODE=patient_count \
CHAPTER_PREFIX_LEN=1 DIST_DIR=$PWD/flask/frontend/dist/ptb \
  venv/bin/gunicorn -b 0.0.0.0:5000 --chdir flask app:app
```
