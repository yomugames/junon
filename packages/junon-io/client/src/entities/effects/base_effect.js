const Definable = require("./../../../../common/interfaces/definable")
const ClientHelper = require("./../../util/client_helper")

class BaseEffect  {
  getSpritePath() {
    return this.getConstants().sprite
  }

  getTypeName() {
    return this.getConstants().name
  }

  hasSprite() {
    return !!this.getSpritePath()
  }

  constructor(affectedEntity) {
    this.affectedEntity = affectedEntity
    this.game = affectedEntity.game

    if (this.hasSprite()) {
      this.sprite = this.getSprite()
      if (this.sprite) {
        this.getEffectSpriteContainer(this.affectedEntity, this.getTypeName()).addChild(this.sprite)
      }
    }

    this.affectedEntity.addEffectInstance(this.getTypeName(), this)

    this.onPostInit()
  }

  onLevelChanged(level) {

  }

  getX() {
    return this.sprite.position.x
  }

  getY() {
    return this.sprite.position.y
  }

  onPostInit() {

  }

  getMaxEffectLevel() {
    return this.affectedEntity.getMaxEffectLevel()
  }

  remove() {
    if (this.tween) {
      this.tween.stop()
    }

    this.affectedEntity.removeEffectInstance(this.getTypeName())

    if (this.sprite) {
      ClientHelper.removeSelfAndChildrens(this.sprite)
    }
  }

  getSprite() {
    let sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    sprite.name = this.getTypeName()
    sprite.anchor.set(0.5)

    // if (this.isTargetLivingEntity()) {
    // } else {
    //   sprite.position.set(this.affectedEntity.getX(), this.affectedEntity.getY())
    // }

    return sprite
  }

  isTargetLivingEntity() {
    return this.affectedEntity.isPlayer() || this.affectedEntity.isMob()
  }

  getEffectSpriteContainer(entity, effect) {
    if (entity.isTerrain()) {
      return this.game.sector.groundEffectsContainer
    }
    
    return entity.sprite
    // if (this.isTargetLivingEntity()) {
    //   return entity.sprite
    // }

    // let container = this.game.sector.groundEffectsContainer

    // switch(effect) {
    //   case "water":
    //     container = this.game.sector.highGroundEffectsContainer
    //     break
    //   default:
    //     container = this.game.sector.effectsContainer
    // }

    // return container
  }


}

Object.assign(BaseEffect.prototype, Definable.prototype, {
})

module.exports = BaseEffect
