const Constants = require('../../common/constants.json')
const Protocol = require('../../common/util/protocol')

class WalkthroughManager {
  constructor(player) {
    this.player = player
    this.index = 1

    this.initSteps()
  }

  getSocketUtil() {
    return this.player.getSocketUtil()
  }

  initSteps() {
    this.steps = {
      "movement": { index: 1, handler: this.handleMovement },
      "mining":   { index: 2, handler: this.handleMining },
      "lead_pipe": { index: 3, handler: this.handleLeadPipe },
      "release_guard": { index: 4, handler: this.handleLeadPipe },
      "kill_guard": { index: 5, handler: this.handleKillGuard },
      "grab_potatoes": { index: 6, handler: this.handleGrabPotatoes },
      "eat_potatoes": { index: 7, handler: this.handleEatPotatoes },
      "dismantle": { index: 8, handler: this.handleDismantle },
      "tame_slime": { index: 9, handler: this.handleTameSlime },
      "kill_slime": { index: 10, handler: this.handleKillSlime },
      "butcher_slime": { index: 11, handler: this.handleButcherSlime },
      "cook_slime": { index: 12, handler: this.handleCookSlime },
      "player_permissions": { index: 13, handler: this.handlePlayerPermissions },
      "sleep": { index: 14, handler: this.handleSleep },
      "suit_station": { index: 15, handler: this.handleSuitStation },
      "collect_water": { index: 16, handler: this.handleCollectWater },
      "fill_oxygen_generator": { index: 17, handler: this.handleFillOxygenGenerator },
      "refill_space_suit": { index: 18, handler: this.handleRefillSpaceSuit },
      "craft_iron_bar": { index: 19, handler: this.handleIronBarCraft },
      "craft_liquid_pipe": { index: 20, handler: this.handleLiquidPipeCraft },
      "connect_liquid_pipe": { index: 21, handler: this.handleConnectLiquidPipe },
      "rail_tram": { index: 22, handler: this.handleRailTram },
      "plant_seed": { index: 23, handler: this.handlePlantSeed },
      "water_crop": { index: 24, handler: this.handleWaterCrop },
      "farm_controller": { index: 25, handler: this.handleFarmController },
      "select_wheat": { index: 26, handler: this.handleSelectWheat }
    }
  }

  handle(step, data = {}) {
    if (!this.player.game.isTutorial) return

    let stepHandler = this.steps[step]
    let isCompletedStep = stepHandler.index < this.index
    if (isCompletedStep) return

    let isFutureStep = stepHandler.index > this.index
    if (isFutureStep) return

    stepHandler.handler.call(this, data)
  }

  handleMovement(data) {
    if (!this.firstMoveTimestamp) {
      if (data.hasOwnProperty('controlKeys')) {
        // desktop
        let wasdKeys = (data.controlKeys & Constants.Control.up)   ||
                       (data.controlKeys & Constants.Control.down) ||
                       (data.controlKeys & Constants.Control.left) ||
                       (data.controlKeys & Constants.Control.right)
        if (wasdKeys) {
          this.firstMoveTimestamp = this.player.game.timestamp
        }
      } else {
        // mobile
        this.firstMoveTimestamp = this.player.game.timestamp
      }
    }

    if ((this.player.game.timestamp - this.firstMoveTimestamp) > (Constants.physicsTimeStep * 2)) {
      this.nextStep()
    }
  }

  handleMining(data) {
    this.nextStep()
  }

  handleLeadPipe(data) {
    this.nextStep()
  }

  handleKillGuard(data) {
    this.nextStep()
  }

  handleGrabPotatoes(data) {
    this.nextStep()
  }

  handleEatPotatoes(data) {
    if (data.food.getType() === Protocol.definition().BuildingType.Potato) {
      this.nextStep()
    }
  }

  handlePlayerPermissions(data) {
    this.nextStep()
  }

  handleDismantle(data) {
    this.player.sector.spawnMob({ player: this.player, type: "slime", count: 2 })

    this.nextStep()
  }

  handleTameSlime(data) {
    this.nextStep()
  }

  handleKillSlime(data) {
    this.nextStep()
  }

  handleButcherSlime(data) {
    this.nextStep()
  }

  handleCookSlime(data) {
    let mobs = this.player.sector.spawnMob({ player: this.player, type: "dummy_player", count: 1 })
    let dummyPlayer = mobs[0]
    dummyPlayer.setPosition(1520, 2800)
    dummyPlayer.setOwner(this.player)
    dummyPlayer.setName("Dummy")

    this.nextStep()
  }

  handleSleep(data) {
    this.nextStep()
  }

  handleSuitStation(data) {
    this.player.getArmorEquipment().setOxygen(270)
    this.nextStep()
  }

  handleGrabBottle(data) {
    this.nextStep()
  }

  handleRailTram(data) {
    this.nextStep()
  }

  handleCollectWater(data) {
    this.nextStep()
  }

  handleFillOxygenGenerator(data) {
    this.nextStep()
  }

  handleRefillSpaceSuit(data) {
    this.nextStep()
  }

  handleIronBarCraft(data) {
    this.nextStep()
  }

  handleLiquidPipeCraft(data) {
    this.nextStep()
  }

  handleConnectLiquidPipe(data) {
    let oxygenGenerator = data.oxygenGenerator
    if (!oxygenGenerator) return
    if (oxygenGenerator !== this.player.sector.refillableOxygenGenerator) return
    if (!oxygenGenerator.liquidNetwork) return

    let hasLiquidTank = false
    for (let id in oxygenGenerator.liquidNetwork.storages) {
      let storageHit = oxygenGenerator.liquidNetwork.storages[id]
      if (storageHit.entity.hasCategory("liquid_tank")) {
        hasLiquidTank = true
      }
    }

    if (hasLiquidTank) {
      this.nextStep()
    }
  }

  handleRailTram(data) {
    this.nextStep()
  }

  spawnSlave() {
    let slave = this.player.sector.spawnPet({ player: this.player, type: 'nuu_slave', count: 1, x: 3180, y: 1920 })
    slave.setOwner(this.player)

    slave.resetTasks()
    slave.editTask(Protocol.definition().TaskType.PlantSeed, true)
    slave.editTask(Protocol.definition().TaskType.WaterCrop, true)
    slave.editTask(Protocol.definition().TaskType.HarvestCrop, true)
    slave.release(this.player)
  }

  handlePlantSeed(data) {
    this.nextStep()
  }

  handleWaterCrop(data) {
    this.spawnSlave()
    this.nextStep()
  }

  handleFarmController(data) {
    this.nextStep()
  }

  handleSelectWheat(data) {
    if (parseInt(data.content) === Protocol.definition().BuildingType.WheatSeed) {
      this.nextStep()
    }
  }

  nextStep() {
    this.index += 1
    let stepName = Object.keys(this.steps)[this.index - 1]
    let isEndOfTutorial = !stepName
    if (isEndOfTutorial) stepName = "end"

    this.getSocketUtil().emit(this.player.getSocket(), "WalkthroughUpdated", { index: this.index, step: stepName })
  }

}

module.exports = WalkthroughManager
