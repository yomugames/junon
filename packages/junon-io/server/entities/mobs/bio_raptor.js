const BaseMob = require("./base_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const Mountable = require('../../interfaces/mountable')

class BioRaptor extends BaseMob {
  constructor(sector, data) {
    super(sector, data)

    this.initMountable()
  }

  interact(user) {
    if (!this.owner) return
    if (!this.isOwnedBy(user)) return

    if (!this.passenger) {
      this.mobMount(user)
    } else if (this.passenger === user) {
      this.mobUnmount()
    }
  }

  limitBiomeMovement(targetEntityToMove) {
    let platform = this.getWalkablePlatform()
    if (platform) {
      if (!this.platformEncounterTimestamp) {
        this.platformEncounterTimestamp = this.game.timestamp
      }

      let maxPlatformDuration = Constants.physicsTimeStep * 1
      if ((this.game.timestamp - this.platformEncounterTimestamp) > maxPlatformDuration) {
        return true
      }

      if (!this.isMovingAwayFromGround) {
        // if skymob in ground, go back to sky
        let angle = this.getAngle() 
        let oppositeAngle = (angle + 180) % 360
        const angleRandomizer = Math.floor(Math.random() * 40) - 20

        let oppositeAngleInRad = (oppositeAngle + angleRandomizer) * Math.PI / 180

        this.backtrackAngle = oppositeAngleInRad
        let backtrackDeg = this.backtrackAngle * (180 / Math.PI)
        this.changeBasicWanderDirection(targetEntityToMove, backtrackDeg)

        this.isMovingAwayFromGround = true
      }

      let backtrackForce = this.getForceFromAngle(this.backtrackAngle)
      targetEntityToMove.applyForce(backtrackForce)

      return true
    } else if (!platform) {
      this.isMovingAwayFromGround = false
      this.platformEncounterTimestamp = null
    }

    return false
  }

  moveEntity(targetEntityToMove, deltaTime) {
    if (this.passenger) {
    } else {
      super.moveEntity(targetEntityToMove, deltaTime)
    }
  }

  canDamage(target) {
    if (target.isOnLand()) return false

    return super.canDamage(target)
  }

  isNightMob() {
    return true
  }

  getType() {
    return Protocol.definition().MobType.BioRaptor
  }

  getConstantsTable() {
    return "Mobs.BioRaptor"
  }

}

Object.assign(BioRaptor.prototype, Mountable.prototype, {
})

module.exports = BioRaptor
