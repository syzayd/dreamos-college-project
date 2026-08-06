from dataclasses import dataclass, field

from app import organizer, search
from app.config import settings
from app.ollama_client import generate_json

INTENTS = ["search", "open", "organize", "other"]

SYSTEM_PROMPT = (
    "You classify what a user wants from a semantic file-management assistant. Respond with "
    'JSON only, matching this shape exactly: {"intent": one of ["search", "open", "organize", "other"], '
    '"query": "the search/open target text, empty string if intent is \'other\'"}. '
    "Use 'open' when the user wants to directly open/launch/view a specific file right now "
    "(e.g. \"open my resume\", \"open the invoice\") - this differs from 'search', which is "
    "for exploring or recalling what exists (e.g. \"find my resume\", \"do I have anything "
    "about invoices\") without necessarily wanting it opened. "
    "Use 'organize' when the user wants files tagged, categorized, sorted, or cleaned up. "
    "Use 'other' for anything else (greetings, unrelated questions)."
)


@dataclass
class NLResponse:
    intent: str
    message: str
    search_results: list[search.SearchHit] = field(default_factory=list)
    organize_suggestions: list[dict] = field(default_factory=list)
    open_path: str | None = None


def handle_message(user_message: str) -> NLResponse:
    classification = generate_json(user_message, system=SYSTEM_PROMPT)
    intent = classification.get("intent", "other")
    if intent not in INTENTS:
        intent = "other"

    if intent == "search":
        query = classification.get("query") or user_message
        hits = search.semantic_search(query)
        if not hits:
            return NLResponse(
                intent=intent,
                message=f"No files matched '{query}' above the similarity threshold.",
            )
        return NLResponse(
            intent=intent,
            message=f"Found {len(hits)} file(s) matching '{query}'.",
            search_results=hits,
        )

    if intent == "open":
        query = classification.get("query") or user_message
        hits = search.semantic_search(query, top_k=3)
        if not hits:
            return NLResponse(
                intent=intent,
                message=f"No file found matching '{query}'.",
            )
        best = hits[0]
        runner_up = hits[1] if len(hits) > 1 else None
        if runner_up is not None and (best.similarity - runner_up.similarity) < settings.open_ambiguity_margin:
            return NLResponse(
                intent=intent,
                message=(
                    f"Found {len(hits)} files that could match '{query}' - too close to pick "
                    "automatically. Did you mean one of these?"
                ),
                search_results=hits,
            )
        return NLResponse(
            intent=intent,
            message=f"Opening {best.name}...",
            search_results=[best],
            open_path=best.abs_path,
        )

    if intent == "organize":
        unorganized = organizer.preview_unorganized()
        if not unorganized:
            return NLResponse(intent=intent, message="Every indexed file already has an organize suggestion.")

        suggestions = [
            organizer.suggest_for_file(item["path"]) for item in unorganized
        ]
        return NLResponse(
            intent=intent,
            message=(
                f"Generated organize suggestions for {len(suggestions)} file(s). "
                "Review and apply them individually - nothing has been moved yet."
            ),
            organize_suggestions=[s.__dict__ for s in suggestions],
        )

    return NLResponse(
        intent=intent,
        message="I can help you search your files by meaning, or organize unsorted files. Try asking to find or organize something.",
    )
