const BaseEntity  = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const tinycolor = require("tinycolor2")

class BaseEquipment extends BaseEntity {
  constructor(game, data) {
    data.x = 0
    data.y = 0

    super(game, data)

    this.user   = data.user
    this.content = data.instance ? data.instance.content : null

    if (!this.getConstants().sprite) {
      // if we dont have custom sprite positioning in constants.json
      this.repositionSprite()
    }

  }

  animate() {
    
  }

  onPostEquip() {

  }

  stopAnimation() {
    
  }

  isUnbreakable() {
    return this.getConstants().isUnbreakable
  }

  shouldShowUsage() {
    return this.getConstants().shouldShowUsage
  }

  syncWithServer(data) {
    if (data.instance) {
      if (this.content !== data.instance.content) {
        this.content = data.instance.content
        this.onContentChanged()
      }
    }
  }

  onContentChanged() {
    
  }

  getUsageCapacity() {
    return this.getStats().usageCapacity || 100
  }

  shouldNotInteractBuildings() {
    return false
  }

  getLightColor() {
    return this.getConstants().lightColor
  }

  isWeapon() {
    return false
  }

  static isUsable() {
    return true
  }

  static getSellGroup() {
    return "Equipments"
  }

  getTypeName() {
    return this.getConstantName().replace(/([A-Z])/g, ' $1').trim() // space before capital letters
  }

  getConstantName() {
    const type = this.getType()
    let targetKlassName = ""
    const nameToTypeMap = Protocol.definition().BuildingType

    for (let name in nameToTypeMap) {
      if (nameToTypeMap[name] === type) {
        targetKlassName = name
        break
      }
    }

    return targetKlassName
  }

  static getConstantName() {
    return this.prototype.getConstantName()
  }

  isMiningEquipment() {
    return false
  }

  getSpriteContainer() {
    return this.data.user.characterSprite
  }

  static build(game, data) {
    return new this(game, data)
  }

  getType() {
    throw new Error("must implement BaseEquipment.getType")
  }

}

module.exports = BaseEquipment
