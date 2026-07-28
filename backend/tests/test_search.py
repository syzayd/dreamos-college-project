from app.config import settings
from app.indexer import index_vault
from app.search import semantic_search

RELEVANT_TEXT = "apple pie recipe with cinnamon"
IRRELEVANT_TEXT = "quarterly tax invoice line items"
QUERY_TEXT = "how do I bake an apple pie"


def _setup_vault(isolated_env, fake_embed):
    vault = isolated_env
    (vault / "relevant.txt").write_text(RELEVANT_TEXT, encoding="utf-8")
    (vault / "irrelevant.txt").write_text(IRRELEVANT_TEXT, encoding="utf-8")

    fake_embed[RELEVANT_TEXT] = [1.0, 0.0, 0.0, 0.0]
    fake_embed[IRRELEVANT_TEXT] = [0.0, 1.0, 0.0, 0.0]
    fake_embed[QUERY_TEXT] = [1.0, 0.0, 0.0, 0.0]

    index_vault(vault)
    return vault


def test_semantic_search_returns_only_matches_above_threshold(isolated_env, fake_embed, monkeypatch):
    _setup_vault(isolated_env, fake_embed)
    monkeypatch.setattr(settings, "search_similarity_threshold", 0.55)

    hits = semantic_search(QUERY_TEXT)

    paths = [h.path for h in hits]
    assert paths == ["relevant.txt"]
    assert hits[0].similarity > 0.9


def test_semantic_search_returns_nothing_when_all_below_threshold(isolated_env, fake_embed, monkeypatch):
    _setup_vault(isolated_env, fake_embed)
    # push the threshold above even the perfect match's similarity - nothing should qualify
    monkeypatch.setattr(settings, "search_similarity_threshold", 1.5)

    hits = semantic_search(QUERY_TEXT)

    assert hits == []


def test_semantic_search_respects_top_k(isolated_env, fake_embed, monkeypatch):
    vault = isolated_env
    texts = [f"topic about gardening variant {i}" for i in range(5)]
    for i, text in enumerate(texts):
        (vault / f"doc{i}.txt").write_text(text, encoding="utf-8")
        fake_embed[text] = [1.0, 0.0, 0.0, 0.0]

    query = "gardening tips"
    fake_embed[query] = [1.0, 0.0, 0.0, 0.0]
    monkeypatch.setattr(settings, "search_similarity_threshold", 0.5)

    index_vault(vault)
    hits = semantic_search(query, top_k=2)

    assert len(hits) == 2
