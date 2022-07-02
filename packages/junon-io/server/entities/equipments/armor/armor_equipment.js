const BaseEquipment = require("./../base_equipment")
const Protocol = require('../../../../common/util/protocol')
const SocketUtil = require("junon-common/socket_util")

class ArmorEquipment extends BaseEquipment {
  applyVelocity(player, velocity) {
    player.body.velocity = velocity // by default, set immediately
  }

  reduceDamage(amount, sourceEntity) {
    if (sourceEntity && sourceEntity.hasCategory("elemental")) {
      return amount
    }

    let newAmount = amount - this.getDefense()
    if (newAmount < 0) newAmount = 0

    return newAmount
  }

  getDefense() {
    return this.getStats().defense || 0
  }

  use(player, targetEntity, options = {}) {
    return true
  }

  getDampingFactor() {
    return 0.8 // by default
  }

  hasOxygen() {
    return false
  }

  isArmor() {
    return true
  }

  getRole() {
    return Protocol.definition().EquipmentRole.Armor
  }
  
  getImmunity() {
    return []
  }

  getOxygen() {
    return this.oxygen
  }

  setOxygen(oxygen, player) {
    let prevOxygen = this.oxygen
    if (oxygen > this.getMaxOxygen()) {
      this.oxygen = this.getMaxOxygen()
    } else if (oxygen < 0) {
      this.oxygen = 0
    } else {
      this.oxygen = oxygen
    }

    if (prevOxygen !== this.oxygen) {
      this.onOxygenChanged(oxygen, player)
    }
  }

  getUnfilledOxygen() {
    return this.getMaxOxygen() - this.oxygen
  }

  onOxygenChanged(oxygen, user) {
    if (!user) return
    if (!user.isPlayer()) return

    let player = user

    // client instances equipments using the item id..
    let data = {
      entityId: this.item.getId(),
      oxygen: oxygen
    }

    SocketUtil.emit(player.getSocket(), "UpdateStats", data)
  }

  getMaxOxygen() {
    return this.getConstants().stats.oxygen
  }

  onEquipmentConstructed() {
    this.oxygen = this.getMaxOxygen()
  }

  onStorageChanged(storage) {
    if (storage.isInventory()) {
      if (storage.user && storage.user.isPlayer()) {
        // this is so that client would immediaely see oxygen change in bar..
        storage.user.forceOxygenConsumption()
      }
    } else {
      // equipped to building
      if (this.owner && !this.owner.isSector()) {
        this.owner.onOxygenChanged()
      }
    }
  }

  increaseOxygen(amount) {
    this.setOxygen(this.getOxygen() + amount, this.getOwner())
  }

  applyVelocity(player, velocity) {
    if (player.isDirectionKeysHeld()) {
      player.accelerate(velocity)
    }
  }
}

module.exports = ArmorEquipment