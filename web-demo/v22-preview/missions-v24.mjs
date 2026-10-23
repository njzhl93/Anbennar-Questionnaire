// Optional consumer of the bounded source-verified mission projection. No game-state evaluation.
import {routeInLocale} from "./i18n.mjs";

const DOMAINS={G64:["G64"],J84:["J84"],A21:["A21","Z43"]};
// Consumer acceptance boundary for the approved mission pilot, not a second fact source.
// Expanding the catalogue requires a separately reviewed contract and consumer change.
const PILOT_IDS={
  G64:["G64:G64_1_3_see_to_the_steppe","G64:G64_2_2_bound_by_fear",
    "G64:G64_1_1_revenge_and_restitution","G64:G64_1_2_master_of_iron_and_sand","G64:G64_3_1_unfinished_business"],
  J84:["J84:J84_2_3_the_weaver_of_fates","J84:J84_3_1_a_warlord_empire","J84:J84_2_2_institutional_apotheosis"],
  A21:["A21:A21_trading_hub","A21:A21_renovate_political_system","A21:A21_the_teal_armada",
    "A21:A21_elven_rekindling","Z43:Z43_rebuild_noruin","Z43:Z43_aia",
    "A21:A21_new_elven_legion","A21:A21_revitalize_economy","A21:A21_stabilize","Z43:Z43_dha_tchathil",
    "A21:A21_new_beginning","Z43:Z43_exterior_branch","Z43:Z43_interior_branch"]
};
const UNCHECKED_PREREQUISITES={
  A21_new_beginning:["A21_prepare_new_capital"],
  Z43_exterior_branch:["Z43_recruiting_only_the_best"],Z43_interior_branch:["Z43_recruiting_only_the_best"]
};
const PILOT_SNAPSHOT={
  id:"pr3a-local-v1.37.5.0",
  index_snapshot_sha256:"520832dfd8c4b9d0b083c410ab4e4a14d824de9ef0a165f22ddf880deeee8fdc",
  mod:{workshop_id:"1385440355",manifest:"2812922911103828520",supported_version:"v1.37.5.0"},
  translation:{workshop_id:"2818493730",manifest:"7518363337005727349",supported_version:"v1.37.5.0"}
};
function pinnedSnapshot(value){
  return value?.id===PILOT_SNAPSHOT.id&&value?.index_snapshot_sha256===PILOT_SNAPSHOT.index_snapshot_sha256&&
    ["mod","translation"].every(role=>["workshop_id","manifest","supported_version"].every(key=>value?.[role]?.[key]===PILOT_SNAPSHOT[role][key]));
}
export const isMissionOwner=tag=>Object.hasOwn(DOMAINS,tag);
const localeKey=locale=>locale==="en"?"en":"zh";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const copy={
  en:{title:"Mission samples",notice:"Twenty-one source-verified samples across two routes, not a complete mission tree. Conditions and rewards are static summaries, not save-game eligibility or completion states.",list:"Selected country samples",native:"Original mission description",groups:"Mission group and applicability · editorial summary",trigger:"Completion conditions · editorial summary",effect:"Rewards · editorial summary",requires:"Direct prerequisites",none:"No direct prerequisite recorded.",outside:"Definition exists; outside this pilot",unchecked:"not_checked · Upstream definition not verified in this pilot",events:"Event references · call does not prove outcome",decisions:"Decision references · dependency does not execute a decision",complex:"complex_unverified · Compound execution semantics remain unverified.",runtime:"not_tested · EU4 runtime has not been tested.",inherited:"Conditional G64 inheritance",inheritLoad:"Expand to load inherited samples.",inheritScope:"This requires the historical G64 identity; no eligibility is inferred for your game.",source:"Native source",unknown:"This mission is not covered in the selected country view.",loading:"Loading mission samples…",error:"Mission samples are temporarily unavailable. The encyclopedia remains available.",retry:"Retry",indexMiss:"Native text verified; description was missed by the old index (index_miss).",placeholder:"Game placeholders are shown literally; no save-game values are substituted.",count:"samples displayed",branch:"Conditional group; not a universal or mandatory sequence.",called:"called",flag_required:"flag dependency"},
  zh:{title:"任务样本",notice:"两条路线共二十一个经来源核验的样本，并非完整任务树。条件和奖励为静态摘要，不代表存档中的资格或完成状态。",list:"当前国家任务样本",native:"任务原生描述",groups:"任务组及适用条件 · 编辑说明",trigger:"完成条件 · 编辑说明",effect:"任务奖励 · 编辑说明",requires:"直接前置",none:"未记录直接前置。",outside:"定义存在，未纳入本次试点",unchecked:"not_checked · 上游任务定义未在本次试点核验",events:"事件引用 · 调用不代表结果已发生",decisions:"决议引用 · 依赖不代表执行决议",complex:"complex_unverified · 复杂执行语义尚未完整核实。",runtime:"not_tested · 未执行EU4实机验证。",inherited:"G64条件继承样本",inheritLoad:"展开后载入继承样本。",inheritScope:"要求历史身份为G64；不会判断你的游戏是否满足资格。",source:"原生来源",unknown:"当前国家视图未覆盖此任务。",loading:"正在加载任务样本…",error:"任务样本暂时无法载入，原百科仍可使用。",retry:"重试",indexMiss:"原生文本已核实；旧索引漏收此描述（index_miss）。",placeholder:"游戏变量占位符原样显示，不代入存档数值。",count:"个展示样本",branch:"条件任务组，不代表普遍可用或必做顺序。",called:"调用",flag_required:"旗标依赖"}
};
const fail=reason=>{throw new Error(`Mission data: ${reason}`);};
const list=(value,label)=>{if(!Array.isArray(value))fail(label);return value;};
function string(value,label){if(typeof value!=="string"||!value.trim())fail(label);return value;}
function summary(texts,part){return string(texts.strings?.[part?.summary_key],"missing editorial summary");}

function validate(data,texts,owner,locale){
  if(data?.schema_version!=="v24-missions-1"||texts?.schema_version!==data.schema_version)fail("schema mismatch");
  if(data.owner_tag!==owner||texts.owner_tag!==owner)fail("owner mismatch");
  if(texts.locale!==(locale==="en"?"en":"zh-CN"))fail("locale mismatch");
  if(!pinnedSnapshot(data.source_snapshot)||texts.source_snapshot!==PILOT_SNAPSHOT.id)fail("fixed snapshot mismatch");
  string(data.article_id,"article_id");
  const groups=list(data.mission_groups,"mission_groups"),missions=list(data.missions,"missions");
  const native=list(texts.missions,"native missions"),ids=new Set();
  if(missions.length!==PILOT_IDS[owner].length||PILOT_IDS[owner].some(id=>!missions.some(m=>m.id===id)))fail("fixed pilot mission identities mismatch");
  if(!missions.length||native.length!==missions.length)fail("native mission coverage");
  for(const group of groups){
    if(!DOMAINS[owner].includes(group.source_domain))fail("group source domain");
    summary(texts,group.potential);
  }
  for(const mission of missions){
    const id=string(mission.mission_id,"mission_id");
    if(!DOMAINS[owner].includes(mission.source_domain)||mission.represented_tag!==mission.source_domain||mission.id!==`${mission.source_domain}:${id}`||ids.has(mission.id))fail("mission identity");
    ids.add(mission.id);
    for(const groupId of list(mission.mission_group_ids,"mission_group_ids"))
      if(!groups.some(g=>g.id===groupId&&g.source_domain===mission.source_domain))fail("mission group reference");
    if(!mission.mission_group_ids.length)fail("missing mission group");
    const entries=native.filter(n=>n.id===mission.id);
    if(entries.length!==1)fail("native identity");
    const entry=entries[0];
    for(const key of ["name","description"]){
      string(entry[key],`native ${key}`);
      if(entry[`${key}_key`]!==mission.localisation?.[`${key}_key`]||entry[`${key}_provenance`]?.native_status!=="verified")fail(`native ${key} binding`);
      if(locale==="zh"&&entry[`${key}_provenance`]?.decode_status!=="verified")fail("native decode status");
    }
    summary(texts,mission.trigger);summary(texts,mission.effect);
    const requiredMissions=list(mission.required_missions,"required_missions");
    const uncheckedIds=requiredMissions.filter(r=>r.status==="not_checked").map(r=>r.mission_id).sort();
    const expectedUnchecked=[...(UNCHECKED_PREREQUISITES[id]||[])].sort();
    if(uncheckedIds.length!==expectedUnchecked.length||uncheckedIds.some((value,i)=>value!==expectedUnchecked[i]))fail("unchecked prerequisite completeness");
    for(const required of requiredMissions){
      string(required.mission_id,"prerequisite ID");
      const unchecked=UNCHECKED_PREREQUISITES[id]?.includes(required.mission_id);
      if(unchecked?required.status!=="not_checked":required.status!=="verified")fail("prerequisite status");
      if(required.status==="verified"&&!missions.some(m=>m.mission_id===required.mission_id))fail("local prerequisite definition");
    }
    for(const [key,idKey] of [["event_refs","event_id"],["decision_refs","decision_id"]])
      for(const ref of list(mission[key],key)){string(ref[idKey],idKey);string(ref.relation,"reference relation");}
    if(mission.verification?.runtime!=="not_tested")fail("runtime state");
  }
  for(const inherited of list(data.inherited_catalogs,"inherited_catalogs")){
    if(owner!=="J84"||inherited.owner_tag!=="G64"||inherited.source_domain!=="G64")fail("inheritance owner");
    string(inherited.applicability,"inheritance condition");
    list(inherited.mission_group_ids,"inheritance groups");summary(texts,inherited);
  }
  return {data,texts,locale};
}

export function createMissionReader(fetcher=globalThis.fetch){
  const cache=new Map();
  async function fresh(owner,locale){
    const root="./data/v24-missions/";
    const fetchJson=async path=>{
      const response=await fetcher(root+path);
      if(!response?.ok)throw new Error(`Mission HTTP ${response?.status??"unknown"}`);
      return response.json();
    };
    const [data,texts]=await Promise.all([fetchJson(`mission-trees/${owner}.json`),fetchJson(`locales/${locale}/mission-trees/${owner}.json`)]);
    return validate(data,texts,owner,locale);
  }
  return {forget(owner,locale){cache.delete(`${owner}:${localeKey(locale)}`);},async load(owner,locale){
    if(!isMissionOwner(owner))fail(`owner ${owner} outside pilot`);
    const normalized=localeKey(locale),key=`${owner}:${normalized}`;
    if(!cache.has(key)){
      const pending=fresh(owner,normalized);cache.set(key,pending);
      pending.catch(()=>{if(cache.get(key)===pending)cache.delete(key);});
    }
    return cache.get(key);
  }};
}

export function missionStatus(locale,loading=false){
  const c=copy[localeKey(locale)];
  return `<p role="status" data-mission-state="${loading?"loading":"unavailable"}">${esc(loading?c.loading:c.error)}</p>${loading?"":`<button type="button" class="secondary" data-mission-retry>${esc(c.retry)}</button>`}`;
}
export function missionPlaceholder(owner,locale,{open=false}={}){
  if(!isMissionOwner(owner))return "";
  const c=copy[localeKey(locale)];
  return `<details id="missionReader" class="panel mission-reader"${open?" open":""}><summary>${esc(c.title)}</summary><div id="missionContent">${missionStatus(locale,true)}</div></details>`;
}

function route(baseUrl,owner,focus,missionId,locale){
  const url=new URL(baseUrl||"http://localhost/");
  if(url.searchParams.get("country")!==owner)url.searchParams.delete("profile");
  url.searchParams.set("country",owner);url.searchParams.set("focusTag",focus);
  url.searchParams.set("panel","missions");url.searchParams.set("lang",locale);
  if(missionId)url.searchParams.set("mission",missionId);else url.searchParams.delete("mission");
  url.hash="";
  return routeInLocale(url.href,url.href,locale);
}
function nativeFor(bundle,mission){return bundle.texts.missions.find(n=>n.id===mission.id);}
function missionLink(bundle,mission,{owner,focus,baseUrl,selected=""}){
  return `<a data-mission-focus="${esc(mission.mission_id)}" href="${esc(route(baseUrl,owner,focus,mission.mission_id,bundle.locale))}"${selected===mission.mission_id?' aria-current="true"':""}>${esc(nativeFor(bundle,mission).name)} <code>${esc(mission.mission_id)}</code></a>`;
}

export function renderMissionContent(bundle,{focusTag="",missionId="",baseUrl,index,inherited=null}={}){
  const {data,texts,locale}=bundle,c=copy[locale],owner=data.owner_tag;
  if(!index?.countries?.some(country=>country.tag===owner&&country.article_id===data.article_id))fail("owner/article linkage");
  const focus=DOMAINS[owner].includes(focusTag)?focusTag:owner;
  const own=data.missions.filter(m=>m.represented_tag===focus);
  let extra=[];
  const ref=data.inherited_catalogs[0];
  if(inherited){
    if(!ref||inherited.data.owner_tag!==ref.owner_tag||inherited.locale!==locale||(!pinnedSnapshot(inherited.data.source_snapshot)||!pinnedSnapshot(data.source_snapshot)))fail("inherited snapshot/owner/locale mismatch");
    if(!index.countries.some(country=>country.tag===inherited.data.owner_tag&&country.article_id===inherited.data.article_id))fail("inherited owner/article linkage");
    extra=inherited.data.missions.filter(m=>m.source_domain===ref.source_domain&&m.mission_group_ids.some(id=>ref.mission_group_ids.includes(id)));
  }
  const candidates=[...own.map(m=>({mission:m,bundle})),...extra.map(m=>({mission:m,bundle:inherited}))];
  const chosen=missionId?candidates.find(n=>n.mission.mission_id===missionId):candidates[0];
  const linkOptions={owner,focus,baseUrl,selected:chosen?.mission.mission_id};
  const taskList=(items,source)=>`<ul class="mission-list">${items.map(m=>`<li>${missionLink(source,m,linkOptions)}</li>`).join("")}</ul>`;
  const tabs=DOMAINS[owner].length>1?`<nav class="mission-tabs" aria-label="${esc(c.list)}">${DOMAINS[owner].map(tag=>`<a data-mission-focus="" href="${esc(route(baseUrl,owner,tag,"",locale))}"${tag===focus?' aria-current="true"':""}>${esc(tag)}</a>`).join("")}</nav>`:"";
  const inheritance=ref?`<details id="missionInheritance"${inherited?" open":""}><summary>${esc(c.inherited)}</summary><p>${esc(summary(texts,ref))}</p><p class="mission-condition"><code>${esc(ref.applicability)}</code> · ${esc(c.inheritScope)}</p><div id="missionInheritedContent">${inherited?taskList(extra,inherited):`<p>${esc(c.inheritLoad)}</p>`}</div></details>`:"";
  let detail=missionId&&!chosen?`<p role="status" class="mission-unknown">${esc(c.unknown)}</p>`:"";
  if(chosen){
    const m=chosen.mission,b=chosen.bundle,n=nativeFor(b,m);
    const required=m.required_missions.map(r=>{
      const target=b.data.missions.find(other=>other.mission_id===r.mission_id);
      return target&&r.status==="verified"?`<li>${missionLink(b,target,linkOptions)}</li>`:`<li><code class="mission-external">${esc(r.mission_id)}</code> · ${esc(r.status==="not_checked"?c.unchecked:c.outside)}</li>`;
    }).join("");
    const groups=m.mission_group_ids.map(id=>{
      const group=b.data.mission_groups.find(g=>g.id===id);
      return `<p><code>${esc(id)}</code></p><p>${esc(summary(b.texts,group.potential))}</p>${group.potential.verification==="complex_unverified"?`<p class="mission-condition">${esc(c.branch)}</p>`:""}`;
    }).join("");
    const references=(key,label,idKey)=>m[key].length?`<h4>${esc(label)}</h4><ul>${m[key].map(r=>`<li><code>${esc(r[idKey])}</code> · ${esc(c[r.relation]||r.relation)}</li>`).join("")}</ul>`:"";
    detail=`<article id="missionSelected" data-mission-id="${esc(m.mission_id)}" tabindex="-1"><h3>${esc(n.name)}</h3><p><code>${esc(m.mission_id)}</code> · ${esc(c.source)}: ${esc(m.source_domain)}</p><h4>${esc(c.native)}</h4><p class="mission-description">${esc(n.description.replace(/\\n/g,"\n"))}</p>${n.description.includes("[Root.")?`<p class="fine">${esc(c.placeholder)}</p>`:""}${n.description_provenance.index_status==="index_miss"?`<p class="fine">${esc(c.indexMiss)}</p>`:""}<h4>${esc(c.groups)}</h4>${groups}<h4>${esc(c.requires)}</h4>${required?`<ul class="mission-prerequisites">${required}</ul>`:`<p>${esc(c.none)}</p>`}<h4>${esc(c.trigger)}</h4><p class="mission-trigger">${esc(summary(b.texts,m.trigger))}</p><h4>${esc(c.effect)}</h4><p class="mission-effect">${esc(summary(b.texts,m.effect))}</p><p class="mission-verification">${esc(c.complex)}</p><p class="mission-verification">${esc(c.runtime)}</p>${references("event_refs",c.events,"event_id")}${references("decision_refs",c.decisions,"decision_id")}</article>`;
  }
  return `<p class="mission-notice">${esc(c.notice)}</p>${tabs}<div class="mission-layout"><div><h3>${esc(c.list)} · ${esc(focus)}</h3><p class="fine">${own.length} ${esc(c.count)}</p>${taskList(own,bundle)}${inheritance}</div><div class="mission-detail">${detail}</div></div>`;
}
