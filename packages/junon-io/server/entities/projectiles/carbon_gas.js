const BaseProjectile = require("./base_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")
const p2 = require("p2")

class CarbonGas extends BaseProjectile {

  constructor(data) {
    super(data)

    this.radialExpansion = 0
    this.MAX_RADIAL_EXPANSION = this.getConstants().maxRadialExpansion
  }

  getType() {
    return Protocol.definition().ProjectileType.CarbonGas
  }

  getConstantsTable() {
    return "Projectiles.CarbonGas"
  }

  move() {
    if (this.shouldRemove) {
      return this.cleanupAfterDelay()
    }

    this.expandRadius()
    this.consumeFire()
  }

  getFlamables() {
    return this.sector.getPlayerAttackables().concat(this.sector.unitTree)
                                             .concat(this.sector.groundMap)
                                             .concat(this.sector.platformMap)
  }

  consumeFire() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    let boundingBox = this.getBoundingBox()

    let entitiesOnFire = this.getFlamables().map((tree) => {
      let targets = tree.search(boundingBox)
      return targets.filter((entity) => {
        return entity.isOnFire()
      })
    }).flat()

    entitiesOnFire.forEach((entity) => {
      entity.reduceFire()
    })
  }

  expandRadius() {
    if (this.stopExpanding) return

    this.radialExpansion += this.getExpansionSpeed()
    this.setWidthFromExpansion()
    this.updateRbushCoords()
    this.onStateChanged()
  }

  getExpansionSpeed() {
    return 1
  }

  setWidthFromExpansion() {
    if (this.radialExpansion) {
      this.width = this.w + this.radialExpansion * 2
    } else {
      this.width = this.w
    }
  }

  // bounding box calculation should be based on expanded width variable
  getExpandedBox(x = this.getX(), y = this.getY()) {
    let w = this.width || this.w
    let h = this.width || this.w

    return {
      pos: {
        x: x - w/2,
        y: y - h/2,
      },
      w: w,
      h: h
    }
  }

  updateRbushCoords() {
    var box = this.getExpandedBox(this.getX(), this.getY())

    this.minX = box.pos.x,
    this.minY = box.pos.y,
    this.maxX = box.pos.x + box.w,
    this.maxY = box.pos.y + box.h
  }


  determineMovementComplete() {
    if (this.radialExpansion >= this.MAX_RADIAL_EXPANSION) {
      this.stopExpanding = true
      this.onMoveComplete()
    }
  }


  // shouldRemoveImmediately() {
  //   return false
  // }

  onCollide(entity) {
    // dont do anything
  }

}

module.exports = CarbonGas
