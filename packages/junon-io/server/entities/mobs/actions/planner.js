const Actions = require("./index")
const Protocol = require('../../../../common/util/protocol')
const ExceptionReporter = require('junon-common/exception_reporter')
const Constants = require('../../../../common/constants.json')
const Helper = require('../../../../common/helper')
const Item = require("../../item")

class Planner {

  constructor(entity) {
    this.entity = entity
    this.game = this.entity.game
    this.sector = this.entity.sector
    this.pathFinder = this.entity.sector.pathFinder

    this.objective = null

    this.CLOSE_DISTANCE = Constants.tileSize * 2

    this.triedStoveIds = {}
  }

  getClosestFoodStorage() {
    let result
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let storage = chunkRegion.getFoodStorage(this.entity.owner)
        if (storage) result = storage
        return storage
      },
      neighborStopCondition: () => { return false }
    })

    return result
  }

  getClosestWaterSource() {
    let result
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let storage = chunkRegion.getWaterSource(this.entity.owner)
        if (storage) result = storage
        return storage
      },
      neighborStopCondition: () => { return false }
    })

    return result
  }

  getClosestWaterSource() {
    let result
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let storage = chunkRegion.getWaterSource(this.entity.owner)
        if (storage) result = storage
        return storage
      },
      neighborStopCondition: () => { return false }
    })

    return result
  }

  getClosestCorpse() {
    let corpse
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let item = chunkRegion.getUnclaimedCorpse()
        if (item) corpse = item
        return item
      },
      neighborStopCondition: () => { return false }
    })

    return corpse
  }

  getClosestTable() {
    let table
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let building = chunkRegion.getTable(this.entity.owner)
        if (building) table = building
        return building
      },
      neighborStopCondition: () => { return false }
    })

    return table
  }

  getClosestButcherTable() {
    let table
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let building = chunkRegion.getButcherTable(this.entity.owner, { isNotClaimed: true })
        if (building) table = building
        return building
      },
      neighborStopCondition: () => { return false }
    })

    return table
  }

  getClosestStove(options = {}) {
    let stove

    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let building = chunkRegion.getStove(this.entity.owner, { isNotClaimed: true, excludeStoveIds: options.excludeStoveIds })
        if (building) stove = building
        return building
      },
      neighborStopCondition: () => { return false }
    })

    return stove
  }

  getClosestMiner(options = {}) {
    let miner

    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let building = chunkRegion.getMiner(this.entity.owner, { isNotClaimed: true })
        if (building) miner = building
        return building
      },
      neighborStopCondition: () => { return false }
    })

    return miner
  }

  getUnwateredSoilNetwork() {
    return this.getSoilNetwork((soilNetwork) => {
      return soilNetwork.getUnwateredCount() > 0
    })
  }

  getHarvestableSoilNetwork() {
    return this.getSoilNetwork((soilNetwork) => {
      return soilNetwork.getHarvestableCount() > 0
    })
  }

  getUnplantedSoilNetwork(seedsToStorageMap, handItem) {
    return this.getSoilNetwork((soilNetwork) => {
      let soilHasSeedType = seedsToStorageMap[soilNetwork.getSeedType()] ||
                            (handItem && handItem.getType() === soilNetwork.getSeedType())
      return soilNetwork.getUnplantedCount() > 0 && soilHasSeedType
    })
  }

  getSoilNetwork(condition) {
    let soilNetwork

    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let farm = chunkRegion.getSoilNetwork(this.entity.owner, condition)
        if (farm) soilNetwork = farm
        return farm
      },
      neighborStopCondition: () => { return false }
    })

    return soilNetwork
  }

  doRefillTurret() {
    let success
    let ammoToStorageMap = this.getAvailableAmmos()

    if (!this.targetTurret) {
      this.targetTurret = this.getClosestTurretNeedingRefill(ammoToStorageMap)
    }
    
    if (this.targetTurret) {
      success = this.handleTurretRefill(ammoToStorageMap)
    }

    return success
  }

  setRepeatTask(taskName) {
    this.repeatTaskName = taskName
  }

  doButcherCorpse() {
    let success

    // butcher corpse
    let butcherTable = this.getClosestButcherTable()
    if (butcherTable) {
      success = this.handleButchering(butcherTable)
    }

    return success
  }

  doPlantSeed() {
    let success
    let seedsToStorageMap = this.getAvailableSeeds()

    let soilNetwork = this.getUnplantedSoilNetwork(seedsToStorageMap, this.entity.getHandItem())
    if (soilNetwork) {
      success = this.handlePlanting(soilNetwork, seedsToStorageMap)
    }

    return success
  }

  doWaterCrop() {
    let success

    let soilNetwork = this.getUnwateredSoilNetwork()
    if (soilNetwork) {
      success = this.handleWatering(soilNetwork)
    }

    return success
  }

  doCollectMiner() {
    let success

    let miner = this.getClosestMiner()
    if (miner) {
      success = this.handleCollectMiner(miner)
    }

    return success
  }

  resetTriedStoves() {
    this.triedStoveIds = {}
  }

  doCook() {
    let success

    if (!this.targetStove || 
        (this.targetStove && this.targetStove.isDestroyed())) {
      this.targetStove = this.getClosestStove()
    }

    if (this.shouldTryDifferentStove) {
      this.targetStove = this.getClosestStove({ excludeStoveIds: this.triedStoveIds })
    }

    let stove = this.targetStove 
    if (!stove) {
      this.resetTriedStoves()
      return false
    }

    if (!this.targetStove.content) return false

    let requirements = this.targetStove.getFoodRequirements()
    if (!requirements) return false

    if (this.hasIngredients(requirements)) {
      // go to stove
      success = this.perform("SeekStove", {
        targetEntity: stove,
        onComplete: (stove) => {
          this.perform("Cook", { stove: stove })
          this.targetStove = null
        }
      })
    } else {
      // seek ingredients
      let missingIngredients = this.getMissingIngredients(requirements)
      let storages = this.getStoragesWithIngredient(stove.getChunkRegion(), missingIngredients)

      if (Object.keys(storages).length === 0) {
        this.triedStoveIds[stove.getId()] = true
        this.shouldTryDifferentStove = true
      } else {
        this.resetTriedStoves()
        this.shouldTryDifferentStove = false
        let storageKey = Object.keys(storages)[0]
        let storage = storages[storageKey].storage
        let missingIngredientType = storages[storageKey].type
        let missingIngredientCount = storages[storageKey].count

        success = this.returnCurrentItemUnless("food_ingredient", () => {
          return this.perform("SeekIngredient", {
            targetEntity: storage,
            onComplete: (storage) => {
              this.perform("Pickup", { storage: storage, itemType: missingIngredientType, count: missingIngredientCount })
              this.setRepeatTask("doCook")
            }
          })
        })
      }
    }

    return success
  }

  getMissingIngredients(requirements) {
    let result = []

    for (let typeName in requirements) {
      let count = requirements[typeName]
      let type = Protocol.definition().BuildingType[typeName]
      let item = this.entity.equipments.search(type)
      if (!item) {
        let missing = { type: type, count: count }
        result.push(missing)
      } else {
        if (item.count < count) {
          let missing = { type: type, count: count - item.count }
          result.push(missing)
        }
      }
    }

    return result
  }

  getStoragesWithIngredient(startChunkRegion, missingIngredients) {
    let storages = {}
    let allIngredientsFound = true

    for (var i = 0; i < missingIngredients.length; i++) {
      let missingIngredient = missingIngredients[i]
      let storage = this.getStorageWithIngredient(startChunkRegion, missingIngredient.type, missingIngredient.count)
      if (!storage) {
        allIngredientsFound = false
        break
      } else {
        storages[missingIngredient.type] = { 
          storage: storage,
          type: missingIngredient.type, 
          count: missingIngredient.count 
        }
      }
    }

    if (!allIngredientsFound) return {}

    return storages
  }

  getStorageWithIngredient(startChunkRegion, ingredientType, count) {
    return this.getStorageWithCondition({
      startChunkRegion: startChunkRegion,
      condition: (storage) => {
        if (storage.hasFoodIngredient()) {
          return storage.hasIngredientWithCount(ingredientType, count)
        }
      }
    })
  }


  hasIngredients(requirements) {
    return Item.canMeetRequirements(requirements, this.entity.equipments.storage)
  }

  doHarvestCrop() {
    let success

    // get soil network
    if (this.hasCrop()) {
      let success = this.returnItem()
      return success
    } 

    let soilNetwork = this.getHarvestableSoilNetwork()
    if (!soilNetwork) {
      success = false
    } else {
      success = this.returnCurrentItemUnless(null, () => {
        let crop = soilNetwork.getHarvestableCrop()
        if (!crop) return false

        return this.perform("HarvestCrop", {
          targetEntity: crop,
          onComplete: (crop) => {
            this.perform("PickupCrop", { crop: crop })
            this.setRepeatTask("doHarvestCrop")
          }
        })
      })
    }

    return success
  }


  getTasks() {
    if (!this.tasks) {
      this.tasks = [
        { type: Protocol.definition().TaskType.RefillTurret,  handler: this.doRefillTurret },
        { type: Protocol.definition().TaskType.ButcherCorpse, handler: this.doButcherCorpse },
        { type: Protocol.definition().TaskType.PlantSeed,     handler: this.doPlantSeed },
        { type: Protocol.definition().TaskType.WaterCrop,    handler: this.doWaterCrop },
        { type: Protocol.definition().TaskType.HarvestCrop,  handler: this.doHarvestCrop },
        { type: Protocol.definition().TaskType.Cook,          handler: this.doCook },
        { type: Protocol.definition().TaskType.CollectMiner,  handler: this.doCollectMiner }
      ]

      this.taskOrder = Helper.generateShuffledArrayIndex(this.tasks)
    }

    return this.tasks
  }

  execute() {
    if (this.isPlanning) return

    this.isPlanning = true
    this.sector.mobTaskQueue.getQueue().push(() => {
      this.executeAsync()
    })
  }

  isTaskEnabled(taskType) {
    return this.entity.isTaskEnabled(taskType)
  }

  executeAsync() {
    this.isPlanning = false
    let success

    this.storageWithEmptySlot = this.getStorageWithCondition({
      startChunkRegion: this.entity.getChunkRegion(),
      condition: (storage) => {
        return !storage.isFull()
      }
    })

    // when im harvesting, its efficient to keep doing same until i cant harvest anymore
    if (this.repeatTaskName) {
      let task = this[this.repeatTaskName]
      success = task.call(this)
      if (success) {
        this.setRepeatTask(null)
        return  
      }
    }

    if (this.isHungry()) {
      success = this.handleHunger()
      if (success) return
    }

    if (this.isSleepy()) {
      success = this.handleSleep()
      if (success) return
    }

    let canWork = this.entity.hunger > 0 && this.entity.stamina > 0

    if (canWork) {
      let tasks = this.getTasks()
      for (var i = 0; i < this.taskOrder.length; i++) {
        let order = this.taskOrder[i]
        let task = tasks[order]
        if (this.isTaskEnabled(task.type)) {
          success = task.handler.call(this)
          if (success) break
        }
      }
    }

    if (success) return

    // nothing to do, return anything u have on hand
    success = this.returnCurrentItemUnless(null, () => {})

    return success
  }

  returnCurrentItemUnless(itemType, callback) {
    let noEquip = !this.entity.getHandItem()
    if (noEquip) return callback()

    let noEquipDesired = !itemType
    if (noEquipDesired) {
      return this.returnItem()
    }

    let hasItemRequired = this.entity.getHandItem().isDesiredItem(itemType)
    if (hasItemRequired) return callback()

    // i dont have required item, return current item first

    return this.returnItem()
  }

  getAvailableAmmos() {
    let sourceChunkRegion = this.entity.getChunkRegion()
    if (!sourceChunkRegion) return
    if (sourceChunkRegion.isSky) return {}

    let ammos = {}

    let traversal = this.sector.traverseChunkRegionsUntil(sourceChunkRegion,
       { sameBiome: true, passThroughWall: false } ,
       (chunkRegion) => {
      return chunkRegion.isSky !== sourceChunkRegion.isSky
    })

    let totalTurretAmmoTypeCount = 2

    for (let chunkRegionId in traversal.visited) {
      let chunkRegion = traversal.visited[chunkRegionId]

      chunkRegion.forEachStructureUntil((structure) => {
        if (Object.keys(ammos).length >= totalTurretAmmoTypeCount) return true

        if (structure.isOwnedBy(this.entity.owner) &&
            structure.hasCategory("storage") &&
            structure.isSlaveAllowedToAccess() && 
            (structure.hasMissileAmmo() || structure.hasBulletAmmo())) {
          structure.forEachItem((item) => {
            if (item.isAmmo()) {
              if (!ammos[item.type]) {
                ammos[item.type] = structure
              }
            }
          })
        }
      })
    }

    return ammos
  }

  getAvailableSeeds() {
    let sourceChunkRegion = this.entity.getChunkRegion()
    if (!sourceChunkRegion) return
    if (sourceChunkRegion.isSky) return {}

    let seeds = {}

    let traversal = this.sector.traverseChunkRegionsUntil(sourceChunkRegion,
       { sameBiome: true, passThroughWall: false } ,
       (chunkRegion) => {
      return chunkRegion.isSky !== sourceChunkRegion.isSky
    })

    for (let chunkRegionId in traversal.visited) {
      let chunkRegion = traversal.visited[chunkRegionId]

      chunkRegion.forEachStructureUntil((structure) => {
        if (structure.isOwnedBy(this.entity.owner) &&
            structure.hasCategory("storage") &&
            structure.isSlaveAllowedToAccess() && 
            structure.hasSeed()) {
          structure.forEachItem((item) => {
            if (item.isSeed()) {
              if (!seeds[item.type]) {
                seeds[item.type] = structure
              }
            }
          })
        }
      })
    }

    return seeds
  }

  returnItem() {
    let success

    if (!this.storageWithEmptySlot) {
      let item = this.entity.getHandItem()
      this.entity.equipments.removeItem(item)
      this.entity.throwInventory(item)
      return true
    }

    success = this.perform("ReturnItem", {
      targetEntity: this.storageWithEmptySlot,
      onComplete: (storage) => {
        if (this.entity.getHandItem()) {
          this.perform("StoreItem", {
            item: this.entity.getHandItem(),
            storage: storage
          })
        }

        if (this.entity.getExtraItem()) {
          this.perform("StoreItem", {
            item: this.entity.getExtraItem(),
            storage: storage
          })
        }
      }
    })

    return success
  }

  handleCollectMiner(miner) {
    let success

    if (!this.storageWithEmptySlot) return false

    if (this.hasOres()) {
      let success = this.returnItem()
      return success
    } 

    success = this.returnCurrentItemUnless(null, () => {
      return this.perform("SeekMiner", {
        targetEntity: miner,
        onComplete: function(miner, table) {
          this.perform("Pickup", { storage: miner, itemType: "ore", count: miner.getTotalOresStored() })
          this.setRepeatTask("doCollectMiner") 
        }.bind(this, miner)
      })
    })

    return success
  }

  handleButchering(butcherTable) {
    let success

    if (!this.storageWithEmptySlot) return false

    if (this.hasCorpse()) {
      success = this.perform("SeekButcherTable", {
        targetEntity: butcherTable,
        onComplete: function(butcherTable, table) {
          this.perform("Butcher", { butcherTable: butcherTable })
        }.bind(this, butcherTable)
      })
    } else {
      let corpse = this.getClosestCorpse()
      if (!corpse) return

      success = this.returnCurrentItemUnless(null, () => {
        return this.perform("SeekCorpse", {
          targetEntity: corpse,
          onComplete: (corpse) => {
            this.perform("PickupCorpse", { corpse: corpse })
            this.setRepeatTask("doButcherCorpse") // make sure to continue seeking butcher table instead of switching to diff task
          }
        })
      })
    }

    return success
  }

  handlePlanting(soilNetwork, seedsToStorageMap) {
    let success

    if (soilNetwork.getUnplantedCount() > 0) {
      // plant seed
      if (this.hasSeed(soilNetwork)) {
        success = this.perform("SeekSoil", {
          targetEntity: soilNetwork.getUnplantedSoil(),
          onComplete: (soil) => {
            this.perform("PlantSeed", {
              soil: soil,
              seed: this.entity.getHandItem()
            })
            this.setRepeatTask("doPlantSeed")
          }
        })
      } else {
        let seedStorage = seedsToStorageMap[soilNetwork.getSeedType()]
        if (!seedStorage) return

        success = this.returnCurrentItemUnless(soilNetwork.getSeedType(), () => {
          return this.perform("SeekSeed", {
            targetEntity: seedStorage,
            onComplete: function(soilNetwork, storage) {
              this.perform("Pickup", { storage: storage, itemType: soilNetwork.getSeedType(), count: soilNetwork.getUnplantedCount() })
              this.setRepeatTask("doPlantSeed")
            }.bind(this, soilNetwork)
          })
        })
      }
    }

    return success
  }

  handleWatering(soilNetwork) {
    let success

    if (soilNetwork.getUnwateredCount() > 0) {
      let waterSource = this.getClosestWaterSource()
      if (!waterSource) return

      if (this.hasBottle()) {
        if (this.hasWaterBottle()) {
          success = this.perform("SeekSoil", {
            targetEntity: soilNetwork.getUnwateredSoil(),
            onComplete: (soil) => {
              this.perform("WaterSoil", { soil: soil })
            }
          })
        } else {
          success = this.perform("SeekWater", {
            targetEntity: waterSource,
            onComplete: (waterSource) => {
              this.perform("CollectWater", { waterSource: waterSource })
              this.setRepeatTask("doWaterCrop")
            }
          })
        }
      } else {
        let bottleStorage = this.getBottleStorage()
        if (!bottleStorage) return

        success = this.returnCurrentItemUnless('bottle', () => {
          return this.perform("SeekBottle", {
            targetEntity: bottleStorage,
            onComplete: (storage) => {
              this.perform("Pickup", { storage: storage, itemType: 'bottle' })
              this.setRepeatTask("doWaterCrop")
            }
          })
        })
      }
    }

    return success
  }

  handleTurretRefill(ammoToStorageMap) {
    let success

    if (this.hasBulletAmmo() || this.hasMissileAmmo()) {
      success = this.perform("SeekTurret", {
        targetEntity: this.targetTurret,
        onComplete: (turret) => {
          this.perform("RefillTurret", { turret: turret })
          this.targetTurret = null
        }
      })
    } else {
      let ammoStorage = ammoToStorageMap[this.targetTurret.getAmmoTypeId()]
      if (!ammoStorage) return

      success = this.returnCurrentItemUnless('ammo', () => {
        return this.perform("SeekAmmo", {
          targetEntity: ammoStorage,
          onComplete: (storage) => {
            this.perform("Pickup", {
              storage: storage,
              itemType: Protocol.definition().BuildingType[this.targetTurret.getAmmoType()],
              maxCount: true
            })
            this.setRepeatTask("doRefillTurret")
          }
        })
      })
    }

    return success

  }

  getClosestTurretNeedingRefill(ammoToStorageMap) {
    let turret
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let building = chunkRegion.getTurret(this.entity.owner, (turret) => {
          if (!ammoToStorageMap[turret.getAmmoTypeId()]) return false
          return turret.getAmmoCount() < Constants.maxStackCount
        })

        if (!building) return false

        if (this.hasBulletAmmo()) {
          if (building.getAmmoType() === "BulletAmmo") {
            turret = building
            return building
          }
        } else if (this.hasMissileAmmo()) {
          if (building.getAmmoType() === "Missile") {
            // if im holding missile, find turret that requires missile
            turret = building
            return building
          }
        } else {
          turret = building
          return building
        }
      },
      neighborStopCondition: () => { return false }
    })

    return turret
  }

  getClosestAmmoStorage(ammoType) {
    let result
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let storage = chunkRegion.getAmmoStorage(this.entity.owner, ammoType)
        if (storage) result = storage
        return storage
      },
      neighborStopCondition: () => { return false }
    })

    return result
  }

  getStorageWithCondition(options = {}) {
    let result
    this.sector.findOneChunkRegionUntil(options.startChunkRegion, {
      breakCondition: (chunkRegion) => {
        let storage = chunkRegion.getStorageWithCondition(this.entity.owner, options.condition)
        if (storage) result = storage
        return storage
      },
      neighborStopCondition: () => { return false }
    })

    return result
  }

  getBottleStorage() {
    let result
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let storage = chunkRegion.getBottleStorage(this.entity.owner)
        if (storage) result = storage
        return storage
      },
      neighborStopCondition: () => { return false }
    })

    return result
  }

  getSeedStorageWithType(itemType) {
    let result
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let storage = chunkRegion.getSeedStorageWithType(this.entity.owner, itemType)
        if (storage) result = storage
        return storage
      },
      neighborStopCondition: () => { return false }
    })

    return result
  }

  getStructureWithType(type, options = {}) {
    let result
    this.sector.findOneChunkRegionUntil(this.entity.getChunkRegion(), {
      breakCondition: (chunkRegion) => {
        let structure = chunkRegion.getStructureWithType(this.entity.owner, type, options)
        if (structure) result = structure
        return structure
      },
      neighborStopCondition: () => { return false }
    })

    return result
  }

  handleSleep() {
    let success

    let bed = this.getStructureWithType(Protocol.definition().BuildingType.Bed, { isNotClaimed: true })
    if (!bed) return false

    success = this.perform("SeekBed", {
      targetEntity: bed,
      onComplete: (bed) => {
        this.perform("Sleep", { bed: bed })
      }
    })

    return success
  }

  handleHunger() {
    let success

    if (this.hasFood()) {
      success = this.perform("SeekTable", {
        onComplete: () => {
          this.perform("Eat")
        }
      })

      if (!success) {
        this.perform("Eat")
      }
    } else {
      let storage = this.getClosestFoodStorage()
      if (!storage) return false

      success = this.returnCurrentItemUnless("food", () => {
        return this.perform("SeekFood", {
          targetEntity: storage,
          onComplete: (storage) => {
            this.perform("Pickup", { storage: storage, itemType: 'food', count: 1 })
          }
        })
      })
    }

    return success
  }

  onBeforePerform(actionName) {
    if (actionName !== "SeekButcherTable" && actionName !== "Butcher") {
      if (this.entity.hasDragTarget()) {
        this.entity.releaseDragTarget()
      }
    }
  }

  perform(actionName, options = {}) {
    let actionKlass = Actions[actionName]
    if (!actionKlass) {
      this.game.captureException(new Error("Invalid actionName: " + actionName))
      return
    }

    this.onBeforePerform(actionName, options)

    return actionKlass.perform(this, options)
  }

  setCurrentAction(action) {
    this.currentAction = action
  }

  isHungry() {
    return this.entity.hunger < 35
  }

  isSleepy() {
    return this.entity.stamina < 15
  }

  hasFood() {
    return this.entity.getHandItem() && this.entity.getHandItem().isEdible()
  }

  hasOres() {
    return this.entity.getHandItem() && this.entity.getHandItem().isOre()
  }

  hasSeed(soilNetwork) {
    if (!this.entity.getHandItem()) return false

    return this.entity.getHandItem().getType() === soilNetwork.getSeedType()
  }

  hasBottle(soilNetwork) {
    if (!this.entity.getHandItem()) return false

    return this.entity.getHandItem().isBottle()
  }

  hasWaterBottle(soilNetwork) {
    if (!this.entity.getHandItem()) return false

    if (this.entity.getHandItem().getType() !== Protocol.definition().BuildingType.WaterBottle) {
      return false
    }

    return this.entity.getHandItem().instance.hasEnoughWater()
  }

  hasCorpse() {
    return this.entity.dragTarget
  }

  hasCrop() {
    return this.entity.getHandItem() && this.entity.getHandItem().isCrop() 
  }

  hasBulletAmmo() {
    return this.entity.getHandItem() && this.entity.getHandItem().isBulletAmmo()
  }

  hasMissileAmmo() {
    return this.entity.getHandItem() && this.entity.getHandItem().isMissileAmmo()
  }

  hasPlantToWater(soilNetwork){
    return soilNetwork.getUnwateredCount() > 0
  }

  onDragTargetRemoved() {
    if (this.currentAction) {
      this.currentAction.onDragTargetRemoved()
    }
  }

}

module.exports = Planner
