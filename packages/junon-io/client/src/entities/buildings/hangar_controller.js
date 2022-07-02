const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class HangarController extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  renderEntityMenu(entityMenu) {
    super.renderEntityMenu(entityMenu)
    this.showStats(entityMenu)
    this.showAction(entityMenu)
  }

  showStats(entityMenu) {
    let startDisplay = ""
    let endDisplay = ""

    if (this.content) {
      let coords = this.content.split(":")[1].split(",")
      startDisplay = [coords[0], coords[1]].join(",")
      endDisplay   = [coords[2], coords[3]].join(",")
    }

    const start = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>Start:</div>" +
                      "<div class='stats_value'>" + startDisplay + "</div>" +
                  "</div>"
    const end = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>End:</div>" +
                      "<div class='stats_value'>" + endDisplay + "</div>" +
                  "</div>"

    entityMenu.querySelector(".entity_stats").innerHTML = start + end
  }

  showAction(entityMenu) {
    let shipEditMode = player.hangar ? "Stop Build" : "Start Build"
    const setHangar = "<div class='set_hangar_btn ui_btn' data-action='set_hangar'>Set Hangar</div>"

    const editShip = "<div class='edit_ship_btn ui_btn' data-action='edit_ship'>" + shipEditMode + "</div>"

    entityMenu.querySelector(".entity_action").innerHTML = setHangar + editShip

  }

  onContentChanged() {
    if (this.game.isEntityMenuOpenFor(this)) {
      // refresh menu
      this.game.showEntityMenu(this)
    }
  }

  onPostClick() {
    const region = this.getRegion()
    if (region) region.show()
  }

  unselect() {
    super.unselect()

    const region = this.getRegion()
    if (region) region.hide()
  }

  getRegion() {
    const regionId = this.content.split(":")[0]
    return this.game.sector.regions[regionId]
  }

  getType() {
    return Protocol.definition().BuildingType.HangarController
  }

  getSpritePath() {
    return "hangar_controller_2.png"
  }

  getConstantsTable() {
    return "Buildings.HangarController"
  }

}

module.exports = HangarController
