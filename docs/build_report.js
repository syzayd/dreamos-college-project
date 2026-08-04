const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, TableOfContents,
  TabStopType, TabStopPosition,
} = require("docx");

const DIAG = path.join(__dirname, "diagrams");
const img = (name) => fs.readFileSync(path.join(DIAG, name));

const CONTENT_WIDTH = 9360; // DXA, US Letter, 1" margins
const border = { style: BorderStyle.SINGLE, size: 2, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
const HEAD_FILL = "2E4B3F";
const ACCENT = "2E4B3F";

function cell(text, opts = {}) {
  const { header = false, width, align = AlignmentType.LEFT, bold = false } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: header ? { fill: HEAD_FILL, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold: bold || header, color: header ? "FFFFFF" : "1B1B1B", size: 19 })],
    })],
  });
}

function row(cells) {
  return new TableRow({ children: cells });
}

function table(widths, headerRow, bodyRows) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      row(headerRow.map((t, i) => cell(t, { header: true, width: widths[i] }))),
      ...bodyRows.map((r) => row(r.map((t, i) => cell(t, { width: widths[i] })))),
    ],
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, ...opts })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: "bullets", level }, spacing: { after: 60 }, children: [new TextRun(text)] });
}
function numbered(text) {
  return new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [new TextRun(text)] });
}
function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 260 },
    children: [new TextRun({ text, italics: true, size: 18, color: "555555" })],
  });
}
function figure(filename, width, height, capText) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 40 },
      children: [new ImageRun({
        type: "png",
        data: img(filename),
        transformation: { width, height },
        altText: { title: capText, description: capText, name: filename },
      })],
    }),
    caption(capText),
  ];
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: "1B1B1B" } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 420, after: 200 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } } },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "1B1B1B" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, italics: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
    ],
  },
  sections: [
    // ---------- SECTION A: TITLE PAGE ----------
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: [
        new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MGM UNIVERSITY", bold: true, size: 30 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Institute of Information and Communication Technology (IICT)", bold: true, size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: "Department of Information Technology", size: 22 })] }),

        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000, after: 100 }, children: [new TextRun({ text: "DreamOS", bold: true, size: 56, color: ACCENT })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "An AI-Native Semantic File Management Shell", size: 26, italics: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: "Final Year B.Tech Project", size: 24 })] }),

        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "PROJECT MONITORING - I REPORT", bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 900 }, children: [new TextRun({ text: "Literature Review, Requirement Analysis, System Design and Implementation Status", size: 20, color: "555555" })] }),

        table(
          [3600, 2880, 2880],
          ["Team Member", "PRN / Roll No.", "Role"],
          [
            ["Zaid Ali Syed", "2305139", "Team Lead - Backend, AI/LLM Integration, Desktop Shell"],
            ["Om Vyas", "2305170", "Contributor"],
            ["Krushna Kadam", "2305165", "Contributor"],
          ],
        ),

        new Paragraph({ spacing: { before: 900 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Repository: github.com/syzayd/dreamos-college-project (private)", size: 19, color: "555555" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "August 2026", size: 19, color: "555555" })] }),
      ],
    },

    // ---------- SECTION B: TOC ----------
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: [
        h1("Table of Contents"),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },

    // ---------- SECTION C: BODY ----------
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 4 } },
            children: [
              new TextRun({ text: "DreamOS - Project Monitoring I", size: 16, color: "777777" }),
              new TextRun({ text: "\tSemantic AI-Native File Management", size: 16, color: "777777" }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 16, color: "777777" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "777777" }),
              new TextRun({ text: " of ", size: 16, color: "777777" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "777777" }),
            ],
          })],
        }),
      },
      children: [

        // 1. INTRODUCTION
        h1("1. Introduction and Problem Statement"),
        p("Current desktop operating systems organize files around a rigid, human-invented structure: folders, subfolders, and filenames chosen at the moment of saving. As the number of files on a personal machine grows into the thousands, this structure breaks down - the name a user chose six months ago rarely matches how they describe the file today (“the resume with the internship section” rather than resume_final_v3.txt). Locating a file becomes an exercise in remembering one's own past naming decisions rather than describing what is actually needed."),
        p("DreamOS is an AI-native desktop shell that replaces this name-and-location model with a meaning-based one. A local FastAPI backend indexes a folder into a vector store and a metadata database; a Tauri and React desktop application then lets the user describe, in plain natural language, what they want - to find it, open it, or have it organized - instead of remembering an exact name or path. All inference (embeddings and language generation) runs on a local Ollama runtime, so no file content or query ever leaves the machine."),
        p("This report documents the state of the project at Project Monitoring - I: the literature and background study behind the approach, the requirement analysis, the complete system design (architecture, data flow, UML, database, and UI), and the implementation delivered so far."),

        h2("1.1 Problem Statement"),
        p("Design and implement a locally-run, AI-native file management layer that lets a user retrieve, open, and organize files on their machine by describing their meaning or intent in natural language, without depending on exact filenames, folder locations, or a cloud service."),

        h2("1.2 Objectives"),
        numbered("Build a semantic index of a file vault using local embedding models, so files can be retrieved by meaning rather than by exact name."),
        numbered("Provide a single natural-language interface that classifies user intent (search, open, or organize) and routes it to the correct backend module."),
        numbered("Retrieve files by natural-language query, ranked by semantic similarity, and allow the top match to be opened directly in its default application."),
        numbered("Use a local LLM to generate a summary, tags, and a category for each file, and apply that organization to the file system in a reversible way."),
        numbered("Keep the entire pipeline local and offline-capable (no cloud LLM or vector database dependency) to preserve user privacy."),
        numbered("(Deferred to a later phase) Extend the system with a knowledge graph of file relationships, a context memory engine, and an intelligent workspace manager."),

        // 2. LITERATURE REVIEW
        h1("2. Literature Review and Background Study"),
        p("The core technical idea behind DreamOS - representing files as vectors in an embedding space and retrieving them by semantic similarity rather than keyword match - builds on two established lines of work: (a) dense text embeddings for semantic similarity, and (b) semantic/AI-native file systems. Both are reviewed below, alongside the consumer file-search tools DreamOS is positioned against."),

        h2("2.1 Foundational Technique: Dense Embeddings for Semantic Similarity"),
        p("Mikolov et al. [2] showed that words (and, by extension, longer text) can be mapped into a continuous vector space in which geometric distance corresponds to semantic relatedness - the basis of every modern embedding model, including the one used in this project. Reimers and Gurevych [3] extended this idea to full sentences and paragraphs with Sentence-BERT, making it practical to embed and compare whole documents efficiently, which is exactly the operation DreamOS performs once per indexed file. DreamOS uses a local model in this same family, nomic-embed-text (served through Ollama), together with the open-source vector database Chroma [4] for nearest-neighbour retrieval."),

        h2("2.2 Directly Related Work: Semantic and AI-Native File Systems"),
        p("The closest published system to DreamOS is Shi et al. [1], “From Commands to Prompts: LLM-based Semantic File System for AIOS” (ICLR 2025), which proposes an LLM-based Semantic File System (LSFS) built on embedding-vector indexes of files, exposed as a set of APIs that let an LLM agent create, retrieve, update, and roll up files using natural-language prompts instead of rigid file-system commands. LSFS demonstrates, at the operating-system-agent level, that embedding-vector indexes plus an LLM front end are a workable substitute for command-based file operations - directly validating the architectural bet DreamOS makes."),
        p("LSFS, however, targets LLM agents as the consumer of the file system through an API, not an end user through a conversational interface. DreamOS instead exposes the same idea - embedding-vector indexing plus LLM-mediated intent - directly to a human user through a single chat surface that both retrieves and acts on files (opens, organizes)."),

        h2("2.3 Existing Consumer Solutions"),
        p("Mainstream desktop search remains overwhelmingly keyword- and metadata-driven rather than meaning-driven:"),
        bullet("Windows Search / Indexing Service [5] indexes filenames, common metadata fields, and text content, but matches queries lexically - a query has to share vocabulary with the target file."),
        bullet("macOS Spotlight [6] layers metadata and some heuristic ranking on top of a similar keyword index; it is fast and system-wide but not built around embedding similarity."),
        bullet("Everything by voidtools [7] indexes the NTFS Master File Table for near-instant filename search, but is explicitly filename-only - it has no notion of file content or meaning."),

        h2("2.4 Comparison Summary"),
        table(
          [1900, 2800, 2860, 1800],
          ["System", "Retrieval basis", "Strength", "Limitation vs. DreamOS"],
          [
            ["Windows Search", "Keyword / metadata index", "Built into OS, fast", "No semantic matching; no act-on-result (open/organize) from a single query"],
            ["macOS Spotlight", "Keyword / metadata + heuristics", "Fast, system-wide UX", "Not embedding-based; not natural-language conversational"],
            ["Everything (voidtools)", "Filename index (MFT)", "Extremely fast filename lookup", "Filename only, no content understanding"],
            ["AIOS LSFS [1] (ICLR 2025)", "LLM + embedding-vector file index", "Proves embedding-based file indexing at OS level", "API for LLM agents, not an end-user chat interface; not shown running fully local/offline"],
            ["DreamOS (this project)", "Local embeddings + local LLM intent routing", "Single NL interface for search, open, and organize; fully local, private", "n/a - this is the baseline being proposed"],
          ],
        ),

        h2("2.5 Research Gap"),
        p("Consumer desktop search tools remain keyword- or metadata-driven. Where embedding-based semantic file indexing does exist in the literature (LSFS [1]), it is positioned as an API layer for LLM agents rather than a direct, single natural-language surface for end users, and is not demonstrated running entirely on local models without a cloud LLM dependency. DreamOS targets this gap: one conversational interface, backed by locally-run embeddings and a locally-run LLM, that both retrieves files by meaning and acts on them (opens, organizes) - with no file content or query leaving the user's machine."),

        // 3. REQUIREMENT ANALYSIS
        h1("3. Requirement Analysis"),
        h2("3.1 Functional Requirements"),
        table(
          [900, 4900, 3560],
          ["ID", "Requirement", "Status"],
          [
            ["FR1", "Accept a single natural-language message from the user through a chat-style interface", "Implemented"],
            ["FR2", "Classify the message's intent as search, open, organize, or other, using a local LLM", "Implemented"],
            ["FR3", "Semantically search the indexed vault and return ranked results with a similarity score and snippet", "Implemented"],
            ["FR4", "Resolve an “open” request to the best-matching file and launch it in its OS-default application", "Implemented"],
            ["FR5", "Generate an AI summary, tag list, and category suggestion for a given file", "Implemented"],
            ["FR6", "Apply an AI-organized move (into a semantic category folder) and reversibly revert it", "Implemented"],
            ["FR7", "Preview all currently unorganized files before applying any suggestion", "Implemented"],
            ["FR8", "Index (and incrementally re-index) a folder of files, skipping unchanged files by content hash", "Implemented"],
            ["FR9", "Build a graph of relationships between files (referenced, similar, related-by-topic)", "Planned - Monitoring II"],
            ["FR10", "Retain short-term conversational/session context across multiple chat turns", "Planned - Monitoring II"],
            ["FR11", "Proactively recommend workspace actions based on usage patterns", "Planned - Monitoring III"],
          ],
        ),

        h2("3.2 Technical Requirements"),
        h3("Programming Languages and Frameworks"),
        bullet("Backend: Python 3, FastAPI, Pydantic / pydantic-settings, Uvicorn"),
        bullet("Frontend / Desktop shell: TypeScript, React, Vite, Tauri v2 (Rust)"),
        bullet("AI / ML runtime: Ollama, running nomic-embed-text (embeddings) and llama3.2 (classification, summarization, tagging)"),
        h3("Data Storage"),
        bullet("SQLite - structured file metadata (path, hash, size, AI-generated summary/tags/category)"),
        bullet("ChromaDB - persistent local vector store for embeddings"),
        h3("Tools"),
        bullet("Git / GitHub (private repository) for version control"),
        bullet("VS Code as the primary IDE"),
        bullet("pytest for a fully offline, keyless automated test suite (embeddings and LLM calls mocked)"),
        bullet("WiX Toolset and NSIS (via the Tauri bundler) for Windows installer generation"),
        bullet("Mermaid for architecture, DFD, UML, and ER documentation diagrams"),
        h3("Hardware / Runtime Needs"),
        bullet("No GPU strictly required - nomic-embed-text and llama3.2 run locally on CPU through Ollama; a GPU accelerates but is optional"),
        bullet("Runs entirely on a single local machine; no external API keys and no network dependency at runtime"),

        // 4. SYSTEM DESIGN
        h1("4. System Design"),
        p("DreamOS follows a client-server architecture on a single machine: a Tauri/React desktop client calls a local FastAPI service over HTTP (127.0.0.1:8420), which in turn calls a local Ollama LLM runtime and two local data stores (SQLite for metadata, ChromaDB for vectors)."),

        h2("4.1 System Architecture"),
        ...figure("01_architecture.png", 600, 347, "Fig. 4.1 - System architecture: desktop client, FastAPI backend, local AI runtime, and storage layer"),

        h2("4.2 Module Design"),
        p("The project proposal specifies six modules. The three that form the core interactive loop - Natural Language Interface, Semantic Search Engine, and AI File Organizer - are implemented and integration-tested end to end. The remaining three are deferred by a scope decision made at project kickoff and are scheduled for Monitoring II/III."),
        ...figure("02_module_design.png", 600, 161, "Fig. 4.2 - Module design: solid = implemented, dashed = deferred"),
        table(
          [2600, 4400, 2360],
          ["Module", "Input / Output", "Status"],
          [
            ["Natural Language Interface", "In: raw user message. Out: classified intent + routed response (search hits / organize suggestions / open_path)", "Built"],
            ["Semantic Search Engine", "In: query text. Out: ranked SearchHit list (path, score, snippet) above the similarity threshold", "Built"],
            ["AI File Organizer", "In: file path. Out: summary, tags, category, reasoning; reversible apply/revert move", "Built"],
            ["Knowledge Graph", "In: indexed vault. Out: graph of inter-file relationships", "Deferred - M2"],
            ["Context Memory Engine", "In: conversation history. Out: session-aware retrieval context", "Deferred - M2"],
            ["Intelligent Workspace Manager", "In: usage patterns. Out: proactive workspace recommendations", "Deferred - M3"],
          ],
        ),

        h2("4.3 Data Flow Diagrams"),
        h3("Context Level (DFD 0)"),
        ...figure("03_dfd_context.png", 560, 150, "Fig. 4.3 - DFD context level: DreamOS as a single process between the user, the local LLM runtime, and the file vault"),
        h3("Level 1"),
        ...figure("04_dfd_level1.png", 600, 327, "Fig. 4.4 - DFD level 1: intent classification fanning out to search, organize, and open-file processes"),

        h2("4.4 UML Diagrams"),
        h3("Use Case Diagram"),
        ...figure("05_use_case.png", 480, 282, "Fig. 4.5 - Use case diagram: the six user-facing actions currently exposed by the system"),
        h3("Class Diagram"),
        ...figure("06_class_diagram.png", 420, 433, "Fig. 4.6 - Class diagram: core response and settings data classes (backend/app)"),
        h3("Sequence Diagram - “open” intent"),
        p("The open-intent flow is the most recently completed feature and the one that touches every layer of the stack, so it is used here to illustrate the full request path."),
        ...figure("07_sequence_open.png", 600, 233, "Fig. 4.7 - Sequence diagram: “open my resume” from chat input to a launched file"),

        h2("4.5 Database Design"),
        p("File metadata is relational (SQLite); embeddings are stored in a vector index (ChromaDB) keyed by the same file path. The two stores are kept in sync by the indexer, which is the only writer to both."),
        new Paragraph({ children: [new PageBreak()] }),
        ...figure("08_er_diagram.png", 210, 733, "Fig. 4.8 - Entity-relationship diagram: SQLite files table and its corresponding vector store entry"),
        h3("files table - fields, keys, constraints"),
        table(
          [2200, 1600, 5560],
          ["Field", "Type", "Notes"],
          [
            ["id", "INTEGER", "Primary key, autoincrement"],
            ["path", "TEXT", "Unique - vault-relative path, also used as the Chroma vector ID"],
            ["original_path", "TEXT", "Path at time of first indexing, kept for organize/revert"],
            ["name / extension", "TEXT", "Derived from path"],
            ["size_bytes / mtime", "INTEGER / REAL", "Change-detection inputs"],
            ["content_hash", "TEXT", "Indexed - lets re-indexing skip unchanged files"],
            ["summary / tags / category", "TEXT", "AI-generated by the organizer module"],
            ["organize_reasoning / organized_at", "TEXT", "Audit trail for the applied organization, used by revert"],
          ],
        ),

        h2("4.6 UI / UX Design"),
        p("The interface is deliberately a single chat surface rather than separate search/organize screens, so that intent classification - not screen navigation - decides what happens with a request."),
        ...figure("09_wireframe.png", 480, 347, "Fig. 4.9 - Wireframe of the DreamOS chat window: one input, three response card types (search, organize, open)"),

        h2("4.7 Technology Stack"),
        table(
          [2200, 7160],
          ["Layer", "Technology"],
          [
            ["Frontend", "React + TypeScript, Vite, Tauri v2 (Rust) desktop shell, @tauri-apps/plugin-opener"],
            ["Backend", "Python 3, FastAPI, Uvicorn, Pydantic / pydantic-settings"],
            ["AI / LLM", "Ollama (local runtime): nomic-embed-text for embeddings, llama3.2 for classification, summarization and tagging"],
            ["Database", "SQLite (metadata), ChromaDB (persistent vector store)"],
            ["Testing", "pytest, with embeddings/LLM mocked for fully offline runs"],
            ["Packaging", "Tauri bundler - MSI (WiX) and NSIS Windows installers"],
            ["Version control", "Git, GitHub (private repository)"],
          ],
        ),

        // 5. IMPLEMENTATION STATUS
        h1("5. Implementation Status"),
        p("Project Monitoring - I nominally expects implementation to have started, with roughly 20% of the system underway. DreamOS is ahead of that mark: three of the six proposed modules - Natural Language Interface, Semantic Search Engine, and AI File Organizer - are fully implemented, integrated with each other and the desktop shell, automated-tested, and packaged into an installable build. Counted against the six-module proposal, that is 50% of the system's module scope working end to end, not merely scaffolded."),

        h2("5.1 What Is Working"),
        bullet("Chat-style natural-language interface with intent classification (search / open / organize / other), routed by a local LLM at temperature = 0 for deterministic behaviour"),
        bullet("Semantic search over an embedded vault with an empirically tuned similarity threshold (0.55 cosine, since nomic-embed-text places unrelated text around ~0.5 rather than near 0)"),
        bullet("“Open” intent: best-matching file resolved and launched directly in its default OS application via a scoped Tauri opener permission"),
        bullet("AI file organizer: per-file summary, tags and category generation, with a reversible apply/revert move that also cleans up now-empty category folders on revert"),
        bullet("Incremental indexer that hashes file content to skip unchanged files on re-index"),
        bullet("One-click launcher (PowerShell + .bat) that starts Ollama and the backend only if not already running, indexes the vault, and launches the desktop app"),
        bullet("Windows installers (MSI and NSIS) built via the Tauri bundler"),

        h2("5.2 Testing"),
        p("The backend carries 21 automated pytest tests, all currently passing, fully offline and keyless - embeddings and LLM calls are mocked via fixtures so the suite requires no running Ollama instance. Coverage includes indexing, semantic search ranking and thresholding, the full organize apply/revert cycle (including the empty-directory cleanup edge case), and both branches of the NL-interface “open” intent (match found, and no match found)."),
        p("Beyond automated tests, the open-file feature was verified end to end against the real desktop shell (not a plain browser) using WebView2's Chrome DevTools Protocol, which surfaced and let the team fix two real Tauri permission-scoping bugs before they could reach a demo."),

        h2("5.3 Version Control and Delivery"),
        bullet("Private repository: github.com/syzayd/dreamos-college-project, fetched and pushed with every meaningful change"),
        bullet("Reproducible demo data: a sandboxed, intentionally messy demo-vault (not real personal files) regenerated by a fixed script for repeatable demonstrations"),
        bullet("CLAUDE.md / README.md in the repository document scope decisions, the embedding-threshold tuning rationale, and exact run/build instructions"),

        h2("5.4 Deferred by Design"),
        p("Knowledge Graph, Context Memory Engine, and Intelligent Workspace Manager were deliberately deferred at project kickoff until the core interactive loop (search, open, organize) was proven end to end. That checkpoint has now been passed, so these three modules are the primary work for Monitoring - II."),

        // 6. PLAN
        h1("6. Plan for Monitoring - II and III"),
        table(
          [1500, 3900, 3960],
          ["Checkpoint", "Target implementation", "Planned work"],
          [
            ["Monitoring - II", "~80%", "Build Knowledge Graph (file relationship graph) and Context Memory Engine (session-aware retrieval); begin Intelligent Workspace Manager; broaden test coverage to the new modules; deepen literature review with additional peer-reviewed sources"],
            ["Monitoring - III", "100%", "Complete Intelligent Workspace Manager; full integration and performance testing on a larger vault; finalize project report (results, discussion, conclusion, future scope); prepare and submit the accompanying research paper; final GitHub submission"],
          ],
        ),

        // 7. REFERENCES
        h1("7. References"),
        p("[1] Z. Shi, K. Mei, M. Jin, Y. Su, C. Zuo, W. Hua, W. Xu, Y. Ren, Z. Liu, M. Du, D. Deng, and Y. Zhang, “From Commands to Prompts: LLM-based Semantic File System for AIOS,” in Proc. 13th Int. Conf. on Learning Representations (ICLR 2025). arXiv:2410.11843."),
        p("[2] T. Mikolov, K. Chen, G. Corrado, and J. Dean, “Efficient Estimation of Word Representations in Vector Space,” arXiv:1301.3781, 2013."),
        p("[3] N. Reimers and I. Gurevych, “Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks,” in Proc. EMNLP-IJCNLP, 2019."),
        p("[4] Chroma, “Chroma: the open-source embedding database,” github.com/chroma-core/chroma."),
        p("[5] Microsoft, “Windows Search overview,” Microsoft Learn documentation."),
        p("[6] Apple Inc., “Spotlight User Guide,” support.apple.com."),
        p("[7] voidtools, “Everything - locate files and folders by name instantly,” voidtools.com."),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = path.join(__dirname, "DreamOS-Project-Monitoring-I.docx");
  fs.writeFileSync(out, buffer);
  console.log("Wrote", out, buffer.length, "bytes");
});
