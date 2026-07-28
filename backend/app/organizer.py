import shutil
from dataclasses import dataclass
from datetime import datetime, timezone

from app.config import settings
from app.db import connection
from app.ollama_client import generate_json

CATEGORIES = [
    "resumes",
    "invoices",
    "meeting_notes",
    "code",
    "project_docs",
    "personal",
    "misc",
]

CATEGORY_DESCRIPTIONS = {
    "resumes": "CVs, job applications, skills/education summaries about a person's career",
    "invoices": "bills, receipts, payments, or other financial transactions",
    "meeting_notes": "notes taken during or about a specific meeting, call, or standup between people",
    "code": "source code files: functions, scripts, or database queries, not prose that merely mentions code",
    "project_docs": "specs, proposals, architecture notes, or plans for a specific project, trip, or task - not a record of a conversation",
    "personal": "journal entries, recipes, personal reminders, hobbies, or life admin unrelated to any project",
    "misc": "only if nothing above clearly fits",
}

FEW_SHOT_EXAMPLES = """
Examples of correct categorization (learn the pattern, do not just match keywords):
- A recipe, a personal trip itinerary, a workout log, or a diary entry about your day
  (even if it mentions debugging code) -> personal, NOT project_docs or meeting_notes.
- A collection of quotes or aphorisms, even ones about programming -> personal, NOT code.
- A written technical specification or architecture document in prose -> project_docs,
  NOT code (code means actual source: functions, scripts, SQL statements).
- Notes written DURING or directly summarizing a call/standup/sync between named people
  -> meeting_notes. A solo journal entry that merely mentions a technical problem is
  personal, not meeting_notes.
"""

SYSTEM_PROMPT = (
    "You are a file organizing assistant. Given a file's name and content, respond with "
    "JSON only, matching this shape exactly: "
    '{"summary": "one sentence", "tags": ["tag1", "tag2", "tag3"], '
    f'"category": one of {CATEGORIES}, "reasoning": "one sentence explaining the category choice"}}. '
    "Tags should be short lowercase keywords. Pick the single best-fitting category using these "
    f"definitions: {CATEGORY_DESCRIPTIONS}.\n{FEW_SHOT_EXAMPLES}"
)


@dataclass
class OrganizeSuggestion:
    path: str
    name: str
    summary: str
    tags: list[str]
    category: str
    reasoning: str


def suggest_organization(rel_path: str, content: str) -> OrganizeSuggestion:
    prompt = f"Filename: {rel_path}\n\nContent (may be truncated):\n{content[:3000]}"
    result = generate_json(prompt, system=SYSTEM_PROMPT)

    category = result.get("category", "misc")
    if category not in CATEGORIES:
        category = "misc"

    return OrganizeSuggestion(
        path=rel_path,
        name=rel_path.rsplit("/", 1)[-1],
        summary=result.get("summary", ""),
        tags=[str(t).lower() for t in result.get("tags", [])][:5],
        category=category,
        reasoning=result.get("reasoning", ""),
    )


def preview_unorganized(limit: int = 50) -> list[dict]:
    """Lists indexed files that don't yet have an organizer suggestion, without calling the LLM."""
    with connection() as conn:
        rows = conn.execute(
            "SELECT path, name FROM files WHERE category IS NULL LIMIT ?", (limit,)
        ).fetchall()
    return [dict(row) for row in rows]


def suggest_for_file(rel_path: str) -> OrganizeSuggestion:
    from app.extractors import extract_text

    full_path = settings.vault_dir / rel_path
    content = extract_text(full_path)
    suggestion = suggest_organization(rel_path, content)

    with connection() as conn:
        conn.execute(
            """
            UPDATE files
            SET summary = ?, tags = ?, category = ?, organize_reasoning = ?
            WHERE path = ?
            """,
            (
                suggestion.summary,
                ",".join(suggestion.tags),
                suggestion.category,
                suggestion.reasoning,
                rel_path,
            ),
        )
    return suggestion


def apply_organization(rel_path: str) -> str:
    """Moves the file into vault/<category>/<name>. Reversible via revert_organization,
    since original_path is preserved in the DB and never overwritten after the first move.
    """
    with connection() as conn:
        row = conn.execute(
            "SELECT category, original_path FROM files WHERE path = ?", (rel_path,)
        ).fetchone()
        if row is None:
            raise ValueError(f"No indexed file at {rel_path}")
        if row["category"] is None:
            raise ValueError(f"No organize suggestion yet for {rel_path} - call suggest_for_file first")

        category = row["category"]
        current_full = settings.vault_dir / rel_path
        new_rel = f"{category}/{current_full.name}"
        new_full = settings.vault_dir / new_rel

        new_full.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(current_full), str(new_full))

        conn.execute(
            "UPDATE files SET path = ?, organized_at = ? WHERE path = ?",
            (new_rel, datetime.now(timezone.utc).isoformat(), rel_path),
        )

        from app import vectorstore
        from app.indexer import index_one_file

        vectorstore.delete_chunks_for_path(rel_path)
        index_one_file(conn, settings.vault_dir, new_full, new_rel)

    return new_rel


def revert_organization(rel_path: str) -> str:
    """Moves a file back to its original (pre-organize) location in the vault root."""
    with connection() as conn:
        row = conn.execute(
            "SELECT original_path FROM files WHERE path = ?", (rel_path,)
        ).fetchone()
        if row is None:
            raise ValueError(f"No indexed file at {rel_path}")

        original_rel = row["original_path"]
        current_full = settings.vault_dir / rel_path
        original_full = settings.vault_dir / original_rel
        category_dir = current_full.parent

        original_full.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(current_full), str(original_full))

        if category_dir != settings.vault_dir and not any(category_dir.iterdir()):
            category_dir.rmdir()

        conn.execute(
            "UPDATE files SET path = ?, organized_at = NULL WHERE path = ?",
            (original_rel, rel_path),
        )

        from app import vectorstore
        from app.indexer import index_one_file

        vectorstore.delete_chunks_for_path(rel_path)
        index_one_file(conn, settings.vault_dir, original_full, original_rel)

    return original_rel
