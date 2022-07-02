const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Helper = require('../../../common/helper')
const BaseProcessor = require("./base_processor")

class MiningDrill extends BaseProcessor {

  onBuildingPlaced() {
    if (this.getPlacer()) {
      let team = this.getPlacer().getTeam()
      this.prevMiningDrillCount = team.getMiningDrillCount()
    }

    super.onBuildingPlaced()
  }

  // drills used to be able to be placed on any platform
  // now, we just restrict them to grounds
  isOnAsteroidGround() {
    if (typeof this.isBuiltOnAsteroid === 'undefined') {
      this.isBuiltOnAsteroid = this.constructor.isOnAsteroidGround(this.getContainer(), this.getX(), this.getY(), this.getWidth(), this.getHeight())
    }

    return this.isBuiltOnAsteroid
  }

  onStorageChanged(item, index) {
    super.onStorageChanged(item, index)

    if (this.canProceed()) {
      this.addProcessor(this)
    }
  }

  onConstructionFinished() {
    super.onConstructionFinished()

    if (this.getPlacer()) {
      let team = this.getPlacer().getTeam()
      if (team.getMiningDrillCount() === 7 && this.prevMiningDrillCount === 6) {
        team.forEachMember((player) => {
          player.showError("Awoken The Spiders You Have")
        })
      }
    }
  }

  static isOnValidPlatform(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    return this.isOnAsteroidGround(container, x, y, w, h)
  }

  static isOnAsteroidGround(container, x, y, w, h) {
    let box = this.getBox(x, y, w, h)
    let checkFull = false
    let excludeOutOfBounds = false

    let groundHits = container.groundMap.hitTestTile(box, checkFull, excludeOutOfBounds)
    let isAllGround = groundHits.every((hit) => {
      return hit.entity && hit.entity.isGroundTile()
    })

    return isAllGround
  }

  remove() {
    let prevMiningDrillCount

    if (this.owner) {
      let team = this.owner.isPlayer() ? this.owner.getTeam() : this.owner
      prevMiningDrillCount = team.getMiningDrillCount()
    }

    super.remove()

    if (this.owner) {
      let team = this.owner.isPlayer() ? this.owner.getTeam() : this.owner
      let currMiningDrillCount = team.getMiningDrillCount()
      if (currMiningDrillCount === 6 && prevMiningDrillCount === 7) {
        team.forEachMember((player) => {
          player.showError("The Spiders have been left in peace")
        })
      }
    }
  }

  createOutputItem(inputItem) {
    let oreOutput = this.getOreOutput()
    let ore = this.sector.klassifySnakeCase(oreOutput)

    if (!Protocol.definition().BuildingType[ore]) {
      return null
    }

    return this.sector.createItem(ore, { count: 1 })
  }

  onPowerChanged() {
    super.onPowerChanged()

    if (this.canProceed()) {
      this.addProcessor(this)
    }
  }

  canProceed() {
    if (!this.hasMetPowerRequirement() || !this.isOnAsteroidGround()) return false

    let outputItem = this.getOutputItem()
    if (outputItem && outputItem.isFullyStacked()) return false

    return true
  }

  processInputItem() {
    // no input to process
  }

  getTotalOresStored() {
    let item = this.getOutputItem()
    if (!item) return 0

    return item && item.count
  }

  getConstantsTable() {
    return "Buildings.MiningDrill"
  }

  getType() {
    return Protocol.definition().BuildingType.MiningDrill
  }

  getOreOutput() {
    if (this.content) {
      return this.content
    }

    let index = this.getRow() * this.getContainer().getRowCount() + this.getCol()
    if (index % 5 === 0) {
      return "CopperOre"
    } else {
      return "IronOre"
    }
  }


}

module.exports = MiningDrill

