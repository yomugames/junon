const BaseMob = require("./base_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const Blueprint = require("./../blueprint")
const Ship = require("./../ship")


class Transporter extends BaseMob {
  constructor(sector, x, y, w, h) {
    super(sector, x, y, w, h)

    this.blueprint = new Blueprint(this.getBlueprintData())
    this.ship = new Ship(this.sector, { x: this.getX(), y: this.getY() }, { blueprint: this.blueprint, pilot: this })
    this.ship.setTurnSpeed(1 * Math.PI / 180)

    this.linkSector()
  }

  getBlueprintData() {
    return require("./../../../" + Constants.ShipDesignDirectory + "basic_transport.json")
    // return require("./../../../" + Constants.ShipDesignDirectory + "vulture.json")
  }

  moveEntity(targetEntityToMove, deltaTime) {
    return this.wander(targetEntityToMove)
  }

  getType() {
    return Protocol.definition().MobType.Transporter
  }

  getConstantsTable() {
    return "Mobs.Transporter"
  }

  performAttack(attackTarget) {

  }


}

module.exports = Transporter
