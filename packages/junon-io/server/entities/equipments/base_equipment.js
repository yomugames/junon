const BaseTransientEntity = require("./../base_transient_entity")
const Drainable = require('../../../common/interfaces/drainable')
const Helper = require('../../../common/helper')

class BaseEquipment extends BaseTransientEntity {

  constructor(item, options) {
    super(item.game)

    this.sector = this.game.sector
    this.item = item
    this.type = item.type
    this.owner = item.owner
    this.isUnbreakable = options.isUnbreakable

    this.initDrainable(this.getUsageCapacity()) // start at max durability
    this.onEquipmentConstructed()
  }

  onEquipmentConstructed() {

  }

  onStorageChanged(storage) {

  }

  getRotatedAngle() {
    if (!this.owner) return 0
    return this.owner.getRotatedAngle()
  }

  isMeleeEquipment() {
    return false
  }

  canDamage(target) {
    if (!this.owner) return false
    return this.owner.canDamage(target)
  }

  getStorage() {
    return this.item.storage
  }

  setOwner(owner) {
    this.owner = owner
  }

  getOwner() {
    return this.owner
  }

  isConsumable() {
    return false
  }

  isArmor() {
    return false
  }

  shouldBeFullOnSpawn() {
    return this.isBreakable()
  }

  isBreakable() {
    if (this.isUnbreakable) return false
    if (this.getConstants().isUnbreakable) return false

    return this.isDrainable()
  }

  getMeleeRange() {
    return this.getStats().meleeRange || this.getRange()
  }

  use(player, targetEntity, options = {}) {
    if (this.isBreakable()) {
      this.setUsage(this.usage - 1)
    }

    let typeName = this.getTypeName()
    this.game.triggerEvent("ItemUse:" + typeName, { userId: player.getId() })

    this.item.setLastUsedTimestamp()

    return true
  }

  static use(player, targetEntity, options = {}) {
    if (options.item) {
      let typeName = this.prototype.getTypeName()
      player.game.triggerEvent("ItemUse:" + typeName, { userId: player.getId() })
      options.item.setLastUsedTimestamp()
      
    }

    return true
  }

  onOwnerPositionChanged(owner) {

  }

  onOwnerAngleChanged(owner) {
    
  }

  getType() {
    throw new Error("must implement BaseEquipment#getType")
  }

  getTypeName() {
    return Helper.getTypeNameById(this.getType())
  }

  getConstantsTable() {
    throw new Error("must implement BaseEquipment#getConstantsTable")
  }

  remove() {
    super.remove()
  }

  static isUsable() {
    return false
  }

  toJson() {
    return this.getType()
  }

  isMiningEquipment() {
    return false
  }

  isWeapon() {
    return !!this.getConstants().isWeapon
  }

  isFireArm() {
    return !!this.getConstants().isFireArm
  }

  isThrowable() {
    return !!this.getConstants().isThrowable
  }

  shouldNotRemoveOnBreak() {
    return this.getConstants().shouldNotRemoveOnBreak 
  }

  getReload() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.item.id]) {
        return this.sector.entityCustomStats[this.item.id].reload
      } else if (this.sector.itemCustomStats[this.type]) {
        return this.sector.itemCustomStats[this.type].reload
      }
    }

    return this.getStats().reload || 500
  }

  static getRange() {
    return this.prototype.getRange()
  }

  getRange() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.item.id]) {
        return this.sector.entityCustomStats[this.item.id].range
      } else if (this.sector.itemCustomStats[this.type]) {
        return this.sector.itemCustomStats[this.type].range
      }
    }

    return super.getRange() || 20
  }

}

Object.assign(BaseEquipment.prototype, Drainable.prototype, {
  getUsageCapacity() {
    return this.sector?.entityCustomStats[this.item.id]?.capacity || this.sector?.itemCustomStats[this.getType()]?.capacity || this.getStats().usageCapacity || 100
  },
  onUsageChanged() {
    if (this.owner && this.owner.isPlayer()) {
      this.owner.onEquipmentUsageChanged(this)
    }

    if (this.usage === 0) {
      if (!this.shouldNotRemoveOnBreak()) {
        this.item.consume()
      }
    }
  }

})



module.exports = BaseEquipment
