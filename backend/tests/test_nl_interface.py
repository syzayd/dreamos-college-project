from app.indexer import index_vault
from app.nl_interface import handle_message


def test_handle_message_routes_search_intent(isolated_env, fake_embed, fake_generate_json):
    vault = isolated_env
    content = "my resume with all my work experience"
    (vault / "resume.txt").write_text(content, encoding="utf-8")
    fake_embed[content] = [1.0, 0.0, 0.0, 0.0]
    fake_embed["find my resume"] = [1.0, 0.0, 0.0, 0.0]
    index_vault(vault)

    fake_generate_json.append({"intent": "search", "query": "find my resume"})

    response = handle_message("find my resume")

    assert response.intent == "search"
    assert len(response.search_results) == 1
    assert response.search_results[0].path == "resume.txt"


def test_handle_message_routes_organize_intent(isolated_env, fake_embed, fake_generate_json):
    vault = isolated_env
    content = "meeting notes from today's sync"
    (vault / "notes.txt").write_text(content, encoding="utf-8")
    fake_embed[content] = [0.2, 0.2, 0.2, 0.2]
    index_vault(vault)

    fake_generate_json.append({"intent": "organize", "query": ""})
    fake_generate_json.append(
        {
            "summary": "meeting notes",
            "tags": ["meeting"],
            "category": "meeting_notes",
            "reasoning": "discusses a sync",
        }
    )

    response = handle_message("please sort my files")

    assert response.intent == "organize"
    assert len(response.organize_suggestions) == 1
    assert response.organize_suggestions[0]["category"] == "meeting_notes"


def test_handle_message_falls_back_to_other_on_unknown_intent(isolated_env, fake_embed, fake_generate_json):
    fake_generate_json.append({"intent": "does_not_exist", "query": ""})

    response = handle_message("hello there")

    assert response.intent == "other"
    assert response.search_results == []
    assert response.organize_suggestions == []
