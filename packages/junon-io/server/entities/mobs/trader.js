const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const EquipmentInventory = require("./../equipment_inventory")
const Item = require("./../item")

class Trader extends LandMob {

  onPostInit() {
    this.initInventory()

    if (this.owner) {
      this.registerEventManager()
    }

    this.setDestinationGoal()

    this.MAX_TRADING_TABLE_FIND_ATTEMPT = 3
    this.CHECK_TABLE_BOUND_INTERVAL = debugMode ? 2 : 5
    this.FIND_TRADING_TABLE_INTERVAL = debugMode ? 3 : 3
  }

  move(deltaTime) {
    super.move(deltaTime)

//     if (this.isLeaving) {
//       this.removeAfterFiveSeconds()
//       return
//     }
// 
//     if (this.isSeekingTable) {
//       this.findTradingTableAndMoveToIt() 
//       return
//     }
// 
//     this.ensureBoundToTradingTable()
  }

  onMasterChanged() {
    if (this.master) {
      this.setDormant(false)
    } else {
      this.setDormant(true)
      this.setAngle(90) 
    }
  }

  autocreateName() {
    return false
  }

  findTradingTableAndMoveToIt() {
    if (this.isUnbound) return

    const isThreeSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * this.FIND_TRADING_TABLE_INTERVAL) === 0
    if (!isThreeSecondInterval) return

    if (this.tradingTableFindAttempt > this.MAX_TRADING_TABLE_FIND_ATTEMPT) {
      this.npcLeaveGame()
      return
    }

    this.tradingTableFindAttempt += 1

    let tradingTable = this.findTeamTradingTable()
    if (tradingTable) {
      this.tradingTableFindAttempt = 0
      this.isSeekingTable = false
      this.isDormant = false
      this.addGoalTarget(tradingTable)
    }
  }

  ensureBoundToTradingTable() {
    if (this.isUnbound) return

    const isFiveSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * this.CHECK_TABLE_BOUND_INTERVAL) === 0
    if (!isFiveSecondInterval) return

    let hasTradingTableGoal = this.goals.find((goal) => {
      return goal.targetEntity.isBuilding() &&
             goal.targetEntity.getType() === this.getTradingTableType()
    })

    if (hasTradingTableGoal) return

    let surroundingBox = this.getNeighborBoundingBox(Constants.tileSize * 2)
    let buildings = this.sector.buildingTree.search(surroundingBox)
    let tradingTable = buildings.find((building) => {
      return building.getType() === this.getTradingTableType()
    })

    if (tradingTable) return

    this.isSeekingTable = true
    this.tradingTableFindAttempt = 0 
  }

  findTeamTradingTable() {
    if (!this.owner) return null
      
    let result

    for (let id in this.owner.ownerships.structures) {
      let structure = this.owner.ownerships.structures[id]
      if (structure.getType() === this.getTradingTableType()) {
        result = structure
        break
      }
    }

    return result
  }

  shouldCreateDeadBody() {
    return false
  }

  setDestinationGoal() {
    if (this.goals.length === 0 && this.owner) {
      let tradingTable = this.findTeamTradingTable()
      if (tradingTable) {
        this.addGoalTarget(tradingTable)
      }
    }
  }

  onGoalReached(targetEntityToMove, goal) {
    super.onGoalReached(targetEntityToMove, goal) 

    if (!this.master) {
      this.setDormant(true)
      this.setAngle(90) 
    }
  }

  remove() {
    if (this.owner) {
      this.unregisterEventManager()
    }

    super.remove()
  }

  initInventory() {

  }

  registerEventManager() {
    this.game.eventManager.registerTrader(this, this.owner)
  }

  unregisterEventManager() {
    this.game.eventManager.unregisterTrader(this, this.owner)
  }

  getTradingTableType() {
    return Protocol.definition().BuildingType.TradingTable
  }

  getType() {
    return Protocol.definition().MobType.Trader
  }

  getConstantsTable() {
    return "Mobs.Trader"
  }

}

module.exports = Trader
