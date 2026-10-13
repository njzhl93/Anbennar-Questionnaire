// P2 editorial questionnaire v1.0. NO modification to approved country scores.
// Five independent v2.2 personality axes: not v2.1 gameplay, values or moral ranking.
// Labels A/B are purposely alternated to reduce same-side response artifacts.
// These items are content candidates for human calibration, not psychometrically validated.
import {AXIS_KEYS, validateVector} from "./scoring.mjs";
export const QUESTIONNAIRE_VERSION = "v22-questionnaire-p2.1";
const raw = [
  // Round 1 (each axis exactly once)
  ["A01","ambition_scope",false,"边疆暂时安全，国家获得一笔可长期支配的资源。你希望怎样确立十年的发展目标？",
    "先把现有地区经营成稳定繁荣的共同体","建立能够影响周边更多国家的长期政治版图"],
  ["P01","power_concentration",true,"多个领地对同一项紧急法令执行不一致。你倾向用哪种制度处理？",
    "让中央机构拥有最终统一裁定权","保留各领地议事和协调裁定的权力"],
  ["M01","magic_artifice_balance",false,"两种灌溉体系费用和可靠性相当，国家只能优先推广一类。你更倾向？",
    "依靠机械工程、工坊和可复制的装置","依靠法术、符文与施法者维护的系统"],
  ["I01","integration_pluralism",true,"新加入的族群愿意接受共同的国家规则，但希望保存其地方制度。你会？",
    "让其代表进入共同制度，同时保留明确的地方自治范围","逐步以统一的行政制度取代各群体的地方安排"],
  ["R01","restoration_transformation",false,"长期战乱使旧王国的政治秩序瓦解。你认为重建政权时最重要的是？",
    "恢复仍有合法性基础的旧制度与契约","趁重建机会建立一套不同于旧王国的新制度"],
  // Round 2
  ["A02","ambition_scope",true,"国内建设已达预期，一项新的国家工程可以决定下一代的政治重心。",
    "把影响力拓展到远方地区，形成跨区域使命","集中投入本土城市、交通与有限边疆的稳定"],
  ["P02","power_concentration",false,"一项影响多个省份的税制改革争论激烈。你更支持？",
    "由地方会议协商份额，中央主要做协调者","由中央制定统一方案并负责最终执行"],
  ["M02","magic_artifice_balance",true,"要训练下一代技术与知识官员，国家准备新建学院，你更想偏重？",
    "法术研究、奥术理论与法师培养","材料工程、奇械设计与工匠培养"],
  ["I02","integration_pluralism",false,"不同族群已有各自的公务语言。改革行政体系时，你倾向？",
    "推动国家级行政语言和一致的任职标准","建立能够长期容纳多语言的行政与代表制度"],
  ["R02","restoration_transformation",true,"一支流亡的王朝重新取得故土，你更希望其在执政后？",
    "创造新的权力分配机制，而不复刻先王制度","重新接续被中断的王朝法理、旧议会和典章"],
  // Round 3
  ["A03","ambition_scope",false,"盟友提出由你领导一个规模更大的地区联盟。你判断联盟的目的首先应该是？",
    "维护本国及直接邻邦的安全和可持续发展","形成跨地区秩序，让更多国家围绕共同愿景行动"],
  ["P03","power_concentration",true,"军官选任出现地方和中央的不同意见。你更信赖哪种长期制度？",
    "由直属中央的统一任命与监察体系决定","由地方团体与中央共同任命、相互制衡"],
  ["M03","magic_artifice_balance",false,"边境两套防御方案在效率上相当。你想把资源投入到？",
    "机械堡垒、工程装置和奇械装备","结界、附魔防线与法术防护"],
  ["I03","integration_pluralism",true,"多个群体加入国家后需要参与政策制定。你会优先建立？",
    "允许不同群体稳定表达利益的制度性代表渠道","各群体不另设代表席位、统一按共同的官僚体系管理"],
  ["R03","restoration_transformation",false,"古代联盟的制度曾经衰退，但仍是国家身份的重要来源。你会？",
    "修复并沿用古老联盟的核心政治形式","借由联盟的遗产建立理念不同的新国家架构"],
  // Round 4
  ["A04","ambition_scope",true,"新的航路让遥远世界变得可达，国家必须决定长远方向。",
    "将远方事务纳入更广阔的国家或文明计划","把新航路主要用于支持既有疆域和邻近地区的建设"],
  ["P04","power_concentration",false,"战后需要重新规定统治者与地方机构的权限。你更想？",
    "设置常设议事制衡，让不同政治中心分担决定权","把重大事务集中到统一的最高国家机关"],
  ["M04","magic_artifice_balance",true,"国家只能将一项运输革新确立为今后的标准基础设施。你选？",
    "法阵与魔法通道网络","工程铁路、机械运输和奇械装置"],
  ["I04","integration_pluralism",false,"数个地方共同体有不同的习惯法。成为一国后，你更看重？",
    "推行一致的国家法律和行政标准","在共同国法下明确承认多种地方制度的长期地位"],
  ["R04","restoration_transformation",true,"一次危机表明旧国体并非完全失效，但也暴露了许多难题。你愿意？",
    "用危机推动制度再造，改变国家运作的基本方式","优先重振旧制度的核心原则，再作有限修补"],
  // Round 5
  ["A05","ambition_scope",false,"假设国家已拥有充足军力，你最期待留给继任者什么成果？",
    "安全、富足且治理良好的有限疆域","跨越多地的共同秩序或规模更大的文明事业"],
  ["P05","power_concentration",true,"某个大省拒绝执行全国政策，需要一套能长期运行的处理原则。你倾向？",
    "增强中央监督与强制执行能力","建立双方谈判和分权裁决的稳定机制"],
  ["M05","magic_artifice_balance",false,"一座新兴城市需要决定工商业长期依赖的技术体系。你会偏向？",
    "可制造与维护的机械、工具及奇械体系","施法产业、魔法资源和奥术服务体系"],
  ["I05","integration_pluralism",true,"不同族群已经同意加入共同防务。你希望此后他们怎样融入政治？",
    "在一个共同国家中维持有正式保障的多元制度","尽可能采用单一制度与共同的政治身份"],
  ["R05","restoration_transformation",false,"一场复兴运动让古老文化重新团结。成功后，你更期待？",
    "重建祖先理想中已有的政治与社会秩序","以传统为出发点，创造前所未有的国家形式"],
];

export const QUESTIONS = Object.freeze(raw.map(([id,axis,leftHigh,prompt,left,right]) =>
  Object.freeze({id,axis,leftHigh,prompt,left,right})));
export const CHOICES = Object.freeze([
  "非常倾向方案 A","比较倾向方案 A","两者皆可／依情境决定",
  "比较倾向方案 B","非常倾向方案 B",
]);

export function validateQuestionBank(questions=QUESTIONS){
  if(!Array.isArray(questions)||questions.length!==25)throw new Error("题库必须有25道题");
  const ids=new Set(),counts=Object.fromEntries(AXIS_KEYS.map(k=>[k,0]));
  const reverse=Object.fromEntries(AXIS_KEYS.map(k=>[k,0]));
  for(const q of questions){
    if(ids.has(q.id)||!q.id||!Object.hasOwn(counts,q.axis)||
       typeof q.leftHigh!=="boolean"||
       !q.prompt?.trim()||!q.left?.trim()||!q.right?.trim()||q.left===q.right){
      throw new Error("题目结构或轴定义错误："+q.id);
    }
    ids.add(q.id);counts[q.axis]++;if(q.leftHigh)reverse[q.axis]++;
  }
  for(const key of AXIS_KEYS){
    if(counts[key]!==5||reverse[key]<2||reverse[key]>3)
      throw new Error("每轴5题且2–3题反向题："+key);
  }
  return true;
}
validateQuestionBank();

export function scoreAnswer(question,choice){
  if(!Number.isInteger(choice)||choice<0||choice>4)
    throw new RangeError("问卷答案必须是 0–4 整数");
  return question.leftHigh ? 100-choice*25 : choice*25;
}
export function answeredCount(answers,questions=QUESTIONS){
  if(!answers||typeof answers!=="object")return 0;
  return questions.reduce((n,q)=>n+(Number.isInteger(answers[q.id])&&answers[q.id]>=0&&answers[q.id]<=4?1:0),0);
}
export function calculateVector(answers,questions=QUESTIONS){
  if(!answers||typeof answers!=="object")throw new TypeError("未提供问卷答案");
  const vectors=Object.fromEntries(AXIS_KEYS.map(key=>[key,[]]));
  for(const q of questions){
    if(!Object.hasOwn(answers,q.id))throw new Error("尚未作答："+q.id);
    vectors[q.axis].push(scoreAnswer(q,answers[q.id]));
  }
  const vector=Object.fromEntries(AXIS_KEYS.map(key=>{
    const values=vectors[key];
    if(values.length!==5)throw new Error("该人格轴题目数量不正确："+key);
    return [key,Math.round(values.reduce((a,b)=>a+b,0)/5)];
  }));
  return validateVector(vector);
}
export function axisConsistency(answers,questions=QUESTIONS){
  const byAxis=Object.fromEntries(AXIS_KEYS.map(key=>[key,[]]));
  for(const q of questions){
    if(Number.isInteger(answers?.[q.id])&&answers[q.id]>=0&&answers[q.id]<=4)
      byAxis[q.axis].push(scoreAnswer(q,answers[q.id]));
  }
  return Object.fromEntries(AXIS_KEYS.map(key=>{
    const values=byAxis[key],spread=values.length?Math.max(...values)-Math.min(...values):null;
    return [key,{answered:values.length,spread,needsReview:values.length===5&&spread>=75}];
  }));
}
export function hydrateAnswers(saved,version=QUESTIONNAIRE_VERSION){
  if(!saved||saved.version!==version||!saved.answers||typeof saved.answers!=="object")
    return {};
  return Object.fromEntries(QUESTIONS.filter(q=>
    Number.isInteger(saved.answers[q.id])&&saved.answers[q.id]>=0&&saved.answers[q.id]<=4
  ).map(q=>[q.id,saved.answers[q.id]]));
}
