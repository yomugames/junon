const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Drainable = require("./../../../../common/interfaces/drainable")

class Syringe extends MeleeEquipment {

  onEquipmentConstructed() {
    this.initDrainable(0)
  }

  use(player, targetEntity, options = {}) {
    const item = options.item || this.item
    const instance = item && item.instance
    if (!instance || instance.usage <= 0 || (!instance.effects && !instance.effectsJson)) return false

    player.activateDrug(item)
    return true
  }

  isConsumable() {
    return true
  }

  // inject(entity) {
  //   if (!entity.isInjectable()) return

  //   let sample = this.drainSample()
  //   this.applySample(sample, entity)
  // }

  // applySample(sample, entity) {
  //   if (entity.isInjectableContainer()) {
  //     entity.setContent(sample)
  //     return
  //   }

  //   switch(sample) {
  //     case "Player":
  //       entity.setHealth(entity.health + 5)
  //       break
  //     default:
  //       // nothing
  //   }
  // }

  drainSample() {
    let sample = this.getContent()
    this.setContent(null)
    return sample
  }

  draw(entity) {
    if (!entity.isInjectable()) return

    let sample = entity.drainSample()
    this.setContent(sample)
  }

  getType() {
    return Protocol.definition().BuildingType.Syringe
  }

  getConstantsTable() {
    return "Equipments.Syringe"
  }

  getUsageCapacity() {
    return this.getResourceCapacity("liquid")
  }

}

module.exports = Syringe
