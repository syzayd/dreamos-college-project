from dataclasses import dataclass, field

from app import organizer, search
from app.ollama_client import generate_json

INTENTS = ["search", "organize", "other"]

SYSTEM_PROMPT = (
    "You classify what a user wants from a semantic file-management assistant. Respond with "
    'JSON only, matching this shape exactly: {"intent": one of ["search", "organize", "other"], '
    '"query": "the search query text, empty string if intent is not search"}. '
    "Use 'search' when the user is trying to find or recall a file or its contents. "
    "Use 'organize' when the user wants files tagged, categorized, sorted, or cleaned up. "
    "Use 'other' for anything else (greetings, unrelated questions)."
)


@dataclass
class NLResponse:
    intent: str
    message: str
    search_results: list[search.SearchHit] = field(default_factory=list)
    organize_suggestions: list[dict] = field(default_factory=list)


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
