import chromadb
from chromadb.api.models.Collection import Collection

from app.config import settings

_client = None


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=str(settings.chroma_dir))
    return _client


def get_collection() -> Collection:
    return get_client().get_or_create_collection(
        name="dreamos_files",
        metadata={"hnsw:space": "cosine"},
    )


def close_client() -> None:
    """Releases the PersistentClient so its sqlite handle isn't held open.

    Windows raises WinError 32 if a TemporaryDirectory (used in tests) tears down while
    this client still has the file open - always close before the test fixture cleans up.
    """
    global _client
    _client = None


def delete_chunks_for_path(path: str) -> None:
    collection = get_collection()
    collection.delete(where={"path": path})


def upsert_chunks(path: str, chunk_ids: list[str], chunks: list[str], embeddings: list[list[float]]) -> None:
    collection = get_collection()
    collection.upsert(
        ids=chunk_ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"path": path, "chunk_index": i} for i in range(len(chunks))],
    )


def query(embedding: list[float], top_k: int) -> dict:
    collection = get_collection()
    return collection.query(query_embeddings=[embedding], n_results=top_k)
