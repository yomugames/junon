const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class MissileTurret extends BaseTower {

  getBuildingSprite() {
    let sprite = super.getBuildingSprite()

    this.barrelSprite.anchor.x = 0.75
    
    return sprite
  }

  openMenu() {
    this.game.storageMenu.open("Missile Turret", this)
  }

  getBarrelWidth() {
    return 80
  }

  getBarrelHeight() {
    return 80
  }

  getBaseSpritePath() {
    return 'missile_turret_base.png'
  }

  getBarrelSpritePath() {
    return 'missile_turret_gun.png'
  }

  getSpritePath() {
    return 'missile_turret.png'
  }

  getConstantsTable() {
    return "Buildings.MissileTurret"
  }

  getType() {
    return Protocol.definition().BuildingType.MissileTurret
  }

}

module.exports = MissileTurret
