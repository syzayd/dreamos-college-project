import pytest

from app.db import connection
from app.indexer import index_vault
from app.organizer import apply_organization, revert_organization, suggest_for_file


def _index_one(isolated_env, fake_embed, name: str, content: str):
    vault = isolated_env
    (vault / name).write_text(content, encoding="utf-8")
    fake_embed[content] = [0.1, 0.2, 0.3, 0.4]
    index_vault(vault)
    return vault


def test_suggest_for_file_stores_category_summary_tags(isolated_env, fake_embed, fake_generate_json):
    vault = _index_one(isolated_env, fake_embed, "a.txt", "some resume content")
    fake_generate_json.append(
        {"summary": "a resume", "tags": ["resume", "cv"], "category": "resumes", "reasoning": "looks like a CV"}
    )

    suggestion = suggest_for_file("a.txt")

    assert suggestion.category == "resumes"
    assert suggestion.tags == ["resume", "cv"]
    with connection() as conn:
        row = conn.execute("SELECT category, summary FROM files WHERE path='a.txt'").fetchone()
    assert row["category"] == "resumes"
    assert row["summary"] == "a resume"


def test_suggest_for_file_falls_back_to_misc_on_invalid_category(isolated_env, fake_embed, fake_generate_json):
    _index_one(isolated_env, fake_embed, "a.txt", "ambiguous content")
    fake_generate_json.append(
        {"summary": "unclear", "tags": [], "category": "not_a_real_category", "reasoning": "unsure"}
    )

    suggestion = suggest_for_file("a.txt")

    assert suggestion.category == "misc"


def test_apply_organization_moves_file_and_is_reversible(isolated_env, fake_embed, fake_generate_json):
    vault = _index_one(isolated_env, fake_embed, "invoice.txt", "billing details here")
    fake_generate_json.append(
        {"summary": "an invoice", "tags": ["billing"], "category": "invoices", "reasoning": "financial doc"}
    )
    suggest_for_file("invoice.txt")

    new_path = apply_organization("invoice.txt")

    assert new_path == "invoices/invoice.txt"
    assert (vault / "invoices" / "invoice.txt").exists()
    assert not (vault / "invoice.txt").exists()
    with connection() as conn:
        row = conn.execute("SELECT path, original_path FROM files WHERE original_path='invoice.txt'").fetchone()
    assert row["path"] == "invoices/invoice.txt"
    assert row["original_path"] == "invoice.txt"

    reverted_path = revert_organization("invoices/invoice.txt")

    assert reverted_path == "invoice.txt"
    assert (vault / "invoice.txt").exists()
    assert not (vault / "invoices" / "invoice.txt").exists()
    assert not (vault / "invoices").exists()  # empty category dir cleaned up, not left behind


def test_apply_organization_without_suggestion_raises(isolated_env, fake_embed, fake_generate_json):
    _index_one(isolated_env, fake_embed, "a.txt", "no suggestion yet")

    with pytest.raises(ValueError):
        apply_organization("a.txt")
