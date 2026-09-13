const Constants = require("./constants.json")

const ARCHETYPES = ["Offensive", "Defensive", "Healing", "Mobility", "Stamina", "Utility"]
const RARITIES = {
  Rare: { budget: 3, minNegative: 1, maxNegative: 3, maxEffects: 4, maxRefund: 8 },
  VeryRare: { budget: 5, minNegative: 2, maxNegative: 4, maxEffects: 5, maxRefund: 10 },
  Epic: { budget: 7, minNegative: 3, maxNegative: 5, maxEffects: 6, maxRefund: 12 }
}
const LEVELS = ["Minor", "Moderate", "Major"]
const VALUES = {
  positive: {
    "Max Health": [25, 50, 100], "Max Stamina": [40, 80, 150], "Instant Healing": [25, 40, 75], "Delayed Healing": [30, 60, 120], Strength: [15, 30, 50], "Effect Duration": [30, 60, 100], "Effect Potency": [15, 30, 50], "Healing Rate": [15, 30, 50], Speed: [15, 30, 50], "Initial Decaying Boost": [75, 150, 250], Regeneration: [2, 7], "Stamina Regen": [1, 5], Reload: [-10, -25, -40], "View Distance": [15, 30, 50]
  },
  negative: {
    "Max Health": [-25, -50, -75], "Max Stamina": [-20, -40, -60], "Instant Damage": [20, 40, 70], "Delayed Damage": [30, 60, 120], Strength: [-15, -30, -50], "Effect Duration": [-20, -40, -60], "Effect Potency": [-15, -30, -60], Speed: [-20, -40, -60], "Initial Decaying Boost": [-50, -100, -150], Regeneration: [-2, -5], "Stamina Regen": [-1, -4], Reload: [25, 50, 80], "View Distance": [-20, -40, -60]
  }
}
const COSTS = {
  positive: { "Max Health": [2, 4, 7], "Max Stamina": [2, 4, 7], "Instant Healing": [3, 5, 8], "Delayed Healing": [2, 4, 7], Strength: [3, 5, 8], "Effect Duration": [2, 4, 7], "Effect Potency": [3, 5, 8], "Random Buff": [4], "Healing Rate": [2, 4, 7], "Poison Immunity": [6], "Nausea Immunity": [5], Speed: [3, 5, 8], "Initial Decaying Boost": [2, 4, 7], Regeneration: [4, 7], "Stamina Regen": [3, 6], Reload: [3, 5, 8], "View Distance": [2, 4, 6] },
  negative: { "Max Health": [-2, -4, -7], "Max Stamina": [-2, -4, -7], "Instant Damage": [-3, -5, -8], "Delayed Damage": [-2, -4, -7], Strength: [-3, -5, -8], Nausea: [-6], Poison: [-10], "Effect Duration": [-2, -4, -7], "Effect Potency": [-3, -5, -8], "Random Debuff": [-5], Speed: [-3, -5, -8], "Initial Decaying Boost": [-2, -4, -7], Regeneration: [-4, -7], "Stamina Regen": [-3, -6], Reload: [-3, -5, -8], "View Distance": [-2, -4, -6] }
}
const BINARY = new Set(["Random Buff", "Poison Immunity", "Nausea Immunity", "Nausea", "Poison", "Random Debuff"])
const POSITIVE_WEIGHTS = {
  Offensive: { Strength: 10, Reload: 6, "Instant Healing": 2, Speed: 2, "Initial Decaying Boost": 2, "Effect Potency": 2 },
  Defensive: { "Max Health": 10, "Max Stamina": 2, "Poison Immunity": 4, "Nausea Immunity": 4, Regeneration: 3, "Delayed Healing": 2, "Healing Rate": 3 },
  Healing: { "Instant Healing": 5, "Delayed Healing": 4, "Healing Rate": 6, Regeneration: 6, "Max Health": 2, "Effect Duration": 2 },
  Mobility: { Speed: 12, "Stamina Regen": 3, "Max Stamina": 3, "View Distance": 4, Reload: 5, "Initial Decaying Boost": 2 },
  Stamina: { "Max Stamina": 5, "Stamina Regen": 5, Speed: 3, Reload: 3, "Delayed Healing": 5, "Effect Duration": 5 },
  Utility: { "Effect Duration": 5, "Effect Potency": 5, "View Distance": 3, "Initial Decaying Boost": 6, "Random Buff": 3, "Poison Immunity": 3, "Nausea Immunity": 3 }
}
const NEGATIVE_WEIGHTS = {
  Offensive: { "Max Health": 3, "Max Stamina": 2, "Effect Duration": 2, Speed: 2, "Delayed Damage": 2, Regeneration: 1 },
  Defensive: { Speed: 3, Reload: 2, "Effect Potency": 2, "Instant Damage": 2, "Delayed Damage": 2 },
  Healing: { "Instant Damage": 2, "Delayed Damage": 2, "Effect Potency": 2, Speed: 2, "Max Stamina": 2 },
  Mobility: { "Max Health": 2, Speed: 2, "Stamina Regen": 2, "Max Stamina": 2, "Delayed Damage": 2 },
  Stamina: { "Max Health": 2, "Max Stamina": 2, Speed: 2, Reload: 2, "Instant Damage": 2 },
  Utility: { "Effect Duration": 2, "Effect Potency": 2, "View Distance": 2, "Initial Decaying Boost": 2, "Random Debuff": 2, Nausea: 1, Poison: 1 }
}

function hash(value) {
  let result = 2166136261
  String(value).split("").forEach((character) => {
    result ^= character.charCodeAt(0)
    result = Math.imul(result, 16777619)
  })
  return result >>> 0
}

function rng(seed) {
  let state = hash(seed) || 1
  return () => {
    state = Math.imul(state ^ state >>> 15, 1 | state)
    state ^= state + Math.imul(state ^ state >>> 7, 61 | state)
    return ((state ^ state >>> 14) >>> 0) / 4294967296
  }
}

function weightedPick(entries, random) {
  let total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let target = random() * total
  for (let entry of entries) {
    target -= entry.weight
    if (target <= 0) return entry.value
  }
  return entries[entries.length - 1].value
}

function rarityFor(material) {
  if (["OrangeMushroom", "YellowMushroom", "GreenMushroom", "PinkMushroom"].indexOf(material) !== -1) return "Rare"
  if (["BlueMushroom", "PurpleMushroom"].indexOf(material) !== -1) return "VeryRare"
  if (material === "BlackMushroom") return "Epic"
  return null
}

function getMushroomArchetype(worldSeed, mushroom) {
  if (!rarityFor(mushroom)) return null
  let mushrooms = Object.keys(Constants.Foods).filter((name) => rarityFor(name)).sort((a, b) => {
    return hash(`${worldSeed}:archetype-order:${a}`) - hash(`${worldSeed}:archetype-order:${b}`)
  })
  let mushroomIndex = mushrooms.indexOf(mushroom)
  return ARCHETYPES[mushroomIndex % ARCHETYPES.length]
}

function oppositeExists(effects, name, positive) {
  return effects.some((effect) => effect.effect === name && effect.positive !== positive)
}

function makeCandidate(name, positive, level) {
  let costTable = positive ? COSTS.positive : COSTS.negative
  let valueTable = positive ? VALUES.positive : VALUES.negative
  let values = valueTable[name]
  let costs = costTable[name]
  let index = Math.min(level, costs.length - 1)
  return { effect: name, value: BINARY.has(name) ? 1 : values[index], cost: costs[index], positive: positive, strength: BINARY.has(name) ? null : LEVELS[index] }
}

function getAffordableLevel(name, positive, budget) {
  let costs = positive ? COSTS.positive[name] : COSTS.negative[name]
  let levels = costs.map((cost, level) => ({ level: level, cost: cost })).filter((entry) => positive ? entry.cost <= budget : -entry.cost <= budget)
  return levels.length ? levels[levels.length - 1] : null
}

function chooseNegativeEffects(random, archetype, names, count, maxRefund) {
  let effects = []
  let refunded = 0
  for (let index = 0; index < count; index++) {
    let choices = names.filter((name) => {
      if (effects.some((effect) => effect.effect === name) || oppositeExists(effects, name, false)) return false
      return COSTS.negative[name].some((cost) => refunded - cost <= maxRefund)
    })
    if (!choices.length) return null

    let name = weightedPick(choices.map((value) => ({ value: value, weight: NEGATIVE_WEIGHTS[archetype][value] || 1 })), random)
    let level = getAffordableLevel(name, false, maxRefund - refunded)
    if (!level) return null
    let candidate = makeCandidate(name, false, level.level)
    effects.push(candidate)
    refunded -= candidate.cost
  }
  return effects
}

function choosePositiveEffects(random, archetype, names, count, budget, existingEffects) {
  let candidates = names.filter((name) => {
    return !existingEffects.some((effect) => effect.effect === name) && !oppositeExists(existingEffects, name, true)
  }).flatMap((name) => COSTS.positive[name].map((cost, level) => ({
    name: name,
    level: level,
    cost: cost,
    weight: POSITIVE_WEIGHTS[archetype][name] || 1
  })).filter((candidate) => candidate.cost <= budget))
  let best = { cost: 0, score: -1, choices: [] }

  function search(index, remaining, selected, score) {
    if (selected.length === count || index === candidates.length) {
      let spent = budget - remaining
      if (spent > best.cost || (spent === best.cost && score > best.score)) best = { cost: spent, score: score, choices: selected.slice() }
      return
    }

    search(index + 1, remaining, selected, score)
    let candidate = candidates[index]
    if (candidate.cost <= remaining && !selected.some((choice) => choice.name === candidate.name)) {
      search(index + 1, remaining - candidate.cost, selected.concat(candidate), score + candidate.weight * random())
    }
  }

  search(0, budget, [], 0)
  return { effects: best.choices.map((choice) => makeCandidate(choice.name, true, choice.level)), budget: budget - best.cost }
}

function generateMushroomEffects(worldSeed, mushroom) {
  let rarity = rarityFor(mushroom)
  if (!rarity) return Constants.Foods[mushroom] && Constants.Foods[mushroom].effects || {}
  let settings = RARITIES[rarity]
  let archetype = getMushroomArchetype(worldSeed, mushroom)
  let random = rng(`${worldSeed}:effects:${mushroom}`)
  let effects = []
  let budget = settings.budget
  let positiveNames = Object.keys(COSTS.positive)
  let negativeNames = Object.keys(COSTS.negative)
  let negativeCount = settings.minNegative + Math.floor(random() * (settings.maxNegative - settings.minNegative + 1))
  negativeCount = Math.min(negativeCount, settings.maxEffects - 1)
  let negativeEffects = chooseNegativeEffects(random, archetype, negativeNames, negativeCount, settings.maxRefund)
  if (!negativeEffects) return generateMushroomEffects(`${worldSeed}:retry`, mushroom)
  effects.push(...negativeEffects)
  budget += negativeEffects.reduce((sum, effect) => sum - effect.cost, 0)

  let positiveCount = settings.maxEffects - negativeCount
  let positiveEffects = choosePositiveEffects(random, archetype, positiveNames, positiveCount, budget, effects)
  effects.push(...positiveEffects.effects)

  return effects.map((effect) => {
    let result = { effect: effect.effect, value: effect.value }
    if (effect.strength) result.strength = effect.strength
    return result
  })
}

function effectTags(effects) {
  let tags = new Set()
  effects.forEach((effect) => {
    let name = effect.effect
    if (["Strength", "Instant Damage", "Delayed Damage", "Reload", "Initial Decaying Boost"].indexOf(name) !== -1) tags.add("Offensive")
    if (["Max Health", "Max Stamina", "Poison Immunity", "Nausea Immunity", "Regeneration"].indexOf(name) !== -1) tags.add("Defensive")
    if (["Instant Healing", "Delayed Healing", "Healing Rate", "Regeneration"].indexOf(name) !== -1) tags.add("Healing")
    if (["Speed", "View Distance"].indexOf(name) !== -1) tags.add("Mobility")
    if (["Max Stamina", "Stamina Regen"].indexOf(name) !== -1) tags.add("Stamina")
    if (["Effect Duration", "Effect Potency", "Random Buff", "Random Debuff"].indexOf(name) !== -1) tags.add("Utility")
    if (["Nausea", "Poison", "Instant Damage", "Delayed Damage"].indexOf(name) !== -1 || effect.value < 0) tags.add("Harmful")
    if (["Instant Healing", "Delayed Healing", "Healing Rate", "Regeneration"].indexOf(name) !== -1) tags.add("Recovery")
    if (["Effect Duration", "Effect Potency", "Random Buff", "Random Debuff"].indexOf(name) !== -1) tags.add("Drug Manipulation")
  })
  return tags
}

function getMaterialEffects(worldSeed, mushroom) {
  let material = Constants.Foods[mushroom]
  if (!material) return []
  let effects = generateMushroomEffects(worldSeed, mushroom)
  return Array.isArray(effects) ? effects : Object.keys(effects).map((effect) => ({ effect: effect, value: effects[effect] }))
}

function calculateMushroomCompatibility(worldSeed, mushroomA, mushroomB) {
  if (mushroomA === mushroomB) return 100
  let effectsA = getMaterialEffects(worldSeed, mushroomA)
  let effectsB = getMaterialEffects(worldSeed, mushroomB)
  let tagsA = effectTags(effectsA)
  let tagsB = effectTags(effectsB)
  let shared = [...tagsA].filter((tag) => tagsB.has(tag)).length
  let conflicts = effectsA.filter((a) => effectsB.some((b) => a.effect === b.effect && Math.sign(a.value || 1) !== Math.sign(b.value || 1))).length
  let base = 50 + shared * 10 - conflicts * 18
  let variation = Math.floor(rng(`${worldSeed}:compatibility:${[mushroomA, mushroomB].sort().join(":")}`)() * 13) - 6
  return Math.max(0, Math.min(100, base + variation))
}

function getMaterialCompatibility(worldSeed, mushroom) {
  let mushrooms = Object.keys(Constants.Foods).filter((name) => rarityFor(name) || ["RedMushroom", "BrownMushroom", "WhiteMushroom"].indexOf(name) !== -1)
  let result = {}
  mushrooms.filter((other) => other !== mushroom).forEach((other) => { result[other] = calculateMushroomCompatibility(worldSeed, mushroom, other) })
  let viable = Object.keys(result).filter((other) => result[other] >= 60)
  if (viable.length < 3) {
    Object.keys(result).sort((a, b) => result[b] - result[a]).slice(0, 3).forEach((other) => { result[other] = Math.max(result[other], 60) })
  }
  return result
}

function getGeneratedMaterial(worldSeed, mushroom) {
  let material = Constants.Foods[mushroom]
  if (!material) return null
  return Object.assign({}, material, { effects: getMaterialEffects(worldSeed, mushroom), compatibility: getMaterialCompatibility(worldSeed, mushroom) })
}

module.exports = { rarityFor, getMushroomArchetype, generateMushroomEffects, getMaterialEffects, calculateMushroomCompatibility, getMaterialCompatibility, getGeneratedMaterial }