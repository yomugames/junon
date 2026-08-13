const HandEquipment = require("./hand_equipment")
const Projectiles = require("./../../projectiles/index")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")


class RangeEquipment extends HandEquipment {
  checkForAmmo(user) {
    if (!user.hasInfiniteAmmo()) {
      const ammoType = this.getAmmoType()
      const ammo = user.inventory.search(ammoType)
      if (!ammo) {
        user.showError("Ammo Required")
        return false
      }
      
      ammo.reduceCount(1)
      return true
      
    }
    return true
  }
  
  usesShellOrMagazine() {
    return false
  }
  
  getProjectileBiasByX() {
    return this.getConstants().projectileBiasByX
  }
  
  getProjectileBiasByY() {
    return this.getConstants().projectileBiasByY
  }
  
  getProjectileBiasBarrelLength() {
    return this.getConstants().projectileBarrelLength
  }
  
  getProjectileType() {
    throw new Error("must implement RangeEquipment.getProjectileType")
  }
  
  constructProjectileData(data) {
    return {
      weapon:        this,
      source:      { x: data.sourcePoint[0],         y: data.sourcePoint[1] },
      destination: data.destination
    }
  }

  getDestination(user) {
    const spreadAngle = this.getSpreadAngle()
    const randomOffset = (2 * Math.random() - 1) * spreadAngle
    
    const angleInRad = user.getRadAngle() + (randomOffset * Math.PI / 180)
    
    return user.getShootTarget(this, angleInRad)
  }
  
  getSpreadAngle() {
    return this.getConstants().stats.spreadAngle || 0
  }
  
  getBurstCount() {
    return this.getConstants().stats.burstCount || 1
  }
  
  getBurstTimeout() {
    return this.getConstants().stats.burstTimeout || 0
  }
  
  shoot(user, targetEntity) {
    const biasX = this.getProjectileBiasByX()
    const biasY = this.getProjectileBiasByY()
    const barrelLength = this.getProjectileBiasBarrelLength()
    
    const angle = user.getRadAngle()
    
    const rotatedBiasX = biasX * Math.cos(angle) - biasY * Math.sin(angle)
    const rotatedBiasY = biasX * Math.sin(angle) + biasY * Math.cos(angle)
    
    const sourcePoint = user.game.pointFromDistance(user.getX() + rotatedBiasX, user.getY() + rotatedBiasY, Constants.tileSize * barrelLength, user.getRadAngle())

    if (!this.sector.settings.isGunsShootThroughWalls && this.isObstructed(user, sourcePoint)) {
      return
    }

    const projectile = this.getProjectileType()
    
    const destination = this.getDestination(user)
    
    const data = {
      destination: destination,
      sourcePoint: sourcePoint
    }
    
    projectile.build(this.constructProjectileData(data))
  }
  
  use(user, targetEntity) {
    if (this.usesShellOrMagazine()) {
      if (!this.checkForAmmo(user)) { return false }
    }
    
    const burstCount = this.getBurstCount()
    const burstTimeout = this.getBurstTimeout()
    let bursts = 0

      
    const fireNext = () => {
      if (bursts >= burstCount) return
      
      if (!this.usesShellOrMagazine()) {
        if (!this.checkForAmmo(user)) {
        bursts = burstCount
        return false
        }
      }

      super.use(user, targetEntity, { shouldAnimate: true })
      this.shoot(user, targetEntity)
      
      bursts++
      if (bursts < burstCount) {
        setTimeout(fireNext, burstTimeout)
      }
      
    }
    fireNext()
  }

  getAmmoType() {
    throw new Error("must implement RangeEquipment.getAmmoType")
  }
}

module.exports = RangeEquipment
