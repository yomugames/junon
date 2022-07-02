const Constants = require('../../common/constants.json')
const Mobs = require("./mobs/index")
const SocketUtil = require("junon-common/socket_util")
const Blueprint = require("./blueprint")
const Ship = require("./ship")

class Wave {

  constructor(game, player) {
    this.game = game
    this.player = player
    this.sector = player.sector

    this.level = 0
    this.WAVE_INTERVAL = debugMode ? 5000 : 30000 // 30 seconds
    this.NUM_MOBS = debugMode ? 3 : 20 // 20 mobs to spawn
    this.nextWaveTime = (new Date()).getTime()

    this.ships = {}
    this.mobs = {}
  }

  getSector() {
    return this.player.sector
  }

  increaseLevel() {
    this.level += 1
  }

  isWaveInProgress() {
    return Object.keys(this.mobs).length > 0
  }

  isMaxWavesReached() {
    return this.level > 2
  }

  executeTurn() {
    if (this.isWaveInProgress()) return
    if (this.isMaxWavesReached()) return

    const timeNow = (new Date()).getTime()

    if (timeNow >= this.nextWaveTime) {
      // this.start()
    }
  }

  start() {
    if (this.isWaveInProgress()) return

    const spawnTable = this.getSpawnTable(this.level)
    const repeatCount = spawnTable.repeat
    let timeout = 0
    // klass of enemy, how many count, direction, repeat time

    for (var i = 0; i < repeatCount; i++) {
      this.spawnMobs(spawnTable.mobs)
      timeout += 7500
    }

    SocketUtil.emit(this.player.socket, "WaveLevel", { level: this.level })
    this.increaseLevel()
  }

  spawnMobs(mobs) {
    mobs.forEach((data) => {
      for (var i = 0; i < data.count; i++) {
        this.spawnMob(data.klass, data.direction)
      }
    })
  }

  /*
  {
    mobs: [
      { klass: Mobs.Spike, count: 3, direction: "left|right|down|up" },
    ],
    repeat: 2
  }
  */

  allDirections(options) {
    let directions = ["left", "right", "up", "down"]
    return directions.map((direction) => {
      return { klass: options.klass, count: options.count, direction: direction }
    })
  }

  getSpawnTable(level) {
    let directions = ["left", "right", "up", "down"]
    let randomDirection = directions[Math.floor(Math.random() * directions.length)]

    if (level < 1) { // 0-3
      return {
        repeat: 1,
        mobs: [{ klass: Mobs.Spike, count: 5, direction: randomDirection }]
      }
    } else if (level < 2) { // 5-9
      return {
        repeat: 1,
        mobs: this.allDirections({ klass: Mobs.Spike, count: 4 })
      }
    } else if (level < 10) { // 10-14
      return {
        repeat: 1,
        mobs: [{ klass: Mobs.Reaver, count: 1, direction: randomDirection }]
      }
    } else if (level < 25) { // it gets hard at wave 15
      return {
        repeat: 1,
        mobs: this.allDirections({ klass: Mobs.Spike, count: 4 }).concat(
              this.allDirections({ klass: Mobs.Catapult, count: 3 }))
      }
    } else { // wave 25
      return {
        repeat: 3,
        mobs: this.allDirections({ klass: Mobs.Spike, count: 4 }).concat(
              this.allDirections({ klass: Mobs.Catapult, count: 3 }))
      }
    }
  }

  spawnMob(mobKlass, sourceDirection) {
    const minDistanceFromPlayer = 800
    const variableDistance = Math.floor(Math.random() * 900)
    const numTilePaddingFromGameBorder = 3

    let spawnXPos, spawnYPos

    switch(sourceDirection) {
      case "left":
        spawnYPos = this.game.normalizeSpawnPos(this.player.getY() - minDistanceFromPlayer + variableDistance, numTilePaddingFromGameBorder)
        spawnXPos = this.game.normalizeSpawnPos(this.player.getX() - minDistanceFromPlayer - variableDistance, numTilePaddingFromGameBorder)
        break;
      case "up":
        spawnYPos = this.game.normalizeSpawnPos(this.player.getY() - minDistanceFromPlayer - variableDistance, numTilePaddingFromGameBorder)
        spawnXPos = this.game.normalizeSpawnPos(this.player.getX() - minDistanceFromPlayer + variableDistance, numTilePaddingFromGameBorder)
        break;
      case "right":
        spawnYPos = this.game.normalizeSpawnPos(this.player.getY() - minDistanceFromPlayer + variableDistance, numTilePaddingFromGameBorder)
        spawnXPos = this.game.normalizeSpawnPos(this.player.getX() + minDistanceFromPlayer + variableDistance, numTilePaddingFromGameBorder)
        break;
      case "down":
        spawnYPos = this.game.normalizeSpawnPos(this.player.getY() + minDistanceFromPlayer + variableDistance, numTilePaddingFromGameBorder)
        spawnXPos = this.game.normalizeSpawnPos(this.player.getX() - minDistanceFromPlayer + variableDistance, numTilePaddingFromGameBorder)
        break;
      default:
        spawnYPos = this.game.normalizeSpawnPos(this.player.getY() + randomDisplacement, 3)
        spawnXPos = this.game.normalizeSpawnPos(this.player.getX() + randomDisplacement, 3)
    }

    const spawnable = new mobKlass(this.getSector(), { x: spawnXPos, y: spawnYPos })
    spawnable.setLevel(this.level)
    spawnable.setArriveTarget(this.player.homeShip.shipCore)

    this.addMob(spawnable)
  }

  removeAllMobs() {
    for (let mobId in this.mobs) {
      let mob = this.mobs[mobId]
      this.sector.removeMob(mob)
    }
  }

  removeShip(ship) {
    delete this.ships[ship.id]
  }

  removeMob(mob) {
    delete this.mobs[mob.id]
    if (Object.keys(this.mobs).length === 0) {
      this.onWaveComplete()
    }
  }

  createRaid() {
    let doors = this.sector.findDoorEntrances()
    let docking = this.sector.getValidDocking(doors)
    if (docking) {
      // docking bounding box is actually half tile padded to
      // have good tree search boundary. remove the padding
      let adjustment = Constants.tileSize/2
      let x = (docking.box.minX + docking.box.maxX) / 2 - adjustment
      let y = (docking.box.minY + docking.box.maxY) / 2 - adjustment
      let blueprintData = this.sector.getBlueprintDataForType("trader_ship")
      let blueprint = new Blueprint(blueprintData)
      let ship = new Ship(this.sector, { x: x, y: y }, { blueprint: blueprint })
      this.addShip(ship)

      // add mobs in ship
      let mobCount = 1
      let mob
      for (var i = 0; i < mobCount; i++) {
        let platform = ship.getNextEmptyPlatform()
        if (platform) {
          mob = new Mobs.Pirate(this.sector, x, y)
          this.addMob(mob)
          mob.setDormant(true)
          ship.addCrewAt(mob, platform.getRelativeX(), platform.getRelativeY())
          ship.setDockingDoor(docking.door)
        }
      }

      ship.setOwner(mob)
      ship.dockInPlace()
    }
  }

  addShip(ship) {
    ship.setWave(this)
    this.ships[ship.id] = ship
  }

  addMob(mob) {
    mob.setWave(this)
    this.mobs[mob.id] = mob // track remaining mobs alive in current wave
  }

  makeShipsLeave() {
    Object.values(this.ships).forEach((ship) => {
      ship.undockInPlace()
      ship.leaveSector()
    })
  }

  onWaveComplete() {
    this.makeShipsLeave()

    // this.nextWaveTime = (new Date()).getTime() + this.WAVE_INTERVAL
    // SocketUtil.emit(this.player.getSocket(), "WaveEnd", { level: this.level })
  }

}

module.exports = Wave
