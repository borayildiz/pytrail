# PyTrail

Interactive Python learning app: short lessons, module quizzes, and practice challenges with progress saved in your browser.

## Features

- **4 modules** — Basics, Control Flow, Data Structures, Functions
- **12 lessons** with examples and tips
- **Quizzes** after each module
- **Practice challenges** with run-tests, hints, and solutions
- **Progress tracking** via `localStorage`

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000).

## Project layout

```
app.py                 Flask app
requirements.txt
static/
  css/style.css
  js/app.js
  data/lessons.json    Curriculum content
templates/             Jinja pages
```

## Notes

Practice challenges are written in Python-style syntax and checked in the browser with a small translator for the curated exercises (so you can try them without a server-side interpreter).

## License

MIT
