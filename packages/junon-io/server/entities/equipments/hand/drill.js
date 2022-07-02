const SurvivalTool = require("./survival_tool")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const ExceptionReporter = require('junon-common/exception_reporter')

class Drill extends SurvivalTool {
  use(player, targetEntity) {
  }

  getAsteroidTarget(user) {
    const meleeRange = this.getMeleeRange()
    const xp = meleeRange * Math.cos(user.getRadAngle()) // 45degrees
    const yp = meleeRange * Math.sin(user.getRadAngle())

    const boxRadius = 8

    const box = {
      pos: {
        x: user.getX() + xp - boxRadius,
        y: user.getY() + yp - boxRadius,
      },
      w: boxRadius * 2,
      h: boxRadius * 2
    }

    let hits = user.sector.groundMap.hitTestTile(box)
    let closestAsteroidHit = hits.filter((hit) => {
      return hit.entity && hit.entity.isMineable()
    }).sort((hit, otherHit) => {
      let distanceA =  this.game.distanceBetween(hit.entity, otherHit.entity)
      let distanceB =  this.game.distanceBetween(hit.entity, otherHit.entity)
      return distanceA - distanceB
    })[0]

    return closestAsteroidHit && closestAsteroidHit.entity
  }

  remove() {
    super.remove()
    let sector = this.item.getSector()
    if (sector) {
      this.item.getSector().removeProcessor(this)
    }
  }

  onStorageChanged() {
    super.onStorageChanged()
    let sector = this.item.getSector()
    if (sector) {
      this.item.getSector().removeProcessor(this)
    }
  }

  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    const user = this.owner
    if (!user) {
      this.item.getSector().removeProcessor(this)
      return
    }

    if (this.asteroidTarget) {
      if (this.asteroidTarget.isDestroyed()) {
        user.sector.removeProcessor(this)
        return
      }

      let asteroidTarget = this.getAsteroidTarget(user)
      if (this.asteroidTarget !== asteroidTarget) {
        this.asteroidTarget = asteroidTarget

        if (!this.asteroidTarget) {
          user.sector.removeProcessor(this)
        }

        return
      }

      // check if still within range

      this.mineResource(user, asteroidTarget)
      this.setUsage(this.usage - 1)
      user.consumeStamina("attack")
      return
    }

    if (this.meleeTarget) {
      if (this.meleeTarget.isDestroyed()) {
        user.sector.removeProcessor(this)
        return
      }

      let meleeTarget = user.getMeleeTarget(this.getMeleeRange())
      if (this.meleeTarget !== meleeTarget) {
        this.meleeTarget = meleeTarget

        if (!this.meleeTarget) {
          user.sector.removeProcessor(this)
        }

        return
      }

      let success = this.useOnTarget(user, this.meleeTarget)
      user.consumeStamina("attack")
    }

    if (!this.asteroidTarget && !this.meleeTarget) {
      user.sector.removeProcessor(this)
    }

  }

  autodetectTargets(user) {
    let asteroidTarget = this.getAsteroidTarget(user)
    if (this.asteroidTarget !== asteroidTarget) {
      this.asteroidTarget = asteroidTarget
      if (this.asteroidTarget) {
        user.sector.addProcessor(this)
      }
      return
    }

    let target = user.getMeleeTarget(this.getMeleeRange())
    if (this.meleeTarget !== target) {
      this.meleeTarget = target

      if (this.meleeTarget) {
        user.sector.addProcessor(this)
      }
      return
    }
  }

  onOwnerPositionChanged(user) {
    try {
      this.autodetectTargets(user)
    } catch(e) {
      this.game.captureException(e)
    }
  }

  onOwnerAngleChanged(user) {
    try {
      this.autodetectTargets(user)
    } catch(e) {
      this.game.captureException(e)
    }
  }

  getType() {
    return Protocol.definition().BuildingType.Drill
  }

  getDrillRate() {
    return 5
  }

  isMiningEquipment() {
    return true
  }

  getConstantsTable() {
    return "Equipments.Drill"
  }
}

module.exports = Drill
