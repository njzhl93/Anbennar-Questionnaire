import { AXES, AXIS_KEYS, validateDataset, validateVector, rank, evaluate } from "./scoring.mjs";
import {createQuestionnaireUI} from "./questionnaire-ui.mjs";
import {rankWithPreferences,validatePlaystyleData} from "./playstyle.mjs";
import {createPreferenceUI} from "./preferences-ui.mjs";
import {validateEncyclopediaIndex,filterCandidatesByRegion} from "./regions.mjs";
import {createEncyclopedia,regionOptions} from "./encyclopedia.mjs";
import {createComparison} from "./comparison.mjs";
import {attachCountryAutocomplete} from "./country-search.mjs";
import {installLanguageSwitch,routeInLocale,english,t,labelForAxis,countryName,regionName} from "./i18n.mjs";
import {fetchLocalizedJson,compatibleEncyclopediaIndex} from "./localization.mjs";

const $ = id => document.getElementById(id);
const esc = input => String(input ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const ui = (en, zh) => english() ? en : zh;
const TYPE = {
  baseline: ui("National baseline", "国家共同基线"),
  choice: ui("Policy / choice profile", "政策／选择条件画像"),
  stage: ui("Mission stage / conditional outcome", "任务阶段／条件结算"),
  formation: ui("Formable / successor route", "形成国／后继路线"),
};
const AXIS_LABELS = Object.fromEntries(AXES.map(x => [x[0], labelForAxis(x[0],x[1])]));
let data = null;
let user = Object.fromEntries(AXIS_KEYS.map(key => [key, 50]));
let ranked = null;
let encyclopediaIndex = null;
let encyclopedia = null;
let comparison = null;
let selectedCatalogTag = "";
const displayOwner=tag=>countryName(encyclopediaIndex?.countries.find(c=>c.tag===tag)) || tag;
let matchRegion = "";
let lastVectorSource = "manual";
let questionnaire = null;
let preferenceUI = null;
let playstyleData = null;
function savedSession() {
  try {
    const raw=JSON.parse(sessionStorage.getItem("anbennar-v22-p2-match")||"null");
    if(!raw || !raw.user)return;
    validateVector(raw.user);
    user={...raw.user};
    matchRegion=typeof raw.region==="string"?raw.region:"";
    lastVectorSource=raw.source==="questionnaire"?"questionnaire":"manual";
  } catch { /* old or corrupted local session is ignored */ }
}
function saveSession() {
  try {sessionStorage.setItem("anbennar-v22-p2-match",
    JSON.stringify({user,region:matchRegion,source:lastVectorSource}));}catch{}
}
savedSession();

function showNotice(message, error = false) {
  const node = $("notice");
  node.textContent = message;
  node.classList.toggle("error", error);
}
function vectorInputMarkup(axis) {
  const [key, title, low, high] = axis;
  return '<div class="axis-control"><div class="axis-title"><label for="' + esc(key) +
    '"><b>' + esc(labelForAxis(key,title)) + '</b></label><output class="axis-value" id="val-' + esc(key) +
    '">' + user[key] + '</output></div><input type="range" id="' + esc(key) +
    '" min="0" max="100" step="1" value="' + user[key] + '" aria-label="' +
    esc(labelForAxis(key,title)) + '"><div class="pole"><span>0 · ' +
    esc(english() ? "low pole" : low) + '</span><span>100 · ' +
    esc(english() ? "high pole" : high) + "</span></div></div>";
}
function renderSliders() {
  $("axisInputs").innerHTML = AXES.map(vectorInputMarkup).join("");
  for (const key of AXIS_KEYS) {
    $(key).addEventListener("input", event => {
      user[key] = Number(event.target.value);
      lastVectorSource="manual";
      saveSession();
      $("questionSummary")?.classList.add("hidden");
      if($("questionValidation")) $("questionValidation").textContent=
        ui("Switched to manual five-axis input. Questionnaire answers remain available.",
          "已切换为手动五轴输入；问卷答案仍保留，可重新生成问卷向量。");
      $("val-" + key).textContent = String(user[key]);
    });
  }
}
function updateVector(vector) {
  user = { ...vector };
  for (const key of AXIS_KEYS) {
    $(key).value = String(user[key]);
    $("val-" + key).textContent = String(user[key]);
  }
}
function labelsFor(entry) {
  const list = [];
  list.push('<span class="chip ' + (entry.profile_type === "baseline" ? "" : "gold") +
    '">' + TYPE[entry.profile_type] + "</span>");
  list.push('<span class="chip">' + ui("Development line ", "研究发展线 ") +
    esc(entry.owner_tag) + "</span>");
  if (entry.applicable_tag !== entry.owner_tag) {
    list.push('<span class="chip gold">' + ui("Applicable successor ", "适用后继 ") +
      esc(entry.applicable_tag) + "</span>");
  }
  return list.join("");
}
function whyMatch(item) {
  const near = item.differences.slice(0, 2).map(d =>
    AXIS_LABELS[d.key] + ui(" (gap ", "（相差 ") + d.absolute + ui(")", "）")).join(ui(", ", "、"));
  const far = item.differences.filter(d => d.absolute >= 20).slice(-2)
    .map(d => AXIS_LABELS[d.key] + ui(" (gap ", "（相差 ") + d.absolute + ui(")", "）")).join(ui(", ", "、"));
  const where = item.entry.profile_type === "baseline"
    ? ui("the national baseline", "国家共同基线")
    : ui('the conditional profile “', "特定条件下的「") + item.entry.name_zh + ui('”', "」");
  return ui("Closest axes: ", "最接近：") + near +
    ui(". This result represents ", "；本次匹配的是") + where + "." +
    (far ? ui(" Larger differences: ", " 较明显的差异：") + far + "." :
      ui(" Overall differences are small across the five axes.", " 五轴差异总体较小。"));
}
function axisComparison(userVector, countryVector) {
  const bars = AXES.map(([key, label]) => {
    const left = userVector[key], right = countryVector[key];
    return '<div class="axis-compare"><h4>' + esc(labelForAxis(key,label)) +
      '</h4><div class="value-pair">' + ui("You ", "你 ") + left + ui(" / country ", " / 国家 ") + right +
      '</div><div class="dual-bars"><div class="bar player"><i style="width:' + left +
      '%"></i></div><div class="bar"><i style="width:' + right +
      '%"></i></div></div><div class="difference">' + ui("Gap ", "差值 ") + Math.abs(left - right) +
      "</div></div>";
  }).join("");
  return '<div class="compare-grid">' + bars +
    '</div><p class="legend">' + ui(
      "Cyan: your input; gold: country or conditional profile. These axes are descriptive, not moral scores.",
      "青色：你的输入；金色：国家或条件画像。魔奇为方向，多元不等于道德。") + '</p>';
}
function li(items) {
  return '<ul>' + items.map(s => "<li>" + esc(s) + "</li>").join("") + "</ul>";
}
function conditionList(conditions) {
  return Array.isArray(conditions) && conditions.length
    ? li(conditions.map(x => typeof x === "string" ? x : JSON.stringify(x)))
    : '<p class="muted">' + ui("The common baseline has no additional conditions.", "共同基线无额外条件。") + '</p>';
}
function stateDetails(entry, score = null, summaryOpen = false) {
  const isBaseline = entry.profile_type === "baseline";
  const alias = Array.isArray(entry.equivalent_profile_ids) ? entry.equivalent_profile_ids : [];
  const otherConditions = (entry.equivalent_conditions || []).flat(Infinity);
  const changes = Object.entries(entry.axis_overrides || {}).map(([k, v]) =>
    (AXIS_LABELS[k] || k) + " → " + v);
  const refs = (entry.source_refs || []).map(ref =>
    (ref.file || ui("unknown file", "未知文件")) + (ref.pointer ? " " + ref.pointer : ""));
  const subjects = Array.isArray(entry.affected_subjects) ? entry.affected_subjects :
    entry.affected_subjects ? [entry.affected_subjects] : [];
  const identity = entry.owner_tag !== entry.applicable_tag
    ? '<p><b>' + ui("Development-line owner: ", "发展线来源：") + '</b>' + esc(entry.owner_name_zh) + " (" +
      esc(entry.owner_tag) + ') → <b>' + ui("Applies to: ", "实际适用：") + '</b>' +
      esc(entry.applicable_name_zh || ui("successor country", "后继国家")) + " (" +
      esc(entry.applicable_tag) + ")</p>"
    : '<p><b>' + ui("Applies to: ", "实际适用：") + '</b>' + esc(entry.owner_name_zh) +
      " (" + esc(entry.applicable_tag) + ")</p>";
  return '<details class="state-card"' + (summaryOpen ? " open" : "") +
    '><summary>' + esc(entry.name_zh) + " · " + TYPE[entry.profile_type] +
    (score == null ? "" : ui(" · similarity ", " · 相似度 ") + score.toFixed(1)) +
    '</summary><div class="chips">' + labelsFor(entry) + "</div>" +
    identity +
    (entry.profile_id ? '<p class="meta"><b>' + ui("Profile: ", "画像：") + '</b><span class="code">' +
      esc(entry.profile_id) + '</span> · <b>' + ui("Major group: ", "重大组：") + '</b><span class="code">' +
      esc(entry.impact_group_id) + "</span></p>" : "") +
    (entry.player_summary_zh ? "<p><b>" + ui("Player summary: ", "玩家概述：") + "</b>" +
      esc(entry.player_summary_zh) + "</p>" : "") +
    '<p><b>' + ui("Applicable mission / state conditions:", "适用任务／状态条件：") + '</b></p>' + conditionList(entry.conditions) +
    (otherConditions.length ? '<p><b>' + ui("Other equivalent-profile conditions:", "相同人格的其他条件说明：") + '</b></p>' +
      conditionList(otherConditions) : "") +
    (alias.length ? '<p><b>' + ui("Equivalent profile IDs: ", "等价画像 ID：") + '</b> <span class="code">' +
      esc(alias.join(ui(", ", "，"))) + "</span>" + ui(" (merged at equal score; not another candidate)", "（同分合并，不另计候选）") + "</p>" : "") +
    (subjects.length ? '<p><b>' + ui("Affected subjects / scope: ", "影响对象／作用域：") + '</b> ' +
      esc(subjects.map(s => typeof s === "string" ? s : JSON.stringify(s)).join(ui("; ", "；"))) +
      "</p>" : "") +
    (isBaseline ? "" : '<p><b>' + ui("Actual changes from the applicable baseline: ", "相对适用基线的实际变轴：") + '</b> ' +
      esc(changes.length ? changes.join(ui("; ", "；")) : ui("No five-axis value changes", "没有五轴数值变化")) + "</p>") +
    '<p><b>' + ui("Five axes: ", "五轴：") + '</b> ' + esc(AXES.map(([k, label]) =>
      labelForAxis(k,label) + " " + entry.personality[k]).join(ui("; ", "；"))) + "</p>" +
    '<p><b>' + ui("Scoring rationale: ", "评分理由：") + '</b>' + esc(entry.scoring_rationale || entry.group_rationale || ui("No separate rationale", "未附单独说明")) + "</p>" +
    (entry.group_rationale && !isBaseline ? '<p><b>' + ui("Mission-route note: ", "任务路线说明：") + '</b>' +
      esc(entry.group_rationale) + "</p>" : "") +
    '<p><b>' + ui("Evidence confidence: ", "证据置信度：") + '</b>' + esc(entry.confidence || ui("not stated", "未注明")) +
    ui("; ", "；") + '<b>' + ui("Status: ", "状态：") + '</b>' + ui("editorial conditional research profile; in-game reachability is not proven.", "编辑性条件化研究画像，未经实机可达性证明。") + "</p>" +
    (refs.length ? '<p class="meta"><b>' + ui("Source references:", "来源引用：") + '</b></p>' +
      li(refs) : "") + "</details>";
}
function renderCard(item, index) {
  const e = item.entry;
  const sameLine = ranked.all.filter(x => x.entry.owner_tag === e.owner_tag &&
    x.entry.id !== e.id);
  const explanation = whyMatch(item);
  const otherStates = sameLine.length
    ? '<details class="line-more"><summary>' + ui("Show the other ", "展开本发展线其他 ") +
      sameLine.length + ui(" baseline / conditional profiles in this development line", " 条基线／条件画像") + '</summary>' +
      sameLine.map(x => stateDetails(x.entry, x.score)).join("") + "</details>"
    : '<p class="muted">' + ui("This country has only one common baseline.", "该国家只有一条共同基线。") + '</p>';
  return '<article class="result-card"><div class="result-top"><span class="rank">' +
    String(index + 1).padStart(2, "0") + '</span><div class="result-heading"><h3>' +
    esc(displayOwner(e.owner_tag)) + '</h3><p class="tagline">'+esc(t("results.represented","本次代表：")) +
    esc(e.name_zh) + (e.applicable_tag !== e.owner_tag ? ui(" · applies to ", " · 实际适用 ") +
      esc(e.applicable_tag) : "") + '</p></div><div class="score"><strong>' +
    item.score.toFixed(1) + '</strong><small>' +
    (item.personalityScore===undefined?ui('Five-axis similarity / 100','五轴算法相似度 / 100'):ui('Combined preference similarity / 100','综合偏好相似度 / 100'))+
    '</small></div></div>' +
    (item.personalityScore===undefined?'':'<div class="preference-scores">' +
      '<span>'+ui('v2.2 personality ','v2.2 人格 ')+'<strong>'+item.personalityScore.toFixed(1)+'</strong></span>'+
      (item.valueScore===null?'':'<span>'+ui('v2.1 story values ','v2.1 剧情价值 ')+'<strong>'+item.valueScore.toFixed(1)+'</strong></span>')+
      (item.gameplayScore===null?'':'<span>'+ui('Gameplay preference ','玩法偏好 ')+'<strong>'+item.gameplayScore.toFixed(1)+'</strong></span>')+
      '</div><p class="fine">'+ui("Values and gameplay use the original development line's v2.1 overall profile; the conditional branch is not rescored.","价值与玩法取自原国家发展线的 v2.1 整体画像，不代表该条件分支重新评分。")+'</p>') +
    '<div class="chips">' + labelsFor(e) + '</div><p class="why">' +
    esc(explanation) + '</p>' +
    (e.player_summary_zh ? '<p class="summary">' +
      esc(e.player_summary_zh) + "</p>" : "") +
    '<details class="profile-toggle"' + (index === 0 ? " open" : "") +
    '><summary>' + ui("Five-axis comparison and route evidence", "五轴对比与路线依据") + '</summary>' +
    axisComparison(user, e.personality) +
    stateDetails(e, item.score) + otherStates + "</details>" +
    '<p><a data-country="' + esc(e.owner_tag) + '" data-profile="' +
    esc(e.profile_id || "") + '" href="?country=' + encodeURIComponent(e.owner_tag) +
    '">' + ui("View country encyclopedia ↗", "查看国家百科 ↗") + '</a> <button type="button" class="secondary compare-inline" data-compare-add="' +
    esc(e.owner_tag) + '">' + ui("Add to comparison", "加入比较") + '</button></p></article>';
}
function runMatch(scroll=true) {
  if (!data) return;
  try {
    const pool = encyclopediaIndex ? filterCandidatesByRegion(data.entries,matchRegion,encyclopediaIndex) : data.entries;
    const applied=preferenceUI?.applied;
    ranked = applied && playstyleData
      ? rankWithPreferences(user,pool,playstyleData,applied.prefs,applied.values,5)
      : rank(user,pool,5);
    $("resultCards").innerHTML = ranked.top.length?
      ranked.top.map(renderCard).join(""):
      '<p class="notice">' + ui("No development line matches the current region and colonization filters. Broaden the filters.", "当前地区与殖民筛选条件下没有可匹配的发展线，请放宽限制。") + '</p>';
    $("results").classList.remove("hidden");
    const selectedRegion = encyclopediaIndex?.regions.find(x=>x.key===matchRegion);
    const selectedRegionName = selectedRegion ? regionName(selectedRegion) : ui("All regions", "全部地区");
    showNotice(ui("Match input: ", "匹配输入：") +
      (lastVectorSource==="questionnaire"?ui("P2 scenario questionnaire","P2情境问卷"):ui("manual five-axis input","五轴手动输入")) +
      ui("; scope: ", "；当前范围：") + selectedRegionName +
      ui("; method: ", "；匹配方式：") + (applied ? ui("five axes + independent story/gameplay preferences","五轴 + 独立剧情／玩法偏好") : ui("original P1 five axes","原 P1 五轴")) +
      ui("; ", "；") + ranked.groupCount + ui(" countries, ", "国参与，") +
      (ranked.candidateCount ?? pool.length) + ui(" candidate profiles, showing ", "条候选画像，展示") +
      ranked.top.length + ui(" distinct development lines.", "条不同发展线。"));
    if(scroll)$("results").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showNotice(ui("Matching failed: ", "匹配失败：") + error.message, true);
  }
}
function renderCatalog() {
  if (!data) return;
  const tag = selectedCatalogTag;
  const entries = data.entries.filter(x => x.owner_tag === tag);
  if (!entries.length) {
    $("catalogDetail").textContent = ui("No matching country. Change the search terms.", "没有匹配的国家，请修改搜索条件。");
    return;
  }
  const baseline = entries.find(x => x.profile_type === "baseline");
  const conditional = entries.filter(x => x.profile_type !== "baseline");
  const matching = ranked ? ranked.all.filter(x => x.entry.owner_tag === tag) : [];
  const scoreMap = new Map(matching.map(x => [x.entry.id, x.score]));
  $("catalogDetail").innerHTML = '<h3 class="catalog-title">' +
    esc(baseline.owner_name_zh) + " · " + esc(tag) +
    '</h3><p class="muted">' + ui("One common baseline; ", "共同基线 1 条；已评分条件画像 ") +
    conditional.length + ui(" scored conditional profiles. ", " 条。") +
    (conditional.length ? ui("Conditional routes are not necessarily mutually exclusive; expand each for its prerequisites.", "条件路线并不必然互斥，详细前提请分别展开。") :
      ui("No separate major five-axis branch; no fictional choices are introduced.", "没有独立的重大五轴分支，不制造虚构选项。")) +
    '</p><p><a data-country="' + esc(tag) + '" href="?country=' + esc(tag) +
    '">' + ui("View full country encyclopedia ↗", "查看完整国家百科 ↗") + '</a></p>' + entries.map(e =>
      stateDetails(e, scoreMap.get(e.id) ?? null)).join("");
}

function navigate(route, save=true) {
  const nextRoute=routeInLocale(route,location.href);
  if(save){
    history.replaceState({...history.state,scrollY:window.scrollY},"",location.href);
    history.pushState({scrollY:0},"",nextRoute);
  }
  renderRoute();
  if(save)window.scrollTo(0,0);
}
function renderRoute() {
  if(!encyclopedia)return;
  const params=new URLSearchParams(location.search);
  const country=params.get("country");
  const isCompare=!country&&params.get("view")==="compare";
  const isEncyclopedia=!!country||params.get("view")==="encyclopedia";
  const isQuiz=!isEncyclopedia&&!isCompare;
  $("quizView").classList.toggle("hidden",!isQuiz);
  $("encyclopediaView").classList.toggle("hidden",!isEncyclopedia);
  $("comparisonView").classList.toggle("hidden",!isCompare);
  $("navQuiz").classList.toggle("active",isQuiz);
  $("navEncyclopedia").classList.toggle("active",isEncyclopedia);
  $("navCompare").classList.toggle("active",isCompare);
  if(country)encyclopedia.showCountry(country,params.get("profile")||"");
  else if(isEncyclopedia)encyclopedia.showDirectory();
  else if(isCompare)comparison?.show(params.get("compare"));
  document.title=english() ?
    (country ? country+" · Anbennar Encyclopedia" : isCompare ? "Anbennar · Country Comparison" :
    isEncyclopedia ? "Anbennar · Country Encyclopedia" : "Anbennar · Personality Match") :
    (country ? country+" · 安本纳尔国家百科" :
    isCompare ? "安本纳尔 · 国家横向比较" :
    isEncyclopedia ? "安本纳尔 · 国家百科目录" : "安本纳尔 · v2.2 五维人格匹配");
}
function bindNavigation() {
  document.addEventListener("click",event=>{
    const add=event.target.closest("[data-compare-add]");
    if(add){
      comparison?.open(add.getAttribute("data-compare-add"));
      return;
    }
    const target=event.target.closest("a");
    if(!target)return;
    const isCountry=target.hasAttribute("data-country");
    const isNav=target.id==="navQuiz"||target.id==="navEncyclopedia"||
      target.id==="navCompare"||
      target.hasAttribute("data-encyclopedia-back")||target.hasAttribute("data-show-quiz");
    if(!isCountry&&!isNav)return;
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    if(isCountry){
      const tag=target.getAttribute("data-country");
      const p=target.getAttribute("data-profile");
      navigate("?country="+encodeURIComponent(tag)+(p?"&profile="+encodeURIComponent(p):""));
    }else navigate(target.getAttribute("href"));
  });
  window.addEventListener("popstate",event=>{
    renderRoute();
    requestAnimationFrame(()=>window.scrollTo(0,event.state?.scrollY||0));
  });
}

function bind() {
  renderSliders();
  questionnaire=createQuestionnaireUI({onComplete(vector){
    updateVector(vector);
    lastVectorSource="questionnaire";
    saveSession();
    if(data){
      runMatch(false);
      $("preferencePanel").scrollIntoView({behavior:"smooth",block:"start"});
    }else showNotice(ui("Five-axis result generated; waiting for country score data.", "五轴结果已生成，等待国家评分数据加载。"));
  }});
  bindNavigation();
  $("vectorForm").addEventListener("submit", event => {
    event.preventDefault();
    runMatch();
  });
  $("randomBtn").addEventListener("click", () => {
    updateVector(Object.fromEntries(AXIS_KEYS.map(key =>
      [key, Math.floor(Math.random() * 101)])));
    lastVectorSource="manual";
    saveSession();
    runMatch();
  });
  $("resetBtn").addEventListener("click", () => {
    updateVector(Object.fromEntries(AXIS_KEYS.map(key => [key, 50])));
    lastVectorSource="manual";
    saveSession();
    $("results").classList.add("hidden");
    ranked = null;
    if (data) {
      showNotice(ui("Reset to midpoint. Choose five-axis values or use a random example.", "已恢复中间值。请选择五轴数值后计算，或使用随机模拟。"));
      renderCatalog();
    }
  });
  $("matchRegion").addEventListener("change",event=>{
    matchRegion=event.target.value;
    preferenceUI?.setRegion(matchRegion);
    saveSession();
    if(ranked)runMatch(false);
  });
}
async function init() {
  bind();
  try {
    // Settle optional failures immediately, even if a required request fails first.
    const playstyleRequest=fetchLocalizedJson("playstyle-preferences.json").then(
      value=>({ok:true,value}), error=>({ok:false,error})
    );
    const [payload,indexPayload]=await Promise.all([
      fetchLocalizedJson("personality-v22.json"),
      fetchLocalizedJson("encyclopedia-index.json")
    ]);
    validateDataset(payload);
    if (payload.source?.commit !== "0a4811355058f12c919bce45c2ee86f0323c749a" ||
        payload.source?.blob_sha !== "409e5b01c990dca5d629bd06ff82db4aae5ff4e7") {
      throw new Error("研究源提交标识不符合当前 P0 固定基准");
    }
    const index=compatibleEncyclopediaIndex(indexPayload);
    validateEncyclopediaIndex(index,payload.entries);
    data = payload;
    encyclopediaIndex=index;
    try {
      const result=await playstyleRequest;
      if(!result.ok)throw result.error;
      playstyleData=result.value;
      validatePlaystyleData(playstyleData);
    } catch(error) {
      playstyleData=null;
      console.warn(ui("Additional preference data unavailable; P0 five-axis scoring is unaffected", "附加偏好数据不可用，P0五轴计算不受影响"),error.message);
    }
    if(matchRegion&&!index.regions.some(r=>r.key===matchRegion))matchRegion="";
    $("matchRegion").innerHTML=regionOptions(index);
    $("matchRegion").value=matchRegion;
    $("matchRegion").disabled=false;
    preferenceUI=createPreferenceUI(index,{
      onChangeRegion(region) {
        matchRegion=region;
        $("matchRegion").value=region;
        saveSession();
      },
      onInvalidate() {
        if(ranked)runMatch(false);
      },
      onApply(prefs,values){
        if(!playstyleData){
          $("preferenceStatus").classList.add("error");
          $("preferenceStatus").textContent=ui("Additional scoring data is not loaded; five-axis personality matching remains available.", "附加评分数据未加载；五轴人格匹配仍可正常使用。");
          return;
        }
        matchRegion=prefs.region;
        $("matchRegion").value=matchRegion;
        saveSession();
        preferenceUI.setApplied({prefs,values});
        runMatch();
      }
    });
    if(preferenceUI.applied){
      matchRegion=preferenceUI.applied.prefs.region;
      $("matchRegion").value=matchRegion;
      saveSession();
    }else preferenceUI.setRegion(matchRegion);
    $("finalRegion").disabled=false;
    if(!playstyleData){
      $("applyPreferences").disabled=true;
      $("preferenceStatus").textContent=ui("Additional data failed to load; only the original five-axis match is available.", "附加数据加载失败，暂时只有原五轴匹配。");
    }
    encyclopedia=createEncyclopedia(index,payload.entries,{
      onNavigateCountry(tag){navigate("?country="+encodeURIComponent(tag));},
      onStartRegionTest(region){
        matchRegion=region;
        $("matchRegion").value=region;
        preferenceUI?.setRegion(region);
        saveSession();
        navigate("./");
        if(ranked)runMatch();
      }
    });
    comparison=createComparison(index,payload.entries,{onNavigate:route=>navigate(route)});
    renderRoute();
    $("sourceCommit").textContent = payload.source.commit.slice(0, 12);
    $("runBtn").disabled = false;
    const allowed = new Set(payload.entries
      .filter(e=>e.profile_type==="baseline").map(e=>e.owner_tag));
    attachCountryAutocomplete($("countrySearch"),{
      getCountries:()=>index.countries.filter(c=>allowed.has(c.tag)),
      onQuery(){selectedCatalogTag="";$("catalogDetail").textContent=
        ui("Choose a country from the suggestions to view its approved profiles.", "请从下拉候选中选择国家，查看已批准的人格档案。");},
      onSelect(country){selectedCatalogTag=country.tag;renderCatalog();}
    });
    selectedCatalogTag=payload.entries.find(e=>e.profile_type==="baseline")?.owner_tag||"";
    renderCatalog();
    showNotice(t("app.ready","P0 评分已加载：109 国共同基线、57 条独立条件画像。可以调整五轴并计算 Top 5。"));
  } catch (error) {
    $("runBtn").disabled = true;
    showNotice(ui("Preview data failed to load: ", "预览数据加载失败：") + error.message +
      ui(". Use a local HTTP server rather than file:// and check the built artifacts.", "。请使用本地 HTTP 服务，不要直接以 file:// 打开；检查构建产物。"), true);
  }
}
installLanguageSwitch();
init();
