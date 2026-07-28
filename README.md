# DreamOS

Final year B.Tech project (Dept. of Information Technology, IICT, MGM University).
Team: Zaid Ali Syed (2305139), Om Vyas (2305170), Krushna Kadam (2305165).

> Current operating systems organize files by folders. DreamOS organizes information by
> meaning - users describe what they need, and the system understands intent to retrieve it.

An AI-native desktop shell that replaces folders and filenames with semantic,
natural-language file understanding: a local FastAPI backend indexes a folder into a vector
store + knowledge base, and a Tauri + React desktop app lets you search and organize it by
describing what you want instead of remembering exact names or paths.

## Status

Core 3 modules from the project proposal are built and working:

- **Natural Language Interface** - a chat-style input that classifies intent (search vs.
  organize) and routes to the right module (`backend/app/nl_interface.py`)
- **Semantic Search Engine** - natural-language queries over the vault via embeddings +
  ChromaDB, with a tuned similarity threshold (`backend/app/search.py`)
- **AI File Organizer** - LLM-generated summary/tags/category per file, with a reversible
  apply/revert move into semantic folders (`backend/app/organizer.py`)

Deferred to a later phase (after review): Knowledge Graph, Context Memory Engine,
Intelligent Workspace Manager.

## Architecture

```
demo-vault/          sandboxed sample data (messy, unorganized - see CLAUDE.md)
backend/              FastAPI service
  app/
    config.py         settings (paths, model names, similarity threshold)
    ollama_client.py   embeddings + JSON generation via local Ollama
    db.py              SQLite schema + connection helper
    extractors.py       text extraction + chunking
    indexer.py          walks the vault, embeds, upserts into Chroma + SQLite
    vectorstore.py       ChromaDB persistent client wrapper
    search.py            semantic search with similarity threshold + top-k dedupe
    organizer.py          AI categorization + reversible apply/revert
    nl_interface.py       intent classification + routing
    main.py               FastAPI routes
  tests/               offline pytest suite (mocked embeddings/LLM, no Ollama needed)
frontend/             Tauri + React desktop shell
  src/
    api.ts             typed fetch client for the backend
    App.tsx            chat UI: search results + organize suggestion cards
  src-tauri/           Rust/Tauri shell
```

## Running it

**1. Start Ollama** (desktop app or `ollama serve`) with `nomic-embed-text` and `llama3.2`
pulled.

**2. Start the backend:**

```
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8420
```

**3. Index the demo vault** (first run, or after regenerating it):

```
curl -X POST http://localhost:8420/index
```

**4. Start the desktop app:**

```
cd frontend
npm run tauri dev
```

Type a request like "find my resume" or "organize my unsorted files" into the DreamOS
window.

## Building an installer

```
cd frontend
npm run tauri build
```

Produces both a Windows installer at
`frontend/src-tauri/target/release/bundle/msi/DreamOS_0.1.0_x64_en-US.msi` and
`frontend/src-tauri/target/release/bundle/nsis/DreamOS_0.1.0_x64-setup.exe`. Either installs
DreamOS as a standalone desktop app with a Start Menu entry - the backend (Ollama + the
FastAPI service) still needs to be running separately, the installer only packages the
Tauri/React shell. Build artifacts are gitignored (`target/`), not committed - rebuild
locally with the command above whenever you need a fresh installer.

## Tests

```
cd backend
./.venv/Scripts/python.exe -m pytest -v
```

19 tests, fully offline - embeddings and LLM calls are mocked via fixtures in
`tests/conftest.py`, so no Ollama instance is required to run them.

## Regenerating the demo vault

```
python backend/scripts/generate_demo_vault.py --reset
```

See `CLAUDE.md` for scope decisions, the embedding-similarity tuning note, and why the vault
is sandboxed rather than a real personal folder.
