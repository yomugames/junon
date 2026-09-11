const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseProcessor = require('./base_processor')
const DrugThermal = require('../../../common/drug_thermal')

class ThermalProcessor extends BaseProcessor {
  getMaximumDrugTemperature() { return 200 }

  onConstructionFinished() {
    super.onConstructionFinished()
    if (this.isHeating && this.canProceed()) this.addProcessor()
  }

  onNetworkAssignmentChanged(networkName) {
    super.onNetworkAssignmentChanged(networkName)
    if (networkName !== 'fuelNetwork' || !this.isHeating) return
    if (this.canProceed()) this.addProcessor()
    else this.removeProcessor()
  }

  getInputStorageIndices() { return [0] }
  getOutputStorageIndex() { return null }

  getHeatingRate() {
    let intensity = this.heatingIntensity === undefined ? 50 : this.heatingIntensity
    intensity = Math.max(1, Math.min(100, intensity))
    return 2.5 * (intensity / 100)
  }

  getResourceConsumption(name) {
    if (name === 'fuel') return 2
    return super.getResourceConsumption(name)
  }

  hasLocalFuel(amount = this.getResourceConsumption('fuel')) {
    return this.resourceStorages && this.resourceStorages.fuel && this.getResourceStored('fuel') >= amount
  }

  hasFuelAvailable(amount = this.getResourceConsumption('fuel')) {
    return this.hasLocalFuel(amount) || !!(this.fuelNetwork && this.fuelNetwork.hasEnoughStored(amount))
  }

  consumeFuel(amount = this.getResourceConsumption('fuel')) {
    if (this.hasLocalFuel(amount)) return this.consumeResource('fuel', amount)
    if (this.fuelNetwork) return this.fuelNetwork.consumeResource(this)
    return 0
  }

  getWorldSeed() { return this.sector.game.sectorUid }
  getDrug() { return this.get(0) }

  isValidDrug(item) {
    return !!(item && !item.isSyringe() && typeof item.isDrug === 'function' && item.isDrug())
  }

  getDrugEffects(item) {
    if (!item || !item.instance) return []
    if (Array.isArray(item.instance.effects)) return item.instance.effects
    if (typeof item.instance.effectsJson !== 'string') return []
    try {
      let effects = JSON.parse(item.instance.effectsJson)
      return Array.isArray(effects) ? effects : []
    } catch (error) {
      return []
    }
  }

  getDrugTemperature(effects) {
    let temperature = effects.find((effect) => effect && effect.effect === 'temperature')
    let value = temperature && Number(temperature.value)
    return Number.isFinite(value) ? Math.min(this.getMaximumDrugTemperature(), value) : 20
  }

  getDrugMaterials(effects) {
    let ingredients = effects.find((effect) => effect && effect.effect === 'ingredients')
    return ingredients && Array.isArray(ingredients.value) ? ingredients.value : []
  }

  getDrugThermalProfile(effects) {
    return DrugThermal.getReactionProfile(this.getWorldSeed(), this.getDrugMaterials(effects))
  }

  setDrugTemperature(drug, temperature) {
    let effects = this.getDrugEffects(drug).filter((effect) => effect && effect.effect !== 'temperature')
    temperature = Number(temperature)
    if (!Number.isFinite(temperature)) temperature = 20
    effects.push({ effect: 'temperature', value: Math.min(this.getMaximumDrugTemperature(), temperature) })
    drug.instance.effects = effects
    drug.instance.effectsJson = JSON.stringify(effects)
  }

  getEffectiveDrugEffects() {
    let drug = this.getDrug()
    if (!drug || !drug.instance) return []
    let effects = this.getDrugEffects(drug)
    let temperature = this.getDrugTemperature(effects)
    let materials = this.getDrugMaterials(effects)
    return DrugThermal.getEffectiveDrugEffects(this.getWorldSeed(), effects.filter((effect) => effect.effect !== 'temperature'), temperature, materials)
  }

  isFailedDrug(drug) {
    return this.getDrugEffects(drug).some((effect) => effect && effect.effect === 'Failed')
  }

  getFailedDrugEffects(effects) {
    let metadata = effects.filter((effect) => effect && ['materialsUsed', 'ingredients', 'temperature'].indexOf(effect.effect) !== -1)
    return [
      { effect: 'Failed', value: 1 },
      { effect: 'Poison', value: 1 },
      { effect: 'Nausea', value: 1 }
    ].concat(metadata)
  }

  failDrug(drug) {
    if (this.isFailedDrug(drug)) return
    let effects = this.getDrugEffects(drug)
    drug.instance.effects = this.getFailedDrugEffects(effects)
    drug.instance.effectsJson = JSON.stringify(drug.instance.effects)
  }

  getEffectValue(effect) {
    if (typeof effect.value === 'number') return effect.value
    return Number(effect.value)
  }

  getDrugDuration(effects) {
    let duration = effects.find((effect) => effect && effect.effect === 'Effect Duration')
    let modifier = duration ? this.getEffectValue(duration) : 0
    return Math.round(60 * (1 + modifier / 100))
  }

  getDrugDescription(effects) {
    if (this.isFailedDrug({ instance: { effects: effects } })) return 'Failed Product\nPoison\nNausea'
    let visibleEffects = effects.filter((effect) => effect && ['materialsUsed', 'ingredients', 'temperature'].indexOf(effect.effect) === -1)
    let lines = visibleEffects.map((effect) => {
      let name = effect.effect
      let value = this.getEffectValue(effect)
      if (['Poison', 'Nausea', 'Poison Immunity', 'Nausea Immunity', 'Random Buff', 'Random Debuff'].indexOf(name) !== -1) return name
      let suffix = ['Max Health', 'Max Stamina', 'Strength', 'Speed', 'Reload', 'Healing Rate', 'Effect Duration', 'Effect Potency', 'Initial Potency', 'View Distance'].indexOf(name) !== -1 ? '%' : ''
      let sign = value > 0 ? '+' : ''
      return name + ': ' + sign + value + suffix
    })
    return lines.concat('Duration: ' + this.getDrugDuration(effects) + ' seconds').join('\n')
  }

  finalizeRemovedDrug(drug) {
    if (!drug || !drug.instance) return
    let effects = this.getDrugEffects(drug)
    let descriptionEffects = this.isFailedDrug(drug) ? effects : DrugThermal.getEffectiveDrugEffects(
      this.getWorldSeed(),
      effects.filter((effect) => effect && effect.effect !== 'temperature'),
      this.getDrugTemperature(effects),
      this.getDrugMaterials(effects)
    )
    drug.instance.content = this.getDrugDescription(descriptionEffects)
    drug.instance.effectsJson = JSON.stringify(effects)
  }

  onStorageChanged(item, index) {
    let drug = this.getDrug()
    if (drug && this.isValidDrug(drug) && drug.instance) {
      this.setDrugTemperature(drug, this.getDrugTemperature(this.getDrugEffects(drug)))
    } else if (this.isValidDrug(item)) {
      this.finalizeRemovedDrug(item)
    }
    if (!this.isValidDrug(drug)) this.setHeating(false)
    if (this.isHeating && this.canProceed()) this.addProcessor()
    this.updateContent()
    this.notifyViewSubscribers()
  }

  onPowerChanged() {
    if (this.isHeating && this.canProceed()) this.addProcessor()
  }

  canProceed() {
    return this.hasMetPowerRequirement() && this.isValidDrug(this.getDrug()) && !this.isFailedDrug(this.getDrug())
  }

  isProcessable(item) {
    return this.isValidDrug(Array.isArray(item) ? item[0] : item)
  }

  setHeating(isHeating) {
    let next = !isHeating && this.isValidDrug(this.getDrug())
    if (this.isHeating === next) {
      this.onStateChanged('isHeating')
      this.updateContent()
      this.notifyViewSubscribers()
      return
    }
    this.isHeating = next
    this.onStateChanged('isHeating')
    if (next) this.addProcessor()
    else this.removeProcessor()
    this.updateContent()
    this.notifyViewSubscribers()
  }

  setHeatingIntensity(intensity) {
    intensity = Number(intensity)
    if (!Number.isFinite(intensity)) return
    intensity = Math.max(1, Math.min(100, Math.round(intensity)))
    if (this.heatingIntensity === intensity) return
    this.heatingIntensity = intensity
    this.onStateChanged('heatingIntensity')
    this.updateContent()
    this.notifyViewSubscribers()
  }

  updateDrugTemperature() {
    let drug = this.getDrug()
    if (!this.isValidDrug(drug) || !drug.instance) return
    let effects = this.getDrugEffects(drug)
    let temperature = this.getDrugTemperature(effects) + this.getHeatingRate()
    this.setDrugTemperature(drug, temperature)
    let profile = this.getDrugThermalProfile(effects)
    if (DrugThermal.isFailedTemperature(profile, temperature)) {
      this.failDrug(drug)
      this.setHeating(true)
    }
    this.onStateChanged('storage')
    this.updateContent()
  }

  executeTurn() {
    if (!this.isHeating || this.game.timestamp % Constants.physicsTimeStep !== 0) return
    if (!this.hasMetPowerRequirement() || !this.isValidDrug(this.getDrug())) return
    if (!this.hasFuelAvailable()) return
    if (this.consumeFuel() < this.getResourceConsumption('fuel')) return
    this.updateDrugTemperature()
    this.notifyViewSubscribers()
  }

  handleThermalProcessorAction(player, data) {
    if (!player || !player.canAccessStorage(this)) return
    if (data.action === 'toggleHeating') {
      let drug = this.getDrug()
      if (!this.isValidDrug(drug)) {
        player.showError('No Drug Inserted', { isWarning: true })
        return
      }
      this.setHeating(data.isHeating)
      return
    }
    if (data.action === 'setHeatingIntensity') {
      this.setHeatingIntensity(data.intensity)
      return
    }
    if (data.action === 'checkTemperature') {
      let drug = this.getDrug()
      if (!this.isValidDrug(drug)) {
        player.showError('No Drug Inserted', { isWarning: true })
        return
      }
      let temperature = this.getDrugTemperature(this.getDrugEffects(drug))
      player.showError(`Temperature: ${temperature.toFixed(2)}°C`, { isWarning: true })
    }
  }

  updateContent() {
    if (!this.getDrug()) this.setBuildingContent(Constants.Buildings.ThermalProcessor.menuDescription)
    else this.setBuildingContent('Drug Inserted')
  }

  createOutputItem() { return null }
  getConstantsTable() { return 'Buildings.ThermalProcessor' }
  getType() { return Protocol.definition().BuildingType.ThermalProcessor }

  canStore(index, item) {
    if (!item) return true
    if (index !== null && index !== 0) return false
    return !this.get(0) && this.isValidDrug(item)
  }

  canStoreAt(index) {
    return index >= 0 && index < this.getStorageCount()
  }

  applyData(data) {
    super.applyData(data)
    this.isHeating = !!data.isHeating
    this.heatingIntensity = typeof data.heatingIntensity === 'number' ? Math.max(1, Math.min(100, data.heatingIntensity)) : 50
  }
}

module.exports = ThermalProcessor
