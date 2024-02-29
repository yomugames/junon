const HitscanProjectile = require("./hitscan_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class MiningExplosion extends HitscanProjectile {

  constructor(data) {
    super(data)

    this.width = data.explosionRadius || Constants.tileSize * 3
  }

  onProjectileConstructed() {
    let targets = this.findExplosionTargets(this)

    targets.forEach((target) => {
        if(target.getEntityGroup() == "terrains") {
            if(target.getTypeName() == "Asteroid" || target.getTypeName() == "CopperAsteroid" || target.getTypeName() == "MeteoriteAsteroid") {
                target.remove()
            }
        } else {
            target.damage(this.getDamage(target), this)
        }
    })
  }


  getType() {
    return Protocol.definition().ProjectileType.MiningExplosion
  }

  updateRbushCoords() {
    var box = this.getBox(this.getX(), this.getY())

    this.minX = box.pos.x,
    this.minY = box.pos.y,
    this.maxX = box.pos.x + box.w,
    this.maxY = box.pos.y + box.h
  }

  getConstantsTable() {
    return "Projectiles.MiningExplosion"
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree, this.sector.buildingTree, this.sector.groundMap]
  }


  findExplosionTargets(explosion) {
    let targets = this.getAttackables().map((tree) => {
      return tree.search(explosion.getBoundingBox())
    }).flat()

    // for each target, raycast to it, if there's a wall in between, then dont include target
    return targets.filter((entity) => {
      let container = this.getContainer()

      let distance = this.game.distance(this.getX(), this.getY(), entity.getX(), entity.getY())
      let entityToIgnore = this
      let obstacles = container.getRaycastObstacles(this.getX(), this.getY(), entity.getX(), entity.getY(), distance, entityToIgnore)
      let hasWallDoorInBetween = obstacles.find((hit) => {
        return (hit.entity.hasCategory("wall") || hit.entity.hasCategory("door")) &&
               hit.entity !== entity
      })

      return !hasWallDoorInBetween
    })
  }
}

module.exports = MiningExplosion
