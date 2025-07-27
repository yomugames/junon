const BaseMob = require("./base_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const Mountable = require('../../interfaces/mountable')

class Car extends BaseMob {
  constructor(sector, data) {
    super(sector, data)

    this.initMountable()
    this.previousSpeeds = new Map()
  }

  interact(user) {
    if (!this.owner) return
    if (!this.isOwnedBy(user)) return

    if (!this.passenger) {
      this.mobMount(user)

      this.previousSpeeds.set(user.id, user.speed)

      user.speed = 12
    } else if (this.passenger === user) {
      this.mobUnmount()

      const previousSpeed = this.previousSpeeds.get(user.id)
      if (previousSpeed !== undefined) {
        user.speed = previousSpeed
        this.previousSpeeds.delete(user.id) // Clean up stored speed after restoration
      }
    }
  }

  moveEntity(targetEntityToMove, deltaTime) {
  }

  canDamage(target) {
    return false
  }

  getType() {
    return Protocol.definition().MobType.Car
  }

  getConstantsTable() {
    return "Mobs.Car"
  }
}

Object.assign(Car.prototype, Mountable.prototype, {})

module.exports = Car
