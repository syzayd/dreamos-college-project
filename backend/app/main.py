from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import nl_interface, organizer, search
from app.db import init_db
from app.indexer import index_vault
from app.ollama_client import OllamaError

app = FastAPI(title="DreamOS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local desktop app only, no browser deployment
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.exception_handler(OllamaError)
def ollama_error_handler(_request, exc: OllamaError):
    raise HTTPException(status_code=503, detail=str(exc))


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/index")
def run_index() -> dict:
    try:
        result = index_vault()
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "indexed": result.indexed,
        "skipped_unchanged": result.skipped_unchanged,
        "errors": result.errors,
    }


class SearchRequest(BaseModel):
    query: str
    top_k: int | None = None


@app.post("/search")
def run_search(req: SearchRequest) -> dict:
    try:
        hits = search.semantic_search(req.query, top_k=req.top_k)
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"hits": [asdict(h) for h in hits]}


@app.get("/organize/preview")
def organize_preview() -> dict:
    return {"unorganized": organizer.preview_unorganized()}


class OrganizeSuggestRequest(BaseModel):
    path: str


@app.post("/organize/suggest")
def organize_suggest(req: OrganizeSuggestRequest) -> dict:
    try:
        suggestion = organizer.suggest_for_file(req.path)
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return asdict(suggestion)


class OrganizePathRequest(BaseModel):
    path: str


@app.post("/organize/apply")
def organize_apply(req: OrganizePathRequest) -> dict:
    try:
        new_path = organizer.apply_organization(req.path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"new_path": new_path}


@app.post("/organize/revert")
def organize_revert(req: OrganizePathRequest) -> dict:
    try:
        original_path = organizer.revert_organization(req.path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"original_path": original_path}


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
def chat(req: ChatRequest) -> dict:
    try:
        response = nl_interface.handle_message(req.message)
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "intent": response.intent,
        "message": response.message,
        "search_results": [asdict(h) for h in response.search_results],
        "organize_suggestions": response.organize_suggestions,
    }
