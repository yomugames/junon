const BaseEntity = require("./base_entity")
const Constants = require('../../common/constants.json')
const Destroyable = require('../../common/interfaces/destroyable')
const Upgradable = require('../../common/interfaces/upgradable')

const getShieldRadius = () => {
  const numTiles = 10
  const shieldShipPadding = Constants.tileSize
  const diameter = Math.ceil(numTiles * Math.sqrt(2)) * Constants.tileSize + shieldShipPadding
  return diameter / 2
}

class Shield extends BaseEntity {
  constructor(sector, container, owner) {

    const shieldDiameter = getShieldRadius() * 2

    super(sector, { x: container.getX(), y: container.getY(), w: shieldDiameter, h: shieldDiameter })

    this.container = container
    this.owner = owner

    this.level = 0
    this.initDestroyable()
  }

  setPositionFromParent() {
    const x = this.getX()
    const y = this.getY()
    const isPositionChanged = (this.body.position[0] !== x || this.body.position[1] !== y)

    this.body.position[0] = x
    this.body.position[1] = y
    this.setXYFromBodyPosition()
    this.body.aabbNeedsUpdate = true

    if (isPositionChanged) {
      this.emitMoveListeners()
    }
  }

  getAlliance() {
    return this.owner.getAlliance()
  }

  getX() {
    return this.container.getX()
  }

  getY() {
    return this.container.getY()
  }

  getConstantsTable() {
    return "Shield"
  }

  getRadius() {
    return getShieldRadius()
  }

  increaseLevel() {
    this.level += 1
    this.onLevelIncreased()
    this.initDestroyable()
  }

  onLevelIncreased() {
    this.setHealth(this.getMaxHealth())
  }

  isShield() {
    return true
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Building
  }

  getCollisionMask() {
    return Constants.collisionGroup.Projectile
  }

  toJson() {
    return {
      health: this.health,
      level: this.level
    }
  }

}

Object.assign(Shield.prototype, Upgradable.prototype, {
  getConstantsTable() {
    return "Shield"
  }
})

Object.assign(Shield.prototype, Destroyable.prototype, {
  onHealthZero() {
    this.container.removeShield(this)
  },
  onPostSetHealth(delta) {

  },
  getMaxHealth() {
    return this.getStats(this.level).health
  }
})

module.exports = Shield
