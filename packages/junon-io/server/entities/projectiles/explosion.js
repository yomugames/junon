const HitscanProjectile = require("./hitscan_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Explosion extends HitscanProjectile {

  constructor(data) {
    super(data)

    this.width = data.explosionRadius || Constants.tileSize * 6
  }

  onProjectileConstructed() {
    this.damageExplosionTargets()
  }

  damageExplosionTargets() {
    let targets = this.findExplosionTargets(this)
    this.damageTargets(targets)
  }

  damageTargets(entities) {
    entities.forEach((entity) => {
      entity.damage(this.getDamage(entity), this)
    })
  }

  // addDirtToFloors() {
  //   let buildings = this.getContainer().buildingTree.search(this.getBoundingBox())
  //   buildings.forEach((building) => {
  //     if (building.hasCategory("platform") && building.isPlatformDirtiable()) {
  //       let chance = Math.random() < 0.6
  //       if (chance) {
  //         let dirtLevel = Math.floor(Math.random() * 4) + 1
  //         for (var i = 0; i < dirtLevel; i++) {
  //           building.addDirt()
  //         }
  //       }
  //     }
  //   })
  // }


  getType() {
    return Protocol.definition().ProjectileType.Explosion
  }

  updateRbushCoords() {
    var box = this.getBox(this.getX(), this.getY())

    this.minX = box.pos.x,
    this.minY = box.pos.y,
    this.maxX = box.pos.x + box.w,
    this.maxY = box.pos.y + box.h
  }

  getConstantsTable() {
    return "Projectiles.Explosion"
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree, this.sector.buildingTree]
  }

}

module.exports = Explosion
