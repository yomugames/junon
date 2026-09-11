const BaseBuilding = require("./../base_building")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseDistribution = require("./../base_distribution")

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

    this.forEachSoilTile((soil, row, col) => {
      let soilNetwork = soil.getSoilNetwork()
      if (!soilNetwork) return

      soilNetwork.removeUnplanted(row, col)
      if (this.isCropHarvestable()) {
        soilNetwork.removeUnwatered(row, col)
        soilNetwork.setHarvestable(row, col)
      } else if (!this.isWatered) {
        soilNetwork.setUnwatered(row, col)
        soilNetwork.removeHarvestable(row, col)
      } else {
        soilNetwork.removeUnwatered(row, col)
        soilNetwork.removeHarvestable(row, col)
      }
    })

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

  forEachSoilTile(callback) {
    let startRow = this.getTopLeftRow()
    let startCol = this.getTopLeftCol()
    let rowCount = this.getRowCount()
    let colCount = this.getColCount()

    for (let row = startRow; row < startRow + rowCount; row++) {
      for (let col = startCol; col < startCol + colCount; col++) {
        let soil = this.container.platformMap.get(row, col)
        if (soil && soil.hasCategory("soil")) callback(soil, row, col)
      }
    }
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
    this.forEachSoilTile((soil, row, col) => {
      let soilNetwork = soil.getSoilNetwork()
      if (!soilNetwork) return

      if (this.isWatered) {
        soilNetwork.removeUnwatered(row, col)
      } else {
        soilNetwork.setUnwatered(row, col)
      }
    })

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
        item.instance.drain(10)
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

    if (this.getTypeName() === "RedSporeling" && Math.random() < 0.02) {
      this.sector.spawnMob({ x: this.getCol() * 32, y: this.getRow() * 32, type: "Mushling", count: 1 })
    } else {
      this.createDrop()
    }
    this.remove()

    if (user && user.isPlayer()) {
      this.getSocketUtil().emit(user.getSocket(), "PlaySound", { id: Protocol.definition().SoundType.HarvestPlant })
    }

    let dropTypeName = this.getItemDropTypeName()

    let data = {
      entityId: this.id,
      entityType: this.getTypeName(),
      player: "",
      yieldType: dropTypeName
    }

    if (user && user.isPlayer()) {
      data["player"] = user.getName()
    }

    this.game.triggerEvent("CropHarvested", data)
  }

  harvestForMob(mob) {
    let cropItem = this.sector.createItem(this.getItemDropType())

    mob.setHandItem(cropItem)

    let seedCount = this.getSeedCount()
    let seedItem = this.sector.createItem(this.getSeedType(), { count: seedCount })

    if (seedCount >= 1) mob.setExtraItem(seedItem)

    if (this.getConstants().isSporeling && Math.random() < 0.001) {
      this.sector.spawnMob({ x: this.getCol() * 32, y: this.getRow() * 32, type: "GhostShroom", count: 1 })
    }

    this.remove()
  }

  remove() {
    this.forEachSoilTile((soil, row, col) => {
      let soilNetwork = soil.getSoilNetwork()
      if (!soilNetwork) return

      soilNetwork.setUnplanted(row, col)
      soilNetwork.removeUnwatered(row, col)
      soilNetwork.removeHarvestable(row, col)
    })

    super.remove()
  }

  onHealthZero() {
    super.onHealthZero()
  }

  createDrop() {
    const yieldCount = this.getYieldCount()
    if (yieldCount > 0) this.sector.createDrop({ sector: this.sector, x: this.getX(), y: this.getY(), type: this.getItemDropType(), count: yieldCount })

    // 50 % chance to drop seed
    let seedCount = this.getSeedCount()
    if (seedCount > 0) this.sector.createDrop({ sector: this.sector, x: this.getX(), y: this.getY(), type: this.getSeedType(), count: seedCount })
  }

  
  getSeedType() {
    if (this.getConstants().seed) return Protocol.definition().BuildingType[this.getConstants().seed]
    return this.getType()
  }

  getYieldCount() {
    if (this.getConstants().yieldAmount) {
      if (Array.isArray(this.getConstants().yieldAmount)) {
        const randomIndex = Math.floor(Math.random() * this.getConstants().yieldAmount.length)
        return this.getConstants().yieldAmount[randomIndex]
      } else {
        return this.getConstants().yieldAmount
      }
    } else {
      return Math.floor(Math.random() * 3) + 1
    }
  }

  getSeedCount() {
    if (this.getConstants().seedAmount) {
      if (Array.isArray(this.getConstants().seedAmount)) {
        const randomIndex = Math.floor(Math.random() * this.getConstants().seedAmount.length)
        return this.getConstants().seedAmount[randomIndex]
      } else {
        return this.getConstants().seedAmount
      }
    } else {
      return Math.floor(Math.random() * 3) + 1
    }
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
    this.forEachSoilTile((soil, row, col) => {
      let soilNetwork = soil.getSoilNetwork()
      if (!soilNetwork) return

      if (this.isHarvestable) {
        soilNetwork.removeUnwatered(row, col)
        soilNetwork.setHarvestable(row, col)
      } else {
        soilNetwork.removeHarvestable(row, col)
        soilNetwork.setUnwatered(row, col)
      }
    })
    this.onStateChanged("isHarvestable")
  }

  executeTurn() {
    if (this.isHarvestable) return

    const isTenSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 10) === 0
    if (!isTenSecondInterval) return

    let growStep = this.isWatered ? 2 : 1

    const platform = this.container.platformMap.get(this.getRow(), this.getCol())
    let isOxygenatedPlatform = platform && platform.room && platform.room.isOxygenated
    if (!isOxygenatedPlatform && this.sector.settings["isOxygenEnabled"]) growStep = 0
    
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
