const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants")
const Interpolator = require("./../util/interpolator")

class DuplicatedEntity extends BaseEntity {

  initSprite(x, y) {
    this.sprites = {
      leftMirror: this.addSprite(x - Constants.cameraWidth, y),
      main:       this.addSprite(x                      , y),
      rightMirror: this.addSprite(x + Constants.cameraWidth, y)
    }

    for (let spriteKey in this.sprites) {
      let sprite = this.sprites[spriteKey]
      Interpolator.mixin(sprite)
    }
  }

  instructToMove(x, y) {
    this.sprites["leftMirror"].instructToMove(x - Constants.cameraWidth, y)
    this.sprites["main"].instructToMove(x, y)
    this.sprites["rightMirror"].instructToMove(x + Constants.cameraWidth, y)
  }

  setAlpha(alpha) {
    this.sprites["leftMirror"].alpha = alpha
    this.sprites["main"].alpha = alpha
    this.sprites["rightMirror"].alpha = alpha
  }

  setSpriteTexture(texture) {
    this.sprites["leftMirror"].texture = texture
    this.sprites["main"].texture = texture
    this.sprites["rightMirror"].texture = texture
  }


  setScaleX(scale) {
    this.sprites["leftMirror"].scale.x = scale
    this.sprites["main"].scale.x = scale
    this.sprites["rightMirror"].scale.x = scale
  }

  setImmediatePosition(x, y) {
    this.sprites["leftMirror"].setImmediatePosition(x - Constants.cameraWidth, y)
    this.sprites["main"].setImmediatePosition(x, y)
    this.sprites["rightMirror"].setImmediatePosition(x + Constants.cameraWidth, y)
  }

  setAngle(degInRad) {
    this.sprites["leftMirror"].rotation = degInRad
    this.sprites["main"].rotation = degInRad
    this.sprites["rightMirror"].rotation = degInRad
  }

  interpolate(lastFrameTime) {
    for (let spriteKey in this.sprites) {
      let sprite = this.sprites[spriteKey]
      sprite.interpolate(lastFrameTime)
    }
  }

  addSprite(x, y) {
    const sprite = this.getSprite()

    sprite.anchor.set(0.5)
    sprite.position.set(x, y)
    sprite.scale.y = this.getYScale()
    sprite.scale.x = this.getXScale()

    this.getSpriteContainer().addChild(sprite)

    return sprite
  }

  remove() {
    for (let spriteKey in this.sprites) {
      let sprite = this.sprites[spriteKey]
      this.getSpriteContainer().removeChild(sprite)
    }
  }

  getX() {
    return this.sprites["main"].x
  }

  getY() {
    return this.sprites["main"].y
  }


  getYScale() {
    return -1
  }

  getXScale() {
    return 1
  }

}

module.exports = DuplicatedEntity
