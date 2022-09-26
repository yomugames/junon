const BaseTransientEntity = require("./../base_transient_entity")
const Protocol = require('../../../common/util/protocol')
const Constants = require('../../../common/constants.json')
const Helper = require('../../../common/helper')

class BaseFood extends BaseTransientEntity {

  static use(player, targetEntity, options) {
    return this.prototype.use(player, targetEntity, options)
  }

  setOwner(owner) {
    this.owner = owner
  }

  isRaw() {
    return false
  }

  isConsumable() {
    return true
  }

  getReload() {
    return this.getStats().reload || 500
  }

  isFood() {
    return true
  }

  static getCost() {
    let cost = this.prototype.getConstants().cost
    return cost ? cost.gold : 2
  }

  static getType() {
    return this.prototype.getType()
  }

  static isUsable() {
    return true
  }

  getType() {
    throw new Error("must implement BaseFood#getType")
  }

  getTypeName() {
    return Helper.getTypeNameById(this.getType())
  }

  use(user, entity, options) {
    if (!this.isEdible()) return

    if (entity && entity.isMob()) {
      if (entity.hasOwner()) {
        let foodValue = this.getFoodValue()
        entity.setHealth(entity.getHealth() + foodValue)
        this.playEatingSound(user)
        if (entity.setHunger) {
          entity.setHunger(entity.hunger + this.getFoodValue())
        }
        return true
      } else {
        const randomizer = Math.floor(Math.random() * 10)
        let valueReductionFactor = (1 / entity.getHealth()) * 5
        let faithValue = Math.floor(this.getFoodValue() * valueReductionFactor) + randomizer
        entity.setFaith(entity.faith + faithValue)
        this.playEatingSound(user)
        return true
      }
    }

    this.feedTo(user, options.item)
    this.playEatingSound(user)
    this.onConsumed(user)
    return true
  }

  onConsumed(user) {

  }

  playEatingSound(user) {
    let range = Constants.tileSize * 8
    let boundingBox = user.getNeighborBoundingBox(range)
    let players = user.sector.playerTree.search(boundingBox)
    players.forEach((player) => {
      player.getSocketUtil().emit(player.getSocket(), "PlaySound", { id: Protocol.definition().SoundType.Eating })
    })
  }

  isEdible() {
    let isEdible = this.getConstants().isEdible
    return typeof isEdible !== 'undefined' ? isEdible : true
  }

  feedTo(user, item) {
    user.setActiveFood(item)
    if (user.isPlayer()) {
      user.walkthroughManager.handle("eat_potatoes", { food: this })
    }
    user.setHunger(user.hunger + this.getFoodValue())
  }

  getConstantsTable() {
    throw new Error("must implement BaseFood#getConstantsTable")
  }

  getFoodValue() {
    return this.getConstants().stats.food || 0
  }

  getFoodUsageTotalDuration() {
    const foodValue = this.getFoodValue()
    if (foodValue >= 50) {
      return 15
    } else if (foodValue >= 25) {
      return 10
    } else {
      return 5
    }
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

module.exports = BaseFood
