import {routeInLocale} from "./i18n.mjs";

const RELATIONS_URL="./data/v24/relations.json";
const LOCALE_URL=locale=>`./data/v24/locales/${locale}.json`;
const labels={
  zh:{title:"发展路线",formation:"静态脚本支持的形成路线",condition:"资格条件",inheritance:"任务继承",entries:"资格链未完整核实；以下仅为非穷尽入口示例",viewing:"当前查看"},
  en:{title:"Development routes",formation:"Script-supported formation routes",condition:"Eligibility conditions",inheritance:"Mission inheritance",entries:"Eligibility chains are not fully verified; examples are non-exhaustive",viewing:"Viewing"}
};

function localeKey(locale){return locale==="en"?"en":"zh";}
function fail(message){throw new Error(`Invalid v2.4 route data: ${message}`);}
function object(value,label){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(`${label} must be an object`);
  return value;
}
function array(value,label){
  if(!Array.isArray(value))fail(`${label} must be an array`);
  return value;
}
function string(value,label){
  if(typeof value!=="string"||!value.trim())fail(`${label} must be a non-empty string`);
  return value;
}
function descriptor(texts,key,kind){
  const item=object(texts[key],`texts.${key}`);
  if(item.text_kind!==kind)fail(`texts.${key} must be ${kind}`);
  string(item.text,`texts.${key}.text`);
  return item;
}

function validateBundle(data,localeFile,locale){
  object(data,"relations");
  if(data.schema_version!=="anbennar-v24-relations-1")fail("unsupported schema_version");
  string(data.production_source_sha,"production_source_sha");
  object(data.source_snapshot,"source_snapshot");
  const nodes=array(data.nodes,"nodes");
  const mechanisms=array(data.mechanisms,"mechanisms");
  const relations=array(data.relations,"relations");
  const entries=array(data.entry_examples,"entry_examples");
  array(data.sources,"sources");
  const localeRoot=object(localeFile,"locale file");
  const expectedLocale=locale==="en"?"en":"zh-CN";
  if(localeRoot.locale!==expectedLocale)fail(`locale file.locale must be ${expectedLocale}`);
  const texts=object(localeRoot.texts,"texts");
  const byTag=new Map();
  for(const node of nodes){
    object(node,"node");
    const tag=string(node.represented_tag,"node.represented_tag");
    if(byTag.has(tag))fail(`duplicate node ${tag}`);
    string(node.encyclopedia_owner_tag,`node ${tag}.encyclopedia_owner_tag`);
    string(node.article_id,`node ${tag}.article_id`);
    array(node.evidence_refs,`node ${tag}.evidence_refs`);
    descriptor(texts,string(node.name_key,`node ${tag}.name_key`),"native_name");
    byTag.set(tag,node);
  }
  const byMechanism=new Map();
  for(const mechanism of mechanisms){
    object(mechanism,"mechanism");
    const id=string(mechanism.id,"mechanism.id");
    if(byMechanism.has(id))fail(`duplicate mechanism ${id}`);
    string(mechanism.kind,`mechanism ${id}.kind`);
    string(mechanism.native_id,`mechanism ${id}.native_id`);
    string(mechanism.target_tag,`mechanism ${id}.target_tag`);
    descriptor(texts,string(mechanism.condition_key,`mechanism ${id}.condition_key`),"editorial_summary");
    array(mechanism.evidence_refs,`mechanism ${id}.evidence_refs`);
    const paths=array(mechanism.execution_paths,`mechanism ${id}.execution_paths`);
    if(!paths.length)fail(`mechanism ${id}.execution_paths must not be empty`);
    for(const path of paths){
      object(path,`mechanism ${id}.execution_path`);
      string(path.command,`mechanism ${id}.execution_path.command`);
      string(path.target_tag,`mechanism ${id}.execution_path.target_tag`);
      array(path.context_path,`mechanism ${id}.execution_path.context_path`);
      string(path.evidence_ref,`mechanism ${id}.execution_path.evidence_ref`);
    }
    byMechanism.set(id,mechanism);
  }
  for(const relation of relations){
    object(relation,"relation");
    const id=string(relation.id,"relation.id");
    const from=string(relation.from_tag,`relation ${id}.from_tag`);
    const to=string(relation.to_tag,`relation ${id}.to_tag`);
    if(!byTag.has(from)||!byTag.has(to))fail(`relation ${id} references an unknown node`);
    const mechanism=byMechanism.get(string(relation.mechanism_ref,`relation ${id}.mechanism_ref`));
    if(!mechanism)fail(`relation ${id} references an unknown mechanism`);
    if(mechanism.target_tag!==to)fail(`relation ${id} target does not match mechanism`);
    const inheritance=object(relation.mission_inheritance,`relation ${id}.mission_inheritance`);
    string(inheritance.mode,`relation ${id}.mission_inheritance.mode`);
    descriptor(texts,string(inheritance.summary_key,`relation ${id}.mission_inheritance.summary_key`),"editorial_summary");
    array(inheritance.evidence_refs,`relation ${id}.mission_inheritance.evidence_refs`);
    object(relation.verification,`relation ${id}.verification`);
    array(relation.evidence_refs,`relation ${id}.evidence_refs`);
  }
  for(const entry of entries){
    object(entry,"entry_example");
    const id=string(entry.id,"entry_example.id");
    if(!byTag.has(string(entry.from_tag,`entry_example ${id}.from_tag`))||!byTag.has(string(entry.to_tag,`entry_example ${id}.to_tag`)))fail(`entry_example ${id} references an unknown node`);
    descriptor(texts,string(entry.summary_key,`entry_example ${id}.summary_key`),"editorial_summary");
    object(entry.verification,`entry_example ${id}.verification`);
    array(entry.evidence_refs,`entry_example ${id}.evidence_refs`);
  }
  for(const key of ["notice.static","notice.subject","notice.owner","notice.entries"])descriptor(texts,key,"ui_notice");
  return {data,texts,locale,nodes:byTag,mechanisms:byMechanism};
}

async function fetchJson(fetcher,url){
  const response=await fetcher(url);
  if(!response?.ok)throw new Error(`Unable to load ${url}: HTTP ${response?.status??"unknown"}`);
  return response.json();
}

export function createRouteReader(fetcher=globalThis.fetch){
  if(typeof fetcher!=="function")throw new TypeError("A fetch function is required for v2.4 routes");
  const cache=new Map();
  async function loadFresh(locale){
    const [data,localeFile]=await Promise.all([fetchJson(fetcher,RELATIONS_URL),fetchJson(fetcher,LOCALE_URL(locale))]);
    const validated=validateBundle(data,localeFile,locale);
    return {data:validated.data,texts:validated.texts,locale:validated.locale};
  }
  return {load(locale){
    const key=localeKey(locale);
    if(!cache.has(key)){
      const pending=loadFresh(key);
      cache.set(key,pending);
      pending.catch(()=>{if(cache.get(key)===pending)cache.delete(key);});
    }
    return cache.get(key);
  }};
}

function escape(value){
  return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
}
function text(bundle,key){return bundle.texts[key].text;}
function nodeMap(data){return new Map(data.nodes.map(node=>[node.represented_tag,node]));}
function exactIndexCountry(index,node){
  return Array.isArray(index?.countries)&&index.countries.some(country=>country?.tag===node.encyclopedia_owner_tag&&country?.article_id===node.article_id);
}
function visibleNodes(data,ownerTag,relations,entries){
  const nodes=nodeMap(data);
  const tags=new Set();
  for(const relation of relations){tags.add(relation.from_tag);tags.add(relation.to_tag);}
  for(const entry of entries){tags.add(entry.from_tag);tags.add(entry.to_tag);}
  return [...tags].map(tag=>nodes.get(tag)).filter(node=>node?.encyclopedia_owner_tag===ownerTag);
}
function renderNode(bundle,node,{index,baseUrl,focusTag}){
  const focused=node.represented_tag===focusTag;
  const classes=`development-route-node${focused?" is-focused":""}`;
  const attrs=`class="${classes}" data-country="${escape(node.encyclopedia_owner_tag)}" data-route-focus="${escape(node.represented_tag)}"${focused?' aria-current="true"':""}`;
  const label=`${escape(text(bundle,node.name_key))} <span class="development-route-tag">${escape(node.represented_tag)}</span>`;
  const ownerNotice=node.encyclopedia_owner_tag===node.represented_tag?"":` <span class="development-route-owner-notice">${escape(text(bundle,"notice.owner"))}</span>`;
  if(!exactIndexCountry(index,node))return `<span ${attrs}>${label}</span>${ownerNotice}`;
  const query=`?country=${encodeURIComponent(node.encyclopedia_owner_tag)}&focusTag=${encodeURIComponent(node.represented_tag)}`;
  const href=routeInLocale(query,baseUrl||"http://localhost/",bundle.locale);
  return `<a ${attrs} href="${escape(href)}">${label}</a>${ownerNotice}`;
}

export function renderDevelopmentRoutes(bundle,{ownerTag,focusTag="",index,baseUrl}={}){
  if(!bundle?.data||!bundle?.texts||!ownerTag)return "";
  const data=bundle.data;
  const nodes=nodeMap(data);
  const relatedRelations=data.relations.filter(relation=>[relation.from_tag,relation.to_tag].some(tag=>nodes.get(tag)?.encyclopedia_owner_tag===ownerTag));
  const relatedEntries=data.entry_examples.filter(entry=>[entry.from_tag,entry.to_tag].some(tag=>nodes.get(tag)?.encyclopedia_owner_tag===ownerTag));
  if(!relatedRelations.length&&!relatedEntries.length)return "";
  const acceptedFocus=visibleNodes(data,ownerTag,relatedRelations,relatedEntries).some(node=>node.represented_tag===focusTag)?focusTag:"";
  const copy=labels[localeKey(bundle.locale)];
  const focusNode=acceptedFocus?nodes.get(acceptedFocus):null;
  const notices=`<p class="development-route-notice">${escape(text(bundle,"notice.static"))}</p><p class="development-route-notice">${escape(text(bundle,"notice.subject"))}</p>`;
  const focus=focusNode?`<p class="development-route-focus">${escape(copy.viewing)}: ${escape(text(bundle,focusNode.name_key))} <span class="development-route-tag">${escape(focusNode.represented_tag)}</span></p>`:"";
  const cards=relatedRelations.map(relation=>{
    const mechanism=data.mechanisms.find(item=>item.id===relation.mechanism_ref);
    return `<article class="development-route-card" data-relation-id="${escape(relation.id)}"><h3>${escape(copy.formation)}</h3><div class="development-route-nodes">${renderNode(bundle,nodes.get(relation.from_tag),{index,baseUrl,focusTag:acceptedFocus})} <span class="development-route-arrow" aria-hidden="true">→</span> ${renderNode(bundle,nodes.get(relation.to_tag),{index,baseUrl,focusTag:acceptedFocus})}</div><h4>${escape(copy.condition)}</h4><p>${escape(text(bundle,mechanism.condition_key))}</p><h4>${escape(copy.inheritance)}</h4><p>${escape(text(bundle,relation.mission_inheritance.summary_key))}</p></article>`;
  }).join("");
  const entries=relatedEntries.length?`<section class="development-route-entry-examples"><h3>${escape(copy.entries)}</h3><p class="development-route-entry-notice">${escape(text(bundle,"notice.entries"))}</p><ul class="development-route-entries">${relatedEntries.map(entry=>`<li data-entry-id="${escape(entry.id)}">${renderNode(bundle,nodes.get(entry.from_tag),{index,baseUrl,focusTag:acceptedFocus})}<p>${escape(text(bundle,entry.summary_key))}</p></li>`).join("")}</ul></section>`:"";
  return `<section id="developmentRoutes" class="panel development-routes"><h2>${escape(copy.title)}</h2>${focus}${notices}${cards}${entries}</section>`;
}

export function routePlaceholder(locale,loading=false){
  const en=localeKey(locale)==="en";
  const state=loading?"loading":"unavailable";
  const message=loading?(en?"Loading development routes…":"正在加载发展路线…"):(en?"Development routes are temporarily unavailable.":"发展路线暂时无法载入。");
  return `<section id="developmentRoutes" class="panel development-routes" data-route-state="${state}"><p class="route-status" role="status">${message}</p></section>`;
}
