const BaseMob = require("./base_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')
const Mountable = require('../../interfaces/mountable')

class Car extends BaseMob {
  constructor(sector, data) {
    super(sector, data)

    this.initMountable()
  }

  interact(user) {
    if (!this.owner) this.setOwner(user)
    if (!this.isOwnedBy(user)) return

    if (!this.passenger) {
      this.mobMount(user)
    } else if (this.passenger === user) {
      this.mobUnmount()
    }
  }



  moveEntity(targetEntityToMove, deltaTime) {
    //do nothing, cars don't move
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

Object.assign(Car.prototype, Mountable.prototype, {
})

module.exports = Car
