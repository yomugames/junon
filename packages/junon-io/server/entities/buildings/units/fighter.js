const BaseUnit = require("./base_unit")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

class Fighter extends BaseUnit {

  getType() {
    return Protocol.definition().BuildingType.Fighter
  }

  getConstantsTable() {
    return "Buildings.Fighter"
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

module.exports = Fighter
