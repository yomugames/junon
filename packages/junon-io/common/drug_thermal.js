function hash(value) {
  let result = 2166136261
  String(value).split("").forEach((character) => {
    result ^= character.charCodeAt(0)
    result = Math.imul(result, 16777619)
  })
  return result >>> 0
}

function canonicalizeMaterials(materials) {
  if (!Array.isArray(materials)) return String(materials || "")
  return materials.map((material) => String(material)).sort().join("|")
}

function getReactionProfile(worldSeed, materials) {
  let seed = hash(`${worldSeed}:thermal:${canonicalizeMaterials(materials)}`)
  let reactionStartTemperature = 25 + seed % 141
  return {
    reactionStartTemperature: reactionStartTemperature,
    peakTemperature: reactionStartTemperature + 15,
    reactionEndTemperature: reactionStartTemperature + 30
  }
}

function getTemperatureEffectModifier(profile, temperature) {
  if (temperature <= profile.reactionStartTemperature) return 0.5
  if (temperature <= profile.peakTemperature) {
    return 0.5 + 0.5 * (temperature - profile.reactionStartTemperature) / 15
  }
  return 1
}

function getEffectiveEffect(effect, temperature, profile) {
  let baseValue = typeof effect.baseValue === "number" ? effect.baseValue : effect.value
  let modifier = getTemperatureEffectModifier(profile, temperature)
  let effectiveValue = typeof baseValue === "number" ? Math.round(baseValue * modifier) : baseValue
  return Object.assign({}, effect, {
    baseValue: baseValue,
    thermalModifier: modifier,
    value: effectiveValue,
    thermalProfile: profile
  })
}

function getEffectiveDrugEffects(worldSeed, effects, temperature, materials) {
  let profile = getReactionProfile(worldSeed, materials)
  return effects.map((effect) => getEffectiveEffect(effect, temperature, profile))
}

function isFailedTemperature(profile, temperature) {
  return temperature > profile.reactionEndTemperature
}

module.exports = {
  canonicalizeMaterials,
  getReactionProfile,
  getTemperatureEffectModifier,
  getEffectiveEffect,
  getEffectiveDrugEffects,
  isFailedTemperature
}