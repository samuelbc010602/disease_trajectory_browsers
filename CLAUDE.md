# Trajectory browsers (srb / ptb)

One codebase, two browsers:
- **srb** – Service Registry Browser ("The Danish Primary Care Browser"), Mongo db `srb`, collections `nodes` + `edges`. Domain: primcare.sund.ku.dk
- **ptb** – Prescription Trajectory Browser, Mongo db `ptb`, collections `nodes` + `edges_2500_cap`. Domain: ptb.sund.ku.dk

## Layout
- `flask/app.py` – Flask API (`/search`, `/linear`, `/network`, `/lookup`, `/finddropdown`) + serves the built Angular app. One process = one browser, chosen by env vars (defaults = srb):
  `MONGO_URI`, `EDGES_COLLECTION`, `NODES_COLLECTION`, `DIST_DIR`, `SEX_MODE` (`edge` srb | `patient_count` ptb), `CHAPTER_PREFIX_LEN` (2 srb | 1 ptb).
- `flask/frontend/projects/{srb,ptb}` – Angular 14 apps; all content differences live in `src/app/app.module.ts` (`SharedConfig`: chapters, about, walkthrough, demo, wording, filter ranges, patient_baseline …).
- `flask/frontend/projects/shared` – shared components (search bar, filters, graph, dialogs). Must stay project-neutral: read project specifics from `sharedService.cfg`.
- `flask/frontend/dist/{srb,ptb}` – committed production builds (served by Flask; compose mounts `dist`).
- `mongodb/srb/{edges,nodes}.json` – the real data. **Never modify.** `edges.json` is 712 MB (not on GitHub).

## Commands
- Node is via nvm and may be missing from PATH: `export PATH=$HOME/.nvm/versions/node/v20.19.4/bin:$PATH`
- Build: `cd flask/frontend && node_modules/.bin/ng build srb` (or `ptb`) → `dist/<project>` (~2.5 min each).
- Run stack: `docker compose up` (needs sudo here). Mongo is reachable from the host at `mongodb://127.0.0.1:27017`.
- Local backend without docker (venv): `MONGO_URI=mongodb://127.0.0.1:27017/ptb EDGES_COLLECTION=edges_2500_cap SEX_MODE=patient_count CHAPTER_PREFIX_LEN=1 DIST_DIR=$PWD/flask/frontend/dist/ptb venv/bin/gunicorn -b 0.0.0.0:5055 --chdir flask app:app`

## Rules
- srb chapter colours are fixed (graph: `annotation.service.ts` `getNodeColors`, legend: `srb-chapters.ts`). Do not change them. ptb uses `data(color)` from its nodes.
- Backend changes must leave srb output identical (compare old vs new `/linear` + `/network` responses; ids `x@i` are nondeterministic, strip `@\d+` before comparing).
- `app.module.ts` `base_url` must be `"/"` when committing (use `http://127.0.0.1:5000/` only locally).
- Data facts: srb transitions all have ≥ 50,000 patients (filter is "thousands above 50k"); ptb totals ≥ 2,501, per-sex counts can be 0, edges have no sex field.

## Git
- Bitbucket `origin` (brunaklab/srb_browser): full history incl. data; never force-push.
- GitHub `disease_trajectory_browsers`: clean snapshot branches `srb` and `ptb` (no files > 100 MB, no node_modules/venv).
