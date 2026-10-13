"use strict";

function feedbackRating(id) {
  return Number($(id).value);
}

function buildFeedbackPayload() {
  const match = runMatch();
  const user = match.user;
  const results = match.results;
  const activeFilters = [...match.activeFilters];

  return {
    schema_version: "feedback-0.1",
    demo_version: "0.3",
    scoring_version: results[0]?.scoringVersion ?? "0.1-baseline",
    created_at: new Date().toISOString(),
    answers: QUESTIONS.map((question, index) => ({
      index: index + 1,
      kind: question.kind,
      prompt: question.prompt,
      answer: answers[index],
    })),
    active_filters: activeFilters,
    filters_relaxed: match.relaxFilters,
    user_vector: Object.fromEntries(Object.entries(user).map(([key, value]) => [key, Number(value.toFixed(2))])),
    top5: results.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      tag: item.country.tag,
      name_zh: item.country.name_zh,
      name_en: item.country.name_en,
      score: Number(item.score.toFixed(2)),
      personality_distance: Number(item.pDist.toFixed(4)),
      gameplay_distance: Number(item.gDist.toFixed(4)),
      values_distance: Number(item.vDist.toFixed(4)),
      conflicts: item.conflicts,
    })),
    feedback: {
      profile_accuracy: feedbackRating("feedbackProfile"),
      top1_interest: feedbackRating("feedbackTop1"),
      top5_quality: feedbackRating("feedbackTop5"),
      expected_country: $("feedbackExpected").value.trim(),
      notes: $("feedbackNotes").value.trim(),
    },
  };
}

function updateFeedbackOutput(inputId, outputId) {
  const input = $(inputId);
  const output = $(outputId);
  output.textContent = `${input.value} / 5`;
}

for (const [inputId, outputId] of [
  ["feedbackProfile", "feedbackProfileOut"],
  ["feedbackTop1", "feedbackTop1Out"],
  ["feedbackTop5", "feedbackTop5Out"],
]) {
  $(inputId).addEventListener("input", () => updateFeedbackOutput(inputId, outputId));
  updateFeedbackOutput(inputId, outputId);
}

$("copyFeedbackBtn").addEventListener("click", async () => {
  const payload = buildFeedbackPayload();
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    $("feedbackStatus").textContent = "反馈 JSON 已复制，可直接贴回项目对话或保存为样本。";
  } catch (error) {
    console.error(error);
    $("feedbackStatus").textContent = "浏览器拒绝剪贴板权限，可使用右侧“下载 JSON”。";
  }
});

$("downloadFeedbackBtn").addEventListener("click", () => {
  const payload = buildFeedbackPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `anbennar-demo-feedback-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  $("feedbackStatus").textContent = "反馈 JSON 已下载。";
});

$("restartBtn").addEventListener("click", () => {
  $("feedbackProfile").value = 3;
  $("feedbackTop1").value = 3;
  $("feedbackTop5").value = 3;
  $("feedbackExpected").value = "";
  $("feedbackNotes").value = "";
  $("feedbackStatus").textContent = "";
  updateFeedbackOutput("feedbackProfile", "feedbackProfileOut");
  updateFeedbackOutput("feedbackTop1", "feedbackTop1Out");
  updateFeedbackOutput("feedbackTop5", "feedbackTop5Out");
});
