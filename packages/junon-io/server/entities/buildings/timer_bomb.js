const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class TimerBomb extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.seconds = 0
    this.container.addProcessor(this)
  }

  remove() {
    super.remove() 
    this.container.removeProcessor(this)
  }

  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    if (this.game.activeScene) return

    this.seconds++

    this.setBuildingContent(this.seconds.toString())

    let duration = 10
    if (this.seconds >= duration) {
      this.trigger()
      this.remove()
    }
  }

  trigger() {
    let explosion = this.createExplosion()
    let targets = this.findExplosionTargets(explosion)
    this.addFlames(targets)
    this.game.triggerEvent("TimerBombExplosion", { entityId: this.getId(), row: this.getRow(), col: this.getCol() })
  }

  canDamage(entity) {
    if (entity.isPlayer()) {
      return this.getOwner() !== entity.getTeam()
    } else if (entity.isMob()) {
      if (!entity.getOwner()) return true

      return this.getOwner() !== entity.getOwner()
    } else if (entity.isBuilding()) {
      return entity.getOwner() !== this.getOwner()
    } else {
      return true
    }
  }

  addFlames(targets) {
    targets.forEach((target) => {
      if (target.isPlayer() || target.isMob()) {
        target.addFire()
      } else if (target.isBuilding()) {
        let building = target
        if (building.hasCategory("platform") || building.isStructure()) {
          if (!building.hasBuildingOnTop() && Math.random() < 0.3) {
            building.addFire(2, { forceFlamable: true })
          }
        }
      }
    })
  }

  createExplosion() {
    return this.sector.createProjectile("Explosion", {
      weapon:        this,
      source:      { x: this.getX(),         y: this.getY() },
      destination: { x: this.getX(),         y: this.getY() }
    })
  }

  getConstantsTable() {
    return "Buildings.TimerBomb"
  }

  getType() {
    return Protocol.definition().BuildingType.TimerBomb
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree, this.sector.buildingTree]
  }

}

module.exports = TimerBomb
