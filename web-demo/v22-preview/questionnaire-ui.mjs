// P2 UI converts completed scenarios into a P1-compatible five-axis vector.
import {AXES} from "./scoring.mjs";
import {QUESTIONNAIRE_VERSION,QUESTIONS,CHOICES,answeredCount,
  calculateVector,axisConsistency,hydrateAnswers} from "./questionnaire-v22.mjs";

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STORAGE_KEY="anbennar-v22-p2-questionnaire-1";

export function createQuestionnaireUI({onComplete}){
  let saved;
  try{saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");}catch{saved=null;}
  let answers=hydrateAnswers(saved);
  let current=Number.isInteger(saved?.current)&&saved.current>=0&&saved.current<QUESTIONS.length?
    saved.current:0;
  function persist(){
    try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify({
      version:QUESTIONNAIRE_VERSION,answers,current,
    }));}catch{/* session storage optional */}
  }
  function progress(){
    const done=answeredCount(answers);
    $("questionPosition").textContent="第 "+(current+1)+" / "+QUESTIONS.length+" 题";
    $("questionAnswered").textContent="已作答 "+done+" / "+QUESTIONS.length;
    $("questionProgressFill").style.width=(100*done/QUESTIONS.length)+"%";
    $("questionProgressFill").parentElement.setAttribute("aria-valuenow",String(done));
    $("questionCalculate").disabled=done!==QUESTIONS.length;
    $("questionPrev").disabled=current===0;
    $("questionNext").disabled=current===QUESTIONS.length-1;
    $("questionFirstUnanswered").disabled=done===QUESTIONS.length;
  }
  function render(){
    const q=QUESTIONS[current],old=answers[q.id];
    $("questionBody").innerHTML=
      '<legend class="sr-only">第 '+(current+1)+' 题</legend>'+
      '<p class="question-context"><span class="small-cap">QUESTION '+String(current+1).padStart(2,"0")+
      ' / 25</span> <span class="muted">假设你负责制定国家的长期方针</span></p>'+
      '<h3 id="questionPrompt">'+esc(q.prompt)+'</h3>'+
      '<div class="question-poles"><section><small>方案 A</small><p>'+esc(q.left)+
      '</p></section><section><small>方案 B</small><p>'+esc(q.right)+
      '</p></section></div><div class="response-options" role="radiogroup" aria-labelledby="questionPrompt">'+
      CHOICES.map((label,value)=>'<label class="response-option'+
        (old===value?" chosen":"")+'"><input type="radio" name="questionResponse" value="'+
        value+'"'+(old===value?" checked":"")+'><span>'+esc(label)+"</span></label>").join("")+
      "</div>";
    $("questionBody").querySelectorAll("input[name=questionResponse]").forEach(input=>{
      input.addEventListener("change",()=>{
        answers[q.id]=Number(input.value);
        persist();
        $("questionValidation").textContent="";
        $("questionSummary").classList.add("hidden");
        $("questionBody").querySelectorAll(".response-option").forEach(label=>
          label.classList.toggle("chosen",label.querySelector("input")?.checked===true));
        progress();
      });
    });
    progress();
  }
  function go(i){
    if(i<0||i>=QUESTIONS.length)return;
    current=i;
    persist();render();
    $("questionBody").scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  function calculate(){
    try{
      if(answeredCount(answers)!==QUESTIONS.length){
        throw new Error("请先回答全部25题；未回答的题目不会默认为中间值。");
      }
      const vector=calculateVector(answers);
      const consistency=axisConsistency(answers);
      const variation=AXES.filter(([key])=>consistency[key].needsReview)
        .map(([,label])=>label);
      $("questionSummary").innerHTML='<h3>五维情境偏好结果</h3>'+
        '<div class="question-vector">'+AXES.map(([key,label])=>
          '<div><span>'+esc(label)+'</span><strong>'+vector[key]+'</strong></div>').join("")+
        '</div><p class="fine">每轴5题，各题等权平均并四舍五入为0–100。'+
        '数值表达题目所覆盖情境中的偏好，不是科学测量的置信区间，也不是国家评分。</p>'+
        (variation.length?
          '<p class="question-caution">这些维度在不同情境中的答案差别较大：'+
          esc(variation.join("、"))+'。可以检查原题；这不代表回答错误。</p>':"")+
        '<p class="fine">已将五轴向量应用于当前的匹配地区；下方结果仍采用P1等权距离与原发展线去重。</p>';
      $("questionSummary").classList.remove("hidden");
      $("questionValidation").textContent="问卷已完成，正在使用 P0 已验收的国家画像计算匹配。";
      onComplete(vector,{
        version:QUESTIONNAIRE_VERSION,answers:{...answers},
        variation,
      });
    }catch(error){
      $("questionValidation").textContent=error.message;
    }
  }
  $("questionPrev").addEventListener("click",()=>go(current-1));
  $("questionNext").addEventListener("click",()=>go(current+1));
  $("questionFirstUnanswered").addEventListener("click",()=>{
    const first=QUESTIONS.findIndex(q=>!Object.hasOwn(answers,q.id));
    if(first>=0)go(first);
  });
  $("questionCalculate").addEventListener("click",calculate);
  $("questionClear").addEventListener("click",()=>{
    answers={};current=0;persist();
    $("questionValidation").textContent="答卷已清空，请重新作答。";
    $("questionSummary").classList.add("hidden");
    render();
  });
  render();
  return {
    getVector(){
      return answeredCount(answers)===QUESTIONS.length?calculateVector(answers):null;
    },
    getAnswers(){return {...answers}},
    go,
  };
}
