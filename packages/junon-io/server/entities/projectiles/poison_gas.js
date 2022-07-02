const CarbonGas = require("./carbon_gas")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class PoisonGas extends CarbonGas {

  constructor(data) {
    super(data)
    this.removeCountdown = Constants.physicsTimeStep * 2
  }

  getType() {
    return Protocol.definition().ProjectileType.PoisonGas
  }

  getConstantsTable() {
    return "Projectiles.PoisonGas"
  }

  move() {
    if (this.shouldRemove) {
      return this.cleanupAfterDelay()
    }

    if (this.stopExpanding) {
      this.removeCountdown -= 1
      if (this.removeCountdown <= 0) {
        this.onMoveComplete()
      }
    } else {
      this.expandRadius()
    }

    this.infectPoison()
  }

  determineMovementComplete() {
    if (this.radialExpansion >= this.MAX_RADIAL_EXPANSION) {
      this.stopExpanding = true
    }
  }


  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree]
  }

  canDamage(target) {
    if (target.isImmuneTo("poison")) return false

    return super.canDamage(target)
  }


  infectPoison() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    let boundingBox = this.getBoundingBox()

    let entities = this.getAttackables().map((tree) => {
      let targets = tree.search(boundingBox)
      return targets.filter((target) => {
        return this.canDamage(target) 
      })
    }).flat()

    entities.forEach((entity) => {
      entity.addPoison()
    })
  }

}

module.exports = PoisonGas
