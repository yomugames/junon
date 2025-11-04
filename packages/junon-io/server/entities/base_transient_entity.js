const Definable = require("./../../common/interfaces/definable")
const Resource = require("./../../common/interfaces/resource")
const Categorizable = require("./../../common/interfaces/categorizable")

class BaseTransientEntity {

  constructor(game, id) {
    this.id = id || game.generateEntityId()
    this.game = game
    this.game.registerEntity(this)

    this.level = 0
  }

  static isConsumable() {
    return this.prototype.isConsumable()
  }

  static onConsumed(user) {

  }

  isRPItem() {
    return false;
  }
  
  hasMetRPRequirements() {
    return this.sector.RP.level >= this.getRequiredRP()
  }

  getRequiredRP() {
    if(!isRPItem) return 0;

    if(this.getConstants().requiredRP) {
      return this.getConstants().requiredRP;
    }
    throw new Error("Must implement getRequiredRP or add inside constants.json")
  }

  setHealth() {

  }

  isTower() {
    return false
  }

  isFood() {
    return false
  }

  isFlamable() {
    return this.getConstants().isFlamable || false
  }

  isWeapon() {
    return false
  }

  shouldBeFullOnSpawn() {
    return true
  }

  isBuilding() {
    return false
  }

  isWall() {
    return false
  }

  isCarpet() {
    return false
  }
  
  isMineable() {
    return false
  }

  canBeInteracted() {
    return false
  }

  getSector() {
    return this.game.sector  
  }

  isMob() {
    return false
  }

  isCorpse() {
    return false
  }

  isTeam() {
    return false
  }

  isSector() {
    return false
  }

  isPlayerData() {
    return false
  }

  static getType() {
    return this.prototype.getType()
  }

  shouldShowCooldown() {
    return this.getConstants().shouldShowCooldown
  }

  getId() {
    return this.id
  }

  isAnimatable() {
    return this.getConstants().isAnimatable
  }

  getRange() {
    return this.getConstants().stats.range
  }

  getRequirements() {
    return Object.assign({}, this.getConstants().requirements)
  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  static getCost() {
    let requirements = this.prototype.getConstants().requirements

    let requirementsCost = 0
    for (let klassName in requirements) {
      let count = requirements[klassName]
      let klass = JunonServer.getItemKlassByName(klassName)
      let cost = klass.getCost() * count
      requirementsCost += cost
    }

    if (requirementsCost && !this.prototype.getConstants().isCostIndependent) {
      return requirementsCost
    } else {
      let cost = this.prototype.getConstants().cost
      return cost ? cost.gold : 2
    }
  }

  getCost() {
    return this.constructor.getCost()
  }

  static isUsable() {
    return false
  }

  isBridge() {
    return false
  }

  isInjectable() {
    return this.getConstants().isInjectable || false
  }

  isInjectableContainer() {
    return this.getConstants().isInjectableContainer || false
  }

  getStats(level) {
    return this.getConstants().stats || {}
  }

  getContent() {
    return this.content
  }

  remove() {
    this.game.unregisterEntity(this)
  }

  unregisterEventListeners() {

  }

  static getConstants() {
    return this.prototype.getConstants()
  }

  isPlayer() {
    return false
  }

  isItem() {
    return false
  }


}

Object.assign(BaseTransientEntity.prototype, Definable.prototype, {
})

Object.assign(BaseTransientEntity.prototype, Resource.prototype, {
})

Object.assign(BaseTransientEntity.prototype, Categorizable.prototype, {
})

module.exports = BaseTransientEntity
