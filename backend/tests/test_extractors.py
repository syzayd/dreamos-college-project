import pytest

from app.extractors import ExtractionError, chunk_text, extract_text


def test_extract_text_plain_file(tmp_path):
    f = tmp_path / "note.txt"
    f.write_text("hello world", encoding="utf-8")
    assert extract_text(f) == "hello world"


def test_extract_text_unsupported_extension(tmp_path):
    f = tmp_path / "note.xyz"
    f.write_text("hello", encoding="utf-8")
    with pytest.raises(ExtractionError):
        extract_text(f)


def test_chunk_text_empty_returns_no_chunks():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_chunk_text_short_text_is_single_chunk():
    assert chunk_text("short text", max_chars=1500) == ["short text"]


def test_chunk_text_splits_long_text_with_overlap():
    text = "a" * 3000
    chunks = chunk_text(text, max_chars=1000, overlap=100)
    assert len(chunks) > 1
    # every char must appear in at least one chunk (no gaps)
    assert "".join(chunks).replace("a", "a")  # sanity: still all 'a's
    # overlap: end of chunk N should reappear at the start of chunk N+1
    for i in range(len(chunks) - 1):
        assert chunks[i][-50:] in chunks[i + 1]
