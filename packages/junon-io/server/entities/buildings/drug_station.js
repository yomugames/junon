
const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Helper = require('../../../common/helper')
const BaseProcessor = require("./base_processor")
const DrugGeneration = require('../../../common/drug_generation')
const DrugThermal = require('../../../common/drug_thermal')

class DrugStation extends BaseProcessor {
  constructor(container, data) {
    super(container, data)
    this.slotCount = 3
  }

  getBottleInputStorageIndex() {
    return 0
  }

  getMaterialInputStorageIndex() {
    return 1
  }

  getOutputStorageIndex() {
    return 2
  }


  onStorageChanged(item, index) {
    super.onStorageChanged(item, index)

    this.updateSuccessChanceDescription()

    if (this.canProceed()) {
      this.addProcessor(this)
    }
  }


  createOutputItem() {
    let bottleInput = this.getBottleInput()
    let materialInput = this.getMaterialInput()
    let materialsUsed = this.getMaterialsUsed(bottleInput)
    let ingredients = this.getDrugIngredients(bottleInput).concat(materialInput.getTypeName())
    let effects = this.getCalculatedDrugEffects(ingredients)
    if (!this.hasDrugIngredients(bottleInput)) {
      effects = this.mergeEffects(this.getNonMetadataDrugEffects(bottleInput), effects)
    }
    effects = this.setDrugIngredients(this.setMaterialsUsed(effects, materialsUsed + 1), ingredients)
    effects = effects.map((effect) => {
      if (typeof effect.value !== "number") return effect
      return Object.assign({}, effect, { value: Math.round(effect.value) })
    })
    effects = this.addTemperatureEffect(effects)
    let initialEffects = this.getInitialDrugEffects(effects)
    let drugTint = this.getAverageTint([
      this.getDrugTint(bottleInput),
      this.getMaterialTint(materialInput)
    ])
    
    if (!this.isSuccessfulCreation(materialsUsed)) {
      return this.createFailedDrug(drugTint, materialsUsed, ingredients)
    }

    return this.sector.createItem("Drug", {
      count: 1,
      instance: {
        effects: effects,
        effectsJson: JSON.stringify(effects),
        drugTint: drugTint,
        duration: this.getDrugDuration(initialEffects, materialInput),
        content: effects.length ? this.getEffectsDescription(initialEffects, materialInput) : ""
      }
    })
  }

  getInitialDrugEffects(effects) {
    let ingredientsEffect = effects.find((effect) => this.getEffectName(effect) === "ingredients")
    let ingredients = ingredientsEffect && ingredientsEffect.value
    return DrugThermal.getEffectiveDrugEffects(
      this.sector.game.sectorUid,
      effects.filter((effect) => this.getEffectName(effect) !== "temperature"),
      20,
      ingredients
    )
  }

  createFailedDrug(drugTint, materialsUsed, ingredients) {
    let effects = this.setDrugIngredients(this.setMaterialsUsed([
      { effect: "Failed", value: 1 },
      { effect: "Poison", value: 1 },
      { effect: "Nausea", value: 1 }
    ], materialsUsed + 1), ingredients)
    effects = this.addTemperatureEffect(effects)

    return this.sector.createItem("Drug", {
      count: 1,
      instance: {
        effects: effects,
        effectsJson: JSON.stringify(effects),
        drugTint: this.getFailedDrugTint(drugTint),
        duration: 60,
        content: "Failed Product\nPoison\nNausea"
      }
    })
  }

  getMaterialsUsed(item) {
    let materialsUsedEffect = this.getDrugEffects(item).find((effect) => this.getEffectName(effect) === "materialsUsed")
    let materialsUsed = materialsUsedEffect && this.getEffectValue(materialsUsedEffect)
    if (typeof materialsUsed === "number" && materialsUsed >= 1) return materialsUsed

    materialsUsed = item && item.instance && item.instance.materialsUsed
    return typeof materialsUsed === "number" && materialsUsed >= 1 ? materialsUsed : 1
  }

  setMaterialsUsed(effects, materialsUsed) {
    return effects.filter((effect) => this.getEffectName(effect) !== "materialsUsed").concat({
      effect: "materialsUsed",
      value: materialsUsed
    })
  }

  hasDrugIngredients(item) {
    return this.getDrugEffects(item).some((effect) => this.getEffectName(effect) === "ingredients")
  }

  getDrugIngredients(item) {
    let ingredientsEffect = this.getDrugEffects(item).find((effect) => this.getEffectName(effect) === "ingredients")
    let ingredients = ingredientsEffect && ingredientsEffect.value
    return Array.isArray(ingredients) ? ingredients.filter((ingredient) => this.getMaterialConstants(ingredient)) : []
  }

  setDrugIngredients(effects, ingredients) {
    return effects.filter((effect) => this.getEffectName(effect) !== "ingredients").concat({
      effect: "ingredients",
      value: ingredients
    })
  }

  getNonMetadataDrugEffects(item) {
    return this.getDrugEffects(item).filter((effect) => {
      let name = this.getEffectName(effect)
      return name !== "materialsUsed" && name !== "ingredients" && name !== "temperature"
    })
  }

  addTemperatureEffect(effects, temperature = 20) {
    temperature = Number(temperature)
    if (!Number.isFinite(temperature)) temperature = 20
    return effects.filter((effect) => this.getEffectName(effect) !== "temperature").concat({ effect: "temperature", value: Math.min(200, temperature) })
  }

  getCalculatedDrugEffects(ingredients) {
    let compatibility = this.getAverageCompatibility(ingredients)
    let multiplier = compatibility / 100
    let copiesByIngredient = {}
    let effects = []

    ingredients.slice().sort().forEach((ingredient) => {
      let constants = this.getMaterialConstants(ingredient)
      if (!constants) return

      let copyIndex = copiesByIngredient[ingredient] || 0
      copiesByIngredient[ingredient] = copyIndex + 1
      let copyMultiplier = Math.pow(0.35, copyIndex)
      let ingredientEffects = Array.isArray(constants.effects) ? constants.effects.map((effect) => {
        return Object.assign({}, effect, { value: typeof effect.value === "number" ? effect.value * copyMultiplier * multiplier : effect.value })
      }) : Object.keys(constants.effects || {}).map((effect) => {
        return {
          effect: effect,
          value: constants.effects[effect] * copyMultiplier * multiplier
        }
      })
      effects = this.mergeEffects(effects, ingredientEffects)
    })

    if (compatibility < 40) {
      effects = this.mergeEffects(effects, [{ effect: "Nausea", value: 40 - compatibility }])
    }
    if (compatibility < 25) {
      effects = this.mergeEffects(effects, [{ effect: "Poison", value: 25 - compatibility }])
    }

    return effects
  }

  getAverageCompatibility(ingredients) {
    let uniqueIngredients = Array.from(new Set(ingredients)).filter((ingredient) => this.getMaterialConstants(ingredient))
    if (uniqueIngredients.length < 2) return 100

    let compatibilities = []
    uniqueIngredients.forEach((ingredient, index) => {
      uniqueIngredients.slice(index + 1).forEach((otherIngredient) => {
        compatibilities.push(this.getCompatibility(ingredient, otherIngredient))
      })
    })
    return compatibilities.reduce((sum, compatibility) => sum + compatibility, 0) / compatibilities.length
  }

  getCompatibility(ingredient, otherIngredient) {
    let constants = this.getMaterialConstants(ingredient)
    let otherConstants = this.getMaterialConstants(otherIngredient)
    if (constants && typeof constants.compatibility?.[otherIngredient] === "number") {
      return constants.compatibility[otherIngredient]
    }
    if (otherConstants && typeof otherConstants.compatibility?.[ingredient] === "number") {
      return otherConstants.compatibility[ingredient]
    }
    return 100
  }

  getMaterialConstants(ingredient) {
    return DrugGeneration.getGeneratedMaterial(this.sector.game.sectorUid, ingredient)
  }

  getMaterialTintByName(ingredient) {
    let constants = this.getMaterialConstants(ingredient)
    return constants && constants.drugTint
  }

  getSuccessChance(materialsUsed) {
    if (materialsUsed === 1) return 100
    if (materialsUsed === 2) return 60
    if (materialsUsed === 3) return 30
    if (materialsUsed === 4) return 15
    if (materialsUsed <= 9) return Math.round(15 * Math.pow(0.58, materialsUsed - 4))
    return 15 * parseFloat(Math.pow(0.58, materialsUsed - 4).toFixed(1))
  }

  isSuccessfulCreation(materialsUsed) {
    return Math.random() * 100 < this.getSuccessChance(materialsUsed)
  }

  getFailedDrugTint(drugTint) {
    if (typeof drugTint !== "string" || !/^[0-9a-f]{6}$/i.test(drugTint)) return drugTint

    return [0, 2, 4].map((offset) => {
      let channel = parseInt(drugTint.substr(offset, 2), 16)
      return Math.round((255 - channel) * 0.55).toString(16).padStart(2, "0")
    }).join("")
  }

  updateSuccessChanceDescription() {
    let drugInput = this.getBottleInput()
    if (drugInput && drugInput.isDrug()) {
      let materialsUsed = this.getMaterialsUsed(drugInput)
      this.setBuildingContent(this.getSuccessChance(materialsUsed) + "% Chance for Success")
    } else {
      this.resetMenuDescription()
    }
  }

  resetMenuDescription() {
    this.setBuildingContent(Constants.Buildings.DrugStation.menuDescription)
  }

  getDrugEffects(item) {
    if (!item || !item.instance) return []
    if (item.instance.effects) return this.normalizeEffects(item.instance.effects)
    if (!item.instance.effectsJson) return []

    try {
      return this.normalizeEffects(JSON.parse(item.instance.effectsJson))
    } catch (error) {
      return []
    }
  }

  getMaterialEffects(item) {
    let constants = item && item.getKlass(item.type).getConstants()
    let effects = constants && constants.effects || {}
    effects = effects.bonus || effects
    return Array.isArray(effects) ? effects : Object.keys(effects).map((effect) => {
      return { effect: effect, value: effects[effect] }
    })
  }

  normalizeEffects(effects) {
    if (Array.isArray(effects)) return effects
    if (!effects || typeof effects !== "object") return []
    return Object.keys(effects).map((effect) => {
      return { effect: effect, value: effects[effect] }
    })
  }

  getDrugTint(item) {
    return item && item.instance && item.instance.drugTint
  }

  getMaterialTint(item) {
    let constants = item && item.getKlass(item.type).getConstants()
    return constants && constants.drugTint
  }

  getEffectName(effect) {
    if (typeof effect === "string") return effect
    return effect.effect || effect.name || effect.type || Object.keys(effect)[0]
  }

  getEffectValue(effect) {
    if (typeof effect === "number") return effect
    if (typeof effect === "string") return 1
    if (typeof effect.value === "number") return effect.value
    if (typeof effect.amount === "number") return effect.amount
    return effect[this.getEffectName(effect)]
  }

  mergeEffects(...effectLists) {
    let merged = []
    effectLists.flat().forEach((effect) => {
      if (!effect) return
      let name = this.getEffectName(effect)
      let value = this.getEffectValue(effect)
      let existing = merged.find((candidate) => this.getEffectName(candidate) === name)
      if (!existing) {
        if (typeof effect === "string") {
          merged.push({ effect: effect, value: value })
        } else if (typeof effect === "number") {
          merged.push({ value: value })
        } else {
          merged.push(Object.assign({}, effect))
        }
        return
      }

      if (typeof existing.value === "number") existing.value += value
      else if (typeof existing.amount === "number") existing.amount += value
      else existing[name] = (existing[name] || 0) + value
    })
    return merged
  }

  getEffectsDescription(effects, materialInput) {
    let visibleEffects = effects.filter((effect) => ["materialsUsed", "ingredients", "temperature"].indexOf(this.getEffectName(effect)) === -1)
    visibleEffects.sort((a, b) => Number(this.isNegativeEffect(a)) - Number(this.isNegativeEffect(b)))
    let lines = visibleEffects.map((effect) => {
      let name = this.getEffectName(effect)
      let value = this.getEffectValue(effect)
      if (["Poison", "Nausea", "Poison Immunity", "Nausea Immunity", "Random Buff", "Random Debuff"].indexOf(name) !== -1) {
        return name
      }

      let suffix = ["Max Health", "Max Stamina", "Strength", "Speed", "Reload", "Healing Rate", "Effect Duration", "Effect Potency", "Initial Decaying Boost", "View Distance"].indexOf(name) !== -1 ? "%" : ""
      let sign = value > 0 ? "+" : ""
      return name + ": " + sign + value + suffix
    })
    return lines.concat("Duration: " + this.getDrugDuration(effects, materialInput) + " seconds").join("\n")
  }

  isNegativeEffect(effect) {
    let name = this.getEffectName(effect)
    let value = this.getEffectValue(effect)
    return value < 0 || ["Failed", "Poison", "Nausea", "Instant Damage", "Delayed Damage", "Random Debuff"].indexOf(name) !== -1
  }

  getDrugDuration(effects, materialInput) {
    let durationModifier = effects.find((effect) => this.getEffectName(effect) === "Effect Duration")
    let modifier = durationModifier ? this.getEffectValue(durationModifier) : 0
    let materialConstants = materialInput && materialInput.getKlass(materialInput.type).getConstants()
    let baseDuration = 60
    return Math.round(baseDuration * (1 + modifier / 100))
  }

  getAverageTint(tints) {
    let colors = tints.map((tint) => {
      if (typeof tint !== "string") return null
      return tint.replace(/^#/, "")
    }).filter((tint) => tint && /^[0-9a-f]{6}$/i.test(tint))
    if (!colors.length) return null

    let channels = [0, 2, 4].map((offset) => {
      let total = colors.reduce((sum, color) => sum + parseInt(color.substr(offset, 2), 16), 0)
      return Math.round(total / colors.length).toString(16).padStart(2, "0")
    })
    return channels.join("")
  }

  onPowerChanged() {
    super.onPowerChanged()

    if (this.canProceed()) {
      this.addProcessor(this)
    }
  }

  canProceed() {
    if (!this.hasMetPowerRequirement()) return false

    let outputItem = this.getOutputItem()
    if (outputItem) return false

    return this.isProcessable(this.getBottleInput()) && this.isProcessable(this.getMaterialInput())
  }

  processInputItem() {
    if (this.canProceed()) {
      this.addProcessor(this)
    } else {
      this.removeProcessor()
    }
  }

  isProcessable(inputItem) {
    return inputItem && !inputItem.isSyringe() && (inputItem.isDrugBottle() || inputItem.isDrug() || inputItem.isDrugMaterial())
  }

  getBottleInput() {
    return this.get(this.getBottleInputStorageIndex())
  }

  getMaterialInput() {
    return this.get(this.getMaterialInputStorageIndex())
  }

  onProgressChanged() {
    if (!this.hasReachedFullProgress()) return

    this.progress = 0
    let bottleInput = this.getBottleInput()
    let materialInput = this.getMaterialInput()
    if (!this.isProcessable(bottleInput) || !this.isProcessable(materialInput)) {
      this.removeProcessor()
      return
    }

    let outputItem = this.createOutputItem()
    if (outputItem) {
      this.storeAt(this.getOutputStorageIndex(), outputItem)
      bottleInput.consume()
      materialInput.consume()
      this.resetMenuDescription()
    }

    this.notifyViewSubscribers()
  }

  getTotalOresStored() {
    let item = this.getOutputItem()
    if (!item) return 0

    return item && item.count
  }

  getConstantsTable() {
    return "Buildings.DrugStation"
  }

  getType() {
    return Protocol.definition().BuildingType.DrugStation
  }

  // canStore(index, item) {
  //   if (index === this.getOutputStorageIndex()) return false
  //   if (item && index === this.getBottleInputStorageIndex()) return item.isDrugBottle() || item.isDrug()
  //   if (item && index === this.getMaterialInputStorageIndex()) return item.isDrugMaterial()
  //   return !item
  // }

  canStoreInBuilding(index, item) {
    if (!item) return true
    if (index === this.getOutputStorageIndex()) return false
    if (item && index === this.getBottleInputStorageIndex()) return !item.isSyringe() && (item.isDrugBottle() || item.isDrug())
    if (item && index === this.getMaterialInputStorageIndex()) return item.isDrugMaterial()
    return false
  }

  canStoreAt(index) {
    return index >= 0 && index < this.getStorageCount()
  }

}

module.exports = DrugStation

