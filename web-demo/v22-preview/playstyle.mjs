// v2.1 editorial VALUES and GAMEPLAY are separate from approved v2.2 personality.
// Questions ask what type of fictional campaign is interesting, NEVER infer real-world morals.
import {rank, evaluate, compareResults, validateVector} from "./scoring.mjs";

export const VALUE_AXES = Object.freeze([
  ["dignity","尊严","强等级／工具化角色","尊严保障角色"],
  ["personhood","人格承认","限定主体资格","广泛承认主体资格"],
  ["public_good","公共利益","少数阶层／国家目的优先","公共福祉优先"],
  ["restraint","克制","不惜代价的强制手段","限制强制手段"],
]);
export const VALUE_QUESTIONS = Object.freeze([
  {id:"VD1",axis:"dignity",leftHigh:false,
   question:"就虚构国家故事而言，哪一类统治模式更吸引你？",
   left:"高度等级化的秩序：统治阶层将多数人视为国家目标的工具",
   right:"国家制度尝试保护普通人的尊严，即便牺牲部分效率"},
  {id:"VP1",axis:"personhood",leftHigh:true,
   question:"某些智慧种族或被征服人群的政治资格成为核心剧情，你更想扮演？",
   left:"逐步承认他们能独立决定命运和参与共同政治的国家",
   right:"严格限定其法律资格，围绕支配与从属构建国家机器"},
  {id:"VG1",axis:"public_good",leftHigh:false,
   question:"战役故事围绕巨大的国家资源分配展开，你更想体验？",
   left:"国家集中资源追求少数统治者或精英集团的宏大目标",
   right:"国家将增长与公共服务分配给广泛的居民群体"},
  {id:"VR1",axis:"restraint",leftHigh:true,
   question:"处理敌人与反对者是任务树的长期议题，你更愿意玩哪种路线？",
   left:"为权力设定边界，尽可能限制战争与强制的代价",
   right:"不惜采取极端手段，以压倒性强制实现国家意志"},
  {id:"VD2",axis:"dignity",leftHigh:true,
   question:"一个强大国家在长期建设中形成独特社会秩序，你想读到哪种叙事？",
   left:"即使权力集中，也保留对底层成员基本地位和待遇的保障",
   right:"严格的身份层级和服从关系成为国家的核心文化"},
  {id:"VP2",axis:"personhood",leftHigh:false,
   question:"在魔法研究和智慧生命的关系上，你更愿意体验？",
   left:"将智慧生命视为可被支配的实验或征服资源",
   right:"即使付出研究成本，也以独立主体的身份对待他们"},
  {id:"VG2",axis:"public_good",leftHigh:true,
   question:"假设两条任务路线一样完整且有挑战，哪种国家结局更吸引你？",
   left:"大型建设最终惠及更广泛的国民生活",
   right:"国家因完成统治集团的伟业而强大，即便多数居民收益有限"},
  {id:"VR2",axis:"restraint",leftHigh:false,
   question:"面对漫长的战争和统治危机，你希望这个国家的决议路线更倾向？",
   left:"允许献祭、强制劳役或毁灭性措施成为常见政治工具",
   right:"即使在危机中，也为非战斗者和被统治者设置明确的约束"},
]);
export const COLONIZATION = Object.freeze({
  any:{label:"不限",min:null,max:null,target:null},
  heavy:{label:"希望有重度殖民玩法",min:70,max:null,target:90},
  avoid:{label:"不希望有重度殖民玩法",min:null,max:69,target:25},
});
export const PREFERENCE_TARGETS = Object.freeze({
  difficulty: {any:null,relaxed:25,moderate:55,hard:90},
  early_pressure:{any:null,low:20,moderate:55,high:90},
  dark_story: {any:null,light:15,mixed:55,dark:95},
});
export const DEFAULT_PREFERENCES = Object.freeze({
  region:"",colonization:"any",difficulty:"any",early_pressure:"any",dark_story:"any",
});
const VALUE_KEYS=VALUE_AXES.map(x=>x[0]);
export const VALUE_CHOICES=Object.freeze([
  "非常倾向前者","比较倾向前者","两者皆有吸引力","比较倾向后者","非常倾向后者",
]);
export function validateValueQuestions(){
  if(VALUE_QUESTIONS.length!==8||new Set(VALUE_QUESTIONS.map(x=>x.id)).size!==8)
    throw new Error("expected eight unique value preference questions");
  for(const [key] of VALUE_AXES){
    const group=VALUE_QUESTIONS.filter(x=>x.axis===key);
    if(group.length!==2||group.filter(x=>x.leftHigh).length!==1)
      throw new Error("Value axis requires one forward and one reversed question: "+key);
  }
  return true;
}
validateValueQuestions();
export function valueAnswered(answers){
  return VALUE_QUESTIONS.filter(q=>Number.isInteger(answers?.[q.id])&&answers[q.id]>=0&&answers[q.id]<=4).length;
}
export function calculateValues(answers){
  if(valueAnswered(answers)!==8) throw new Error("需要回答全部8道剧情价值取向题才能应用价值匹配");
  return Object.fromEntries(VALUE_AXES.map(([key])=>{
    const two=VALUE_QUESTIONS.filter(q=>q.axis===key).map(q=>
      q.leftHigh?100-25*answers[q.id]:25*answers[q.id]);
    return [key,Math.round((two[0]+two[1])/2)];
  }));
}
export function validatePreferences(prefs){
  const p={...DEFAULT_PREFERENCES,...(prefs||{})};
  if(!Object.hasOwn(COLONIZATION,p.colonization)||
     !Object.hasOwn(PREFERENCE_TARGETS.difficulty,p.difficulty)||
     !Object.hasOwn(PREFERENCE_TARGETS.early_pressure,p.early_pressure)||
     !Object.hasOwn(PREFERENCE_TARGETS.dark_story,p.dark_story)||
     typeof p.region!=="string")throw new Error("invalid gameplay preferences");
  return p;
}
export function validatePlaystyleData(data){
  if(data?.schema_version!=="playstyle-preferences-1.0" ||
     data.source?.values_model!=="2.1"||data.countries?.length!==109)
    throw new Error("missing 109 v2.1 value/gameplay source records");
  const tags=new Set();
  for(const row of data.countries){
    if(tags.has(row.tag))throw new Error("duplicate playstyle tag: "+row.tag);
    tags.add(row.tag);
    for(const key of VALUE_KEYS){
      const x=row.values?.[key];
      if(!Number.isInteger(x)||x<0||x>100)throw new Error("invalid value: "+row.tag+" "+key);
    }
    for(const key of ["colonization","difficulty","early_pressure","dark_story"]){
      const x=row.gameplay?.[key];
      if(!Number.isInteger(x)||x<0||x>100)throw new Error("invalid gameplay: "+row.tag+" "+key);
    }
  }
  return true;
}
const rms=distances=>Math.sqrt(distances.reduce((a,b)=>a+b*b,0)/distances.length);
export function rankWithPreferences(user,entries,playstyle,prefs={},values=null,count=5){
  validateVector(user);
  if(!Array.isArray(entries)||!Number.isInteger(count)||count<1)
    throw new Error("invalid rank parameters");
  const config=validatePreferences(prefs);
  if(playstyle)validatePlaystyleData(playstyle);
  if(values){
    if(!playstyle)throw new Error("value ranking requires real source data");
    if(Object.keys(values).length!==4||VALUE_KEYS.some(k=>!Number.isInteger(values[k])||
       values[k]<0||values[k]>100))throw new Error("invalid four-axis values input");
  }
  const gameAxes=Object.entries(PREFERENCE_TARGETS).filter(([key,opts])=>
    opts[config[key]]!==null).map(([key,opts])=>[key,opts[config[key]]]);
  if(config.colonization!=="any")gameAxes.push(["colonization",COLONIZATION[config.colonization].target]);
  if(config.colonization==="any" && !values && gameAxes.length===0){
    return {...rank(user,entries,count),scoringMode:"five_axis_only"};
  }
  const weights={personality:0.55,values:values?0.30:0,gameplay:gameAxes.length?0.15:0};
  const sum=Object.values(weights).reduce((a,b)=>a+b,0);
  let pool=entries;
  if(config.colonization!=="any"){
    if(!playstyle)throw new Error("colonization filter requires real source data");
    const rule=COLONIZATION[config.colonization];
    const allow=new Set(playstyle.countries.filter(c=>(rule.min===null||c.gameplay.colonization>=rule.min)&&
      (rule.max===null||c.gameplay.colonization<=rule.max)).map(c=>c.tag));
    pool=entries.filter(x=>allow.has(x.owner_tag));
  }
  const facts=new Map((playstyle?.countries||[]).map(x=>[x.tag,x]));
  const all=pool.map(entry=>{
    const original=evaluate(user,entry);
    const fact=facts.get(entry.owner_tag);
    if((values||gameAxes.length)&&!fact)throw new Error("no indexed gameplay for "+entry.owner_tag);
    const valueScore=values?100-rms(VALUE_KEYS.map(key=>values[key]-fact.values[key])):null;
    const gameplayScore=gameAxes.length?100-rms(gameAxes.map(([key,v])=>v-fact.gameplay[key])):null;
    const score=(0.55*original.score+
      (valueScore===null?0:valueScore*weights.values)+
      (gameplayScore===null?0:gameplayScore*weights.gameplay))/sum;
    return {...original,score:Math.round(score*10)/10,overallScore:score,
      personalityScore:original.score,valueScore: valueScore===null?null:Math.round(valueScore*10)/10,
      gameplayScore:gameplayScore===null?null:Math.round(gameplayScore*10)/10,
      historicalValues:fact?.values||null, historicalGameplay:fact?.gameplay||null,
      activeWeight:{personality:weights.personality/sum,values:weights.values/sum,gameplay:weights.gameplay/sum},
    };
  }).sort((a,b)=>b.overallScore-a.overallScore||compareResults(a,b));
  const byOwner=new Map();
  for(const e of all)if(!byOwner.has(e.entry.owner_tag))byOwner.set(e.entry.owner_tag,e);
  const top=[...byOwner.values()].sort((a,b)=>b.overallScore-a.overallScore||
    compareResults(a,b)).slice(0,count);
  return {top,all,groupCount:byOwner.size,candidateCount:pool.length,
    hasValues:values!==null,hasGameplay:gameAxes.length>0,weights,scoringMode:
    values||gameAxes.length?"combined":"five_axis_only"};
}
