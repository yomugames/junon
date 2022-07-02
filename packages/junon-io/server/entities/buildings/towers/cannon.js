const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

class Cannon extends BaseTower {

  getType() {
    return Protocol.definition().BuildingType.Cannon
  }

  getConstantsTable() {
    return "Buildings.Cannon"
  }

  performAttack(attackTarget) {
    const projectile = new Projectiles.CannonBall({
      weapon: this,
      destinationEntity:  attackTarget,
      source:      { x: this.getX(),         y: this.getY() },
      destination: { x: attackTarget.getX(), y: attackTarget.getY() }
    })
  }


}

module.exports = Cannon
