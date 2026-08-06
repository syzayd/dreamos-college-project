# DreamOS - Project Monitoring-I Demo Script

Target length: 6-8 minutes. Read the **Say** lines close to verbatim; the **Do** lines are
what to click/type. Practice it once end-to-end before the real thing.

## Before you walk in

1. Run `run-dreamos.bat` once, ahead of time, so Ollama has already warmed up
   `nomic-embed-text` and `llama3.2` - the first real call after a cold model load is slow
   and looks bad live.
2. Reset the vault so it's pristine: `python backend/scripts/generate_demo_vault.py --reset`
3. Close the app, leave the launcher ready to double-click on demo day.
4. Know the two safe phrasings: **"open my resume"** or **"open the resume"**. Do not say
   "open my CV" live - it resolves to a teammate's draft file (known limitation, documented
   in `HANDOFF.md`).
5. Have a terminal ready in `backend/` in case you want to show the test suite (step 6).

---

## 1. The problem (30 sec)

**Do:** Open a file explorer window on `demo-vault/`.

**Say:** "This folder is deliberately messy - bad filenames, mixed content, no structure.
This is what a real person's Downloads or Desktop folder actually looks like. DreamOS is a
desktop shell that finds and manages files by what's *in* them, not what they're *named*.
Nothing in this folder is real personal data - it's a sandboxed demo vault we generate for
exactly this kind of walkthrough."

---

## 2. Launch DreamOS (30 sec)

**Do:** Double-click `run-dreamos.bat`, or if already running, bring the app window forward.

**Say:** "This is a Tauri desktop app - a native window, not a browser tab - backed by a
local FastAPI service. Everything runs on-device: SQLite for metadata, ChromaDB for vector
search, and Ollama running `nomic-embed-text` for embeddings and `llama3.2` for
categorization. No cloud calls, no API keys - this has to work with no internet in a
classroom."

---

## 3. Semantic search (90 sec)

**Do:** Type into the chat box: `find something about a meeting`

**Say (while it loads):** "None of the filenames in that vault contain the word 'meeting'.
This is going to search by meaning, using vector embeddings, not filename or keyword match."

**Do:** Point at the result (`mtg_04_12.txt` and/or `standup.txt`).

**Say:** "It found the right files even though the filenames give zero hint what's inside
them. That's the Semantic Search Engine module - one of the three core modules we've built
and tested end to end."

---

## 4. Open intent (60 sec)

**Do:** Type: `open my resume`

**Say:** "This isn't just search - it's a natural language interface that classifies intent.
'Open' means launch the file directly in its default app, not just show me a result." (File
opens - `final_final_v3.txt`, in Notepad or whatever the OS default is.)

**Say:** "Under the hood this resolves the best semantic match and launches it through a
scoped Tauri permission - the app can only open files inside this vault, nothing else on the
machine. We also just hardened this: if the top two candidate files are too close in
similarity to confidently pick one, it shows you the candidates instead of guessing and
opening the wrong one."

---

## 5. AI Organizer, with revert (2 min - your strongest section)

**Do:** Type: `organize my files` (or click into the Organize panel if the UI has a
dedicated one).

**Say:** "This is the AI File Organizer. It reads each file, generates a category and a
one-line reasoning for that category, and proposes where it should go - but nothing moves
yet. Nothing is destructive until I say so."

**Do:** Show 2-3 suggestions and read one reasoning string out loud.

**Say:** "Notice it explains *why* - this file is a `resume` category because it discusses
work experience and skills. Now I'll apply it." (Click apply on one or two.)

**Do:** Show the file has moved into a category folder.

**Say:** "And critically - this is reversible." (Click revert.) "It moves the file back and
cleans up the now-empty folder it created. That reversibility is the whole point: an AI
that reorganizes your files only earns trust if undoing it is just as reliable as doing it."

---

## 6. Proof this is engineered, not a demo hack (60 sec, optional if time is short)

**Do:** Switch to the terminal in `backend/`, run:
```
./.venv/Scripts/python.exe -m pytest -q
```

**Say (while it runs, ~1-2 sec):** "21 tests, all passing, and they run fully offline - the
embeddings and the LLM are both mocked in the test fixtures, so this doesn't depend on Ollama
being up. That's what let us keep iterating quickly without breaking existing behavior."

**Do:** Optionally show the built installer (`.msi` or the NSIS `.exe`) in `frontend/src-tauri/target/release/bundle/`.

**Say:** "It's also packaged as a real Windows installer, not just something that runs from
a dev server."

---

## 7. Close with honest scope and the roadmap (45 sec)

**Say:** "The original proposal has six modules. We've built, tested, and packaged three:
Natural Language Interface, Semantic Search, and the AI Organizer - that's roughly 50% of
the module scope, against the ~20% these guidelines expect at Monitoring-I. The other three
- Knowledge Graph, Context Memory Engine, and Intelligent Workspace Manager - are scoped and
planned for Monitoring-II and III, along with extending the test suite and the literature
review. Full detail, including real cited sources and system design diagrams, is in the
submitted report."

---

## If something breaks live

- **Ollama not responding / slow:** say so plainly - "this is a local model warming up" -
  and fall back to a result you already captured earlier, or just narrate what it would show.
- **Wrong file opens:** don't panic-explain the embedding math live. Say "that's a known
  limitation we've documented - a small local model without keyword context can conflate
  similarly-worded files" and move on to the next section.
- **App won't launch:** have `backend/` running via
  `./.venv/Scripts/python.exe -m uvicorn app.main:app --reload` and the report's diagrams
  open as a fallback walkthrough - you can narrate the whole system from the architecture
  diagram alone if the live app truly won't cooperate.
