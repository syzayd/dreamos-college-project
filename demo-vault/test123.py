"""Scratch script for testing the Ollama embeddings endpoint locally."""

import requests

def embed(text: str) -> list[float]:
    resp = requests.post(
        "http://localhost:11434/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]
