const Constants = require("../constants.json")
const vec2 = require("./../util/vec2")

const Movable = () => {
}

Movable.prototype = {
  initMovable() {
    this.SEPERATION_FROM_NEIGHBORS = this.getSeparationDistance()
  },

  isMovable() {
    return true
  },

  setSpeed(speed) {
    if (speed < 0) speed = 0
    this.speed = speed
  },

  setVelocityBasedOnAngle() {
    const radian = this.getDirectionRadian()

    this.body.velocity[0] = this.getSpeed() * Math.cos(radian)
    this.body.velocity[1] = this.getSpeed() * Math.sin(radian)
  },

  getDirectionRadian() {
    return this.getRadAngle() + this.getDirectionRadianModifier()
  },

  getAngleDeltaFromControls(targetEntityToMove, controlKeys) {
    let delta = 0

    if (controlKeys & Constants.Control.left) {
      delta -= targetEntityToMove.turnSpeed
    } else if (controlKeys & Constants.Control.right) {
      delta += targetEntityToMove.turnSpeed
    }

    return delta
  },

  getForceFromControls(controlKeys, deltaTime) {
    let force = vec2.create()

    if (controlKeys & Constants.Control.up) {
      const radian = this.getRadAngle() + this.getDirectionRadianModifier() // if ship is at 0 degrees, it should move upward by default
      force[0] = this.getSpeed() * Math.cos(radian) * deltaTime
      force[1] = this.getSpeed() * Math.sin(radian) * deltaTime
    }

    if (controlKeys & Constants.Control.down) {
      const radian = this.getRadAngle() - this.getDirectionRadianModifier() // if ship is at 0 degrees, it should move downward by default
      force[0] = this.getSpeed() * Math.cos(radian) * deltaTime
      force[1] = this.getSpeed() * Math.sin(radian) * deltaTime
    }

    return force
  },

  accelerate(body, velocity, maxSpeed = this.getMaxSpeed()) {
    const thrust = vec2.create()
    vec2.scale(thrust, velocity, 0.1)

    const acceleratedVelocity = vec2.create()
    vec2.add(acceleratedVelocity, body.velocity, thrust)

    const maxAbsoluteSpeed = maxSpeed
    let speed = vec2.length(acceleratedVelocity)

    if (speed <= maxAbsoluteSpeed) {
      body.velocity = acceleratedVelocity
    } else {
      let limitedVelocity = vec2.create()
      vec2.scale(limitedVelocity, acceleratedVelocity, maxAbsoluteSpeed/speed)
      body.velocity = limitedVelocity
    }
  },

  getSeparationDistance() {
    return 25
  },

  getCloseDistanceFromTarget() {
    return 10
  },

  getSpeed() {
    throw new Error("Must implement " + this.constructor.name + "#getSpeed")
  },

  cohesion(neighbors) {
    let count = 0
    let centerOfMass = vec2.create()
    let force = vec2.create()

    neighbors.forEach((unit) => {
      vec2.add(centerOfMass, centerOfMass, unit.body.position)
      count += 1
    })

    if (count > 0) {
      vec2.scale(centerOfMass, centerOfMass, 1/count)
      force = this.arrive(centerOfMass)
    }

    return force
  },

  // targetPosition should be vector or [x, y]

  // based on book Programming game AI
  arrive(targetPosition) {
    let steer = vec2.create()
    if (!targetPosition) return steer

    let desired = vec2.create()
    vec2.subtract(desired, targetPosition, this.body.position)
    const distance = vec2.length(desired)

    if (distance > this.getCloseDistanceFromTarget()) {
      const deceleration = 1
      const decelerationFactor = 0.3

      let speed = distance / (deceleration * decelerationFactor)
      speed = Math.min(speed, this.getSpeed())

      vec2.scale(desired, desired, speed / distance)
      vec2.subtract(steer, desired, this.body.velocity)
    }

    return steer
  },

  // https://howtorts.github.io/2014/01/03/steering-flocking.html
  separate(neighbors) {
    let pushForce = vec2.create()
    let sum = vec2.create()
    let distance = vec2.create()
    let result = vec2.create()
    let count = 0
    let scaledForce = vec2.create()
    let radius = this.getWidth()/2

    neighbors.forEach((unit) => {
      if (unit !== this) {
        vec2.subtract(pushForce, this.body.position, unit.body.position)
        distance = vec2.length(pushForce)

        // create distance in order to have non-zero force
        if (distance === 0) {
          distance = 1
          pushForce[0] = 1
          pushForce[1] = 1
        }

        if (distance < this.SEPERATION_FROM_NEIGHBORS) {
          vec2.scale(scaledForce, pushForce, 1/radius)
          vec2.add(sum, sum, scaledForce)
          count++
        }
      }
    })


    if (count > 0) {
      vec2.scale(result, sum, 1/count)
      vec2.scale(result, result, this.getSpeed())
    }


    return result
  }
}

module.exports = Movable


