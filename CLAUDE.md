# DreamOS - Project Notes

Final year B.Tech project (IT Dept, IICT, MGM University). Team: Zaid Ali Syed (2305139),
Om Vyas (2305170), Krushna Kadam (2305165). Source proposal:
`C:\Users\Asus\Downloads\Final_Year_Project_Proposals.pptx` (slides 7-10).

One of three proposed directions (Cognitive Spectre / DreamOS / SentinelLLM) - DreamOS was
selected. Treated as fully independent from all other projects in this workspace: no shared
code, no shared repo, own venv.

## What it is

An AI-native desktop shell that replaces folders/filenames with semantic, natural-language
file understanding: describe what you need, DreamOS finds/organizes it by meaning instead of
exact name or path.

## Scope decisions (locked in 2026-07-28)

- **Repo**: private, pushed to `github.com/syzayd/dreamos-college-project`. Note the repo
  name differs from the local folder name (`DreamOS`) - `syzayd/dreamos` already exists as
  an unrelated project ("Alt+Space command bar backed by a local LLM gateway"), so this one
  got a distinct name to avoid colliding with it. Don't rename this repo to plain "dreamos"
  without checking that other repo first.
- **Desktop shell**: Tauri (not Electron) - chosen deliberately despite needing a Rust
  toolchain + MSVC Build Tools install, for the lighter/more "systems" feel appropriate to a
  final-year demo.
- **Data scope**: indexes a **sandboxed demo vault** (`demo-vault/`), not real personal files.
  The vault is intentionally messy (bad filenames, mixed content types) to demonstrate the
  "before" state. Never point the indexer at a real personal folder without revisiting this
  decision - it was chosen specifically to avoid touching live data.
- **Build order**: core 3 modules first - Natural Language Interface, Semantic Search Engine,
  AI File Organizer. Knowledge Graph, Context Memory Engine, and Intelligent Workspace Manager
  are deferred until after a review checkpoint.

## Tech stack

- Backend: Python (FastAPI), venv at `backend/.venv`
- Vector store: ChromaDB (persistent, `backend/data/chroma/`)
- Metadata store: SQLite (`backend/data/dreamos.db`)
- Local LLM runtime: Ollama - `nomic-embed-text` for embeddings, `llama3.2` for
  summarization/tagging/intent routing (both already pulled locally)
- Frontend: Tauri + React (`frontend/`)

## Running the backend

```
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

Ollama must be running locally (`ollama serve`, or the desktop app) with `nomic-embed-text`
and `llama3.2` pulled.

## Embedding similarity gotcha

`nomic-embed-text` cosine similarities for genuinely unrelated text sit around ~0.5, not near
0. Do not use a naive high threshold (e.g. 0.8) inherited from other embedding setups - tune
empirically against the demo vault's known-relevant/known-irrelevant query pairs. See global
memory `feedback-embedding-anisotropy-threshold` for background on this.

## Project Monitoring - I report

`docs/DreamOS-Project-Monitoring-I.docx` is the deliverable for the department's Project
Monitoring - I checkpoint (guidelines PDF: literature review, requirement analysis, system
design with diagrams). It documents the same state as this file and the README: 3 of 6
proposed modules built/tested/packaged (~50% of module scope), 21/21 backend tests passing.
Diagram sources (Mermaid `.mmd` + the wireframe `.html`) and their rendered `.png`s are in
`docs/diagrams/`. `docs/build_report.js` (needs `npm install -g docx` or a local `npm link docx`)
regenerates the docx from those images and the hardcoded report text - regenerate a diagram with
`npx -y @mermaid-js/mermaid-cli -i docs/diagrams/NAME.mmd -o docs/diagrams/NAME.png -b white -s 3`
first if a diagram needs to change, then re-run `node docs/build_report.js` from `docs/`.

`docs/DreamOS-Project-Monitoring-I.pptx` is the companion slide deck (5 slides) for the same
checkpoint. Regenerate with `node docs/build_pptx.js` (needs `npm install -g pptxgenjs
react-icons react react-dom sharp`, then `npm link` each into the working directory - same
global-install-not-on-local-require-path gotcha as `docx`). Reuses `docs/diagrams/01_architecture.png`.

## Regenerating the demo vault

```
python backend/scripts/generate_demo_vault.py --reset
```

This wipes and rewrites `demo-vault/` from the fixed dataset in that script - keeps the "before"
state reproducible for repeated demo runs.
