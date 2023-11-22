const Protocol = require('../../common/util/protocol')
const Constants = require('../../common/constants.json')
const Helper = require('../../common/helper')
const Buildings = require("./buildings/index")
const Equipments = require("./equipments/index")
const Ores = require("./ores/index")
const Bars = require("./bars/index")
const Foods = require("./foods/index")
const Drinks = require("./drinks/index")
const Ammos = require("./ammos/index")
const Terrains = require("./terrains/index")
const BaseTransientEntity = require("./base_transient_entity")
const ExceptionReporter = require('junon-common/exception_reporter')

class InvalidBuildingTypeError extends Error {}


class Item extends BaseTransientEntity {
  constructor(owner, typeIdOrName, options = {}) {
    super(owner.game)

    this.options = options

    if (typeof typeIdOrName === "string") {
      this.type = Protocol.definition().BuildingType[typeIdOrName]
    } else {
      this.type = typeIdOrName
    }

    if (typeof this.type === "undefined") {
      throw new InvalidBuildingTypeError("Missing BuildingType definition for type " + typeIdOrName)
    }

    this.owner = owner

    this.count = options.count ? options.count : 1

    if (isNaN(this.count)) {
      this.count = 1
    }

    if (this.count > 99) this.count = 99
    if (this.count <= 0) this.count = 1

    let usage
    let content

    if (options.instance && options.instance.constructor.name === "ItemInstance") {
      usage = options.instance.usage
      content = options.instance.content
      delete options["instance"]
    }

    this.initMaterializable(options.instance)

    if (this.instance && content) {
      this.instance.content = content
      this.instance.usage = this.instance.getUsageCapacity()
    }

    if (this.instance && usage) {
      this.instance.usage = usage
    }
  }

  hasInstance() {
    return this.instance
  }

  getSector() {
    return this.game.sector
  }

  splitStack() {

  }

  setLastUsedTimestamp() {
    this.lastUsedTimestamp = this.game.timestamp

    if (this.instance && this.instance.shouldShowCooldown()) {
      if (this.owner) {
        this.owner.onLastUsedTimestampChanged(this)
      }
    }
  }

  isFullyStacked() {
    return this.count === this.getMaxStack()
  }

  getMaxStack() {
    if (this.isGold()) return 100000

    return Constants.maxStackCount
  }

  getCost() {
    const klass = this.getKlass(this.type)
    if (!klass) return 500
    return klass.getCost()
  }

  getCooldown() {
    return this.getReload() / 1000
  }

  getReload() {
    if (!this.instance) {
      const klass = this.getKlass(this.type)
      if (!klass) return 1
      return (klass.prototype.getReload() || 500) 
    }

    return (this.instance.getReload() || 500) 
  }

  getCooldownInMilliseconds() {
    return this.getCooldown() * 1000
  }

  isType(typeName) {
    const klass = this.getKlass(this.type)
    if (!klass) return false
    return klass.prototype.getType() === Protocol.definition().BuildingType[typeName]
  }

  isSyringe() {
    const klass = this.getKlass(this.type)
    const klassType = this.getKlassType(this.type)
    if (!klass) return false

    return klassType === "equipment" && klass.prototype.getType() === Protocol.definition().BuildingType.Syringe
  }

  canUseImmediately(user) {
    if (!this.lastUsedTimestamp) return true

    let cooldown = this.getCooldown()

    if (user.hasEffect("rage")) {
      cooldown = cooldown / 2
    }

    let seconds = (this.game.timestamp - this.lastUsedTimestamp) / Constants.physicsTimeStep
    let remaining = cooldown - seconds
    return remaining <= 0
  }

  isItem() {
    return true
  }

  isEdible() {
    if (!this.isFood()) return false

    let klass = this.getKlass(this.type)
    if (!klass) return false
    return klass.prototype.isEdible()
  }

  isFood() {
    const klassType = this.getKlassType(this.type)
    return klassType === "food"
  }

  isDrug() {
    const klass = this.getKlass(this.type)
    if (!klass) return false
    return klass.prototype.hasCategory("drug")
  }

  isFoodIngredient() {
    let klass = this.getKlass(this.type)
    if (!klass) return false
    return klass.prototype.getConstants().isIngredient
  }

  isNameTag() {
    const klass = this.getKlass(this.type)
    if (!klass) return false

    return klass.prototype.getType() === Protocol.definition().BuildingType.NameTag
  }

  isDrink() {
    const klassType = this.getKlassType(this.type)
    return klassType === "drink"
  }

  isOre() {
    const klassType = this.getKlassType(this.type)
    return klassType === "ore"
  }

  isAlloy() {
    const klassType = this.getKlassType(this.type)
    return klassType === "alloy"
  }

  isFlower() {
    let klass = this.getKlass(this.type)
    return klass && klass.prototype.getConstants().isFlower
  }

  isBottle() {
    const klass = this.getKlass(this.type)
    if (!klass) return false

    if (klass.prototype.getType() === Protocol.definition().BuildingType.Bottle) {
      return true
    }

    if (klass.prototype.getType() === Protocol.definition().BuildingType.WaterBottle) {
      return true
    }

    return false
  }

  isBar() {
    const klassType = this.getKlassType(this.type)
    return klassType === "bar"
  }

  isArmor() {
    const klass = this.getKlass(this.type)
    return klass && klass.prototype.isArmor()
  }

  isDismantler() {
    const klass = this.getKlass(this.type)
    const klassType = this.getKlassType(this.type)
    if (!klass) return false

    return klassType === "equipment" && klass.prototype.getType() === Protocol.definition().BuildingType.Dismantler
  }

  initMaterializable(instance) {
    if (!this.isEquipment()) return
    let klass = this.getKlass(this.type)
    if (!klass) return
    if (klass.getConstants().isStackable) return

    if (instance) {
      this.instance = instance
    } else {
      const klass = this.getKlass(this.type)
      this.instance = new klass(this, this.options)
    }
  }

  getOwner() {
    return this.owner
  }

  setOwner(owner) {
    this.owner = owner
    if (this.instance) {
      this.instance.setOwner(owner)
    }
  }

  hasCategory(category) {
    if (this.instance) {
      return this.instance.hasCategory(category)
    } else {
      return false
    }
  }

  getContent() {
    return this.instance && this.instance.content
  }

  static isMiningEquipment(data) {
    if (!data) return false

    const klass = this.getKlass(data.type)
    const klassType = this.getKlassType(data.type)
    if (!klass) return false

    return klassType === "equipment" && klass.prototype.isMiningEquipment()
  }

  static isEquipment(type) {
    return this.getKlassType(type) === "equipment"
  }

  isEquipment() {
    return this.constructor.isEquipment(this.type)
  }

  isStackableType() {
    return this.constructor.isStackableType(this.type)
  }

  static isStackableType(type) {
    let klass = this.getKlass(type)
    if (!klass) return false

    if (klass.prototype.getConstants().isStackable) {
      return true
    }

    return !this.isEquipment(type)
  }

  getEquipmentRole() {
    let klass = this.getKlass(this.type)
    return klass && klass.prototype.getRole()
  }

  use(player, targetEntity, options = {}) {
    let itemInstance = this.instance ? this.instance : this.getKlass(this.type)
    if (!itemInstance) return

    if (typeof itemInstance.use !== 'function') {
      if (this.alreadyReported) return
      this.alreadyReported = true
      let name = this.instance ? itemInstance.constructor.name : itemInstance.name
      this.game.captureException(new Error("itemInstance.use " + name))
    }

    options.item = this
    let isSuccessful = itemInstance.use(player, targetEntity, options)

    if (this.isFireArmOrThrowable()) {
      if (isSuccessful) {
        this.game.triggerEvent("ItemUsed", { 
          itemType: this.getTypeName(),
          playerId: player.getId(),
          player: player.getName()
        })
      }
    } else {
      this.game.triggerEvent("ItemUsed", { 
        itemType: this.getTypeName(),
        playerId: player.getId(),
        player: player.getName()
      })
    }

    if (isSuccessful) {
      if (itemInstance.isConsumable()) {
        this.game.triggerEvent("ItemConsumed", { 
          itemType: this.getTypeName(),
          playerId: player.getId(),
          player: player.getName()
        })
        this.consume()
      }
    }
  }

  isDelayedConsumption() {
    if (this.isDrug()) return true
    if (this.isDrink()) return true

    if (this.isFood()) {
      const klass = this.getKlass(this.type)
      return klass && klass.prototype.isEdible()
    }
  }

  consume() {
    this.reduceCount(1)
  }

  consumeAll() {
    this.setCount(0)
  }

  getTypeName() {
    return Helper.getTypeNameById(this.type)
  }

  getType() {
    return this.type
  }

  static getRequiredOperations(requirements, inventoryInput) {
    let operations = []

    for (let index in inventoryInput) {
      let item = inventoryInput[index]
      if (!item) continue

      let typeName = item.getTypeName()
      let isRequirement = requirements[typeName]
      if (isRequirement ) {
        if (this.passesRequirement(typeName, item)) {
          let requiredCount = requirements[typeName]
          let deductible = Math.min(requiredCount, item.count)
          requirements[typeName] -= deductible
          operations.push({ item: item, count: deductible })
        } else {

        }
      }
    }

    return operations
  }

  static passesRequirement(typeName, item) {
    if (typeName === "BloodBottle") {
      return item.instance.isFull()
    }

    return true
  }

  getFailureReason() {
    const requirements = this.getRequirements()
    if (requirements["BloodBottle"]) return "Insufficient Blood"

    return null
  }

  craft(inventoryInput) {
    if (this.isCraftable(inventoryInput)) {
      const requirements = this.getRequirements()
      let operations = this.constructor.getRequiredOperations(requirements, inventoryInput)

      operations.forEach((operation) => {
        operation.item.reduceCount(operation.count)
      })

      return true
    } else {
      return false
    }
  }

  isCraftable(inventoryInput) {
    const requirements = this.getRequirements()
    return this.constructor.canMeetRequirements(requirements, inventoryInput)
  }

  static canMeetRequirements(requirements, inventoryInput) {
    let operations = this.getRequiredOperations(requirements, inventoryInput)

    let remainingRequirementCount = Object.values(requirements)
                                          .reduce((sum, count) => { return sum + count  }, 0)
    return remainingRequirementCount === 0
  }

  hasSufficientAmount() {
    if (this.getTypeName() === "BloodBottle") {
      return this.instance.isFull()
    }

    return true
  }

  reduceCount(delta) {
    let amountReduced = this.count - delta < 0 ? this.count : delta
    this.setCount(this.count - delta)
    return amountReduced
  }

  increaseCount(delta) {
    this.setCount(this.count + delta)
  }

  getCount() {
    return this.count
  }

  setCount(count) {
    if (count < 0) {
      this.count = 0
    } else {
      this.count = count
    }

    if (this.owner) {
      this.owner.onItemCountChanged(this)
    }

    if (this.storage) {
      this.storage.onStorageChanged(this, this.getIndex())
    }

    if (this.isDepleted()) {
      this.remove()
    }
  }

  onStorageChanged(storage) {
    if (this.instance) {
      this.instance.onStorageChanged(storage)
    }
  }


  remove() {
    super.remove()

    this.clientMustDelete = true

    // this.setOwner(this.getSector())

    if (this.instance) {
      this.instance.remove()
    }

    if (this.storage) {
      this.storage.removeItem(this)
    }


    if (this.equipmentItem) {
      this.equipmentItem.remove()
    }
  }


  canBeClaimedBy(player) {
    if (!this.storage) return true

    let storageDistance = this.getSector().game.distance(this.storage.getX(), this.storage.getY(), player.getX(), player.getY())
    return storageDistance < Constants.interactDistance
  }

  isGold() {
    return this.type === Protocol.definition().BuildingType.Gold
  }

  getRequirements() {
    const klass = this.getKlass(this.type)
    if (!klass) return {}

    let buildSpeedFactor = this.game.sector.buildSpeed
      
    let requirements = klass.prototype.getRequirements()

    for (let key in requirements) {
      requirements[key] = Math.ceil(requirements[key] / buildSpeedFactor)
      requirements[key] *= this.count
    }

    return requirements
  }

  getKlassType(type) {
    return this.constructor.getKlassType(type)
  }

  isAmmo() {
    return this.getKlassType(this.type) === "ammos"
  }

  isGrenade() {
    return this.type === Protocol.definition().BuildingType.Grenade
  }

  isBulletAmmo() {
    return this.type === Protocol.definition().BuildingType.BulletAmmo
  }

  isMissileAmmo() {
    return this.type === Protocol.definition().BuildingType.Missile
  }

  isSeed() {
    if (!this.getKlass(this.type)) return false
      
    return this.getKlass(this.type).prototype.hasCategory("seed")
  }

  isCrop() {
    return this.getKlass(this.type).prototype.hasCategory("crop")
  }

  isBuilding() {
    return this.getKlassType(this.type) === "building"
  }

  isWeapon() {
    if (this.getKlassType(this.type) !== "equipment") return false

    return Equipments.forType(this.type).prototype.isWeapon()
  }

  getDamage() {
    if (this.isWeapon()) return this.instance.getEquipmentDamage()
    return 0
  }

  getAttackRange() {
    if (this.isWeapon()) return this.instance.getRange()
    return 0
  }

  isFireArmOrThrowable() {
    if (this.getKlassType(this.type) !== "equipment") return false

    return Equipments.forType(this.type).prototype.isFireArm() ||
           Equipments.forType(this.type).prototype.isThrowable() 
  }

  isFireArmOrThrowableOrMelee() {
    if (this.getKlassType(this.type) !== "equipment") return false

    return Equipments.forType(this.type).prototype.isFireArm() ||
           Equipments.forType(this.type).prototype.isThrowable() ||
           Equipments.forType(this.type).prototype.isMeleeEquipment() 
  }

  isFlamethrower() {
    if (this.getKlassType(this.type) !== "equipment") return false

    return this.type === Protocol.definition().BuildingType.FlameThrower
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
    if (klass) return "ammos"

    klass = Terrains.forType(type)
    if (klass) return "terrains"

    return null
  }

  isDesiredItem(itemType) {
    if (itemType === 'food') {
      return this.isEdible()
    }

    if (itemType === 'food_ingredient') {
      return this.isFoodIngredient()
    }

    if (itemType === 'ammo') {
      return this.isAmmo()
    }

    if (itemType === 'seed') {
      return this.isSeed()
    }

    if (itemType === 'bottle') {
      return this.isBottle()
    }

    if (itemType === 'ore') {
      return this.isOre()
    }

    return this.type === itemType
  }



  getKlass(type) {
    return this.constructor.getKlass(type)
  }

  static getFoodKlassByName(name) {
    return Foods[name]
  }

  static getDrinkKlassByName(name) {
    return Drinks[name]
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

    return null
  }

  setStorage(storage, index) {
    this.storage = storage
    this.storageIndex = index
    this.index = index
  }

  getIndex() {
    return this.index
  }

  isDepleted() {
    return this.count <= 0
  }

  isUsableEquipment() {
    const klass = this.getKlass(this.type)
    return klass && klass.isUsable()
  }

  isAnimatable() {
    if (!this.instance) return false
    return this.instance.isAnimatable()
  }

}

Item.InvalidBuildingTypeError = InvalidBuildingTypeError

module.exports = Item
