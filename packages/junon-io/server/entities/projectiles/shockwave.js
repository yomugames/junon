const HitscanProjectile = require("./hitscan_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Shockwave extends HitscanProjectile {

  constructor(data) {
    super(data)

    this.width = data.explosionRadius || Constants.explosionRadius
  }

  onProjectileConstructed() {
    this.damageShockwaveTargets()
  }

  damageShockwaveTargets() {
    let targets = this.findExplosionTargets(this)
    this.damageTargets(targets)
  }

  damageTargets(entities) {
    entities.forEach((entity) => {
      entity.damage(this.getDamage(entity), this)
      entity.addParalyze()
    })
  }

  getType() {
    return Protocol.definition().ProjectileType.Shockwave
  }

  updateRbushCoords() {
    var box = this.getBox(this.getX(), this.getY())

    this.minX = box.pos.x,
    this.minY = box.pos.y,
    this.maxX = box.pos.x + box.w,
    this.maxY = box.pos.y + box.h
  }

  getConstantsTable() {
    return "Projectiles.Shockwave"
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree, this.sector.buildingTree]
  }

}

module.exports = Shockwave
