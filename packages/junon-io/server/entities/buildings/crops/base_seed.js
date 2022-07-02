const BaseBuilding = require("./../base_building")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseDistribution = require("./../base_distribution")
const SocketUtil = require("junon-common/socket_util")

class BaseSeed extends BaseDistribution {

  static isPositionValid(container, x, y, w, h, angle, player) {
    const hits = container.platformMap.hitTestTile(this.prototype.getBox(x, y, w, h))
    const isOnSoil = hits.every((hit) => { return hit.entity && hit.entity.hasCategory("soil") })

    return isOnSoil &&
           !container.distributionMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  onConstructionFinished() {
    super.onConstructionFinished()

    this.container.addCrop(this)

    if (this.isHarvestable) {
      this.setHealth(this.getMaxHealth())
    }

    let soilNetwork = this.getSoilNetwork()
    if (soilNetwork) {
      soilNetwork.removeUnplanted(this.getRow(), this.getCol())
      if (!this.isCropHarvestable()) {
        soilNetwork.setUnwatered(this.getRow(), this.getCol())
      }
    }

    if (this.isPlacedByPlayerAction) {
      let placer = this.getPlacer()
      if (placer) {
        this.game.triggerEvent("CropPlanted", {
          entityId: this.id,
          entityType: this.getTypeName(),
          player: placer.getName()
        })
      }
    }
  }

  getSoilNetwork() {
    let soil = this.container.platformMap.get(this.getRow(), this.getCol())
    if (!soil) return null

    return soil.getSoilNetwork()
  }

  initDestroyable(initialHealth) {
    super.initDestroyable(initialHealth)

    if (!initialHealth) {
      this.health = 1
    }
  }

  onUsageChanged() {
    super.onUsageChanged()

    if (this.getResourceStored("liquid") === 0) {
      this.setIsWatered(false)
    } else {
      this.setIsWatered(true)
    }

  }

  setIsWatered(isWatered) {
    let prevIsWatered = this.isWatered
    if (prevIsWatered !== isWatered) {
      this.isWatered = isWatered
      this.onWateredChanged()
    }
  }

  onWateredChanged() {
    let soilNetwork = this.getSoilNetwork()
    if (soilNetwork) {
      if (this.isWatered) {
        soilNetwork.removeUnwatered(this.getRow(), this.getCol())
      } else {
        soilNetwork.setUnwatered(this.getRow(), this.getCol())
      }
    }

    this.onStateChanged("isWatered")
  }

  hasCategory(category) {
    // even though we have liquidCapacity, we dont want it to be part of network
    if (category === "liquid_storage") {
      return false
    } else {
      return super.hasCategory(category)
    }
  }


  interact(user) {
    let item = user.getActiveItem()

    if (this.isHarvestable) {
      this.harvest(user)
    } else {
      if (item && item.isType("WaterBottle")) {
        this.water(user)
        item.instance.drain(20)
      }
    }
  }

  water(user){
    this.setIsWatered(true) // onUsageChanged is not called immediately, so we need to manually set this
    this.fillResource("liquid", 100)

    if (user && user.isPlayer()) {
      user.walkthroughManager.handle("water_crop")
    }

    if (user) {
      this.game.triggerEvent("CropWatered", { entityId: this.getId(), entityType: this.getType(), actorId: user.getId() })
    }
  }

  isInjectable() {
    let isInjectable = this.getConstants().isInjectable
    if (typeof isInjectable === "undefined") return true

    return isInjectable
  }

  isInjectableContainer() {
    const isInjectableContainer = this.getConstants().isInjectableContainer
    if (typeof isInjectableContainer === "undefined") return true

    return isInjectableContainer
  }

  harvest(user) {
    if (this.owner && user.isPlayer() && !this.game.isPvP()) {
      if (user.getRole() && !user.getRole().isAllowedTo("HarvestCrops")) {
        user.showError("Permission Denied")
        return
      }
    }
      
    this.createDrop()
    this.remove()

    if (user && user.isPlayer()) {
      SocketUtil.emit(user.getSocket(), "PlaySound", { id: Protocol.definition().SoundType.HarvestPlant })
    }

    let dropTypeName = this.getItemDropTypeName()

    let data = {
      entityId: this.id,
      entityType: this.getTypeName(),
      player: "",
      yieldType: dropTypeName
    }

    if (user.isPlayer()) {
      data["player"] = user.getName()
    }

    this.game.triggerEvent("CropHarvested", data)
  }

  harvestForMob(mob) {
    let cropItem = this.sector.createItem(this.getItemDropType())

    mob.setHandItem(cropItem)

    let seedCount = Math.floor(Math.random() * 3) 
    let seedItem = this.sector.createItem(this.getType(), { count: seedCount })

    mob.setExtraItem(seedItem)

    this.remove()
  }

  remove() {
    let soilNetwork = this.getSoilNetwork()
    if (soilNetwork) {
      soilNetwork.setUnplanted(this.getRow(), this.getCol())
      soilNetwork.removeHarvestable(this.getRow(), this.getCol())
    }

    super.remove()
  }

  onHealthZero() {
    super.onHealthZero()
  }

  createDrop() {
    this.sector.createDrop({ sector: this.sector, x: this.getX(), y: this.getY(), type: this.getItemDropType() })

    // 50 % chance to drop seed
    let seedCount = Math.floor(Math.random() * 3) + 1
    this.sector.createDrop({ sector: this.sector, x: this.getX(), y: this.getY(), type: this.getType(), count: seedCount })
  }

  isCrop() {
    return true
  }

  getItemDropType() {
    let yieldItem = this.getConstants().yield
    if (yieldItem) {
      return Protocol.definition().BuildingType[yieldItem]
    }

    throw new Error("must implement BaseSeed#getItemDropType")
  }

  getItemDropTypeName() {
    return Protocol.definition().BuildingType[this.getItemDropType()]
  }

  setIsHarvestable(isHarvestable) {
    if (this.isHarvestable !== isHarvestable) {
      this.isHarvestable = isHarvestable
      this.onIsHarvestableChanged()
    }
  }

  onIsHarvestableChanged() {
    let soilNetwork = this.getSoilNetwork()
    if (soilNetwork) {
      if (this.isHarvestable) {
        soilNetwork.removeUnwatered(this.getRow(), this.getCol())
        soilNetwork.setHarvestable(this.getRow(), this.getCol())
      }
    }
    this.onStateChanged("isHarvestable")
  }

  executeTurn() {
    if (this.isHarvestable) return

    const isTenSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 10) === 0
    if (!isTenSecondInterval) return

    let growStep = this.isWatered ? 2 : 1
    growStep = growStep * this.sector.buildSpeed

    if (this.hasEffect("miasma")) {
      this.consumeMiasma()
    } else {
      this.setHealth(this.health + growStep)
    }

    if (this.isCropHarvestable()) {
      this.setIsHarvestable(true)
    }

    let growthPercentageWhereWaterReset = 35
    if (this.health % growthPercentageWhereWaterReset === 0) {
      this.setIsWatered(false)
    }
  }

  getMiasmaDamage() {
    return 10
  }

  isCropHarvestable() {
    return this.health >= this.getMaxHealth()
  }

  unregister() {
    super.unregister()
    delete this.container.crops[this.id]
  }

  getCollisionMask() {
    return 0
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Resource
  }

  getIsHarvestable() {
    if (!this.isHarvestable) return false
    return this.isHarvestable
  }

  getType() {
    throw new Error("must implement BaseSeed#getType")
  }

  damage(amount, attacker) {
    if (this.sector.isLobby()) return

    super.damage(amount, attacker)
  }

}

module.exports = BaseSeed
