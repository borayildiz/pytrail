"""PyTrail — a small Flask app for learning Python."""

from __future__ import annotations

import json
from pathlib import Path

from flask import Flask, jsonify, render_template

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "static" / "data" / "lessons.json"

app = Flask(__name__)


def load_curriculum() -> dict:
    with DATA_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


@app.route("/")
def home():
    data = load_curriculum()
    return render_template(
        "index.html",
        modules=data["modules"],
        challenge_count=len(data["challenges"]),
    )


@app.route("/learn/<module_id>")
@app.route("/learn/<module_id>/<lesson_id>")
def learn(module_id: str, lesson_id: str | None = None):
    data = load_curriculum()
    module = next((m for m in data["modules"] if m["id"] == module_id), None)
    if module is None:
        return render_template("404.html"), 404

    lesson = None
    if lesson_id:
        lesson = next((l for l in module["lessons"] if l["id"] == lesson_id), None)
        if lesson is None:
            return render_template("404.html"), 404
    else:
        lesson = module["lessons"][0]

    lesson_ids = [l["id"] for l in module["lessons"]]
    idx = lesson_ids.index(lesson["id"])
    prev_id = lesson_ids[idx - 1] if idx > 0 else None
    next_id = lesson_ids[idx + 1] if idx + 1 < len(lesson_ids) else None

    return render_template(
        "lesson.html",
        modules=data["modules"],
        module=module,
        lesson=lesson,
        prev_id=prev_id,
        next_id=next_id,
        is_last=next_id is None,
    )


@app.route("/quiz/<module_id>")
def quiz(module_id: str):
    data = load_curriculum()
    module = next((m for m in data["modules"] if m["id"] == module_id), None)
    if module is None:
        return render_template("404.html"), 404
    return render_template("quiz.html", modules=data["modules"], module=module)


@app.route("/practice")
@app.route("/practice/<challenge_id>")
def practice(challenge_id: str | None = None):
    data = load_curriculum()
    challenges = data["challenges"]
    challenge = None
    if challenge_id:
        challenge = next((c for c in challenges if c["id"] == challenge_id), None)
        if challenge is None:
            return render_template("404.html"), 404
    else:
        challenge = challenges[0]
    return render_template(
        "practice.html",
        modules=data["modules"],
        challenges=challenges,
        challenge=challenge,
    )


@app.route("/api/curriculum")
def api_curriculum():
    return jsonify(load_curriculum())


@app.errorhandler(404)
def not_found(_error):
    data = load_curriculum()
    return render_template("404.html", modules=data["modules"]), 404


if __name__ == "__main__":
    app.run(debug=True, port=5000)
