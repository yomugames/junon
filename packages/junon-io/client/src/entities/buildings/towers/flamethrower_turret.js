const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class FlamethrowerTurret extends BaseTower {

  getSprite() {
    let sprite = super.getSprite()
    this.fillBarContainer.rotation = -Math.PI/2
    this.fillBarContainer.position.x = 0
    this.fillBarContainer.position.y = 32
    return sprite
  }

  getBaseSpritePath() {
    return 'flamethrower_turret_base.png'
  }

  getBarrelSpritePath() {
    return 'flamethrower_turret_gun.png'
  }

  getSpritePath() {
    return 'flamethrower_turret.png'
  }

  getConstantsTable() {
    return "Buildings.FlamethrowerTurret"
  }

  getType() {
    return Protocol.definition().BuildingType.FlamethrowerTurret
  }

}

module.exports = FlamethrowerTurret
