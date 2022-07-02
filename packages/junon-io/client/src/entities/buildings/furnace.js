const Bars = require("./../bars/index")
const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Equipments = require("./../equipments/index")

class Furnace extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    const templateList = this.getTemplateList()
    this.game.craftMenu.open("Furnace", "Craft", this.id, templateList)
  }


  getTemplateList() {
    let barKlasses = Object.values(Bars).filter((value) => {
      return typeof value.getType === "function"
    })

    return barKlasses
  }

  getType() {
    return Protocol.definition().BuildingType.Furnace
  }

  getSpritePath() {
    return "furnace.png"
  }

  getConstantsTable() {
    return "Buildings.Furnace"
  }

  getBuildingSprite() {
    const sprite = new PIXI.Container()

    this.furnaceBackground     = new PIXI.Sprite(PIXI.utils.TextureCache["furnace_background.png"])
    this.furnaceBackground.anchor.set(0.5)
    this.furnaceBackground.name = "FurnaceBackground"

    this.furnaceContainer     = new PIXI.Sprite(PIXI.utils.TextureCache["furnace_container.png"])
    this.furnaceContainer.anchor.set(0.5)
    this.furnaceContainer.name = "FurnaceContainer"

    this.fire     = new PIXI.Sprite(PIXI.utils.TextureCache["furnace_fire.png"])
    this.fire.anchor.set(0.5)
    this.fire.name = "Flames"
    this.fire.width = 20
    this.fire.height = 40
    this.fire.anchor.x = 0.5 // up to 0.85

    this.furnaceCage     = new PIXI.Sprite(PIXI.utils.TextureCache["furnace_cage.png"])
    this.furnaceCage.anchor.set(0.5)
    this.furnaceCage.name = "FurnaceCage"
    this.furnaceCage.width = 20
    this.furnaceCage.height = 28

    sprite.addChild(this.furnaceBackground)
    sprite.addChild(this.fire)
    sprite.addChild(this.furnaceContainer)
    sprite.addChild(this.furnaceCage)

    sprite.width = this.getWidth()
    sprite.height = this.getHeight()

    return sprite
  }


}

module.exports = Furnace
