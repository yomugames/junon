const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class BomberTurret extends BaseTower {

  getBuildingSprite() {
    let sprite = super.getBuildingSprite()

    this.barrelSprite.anchor.x = 0.5
    
    return sprite
  }

  openMenu() {
    this.game.storageMenu.open("Bomber Turret", this)
  }

  getBarrelWidth() {
    return 80
  }

  getBarrelHeight() {
    return 80
  }

  getBaseSpritePath() {
    return 'bomber_turret_by_px.png'
  }

  getBarrelSpritePath() {
    return 'bomber_turret_by_px.png'
  }

  getSpritePath() {
    return 'bomber_turret_by_px.png'
  }

  getConstantsTable() {
    return "Buildings.BomberTurret"
  }

  getType() {
    return Protocol.definition().BuildingType.BomberTurret
  }

}

module.exports = BomberTurret
