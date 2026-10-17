import {english,t,regionName} from "./i18n.mjs";
import {VALUE_EN,VALUE_CHOICES_EN} from "./question-translations.mjs";
import {VALUE_AXES,VALUE_QUESTIONS,VALUE_CHOICES,valueAnswered,calculateValues,
  DEFAULT_PREFERENCES,validatePreferences} from "./playstyle.mjs";

const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY="anbennar-v22-story-preferences-v1";
const version="story-preferences-v1";

export function createPreferenceUI(index,{onApply,onChangeRegion,onInvalidate=()=>{}}){
  let stored;
  try{stored=JSON.parse(sessionStorage.getItem(KEY)||"null");}catch{stored=null;}
  const answers={};
  if(stored?.version===version&&typeof stored.answers==="object"){
    for(const q of VALUE_QUESTIONS){
      const n=stored.answers[q.id];
      if(Number.isInteger(n)&&n>=0&&n<=4)answers[q.id]=n;
    }
  }
  let prefs={...DEFAULT_PREFERENCES};
  try{if(stored?.version===version)prefs=validatePreferences(stored.preferences);}catch{}
  if(!index.regions.some(r=>r.key===prefs.region))prefs.region="";
  const selected=stored?.version===version&&stored.valuesEnabled===false?false:true;
  $("useValues").checked=selected;
  for(const id of ["colonization","difficulty","early_pressure","dark_story"]){
    $("pref-"+id).value=prefs[id];
  }
  $("finalRegion").innerHTML='<option value="">'+esc(t("filters.all","全部地区（109国）"))+'</option>'+
    index.regions.map(r=>'<option value="'+esc(r.key)+'">'+esc(regionName(r))+
      "（"+r.count+(english()?" countries":"国")+"）</option>").join("");
  $("finalRegion").value=prefs.region;
  function persist(applied=false){
    try{sessionStorage.setItem(KEY,JSON.stringify({version,answers,preferences:prefs,
      valuesEnabled:$("useValues").checked,applied}));}catch{}
  }
  let applied=null;
  function invalidate(){
    applied=null;
    onInvalidate();
    $("preferenceStatus").textContent=t("value.stale","设置已改变，请点击“应用完整偏好并重新匹配”更新结果。");
    $("preferenceStatus").classList.remove("error");
    persist(false);
  }
  function updateProgress(){
    const count=valueAnswered(answers);
    $("valueAnswered").textContent=t("value.progress","价值剧情选择")+"："+count+" / 8";
    $("valueQuestionList").classList.toggle("values-disabled",!$("useValues").checked);
    $("valueQuestionList").querySelectorAll("input").forEach(input=>{
      input.disabled=!$("useValues").checked;
    });
  }
  $("valueQuestionList").innerHTML=VALUE_QUESTIONS.map((q,i)=>{
    const values=english()?VALUE_EN[q.id]:null;
    const prompt=values?.[0]||q.question,left=values?.[1]||q.left,right=values?.[2]||q.right;
    return '<fieldset class="value-question"><legend><span class="small-cap">'+
    t("value.question","价值剧情")+" "+(i+1)+" / 8"+'</span> · '+esc(prompt)+'</legend>'+
    '<div class="value-question-poles"><p><b>A · </b>'+esc(left)+
    '</p><p><b>B · </b>'+esc(right)+'</p></div>'+
    '<div class="value-answer-options">'+VALUE_CHOICES.map((label,n)=>
      '<label><input type="radio" name="'+q.id+'" value="'+n+'"'+
      (answers[q.id]===n?" checked":"")+'> '+esc(english()?VALUE_CHOICES_EN[n]:label)+'</label>').join("")+
    "</div></fieldset>";}).join("");
  $("valueQuestionList").addEventListener("change",event=>{
    const input=event.target;
    if(!input?.name||!VALUE_QUESTIONS.some(q=>q.id===input.name))return;
    answers[input.name]=Number(input.value);
    updateProgress();invalidate();
  });
  $("useValues").addEventListener("change",()=>{updateProgress();invalidate();});
  for(const key of ["colonization","difficulty","early_pressure","dark_story"]){
    $("pref-"+key).addEventListener("change",event=>{
      prefs[key]=event.target.value;invalidate();
    });
  }
  $("finalRegion").addEventListener("change",event=>{
    prefs.region=event.target.value;
    onChangeRegion(prefs.region);
    invalidate();
  });
  $("applyPreferences").addEventListener("click",()=>{
    try{
      const values=$("useValues").checked?calculateValues(answers):null;
      prefs=validatePreferences(prefs);
      if($("useValues").checked&&valueAnswered(answers)!==8)
        throw new Error(t("value.incomplete","还需要回答全部8道价值剧情问题；如只想匹配五维人格，可取消勾选“启用价值剧情匹配”。"));
      persist(true);
      $("preferenceStatus").classList.remove("error");
      $("preferenceStatus").textContent=english()?t("value.applied") :
        "设置已应用：价值剧情"+(values?"启用":"关闭")+"；殖民"+
        $("pref-colonization").selectedOptions[0].textContent+
        "；难度"+$("pref-difficulty").selectedOptions[0].textContent+
        "；前期压力"+$("pref-early_pressure").selectedOptions[0].textContent+"。";
      onApply({...prefs},values);
    }catch(error){
      $("preferenceStatus").classList.add("error");
      $("preferenceStatus").textContent=error.message;
    }
  });
  $("clearValueAnswers").addEventListener("click",()=>{
    for(const key of Object.keys(answers))delete answers[key];
    $("valueQuestionList").querySelectorAll("input[type=radio]").forEach(x=>x.checked=false);
    updateProgress();invalidate();
  });
  updateProgress();
  if(stored?.applied===true){
    try {
      applied={prefs:validatePreferences(prefs),
        values:$("useValues").checked?calculateValues(answers):null};
    }catch{/* incomplete stored answers -> no implicit values */}
  }
  return {
    get applied(){return applied},
    setApplied(payload){applied=payload},
    markStale(){applied=null;invalidate()},
    setRegion(region){
      prefs.region=region;
      $("finalRegion").value=region;
      persist(!!applied);
    },
    getPreferences(){return {...prefs}},
    getValuesAnswered(){return valueAnswered(answers)},
  };
}
