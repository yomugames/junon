const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Sign extends BaseBuilding {

  static getChatBubbleInstance() {

  }

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.Sign
  }

  getSpritePath() {
    return "sign.png"
  }

  getConstantsTable() {
    return "Buildings.Sign"
  }

  openMenu() {
    this.game.signMenu.open({ entity: this })
  }

  onContentChanged() {
    this.game.signMenu.render(this)  
  }

  canMenuBeOpened() {
    return this.isConstructionFinished()
  }

  onHighlighted() {
    let text = this.getText()
    if (text.length === 0) return

    if (this.constructor.chatBubble && !this.constructor.chatBubble.isRemoved) {
      this.constructor.chatBubble.remove()
    }
    this.constructor.chatBubble = this.createChatBubble(text, { isAbsolutePosition: true })
  }

  setAngle(angle) {
    this.angle = angle
    this.sprite.rotation = this.getRadAngle() + Math.PI/2
  }


  getText() {
    if (window.isForeignLanguage && this.localeContents[window.language]) {
      return this.localeContents[window.language]
    }
    
    return this.content || ""
  }

}

module.exports = Sign
