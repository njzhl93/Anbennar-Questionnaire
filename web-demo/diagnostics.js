"use strict";

const DIAGNOSTIC_LABELS = {
  "p.expansion_building": "人格·拓疆/建设",
  "p.autocracy_liberty": "人格·专制/自由",
  "p.magic_artifice_balance": "人格·魔法/奇械",
  "p.magic_artifice_intensity": "人格·魔奇强度",
  "p.pluralism_uniformity": "人格·多元/单一",
  "v.dignity": "价值·尊严",
  "v.public_good": "价值·公共利益",
  "v.personhood": "价值·人格承认",
  "v.restraint": "价值·克制",
  "g.warfare": "玩法·战争",
  "g.tall_play": "玩法·建设",
  "g.diplomacy": "玩法·外交",
  "g.colonization": "玩法·殖民",
  "g.trade_economy": "玩法·贸易经济",
  "g.magic_artifice_intensity": "玩法·魔奇强度",
  "g.narrative_density": "玩法·剧情密度",
  "g.complexity": "玩法·复杂度",
  "g.early_pressure": "玩法·前期压力",
  "g.difficulty": "玩法·难度",
  "g.campaign_length": "玩法·战役长度",
  "g.dark_story": "玩法·黑暗叙事",
};

let latestDiagnosticPayload = null;

function diagnosticFit(distanceValue) {
  return clamp(100 - distanceValue * 17, 0, 100);
}

function diagnosticMismatches(user, country, limit = 5) {
  return ALL_KEYS
    .map(key => {
      const userValue = user[key];
      const countryValue = candidateValue(country, key);
      return {
        key,
        label: DIAGNOSTIC_LABELS[key] ?? key,
        user: Math.round(userValue),
        country: Math.round(countryValue),
        standardized_delta: Math.abs(userValue - countryValue) / stats[key].sd,
      };
    })
    .sort((a, b) => b.standardized_delta - a.standardized_delta)
    .slice(0, limit);
}

function diagnosticRawRanking(user, activeFilters, relaxFilters) {
  const cleanCountries = countries.filter(c => violations(c, activeFilters).length === 0);
  const pool = relaxFilters ? countries : cleanCountries;
  return pool
    .map(c => baseMatch(user, c, activeFilters, relaxFilters))
    .sort((a, b) => b.score - a.score);
}

function renderDiagnosticTable(match) {
  const { user, results, relaxFilters, activeFilters } = match;
  const rawRanking = diagnosticRawRanking(user, activeFilters, relaxFilters);
  const rawRank = new Map(rawRanking.map((item, index) => [item.country.tag, index + 1]));

  const rows = results.map((item, index) => {
    const pFit = diagnosticFit(item.pDist);
    const gFit = diagnosticFit(item.gDist);
    const vFit = diagnosticFit(item.vDist);
    const mismatches = diagnosticMismatches(user, item.country, 4);
    return {
      displayed_rank: index + 1,
      raw_rank: rawRank.get(item.country.tag),
      tag: item.country.tag,
      name_zh: item.country.name_zh,
      score: Number(item.score.toFixed(2)),
      personality_fit: Number(pFit.toFixed(1)),
      gameplay_fit: Number(gFit.toFixed(1)),
      values_fit: Number(vFit.toFixed(1)),
      personality_distance: Number(item.pDist.toFixed(4)),
      gameplay_distance: Number(item.gDist.toFixed(4)),
      values_distance: Number(item.vDist.toFixed(4)),
      conflicts: item.conflicts,
      largest_mismatches: mismatches,
    };
  });

  latestDiagnosticPayload = {
    schema_version: "demo-diagnostic-0.2",
    generated_at: new Date().toISOString(),
    filters_relaxed: relaxFilters,
    active_filters: [...activeFilters],
    user_vector: Object.fromEntries(Object.entries(user).map(([key, value]) => [key, Number(value.toFixed(2))])),
    displayed_top5: rows,
    raw_top10: rawRanking.slice(0, 10).map((item, index) => ({
      raw_rank: index + 1,
      tag: item.country.tag,
      name_zh: item.country.name_zh,
      score: Number(item.score.toFixed(2)),
    })),
  };

  $("diagnosticSummary").innerHTML = `
    <div class="diagnostic-stats">
      <div><strong>${rawRanking.length}</strong><span>实际候选数</span></div>
      <div><strong>${relaxFilters ? "是" : "否"}</strong><span>避雷降级</span></div>
      <div><strong>${activeFilters.size}</strong><span>启用避雷</span></div>
      <div><strong>${rows[0].raw_rank}</strong><span>#1 原始排名</span></div>
    </div>
    <p class="muted diagnostic-note">“匹配率”是 Demo 内部可读化分数，不是统计概率。下面的分项适合用来调权重：越高越接近；“原始排名”是多样性重排之前的纯匹配名次。</p>
  `;

  $("diagnosticTableBody").innerHTML = rows.map(row => `
    <tr>
      <td>#${row.displayed_rank}</td>
      <td>${row.name_zh}<small>${row.tag}</small></td>
      <td>${row.score.toFixed(1)}</td>
      <td>${row.personality_fit.toFixed(1)}</td>
      <td>${row.gameplay_fit.toFixed(1)}</td>
      <td>${row.values_fit.toFixed(1)}</td>
      <td>#${row.raw_rank}</td>
      <td>${row.largest_mismatches.map(x => `${x.label} ${x.user}/${x.country}`).join("；")}</td>
    </tr>
  `).join("");

  $("diagnostics").classList.remove("hidden");
}

function refreshDiagnosticsAfterResult() {
  window.setTimeout(() => {
    if ($("results").classList.contains("hidden")) return;
    if (!$("debugMode").checked) {
      $("diagnostics").classList.add("hidden");
      return;
    }
    renderDiagnosticTable(runMatch());
  }, 0);
}

$("resultBtn").addEventListener("click", refreshDiagnosticsAfterResult);
$("restartBtn").addEventListener("click", () => {
  $("diagnostics").classList.add("hidden");
  latestDiagnosticPayload = null;
});

$("copyDiagnosticBtn").addEventListener("click", async () => {
  if (!latestDiagnosticPayload) return;
  const text = JSON.stringify(latestDiagnosticPayload, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    $("copyDiagnosticBtn").textContent = "已复制";
    window.setTimeout(() => { $("copyDiagnosticBtn").textContent = "复制诊断 JSON"; }, 1400);
  } catch (error) {
    console.error(error);
    $("copyDiagnosticBtn").textContent = "复制失败";
  }
});
