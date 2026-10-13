// Canonical regions come from identity.survey_region in encyclopedia-index.json.
export const ALL_REGIONS = "";
export const UNVERIFIED = "__unverified";

export function validateEncyclopediaIndex(index, personalityEntries = null) {
  if (!index || index.schema_version !== "encyclopedia-index-1.0" ||
      !Array.isArray(index.countries) || index.countries.length < 1 ||
      index.country_count !== index.countries.length || !Number.isInteger(index.article_count) || index.article_count < 1 ||
      !Array.isArray(index.regions)) {
    throw new Error("百科索引缺少 109 国／101 篇文章或版本不匹配");
  }
  const seen = new Set(), counts = new Map();
  for (const c of index.countries) {
    if (!c.tag || seen.has(c.tag) || !c.article_id || !c.article_data_path) {
      throw new Error("重复国家、文章引用不完整：" + c.tag);
    }
    seen.add(c.tag);
    const r = c.survey_region;
    const key = r?.status === "matched" ? r.name_en : UNVERIFIED;
    if (key !== UNVERIFIED && (!r.name_zh || !r.name_en)) {
      throw new Error("地区缺失: " + c.tag);
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (index.regions.length !== counts.size) throw new Error("地区索引数量不一致");
  for (const region of index.regions) {
    if (region.count !== counts.get(region.key)) throw new Error("地区计数错误: " + region.key);
  }
  if (personalityEntries) {
    const base = personalityEntries.filter(e => e.profile_type === "baseline");
    if (base.length !== 109 || base.some(e => !seen.has(e.owner_tag))) {
      throw new Error("评分国家基线与百科 Tag 不一致");
    }
  }
  return true;
}

export function regionOf(country) {
  const region = country?.survey_region;
  return region?.status === "matched" && region.name_en ? region.name_en : UNVERIFIED;
}

export function matchCountries(index, region = ALL_REGIONS, query = "") {
  const q = String(query).trim().toLocaleLowerCase();
  return index.countries.filter(c => {
    if (region !== ALL_REGIONS && regionOf(c) !== region) return false;
    return !q || [c.tag, c.name_zh, c.name_en]
      .some(text => String(text || "").toLocaleLowerCase().includes(q));
  }).sort((a, b) => a.tag.localeCompare(b.tag, "en"));
}

export function filterCandidatesByRegion(entries, regionKey, countryIndex) {
  if (!Array.isArray(entries) || !countryIndex?.countries) {
    throw new TypeError("必须提供候选和百科国家索引");
  }
  // Strictly preserve original global P1 ordering when no region selected.
  if (!regionKey) return entries;
  const allowed = new Set(matchCountries(countryIndex, regionKey).map(c => c.tag));
  return entries.filter(entry => allowed.has(entry.owner_tag));
}
