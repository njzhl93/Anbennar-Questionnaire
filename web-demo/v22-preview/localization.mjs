import {language} from "./i18n.mjs";

function safe(relative) {
  const value=String(relative||"").replaceAll("\\","/");
  if(!value || value.startsWith("/") || value.includes("../") || value.includes("://") ||
     value.split("/").some(part=>part===".."||part===""))
    throw new Error("Unsafe localized data path: "+relative);
  return value.replace(/^\.\//,"");
}

export function localizedDataPath(relative, locale=language()) {
  const path=safe(relative);
  return locale==="en" ? "./data/en/"+path : "./data/"+path;
}

export function localizedArticlePath(articleId, locale=language()) {
  if(!/^[a-f0-9]{20}$/.test(String(articleId||"")))
    throw new Error("Unsafe article id: "+articleId);
  return localizedDataPath("articles/"+articleId+".json",locale);
}

export async function fetchLocalizedJson(relative,{locale=language(),cache="no-cache"}={}) {
  const response=await fetch(localizedDataPath(relative,locale),{cache});
  if(!response.ok)throw new Error(relative+" HTTP "+response.status);
  return response.json();
}

export function compatibleEncyclopediaIndex(index) {
  if(index?.schema_version!=="encyclopedia-index-1.1")return index;
  return {...index,locale_schema_version:index.schema_version,schema_version:"encyclopedia-index-1.0"};
}
