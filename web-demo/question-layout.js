"use strict";

// UI-only override for the quiz question layout. Matching logic is unchanged.
const magicArtificeAxis = AXES.find(axis => axis.key === "p.magic_artifice_balance");
if (magicArtificeAxis) {
  magicArtificeAxis.label = "魔法 / 奇械";
  magicArtificeAxis.high = "魔法";
}

renderQuestion = function renderQuestionWithProminentPoles() {
  const q = QUESTIONS[current];
  const answer = answers[current];
  const leftActive = answer != null && answer < 3;
  const rightActive = answer != null && answer > 3;

  $("progressText").textContent = `${current + 1} / ${QUESTIONS.length}`;
  $("progressBar").style.width = `${((current + 1) / QUESTIONS.length) * 100}%`;
  $("backBtn").disabled = current === 0;
  $("nextBtn").textContent = current === QUESTIONS.length - 1 ? "进入避雷设置" : "下一题";
  $("nextBtn").disabled = answer == null;

  $("questionCard").innerHTML = `
    <div class="question-kind">${q.kind}</div>
    <h2 class="question-title">${q.prompt}</h2>

    <div class="question-poles" aria-label="本题左右倾向说明">
      <div class="pole-card pole-left ${leftActive ? "active" : ""}">
        <div class="pole-kicker">← 左侧倾向</div>
        <div class="pole-text">${q.low}</div>
      </div>
      <div class="pole-divider" aria-hidden="true">↔</div>
      <div class="pole-card pole-right ${rightActive ? "active" : ""}">
        <div class="pole-kicker">右侧倾向 →</div>
        <div class="pole-text">${q.high}</div>
      </div>
    </div>

    <div class="choice-scale" role="radiogroup" aria-label="五档选择">
      ${[1,2,3,4,5].map(value => `
        <button class="choice ${answer === value ? "selected" : ""}" data-value="${value}" role="radio" aria-checked="${answer === value}">
          ${["非常偏左", "比较偏左", "看情况", "比较偏右", "非常偏右"][value - 1]}
        </button>
      `).join("")}
    </div>
  `;

  document.querySelectorAll(".choice").forEach(button => {
    button.addEventListener("click", () => {
      answers[current] = Number(button.dataset.value);
      renderQuestion();
    });
  });
};
