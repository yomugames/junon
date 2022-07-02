const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class MiniTurret extends BaseTower {

  openMenu() {
    this.game.storageMenu.open("Mini Turret", this)
  }

  getBaseSpritePath() {
    return 'sentry_turret_base.png'
  }

  getBarrelSpritePath() {
    return 'sentry_turret_gun.png'
  }

  getSpritePath() {
    return 'sentry_turret.png'
  }

  getConstantsTable() {
    return "Buildings.MiniTurret"
  }

  getType() {
    return Protocol.definition().BuildingType.MiniTurret
  }

}

module.exports = MiniTurret
