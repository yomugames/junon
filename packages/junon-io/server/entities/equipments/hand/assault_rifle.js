const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class AssaultRifle extends HandEquipment {

  onEquipmentConstructed() {
    this.MAX_BURST_COUNT = 5
    this.burstCount = 0
  }

  resetBurstCount() {
    this.burstCount = 0
  }

  use(user, targetEntity) {
    if (this.isProcessing) return false
    if (!this.hasEnoughAmmo(user)) return false

    super.use(user, targetEntity)

    this.targetUser = user
    this.resetBurstCount()
    this.addProcessor()

    return true
  }

  hasEnoughAmmo(user) {
    if (user.hasInfiniteAmmo()) return true

    const ammoType = this.getAmmoType()
    const ammo = user.inventory.search(ammoType)
    if (!ammo) return false

    return true
  }

  reduceAmmo(user) {
    if (!user.hasInfiniteAmmo()) {
      const ammoType = this.getAmmoType()
      const ammo = user.inventory.search(ammoType)
      if (!ammo) {
        user.showError("Rifle Ammo Required")
        return false
      }

      ammo.reduceCount(1)
    }

    return true
  }

  getConstantsTable() {
    return "Equipments.AssaultRifle"
  }

  getAmmoType() {
    return Protocol.definition().BuildingType.RifleAmmo
  }

  getType() {
    return Protocol.definition().BuildingType.AssaultRifle
  }

  executeTurn() {
    if (this.burstCount >= this.MAX_BURST_COUNT) {
      this.removeProcessor()
      return
    }

    let shouldProceed = this.reduceAmmo(this.targetUser)
    if (!shouldProceed) {
      // out of ammo
      this.removeProcessor()
      return
    }

    this.burstCount += 1

    let user = this.targetUser

    let angleInRad = user.getRadAngle()
    let angleRandomizer = 2 - Math.floor(Math.random() * 5)
    angleInRad = angleInRad + (angleRandomizer * Math.PI / 180)

    Projectiles.RifleBullet.build({
      weapon:        this,
      source:      { x: user.getX(),         y: user.getY() },
      destination: user.getShootTarget(this, angleInRad)
    })
  }

  addProcessor() {
    this.targetUser.getSector().addProcessor(this)
    this.setIsProcessing(true)
  }

  removeProcessor() {
    this.targetUser.getSector().removeProcessor(this)
    this.setIsProcessing(false)
  }

  setIsProcessing(isProcessing) {
    if (this.isProcessing !== isProcessing) {
      this.isProcessing = isProcessing
      this.onIsProcessingChanged()
    }
  }

  onIsProcessingChanged() {
  }
}

module.exports = AssaultRifle
