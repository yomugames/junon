const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")

class MiasmaBullet extends CollidableProjectile {
  constructor(data) {
    super(data)

    this.radialExpansion = 0
    this.MAX_RADIAL_EXPANSION = this.getConstants().maxRadialExpansion
    
    this.piercesWalls = data.piercesWalls || false
    
    this.w = data.w || this.getConstants().minWidth // for security
  }

  getType() {
    return Protocol.definition().ProjectileType.MiasmaBullet
  }

  move() {
    super.move()
    this.spreadMiasma()
    this.expandRadius()

    this.onStateChanged()
  }

  expandRadius() {
    if (this.stopExpanding) return

    this.radialExpansion += 2
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

  spreadMiasma() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    let boundingBox = this.getNeighborBoundingBox(Constants.tileSize)

    // spread to players, mobs, crops
    let players = this.sector.playerTree.search(boundingBox)
    let mobs = this.sector.mobTree.search(boundingBox)
    let crops = this.sector.buildingTree.search(boundingBox).filter((entity) => {
      return entity.isCrop()
    })

    players.forEach((entity) => {
      if (!entity.isImmuneTo("miasma")) {
        entity.addMiasma()
      }
    })

    mobs.forEach((entity)    => {
      if (!entity.isImmuneTo("miasma")) {
        entity.addMiasma()
      }
    })

    crops.forEach((entity)   => {
      if (!entity.isImmuneTo("miasma")) {
        entity.addMiasma()
      }
    })
  }

  onCollide(entity) {
    if (entity?.hasCategory("wall")) {
      this.remove()
    }
  }

  getConstantsTable() {
    return "Projectiles.MiasmaBullet"
  }

}

module.exports = MiasmaBullet
