const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class SpaceSuit extends ArmorEquipment {

  getSpritePath() {
    return 'space_helmet_2.png'
  }

  repositionSprite() {
    this.sprite.position.x = 18
    this.sprite.position.y = 12

    if (this.game.isCanvasMode()) {
      this.sprite.rotation = -Math.PI/2
      this.sprite.scale.set(0.7)
      this.sprite.position.x = 12
      this.sprite.position.y = 20
    }
  }

  onPostEquip() {
    super.onPostEquip()

    this.updateHandsColor()
  }

  updateHandsColor() {
    let color = this.data.instance.content || this.content || "gray"

    if (this.user && this.user.isPlayer() && color !== 'gray') {
      this.user.hands.tint = 0x666666
      this.user.leftHand.tint = 0x666666
      this.user.rightHand.tint = 0x666666
    } else {
      this.user.hands.tint = 0xd2b48c
      this.user.leftHand.tint = 0xd2b48c
      this.user.rightHand.tint = 0xd2b48c
    }
  }

  remove() {
    super.remove()

    if (this.user && this.user.isPlayer()) {
      this.user.hands.tint = 0xd2b48c
      this.user.leftHand.tint = 0xd2b48c
      this.user.rightHand.tint = 0xd2b48c
    }
  }

  getBaseSpritePath() {
    return 'space_helmet_base.png'
  }

  getEyeSpritePath() {
    return 'space_helmet_eye.png'
  }

  onContentChanged() {
    if (this.content) {
      let texture = this.game.armorTextures[this.content]
      if (texture) {
        this.sprite.texture = texture
      }

      let colorIndex = Constants.SuitColors[this.content].index
      this.game.suitColorMenu.setColorIndex(colorIndex)

      this.updateHandsColor()
    }
  }

  getSprite() {
    // return this.game.getPlainArmorSprite()
    let color = "gray"
    if (this.data.instance.content) {
      color = this.data.instance.content
    }

    let sprite = new PIXI.Sprite(this.game.armorTextures[color])
    return sprite
  }

  hasOxygen() {
    return true
  }

  getType() {
    return Protocol.definition().BuildingType.SpaceSuit
  }

  getConstantsTable() {
    return "Equipments.SpaceSuit"
  }

}

module.exports = SpaceSuit