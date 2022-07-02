const Region = require("./region")
const Blueprint   = require("./blueprint")

class HangarRegion extends Region {

  onRegionCreated() {
    super.onRegionCreated()
  }

  setHangarController(hangarController) {
    this.hangarController = hangarController
  }

  dock(ship) {
    this.hangarController.dock(ship)
  }

  undock(ship) {
    this.hangarController.undock(ship)
  }

  isNotOccupied() {
    return this.ship.isEmpty()
  }

  hasShip(ship) {
    return this.ship === ship
  }

  isHangar() {
    return true
  }

  setShip(ship) {
    if (this.ship !== ship) {
      this.ship = ship
      this.onShipChanged()
    }
  }

  getShip() {
    return this.ship
  }

  onShipChanged() {
    this.onStateChanged("content")
  }

  getBuildingContent() {
    return this.ship.id.toString()
  }

  toJson() {
    let json = super.toJson()
    json["content"] = this.getBuildingContent()
    return json
  }

}

module.exports = HangarRegion