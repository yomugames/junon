const BaseEntity  = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Helper = require("./../../../../common/helper")
const Poolable = require("../../../../common/interfaces/poolable")
const ObjectPool = require("../../../../common/entities/object_pool")

class BaseProjectile extends BaseEntity {
  static create(game, data) {
    let projectileName = Helper.getProjectileNameById(data.type)
    let projectile = ObjectPool.obtain(projectileName, game, data)

    projectile.setEntityAttributes(game, data)
    projectile.setAttributes(data)
    projectile.interpolator.reset()
    projectile.onProjectileConstructed()

    return projectile
  }

  constructor(game, data) {
    super(game, data)

    this.reset()
  }

  setAttributes(data) {
    this.angle = data.angle
    this.sprite.rotation = this.getRadAngle()
    this.sprite.visible = true
  }

  onProjectileConstructed() {
  }

  shouldRemoveImmediately() {
    return false
  }

  markForRemoval() {
    this.shouldRemove = true
  }

  onNoPositionAvailable() {
  }

  getSpriteContainer() {
    return this.game.sector.spriteLayers["projectiles"]
  }

  onPostRemoved() {
    // were sure thats its removed..

  }

  interpolate(lastFrameTime) {
    if (this.shouldRemove) {
      if (this.interpolator.hasCoveredDistance()) {
        this.performRemove()
        this.onPostRemoved()
        return
      }
    }

    if (this.hasCategory("distance_dependent_width")) {
      let distance = Helper.distance(0, 0, this.interpolator.distanceCoveredThisFrame.x, this.interpolator.distanceCoveredThisFrame.y)
      let width = (distance / 10) * this.getDisplayWidth()
      this.sprite.width = Math.max(width, 16)
    }

    super.interpolate(lastFrameTime)
  }

  syncWithServer(data) {
    // console.log("move projectile: " + data.id + " " + [data.x, data.y].join(","))
    this.instructToMove(data.x, data.y)
    this.onPositionChanged()

    this.angle = data.angle
    this.instructToRotate(this.getRadAngle())
  }

  getGroup() {
    return "projectiles"
  }

  onPositionChanged() {
    this.registerToChunk()
  }

  isFastProjectile() {
    return this.getSpeed() >= 25
  }

  getSpeed() {
    return this.getConstants().speed
  }

  // for debugging projectile id
  // getSprite() {
  //   let container = new PIXI.Container()
  //   let sprite = super.getSprite()
  //   container.addChild(sprite)

  //   const style  = { fontFamily : 'PixelForce', fontSize: 14, fill : 0xffffff, align : 'center', strokeThickness: 4, miterLimit: 3 }
  //   this.idSprite = new PIXI.Text(this.data.id, style)
  //   this.idSprite.name = "id"
  //   this.idSprite.anchor.set(0.5)

  //   container.addChild(this.idSprite)

  //   return container
  // }

  remove(entityData) {
    if (this.isFastProjectile()) {
      if (entityData) {
        let x = entityData.x
        let y = entityData.y
        this.instructToMove(x, y)
        
        this.angle = entityData.angle
        this.instructToRotate(this.getRadAngle())
      }

      this.markForRemoval()
    } else {
      this.performRemove()
    }
  }

  performRemove() {
    this.getContainer().unregisterEntity("projectiles", this)
    if (this.getChunk()) {
      this.getChunk().unregister("projectiles", this)
    }

    let projectileName = Helper.getProjectileNameById(this.getType())
    ObjectPool.free(projectileName, this)

    // unregister from global entity list
    this.unregisterEntity()

    this.sprite.visible = false

    for (let effect in this.effectInstances) {
      let effectInstance = this.effectInstances[effect]
      effectInstance.remove()
    }
  }

}

Object.assign(BaseProjectile.prototype, Poolable.prototype, {
  reset() {
    this.chunks = {}
    this.shouldRemove = false
  }
})

module.exports = BaseProjectile
