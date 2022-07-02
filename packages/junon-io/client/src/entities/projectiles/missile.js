const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Trail = require("../particles/trail")

class Missile extends BaseProjectile {

  constructor(game, data) {
    super(game, data)
  }

  reset() {
    super.reset()
    this.interpolationCounter = 0
  }

  onProjectileConstructed() {
    this.game.playSound("missile")
  }

  getSpritePath() {
    return 'missile.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.Missile
  }


  getConstantsTable() {
    return "Projectiles.Missile"
  }

  onPostRemoved() {
    // this.animateExplosion()
  }

  animateExplosion() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["circle.png"])
    sprite.anchor.set(0.5)
    sprite.position.x = this.getX()
    sprite.position.y = this.getY()
    this.game.sector.effectsContainer.addChild(sprite)

    let width = { width: 10 }
    let randomWidth = Math.floor(Math.random() * 100) + 50

    var tween = new TWEEN.Tween(width)
        .to({ width: randomWidth }, 200)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.width = width.width
          sprite.height = width.width
        })
        .onComplete(() => {
          this.game.sector.effectsContainer.removeChild(sprite)
        })
        .start()
  }


  addTrail() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["white_smoke.png"])
    sprite.anchor.set(0.5)
    sprite.width = randomWidth
    sprite.height = randomWidth
    sprite.tint = 0x777777
    sprite.position.x = this.getX()
    sprite.position.y = this.getY()

    this.game.sector.effectsContainer.addChild(sprite)

    let alpha = { alpha: 1 }

    var tween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 2500)
        .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          sprite.alpha = alpha.alpha
        })
        .onComplete(() => {
          this.game.sector.effectsContainer.removeChild(sprite)
        })
        .start()
  }

  interpolate(lastFrameTime) {
    // create trail
    if (this.interpolationCounter % 2 === 0) {
      Trail.create({
        x: this.getX(), 
        y: this.getY(), 
        angle: 0, 
        color: 0x777777, 
        radius: 3, 
        offset: 0
      })
    }

    super.interpolate(lastFrameTime)

    this.interpolationCounter += 1
  }

}

module.exports = Missile
