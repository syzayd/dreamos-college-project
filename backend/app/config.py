from pathlib import Path

from pydantic import ConfigDict
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    vault_dir: Path = PROJECT_DIR / "demo-vault"
    data_dir: Path = BACKEND_DIR / "data"
    chroma_dir: Path = BACKEND_DIR / "data" / "chroma"
    sqlite_path: Path = BACKEND_DIR / "data" / "dreamos.db"

    ollama_base_url: str = "http://localhost:11434"
    embed_model: str = "nomic-embed-text"
    llm_model: str = "llama3.2"

    # nomic-embed-text puts unrelated text around ~0.5 cosine similarity, not near 0 -
    # a naive high threshold (e.g. 0.8) silently drops every real match. Tuned empirically
    # against the demo vault's known-relevant/known-irrelevant query pairs.
    search_similarity_threshold: float = 0.55
    search_top_k: int = 8

    supported_extensions: tuple[str, ...] = (
        ".txt",
        ".md",
        ".py",
        ".js",
        ".pdf",
        ".docx",
    )

    model_config = ConfigDict(env_prefix="DREAMOS_")


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
