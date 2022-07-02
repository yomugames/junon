const BaseEntity  = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BaseFood extends BaseEntity {
  constructor(game, data) {
    data.x = 0
    data.y = 0

    super(game, data)

    this.role   = data.role
    this.user = data.user
    this.repositionSprite()
  }

  isEdible() {
    let isEdible = this.getConstants().isEdible
    return typeof isEdible !== 'undefined' ? isEdible : true
  }

  onPostEquip() {

  }

  static isUsable() {
    return true
  }

  isWeapon() {
    return false
  }

  playSound() {
    
  }

  static getCost() {
    let cost = this.prototype.getConstants().cost
    return cost ? cost.gold : 2
  }

  isRaw() {
    return false
  }

  isMiningEquipment() {
    return false
  }

  syncWithServer() {
    
  }

  isAnimatable() {
    return true
  }

  animate() {
    if (this.animationTween) return
    this.animationTween = this.getAnimationTween()
    this.animationTween.start()
  }

  stopAnimation() {
    if (this.animationTween) {
      this.animationTween.stop()
    }

    this.animationTween = null
  }

  getAnimationTween() {
    let delta = { delta: 0 }
    let origX = this.sprite.position.x

    const tween = new TWEEN.Tween(delta)
        .to({ delta: 10  }, 200)
        .onUpdate(() => {
          this.sprite.position.x = origX - delta.delta
        })
        .onStop(() => {
          this.sprite.position.x = origX
        })
        .yoyo(true)
        .repeat(Infinity)

    return tween
  }

  remove() {
    this.stopAnimation()

    super.remove()
  }

  hasRequirements() {
    return this.getConstants().requirements
  }

  repositionSprite() {
    this.sprite.anchor.set(0)
    this.sprite.rotation = Math.PI/2
    this.sprite.position.x = 50
    this.sprite.position.y = 20

    let table = this.getConstants()
    if (table.sprite) {
      if (table.sprite.position) {
        this.sprite.position.x = table.sprite.position.x
        this.sprite.position.y = table.sprite.position.y
      }

      if (typeof table.sprite.rotation !== 'undefined') {
        this.sprite.rotation = table.sprite.rotation * Math.PI / 180
      }

      if (typeof table.sprite.anchor !== 'undefined') {
        this.sprite.anchor.set(table.sprite.anchor) 
      }
    }

  }

  getSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    return sprite
  }

  static getSellGroup() {
    return "Foods"
  }

  getSpriteContainer() {
    return this.data.user.characterSprite
  }

  getChildIndex() {
    // before body
    return 1
  }

  static build(game, data) {
    return new this(game, data)
  }

  getType() {
    throw new Error("must implement BaseFood.getType")
  }

}

module.exports = BaseFood

