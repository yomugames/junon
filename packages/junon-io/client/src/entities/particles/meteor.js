const Poolable = require("../../../../common/interfaces/poolable")
const ObjectPool = require("../../../../common/entities/object_pool")
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("../projectiles/index")
const Protocol = require("./../../../../common/util/protocol")

class Meteor {
  static create(options) {
    let object = ObjectPool.obtain("Meteor")
    object.setAttributes(options)
    object.animate()
    return object
  }

  setAttributes(options) {
    let spriteContainer = game.sector.effectsContainer

    const minDiameter = Constants.tileSize
    const randomWidth = minDiameter + Math.floor(Math.random() * (Constants.tileSize))
    this.sprite.width = randomWidth
    this.sprite.height = randomWidth

    this.sprite.position.x = options.x 
    this.sprite.position.y = options.y 

    this.sprite.texture = PIXI.utils.TextureCache["meteor_rock.png"]
    spriteContainer.addChild(this.sprite)
  }

  constructor() {
    this.sprite = new PIXI.Sprite()
    this.sprite.anchor.set(0.5)
  }

  animate() {
    let offset = Constants.tileSize * 12
    let angle = Math.PI/4 // 45 degrees

    let sourceX = this.sprite.position.x + offset * Math.cos(angle)
    let sourceY = this.sprite.position.y - offset * Math.cos(angle)
    let destinationX = this.sprite.position.x
    let destinationY = this.sprite.position.y

    let position = { x: sourceX, y: sourceY }

    var tween = new TWEEN.Tween(position)
        .to({ x: destinationX, y: destinationY }, 1000)
        .onUpdate(() => {
          this.sprite.position.x = position.x
          this.sprite.position.y = position.y
        })
        .onComplete(() => {
          this.remove()

          Projectiles.Explosion.create(game, {
            x: this.sprite.position.x,
            y: this.sprite.position.y,
            type: Protocol.definition().ProjectileType.Explosion,
            angle: 0
          })

        })
        .start()

  }

  remove() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite)
    }
    ObjectPool.free("Meteor", this)
  }

}

Object.assign(Meteor.prototype, Poolable.prototype, {
  reset() {
    // not needed. every instance variable is overwritten anyway
  }
})

module.exports = Meteor