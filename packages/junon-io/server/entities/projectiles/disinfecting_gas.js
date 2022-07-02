const CarbonGas = require("./carbon_gas")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class DisinfectingGas extends CarbonGas {

  constructor(data) {
    super(data)
  }

  getType() {
    return Protocol.definition().ProjectileType.DisinfectingGas
  }

  getConstantsTable() {
    return "Projectiles.DisinfectingGas"
  }

  getExpansionSpeed() {
    return 2
  }

  move() {
    if (this.shouldRemove) {
      return this.cleanupAfterDelay()
    }

    if (this.stopExpanding) {
      this.onMoveComplete()
    } else {
      this.expandRadius()
    }

    this.disinfect()
  }

  determineMovementComplete() {
    if (this.radialExpansion >= this.MAX_RADIAL_EXPANSION) {
      this.stopExpanding = true
    }
  }


  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree, this.sector.buildingTree, this.sector.unitTree]
  }

  disinfect() {
    const isOneSecondInterval = this.game.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    let boundingBox = this.getBoundingBox()

    let entities = this.getAttackables().map((tree) => {
      let targets = tree.search(boundingBox)
      return targets.filter((target) => {
        return target.hasEffect("miasma")
      })
    }).flat()

    entities.forEach((entity) => {
      entity.removeMiasma()
      this.game.triggerEvent("MiasmaDisinfected", { entityId: entity.getId(), entityType: entity.getType(), actorId: this.weapon.owner.getId() })
    })
  }

}

module.exports = DisinfectingGas
