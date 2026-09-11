const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const DrugThermal = require('../../../common/drug_thermal')

class DrugVat extends BaseBuilding {

  getMaximumDrugTemperature() {
    return 200
  }

  getConstantsTable() {
    return "Buildings.DrugVat"
  }

  getType() {
    return Protocol.definition().BuildingType.DrugVat
  }

  isDrainable() {
    return true
  }

  getBottleFillAmount() {
    return 40
  }

  getSyringeFillAmount() {
    return 8
  }

  isSyringe(item) {
    return !!(item && typeof item.isSyringe === "function" && item.isSyringe()) ||
      !!(item && typeof item.getType === "function" && item.getType() === Protocol.definition().BuildingType.Syringe)
  }

  getFillAmount(item) {
    return this.isSyringe(item) ? this.getSyringeFillAmount() : this.getBottleFillAmount()
  }

  applyData(data) {
    super.applyData(data)

    if (data.drugEffectsJson) {
      try {
        this.drugEffects = JSON.parse(data.drugEffectsJson)
      } catch (error) {
        this.drugEffects = null
      }
    } else if (data.drugEffects) {
      this.drugEffects = typeof data.drugEffects === "string" ? JSON.parse(data.drugEffects) : data.drugEffects
    }
    if (Array.isArray(this.drugEffects)) {
      this.drugEffects = this.withTemperatureEffect(this.drugEffects, this.getTemperature(this.drugEffects))
      this.drugEffectsJson = JSON.stringify(this.drugEffects)
    }
    if (data.drugTint) {
      this.drugTint = data.drugTint
    }
  }

  getDrugEffects(drug) {
    if (drug && drug.instance) {
      if (Array.isArray(drug.instance.effects) && drug.instance.effects.some((effect) => this.getEffectName(effect) === "temperature")) {
        return drug.instance.effects
      }
      if (drug.instance.effectsJson) {
        try {
          return JSON.parse(drug.instance.effectsJson)
        } catch (error) {
          return null
        }
      }
    }
    if (Array.isArray(drug.effects) && drug.effects.some((effect) => this.getEffectName(effect) === "temperature")) return drug.effects
    if (!drug.effectsJson) return null

    try {
      return JSON.parse(drug.effectsJson)
    } catch (error) {
      return null
    }
  }

  getDrugTemperature(drug) {
    let effects = this.getDrugEffects(drug)
    return this.getTemperature(effects)
  }

  getDrugMaterials(effects) {
    let ingredients = effects && effects.find((effect) => this.getEffectName(effect) === "ingredients")
    return ingredients && Array.isArray(ingredients.value) ? ingredients.value : []
  }

  getEffectiveDrugEffects(effects) {
    let temperature = this.getTemperature(effects)
    return DrugThermal.getEffectiveDrugEffects(
      this.sector.game.sectorUid,
      this.withoutTemperatureEffect(effects),
      temperature,
      this.getDrugMaterials(effects)
    )
  }

  getTemperature(effects) {
    let temperature = effects && effects.find((effect) => this.getEffectName(effect) === "temperature")
    let value = temperature && Number(this.getEffectValue(temperature))
    return Number.isFinite(value) ? Math.min(this.getMaximumDrugTemperature(), value) : 20
  }

  withTemperatureEffect(effects, temperature = 20) {
    temperature = Number(temperature)
    if (!Number.isFinite(temperature)) temperature = 20
    temperature = Math.min(this.getMaximumDrugTemperature(), temperature)
    return effects.filter((effect) => this.getEffectName(effect) !== "temperature").concat({ effect: "temperature", value: temperature })
  }

  withoutTemperatureEffect(effects) {
    return effects.filter((effect) => this.getEffectName(effect) !== "temperature").map((effect) => {
      let baseEffect = Object.assign({}, effect)
      if (typeof effect.baseValue === "number") baseEffect.value = effect.baseValue
      delete baseEffect.baseValue
      delete baseEffect.thermalModifier
      delete baseEffect.thermalProfile
      return baseEffect
    })
  }

  getEffectName(effect) {
    if (typeof effect === "string") return effect
    return effect.effect || effect.name || effect.type || Object.keys(effect)[0]
  }

  getEffectValue(effect) {
    if (typeof effect === "number") return effect
    if (typeof effect === "string") return 1
    if (effect.value !== undefined) return Number(effect.value)
    if (effect.amount !== undefined) return Number(effect.amount)
    return Number(effect[this.getEffectName(effect)])
  }

  getDrugDuration(effects) {
    let durationEffect = effects.find((effect) => this.getEffectName(effect) === "Effect Duration")
    let modifier = durationEffect ? this.getEffectValue(durationEffect) : 0
    return Math.round(60 * (1 + modifier / 100))
  }

  isFailedDrug(effects) {
    return Array.isArray(effects) && effects.some((effect) => this.getEffectName(effect) === "Failed" && this.getEffectValue(effect) === 1)
  }

  getEffectsDescription(effects) {
    if (this.isFailedDrug(effects)) return "Failed Product\nPoison\nNausea"
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
    return lines.concat("Duration: " + this.getDrugDuration(effects) + " seconds").join("\n")
  }

  isNegativeEffect(effect) {
    let name = this.getEffectName(effect)
    let value = this.getEffectValue(effect)
    return value < 0 || ["Failed", "Poison", "Nausea", "Instant Damage", "Delayed Damage", "Random Debuff"].indexOf(name) !== -1
  }

  hasCompatibleDrug(drug) {
    let drugEffects = this.getDrugEffects(drug)
    if (!drugEffects) return false
    let liquidStorage = this.resourceStorages.liquid
    let fillAmount = this.getFillAmount(drug)
    if (liquidStorage.getUsage() + fillAmount > liquidStorage.getUsageCapacity()) return false
    if (liquidStorage.isEmpty()) return true

    if (this.isFailedDrug(this.drugEffects) || this.isFailedDrug(drugEffects)) {
      return this.isFailedDrug(this.drugEffects) && this.isFailedDrug(drugEffects)
    }

    if (Math.abs(this.getDrugTemperature(drug) - this.getTemperature(this.drugEffects)) > 5) return false

    return this.constructor.isEqual(this.withoutTemperatureEffect(this.drugEffects), this.withoutTemperatureEffect(drugEffects))
  }

  replaceHandEquipment(user, type, instance = {}) {
    let previousItem = user.inventory.get(user.equipIndex)
    if (!previousItem) return
    let previousStorageIndex = user.equipIndex

    previousItem.remove()
    let newItem = user.createItem(type, { instance: instance })
    user.inventory.storeAt(previousStorageIndex, newItem)
    user.setHandEquipment(newItem)
  }

  insertDrug(user, drug) {
    let drugEffects = this.getDrugEffects(drug)
    if (!this.hasCompatibleDrug(drug)) return

    if (this.resourceStorages.liquid.isEmpty()) {
      this.drugEffects = this.withTemperatureEffect(drugEffects, this.getDrugTemperature(drug))
      this.drugEffectsJson = JSON.stringify(this.drugEffects)
      this.drugTint = drug.instance && drug.instance.drugTint || drug.drugTint
      this.onStateChanged("drugEffects")
      this.onStateChanged("drugEffectsJson")
      this.onStateChanged("drugTint")
    }

    this.fillResource("liquid", this.getFillAmount(drug))
    this.replaceHandEquipment(user, this.isSyringe(drug) ? "Syringe" : "DrugBottle")
  }

  extractDrug(user, container) {
    let liquidStorage = this.resourceStorages.liquid
    let fillAmount = this.getFillAmount(container)
    if (liquidStorage.isEmpty() || !this.drugEffects || liquidStorage.getUsage() < fillAmount) return

    liquidStorage.setUsage(liquidStorage.getUsage() - fillAmount)
    let drugEffects = this.withTemperatureEffect(this.drugEffects, this.getTemperature(this.drugEffects))
    let effectiveDrugEffects = this.isFailedDrug(drugEffects) ? this.withoutTemperatureEffect(drugEffects) : this.getEffectiveDrugEffects(drugEffects)
    let extractedEffects = effectiveDrugEffects.concat({ effect: "temperature", value: this.getTemperature(drugEffects) })
    let drugTint = this.drugTint
    if (liquidStorage.isEmpty()) {
      this.drugEffects = null
      this.drugEffectsJson = null
      this.drugTint = null
      this.onStateChanged("drugEffects")
      this.onStateChanged("drugEffectsJson")
      this.onStateChanged("drugTint")
    }

    let extractedInstance = {
      effects: extractedEffects,
      effectsJson: JSON.stringify(extractedEffects),
      drugTint: drugTint,
      duration: this.getDrugDuration(effectiveDrugEffects),
      content: this.getEffectsDescription(effectiveDrugEffects)
    }
    if (this.isSyringe(container)) extractedInstance.usage = fillAmount
    this.replaceHandEquipment(user, this.isSyringe(container) ? "Syringe" : "Drug", extractedInstance)
  }

  interact(user) {
    let handEquipment = user.getHandEquipment()
    if (!handEquipment) return

    if (handEquipment.getType() === Protocol.definition().BuildingType.Drug) {
      this.insertDrug(user, handEquipment)
    } else if ([Protocol.definition().BuildingType.DrugBottle, Protocol.definition().BuildingType.Syringe].indexOf(handEquipment.getType()) !== -1) {
      this.extractDrug(user, handEquipment)
    }
  }

}

module.exports = DrugVat

