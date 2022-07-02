const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Equipments = require("./../equipments/index")

class SuitStation extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  onContentChanged() {
    const armorType = this.content

    if (armorType) {
      let suitType = armorType.split(":")[0]
      let color = armorType.split(":")[1]

      let data = { x: 0, y: 0, user: this }
      data.instance = {
        content: color
      }

      this.armor = Equipments.forType(suitType).build(this.game, data)
    } else if (this.armor) {
      // no more armor in storage, remove it
      this.armor.remove()
    }
  }

  getType() {
    return Protocol.definition().BuildingType.SuitStation
  }

  getSpritePath() {
    return "suit_station.png"
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["suit_station_base.png"])
    this.baseSprite.name = "BaseSprite"
    this.baseSprite.anchor.set(0.5)

    this.leftCoverSprite = new PIXI.Sprite(PIXI.utils.TextureCache["suit_station_cover.png"])
    this.leftCoverSprite.anchor.set(0.5)
    this.leftCoverSprite.name = "LeftDoor"
    this.leftCoverSprite.rotation = Math.PI
    this.leftCoverSprite.position.y = -Constants.tileSize/2
    this.leftCoverSprite.alpha = 0

    this.rightCoverSprite = new PIXI.Sprite(PIXI.utils.TextureCache["suit_station_cover.png"])
    this.rightCoverSprite.anchor.set(0.5)
    this.rightCoverSprite.name = "RightDoor"
    this.rightCoverSprite.position.y = Constants.tileSize/2
    this.rightCoverSprite.alpha = 0

    this.armorEquipContainer = new PIXI.Container()
    this.armorEquipContainer.name = "ArmorEquipment"
    this.armorEquipContainer.pivot.x = Constants.tileSize/2
    this.armorEquipContainer.pivot.y = Constants.tileSize/2 + 4
    this.armorEquipContainer.rotation = Math.PI

    this.buttonSprite = new PIXI.Sprite(PIXI.utils.TextureCache["suit_station_button.png"])
    this.buttonSprite.anchor.set(0.5)
    this.buttonSprite.name = "Button"
    // this.buttonSprite.position.y = Constants.tileSize/2

    this.topCoverSprite = new PIXI.Sprite(PIXI.utils.TextureCache["suit_station_top.png"])
    this.topCoverSprite.anchor.set(0.5)
    this.topCoverSprite.name = "TopCover"
    this.topCoverSprite.position.x = 18


    sprite.addChild(this.baseSprite)
    sprite.addChild(this.leftCoverSprite)
    sprite.addChild(this.rightCoverSprite)
    sprite.addChild(this.buttonSprite)
    sprite.addChild(this.armorEquipContainer)
    sprite.addChild(this.topCoverSprite)

    return sprite
  }


  getConstantsTable() {
    return "Buildings.SuitStation"
  }

}

module.exports = SuitStation
