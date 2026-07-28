"""Very early prototype - a Flask app for a completely different course project
(library book search). Kept for reference on how we structured routes before
switching this project to FastAPI."""

from flask import Flask, request

app = Flask(__name__)

@app.route("/search")
def search():
    query = request.args.get("q", "")
    return {"query": query, "results": []}
