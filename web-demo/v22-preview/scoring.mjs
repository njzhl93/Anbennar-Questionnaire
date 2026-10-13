// v2.2 PREVIEW ONLY. Do not import this module from legacy web-demo/app.js.
export const AXES = Object.freeze([
  ["ambition_scope", "国家目标范围", "地方经营／有限目标", "广域扩张／文明愿景"],
  ["power_concentration", "权力集中度", "分权与制衡", "高度集权"],
  ["magic_artifice_balance", "魔法—奇械方向", "偏奇械与技术", "偏魔法"],
  ["integration_pluralism", "多元整合", "制度同质化与排斥", "制度化多元与整合"],
  ["restoration_transformation", "复古—变革", "恢复既有秩序", "建立新的秩序"],
]);
export const AXIS_KEYS = Object.freeze(AXES.map(axis => axis[0]));

export function validateVector(vector) {
  if (!vector || typeof vector !== "object" || Array.isArray(vector)) {
    throw new TypeError("五轴输入必须是对象");
  }
  if (Object.keys(vector).length !== AXIS_KEYS.length ||
      AXIS_KEYS.some(key => !Object.prototype.hasOwnProperty.call(vector, key))) {
    throw new TypeError("需要恰好五个 v2.2 人格轴");
  }
  for (const key of AXIS_KEYS) {
    const value = vector[key];
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new RangeError(key + " 必须是 0–100 整数");
    }
  }
  return vector;
}

// Equal-weight root-mean-square distance, range [0,100].
// Symmetric; zero iff all five axes equal. Similarity is NOT a probability.
export function distance(a, b) {
  validateVector(a);
  validateVector(b);
  const sum = AXIS_KEYS.reduce((total, key) => total + (a[key] - b[key]) ** 2, 0);
  return Math.sqrt(sum / AXIS_KEYS.length);
}

export function evaluate(user, entry) {
  const gap = distance(user, entry.personality);
  const differences = AXIS_KEYS.map(key => ({
    key, user: user[key], country: entry.personality[key],
    delta: entry.personality[key] - user[key],
    absolute: Math.abs(entry.personality[key] - user[key]),
  })).sort((a, b) => a.absolute - b.absolute || a.key.localeCompare(b.key));
  return {
    entry, distance: gap, score: Math.round((100 - gap) * 10) / 10,
    differences,
  };
}

export function validateDataset(data) {
  if (!data || data.model_version !== "2.2-preview" ||
      data.coverage?.baselines !== 109 || data.coverage?.profiles !== 57 ||
      !Array.isArray(data.entries) || data.entries.length !== 166) {
    throw new Error("预览数据版本或109/57候选数量不正确");
  }
  const ids = new Set(), baselines = new Set(), owners = new Set();
  for (const e of data.entries) {
    if (!e || typeof e.id !== "string" || ids.has(e.id)) {
      throw new Error("缺失或重复候选ID");
    }
    ids.add(e.id);
    validateVector(e.personality);
    validateVector(e.baseline);
    if (!e.owner_tag || !e.applicable_tag ||
        !["baseline", "choice", "stage", "formation"].includes(e.profile_type)) {
      throw new Error("候选国家关系或类型无效: " + e.id);
    }
    if (e.profile_type === "baseline") {
      if (baselines.has(e.owner_tag) || e.owner_tag !== e.applicable_tag) {
        throw new Error("国家基线重复或继承关系错误");
      }
      baselines.add(e.owner_tag);
    } else {
      owners.add(e.owner_tag);
      if (!e.profile_id) throw new Error("条件画像缺少profile_id");
    }
  }
  if (baselines.size !== 109 || owners.size !== 25 ||
      data.entries.filter(e => e.profile_type !== "baseline").length !== 57) {
    throw new Error("预览候选结构不完整");
  }
  for (const e of data.entries) {
    if (!baselines.has(e.owner_tag)) throw new Error("无国家基线: " + e.owner_tag);
    // Successor applicable_tag need not belong to the 109 baseline country set.
    if (!e.applicable_tag.trim()) throw new Error("适用国家Tag缺失");
  }
  return true;
}

// Keep the original development-line owner separate from the applicable successor.
// Equivalent aliases are NOT separate entries; they are conditions on one entry.
// Deterministic ties: shortest distance, then baseline over conditional,
// then lexicographically by owner, applicable tag, unique id.
export function compareResults(a, b) {
  return a.distance - b.distance ||
    Number(a.entry.profile_type !== "baseline") - Number(b.entry.profile_type !== "baseline") ||
    a.entry.owner_tag.localeCompare(b.entry.owner_tag, "en") ||
    a.entry.applicable_tag.localeCompare(b.entry.applicable_tag, "en") ||
    a.entry.id.localeCompare(b.entry.id, "en");
}
export function rank(user, entries, count = 5) {
  validateVector(user);
  if (!Array.isArray(entries) || !Number.isInteger(count) || count < 1) {
    throw new TypeError("候选列表或数量无效");
  }
  const all = entries.map(entry => evaluate(user, entry)).sort(compareResults);
  const bestByLine = new Map();
  for (const item of all) {
    if (!bestByLine.has(item.entry.owner_tag)) {
      bestByLine.set(item.entry.owner_tag, item);
    }
  }
  const top = [...bestByLine.values()].sort(compareResults).slice(0, count);
  return {top, all, groupCount: bestByLine.size};
}
