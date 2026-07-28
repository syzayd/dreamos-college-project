from pathlib import Path

PLAIN_TEXT_EXTENSIONS = {".txt", ".md", ".py", ".js"}


class ExtractionError(RuntimeError):
    pass


def extract_text(path: Path) -> str:
    ext = path.suffix.lower()

    if ext in PLAIN_TEXT_EXTENSIONS:
        return path.read_text(encoding="utf-8", errors="replace")

    if ext == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if ext == ".docx":
        import docx

        doc = docx.Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs)

    raise ExtractionError(f"Unsupported file type: {ext}")


def chunk_text(text: str, max_chars: int = 1500, overlap: int = 150) -> list[str]:
    """Splits text into overlapping chunks for embedding.

    Overlap keeps a sentence that straddles a chunk boundary searchable from either side.
    """
    text = text.strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - overlap
    return chunks
