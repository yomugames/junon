const BaseProjectile = require("./base_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")
const p2 = require("p2")

class Flame extends BaseProjectile {

  constructor(data) {
    super(data)

    this.radialExpansion = 0
    this.MAX_RADIAL_EXPANSION = 16
    this.hasTriggered = false
  }

  getType() {
    return Protocol.definition().ProjectileType.Flame
  }

  getConstantsTable() {
    return "Projectiles.Flame"
  }

  move() {
    if (this.shouldRemove) {
      return this.cleanupAfterDelay()
    }

    this.damageEntity()
    this.expandRadius()
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.unitTree, this.sector.playerTree, this.sector.buildingTree]
  }

  damageEntity() {
    if (this.hasTriggered) {
      const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
      if (!isOneSecondInterval) return
    }

    this.hasTriggered = true

    let boundingBox = this.getBoundingBox()

    let attackables = this.getAttackables()

    let flamableTargets = attackables.map((tree) => {
      return tree.search(boundingBox)
    }).flat()

    flamableTargets.forEach((entity) => {
      let canBeDamaged = (this.owner || this.weapon).canDamage(entity)
      if (entity.isFlamable() && canBeDamaged) {
        entity.damage(this.getDamage(entity), this, this)
        entity.addFire()
      }
    })

  }


  expandRadius() {
    if (this.stopExpanding) return

    this.radialExpansion += 1
    this.setWidthFromExpansion()

    this.onStateChanged()
  }

  setWidthFromExpansion() {
    if (this.radialExpansion) {
      this.width = this.w + this.radialExpansion * 2
    } else {
      this.width = this.w
    }
  }

  determineMovementComplete() {
    if (this.radialExpansion >= this.MAX_RADIAL_EXPANSION) {
      this.stopExpanding = true
      this.onMoveComplete()
    }
  }

  onCollide(entity) {
    // dont do anything
  }

}

module.exports = Flame
