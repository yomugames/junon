const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const HangarRegion = require("./../hangar_region")

class HangarController extends BaseBuilding {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.initContent()
  }

  initContent() {
    if (this.getBuildingContent()) {
      let tokens = this.getBuildingContent().split(":")
      let id     = tokens[0]
      let coords = tokens[1].split(",").map((num) => { return parseInt(num) })
      this.initRegion(coords[0], coords[1], coords[2], coords[3])
    }
  }

  initRegion(x, y, w, h) {
    let region = new HangarRegion(this.sector, x, y, w, h)
    region.setHangarController(this)
    let ship = this.sector.createSkeletonShip(region)
    this.setRegion(region)
    this.dock(ship)

    return region
  }


  setRegion(region) {
    this.region = region
    const coords = [region.getX(), region.getY(), region.getWidth(), region.getHeight()].join(",")
    const content = [region.id, coords].join(":")
    this.setBuildingContent(content)
  }

  getRegionId() {
    return this.region ? this.region.id : null
  }

  dock(ship) {
    if (!this.region) return

    // stock away skeletonShip for later use
    this.skeletonShip = this.region.getShip()

    // set ship position
    ship.setPosition(this.region.getX(), this.region.getY())
    ship.hangar = this.region
    ship.setAngle(0)
    ship.stopMoving()

    // set pilot position
    if (ship.pilot) {
      ship.unsetPilot(ship.pilot)
    }

    this.region.setShip(ship)
  }

  undock(ship) {
    if (!this.region) return
    ship.hangar = null

    if (this.skeletonShip) {
      this.region.setShip(this.skeletonShip)
    } else {
      let skeletonShip = this.sector.createSkeletonShip(this.region)
      this.region.setShip(skeletonShip)
      this.dock(skeletonShip)
    }
  }

  getConstantsTable() {
    return "Buildings.HangarController"
  }

  getType() {
    return Protocol.definition().BuildingType.HangarController
  }

}

module.exports = HangarController

