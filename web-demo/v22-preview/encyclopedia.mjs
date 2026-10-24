import {AXES} from "./scoring.mjs";
import {english,language,t,countryName,regionName,labelForAxis} from "./i18n.mjs";
import {attachCountryAutocomplete} from "./country-search.mjs";
import {matchCountries, UNVERIFIED} from "./regions.mjs";
import {readMapManifest, mapSection, installMapViewer} from "../map-location.mjs";
import {localizedDataPath,localizedArticlePath} from "./localization.mjs";
import {createRouteReader,renderDevelopmentRoutes,routePlaceholder} from "./routes-v24.mjs";
import {createMissionReader,renderMissionContent,missionPlaceholder,missionStatus} from "./missions-v24.mjs";

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => (
  {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
));
const all = value => Array.isArray(value) ? value : [];
const ui = (en,zh) => english()?en:zh;
const localized = x => x?.text || x?.text_en || x?.key || ui("[MISSING TRANSLATION]","文字未收录");
const missing = () => ui("[MISSING TRANSLATION]","资料缺失");

function countryTypeLabel(raw){
  const t=String(raw||"");
  if(t.startsWith("starting") || t==="1444_start")return ui("Starting country (","开局国家（")+t+ui(")","）");
  if(t.startsWith("formable") || t==="formed_country")return ui("Formable country (","形成国（")+t+ui(")","）");
  if(t.includes("campaign_chain"))return ui("Campaign chain (","连续国家发展线（")+t+ui(")","）");
  return ui("Other identity (","其他身份（")+(t||ui("unspecified","未注明"))+ui(")","）");
}

const textList = values => "<ul>"+all(values).map(v=>"<li>"+esc(v)+"</li>").join("")+"</ul>";

export function regionOptions(index) {
  return [{key:"",name_zh:"全部地区",count:index.countries.length},...index.regions]
    .map(r=>'<option value="'+esc(r.key)+'">'+esc(regionName(r))+ui(" (","（")+r.count+ui(" countries)","国）")+
      (r.key && r.key!==UNVERIFIED && (!english() || regionName(r)!==r.key)?" · "+esc(r.key):"")+"</option>").join("");
}
function flag(c, large=false) {
  const src=c.flag || c.identity?.flags?.find(f=>f.tag===c.tag)?.url;
  return src ? '<img loading="lazy" class="country-flag'+(large?" hero-flag":"")+
    '" src="'+esc(src)+'" alt="'+esc(countryName(c)||c.identity?.name_zh)+(english()?' flag':' 国旗')+'">' :
    '<span class="country-flag missing">'+ui("Flag unverified","旗帜待核实")+'</span>';
}
function effects(x) {
  if(!x?.effects?.length)return '<span class="field-warning">'+ui("Effects not recorded","效果未收录")+'</span>';
  return '<ul class="idea-effects">'+x.effects.map(e=>{
    const label=e.display || [e.modifier,e.raw_value].filter(x=>x!=null).join(" = ");
    return '<li><strong>'+esc(label||ui("Unknown effect","未知效果"))+"</strong>"+
      (e.display?"":'<span class="field-warning">'+ui("Unit unverified","单位待核实")+'</span>')+
      "</li>";
  }).join("")+"</ul>";
}
function ideaPart(x,title,open=false) {
  if(!x)return '<p class="field-warning">'+esc(title)+ui(": missing data","资料缺口")+'</p>';
  // Missing original localization is not descriptive prose. Do not fabricate
  // a banner for traditions, ambitions OR any of the seven ordinary ideas.
  // Provenance stays in static source JSON but no local file path renders.
  const desc=x.description?.text||x.description?.text_en||"";
  return '<details class="idea-piece"'+(open?" open":"")+'><summary>'+
    esc(title)+" · "+esc(localized(x.name))+"</summary>"+
    (desc?'<p class="idea-description">'+esc(desc)+"</p>":"")+
    effects(x)+"</details>";
}
function ideaGroup(data,index) {
  const sets=all(data.national_ideas?.sets),chosen=sets[index]||sets[0];
  if(!chosen)return "<h3>"+ui("National ideas","国家理念")+"</h3><p>"+ui("No structured idea data","无结构化理念数据")+"</p>";
  const own=chosen.country_tag===data.tag;
  return '<h2>'+ui("National ideas","国家理念")+'</h2><p class="fine">'+ui("Idea sets are separated by applicable Tag, trigger and source. Multiple sets do not stack automatically and are not assumed unlocked.","按适用 Tag、触发条件和来源分套组展示。不同套组不自动叠加，不代表已解锁。国家理念不等于可选理念组。")+'</p>'+
    '<label class="idea-selector">'+ui("Idea set (","切换理念套组（")+sets.length+ui(" total)"," 套）")+'<select id="ideaSetSelect">'+
    sets.map((s,i)=>'<option value="'+i+'"'+(i===index?" selected":"")+">"+
      esc(s.country_tag||ui("unknown Tag","未知Tag"))+" · "+esc(localized(s.name))+
      (s.country_tag===data.tag?ui(" · current country"," · 本国"):ui(" · successor / condition"," · 后继／条件"))+"</option>").join("")+
    '</select></label><div class="idea-scope"><strong>'+
    esc(localized(chosen.name))+"</strong><p>"+ui("Applicable country: ","适用国家：")+
    esc(chosen.country_tag||ui("unspecified","未注明"))+ui("; role: ","；角色：")+esc(chosen.role||ui("unspecified","未注明"))+
    ui("; eligibility: ","；匹配条件：")+esc(chosen.eligibility||ui("unspecified","未注明"))+"</p>"+
    (own?"":"<p>"+ui("This set belongs to a related successor or conditional state; it is not assumed to replace the current set automatically.","此套组属于相关后继或条件状态，不能假定已自动更换。")+"</p>")+
    (chosen.trigger?'<details><summary>'+ui("Raw activation condition","原始生效条件")+'</summary><pre>'+
      esc(chosen.trigger)+"</pre></details>":"")+
    "</div>"+
    ideaPart(chosen.traditions,ui("Traditions","国家传统"),true)+
    all(chosen.ideas).map((x,i)=>ideaPart(x,ui("Idea ","理念")+(i+1))).join("")+
    ideaPart(chosen.ambition,ui("Ambition","国家野心"),true);
}
function personalityPanel(data,entries) {
  const base=entries.find(e=>e.profile_type==="baseline");
  if(!base)return "<p>"+ui("No approved v2.2 baseline is recorded for this country.","尚未收录本国v2.2基线")+"</p>";
  const conditionals=entries.filter(e=>e.profile_type!=="baseline");
  const types=english()?{choice:"Policy / choice profile",stage:"Mission stage / threshold",formation:"Formable / successor"}:
    {choice:"政策选择／条件画像",stage:"任务阶段／阈值结算",formation:"形成国／后继"};
  const table=AXES.map(([k,label])=>'<tr><th>'+esc(labelForAxis(k,label))+'</th><td>'+
    base.personality[k]+"</td></tr>").join("");
  const branches=conditionals.map(p=>'<details class="profile-reference"><summary>'+
    esc(p.name_zh)+" · "+esc(types[p.profile_type]||p.profile_type)+
    (p.applicable_tag===p.owner_tag?"":" · "+esc(p.applicable_tag))+
    '</summary><p>'+ui("Original development line: ","原始发展线：")+esc(p.owner_tag)+
    ui("; applicable Tag: ","；实际适用Tag：")+esc(p.applicable_tag)+
    "</p><p>"+esc(p.player_summary_zh||p.scoring_rationale||ui("No separate player summary","无独立玩家概述"))+"</p>"+
    "<p>"+esc(AXES.map(([k,name])=>labelForAxis(k,name)+" "+p.personality[k]).join(ui("; ","；")))+"</p>"+
    "<p>"+ui("Actual changed axes: ","实际差异轴：")+esc(Object.entries(p.axis_overrides||{}).map(([k,v])=>labelForAxis(k,k)+" "+v).join(ui("; ","；"))||ui("none","无"))+"</p>"+
    textList(p.conditions)+
    (p.equivalent_profile_ids?.length?"<p>"+ui("Equivalent conditions: ","等价条件：")+esc(p.equivalent_profile_ids.join(ui(", ","、")))+
       ui(" (not counted twice)</p>","（不重复计数）</p>")+textList(all(p.equivalent_conditions).flat(Infinity)):"")+
    "<p class='fine'>"+ui("Confidence: ","置信度：")+esc(p.confidence)+ui(". Conditional research states are not verified save-game states.","。研究条件状态非已验证的游戏存档。")+"</p></details>").join("");
  return '<h2>'+ui("v2.2 five-axis personality and conditional profiles","v2.2 五轴人格与条件画像")+'</h2><p class="fine">'+ui("Only approved P0 scores are shown. The magic–artifice axis is directional, and pluralism is not a moral score.","仅使用P0已验收评分；魔奇轴代表方向不是强度，多元轴不是道德。")+'</p>'+
    '<table class="simple-table"><thead><tr><th>'+ui("Axis","轴")+'</th><th>'+ui("National baseline","国家共同基线")+'</th></tr></thead><tbody>'+
    table+"</tbody></table><h3>"+ui("Conditional profiles (","条件画像（")+conditionals.length+ui(")</h3>","）</h3>")+
    (branches||"<p>"+ui("Baseline only; no additional five-axis conditional profiles.","只有共同基线，无额外五轴条件画像。")+"</p>");
}
function gamePanel(data) {
  const v=data.values||{},g=data.gameplay||{};
  const names=english()?{warfare:"Warfare",tall_play:"Tall play",diplomacy:"Diplomacy",colonization:"Colonization",
    trade_economy:"Trade and economy",magic_artifice_intensity:"Magic / artifice gameplay intensity",
    narrative_density:"Narrative density",complexity:"Mechanical complexity",early_pressure:"Early pressure",
    difficulty:"Difficulty",campaign_length:"Campaign length",dark_story:"Dark narrative"}:
    {warfare:"战争",tall_play:"经营",diplomacy:"外交",colonization:"殖民",
      trade_economy:"贸易",magic_artifice_intensity:"魔奇玩法强度",
      narrative_density:"叙事密度",complexity:"机制复杂度",early_pressure:"前期压力",
      difficulty:"难度",campaign_length:"战役长度",dark_story:"黑暗叙事"};
  const rows=Object.entries(names).filter(([k])=>typeof g[k]==="number").map(([k,name])=>
    "<tr><th>"+esc(name)+"</th><td>"+g[k]+"</td></tr>").join("");
  return "<h2>"+ui("v2.1 narrative values and gameplay","v2.1 价值观与玩法")+"</h2><p>"+ui("Value classification: ","价值观：")+esc(v.label_zh||v.classification||ui("unspecified","未注明"))+
    ui(" (","（")+(typeof v.score==="number"?v.score:ui("unscored","无评分"))+ui(")","）")+ui("; not used in v2.2 matching.","，不参与v2.2匹配。")+"</p>"+
    textList(Object.entries(v.dimensions||{}).map(([k,n])=>k+ui(": ","：")+n))+
    '<details><summary>'+ui("Show gameplay scores","展开玩法评分")+'</summary><table class="simple-table"><tbody>'+
    rows+"</tbody></table></details>";
}
function card(c) {
  const r=c.survey_region||{};
  return '<a class="encyclopedia-country-card" data-country="'+esc(c.tag)+
    '" href="?country='+encodeURIComponent(c.tag)+'">'+flag(c)+
    '<div><strong>'+esc(countryName(c))+'</strong> <code>'+esc(c.tag)+'</code>'+
    '<p class="muted">'+esc(english()?c.name_zh:c.name_en)+"</p><p>"+
    esc(c.tagline||c.short_overview||(english()?t("compat.onlyChinese"):"暂无介绍"))+'</p><small>'+
    esc(regionName(r)||ui("Region unverified","地区待核实"))+
    (c.idea_set_count>1?ui(" · multiple conditional idea sets"," · 多套条件理念"):"")+
    (all(c.successors).length?ui(" · successor relationship"," · 后继关联"):"")+
    '</small></div><span class="open-arrow">↗</span></a>';
}

export function createEncyclopedia(index,entries,{onStartRegionTest,onNavigateCountry}) {
  const countryIndex=new Map(index.countries.map(c=>[c.tag,c]));
  const profiles=new Map();
  for(const e of entries){
    if(!profiles.has(e.owner_tag)) profiles.set(e.owner_tag,[]);
    profiles.get(e.owner_tag).push(e);
  }
  const detailCache=new Map(),articleCache=new Map();
  const readRoutes=createRouteReader();
  const readMissions=createMissionReader();
  let missionSession=null,routeBundle=null;
  // Cross-country links still use the app router. Task selections within the
  // loaded owner update the reader and route focus, preserving the article.
  $("encyclopediaDetail").addEventListener("click",event=>{
    if(event.target.closest("[data-mission-retry]")){
      if(missionSession){
        if(event.target.closest("#missionInheritedContent"))void loadInheritedMissions(missionSession);
        else void loadMissions(missionSession);
      }
      return;
    }
    const link=event.target.closest("a[data-route-focus],a[data-mission-focus]");
    if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    event.stopPropagation();
    const next=new URL(link.href,location.href),session=missionSession;
    const localMission=link.hasAttribute("data-mission-focus")&&session?.bundle&&
      activeMissionSession(session)&&next.searchParams.get("country")===session.tag;
    const {scrollX,scrollY}=window;
    history.replaceState({...history.state,scrollY},"",location.href);
    history.pushState({scrollY:localMission?scrollY:0},"",next.href);
    if(localMission){
      const previousFocus=session.focusTag;
      session.focusTag=next.searchParams.get("focusTag")||"";
      session.missionId=next.searchParams.get("mission")||"";
      session.deepLink=true;
      if(previousFocus!==session.focusTag){
        if(routeBundle?.locale===session.locale){
          const panel=$("developmentRoutes");
          if(panel)panel.outerHTML=renderDevelopmentRoutes(routeBundle,{
            ownerTag:session.tag,focusTag:session.focusTag,index,baseUrl:location.href
          });
        }else void showRoutes(session.tag,session.focusTag,session.token);
      }
      drawMissions(session);
      const selected=$("missionSelected");
      selected?.focus({preventScroll:true});
      // CSS smooth scrolling must not animate a viewport restoration. On the
      // stacked mobile layout, reveal the new detail directly instead.
      window.scrollTo({left:scrollX,top:scrollY,behavior:"instant"});
      if(window.matchMedia("(max-width:760px)").matches)
        selected?.scrollIntoView({block:"start",behavior:"instant"});
      return;
    }
    window.dispatchEvent(new PopStateEvent("popstate",{state:history.state}));
  });
  $("encyclopediaDetail").addEventListener("toggle",event=>{
    if(!event.target.open||!missionSession)return;
    if(event.target.id==="missionReader")void loadMissions(missionSession);
    if(event.target.id==="missionInheritance")void loadInheritedMissions(missionSession);
  },true);
  const mapManifest=readMapManifest();
  installMapViewer($("encyclopediaDetail"),{language:language()});
  const saved = key => { try { return sessionStorage.getItem(key) || ""; } catch { return ""; } };
  const persist = (key,value) => { try { sessionStorage.setItem(key,value); } catch { /* optional */ } };
  let directoryRegion=saved("anbennar-v22-directory-region"),token=0,currentCountry=null;
  if (directoryRegion && !index.regions.some(r=>r.key===directoryRegion)) directoryRegion="";
  $("encyclopediaRegion").value=directoryRegion;
  $("encyclopediaSearch").value=saved("anbennar-v22-directory-query");
  $("encyclopediaRegion").innerHTML=regionOptions(index);
  $("encyclopediaRegion").disabled=false;
  function directory() {
    const matched=matchCountries(index,directoryRegion,$("encyclopediaSearch").value);
    const region=index.regions.find(r=>r.key===directoryRegion);
    $("directorySummary").textContent=(english()?"Showing ":"正在展示 ")+matched.length+" / "+index.country_count+(english()?" countries":" 国")+
      (region?" · "+regionName(region):"");
    $("encyclopediaCards").innerHTML=matched.length?matched.map(card).join(""):
      '<p class="panel">'+ui("No countries match this region and search.","当前地区和搜索条件下没有国家。")+'</p>';
    $("regionToQuiz").disabled=!directoryRegion;
    $("regionToQuiz").textContent=directoryRegion?t("encyclopedia.regionQuiz","只匹配本地区国家 ↗"):
      t("encyclopedia.selectRegion","请先选择一个地区");
  }
  $("encyclopediaRegion").addEventListener("change",e=>{
    directoryRegion=e.target.value;
    persist("anbennar-v22-directory-region",directoryRegion);
    directory();
    searchAutocomplete.refresh();
  });
  const searchAutocomplete=attachCountryAutocomplete($("encyclopediaSearch"),{
    getCountries:()=>matchCountries(index,directoryRegion),
    fillOnSelect:false,
    onQuery(query){
      persist("anbennar-v22-directory-query",query);
      directory();
    },
    onSelect(country){onNavigateCountry(country.tag);}
  });
  $("regionToQuiz").addEventListener("click",()=>{
    if(directoryRegion)onStartRegionTest(directoryRegion);
  });
  async function readJson(path) {
    const response=await fetch("./"+path,{cache:"force-cache"});
    if(!response.ok)throw new Error("HTTP "+response.status+" "+path);
    return response.json();
  }
  async function showRoutes(tag,focusTag,thisToken) {
    let html,loadedBundle=null;
    try {
      const bundle=await readRoutes.load(language());
      html=renderDevelopmentRoutes(bundle,{ownerTag:tag,focusTag,index,baseUrl:location.href});
      loadedBundle=bundle;
    } catch {
      html=routePlaceholder(language());
    }
    if(thisToken!==token||currentCountry!==tag||
       (new URLSearchParams(location.search).get("focusTag")||"")!==focusTag)return;
    routeBundle=loadedBundle;
    const panel=$("developmentRoutes");
    if(panel)panel.outerHTML=html;
  }
  function activeMissionSession(session){
    return missionSession===session&&session.token===token&&currentCountry===session.tag&&language()===session.locale;
  }
  function drawMissions(session,restoreSelection=false){
    if(!activeMissionSession(session))return;
    $("missionContent").innerHTML=renderMissionContent(session.bundle,{
      focusTag:session.focusTag,missionId:session.missionId,baseUrl:location.href,index,inherited:session.inherited
    });
    if(restoreSelection&&session.deepLink){
      requestAnimationFrame(()=>{
        if(!activeMissionSession(session)||!$("missionReader")?.open)return;
        const target=$("missionSelected")||$("missionReader");
        target.focus({preventScroll:true});target.scrollIntoView({block:"start"});
      });
    }
  }
  async function loadMissions(session){
    if(!activeMissionSession(session)||session.pending||session.bundle)return;
    session.pending=true;
    $("missionContent").innerHTML=missionStatus(session.locale,true);
    try{
      const bundle=await readMissions.load(session.tag,session.locale);
      if(!activeMissionSession(session))return;
      session.bundle=bundle;
      drawMissions(session,true);
      if(session.tag==="J84"&&session.missionId.startsWith("G64_"))await loadInheritedMissions(session);
    }catch{
      if(activeMissionSession(session)){
        session.bundle=null;
        readMissions.forget(session.tag,session.locale);
        $("missionContent").innerHTML=missionStatus(session.locale);
      }
    }finally{session.pending=false;}
  }
  async function loadInheritedMissions(session){
    if(!activeMissionSession(session)||!session.bundle||session.inherited||session.inheritedPending)return;
    const ref=session.bundle.data.inherited_catalogs[0];
    if(!ref)return;
    session.inheritedPending=true;
    const content=$("missionInheritedContent");
    if(content)content.innerHTML=missionStatus(session.locale,true);
    try{
      const inherited=await readMissions.load(ref.owner_tag,session.locale);
      if(!activeMissionSession(session))return;
      session.inherited=inherited;
      drawMissions(session,session.missionId.startsWith("G64_"));
    }catch{
      if(activeMissionSession(session)){
        session.inherited=null;
        readMissions.forget(ref.owner_tag,session.locale);
        const target=$("missionInheritedContent");
        if(target)target.innerHTML=missionStatus(session.locale);
      }
    }finally{session.inheritedPending=false;}
  }
  async function showCountry(tag,selectedProfile="") {
    const params=new URLSearchParams(location.search);
    const focusTag=params.get("focusTag")||"";
    const idx=countryIndex.get(tag),thisToken=++token;
    missionSession=null;
    $("encyclopediaDirectory").classList.add("hidden");
    $("encyclopediaDetail").classList.remove("hidden");
    if(!idx){
      $("encyclopediaDetail").innerHTML='<p class="panel">'+ui("Country not recorded: ","未收录国家：")+esc(tag)+"</p>";
      return;
    }
    $("encyclopediaDetail").innerHTML='<div class="panel">'+esc(english()?"Loading ":"加载")+esc(countryName(idx))+
      (english()?"…":"的国家理念和历史正文…")+"</div>";
    try{
      if(!detailCache.has(tag))detailCache.set(tag,readJson(localizedDataPath("countries/"+encodeURIComponent(tag)+".json").replace(/^\.\//,"")));
      if(!articleCache.has(idx.article_id))articleCache.set(idx.article_id,readJson(localizedArticlePath(idx.article_id).replace(/^\.\//,"")));
      const [data,article,maps]=await Promise.all([detailCache.get(tag),articleCache.get(idx.article_id),mapManifest]);
      if(thisToken!==token)return;
      if(data.tag!==tag||article.article_id!==idx.article_id||
         article.article_path!==idx.article_path)throw new Error(ui("Country/article linkage mismatch","国家与文章关联不一致"));
      currentCountry=tag;
      const overview=data.player_overview||{},identity=data.identity||{};
      const ideas=all(data.national_ideas?.sets);
      let own=ideas.findIndex(s=>s.country_tag===tag&&s.eligibility==="identity_filter_matches");
      if(own<0)own=Math.max(0,ideas.findIndex(s=>s.country_tag===tag));
      const r=idx.survey_region||{};
      const recommend=data.recommendation||{};
      $("encyclopediaDetail").innerHTML=
        '<div class="detail-tools"><a href="?view=encyclopedia" data-encyclopedia-back>'+esc(t("country.return","← 返回目录"))+'</a>'+
        '<a href="./" data-show-quiz>'+esc(t("country.quiz","返回测试 ↗"))+'</a>'+
        '<button type="button" class="secondary compare-inline" data-compare-add="'+esc(tag)+
        '">'+esc(t("country.addCompare","加入国家比较"))+'</button></div>'+
        '<header class="country-hero panel">'+flag(idx,true)+
        '<div><p class="eyebrow">ANBENNAR · COUNTRY ENCYCLOPEDIA</p><h1>'+
        esc(countryName(idx))+' <small>'+esc(tag)+'</small></h1>'+
        '<p>'+esc(english()?idx.name_zh:idx.name_en)+'</p><p>'+
        esc(english()?"Survey region: ":"国家百科分区：")+
        esc(regionName(r)||ui("Region unverified","地区待核实"))+ui(" (","（")+esc(r.name_en||ui("unverified","未核实"))+ui(")","）")+"</p>"+
        '<p>'+ui("Country identity: ","国家身份：")+esc(countryTypeLabel(identity.country_type))+
        '</p><p class="lead">'+esc(overview.tagline||"")+'</p>'+
        (all(identity.successors).length?'<p>'+ui("Related successors: ","相关后继：")+esc(identity.successors.map(x=>typeof x==="string"?x:(x.name_en||x.name_zh||x.tag)).join(ui(", ","、")))+"</p>":"")+
        '</div></header>'+
        mapSection(tag,maps.data,{assetsApprovedAndHosted:true,assetPrefix:"../../",identity,language:language()})+
        '<section class="panel"><h2>'+esc(t("country.overview","国家概览与玩法"))+'</h2>'+
        (english()&&data.translation_status!=="complete"?'<p class="notice translation-gap">'+esc(t("translation.countryGap"))+'</p>':"")+'<p>'+
        esc(overview.overview||identity.appearance||missing())+'</p><h3>'+ui("Signature features","核心特色")+'</h3>'+
        textList(overview.signature_features)+'<h3>'+ui("Mission routes and campaign pacing","任务路线与战役节奏")+'</h3><p>'+
        esc(overview.how_it_plays||ui("See the full article below.","请参阅下方原始百科文章"))+
        '</p><p><b>'+ui("Recommended for: ","适合玩家：")+'</b>'+esc(overview.recommended_for||missing())+
        '</p><p><b>'+ui("Avoid if: ","不推荐：")+'</b>'+esc(overview.avoid_if||missing())+
        '</p>'+(recommend.reasons?.length?'<p>'+ui("Reasons to recommend:","推荐理由：")+'</p>'+textList(recommend.reasons):"")+
        (recommend.warnings?.length?'<p>'+ui("Cautions:","注意事项：")+'</p>'+textList(recommend.warnings):"")+
        (identity.formation_scope?'<p><b>'+ui("Formable and mission-inheritance limits: ","形成国与任务继承限制：")+'</b>'+
        esc(identity.formation_scope)+"</p>":"")+'</section>'+
        routePlaceholder(language(),true)+
        missionPlaceholder(tag,language(),{open:params.get("panel")==="missions"||!!params.get("mission")})+
        '<section class="panel" id="ideaPanel">'+ideaGroup(data,own)+'</section>'+
        '<section class="panel">'+personalityPanel(data,profiles.get(tag)||[])+'</section>'+
        '<section class="panel">'+gamePanel(data)+'</section>'+
        '<section class="panel article-panel"><h2>'+esc(t("article.heading","完整历史与世界观原文"))+'</h2>'+
        (english()&&article.translation_status!=="complete"?'<p class="notice translation-gap">'+esc(t("article.original"))+'</p>':"")+
        '<p class="fine">'+esc(english()?t("translation.articleNote"):'以下为已编写的百科Markdown正文原样转换，包含可能属于旧版v2.1的数字。其人格坐标不等于上方P0已验收的v2.2评分。任务未来和传说不代表1444年已实现。若多国共用此文，保留共享范围，请核对小节标题。')+'</p>'+
        '<div class="article-content">'+article.html+'</div></section>'+
        '<section class="panel"><h2>'+ui("Sources and gaps","来源与缺口")+'</h2><p>'+ui("Article source: ","文章来源：")+'<code>'+
        esc(idx.article_path)+'</code></p><p>'+ui("Idea status: ","理念状态：")+
        esc(data.national_ideas?.status||ui("unspecified","未注明"))+ui("; sets: ","，套组 ")+ideas.length+
        ui("."," 套。")+'</p><p class="fine">'+ui("Local Workshop paths are provenance records, not claimed web-accessible sources.","本地 Workshop 文件仅显示为来源记录，不假装可以在网页访问。")+'</p></section>';
      $("ideaPanel").addEventListener("change",e=>{
        if(e.target.id==="ideaSetSelect")$("ideaPanel").innerHTML=ideaGroup(data,Number(e.target.value));
      });
      if(selectedProfile){
        const p=all(profiles.get(tag)).find(p=>p.profile_id===selectedProfile);
        if(p)$("encyclopediaDetail").insertAdjacentHTML("afterbegin",'<div class="notice">'+ui("Conditional profile from match: ","来自匹配的条件画像：")+
          esc(p.name_zh)+ui(". See the conditional-profile section below.","。详见下方条件画像栏目。")+'</div>');
      }
      void showRoutes(tag,focusTag,thisToken);
      if($("missionReader")){
        missionSession={tag,token:thisToken,locale:language(),focusTag,missionId:params.get("mission")||"",
          deepLink:params.get("panel")==="missions"||!!params.get("mission"),bundle:null,inherited:null};
        if($("missionReader").open)void loadMissions(missionSession);
      }
    } catch(e){
      if(thisToken!==token)return;
      detailCache.delete(tag);articleCache.delete(idx.article_id);
      $("encyclopediaDetail").innerHTML='<p class="notice error">'+ui("Encyclopedia data failed to load: ","百科数据加载失败：")+
        esc(e.message)+ui(". Check the static build artifacts.","。请检查静态构建产物。")+'</p>';
    }
  }
  function showDirectory(region) {
    token++;currentCountry=null;
    missionSession=null;
    if(typeof region==="string"){
      directoryRegion=region;
      $("encyclopediaRegion").value=region;
      persist("anbennar-v22-directory-region",region);
    }
    $("encyclopediaRegion").value=directoryRegion;
    $("encyclopediaDirectory").classList.remove("hidden");
    $("encyclopediaDetail").classList.add("hidden");
    directory();
  }
  directory();
  return {showCountry,showDirectory,get currentCountry(){return currentCountry},
    get currentRegion(){return directoryRegion}};
}
