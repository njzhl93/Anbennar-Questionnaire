// v2.3.4 bilingual foundation. Locale is presentation only: never modify data, scores, tags.
export const SUPPORTED_LANGUAGES=Object.freeze(["zh","en"]);
export function normalizedLanguage(value) {
  return value === "en" || value === "en-US" ? "en" : "zh";
}
function readPreference(){
  try{return localStorage.getItem("anbennar-locale")||"";}catch{return "";}
}
const requested=typeof location!=="undefined" ?
  new URLSearchParams(location.search).get("lang") : null;
let current=normalizedLanguage(requested||readPreference());
export function language(){return current;}
export function english(){return current==="en";}
export function countryName(c){return english()?(c?.name_en||c?.name_zh||c?.tag||"") :
  (c?.name_zh||c?.name_en||c?.tag||"");}
export const ENGLISH_REGIONS=Object.freeze({
  "":"All regions", "__unverified":"Unverified region", Bulwar:"Bulwar", EoA:"Empire of Anbennar",
  Escann:"Escann", "Forbidden Plains":"Forbidden Plains", Haless:"Haless",
  "North Aelantir":"North Aelantir", Rahen:"Rahen", Sarhal:"Sarhal",
  Serpentspine:"Serpentspine", "South Aelantir":"South Aelantir", "Wescann / Gerudia":"Wescann / Gerudia"
});
export function regionName(r){return english()?((r?.name_en==="EoA"?ENGLISH_REGIONS.EoA:r?.name_en)||ENGLISH_REGIONS[r?.key]||r?.key||r?.name_zh||"") :
  (r?.name_zh||r?.name_en||"");}

const en={
  "site.title":"Which Anbennar nation suits you best?",
  "site.release":"v2.3.5 release",
  "site.legacy":"Legacy v0.3 (Chinese) ↗",
  "site.noSave":"Not connected to a game save; this does not establish that route conditions have been met.",
  "nav.label":"Site navigation",
  "encyclopedia.label":"Country encyclopedia",
  "compare.label":"Side-by-side country comparison",
  "compare.selected":"Selected countries",
  "quiz.progressLabel":"Answered questions",
  "quiz.current":"Current scenario",
  "quiz.fullNote":"This is the interactive, reviewable P2 question bank. It has not been validated against a real player sample. It assesses national-governance preferences in hypothetical situations, not morality or a clinical personality type.",
  "quiz.storageNote":"Answers are stored only in this browser session for refresh recovery; they are not automatically sent or uploaded. Completed answers use the same P1 matching engine and region filter as the manual five-axis controls below.",
  "values.fullNote":"These separate v2.1 national-value records are used only for recommendation preferences. They do not change approved v2.2 personality or story-phase scores. Complete all eight questions to enable them, or disable this option for five-axis matching only.",
  "filters.desc":"Region and heavy colonization are explicit filters; difficulty, early pressure and dark narrative use preference distance rather than unverified hard exclusions.",
  "filters.note":"Regions follow the original owner_tag; successors remain in their original development line. Values and gameplay scores are editorial encyclopedia data, not difficulty ratings validated in live play. Strict filters may return fewer than five countries.",
  "option.any":"No preference",
  "option.heavy":"Prefer heavy colonization (score at least 70)",
  "option.avoid":"Avoid heavy colonization (score no higher than 69)",
  "option.relaxed":"Relaxed (target 25)",
  "option.moderate":"Moderate challenge (target 55)",
  "option.hard":"High difficulty (target 90)",
  "option.lowPressure":"As little pressure as possible (target 20)",
  "option.mediumPressure":"Moderate pressure (target 55)",
  "option.highPressure":"A demanding opening is welcome (target 90)",
  "option.light":"Lighter narrative (target 15)",
  "option.mixed":"A mixture of dark and hopeful (target 55)",
  "option.dark":"A very dark narrative is welcome (target 95)",
  "vector.note":"Magic versus artifice measures direction, not intensity of use. Institutional pluralism describes governance, not good or evil. All scores are editorial research scales.",
  "results.note":"Basic v2.2 matching retains equal-weight five-axis distance. Values/gameplay options show separate components and a blended similarity: a recommendation preference score, not historical accuracy or real-world moral judgment. Unmet conditional profiles are hypothetical matches only.",
  "footer.source":"Data: approved PR #9 practical v2.2 personality scores · source commit",
  "footer.fullNote":"The encyclopedia and matching tools share the same research data. Personality, gameplay and values use their existing editorial scales; conditional profiles do not establish that in-game conditions have been met.",
  "site.lead":"Discover 109 approved nation personalities and 57 conditional profiles. Explore the encyclopedia of 116 countries and compare up to three.",
  "nav.quiz":"Personality quiz","nav.encyclopedia":"Country encyclopedia","nav.compare":"Compare countries",
  "header.baselines":"nation baselines","header.profiles":"conditional profiles","header.top":"distinct development lines",
  "quiz.title":"Scenario questionnaire · 25 questions",
  "quiz.desc":"Choose how you would govern in hypothetical situations. Five questions per axis; unanswered questions are not treated as neutral.",
  "quiz.note":"This editorial questionnaire is not a clinical or validated psychological assessment.",
  "quiz.previous":"Previous","quiz.next":"Next","quiz.unanswered":"First unanswered",
  "quiz.calculate":"Calculate personality and matches","quiz.clear":"Clear answers",
  "quiz.saved":"Answers are saved in this browser session, not uploaded.",
  "values.title":"Finally: story values and gameplay preferences",
  "values.desc":"These choices concern which fictional nations you want to play, not your real-world morality.",
  "values.enable":"Include story-value matching (eight more questions)",
  "values.note":"v2.1 values are separate from the approved v2.2 personality scores. Complete all eight questions to use this option.",
  "filters.title":"Filters and gameplay preferences",
  "filters.region":"Limit matching region","filters.colonization":"Colonization preference",
  "filters.difficulty":"Desired campaign difficulty","filters.pressure":"Early-game pressure",
  "filters.dark":"Dark narrative preference","filters.apply":"Apply preferences and match again",
  "filters.clear":"Clear the eight value responses",
  "filters.ready":"Complete the questionnaire and set any extra preferences.",
  "vector.title":"Matching region and five-axis values",
  "vector.desc":"The questionnaire fills these values automatically; you can also test integers from 0 to 100.",
  "vector.region":"Matching region","vector.run":"Calculate Top 5","vector.random":"Random example",
  "vector.reset":"Reset to midpoint",
  "results.title":"Five best-matching development lines",
  "results.desc":"Each development line appears at most once. A result may be the common baseline or a conditional profile.",
  "catalog.title":"Approved personality profiles",
  "catalog.desc":"Explore the 109 approved owner countries and their scored conditional profiles.",
  "catalog.search":"Search by Chinese name, English name, or Tag",
  "catalog.help":"Choose a suggestion to view approved profiles (109 countries).",
  "encyclopedia.title":"Browse countries by region",
  "encyclopedia.desc":"116 encyclopedia entries. Survey regions are not province regions on the game map.",
  "encyclopedia.region":"Encyclopedia region",
  "encyclopedia.search":"Search by Chinese name, English name, or Tag",
  "encyclopedia.regionQuiz":"Match countries in this region",
  "compare.title":"Side-by-side country comparison",
  "compare.desc":"Choose 2–3 of the 116 countries to compare personality, routes, national ideas and gameplay. No new ranking is calculated.",
  "compare.search":"Search by Chinese name, English name, or Tag",
  "compare.help":"Choose a suggestion to add a country (up to three).",
  "footer.note":"Editorial reference material. Conditional routes are not proof of unlocked game states.",
  "article.original":"English translation is not available. The Chinese article is not substituted as English content.",
  "article.heading":"Full historical and lore article",
  "country.addCompare":"Add to comparison","country.return":"Back to directory","country.quiz":"Back to quiz",
  "country.overview":"Country overview and gameplay","country.features":"Signature features",
  "country.route":"Mission routes and campaign pacing","country.ideas":"National ideas",
  "country.scoring":"v2.2 personality and conditional profiles",
  "country.values":"v2.1 values and gameplay","country.sources":"Sources and limitations",
  "survey.none":"No matching countries","search.none":"No matching countries",
  "match.wait":"Please choose a country from the suggestions to view its approved profiles.",
  "axis.ambition_scope":"Scope of national ambition",
  "axis.power_concentration":"Concentration of power",
  "axis.magic_artifice_balance":"Magic vs. artifice",
  "axis.integration_pluralism":"Institutional pluralism and integration",
  "axis.restoration_transformation":"Restoration vs. transformation",
  "choices.0":"Strongly prefer A","choices.1":"Somewhat prefer A",
  "choices.2":"Either / depends on context","choices.3":"Somewhat prefer B",
  "choices.4":"Strongly prefer B",
  "question.context":"Suppose you are setting a country's long-term policy",
  "question.optionA":"Option A","question.optionB":"Option B",
  "question.position":"Question","question.answered":"Answered",
  "question.summary":"Five-axis scenario preference",
  "question.variation":"Your answers varied substantially across these situations:",
  "question.variationNote":"You can review your answers; variation is not an error.",
  "question.scoreNote":"Five questions per axis, equally weighted. Values are descriptive, not confidence intervals or national scores.",
  "question.applied":"The five-axis vector has been applied to the current matching region. Results retain P1 equal-weight distance and deduplication by development line.",
  "question.completed":"Questionnaire complete. Calculating matches using the approved national profiles.",
  "question.cleared":"Answers cleared. Please start again.",
  "question.incomplete":"Please answer all 25 questions; unanswered items are not scored as neutral.",
  "value.question":"Story values","value.progress":"Story-value answers",
  "value.applied":"Preferences applied","value.incomplete":"Answer all eight story-value questions, or disable story-value matching.",
  "value.stale":"Preferences changed. Apply them again to update the results.",
  "choice.veryA":"Strongly prefer A","choice.someA":"Somewhat prefer A",
  "choice.either":"Both / depends","choice.someB":"Somewhat prefer B","choice.veryB":"Strongly prefer B",
  "locale.preview":"English presentation layer · untranslated content is marked explicitly",
  "comparative.notice":"v2.2 personality uses approved P0 profiles only. v2.1 values and gameplay are separate editorial scales.",
  "compat.onlyChinese":"English translation is not available",
  "translation.countryGap":"Some country fields are not translated; explicit gap markers are shown.",
  "translation.articleNote":"This is the English Markdown translation. Numbers and source boundaries remain tied to the Chinese authority.",
  "encyclopedia.selectRegion":"Select a region first",
  "filters.all":"All regions (109 countries)",
  "results.represented":"Represented profile: ",
  "app.ready":"P0 scores loaded: 109 national baselines and 57 conditional profiles. Adjust the five axes to calculate the Top 5."
};
export const ENGLISH_UI=Object.freeze(en);
export function t(key,fallback=""){return english() ? (en[key] ?? fallback ?? key) : fallback;}
export function labelForAxis(key,zh){return t("axis."+key,zh);}
// Retain the active locale in shareable routes, including Pages subpaths.
export function routeInLocale(route, baseUrl, locale=language()){
  const url=new URL(route,baseUrl);
  if(!url.searchParams.has("lang"))url.searchParams.set("lang",normalizedLanguage(locale));
  return url.pathname+url.search+url.hash;
}
export function setLanguage(value){
  const next=normalizedLanguage(value);
  try{localStorage.setItem("anbennar-locale",next);}catch{}
  if(typeof location!=="undefined"){
    const link=new URL(location.href);
    link.searchParams.set("lang",next);
    location.assign(link.pathname+link.search+link.hash);
  }else current=next;
}
export function installLanguageSwitch(){
  if(typeof document==="undefined")return;
  document.documentElement.lang=current==="en"?"en":"zh-CN";
  const select=document.getElementById("siteLanguage");
  if(select){
    select.value=current;
    select.addEventListener("change",()=>{
      const next=select.value;
      // Preserve the old document's locale and form state in browser history.
      select.value=current;
      setLanguage(next);
    });
    window.addEventListener("pageshow",()=>{select.value=current;});
  }
  if(english()){
    for(const el of document.querySelectorAll("[data-i18n]")){
      const key=el.getAttribute("data-i18n");
      if(en[key])el.textContent=en[key];
    }
    for(const el of document.querySelectorAll("[data-i18n-placeholder]")){
      const key=el.getAttribute("data-i18n-placeholder");
      if(en[key])el.placeholder=en[key];
    }
    for(const el of document.querySelectorAll("[data-i18n-aria-label]")){
      const key=el.getAttribute("data-i18n-aria-label");
      if(en[key])el.setAttribute("aria-label",en[key]);
    }
  }
}
