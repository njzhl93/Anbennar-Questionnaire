// v2.3.2 country-to-country encyclopedia comparison.
// Display-only: never re-rank or treat unapproved editorial baselines as P0.
import {AXES} from "./scoring.mjs";
import {english,t,countryName,regionName,labelForAxis} from "./i18n.mjs";
import {VALUE_AXES} from "./playstyle.mjs";
import {attachCountryAutocomplete} from "./country-search.mjs";
import {localizedDataPath} from "./localization.mjs";

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ui=(en,zh)=>english()?en:zh;
const showText = value => value == null || value === "" ? ui("[MISSING TRANSLATION]","未收录") : esc(value);
const firstText = obj => obj?.text || obj?.text_en || obj?.key || "";
const GAME_AXES = Object.freeze([
  ["warfare","Warfare","战争"],["tall_play","Tall play","经营"],["diplomacy","Diplomacy","外交"],
  ["colonization","Colonization","殖民"],["trade_economy","Trade and economy","贸易经济"],
  ["magic_artifice_intensity","Magic / artifice gameplay intensity","魔奇玩法强度"],
  ["narrative_density","Narrative density","叙事密度"],["complexity","Mechanical complexity","机制复杂度"],
  ["early_pressure","Early pressure","前期压力"],["difficulty","Difficulty","难度"],
  ["campaign_length","Campaign length","战役长度"],["dark_story","Dark narrative","黑暗叙事"]
]);
const VALUE_LABELS=Object.freeze({
  dignity:"Dignity",personhood:"Recognition of personhood",
  public_good:"Public good",restraint:"Restraint",
});

export function selectionFromQuery(raw, index) {
  const available = new Set(index.countries.map(x => x.tag));
  const out = [];
  for (const piece of String(raw || "").split(",")) {
    const tag = piece.trim().toUpperCase();
    if (available.has(tag) && !out.includes(tag) && out.length < 3) out.push(tag);
  }
  return out;
}

export function comparisonPath(tags) {
  return "?view=compare" + (tags.length ? "&compare=" + encodeURIComponent(tags.join(",")) : "");
}

export function comparisonModel(tags, details, entries) {
  if (tags.length !== details.length || new Set(tags).size !== tags.length ||
      tags.length > 3 || tags.some((tag,i) => details[i]?.tag !== tag))
    throw new Error(ui("Country selection and encyclopedia data do not match","国家与百科资料不一致"));
  const byOwner = new Map();
  for (const entry of entries) {
    if (!byOwner.has(entry.owner_tag)) byOwner.set(entry.owner_tag, []);
    byOwner.get(entry.owner_tag).push(entry);
  }
  return tags.map((tag,i) => ({
    tag, detail:details[i],
    approved:byOwner.get(tag) || [],
    baseline:(byOwner.get(tag) || []).find(x=>x.profile_type==="baseline") || null
  }));
}

function scoreCell(value, valueLabel = "") {
  if (typeof value !== "number" || !Number.isFinite(value))
    return '<span class="compare-unknown">'+ui("Not recorded","未收录")+'</span>';
  const n = Math.max(0,Math.min(100,value));
  return '<div class="compare-meter"><strong>'+esc(valueLabel || String(value))+
    '</strong><span aria-hidden="true" class="bar"><i style="width:'+
    n+'%"></i></span></div>';
}
function profileLabel(p) {
  return p.profile_type==="baseline" ? ui("Approved common baseline","获批共同基线") :
    (p.name_zh || p.profile_id || p.profile_type)+" · "+(p.applicable_tag||"");
}
function safeConditions(p) {
  const cond = Array.isArray(p?.conditions) ? p.conditions : [];
  return cond.length ? '<ul>'+cond.map(x=>'<li>'+esc(typeof x==="string"?x:JSON.stringify(x))+
    '</li>').join("")+'</ul>' : '<p>'+ui("The common baseline has no additional conditions.","共同基线无额外条件。")+'</p>';
}
function cell(value) { return '<td>'+value+'</td>'; }
const EN_ROWS={
  "国家 / 地区":"Country / region","国家定位":"Country identity",
  "推荐玩家":"Recommended for","开局与后继关系":"Starting and successor relationships",
  "五维人格证据等级":"Five-axis evidence status","比较的人格状态":"Compared personality profile",
  "条件与适用范围":"Conditions and scope","国家传统":"National traditions",
  "国家野心":"National ambition","理念套组":"National idea sets",
  "v2.1 · 国家价值取向":"v2.1 · Narrative values",
  "游玩特点":"Playstyle overview","注意事项":"Cautions"
};
function row(label, columns) {
  return '<tr><th scope="row">'+esc(english()?(EN_ROWS[label]||label):label)+'</th>'+columns.map(cell).join("")+'</tr>';
}
function validText(value) { return typeof value==="string" && value.trim() ? value : null; }
function ownIdeas(item) {
  const sets=Array.isArray(item.detail.national_ideas?.sets)?
    item.detail.national_ideas.sets : [];
  return sets.find(x=>x.country_tag===item.tag) || null;
}
function profileFor(item, picks) {
  return item.approved.find(x=>x.id===picks.get(item.tag)) || item.baseline;
}

export function createComparison(index, entries, {onNavigate}) {
  const catalogue = new Map(index.countries.map(x=>[x.tag,x]));
  const cache = new Map(), profilePicks = new Map();
  const root = $("comparisonView");
  const selectedKey = "anbennar-v232-comparison-tags";
  const profilesKey = "anbennar-v235-comparison-profiles";
  let tags = [], generation=0, warning="";
  try {
    tags=selectionFromQuery(sessionStorage.getItem(selectedKey),index);
    for (const [tag,id] of Object.entries(JSON.parse(sessionStorage.getItem(profilesKey)||"{}"))) {
      if(catalogue.has(tag)&&entries.some(e=>e.owner_tag===tag&&e.id===id))profilePicks.set(tag,id);
    }
  } catch { /* comparison still works without browser storage */ }

  const persist = () => {try {
    sessionStorage.setItem(selectedKey,tags.join(","));
    sessionStorage.setItem(profilesKey,JSON.stringify(Object.fromEntries(profilePicks)));
  } catch {}};
  const updateUrl = () => {persist();onNavigate(comparisonPath(tags));};
  let comparisonAutocomplete=null;

  function toolbar() {
    $("comparisonSelected").innerHTML=tags.length?
      tags.map(tag=>{
        const c=catalogue.get(tag);
    return '<span class="comparison-tag">'+esc(countryName(c)||tag)+
          ' <small>'+esc(tag)+'</small><button type="button" data-compare-remove="'+
          esc(tag)+'" aria-label="'+ui("Remove ","移除 ")+esc(countryName(c)||tag)+'">×</button></span>';
      }).join(""):"<span class='muted'>"+ui("No countries selected","尚未选择国家")+"</span>";
    $("comparisonSearch").disabled = tags.length>=3;
    comparisonAutocomplete?.refresh();
    $("comparisonCount").textContent=english()?"Selected "+tags.length+" / 3 countries; choose at least two.": "已选 "+tags.length+" / 3 国；至少选择 2 国显示对比。";
    $("comparisonMessage").textContent=warning;
    warning="";
  }

  async function readDetail(tag) {
    if (!catalogue.has(tag)) throw new Error(ui("Country is not in the encyclopedia index","国家不在百科目录"));
    if (!cache.has(tag)) {
      const task=fetch(localizedDataPath("countries/"+encodeURIComponent(tag)+".json"),{cache:"force-cache"})
        .then(res=>{if(!res.ok)throw new Error(tag+" HTTP "+res.status);return res.json();})
        .then(data=>{if(data.tag!==tag)throw new Error(tag+ui(": country-data Tag mismatch","：国家数据 Tag 不一致"));return data;})
        .catch(error=>{cache.delete(tag);throw error;});
      cache.set(tag,task);
    }
    return cache.get(tag);
  }

  function renderGrid(items) {
    const profiles=items.map(x=>profileFor(x,profilePicks));
    const head = items.map(x=>{
      const c=catalogue.get(x.tag);
      const flag=c.flag?'<img class="country-flag" loading="lazy" src="'+esc(c.flag)+
        '" alt="'+esc(countryName(c))+ui(" flag"," 国旗")+'">':"";
      return '<th scope="col"><div class="comparison-country-head">'+flag+
        '<strong>'+esc(countryName(c))+' <small>'+esc(x.tag)+'</small></strong></div>'+
        '<a data-country="'+esc(x.tag)+'" href="?country='+encodeURIComponent(x.tag)+
        '">'+ui("Open encyclopedia ↗","查看百科 ↗")+'</a></th>';
    });
    const rows = [
      row("国家 / 地区",items.map(x=>{
        const c=catalogue.get(x.tag),r=c.survey_region||{};
        return '<strong>'+esc(english()?(c.name_en||c.name_zh||x.tag):(c.name_zh||c.name_en||x.tag))+'</strong><p>'+esc(regionName(r)||ui("Region unverified","地区待核实"))+'</p>';
      })),
      row("国家定位",items.map(x=>{
        const c=catalogue.get(x.tag),v=x.detail.player_overview||{};
        return '<p>'+showText(v.tagline||c.tagline||c.short_overview)+'</p>';
      })),
      row("推荐玩家",items.map(x=>'<p>'+showText(x.detail.player_overview?.recommended_for)+'</p>')),
      row("开局与后继关系",items.map(x=>{
        const identity=x.detail.identity||{};
        const after=Array.isArray(identity.successors)?identity.successors:[];
        return '<p>'+showText(identity.country_type)+'</p>'+
          (after.length?'<p>'+ui("Related successors: ","关联后继 ")+esc(after.map(s=>
            typeof s==="string"?s:(s.name_en||s.name_zh||s.tag||ui("unspecified","未注明"))).join(ui(", ","、")))+'</p>':
            '<p class="muted">'+ui("No listed successor","无已列后继")+'</p>');
      })),
      row("五维人格证据等级",items.map(x=>x.baseline?
        '<span class="chip">'+ui("P0 approved · eligible for Top 5","P0 已批准 · 可参与 Top 5")+'</span>':
        '<span class="chip">'+ui("Encyclopedia only · not approved for v2.2 matching","百科资料；未获正式 v2.2 匹配资格")+'</span>')),
      row("比较的人格状态",items.map((x,i)=>{
        if(!x.baseline)return '<p class="muted">'+ui("No approved P0 baseline; no substitute score is invented.","没有正式 P0 基线；不展示未经批准的替代分数。")+'</p>';
        return '<label class="comparison-state-picker">'+ui("Profile state","选择条件画像")+'<select data-compare-profile="'+
          esc(x.tag)+'" aria-label="'+esc(countryName(catalogue.get(x.tag)))+ui(" profile state"," 的人格状态")+'">'+
          x.approved.map(e=>'<option value="'+esc(e.id)+'"'+
            (e.id===profiles[i].id?' selected':'')+'>'+esc(profileLabel(e))+
            '</option>').join("")+'</select></label>';
      })),
      ...AXES.map(([key,label])=>row("v2.2 · "+labelForAxis(key,label),
        profiles.map(p=>p?scoreCell(p.personality[key]):'<span class="compare-unknown">'+ui("Not in P0","未纳入 P0")+'</span>'))),
      row("条件与适用范围",profiles.map(p=>p?(
        p.profile_type==="baseline"?
        '<p>'+ui("Common baseline; no conditional branch.","共同基线，无条件分支。")+'</p>':
        '<div><strong>'+esc(profileLabel(p))+'</strong><p>'+ui("Owner line: ","所属发展线：")+esc(p.owner_tag)+
        ui("; applicable Tag: ","；实际适用：")+esc(p.applicable_tag)+'</p>'+
        safeConditions(p)+'<p class="fine">'+ui("Hypothetical applicability only; this does not prove the player has reached the state.","仅为假设性适用条件，不代表玩家已达成。")+'</p></div>'
      ):'<p class="muted">'+ui("No approved conditional profile","没有获批条件画像")+'</p>')),
      row("国家传统",items.map(x=>showText(firstText(ownIdeas(x)?.traditions?.name)))),
      row("国家野心",items.map(x=>showText(firstText(ownIdeas(x)?.ambition?.name)))),
      row("理念套组",items.map(x=>{
        const all=x.detail.national_ideas?.sets||[];
        return '<p>'+ui("Total: ","共 ")+esc(all.length)+ui(" sets (not automatically stacked)"," 套（多套不自动叠加）")+'</p>';
      })),
      row("v2.1 · 国家价值取向",items.map(x=>{
        const v=x.detail.values||{};
        return scoreCell(v.score,typeof v.score==="number"?
          v.score+" · "+(v.label_zh||v.classification||ui("Editorial score","编辑评分")):"");
      })),
      ...VALUE_AXES.map(([key,label])=>row("v2.1 · "+(english()?(VALUE_LABELS[key]||key):label),
        items.map(x=>scoreCell(x.detail.values?.dimensions?.[key])))),
      ...GAME_AXES.map(([key,enLabel,zhLabel])=>row(ui("v2.1 gameplay · ","v2.1 玩法 · ")+(english()?enLabel:zhLabel),
        items.map(x=>scoreCell(x.detail.gameplay?.[key])))),
      row("游玩特点",items.map(x=>'<p>'+showText(x.detail.player_overview?.how_it_plays)+'</p>')),
      row("注意事项",items.map(x=>'<p>'+showText(x.detail.player_overview?.avoid_if)+'</p>')),
    ];
    $("comparisonResult").innerHTML=
      '<div class="comparison-scroll" role="region" aria-label="'+ui("Country comparison table","国家横向对比表")+'" tabindex="0">'+
      '<table class="comparison-table"><caption>'+esc(english()?"Compare existing editorial data on separate scales; no new ranking is calculated.":"相同尺度的国家并排比较。数值来自既有资料；没有计算新的综合排名。")+'</caption>'+
      '<thead><tr><th scope="col">'+ui("Dimension","比较维度")+'</th>'+head.join("")+
      '</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>'+
      '<p class="fine">'+ui("v2.2 shows approved P0 profiles only. v2.1 values and gameplay use a separate editorial scale. Conditional profiles may overlap and may not be save-verified. Open each encyclopedia entry for missions, ideas and maps.","v2.2 五轴只呈现已批准 P0 画像；v2.1 价值与玩法是另一个独立的编辑性尺度，不能混作 v2.2 人格。 条件画像可能互不排斥或尚未实机验证。完整任务树、理念效果及地图请打开对应百科。")+'</p>';
  }

  async function show(raw=null) {
    if(raw!==null)tags=selectionFromQuery(raw,index);
    persist();
    const current=++generation;
    toolbar();
    if(tags.length<2) {
      $("comparisonResult").innerHTML='<div class="panel"><p>'+ui("Select at least two countries. All 116 encyclopedia entries are available, including entries not yet approved for formal personality matching.","请选择至少两个国家开始比较。可从 116 国百科中选择，包括暂未进入正式人格匹配的新增国家。")+'</p></div>';
      return;
    }
    $("comparisonResult").innerHTML='<p class="notice" role="status">'+ui("Loading encyclopedia data…","正在加载国家百科资料…")+'</p>';
    try {
      const details=await Promise.all(tags.map(readDetail));
      if(current!==generation)return;
      renderGrid(comparisonModel(tags,details,entries));
    } catch(e) {
      if(current!==generation)return;
      $("comparisonResult").innerHTML='<p class="notice error">'+ui("Comparison failed: ","国家对比加载失败：")+
        esc(e.message)+ui(". Remove the affected country and retry.","。可移除问题国家后重试。")+'</p>';
    }
  }

  function addTag(tag) {
    if (!catalogue.has(tag) || tags.includes(tag))return;
    if (tags.length>=3){warning=ui("Compare at most three countries; remove one first.","最多同时比较 3 国，请先移除一国。");show(tags.join(","));return;}
    tags=[...tags,tag];updateUrl();
  }

  root.addEventListener("click",event=>{
    const remove=event.target.closest("[data-compare-remove]");
    if(remove) {tags=tags.filter(t=>t!==remove.dataset.compareRemove);updateUrl();return;}
  });
  root.addEventListener("change",event=>{
    const target=event.target.closest("[data-compare-profile]");
    if(!target)return;
    const tag=target.dataset.compareProfile;
    if(!entries.some(e=>e.owner_tag===tag&&e.id===target.value))return;
    profilePicks.set(tag,target.value);
    show(tags.join(","));
  });
  comparisonAutocomplete=attachCountryAutocomplete($("comparisonSearch"),{
    getCountries:()=>index.countries.filter(c=>!tags.includes(c.tag)),
    clearOnSelect:true,
    onSelect(country){addTag(country.tag);}
  });
  return {show,open(tag) {
    if(!catalogue.has(tag))return;
    if(!tags.includes(tag)&&tags.length<3)tags.push(tag);
    else if(!tags.includes(tag))warning=ui("Three countries are already selected; remove one first.","已选满 3 国，请先移除一个国家。");
    updateUrl();
  }};
}
