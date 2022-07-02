const Buildings = require("./buildings/index")
const Equipments = require("./equipments/index")
const Ores = require("./ores/index")
const Bars = require("./bars/index")
const Foods = require("./foods/index")
const Drinks = require("./drinks/index")
const Ammos = require("./ammos/index")
const Terrains = require("./terrains/index")
const Helper = require("./../../../common/helper")
const Protocol = require("./../../../common/util/protocol")

class Item {

  static isUsableEquipment(data) {
    const klass = this.getKlass(data.type)
    return klass.isUsable()
  }

  static getCookableItems() {
    const cookableFoodKlasses = Foods.getCookables()
  }

  static isMiningEquipment(data) {
    if (!data) return false
    const klass = this.getKlass(data.type)
    const klassType = this.getKlassType(data.type)

    return klassType === "equipment" && klass.prototype.isMiningEquipment()
  }

  static isSyringe(data) {
    const klass = this.getKlass(data.type)
    const klassType = this.getKlassType(data.type)

    return klassType === "equipment" && klass.prototype.getType() === Protocol.definition().BuildingType.Syringe
  }

  static isGil(type) {
    return parseInt(type) === Protocol.definition().BuildingType.Gold
  }

  static hasThrowDestination(type) {
    const klass = Equipments.forType(type)
    if (!klass) return false

    return klass.prototype.getConstants().isThrowable
  }

  static isNameTag(type) {
    return type === Protocol.definition().BuildingType.NameTag
  }

  static getKlassType(type) {
    let klass = Buildings.forType(type)
    if (klass) return "building"

    klass = Equipments.forType(type)
    if (klass) return "equipment"

    klass = Ores.forType(type)
    if (klass) return "ore"

    klass = Bars.forType(type)
    if (klass) return "bar"

    klass = Foods.forType(type)
    if (klass) return "food"

    klass = Drinks.forType(type)
    if (klass) return "drink"

    klass = Ammos.forType(type)
    if (klass) return "ammo"

    klass = Terrains.forType(type)
    if (klass) return "terrain"

    throw new Error("no Buildings, Equipment, Ore, Bar, Food klass found for type " + type)
  }

  static getKlassByName(name) {
    const type = Protocol.definition().BuildingType[name]
    return this.getKlass(type)
  }

  static getKlass(type) {
    let klass = Buildings.forType(type)
    if (klass) return klass

    klass = Equipments.forType(type)
    if (klass) return klass

    klass = Ores.forType(type)
    if (klass) return klass

    klass = Bars.forType(type)
    if (klass) return klass

    klass = Foods.forType(type)
    if (klass) return klass

    klass = Drinks.forType(type)
    if (klass) return klass

    klass = Ammos.forType(type)
    if (klass) return klass

    klass = Terrains.forType(type)
    if (klass) return klass

    throw new Error("no Buildings, Equipment, Ore, Food found for type " + type)
  }

  static getRequirements(type) {
    const klass = this.getKlass(type)
    return klass.prototype.getRequirements()
  }

  static getCraftRequirements(type, player) {
    const klass = this.getKlass(type)
    const requirementsByName = klass.prototype.getRequirements()

    let requirements = []

    for (let name in requirementsByName) {
      let count = requirementsByName[name]
      let klass = this.getKlassByName(name)
      let supply = player.getRequirementInventorySupply(klass)
      requirements.push({ name: klass.getTypeName(), klass: klass, count: count, supply: supply })
    }

    return requirements
  }

  getTypeName() {
    return Helper.getTypeNameById(this.type)
  }

  static getMissingResources(type, inventoryInput) {
    const requirements = this.getRequirements(type)
    let missing = {}

    for (var i = 0; i < inventoryInput.length; i++) {
      let itemData = inventoryInput[i]
      if (!itemData) continue

      let typeName = Helper.getTypeNameById(itemData.type)
      let isRequirement = requirements[typeName]
      if (isRequirement) {
        let requiredCount = requirements[typeName]
        let deductible = Math.min(requiredCount, itemData.count)
        requirements[typeName] -= deductible
      }
    }

    for (let name in requirements) {
      if (requirements[name] > 0) missing[name] = true
    }

    return missing
  }

  static getWidth(type) {
    return this.getKlass(type).prototype.getWidth()
  }

  static getHeight(type) {
    return this.getKlass(type).prototype.getHeight()
  }

  static getSpritePath(type) {
    const klass = this.getKlass(type)

    return klass.prototype.getSpritePath()
  }
}

module.exports = Item
