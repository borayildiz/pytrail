(() => {
  const STORAGE_KEY = "pytrail-progress-v1";

  const readProgress = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { lessons: {}, quizzes: {} };
    } catch {
      return { lessons: {}, quizzes: {} };
    }
  };

  const writeProgress = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateProgressUI(data);
  };

  const lessonKey = (moduleId, lessonId) => `${moduleId}:${lessonId}`;

  const updateProgressUI = (data) => {
    const chip = document.getElementById("progress-chip");
    const moduleItems = document.querySelectorAll(".module-item");

    moduleItems.forEach((item) => {
      const moduleId = item.getAttribute("data-module");
      const bar = item.querySelector("[data-bar]");
      const lessonCount = Number(
        (item.querySelector(".pill")?.textContent || "0").split(" ")[0]
      );
      const done = Object.keys(data.lessons).filter((k) =>
        k.startsWith(`${moduleId}:`)
      ).length;
      const pct = lessonCount ? Math.round((done / lessonCount) * 100) : 0;
      if (bar) bar.style.width = `${pct}%`;
    });

    if (!chip) return;

    if (moduleItems.length) {
      let done = 0;
      let total = 0;
      moduleItems.forEach((item) => {
        const moduleId = item.getAttribute("data-module");
        const lessonCount = Number(
          (item.querySelector(".pill")?.textContent || "0").split(" ")[0]
        );
        total += lessonCount;
        done += Object.keys(data.lessons).filter((k) =>
          k.startsWith(`${moduleId}:`)
        ).length;
      });
      chip.textContent = total ? `${Math.round((done / total) * 100)}%` : "0%";
      return;
    }

    chip.textContent = `${Object.keys(data.lessons).length} done`;
  };

  const initLesson = () => {
    const panel = document.querySelector(".lesson-panel[data-complete-lesson]");
    if (!panel) return;

    const moduleId = panel.getAttribute("data-complete-module");
    const lessonId = panel.getAttribute("data-complete-lesson");
    const key = lessonKey(moduleId, lessonId);
    const btn = document.getElementById("mark-done");
    const progress = readProgress();

    if (progress.lessons[key] && btn) {
      btn.textContent = "Completed";
      btn.disabled = true;
    }

    btn?.addEventListener("click", () => {
      const next = readProgress();
      next.lessons[key] = Date.now();
      writeProgress(next);
      btn.textContent = "Completed";
      btn.disabled = true;
    });

    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const code = button.closest(".code-block")?.querySelector("code")?.textContent || "";
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = "Copied";
          setTimeout(() => {
            button.textContent = "Copy";
          }, 1200);
        } catch {
          button.textContent = "Select & copy";
        }
      });
    });
  };

  const initQuiz = () => {
    const form = document.getElementById("quiz-form");
    if (!form) return;

    const moduleId = document.querySelector(".quiz-page")?.getAttribute("data-module");
    const result = document.getElementById("quiz-result");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const cards = [...form.querySelectorAll(".quiz-card")];
      let correct = 0;

      cards.forEach((card, index) => {
        const answer = Number(card.getAttribute("data-answer"));
        const selected = form.querySelector(`input[name="q${index}"]:checked`);
        const value = selected ? Number(selected.value) : -1;
        card.classList.remove("correct", "wrong");
        if (value === answer) {
          card.classList.add("correct");
          correct += 1;
        } else {
          card.classList.add("wrong");
        }
      });

      const score = Math.round((correct / cards.length) * 100);
      if (result) {
        result.hidden = false;
        result.textContent =
          score === 100
            ? "Perfect — this module is locked in."
            : `You scored ${correct}/${cards.length} (${score}%). Review and retry when ready.`;
      }

      const progress = readProgress();
      progress.quizzes[moduleId] = { correct, total: cards.length, at: Date.now() };
      writeProgress(progress);
    });
  };

  /**
   * Tiny translator for the curated practice challenges (Python-looking → JS).
   * Supports def/if/for/return, sum(), str(), .lower(), and `in`.
   */
  const translateChallenge = (source) => {
    const lines = source.replace(/\t/g, "    ").split("\n");
    const out = [];
    const stack = [0];

    const closeTo = (indent) => {
      while (stack.length > 1 && stack[stack.length - 1] > indent) {
        stack.pop();
        out.push("}");
      }
    };

    const rewriteExpr = (expr) =>
      expr
        .replace(/\.lower\(\)/g, ".toLowerCase()")
        .replace(/\bstr\(([^)]+)\)/g, "String($1)")
        .replace(/\bsum\(([^)]+)\)/g, "$1.reduce((a, b) => a + b, 0)")
        .replace(/(\w+)\s+in\s+(\w+)/g, "$2.includes($1)")
        .replace(/\band\b/g, "&&")
        .replace(/\bor\b/g, "||");

    for (const raw of lines) {
      if (!raw.trim() || raw.trim().startsWith("#")) continue;
      const indent = raw.match(/^ */)[0].length;
      closeTo(indent);
      let line = raw.trim();

      if (/^def\s+\w+\s*\(.*\):$/.test(line)) {
        line = line.replace(/^def\s+(\w+)\s*\((.*)\):$/, "function $1($2) {");
        stack.push(indent + 4);
      } else if (/^for\s+\w+\s+in\s+.+:$/.test(line)) {
        const match = line.match(/^for\s+(\w+)\s+in\s+(.+):$/);
        const iter = rewriteExpr(match[2]);
        line = `for (const ${match[1]} of ${iter}) {`;
        stack.push(indent + 4);
      } else if (line.startsWith("if ") && line.endsWith(":")) {
        line = `if (${rewriteExpr(line.slice(3, -1))}) {`;
        stack.push(indent + 4);
      } else {
        line = rewriteExpr(line);
      }

      out.push(line);
    }
    closeTo(0);
    return out.join("\n");
  };

  const initPractice = () => {
    const panel = document.querySelector(".practice-panel");
    if (!panel) return;

    const challenge = JSON.parse(panel.getAttribute("data-challenge"));
    const editor = document.getElementById("code-editor");
    const results = document.getElementById("test-results");
    const hintBox = document.getElementById("hint-box");

    document.getElementById("show-hint")?.addEventListener("click", () => {
      if (hintBox) hintBox.hidden = false;
    });

    document.getElementById("show-solution")?.addEventListener("click", () => {
      if (editor) editor.value = challenge.solution;
    });

    document.getElementById("run-tests")?.addEventListener("click", () => {
      if (!editor || !results) return;
      results.hidden = false;
      results.innerHTML = "";

      const translated = translateChallenge(editor.value);
      let passed = 0;

      challenge.tests.forEach((test) => {
        const row = document.createElement("div");
        row.className = "test-row";
        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function(`${translated}\nreturn (${test.call});`);
          const value = fn();
          const actual = String(value);
          const ok = actual === String(test.expected);
          row.classList.add(ok ? "pass" : "fail");
          row.innerHTML = `<span>${test.call}</span><span>${
            ok ? "pass" : `expected ${test.expected}, got ${actual}`
          }</span>`;
          if (ok) passed += 1;
        } catch (error) {
          row.classList.add("fail");
          row.innerHTML = `<span>${test.call}</span><span>${error.message}</span>`;
        }
        results.appendChild(row);
      });

      if (passed === challenge.tests.length) {
        const banner = document.createElement("div");
        banner.className = "quiz-result";
        banner.textContent = "All tests passed — nice work.";
        results.prepend(banner);
      }
    });
  };

  updateProgressUI(readProgress());
  initLesson();
  initQuiz();
  initPractice();
})();
