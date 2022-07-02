const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

const SAT = require("sat")

class IonCannon extends BaseTower {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.rangeCollider = this.getRangeCollider()
  }

  getRangeCollider() {
    let destination = this.findNewPoint(this.getX(), this.getY(), this.getRotatedRadAngle(), this.getAttackRange())

    return new Projectiles.IonBeam({
      weapon:  this,
      source:      { x: this.getX(),         y: this.getY() },
      destination: destination
    })
  }

  getRangeCollider() {
    const width =  500 // this.getAttackRange()
    const height = 32 // this.getAttackRange() // Constants.Projectiles.IonBeam.height

    const x = this.calcRangeColliderX()
    const y = this.calcRangeColliderY()

    // this.rangeCollider = (new SAT.Box(new SAT.Vector(x, y), width, height)).toPolygon()

    const collider = new SAT.Polygon(new SAT.Vector(x, y), [
      new SAT.Vector(-width / 2, -height ),
      new SAT.Vector( width / 2, -height ),
      new SAT.Vector( width / 2,  height ),
      new SAT.Vector(-width / 2,  height )
    ])

    collider.setAngle(this.getRotatedRadAngle())

    const distanceBetweenCoreAndWeapon = this.game.distance(this.getX(), this.getY(), this.container.shipCore.getX(), this.ship.shipCore.getY())
    const yOffsetCoreAndWeapon = this.getY() - this.container.shipCore.getY()
    const xOffsetCoreAndWeapon = this.getX() - this.container.shipCore.getX()

    let offset = {
      x: Math.sin(this.getRadAngle())*yOffsetCoreAndWeapon + Math.cos(this.getRadAngle())*xOffsetCoreAndWeapon + (width / 2),
      y: -Math.sin(this.getRadAngle())*xOffsetCoreAndWeapon + Math.cos(this.getRadAngle())*yOffsetCoreAndWeapon
    }

    collider.setOffset(new SAT.Vector(offset.x, offset.y ))

    return collider
  }

  calcRangeColliderX() {
    // const width =  200
    // const box = this.getBox()
    // return box.pos.x + box.w / 2
    return this.container.shipCore.getX()
  }

  calcRangeColliderY() {
    // const height =  200
    // const box = this.getBox()
    // return box.pos.y + height / 2
    return this.container.shipCore.getY()
  }

  setPositionFromParent() {
    super.setPositionFromParent()

    if (this.rangeCollider) {
      this.rangeCollider.pos.x = this.container.shipCore.getX() //this.calcRangeColliderX()
      this.rangeCollider.pos.y = this.container.shipCore.getY() //this.calcRangeColliderY()
      this.rangeCollider.setAngle(this.getRotatedRadAngle())
    }
  }

  isWithinShieldRange(target) {
    const circle = new SAT.Circle(new SAT.Vector(target.getX(),target.getY()), target.getCircle().radius)
    return SAT.testPolygonCircle(this.rangeCollider, circle)
  }

  isWithinRange(target) {
    if (target.isShield()) return this.isWithinShieldRange(target)

    const point = new SAT.Vector(target.getX(),target.getY())
    return SAT.pointInPolygon(point, this.rangeCollider)
  }

  getType() {
    return Protocol.definition().BuildingType.IonCannon
  }

  getConstantsTable() {
    return "Buildings.IonCannon"
  }

  onAttackTargetFound() {
    super.onAttackTargetFound()
    if (this.projectile) {
      this.projectile.destination = this.calculateDestination(this.attackTarget)
    }
  }

  executeTurn() {
    const currentAttackTarget = this.findAttackTarget()
    if (!currentAttackTarget) {
      // no attack target found
      this.onNoTargetFound()
      return
    }

    if (currentAttackTarget !== this.attackTarget) {
      this.attackTarget = currentAttackTarget
      this.onAttackTargetFound()
    }


    this.attack()
  }

  onNoTargetFound() {
    if (this.projectile) {
      this.projectile.markForRemoval()
      this.projectile = null
    }
  }

  spawnProjectile(attackTarget) {
    this.projectile = new Projectiles.IonBeam({
      weapon:  this,
      destinationEntity:  attackTarget,
      source:      { x: this.getX(),         y: this.getY() },
      destination: this.calculateDestination(attackTarget)
    })
  }

  calculateDestination(attackTarget) {
    const distanceFromEnemy = this.game.distance(this.getX(), this.getY(), attackTarget.getX(), attackTarget.getY())
    let destination = this.findNewPoint(this.getX(), this.getY(), this.getRotatedRadAngle(), distanceFromEnemy)

    if (attackTarget && attackTarget.isShield()) {
      destination = this.getShieldDestination()
    }

    return destination
  }

  findNewPoint(x, y, radian, distance) {
    var result = {};

    result.x = Math.cos(radian) * distance + x;
    result.y = Math.sin(radian) * distance + y;

    return result;
  }


  performAttack(attackTarget) {
    if (!this.projectile) {
      this.spawnProjectile(attackTarget)
    }

    attackTarget.damage(this.projectile.getDamage(), this)
  }

  getColliderJson() {
    const pos = this.rangeCollider.pos
    return this.rangeCollider.calcPoints.map((point) => {
      return { x: pos.x + point.x, y: pos.y + point.y }
    })

    // return this.rangeCollider.body.shapes[0].vertices.map((point) => {
    //   return { x: point[0], y: point[1] }
    // })
  }

}


module.exports = IonCannon
