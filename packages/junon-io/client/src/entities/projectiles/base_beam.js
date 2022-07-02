const BasicLaser = require("./basic_laser")
const Interpolator = require("./../../util/interpolator")

class BaseBeam extends BasicLaser {

  constructor(game, data) {
    super(game, data)

    this.isFirstDraw = true

    this.drawBeam()
  }

  getBaseSpritePath() {
    return 'void_ray_light.png'
  }

  getHeadSpritePath() {
    return 'light_blue_circle.png'
  }

  getHeadWidth() {
    return 15
  }

  getRayThickness() {
    return 7
  }

  getSprite() {
    const sprite = new PIXI.Container()

    this.raySprite      = new PIXI.Sprite(PIXI.utils.TextureCache[this.getBaseSpritePath()])
    Interpolator.mixin(this.raySprite)

    this.headSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getHeadSpritePath()])
    Interpolator.mixin(this.headSprite)

    this.headSprite.alpha = 1

    this.raySprite.height = this.getRayThickness()
    this.raySprite.width  = 0
    this.raySprite.anchor.set(0, 0.5)
    this.headSprite.anchor.set( 0.5, 0.5)

    sprite.addChild(this.raySprite)
    sprite.addChild(this.headSprite)

    return sprite
  }

  calculateBeamDistance() {
    return Math.sqrt((this.destination.x - this.source.x) ** 2 + (this.destination.y - this.source.y) ** 2)
  }

  drawBeam() {
    if (this.isFirstDraw) {
      // we show the beam instantly on first draw, interpolate afterwards
      // this is to fix bug where you dont see ongoing interpolated short lived beam when it gets destroyed immediately after a tick
      this.isFirstDraw = false
      return this.drawBeamInstant()
    }

    const distance = this.calculateBeamDistance()

    this.sprite.instructToMove(this.source.x, this.source.y)
    this.raySprite.instructToExpand(distance)

    this.headSprite.instructToMove(distance, 0)
    this.headSprite.width  = this.getHeadWidth()
    this.headSprite.height = this.getHeadWidth()
  }

  drawBeamInstant() {
    const distance = this.calculateBeamDistance()

    this.sprite.position.set(this.source.x, this.source.y)
    this.sprite.rotation = this.getRadAngle()
    this.raySprite.width = distance

    this.headSprite.position.set(distance, 0)
    this.headSprite.width  = this.getHeadWidth()
    this.headSprite.height = this.getHeadWidth()
  }

  shouldRemoveImmediately() {
    return false
  }

  syncWithServer(data) {
    this.setData(data)
    this.drawBeam()
  }

  setAngle(angle) {
    this.angle = angle
    this.instructToRotate(this.getRadAngle())
  }

  interpolate(lastFrameTime) {
    // we want to interpolate movement of the ray so its smooth
    this.sprite.interpolate(lastFrameTime)
    this.sprite.interpolateRotation(lastFrameTime)

    this.headSprite.interpolate(lastFrameTime)
    this.raySprite.interpolateExpansion(lastFrameTime)
  }


  animate() {

  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()

    this.cleanupTween()
  }

  getCoreExpandTween() {
    let width = { width: this.getHeadWidth() }
    const duration = 250

    return new TWEEN.Tween(width)
        .to({ width: this.getHeadWidth() * 1.5  }, duration)
        .onUpdate(() => {
          this.headSprite.width = width.width
          this.headSprite.height = width.width
        })
        .repeat(Infinity)
  }

}

module.exports = BaseBeam
