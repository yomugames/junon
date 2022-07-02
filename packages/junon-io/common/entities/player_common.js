const Constants = require("./../constants.json")
const Protocol = require('./../util/protocol')
const Helper = require('./../helper')
const vec2 = require('./../util/vec2')

const PlayerCommon = () => {
}

PlayerCommon.prototype = {
  initPlayerCommon() {
    this.ACTION_INTERVAL = this.getStats().reload
    this.moveYaw = 0
    this.lastActionTime = (new Date()).getTime()
    this.wave = null
    this.RESPAWN_TIME = 5 * 1000
    this.thirst = this.getMaxThirst()
  },
  getActionInterval() {
    return this.isLowStatus("stamina") ? this.ACTION_INTERVAL * 2 : this.ACTION_INTERVAL
  },
  getCameraBoundingBox() {
    var padding = Constants.tileSize*3;
    var cameraTarget = this.getCameraFocusTarget();

    let x
    let y

    if (cameraTarget) {
      x = cameraTarget.isPositionBased ? cameraTarget.x : cameraTarget.getX()
      y = cameraTarget.isPositionBased ? cameraTarget.y : cameraTarget.getY()
    } else {
      x = this.getX()
      y = this.getY()
    }

    var minX = x - this.getScreenWidth() / 2 - padding;
    var maxX = x + this.getScreenWidth() / 2 + padding;
    var minY = y - this.getScreenHeight() / 2 - padding;
    var maxY = y + this.getScreenHeight() / 2 + padding;

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  },
  getLimitedCameraBoundingBox() {
    let range = this.getMaxViewDistance()
    let cameraTarget = this.getCameraFocusTarget()

    let x = cameraTarget.isPositionBased ? cameraTarget.x : cameraTarget.getX()
    let y = cameraTarget.isPositionBased ? cameraTarget.y : cameraTarget.getY()

    let minX = x - range 
    let maxX = x + range 
    let minY = y - range 
    let maxY = y + range

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }
  },
  setThirst(thirst) {
    let prevThirst = this.thirst

    if (thirst > this.getMaxThirst()) {
      this.thirst = this.getMaxThirst()
    } else if (thirst < 0) {
      this.thirst = 0
    } else {
      this.thirst = thirst
    }

    if (prevThirst !== this.thirst) {
      this.onThirstChanged()
    }
  },
  setGold(amount) {
    if (isNaN(amount)) return
    let maxInt = ((2 ** 32) / 2) - 1
    if (amount < 0) amount = 0
    if (amount > maxInt) amount = maxInt
    let delta = this.gold ? amount - this.gold : amount
    let prevAmount = this.gold
    this.gold = amount
    this.onGoldChanged(prevAmount, amount)
  },
  getGold() {
    return this.gold
  },
  getVisibleChunks() {
    let boundingBox = this.getCameraBoundingBox()
    return Helper.getChunksFromBoundingBox(this.sector, boundingBox)
  },
  isBareHanded() {
    const itemData = this.getActiveItem()
    return !itemData
  },
  getMaxThirst() {
    return Constants.Player.thirst
  },
  getVelocityFromControls(controlKeys, speed) {
    // player movement is wasd
    let targetVelocity = vec2.create()

    if (controlKeys & Constants.Control.left) {
      targetVelocity[0] = -speed
    }

    if (controlKeys & Constants.Control.right) {
      targetVelocity[0] = speed
    }

    if (controlKeys & Constants.Control.down) {
      targetVelocity[1] =  speed
    }

    if (controlKeys & Constants.Control.up) {
      targetVelocity[1] = -speed
    }

    return targetVelocity
  },
  getBuildableCounts() {
    let countMap = {}
    const buildingTypes = Protocol.definition().BuildingType
    for (let typeId in buildingTypes) {
      let type = buildingTypes[typeId]
      countMap[type] = 0
    }

    for (let buildingId in this.ship.platforms) {
      let building = this.ship.platforms[buildingId]
      let type = building.getType()
      countMap[type] += 1
    }

    for (let buildingId in this.ship.armors) {
      let building = this.ship.armors[buildingId]
      let type = building.getType()
      countMap[type] += 1
    }

    for (let buildingId in this.ship.structures) {
      let building = this.ship.structures[buildingId]
      let type = building.getType()
      countMap[type] += 1
    }

    for (let buildingId in this.ship.units) {
      let building = this.ship.units[buildingId]
      let type = building.getType()
      countMap[type] += 1
    }

    return countMap
  },
  hasReachedMaxCount(buildingKlass) {
    return false
    const buildableCounts = this.getBuildableCounts()
    return buildableCounts[buildingKlass.getType()] >= buildingKlass.getMaxCountFor(this.ship)
  },
  hasEnoughResourcesFor(cost) {
    let result = true

    const requirements = cost
    for (let resourceName in requirements) {
      let value = requirements[resourceName]
      if (this[resourceName] < value) {
        result = false
        break
      }
    }

    return result
  },
  getGridSize() {
    return this.getStats(this.level).tileCount * Constants.tileSize
  },
  isWithinGrid(coord) {
    const gridSize = this.getStats(this.level).tileCount * Constants.tileSize

    return (coord.x >= 0 && coord.x <= gridSize) &&
           (coord.y >= 0 && coord.y <= gridSize)
  },
  getVelocity(controlKeys) {
    const moveData = this.getMoveData(controlKeys)

    // console.log("moveData: " + JSON.stringify(moveData))

    var velocityX = this.speed * moveData.dx
    var velocityY = this.speed * moveData.dy

    // diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX = velocityX / Math.sqrt(2)
      velocityY = velocityY / Math.sqrt(2)
    }

    return {
      x: velocityX,
      y: velocityY,
    }
  },
  getMoveData(controlKeys) {
    var dx = 0
    var dy = 0

    // Based on user held keys, calculate the diff in movement

    if (controlKeys & Constants.Control.left) {
      dx -= Math.cos(this.moveYaw)
      dy += Math.sin(this.moveYaw)
    }

    if (controlKeys & Constants.Control.right) {
      dx += Math.cos(this.moveYaw)
      dy -= Math.sin(this.moveYaw)
    }

    if (controlKeys & Constants.Control.up) {
      dx += Math.sin(this.moveYaw)
      dy += Math.cos(this.moveYaw)
    }

    if (controlKeys & Constants.Control.down) {
      dx -= Math.sin(this.moveYaw)
      dy -= Math.cos(this.moveYaw)
    }

    return {
      dx: dx,
      dy: dy
    }

  },

  getConstantsTable() {
    return "Player"
  },

  getCollisionGroup() {
    return Constants.collisionGroup.Player
  },

  isLowStatus(stat) {
    let result = false

    switch(stat) {
      case "stamina":
        result = (this.stamina / this.getMaxStamina()) < 0.25
        break
      case "oxygen":
        let maxOxygen = this.getMaxOxygen()
        if (maxOxygen < 25) {
          result = (this.getOxygen() / this.getMaxOxygen()) < 0.75
        } else {
          result = (this.getOxygen() / this.getMaxOxygen()) < 0.25
        }
        break
      case "gold":
        break
      case "hunger":
        result = (this.hunger / this.getMaxHunger()) < 0.25
        break
      case "thirst":
        result = (this.thirst / this.getMaxThirst()) < 0.25
        break
    }

    return result
  },

  onGoldChanged() {

  },
  
  onThirstChanged() {

  }


}

module.exports = PlayerCommon
