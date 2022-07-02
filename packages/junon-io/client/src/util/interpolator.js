const Constants = require('../../../common/constants.json')
const Helper = require("./../../../common/helper")

class Interpolator {
  constructor(target) {
    this.setTarget(target)
    this.reset()
    this.initTimestepFraction()
  }

  setTarget(target) {
    this.target = target
  }

  reset() {
    this.position = this.target.position

    this.targetPosition  = { }
    this.distanceToCover = { x: 0, y: 0 }
    this.distanceCovered = { x: 0, y: 0 }
    this.distanceCoveredThisFrame = { x: 0, y: 0 }

    this.rotationToCover = 0
    this.rotationCovered = 0
    
    this.position_buffer = []
    this.rotation_buffer = []
    this.expansion_buffer = []
    this.lastDistanceStep = [0,0]

  }

  initTimestepFraction() {
    // 1 timestep === duration of lag
    let millisecondsPerFrame = 16
    let averageLag = 400 // will wait this much before rendering
    let millisecondsPerTimestep = averageLag
    this.timestepFraction = millisecondsPerFrame / millisecondsPerTimestep
  }

  static mixin(target) {
    target.interpolator = new Interpolator(target)

    this.defineMethods(target)

    return target.interpolator
  }

  static defineMethods(target) {
    target.setImmediatePosition = (x, y)          => { target.interpolator.setImmediatePosition(x, y) }
    target.instructToMove       = (x, y)          => { target.interpolator.instructToMove(x, y) }
    target.instructToRotate     = (rotation)      => { target.interpolator.instructToRotate(rotation) }
    target.instructToExpand     = (width)         => { target.interpolator.instructToExpand(width) }
    target.interpolate          = (lastFrameTime) => { target.interpolator.interpolate(lastFrameTime) }
    target.interpolateRotation  = (lastFrameTime) => { target.interpolator.interpolateRotation(lastFrameTime) }
    target.interpolateExpansion = (lastFrameTime) => { target.interpolator.interpolateExpansion(lastFrameTime) }
  }

  hasCoveredDistance() {
    let margin = 1 // account for floating point inaccuracies (i.e x being 1.999 instead of 2)

    let result = this.distanceCovered.x >= (Math.abs(this.distanceToCover.x) - margin) &&
                 this.distanceCovered.y >= (Math.abs(this.distanceToCover.y) - margin)

    return result
  }

  interpolate(lastFrameTime) {
    let hasNoTargetPosition = typeof this.targetPosition.x === "undefined"
    if (hasNoTargetPosition) return

    let isSamePosition = this.targetPosition.x === this.position.x && this.targetPosition.y === this.position.y
    if (isSamePosition) return

    if(this.hasCoveredDistance()) {
      this.onNoPositionAvailable()
      // stop interpolating
      this.position.x = this.targetPosition.x
      this.position.y = this.targetPosition.y
      return
    }

    let isPositionTooFar = Helper.distance(this.targetPosition.x, this.targetPosition.y, this.position.x, this.position.y) > (Constants.tileSize * 30)
    if (isPositionTooFar) {
      this.setImmediatePosition(this.targetPosition.x, this.targetPosition.y)
      return
    }

    let elapsedTime = Date.now() - lastFrameTime

    let distanceCoveredThisFrameX = elapsedTime * this.allowedDistancePerMillisecond(this.distanceToCover.x)
    let distanceCoveredThisFrameY = elapsedTime * this.allowedDistancePerMillisecond(this.distanceToCover.y)

    this.distanceCoveredThisFrame.x = Math.abs(distanceCoveredThisFrameX)
    this.distanceCoveredThisFrame.y = Math.abs(distanceCoveredThisFrameY)

    this.distanceCovered.x += this.distanceCoveredThisFrame.x
    this.distanceCovered.y += this.distanceCoveredThisFrame.y

    // console.log("speed: " + (distanceCoveredThisFrameY / (Date.now() - lastFrameTime)).toFixed(2) + " , ticksSincePacket: " + game.ticksSincePacket )

    this.position.x += distanceCoveredThisFrameX
    this.position.y += distanceCoveredThisFrameY

    this.lastDistanceStep = [distanceCoveredThisFrameX, distanceCoveredThisFrameY]
  }

  allowedDistancePerMillisecond(distance) {
    let millisecondsToRenderPacket 

    if (game.firstTenSecondsMaxUpstreamInterval && game.firstTenSecondsMaxUpstreamInterval > 250) {
      // cant be slower than 400
      millisecondsToRenderPacket = Math.min(350, game.firstTenSecondsMaxUpstreamInterval)
    } else if (game.firstTenSecondsMaxUpstreamInterval && game.firstTenSecondsMaxUpstreamInterval > 150) {
      millisecondsToRenderPacket = Math.min(250, game.firstTenSecondsMaxUpstreamInterval)
    } else {
      millisecondsToRenderPacket = 150 // assume quick at first, then if turns out its slow, use duration above
    }

    return distance / (millisecondsToRenderPacket / game.resolution)
  }

  instructToMove(x,y) {
    let isSamePosition = this.targetPosition.x === x && this.targetPosition.y === y
    if (isSamePosition) return

    this.targetPosition = { x: x, y: y }

    this.distanceToCover = { 
      x: x - this.position.x,
      y: y - this.position.y
    }

    this.distanceCovered = { x: 0, y: 0 }
  }

  instructToRotate(rotation) {
    let isSameRotation = this.targetRotation === rotation
    if (isSameRotation) return

    this.targetRotation = rotation

    this.rotationToCover = Helper.angleDeltaSigned(rotation, this.target.rotation)
    this.rotationCovered = 0
  }

  instructToExpand(width) {
    let timestamp = (new Date()).getTime()

    this.expansion_buffer.push({
      timestamp: timestamp,
      width: width
    })

  }

  interpolateRotation(lastFrameTime) {
    let hasCoveredRotation = this.rotationCovered >= Math.abs(this.rotationToCover) 

    if(hasCoveredRotation && (typeof this.targetRotation !== "undefined")) {
      // stop interpolating
      // this.target.rotation = this.targetRotation
      this.targetRotation = null
      return
    }

    let rotationCoveredThisFrame = this.timestepFraction * this.rotationToCover

    this.rotationCovered += Math.abs(rotationCoveredThisFrame)
    this.target.rotation += rotationCoveredThisFrame
  }


  interpolateExpansion(lastFrameTime) {
    let server_update_rate = Constants.physicsTimeStep
    let render_timestamp = lastFrameTime - (1000.0 / server_update_rate)

    // Find the two authoritative positions surrounding the rendering timestamp.
    let buffer = this.expansion_buffer

    // Drop older positions.
    while (buffer.length >= 2 && buffer[1].timestamp <= render_timestamp) {
      buffer.shift()
    }

    // Interpolate between the two surrounding authoritative positions.
    if (buffer.length >= 2 && buffer[0].timestamp <= render_timestamp && render_timestamp <= buffer[1].timestamp) {
      let width0 = buffer[0].width
      let width1 = buffer[1].width
      let t0 = buffer[0].timestamp
      let t1 = buffer[1].timestamp

      this.target.width = width0 + (width1 - width0) * (render_timestamp - t0) / (t1 - t0)
      this.target.height = width0 + (width1 - width0) * (render_timestamp - t0) / (t1 - t0)
    }

  }


  setImmediatePosition(x, y) {
    this.position.x = x
    this.position.y = y

    this.distanceCovered = this.distanceToCover = { x: 0, y: 0 }
    this.targetPosition = {}
  }

  setOnNoPositionAvailableListener(listener) {
    this.onNoPositionAvailableListener = listener
  }

  onNoPositionAvailable() {
    if (this.onNoPositionAvailableListener) {
      this.onNoPositionAvailableListener()
    }
  }

}

module.exports = Interpolator
