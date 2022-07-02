const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Helper = require("./../../../../common/helper")

class SecurityCamera extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getName() {
    return this.content || "Feed " + this.id
  }

  openMenu() {
    this.game.changeNameMenu.open({ entity: this })
  }

  onContentChanged() {
    this.game.changeNameMenu.close()
  }

  getType() {
    return Protocol.definition().BuildingType.SecurityCamera
  }

  getSpritePath() {
    return "security_camera.png"
  }

  getConstantsTable() {
    return "Buildings.SecurityCamera"
  }

}

module.exports = SecurityCamera
