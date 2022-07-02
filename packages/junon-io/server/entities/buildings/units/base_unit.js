const BaseTower = require("./../towers/base_tower")
const Constants = require('../../../../common/constants.json')
const Movable = require('../../../../common/interfaces/movable')

// BaseUnit is tower that can move
class BaseUnit extends BaseTower {
  onBuildingPlaced() {
    this.container.registerComponent("units", "unitMap", this)

    this.isLaunched = false
    this.initMovable()
  }

  getMap() {
    return this.container.unitMap
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    return container.platformMap.isFullyOccupied(x, y, w, h) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h) &&
           !container.unitMap.isOccupied(x, y, w, h)
  }

  launchUnit() {
    this.sector.addUnit(this)

    this.isLaunched = true
  }

  dockUnit() {
    this.sector.displaceUnit(this)

    this.angle = this.origAngle

    this.isLaunched = false
  }

  unregister() {
    this.container.unregisterComponent("units", "unitMap", this)
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Unit
  }

  getCollisionMask() {
    return 0
  }

  move() {
    // returning
    if (this.arriveTarget && this.arriveTarget.id === this.id) {
      const distance = this.game.distance(this.getX(), this.getY(), this.arriveTarget.getX(), this.arriveTarget.getY())

      if (Math.floor(distance) < 10) {
        this.dockUnit()
        this.arriveTarget = null
      }
    }

    if (this.arriveTarget && this.arriveTarget.isDestroyed()) {
      this.arriveTarget = null
    }

    if (!this.arriveTarget) {
      this.body.velocity[0] = 0
      this.body.velocity[1] = 0
      return
    }

    const arriveForce   = this.arrive([this.arriveTarget.getX(), this.arriveTarget.getY()])
    const separateForce = this.separate(this.sector.unitTree.search(this.getNeighborBoundingBox()))
    const cohesiveForce = this.cohesion(this.sector.unitTree.search(this.getNeighborBoundingBox()))
    this.body.applyForce(separateForce)
    this.body.applyForce(arriveForce)
    // this.body.applyForce(cohesiveForce)

    // if (this.id === 5) {
    //   console.log("fighter arrive force: " + JSON.stringify(arriveForce))
    // }

    let radian = Math.atan2(this.arriveTarget.getY() - this.getY(), this.arriveTarget.getX() - this.getX())
    this.setAngle(Math.floor(radian * (180 / Math.PI)))
  }

  getReturnTarget() {
    return {
      id: this.id,
      getX: () => {
        return this.getReturnX()
      },
      getY: () => {
        return this.getReturnY()
      },
      isDestroyed: () => {
        return this.isDestroyed()
      }
    }
  }

  getReturnX() {
    return super.getX()
  }

  getReturnY() {
    return super.getY()
  }

  onHealthZero() {
    this.sector.removeUnit(this)
  }

}

Object.assign(BaseUnit.prototype, Movable.prototype, {
  getSpeed() {
    return this.getStats(this.level).speed * Constants.globalSpeedMultiplier
  },
  getCloseDistanceFromTarget() {
    const desiredDistanceFromHomeBase = 10

    if (this.arriveTarget && this.arriveTarget.id === this.id) {
      return desiredDistanceFromHomeBase
    } else {
      return this.getAttackRange()
    }
  }


})



module.exports = BaseUnit
