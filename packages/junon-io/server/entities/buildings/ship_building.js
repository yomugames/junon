const BaseBuilding = require("./base_building")

class ShipBuilding extends BaseBuilding {
  static isPositionValid(container, x, y, w, h, angle, player) {
    let isValid = super.isPositionValid(container, x, y, w, h, angle, player)

    if (!container.isMovable()) {
      player.showError("Can only be placed on a ship")
      isValid = false
    }

    return  isValid
  }
}

module.exports = ShipBuilding
