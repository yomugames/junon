const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")
const p2 = require("p2")
const vec2 = p2.vec2

class Missile extends CollidableProjectile {

  constructor(data) {
    super(data)

    this.forceAABBCollision = true

    this.angle = data.weapon.getRotatedAngle()
    this.straightFireCounter = 3
    this.CLOSE_ENOUGH_DISTANCE = 32
    this.ARRIVE_COMPLETE_DISTANCE = 10

    this.shouldCreateExplosion = data.shouldCreateExplosion
    this.shouldAttackBuildings = data.shouldAttackBuildings

    this.destinationEntityMoveListener = this.onDestinationEntityMove.bind(this)

    if (this.destinationEntity) {
      this.destinationEntity.addMoveListener(this.destinationEntityMoveListener)
    }
  }

  onDestinationEntityMove(entity) {
    this.destination = this.weapon.calculateDestination(entity)
  }

  removeListeners() {
    if (this.destinationEntity) {
      this.destinationEntity.removeListener(this.destinationEntityMoveListener)
    }
  }

  getType() {
    return Protocol.definition().ProjectileType.Missile
  }

  getConstantsTable() {
    return "Projectiles.Missile"
  }

  remove() {
    super.remove()
    this.trigger()
  }

  trigger() {
    if (this.shouldCreateExplosion) {
      this.sector.createProjectile("Explosion", {
        weapon:        this.weapon,
        source:      { x: this.getX(),         y: this.getY() },
        destination: { x: this.getX(),         y: this.getY() },
        explosionRadius: Constants.tileSize * 4
      })
    } else {
      const explosion = this.createExplosion()
      this.damageExplosionTargets(explosion)
    }
  }

  createExplosion() {

    let boundingBox = this.getNeighborBoundingBox(Constants.tileSize/2)

    return {
      getBoundingBox: () => {
        return boundingBox
      }
    }
  }

  damageExplosionTargets(explosion) {
    let targets = this.findExplosionTargets(explosion)
    this.damageTargets(targets)
  }

  damageTargets(entities) {
    let missileExplosiveDamage = 10
    entities.forEach((entity) => {
      entity.damage(missileExplosiveDamage, this)
    })
  }

  move() {
    if (this.straightFireCounter) {
      this.straightFireCounter -= 1
    } else {
      const distance    = this.game.distance(this.getX(), this.getY(), this.destination.x, this.destination.y)

      // https://codepen.io/osublake/pen/qNPBpJ
      const targetAngle = Math.atan2(this.destination.y - this.getY(), this.destination.x - this.getX())
      const targetDeg = Math.floor(targetAngle * (180 / Math.PI))

      let theta = 0
      if ((this.angle) !== targetDeg) {
        const noise = Math.floor(Math.random() * 7)
        const minTurn = 9
        let turn = (minTurn + noise)
        let delta = targetDeg - this.angle
        if (delta >  180) delta -= 2 * 180
        if (delta < -180) delta += 2 * 180
        theta = delta > 0 ? turn : -turn
        this.angle += theta

        if (Math.abs(delta) < turn || this.isAlmostHittingTarget) {
          this.angle = targetDeg
        }

        // console.log("missile angle: " + (this.getAngle()))

      }

      // missile going away
      if (this.isAlmostHittingTarget && distance > this.prevDistance) {
        if (this.destinationEntity && !this.destinationEntity.isDestroyed()) {
          const damage = this.getDamage(this.destinationEntity)
          this.destinationEntity.damage(damage, this)
        }

        this.onMoveComplete()
        return
      }

      if (distance < this.CLOSE_ENOUGH_DISTANCE) {
        // this.angle = targetAngle
        this.isAlmostHittingTarget = true
      }

      if (distance <= this.ARRIVE_COMPLETE_DISTANCE) {
        this.onMoveComplete()
      }

      this.prevDistance = distance
    }

    this.body.velocity[0] = this.speed * Math.cos(this.getRadAngle())
    this.body.velocity[1] = this.speed * Math.sin(this.getRadAngle())
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree]
  }

  getCollidables() {
    if (this.shouldAttackBuildings) {
      return [this.sector.playerTree, this.sector.mobTree, this.sector.structureMap]  
    } else {
      return [this.sector.playerTree, this.sector.mobTree]  
    }
    
  }

}

module.exports = Missile
