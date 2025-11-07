const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const FuelPipe = require("./fuel_pipe")
const Helper = require("./../../../../common/helper")

class DeepDrill extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    let isBuildingValid = !this.isOnHangar(container, x, y, w, h) &&
                          this.isWithinInteractDistance(x, y, player) &&
                          !container.armorMap.isOccupied(x, y, w, h) &&
                          !container.structureMap.isOccupied(x, y, w, h)

    let checkFull = false
    let excludeOutOfBounds = false
    const hits = container.undergroundMap.hitTestTile(this.getBox(x, y, w, h), checkFull, excludeOutOfBounds)
    const isOnOil = hits.find((hit) => { return hit.entity && hit.entity.hasCategory("oil") })
    const isNotOnEmptyTile = !hits.find((hit) => { return hit.entity === null })

    return isBuildingValid && isOnOil && isNotOnEmptyTile
  }

  isRPItem() {
    return true;
  }

  getRequiredRP() {
    return 20
  }

 onBuildingConstructed() {
    super.onBuildingConstructed()
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()

    this.cleanupTween()
  }

  getSpritePath() {
    return 'deep_drill.png'
  }

  getType() {
    return Protocol.definition().BuildingType.DeepDrill
  }

  getConstantsTable() {
    return "Buildings.DeepDrill"
  }

  openMenu() {
    let shouldHideInputSlot = true
    this.game.processorMenu.open("Deep Drill", this, this.getMenuDescription(), shouldHideInputSlot)
  }

  getMenuDescription() {
    let ore = this.getOreOutput()    
    return i18n.t("Generates " + Helper.capitalize(ore) + " Ore")
  }

  getOreOutput() {
    return "sulfur"
  }


}

module.exports = DeepDrill
