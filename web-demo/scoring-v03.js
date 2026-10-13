"use strict";

// Demo 0.3 scoring override.
// Keep app.js as the v0.1 baseline; this file replaces only baseMatch so the
// questionnaire/UI stay unchanged and the scoring change is easy to A/B or revert.

function preferenceSalience(value) {
  const extremity = Math.abs(value - 50) / 50;
  return 0.18 + 0.82 * Math.pow(extremity, 1.25);
}

function groupSalience(user, keys) {
  return keys.reduce((sum, key) => sum + preferenceSalience(user[key]), 0) / keys.length;
}

baseMatch = function salienceWeightedBaseMatch(user, country, activeFilters, relaxFilters) {
  const personalityWeights = {
    "p.expansion_building": 1.2,
    "p.autocracy_liberty": 1,
    "p.magic_artifice_intensity": 0.75,
    "p.pluralism_uniformity": 1.1,
  };

  const pDist = distance(user, country, PERSONALITY_KEYS, key => {
    const salience = preferenceSalience(user[key]);
    if (key === "p.magic_artifice_balance") {
      const sharedIntensity = Math.min(user["p.magic_artifice_intensity"], country.personality.magic_artifice_intensity);
      return salience * Math.max(0.05, sharedIntensity / 100);
    }
    return salience * (personalityWeights[key] ?? 1);
  });

  const valueWeights = {
    "v.dignity": 1.15,
    "v.public_good": 1,
    "v.personhood": 1.15,
    "v.restraint": 0.85,
  };
  const vDist = distance(
    user,
    country,
    VALUE_KEYS,
    key => preferenceSalience(user[key]) * (valueWeights[key] ?? 1)
  );

  const gDist = distance(user, country, GAMEPLAY_KEYS, key => {
    let base = 1;
    if (key === "g.magic_artifice_intensity") base = 0.45;
    if (key === "g.early_pressure" || key === "g.difficulty") base = 0.85;
    return preferenceSalience(user[key]) * base;
  });

  // Keep 45/40/15 as the base philosophy, but let categories that the user
  // answered more decisively carry somewhat more weight.
  const pWeight = 0.45 * (0.65 + 0.35 * groupSalience(user, PERSONALITY_KEYS));
  const gWeight = 0.40 * (0.65 + 0.35 * groupSalience(user, GAMEPLAY_KEYS));
  const vWeight = 0.15 * (0.65 + 0.35 * groupSalience(user, VALUE_KEYS));
  const groupWeightSum = pWeight + gWeight + vWeight;

  const conflicts = violations(country, activeFilters);
  const penalty = relaxFilters ? conflicts.length * 18 : 0;
  const combined = (pWeight * pDist + gWeight * gDist + vWeight * vDist) / groupWeightSum;
  const score = clamp(100 - combined * 17 - penalty, 1, 99);

  return {
    country,
    score,
    pDist,
    gDist,
    vDist,
    conflicts,
    scoringVersion: "0.3-salience",
    salience: {
      personality: groupSalience(user, PERSONALITY_KEYS),
      gameplay: groupSalience(user, GAMEPLAY_KEYS),
      values: groupSalience(user, VALUE_KEYS),
    },
  };
};
