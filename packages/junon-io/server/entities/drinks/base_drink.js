const BaseTransientEntity = require("./../base_transient_entity")
const Helper = require('../../../common/helper')

class BaseDrink extends BaseTransientEntity {

  static use(player, targetEntity, options) {
    return this.prototype.use(player, targetEntity, options)
  }

  setOwner(owner) {
    this.owner = owner
  }

  isConsumable() {
    return true
  }

  static getCost() {
    let cost = this.prototype.getConstants().cost
    return cost ? cost.gold : 2
  }


  getReload() {
    return this.getStats().reload || 500
  }

  static getType() {
    return this.prototype.getType()
  }

  getTypeName() {
    return Helper.getTypeNameById(this.getType())
  }

  static isUsable() {
    return true
  }

  getType() {
    throw new Error("must implement BaseDrink#getType")
  }

  use(user, entity, options) {
    if (options.item) {
      options.item.setLastUsedTimestamp()
    }
    
    if (user.hasActiveFood()) {
      if (user.isPlayer()) {
        user.showError("You just ate")
      }
      return false
    } else {
      this.feedToPlayer(user, options.item)
      return true
    }
  }

  feedToPlayer(user, item) {
    user.setThirst(user.thirst + this.getThirstValue())
    user.setStamina(user.stamina + this.getStaminaValue())
  }

  getFoodUsageTotalDuration() {
    return 2
  }

  isFood() {
    return false
  }

  getConstantsTable() {
    throw new Error("must implement BaseDrink#getConstantsTable")
  }

  getThirstValue() {
    return this.getConstants().stats.thirst || 0
  }

  getStaminaValue() {
    return this.getConstants().stats.stamina || 0
  }

  toJson() {
    return this.getType()
  }

  isMiningEquipment() {
    return false
  }

  getRange() {
    return this.getConstants().stats.range || 20
  }

}

module.exports = BaseDrink
