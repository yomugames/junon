const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Flame extends CollidableProjectile {
  constructor(data) {
    super(data)

    this.radialExpansion = 0
    this.MAX_RADIAL_EXPANSION = this.getConstants().maxRadialExpansion
    
    this.w = data.w || this.getConstants().minWidth // for security
  }

  getType() {
    return Protocol.definition().ProjectileType.Flame
  }

  getConstantsTable() {
    return "Projectiles.Flame"
  }
  
  move() {
    super.move()
  
    this.damageEntity()
    this.expandRadius()
    
    this.onStateChanged()
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.unitTree, this.sector.playerTree, this.sector.buildingTree]
  }

  damageEntity() {

    let boundingBox = this.getBoundingBox()

    let attackables = this.getAttackables()

    let flamableTargets = attackables.map((tree) => {
      return tree.search(boundingBox)
    }).flat()

    flamableTargets.forEach((entity) => {
      let weaponOrOwner;
      if(this.weapon.canDamage) weaponOrOwner = this.weapon
      if(this.owner.canDamage) weaponOrOwner = this.owner
      let canBeDamaged = weaponOrOwner.canDamage(entity)
      if (entity.isFlamable() && canBeDamaged) {
        entity.damage(this.getDamage(entity), this, this)
        entity.addFire()
      }
    })

  }
  
  expandRadius() {
    if (this.stopExpanding) return

    this.radialExpansion += 3
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
    if (entity?.hasCategory("wall")) {
      this.stopExpanding = true
      this.onMoveComplete()
    }
  }

}

module.exports = Flame
