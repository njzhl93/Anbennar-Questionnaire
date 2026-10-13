"use strict";

const QUESTIONS = [
  { kind: "国家战略", prompt: "如果一个新机会出现在边境，你更希望国家怎么做？", low: "先把现有领地经营到极致", high: "抓住机会，把边界向外推进", effects: { "p.expansion_building": 1 } },
  { kind: "国家战略", prompt: "一场成功的战役，什么最让你有成就感？", low: "核心地区越来越富、越来越稳", high: "地图颜色不断扩大，战略目标连续达成", effects: { "p.expansion_building": 0.8, "g.warfare": 0.45, "g.tall_play": -0.45 } },
  { kind: "政治结构", prompt: "面对长期危机，你更认可哪种国家结构？", low: "地方自治、协商和制衡", high: "权力集中，确保命令能快速贯彻", effects: { "p.autocracy_liberty": 1 } },
  { kind: "政治结构", prompt: "你更喜欢哪一种国家幻想？", low: "自由城邦、地方议会或松散共同体", high: "强势君主、神权核心或高度集中的官僚国家", effects: { "p.autocracy_liberty": 1 } },
  { kind: "文明路线", prompt: "如果两条路线都同样强大，你更想发展哪一种？", low: "奇械、工程、技术官僚与人工造物", high: "魔法、法师、精怪、亡灵或神秘力量", effects: { "p.magic_artifice_balance": 1 } },
  { kind: "文明路线", prompt: "你希望魔法或奇械在战役里有多重要？", low: "只是背景点缀，国家本身更重要", high: "最好就是核心机制和国家身份", effects: { "p.magic_artifice_intensity": 1, "g.magic_artifice_intensity": 0.5 } },
  { kind: "社会结构", prompt: "一个强大的国家应该怎样处理内部差异？", low: "建立统一身份、统一规范和共同方向", high: "让不同种族、文化与宗教长期共存", effects: { "p.pluralism_uniformity": 1 } },
  { kind: "社会结构", prompt: "新征服的群体愿意效忠，但坚持保留自己的传统和法律，你更倾向？", low: "逐步整合为统一制度", high: "只要效忠，就允许长期保留差异", effects: { "p.pluralism_uniformity": 0.8, "v.personhood": 0.35 } },
  { kind: "价值观", prompt: "为了完成国家的宏大目标，平民承担巨大代价时，你更接近哪种态度？", low: "必要时可以接受大规模牺牲", high: "目标再伟大，也必须尽量保护普通人的生命与尊严", effects: { "v.dignity": 1 } },
  { kind: "价值观", prompt: "国家获得巨大财富后，你认为最重要的用途是什么？", low: "优先强化统治集团、军队或国家机器", high: "优先改善多数人的安全、教育、繁荣与生活", effects: { "v.public_good": 1 } },
  { kind: "价值观", prompt: "一个长期敌对的智慧种族战败后，你更认同？", low: "可以按群体身份永久限制其权利", high: "应把个体视为完整的人格主体，不能因种族预设地位", effects: { "v.personhood": 1 } },
  { kind: "价值观", prompt: "战争已经胜利，继续采取残酷手段可以震慑未来敌人。你会怎么选？", low: "必要的恐惧可以减少未来反抗", high: "胜利后应主动限制暴力，并尽快恢复秩序", effects: { "v.restraint": 1 } },
  { kind: "玩法偏好", prompt: "你理想中的大部分游戏时间更接近哪边？", low: "内政、建设、规划和长期积累", high: "战争、机动、征服和连续战略目标", effects: { "g.warfare": 1, "g.tall_play": -0.9 } },
  { kind: "玩法偏好", prompt: "面对一个国家专属机制很多、资源条很多、决策互相牵连的任务树，你的反应？", low: "希望直观一些，不想频繁查机制", high: "越复杂越有意思，我喜欢研究系统", effects: { "g.complexity": 1 } },
  { kind: "玩法偏好", prompt: "你更希望一局 Anbennar 像什么？", low: "自由沙盒，剧情不要限制我太多", high: "长篇史诗，任务和事件持续推动故事", effects: { "g.narrative_density": 1, "g.campaign_length": 0.65 } },
  { kind: "玩法偏好", prompt: "开局几十年就需要精确操作、处理危机甚至打生死战，对你来说？", low: "会降低体验，我更喜欢稳定成长", high: "正合我意，压力越大越有成就感", effects: { "g.early_pressure": 1, "g.difficulty": 0.9 } },
  { kind: "玩法偏好", prompt: "你喜欢通过联盟、附庸、议会、关系网或外交选择来解决问题吗？", low: "不太在意，直接完成战略目标就好", high: "很喜欢，外交本身应该是主要玩法之一", effects: { "g.diplomacy": 1 } },
  { kind: "玩法偏好", prompt: "殖民未知地区、建立海外据点或远方新国家，对你的吸引力有多大？", low: "几乎没有，我更关心本土", high: "非常高，我喜欢探索和海外扩张", effects: { "g.colonization": 1 } },
  { kind: "玩法偏好", prompt: "贸易网络、商路、港口、产业和国家财政能否成为你的主要乐趣？", low: "只是支撑其他目标的工具", high: "可以，我很享受经济与贸易经营", effects: { "g.trade_economy": 1 } },
  { kind: "叙事口味", prompt: "你对黑暗题材的接受程度如何？", low: "更喜欢明亮、建设性或相对轻松的国家故事", high: "政治清洗、亡灵、献祭、灾难等黑暗内容也很有吸引力", effects: { "g.dark_story": 1 } },
];

const FILTERS = [
  { id: "no_evil", label: "不要邪恶路线", desc: "排除价值观 0–32 的国家", test: c => c.values.classification === "evil" },
  { id: "no_hard", label: "不要高难度", desc: "排除 difficulty > 75", test: c => c.gameplay.difficulty > 75 },
  { id: "no_complex", label: "不要高复杂度", desc: "排除 complexity > 78", test: c => c.gameplay.complexity > 78 },
  { id: "no_dark", label: "不要重黑暗剧情", desc: "排除 dark_story > 70", test: c => c.gameplay.dark_story > 70 },
  { id: "no_long", label: "不要超长战役", desc: "排除 campaign_length > 85", test: c => c.gameplay.campaign_length > 85 },
  { id: "no_colonial", label: "不要殖民核心玩法", desc: "排除 colonization > 65", test: c => c.gameplay.colonization > 65 },
  { id: "no_blob", label: "不要极端扩张", desc: "排除拓疆分 > 88", test: c => c.personality.expansion_building > 88 },
];

const AXES = [
  { key: "p.expansion_building", label: "拓疆 / 建设", low: "建设", high: "拓疆" },
  { key: "p.autocracy_liberty", label: "专制 / 自由", low: "自由", high: "专制" },
  { key: "p.magic_artifice_balance", label: "魔法 / 奇械", low: "奇械", high: "魔法" },
  { key: "p.magic_artifice_intensity", label: "魔奇强度", low: "弱", high: "强" },
  { key: "p.pluralism_uniformity", label: "多元 / 单一", low: "单一", high: "多元" },
];

const TRAJECTORY_ZH = {
  stable: "稳定",
  improving: "改善",
  declining: "恶化",
  radicalization: "激进化",
  redemption: "救赎",
  branch_dependent: "分支依赖",
  mixed: "混合",
};

const PERSONALITY_KEYS = [
  "p.expansion_building",
  "p.autocracy_liberty",
  "p.magic_artifice_balance",
  "p.magic_artifice_intensity",
  "p.pluralism_uniformity",
];
const VALUE_KEYS = ["v.dignity", "v.public_good", "v.personhood", "v.restraint"];
const GAMEPLAY_KEYS = [
  "g.warfare", "g.tall_play", "g.diplomacy", "g.colonization", "g.trade_economy",
  "g.magic_artifice_intensity", "g.narrative_density", "g.complexity", "g.early_pressure",
  "g.difficulty", "g.campaign_length", "g.dark_story",
];
const ALL_KEYS = [...PERSONALITY_KEYS, ...VALUE_KEYS, ...GAMEPLAY_KEYS];

let countries = [];
let stats = {};
let answers = Array(QUESTIONS.length).fill(null);
let current = 0;

const $ = id => document.getElementById(id);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function candidateValue(country, key) {
  const [group, name] = key.split(".");
  if (group === "p") return country.personality[name];
  if (group === "v") return country.values.dimensions[name];
  if (group === "g") return country.gameplay[name];
  throw new Error(`Unknown key ${key}`);
}

function calculateStats() {
  stats = {};
  for (const key of ALL_KEYS) {
    const values = countries.map(c => candidateValue(c, key));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    stats[key] = { mean, sd: Math.max(12, Math.sqrt(variance)) };
  }
}

function buildUserVector() {
  const sums = Object.fromEntries(ALL_KEYS.map(k => [k, 0]));
  const weights = Object.fromEntries(ALL_KEYS.map(k => [k, 0]));

  QUESTIONS.forEach((question, index) => {
    const answer = answers[index];
    if (answer == null) return;
    const normalized = (answer - 3) / 2;
    for (const [key, weight] of Object.entries(question.effects)) {
      sums[key] += normalized * weight;
      weights[key] += Math.abs(weight);
    }
  });

  const vector = {};
  for (const key of ALL_KEYS) {
    vector[key] = weights[key] ? clamp(50 + 50 * (sums[key] / weights[key])) : 50;
  }
  return vector;
}

function distance(user, country, keys, weightForKey) {
  let sum = 0;
  let weightSum = 0;
  for (const key of keys) {
    const weight = weightForKey ? weightForKey(key, user, country) : 1;
    if (weight <= 0) continue;
    const delta = (user[key] - candidateValue(country, key)) / stats[key].sd;
    sum += weight * delta * delta;
    weightSum += weight;
  }
  return weightSum ? Math.sqrt(sum / weightSum) : 0;
}

function violations(country, activeFilters) {
  return FILTERS.filter(f => activeFilters.has(f.id) && f.test(country)).map(f => f.label);
}

function baseMatch(user, country, activeFilters, relaxFilters) {
  const personalityWeights = {
    "p.expansion_building": 1.2,
    "p.autocracy_liberty": 1,
    "p.magic_artifice_intensity": 0.75,
    "p.pluralism_uniformity": 1.1,
  };

  const pDist = distance(user, country, PERSONALITY_KEYS, key => {
    if (key === "p.magic_artifice_balance") {
      const sharedIntensity = Math.min(user["p.magic_artifice_intensity"], country.personality.magic_artifice_intensity);
      return Math.max(0.08, sharedIntensity / 100);
    }
    return personalityWeights[key] ?? 1;
  });

  const vDist = distance(user, country, VALUE_KEYS, key => ({
    "v.dignity": 1.15,
    "v.public_good": 1,
    "v.personhood": 1.15,
    "v.restraint": 0.85,
  })[key] ?? 1);

  const gDist = distance(user, country, GAMEPLAY_KEYS, key => {
    if (key === "g.magic_artifice_intensity") return 0.45;
    if (key === "g.early_pressure" || key === "g.difficulty") return 0.85;
    return 1;
  });

  const conflicts = violations(country, activeFilters);
  const penalty = relaxFilters ? conflicts.length * 18 : 0;
  const combined = 0.45 * pDist + 0.40 * gDist + 0.15 * vDist;
  const score = clamp(100 - combined * 17 - penalty, 1, 99);

  return { country, score, pDist, gDist, vDist, conflicts };
}

function gameplayDifference(a, b) {
  let total = 0;
  for (const key of GAMEPLAY_KEYS) {
    const delta = candidateValue(a, key) - candidateValue(b, key);
    total += delta * delta;
  }
  return Math.sqrt(total / GAMEPLAY_KEYS.length) / 100;
}

function rerankDiverse(scored) {
  if (!scored.length) return [];
  const selected = [scored[0]];
  const remaining = scored.slice(1);

  while (selected.length < Math.min(5, scored.length)) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;
    remaining.forEach((item, index) => {
      const regionFresh = selected.every(s => s.country.region !== item.country.region) ? 1.8 : 0;
      const novelty = selected.reduce((sum, s) => sum + gameplayDifference(item.country, s.country), 0) / selected.length;
      const adjusted = item.score + regionFresh + Math.min(3, novelty * 8);
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    });
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }
  return selected;
}

function runMatch() {
  const user = buildUserVector();
  const activeFilters = new Set(
    FILTERS.filter(f => document.querySelector(`#filter-${f.id}`)?.checked).map(f => f.id)
  );
  const cleanCountries = countries.filter(c => violations(c, activeFilters).length === 0);
  const relaxFilters = cleanCountries.length < 5;
  const pool = relaxFilters ? countries : cleanCountries;
  const scored = pool
    .map(c => baseMatch(user, c, activeFilters, relaxFilters))
    .sort((a, b) => b.score - a.score);
  return { user, results: rerankDiverse(scored), relaxFilters, activeFilters };
}

function renderQuestion() {
  const q = QUESTIONS[current];
  $("progressText").textContent = `${current + 1} / ${QUESTIONS.length}`;
  $("progressBar").style.width = `${((current + 1) / QUESTIONS.length) * 100}%`;
  $("backBtn").disabled = current === 0;
  $("nextBtn").textContent = current === QUESTIONS.length - 1 ? "进入避雷设置" : "下一题";
  $("nextBtn").disabled = answers[current] == null;

  $("questionCard").innerHTML = `
    <div class="question-kind">${q.kind}</div>
    <h2 class="question-title">${q.prompt}</h2>
    <div class="choice-scale" role="radiogroup" aria-label="五档选择">
      ${[1,2,3,4,5].map(value => `
        <button class="choice ${answers[current] === value ? "selected" : ""}" data-value="${value}" role="radio" aria-checked="${answers[current] === value}">
          ${["非常偏左", "比较偏左", "看情况", "比较偏右", "非常偏右"][value - 1]}
        </button>
      `).join("")}
    </div>
    <div class="scale-labels"><span>← ${q.low}</span><span>${q.high} →</span></div>
  `;

  document.querySelectorAll(".choice").forEach(button => {
    button.addEventListener("click", () => {
      answers[current] = Number(button.dataset.value);
      renderQuestion();
    });
  });
}

function renderFilters() {
  $("filterGrid").innerHTML = FILTERS.map(filter => `
    <label class="filter-item">
      <input id="filter-${filter.id}" type="checkbox">
      <span><strong>${filter.label}</strong><span>${filter.desc}</span></span>
    </label>
  `).join("");
}

function orientationText(axis, score) {
  if (Math.abs(score - 50) < 8) return `均衡 ${Math.round(score)}`;
  return score > 50 ? `${axis.high} ${Math.round(score)}` : `${axis.low} ${Math.round(100 - score)}`;
}

function renderProfile(user) {
  $("profileBars").innerHTML = AXES.map(axis => `
    <div class="profile-axis">
      <div class="labels"><span>${axis.low}</span><span>${axis.high}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${user[axis.key]}%"></div></div>
      <div class="axis-score">${axis.label} · ${orientationText(axis, user[axis.key])}</div>
    </div>
  `).join("");
}

function flagHtml(country) {
  const flags = country.flags.slice(0, 2);
  if (!flags.length) return "";
  return flags.map(flag => `<img src="${encodeURI(flag.path)}" alt="${country.name_zh} 国旗" onerror="this.style.display='none'">`).join("");
}

function closestTraits(user, country) {
  return AXES
    .map(axis => ({ axis, diff: Math.abs(user[axis.key] - candidateValue(country, axis.key)) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3)
    .map(item => `${item.axis.label}（你 ${Math.round(user[item.axis.key])} · 国家 ${candidateValue(country, item.axis.key)}）`);
}

function trajectoryLabel(country) {
  const t = country.values.trajectory;
  return t === "stable" ? "" : ` · ${TRAJECTORY_ZH[t] ?? t}`;
}

function renderTop(item, user) {
  const c = item.country;
  const traits = closestTraits(user, c);
  return `
    <article class="top-card">
      <div class="flag-wrap">${flagHtml(c)}</div>
      <div>
        <div class="result-name">
          <h2>#1 ${c.name_zh}</h2>
          <span class="match">${Math.round(item.score)}% 匹配</span>
        </div>
        <div class="meta-row">
          <span class="meta">${c.name_en} · ${c.tag}</span>
              <span class="meta">${c.survey_region ? (c.survey_region.name_zh || '地区待核实') : c.region}</span>
          <span class="meta ${c.values.classification}">${c.values.label_zh} ${c.values.score}${trajectoryLabel(c)}</span>
        </div>
        <p class="tagline">${c.player_overview.tagline}</p>
        <p class="muted">${c.player_overview.overview}</p>
        <div class="why"><strong>为什么匹配：</strong>${traits.join("；")}。</div>
        <ul class="feature-list">${c.player_overview.signature_features.slice(0,3).map(x => `<li>${x}</li>`).join("")}</ul>
        ${c.player_overview.avoid_if ? `<div class="warning"><strong>可能劝退：</strong>${c.player_overview.avoid_if}</div>` : ""}
      </div>
    </article>
  `;
}

function renderOther(item, user, rank) {
  const c = item.country;
  const traits = closestTraits(user, c).slice(0, 2).join("；");
  return `
    <article class="result-card">
      <div class="flag-wrap">${flagHtml(c)}</div>
      <div>
        <div class="result-name"><h3>#${rank} ${c.name_zh}</h3><span class="match">${Math.round(item.score)}%</span></div>
        <div class="meta-row">
        <span class="meta">${c.tag} · ${c.survey_region ? (c.survey_region.name_zh || '地区待核实') : c.region}</span>
          <span class="meta ${c.values.classification}">${c.values.label_zh} ${c.values.score}${trajectoryLabel(c)}</span>
        </div>
        <p>${c.player_overview.tagline}</p>
        <div class="why">接近维度：${traits}</div>
      </div>
    </article>
  `;
}

function showResults() {
  const { user, results, relaxFilters, activeFilters } = runMatch();
  if (results.length < 5) throw new Error("可用国家不足 5 个，无法生成 Top 5。 ");

  $("filters").classList.add("hidden");
  $("results").classList.remove("hidden");
  $("resultTitle").textContent = `你的最佳匹配：${results[0].country.name_zh}`;
  const filterText = activeFilters.size ? `已启用 ${activeFilters.size} 个强避雷项。` : "未设置强避雷项。";
  $("resultNote").textContent = relaxFilters
    ? `${filterText} 由于严格排除后不足 5 国，本次自动改为大额扣分模式。`
    : `${filterText} 本次候选池保持严格排除。`;
  renderProfile(user);
  $("topResult").innerHTML = renderTop(results[0], user);
  $("otherResults").innerHTML = results.slice(1, 5).map((item, index) => renderOther(item, user, index + 2)).join("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function reset() {
  answers = Array(QUESTIONS.length).fill(null);
  current = 0;
  $("results").classList.add("hidden");
  $("filters").classList.add("hidden");
  $("intro").classList.remove("hidden");
  document.querySelectorAll("#filterGrid input").forEach(x => { x.checked = false; });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindEvents() {
  $("startBtn").addEventListener("click", () => {
    $("intro").classList.add("hidden");
    $("quiz").classList.remove("hidden");
    renderQuestion();
  });
  $("backBtn").addEventListener("click", () => {
    if (current > 0) { current -= 1; renderQuestion(); }
  });
  $("nextBtn").addEventListener("click", () => {
    if (answers[current] == null) return;
    if (current < QUESTIONS.length - 1) {
      current += 1;
      renderQuestion();
    } else {
      $("quiz").classList.add("hidden");
      $("filters").classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
  $("filterBackBtn").addEventListener("click", () => {
    $("filters").classList.add("hidden");
    $("quiz").classList.remove("hidden");
    current = QUESTIONS.length - 1;
    renderQuestion();
  });
  $("resultBtn").addEventListener("click", showResults);
  $("restartBtn").addEventListener("click", reset);
}

async function init() {
  try {
    const response = await fetch("data/countries.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`国家数据加载失败：HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.countries) || payload.countries.length !== 27) {
      throw new Error(`Demo 需要 27 国数据，实际为 ${payload.countries?.length ?? 0}`);
    }
    countries = payload.countries;
    calculateStats();
    renderFilters();
    bindEvents();
  } catch (error) {
    $("intro").classList.add("hidden");
    $("errorBox").classList.remove("hidden");
    $("errorBox").innerHTML = `<h2>Demo 无法启动</h2><p>${error.message}</p><p class="muted">请先运行 <code>python web-demo/tools/build_data.py</code>，并通过 HTTP 服务器打开页面，不要直接使用 file://。</p>`;
    console.error(error);
  }
}

init();
