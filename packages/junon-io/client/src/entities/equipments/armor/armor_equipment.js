const BaseEquipment = require("./../base_equipment")
const ClientHelper = require("./../../../util/client_helper")
const Trail = require("../../particles/trail")

class ArmorEquipment extends BaseEquipment {
  getSpriteContainer() {
    return this.data.user.armorEquipContainer
  }

  hasOxygen() {
    return false
  }

  repositionSprite() {
    this.sprite.anchor.set(0)

    // this.sprite.position.y = 0
    this.sprite.scale.set(0.65)
  }

  animate(user) {
    // if im on platform, dont animate jetpack
    if (user.getStandingPlatform()) return
    if (user.isDestroyed()) return

    this.animationGap = this.animationGap || 0
    const animationInterval = 8

    if (this.animationGap % animationInterval === 0) {
      const radius = Math.floor(Math.random() * 10) + 5

      Trail.create({
        x: this.user.getX(), 
        y: this.user.getY(), 
        angle: this.user.getRotatedAngle(), 
        color: 0x75d3e6, 
        radius: radius, 
        offset: 48
      })
    }

    this.animationGap += 1
  }

  onOxygenChanged() {
    this.user.onOxygenChanged()
  }

  setOxygen(oxygen) {
    // diff from server. we dont care bout armor oxygen. simply trust server data
    if (this.oxygen !== oxygen) {
      this.oxygen = oxygen
      this.onOxygenChanged()
    }
  }


  getMaxOxygen() {
    return this.getConstants().stats.oxygen
  }


  onPostEquip() {
    // only if not worn by building
    if (this.user && this.user.isPlayer()) {
      this.user.redrawVisionLight()
    }
  }


  remove() {
    super.remove()

    if (this.user && this.user.isPlayer()) {
      this.user.redrawVisionLight()
      this.user.onOxygenChanged()
    }
  }

}

module.exports = ArmorEquipment