const BaseProjectile = require("./base_projectile")
const SAT = require("sat")
const p2 = require("p2")
const vec2 = p2.vec2

class CollidableProjectile extends BaseProjectile {

  onProjectileConstructed() {
  }

  onCollide(entity) {
    const damage = this.getDamage(entity)

    if (this.canDamage(entity)) {
      entity.damage(damage, this, this)

      this.removeCollidable()
      
      return true
    }

    return false
  }

  getDamage(entity) {
    let damage = super.getDamage(entity)

    if (this.damageReduction) {
      return Math.max(0, damage - this.damageReduction)
    } else {
      return damage
    }
  }

  removeCollidable() {
    this.remove()
  }

  checkCollisions() {
    if (this.speed <= this.getWidth() || this.forceAABBCollision) {
      this.checkCollisionsSimple()
    } else {
      this.checkCollisionsCCD()
    }
  }

  checkCollisionsSimple() {
    this.getCollidables().forEach((tree) => {
      this.checkCollisionsSimpleForTree(tree)
    })
  }

  checkCollisionsSimpleForTree(tree) {
    let destroyables = tree.search(this.getBoundingBox())
    for (var i = 0; i < destroyables.length; i++) {
      let destroyable = destroyables[i]
      let isCollided = this.onCollide(destroyable)

      if (isCollided && !this.canPierceMultipleTargets()) {
        break
      }
    }
  }

  getPaddedBoundingBox() {
    let box = this.getBoundingBox()
    let padding = this.speed

    return {
      minX: box.minX - padding,
      maxX: box.maxX + padding,
      minY: box.minY - padding,
      maxY: box.maxY + padding
    } 
  }

  checkCollisionsCCD() {
    this.getCollidables().forEach((tree) => {
      this.checkCollisionsCCDForTree(tree)
    })
  }

  checkCollisionsCCDForTree(tree) {
    let potentialDestroyables = tree.search(this.getPaddedBoundingBox())
    for (var i = 0; i < potentialDestroyables.length; i++) {
      let destroyable = potentialDestroyables[i]
      if (this.projectileIntersects(destroyable)) {
        let isCollided = this.onCollide(destroyable)
        
        if (isCollided && !this.canPierceMultipleTargets()) {
          break
        }
      }
    }
  }

  projectilePointIntersects(target) {
    const circle = new SAT.Circle(new SAT.Vector(target.getX(),target.getY()), target.getCircle().radius)
    return SAT.pointInCircle(new SAT.Vector(this.getX(), this.getY()), circle)
  }

  projectileLineIntersects(target, lineDelta) {
    const line = new SAT.Polygon(new SAT.Vector(this.lastPosition[0], this.lastPosition[1]), 
                                [new SAT.Vector(0,0), new SAT.Vector(lineDelta[0], lineDelta[1])])

    if (target.getWidth() === target.getHeight()) {
      const circle = new SAT.Circle(new SAT.Vector(target.getX(),target.getY()), target.getCircle().radius)
      return SAT.testPolygonCircle(line, circle)
    } else {
      let boundingBox = target.getBoundingBox()
      let rotatedWidth = target.getRotatedWidth()
      let rotatedHeight = target.getRotatedHeight()

      const polygon = new SAT.Polygon(new SAT.Vector(boundingBox.minX, boundingBox.minY), 
                                      [
                                        new SAT.Vector(0,0), 
                                        new SAT.Vector(rotatedWidth,0),
                                        new SAT.Vector(rotatedWidth,rotatedHeight),
                                        new SAT.Vector(0,rotatedHeight)
                                      ])
      return SAT.testPolygonPolygon(line, polygon)
    }
  }


  projectileIntersects(target) {
    let lineDelta = [this.getX() - this.lastPosition[0], this.getY() - this.lastPosition[1]]
    if (vec2.length(lineDelta) === 0) {
      return this.projectilePointIntersects(target)
    } else {
      return this.projectileLineIntersects(target, lineDelta)
    }
  }

  getCollidables() {
    return [this.sector.playerTree, this.sector.mobTree, this.sector.structureMap]  
  }

}

module.exports = CollidableProjectile

