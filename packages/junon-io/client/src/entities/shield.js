const BaseEntity  = require("./base_entity")
const Destroyable  = require("./../../../common/interfaces/destroyable")
const Upgradable  = require("./../../../common/interfaces/upgradable")
// const Tileable  = require("./../../../../common/interfaces/tileable")
const Constants = require("./../../../common/constants.json")
const HealthBar = require("./../components/health_bar")
const Protocol = require("./../../../common/util/protocol")

const getShieldRadius = () => {
  const numTiles = 10
  const shieldShipPadding = Constants.tileSize
  const diameter = Math.ceil(numTiles * Math.sqrt(2)) * Constants.tileSize + shieldShipPadding
  return diameter / 2
}


class Shield extends BaseEntity {
  constructor(game, data) {
    super(game, data)

    this.ship = data.ship
    this.health = data.health
    this.level = data.level

    this.initDestroyable()
    this.healthBar = new HealthBar(this)
  }

  getSprite() {
    const mainSprite = this.getMainSprite()

    const sprite = new PIXI.Container()

    this.shieldSprite = mainSprite
    sprite.addChild(mainSprite)

    return sprite
  }

  getSpriteContainer() {
    return this.game.backgroundSpriteContainer
  }

  animateShieldDamage() {
    if (this.shieldRestoreTimeout) return

    // this.shieldSprite.alpha = 0.2
    this.shieldSprite.tint = 0x34a378

    this.shieldRestoreTimeout = setTimeout(() => {
      this.shieldSprite.tint = 0xffffff
      this.shieldRestoreTimeout = null
      // this.shieldSprite.alpha = 1
    }, 100)
  }

  getMainSprite() {
    const shieldDiameter = getShieldRadius() * 2

    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["shield.png"])
    sprite.anchor.set(0.5)
    sprite.width = shieldDiameter
    sprite.height = shieldDiameter
    sprite.alpha = 1
    window.shield = sprite
    return sprite
  }

  syncWithServer(data) {
    const prevLevel = this.level

    this.setLevel(data.level)
    this.setHealth(data.health)

    if (this.level !== prevLevel && this.level !== 0) {
      this.onLevelIncreased()
    }
  }

  setLevel(level) {
    this.level = level
  }

  onLevelIncreased() {
    if (this.isEntityMenuOpenFor(this)) {
      this.game.showEntityMenu(this)
    }
  }

  getCollisionGroup() {
    return "collisionGroup.Building"
  }
}

/* Implement Destroyable */

Object.assign(Shield.prototype, Upgradable.prototype, {
  getConstantsTable() {
    return "Shield"
  }
})

Object.assign(Shield.prototype, Destroyable.prototype, {
  getMaxHealth() {
    return this.getStats(this.level).health
  },
  onPostSetHealth() {
    this.healthBar.draw()
  },
  onHealthReduced(delta) {
    this.animateShieldDamage()
  },
  onHealthZero() {
    this.remove()
  }
})


module.exports = Shield
