const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

class Turret extends BaseTower {

  getType() {
    return Protocol.definition().BuildingType.Turret
  }

  getConstantsTable() {
    return "Buildings.Turret"
  }

  performAttack(attackTarget) {
    super.performAttack(attackTarget)

    const projectile = new Projectiles.BasicLaser({
      weapon:       this,
      destinationEntity:  attackTarget,
      source:      { x: this.getX(),         y: this.getY() },
      destination: { x: attackTarget.getX(), y: attackTarget.getY() }
    })
  }


}

module.exports = Turret
