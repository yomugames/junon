const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Drainable = require("./../../../../common/interfaces/drainable")
const Wire = require("./wire")

class SolarPanel extends BaseBuilding {

  static isOnValidPlatform(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let box = this.getBox(x, y, w, h)
    let hasLattice = container.platformMap.hitTestTile(box).every((hit) => {
      return hit.entity && hit.entity.getType() === Protocol.definition().BuildingType.Lattice
    })

    return hasLattice
  }

  getSprite() {
    let sprite = super.getSprite()

    this.fillBarContainer.position.x = -30

    return sprite
  }

  getType() {
    return Protocol.definition().BuildingType.SolarPanel
  }

  getSpritePath() {
    return "solar_panel.png"
  }

  getConstantsTable() {
    return "Buildings.SolarPanel"
  }

}

module.exports = SolarPanel
