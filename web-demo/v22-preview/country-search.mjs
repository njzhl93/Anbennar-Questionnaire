// Shared accessible text combobox for Chinese/English country names and Tags.
import {countryName,english,t} from "./i18n.mjs";
const normalize = value => String(value ?? "").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();

export function findCountrySuggestions(countries, query, limit=8) {
  const needle=normalize(query);
  if(!needle || !Number.isInteger(limit) || limit<1)return [];
  return countries.map(country=>{
    const tag=normalize(country.tag), zh=normalize(country.name_zh), en=normalize(country.name_en);
    let priority=10;
    if(tag===needle)priority=0;
    else if(zh===needle||en===needle)priority=1;
    else if(tag.startsWith(needle))priority=2;
    else if(zh.startsWith(needle)||en.startsWith(needle))priority=3;
    else if(tag.includes(needle)||zh.includes(needle)||en.includes(needle))priority=4;
    return {country,priority};
  }).filter(x=>x.priority!==10)
    .sort((a,b)=>a.priority-b.priority||
      a.country.tag.localeCompare(b.country.tag,"en"))
    .slice(0,limit).map(x=>x.country);
}

export function attachCountryAutocomplete(input, {getCountries,onSelect,onQuery=()=>{},
  clearOnSelect=false,fillOnSelect=true,limit=8}={}) {
  if(!input || typeof getCountries!=="function" || typeof onSelect!=="function")
    throw new TypeError("国家自动补全需要输入框、候选源和选择回调");
  const container=input.closest(".country-search-field");
  if(!container)throw new Error("国家搜索输入框缺少 country-search-field 容器");
  const popup=document.createElement("div"), popupId=input.id+"-suggestions";
  popup.id=popupId;
  popup.className="country-suggestions";
  popup.setAttribute("role","listbox");
  popup.setAttribute("aria-label","国家自动补全备选项");
  popup.hidden=true;
  container.append(popup);
  input.setAttribute("role","combobox");
  input.setAttribute("aria-autocomplete","list");
  input.setAttribute("aria-controls",popupId);
  input.setAttribute("aria-expanded","false");
  input.setAttribute("autocomplete","off");
  let matches=[],active=-1,composing=false;

  function close(){
    popup.hidden=true;
    popup.replaceChildren();
    input.setAttribute("aria-expanded","false");
    input.removeAttribute("aria-activedescendant");
    matches=[];
    active=-1;
  }
  function mark(index) {
    active=index;
    for(const [n,item] of Array.from(popup.querySelectorAll('[role="option"]')).entries()){
      const picked=n===index;
      item.setAttribute("aria-selected",String(picked));
      item.classList.toggle("active",picked);
    }
    const picked=popup.querySelectorAll('[role="option"]')[index];
    if(picked){
      input.setAttribute("aria-activedescendant",picked.id);
      picked.scrollIntoView({block:"nearest"});
    }else input.removeAttribute("aria-activedescendant");
  }
  function choose(index){
    const c=matches[index];
    if(!c || !getCountries().some(row=>row.tag===c.tag))return;
    input.value=clearOnSelect?"":fillOnSelect?countryName(c)+" ("+c.tag+")":input.value;
    close();
    onSelect(c);
  }
  function refresh({open=document.activeElement===input}={}) {
    if(composing||input.disabled){close();return;}
    matches=findCountrySuggestions(getCountries(),input.value,limit);
    active=-1;
    popup.replaceChildren();
    if(!open || !input.value.trim()){close();return;}
    if(!matches.length){
      const empty=document.createElement("p");
      empty.className="country-suggestion-empty";
      empty.textContent=t("search.none","没有匹配的国家");
      popup.append(empty);
    }
    matches.forEach((c,i)=>{
      const option=document.createElement("button");
      option.type="button";
      option.id=popupId+"-option-"+i;
      option.className="country-suggestion";
      option.setAttribute("role","option");
      option.setAttribute("aria-selected","false");
      const strong=document.createElement("strong");
      strong.textContent=countryName(c);
      const sub=document.createElement("small");
      sub.textContent=[english()?c.name_zh:c.name_en,c.tag].filter(Boolean).join(" · ");
      option.append(strong,sub);
      option.addEventListener("pointerdown",e=>e.preventDefault());
      option.addEventListener("click",()=>choose(i));
      popup.append(option);
    });
    popup.hidden=false;
    input.setAttribute("aria-expanded","true");
    input.removeAttribute("aria-activedescendant");
  }
  input.addEventListener("compositionstart",()=>{composing=true;close();});
  input.addEventListener("compositionend",()=>{
    composing=false;onQuery(input.value);refresh({open:true});
  });
  input.addEventListener("input",()=>{
    if(composing)return;
    onQuery(input.value);refresh({open:true});
  });
  input.addEventListener("focus",()=>refresh({open:true}));
  input.addEventListener("keydown",event=>{
    if(composing||event.isComposing)return;
    if(event.key==="Escape"){close();return;}
    if(event.key==="Tab"){close();return;}
    if(event.key==="ArrowDown"||event.key==="ArrowUp"){
      if(popup.hidden)refresh({open:true});
      if(!matches.length)return;
      event.preventDefault();
      mark(event.key==="ArrowDown"?(active+1)%matches.length:
        (active-1+matches.length)%matches.length);
    }else if(event.key==="Enter" && !popup.hidden && matches.length){
      event.preventDefault();
      choose(active<0?0:active);
    }
  });
  input.addEventListener("blur",()=>{
    // Pointer selection prevents losing focus before the suggestion click.
    close();
  });
  return {refresh,close};
}
