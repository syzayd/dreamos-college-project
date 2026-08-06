# DreamOS - Handoff

Last updated: 2026-08-04

## What this is

Final year B.Tech project (IT Dept, IICT, MGM University), selected from the three-proposal
deck at `C:\Users\Asus\Downloads\Final_Year_Project_Proposals.pptx` (DreamOS, slides 7-10).
Team: Zaid Ali Syed (2305139), Om Vyas (2305170), Krushna Kadam (2305165). Treated as fully
independent from every other project in this workspace - own repo, own venv, no shared code.

## Scope decisions (see CLAUDE.md for full rationale)

- Private repo, pushed to `github.com/syzayd/dreamos-college-project` (named with a suffix -
  `syzayd/dreamos` already exists as an unrelated project, don't rename into that).
- Tauri (not Electron) for the desktop shell.
- Indexes a **sandboxed demo vault** (`demo-vault/`), never a real personal folder.
- Build order: core 3 modules first (NL Interface, Semantic Search, AI Organizer).
  Knowledge Graph, Context Memory Engine, Intelligent Workspace Manager deferred to a later
  phase - that phase is now Monitoring-II/III, see below.

## What's done

- **Core 3 modules**, all built, integrated, and tested end-to-end: indexing (ChromaDB +
  SQLite, skip-unchanged via content hash), semantic search (similarity threshold 0.55,
  tuned for nomic-embed-text's embedding anisotropy - see CLAUDE.md), AI organizer (LLM
  categorization, reversible apply/revert with empty-folder cleanup on revert), and an NL
  interface that classifies intent (search / open / organize / other) and routes accordingly.
- **"Open" intent** (added 2026-08-04): "open my resume" resolves the best semantic match and
  launches it in its OS-default app via `@tauri-apps/plugin-opener`, scoped to `$HOME/**` in
  `frontend/src-tauri/capabilities/default.json`. Getting this working surfaced two real
  Tauri permission bugs (missing `opener:allow-open-path` permission, then a missing scope
  allow-list - the `open_path` command is deny-by-default with an empty scope) - both fixed
  and verified against the real desktop shell via WebView2's Chrome DevTools Protocol
  (`--remote-debugging-port` + `--remote-allow-origins=*`), not just a plain browser.
- **Determinism fix**: `ollama_client.generate_json` forces `temperature: 0` - without it the
  same file's category flipped between identical calls.
- **Tests**: 21 pytest tests, all passing, fully offline (embeddings/LLM mocked via
  `tests/conftest.py` fixtures). No Ollama instance required to run the suite.
- **Packaging**: Windows installers built via `npm run tauri build` (MSI/WiX and NSIS, both
  verified valid). A one-click launcher (`run-dreamos.bat` / `run-dreamos.ps1`) starts Ollama
  and the backend only if not already running, indexes the vault, and launches the app -
  tested on both cold-start and already-running paths.
- **GitHub**: pushed to `github.com/syzayd/dreamos-college-project` (private), in sync.
- **Project Monitoring - I deliverable** (2026-08-04): `docs/DreamOS-Project-Monitoring-I.docx`
  - literature review (real citations: the AIOS/LSFS semantic-file-system paper, ICLR 2025;
  word2vec; Sentence-BERT; compared against Windows Search, Spotlight, Everything), full
  requirement analysis, and system design (architecture, DFD context/L1, use case/class/
  sequence UML, ER diagram, UI wireframe - 9 diagrams in `docs/diagrams/`, Mermaid sources +
  rendered PNGs, regenerable via `docs/build_report.js`). States current progress honestly:
  3 of 6 proposed modules built/tested/packaged, roughly 50% of module scope against the
  ~20% the guidelines expect at this checkpoint.

## Next steps

- **Monitoring - II** (target ~80%): build Knowledge Graph (file relationship graph) and
  Context Memory Engine (session-aware retrieval); begin Intelligent Workspace Manager;
  extend the test suite to the new modules; add 2-3 more peer-reviewed sources to the
  literature review per department expectation.
- **Monitoring - III** (target 100%): finish Intelligent Workspace Manager; full integration
  and performance testing on a larger vault; final project report (results/discussion/
  conclusion/future scope); prepare and submit the accompanying research paper; final
  submission to GitHub/department.
- Known model-quality limitation to document, not fix further: `llama3.2:3b` categorization
  has a couple of genuinely defensible edge cases (e.g. a note discussing a project decision
  could reasonably be `project_docs` or `misc`) - realistic small-local-model behavior worth
  reporting honestly rather than chasing as a bug.
- Known limitation, same category (found 2026-08-06): the "open" intent auto-launches its
  single best semantic match, guarded by an ambiguity margin (`nl_interface.py`,
  `settings.open_ambiguity_margin`) that blocks auto-open when the top two candidates are
  within 0.05 similarity of each other. That catches close ties, but not a *confidently wrong*
  single match - e.g. "open my CV" resolves to a teammate's draft CV
  (`Untitled document.txt`) instead of your own resume (`final_final_v3.txt`), because
  `nomic-embed-text` keys off the literal word "CV" vs "resume" with no concept of file
  ownership. **Demo phrasing that works reliably: "open my resume" / "open the resume"**
  (0.62 similarity, clear winner). Avoid "open my CV" live. Decided 2026-08-06 not to chase
  this further pre-demo (would need hybrid lexical+semantic reranking or a UI confirm-before-open
  step) - rehearsing around the known-bad phrasing is the right scope for now.
- Before the actual Monitoring-I presentation: run `run-dreamos.bat` once ahead of time to
  warm up any model pulls, and reset the demo vault with
  `python backend/scripts/generate_demo_vault.py --reset` after (not before) demoing the
  organize feature, so it's pristine again for the next run-through.

## How to resume

Read `CLAUDE.md` in this repo first (scope decisions, run commands, the embedding threshold
gotcha). Then `README.md` for the architecture map and how to run everything.
