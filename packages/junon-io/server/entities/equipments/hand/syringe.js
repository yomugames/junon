const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Drainable = require("./../../../../common/interfaces/drainable")

class Syringe extends HandEquipment {

  onEquipmentConstructed() {
    this.initDrainable()
  }

  use(player, targetEntity) {
//     super.use(player, targetEntity)
// 
//     if (this.isFull()) {
//       this.inject(targetEntity)
//     } else {
//       this.draw(targetEntity)
//     }
  }

  inject(entity) {
    if (!entity.isInjectable()) return

    let sample = this.drainSample()
    this.applySample(sample, entity)
  }

  applySample(sample, entity) {
    if (entity.isInjectableContainer()) {
      entity.setContent(sample)
      return
    }

    switch(sample) {
      case "Player":
        entity.setHealth(entity.health + 5)
        break
      default:
        // nothing
    }
  }

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
