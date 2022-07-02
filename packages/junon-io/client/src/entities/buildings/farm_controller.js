const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseBuilding = require("./base_building")

class FarmController extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  remove() {
    super.remove()
  }

  canMenuBeOpened() {
    let team = this.game.player.getTeam()
    if (this.isOwnedBy(this.game.player) && team.hasMember(this.game.player) && !this.game.player.isGuest()) {
      return this.isConstructionFinished()
    }
  }

  openMenu() {
    this.game.soilMenu.open({ entity: this })
  }

  onContentChanged() {
    this.game.soilMenu.render(this)  
  }

  onHighlighted() {
    let text = this.getText()
    if (text.length === 0) return

    this.createChatBubble(text, { isAbsolutePosition: true })
  }

  getText() {
    let type = this.content
    if (!type) { 
      let team = this.game.player.getTeam()
      if (this.isOwnedBy(this.game.player) && team.hasMember(this.game.player) && !this.game.player.isGuest()) {
        return i18n.t("ChooseCrop")
      } else {
        return ""
      }
    }

    let klass = this.game.getItemKlass(type)
    let yieldName = klass.prototype.getConstants().yield

    return i18n.t(yieldName + " Farm")
  }

  getSpritePath() {
    return "farm_controller.png"
  }

  getType() {
    return Protocol.definition().BuildingType.FarmController
  }

  getConstantsTable() {
    return "Buildings.FarmController"
  }

}

module.exports = FarmController
