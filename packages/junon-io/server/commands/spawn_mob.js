const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const EntityGroup = require("./../entities/entity_group")
const Helper = require("../../common/helper")

class SpawnMob extends BaseCommand {

  getUsage() {
    return [
      "/spawnmob [type] [count]",
      "/spawnmob [type] [count] [row] [col]",
      "/spawnmob [type] [count] [row] [col] [flags]",
      "=== available flags:",
      "goal:[entityId]",
      "status:[hostile|neutral|]",
      "mapdisplay:[true|false]",
      "taming:[true|false]",
      "attackables:[players|mobs|buildings]",
      "ex. /spawnmob guard 1 20 20 goal:4531 status:hostile mapdisplay:true"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    if (!args[0]) {
      caller.showChatError("/spawnmob [type] [count]")
      return
    }

    const type = args[0]
    const count = args[1] ? parseInt(args[1]) : null
    const row = args[2]
    const col = args[3]

    let keyValueArgs = isNaN(row) ? args.slice(2) : args.slice(4)
    let keyValueMap = this.convertKeyValueArgsToObj(keyValueArgs)


    let x, y

    if (col) {
      x = col * Constants.tileSize + Constants.tileSize/2
    } else {
      x = caller.getX() + caller.getRandomOffset(Constants.tileSize * 2)
    }

    if (row) {
      y = row * Constants.tileSize + Constants.tileSize/2
    } else {
      y = caller.getY() + caller.getRandomOffset(Constants.tileSize * 2)
    }

    if (typeof x === 'undefined' || typeof y === 'undefined') return
    if (isNaN(x) || isNaN(y)) return

    if (typeof row !== 'undefined' && typeof col !== 'undefined') {
      if (this.sector.isOutOfBounds(row, col)) {
        caller.showChatError("invalid row,col: " + [row, col].join(","))
        return
      }
    }


    if (this.sector.isMobLimitExceeded()) {
      caller.showChatError("Cannot exceed mob limit of 50")
      return
    }

    let data = { player: caller, type: type, count: count, x: x, y: y }

    if (keyValueMap["goal"]) {
      let entity = this.game.getEntity(keyValueMap["goal"])
      if (entity) {
        data.goals = [entity]
      }
    }

    if (keyValueMap["path"]) {
      let path = this.sector.getPath(keyValueMap["path"])
      if (path) {
        data.path = path
      }
    }

    if (keyValueMap["status"]) {
      let allowedStatus = ['hostile', 'neutral']
      if (allowedStatus.indexOf(keyValueMap["status"]) !== -1) {
        let status = Protocol.definition().MobStatus[Helper.capitalize(keyValueMap["status"])]
        if (typeof status !== 'undefined' && status !== null) {
          data.status = status
        }
      }
    }

    if (keyValueMap["taming"]) {
      let allowedTaming = ['true', 'false']
      if (allowedTaming.indexOf(keyValueMap["taming"]) !== -1) {
        data.allowTaming = keyValueMap["taming"] === 'true'
      }
    }

    if (keyValueMap["counter"]) {
      let allowedCounter = ['true', 'false']
      if (allowedCounter.indexOf(keyValueMap["counter"]) !== -1) {
        data.counter = keyValueMap["counter"] === 'true'
      }
    }

    if (keyValueMap["attackables"]) {
      let allowedAttackables = ['buildings', 'mobs', 'players']

      let attackables = keyValueMap["attackables"].split(",").filter((group) => {
        return allowedAttackables.indexOf(group) !== -1
      })

      if (attackables.length > 0) {
        data.attackables = attackables
      }
    }

    if (keyValueMap["mapdisplay"]) {
      let allowedMapDisplays = ['true', 'false']
      if (allowedMapDisplays.indexOf(keyValueMap["mapdisplay"]) !== -1) {
        data.mapDisplay = keyValueMap["mapdisplay"] === 'true'
      }
    }

    if (keyValueMap["raid"] === "true") {
      if (!keyValueMap["attackables"]) {
        data.attackables = ["players", "mobs", "buildings"]
      }
      if (!keyValueMap["status"]) {
        let status = Protocol.definition().MobStatus.Hostile
        if (typeof status !== 'undefined' && status !== null) {
          data.status = status
        }
      }
    }

    if (!keyValueMap["attackables"]) {
      data.attackables = ["players", "mobs", "buildings"]
    }

    const mobs = this.sector.spawnMob(data)

    if (keyValueMap["raid"] === "true") {
      const Raid = require("../entities/raid")
      const fakeEventManager = this.game.eventManager
      const raidData = {
        sector: this.sector,
        team: caller.getTeam ? caller.getTeam() : undefined,
        permanent: true 
      }
      const raid = new Raid(fakeEventManager, raidData)
      raid.prepare() 
      if (!fakeEventManager.raids) fakeEventManager.raids = []
      fakeEventManager.raids.push(raid)
      mobs.forEach((mob) => {
        mob.setRaid(raid)
      })
    }

    mobs.forEach((mob) => {
      mob.onCommandSpawned(caller)

      if (mob.hasCategory('bot') || mob.hasCategory("worker") || mob.hasCategory("trader")) {
        if (keyValueMap["status"] !== 'hostile') {
          mob.setMaster(caller)
          mob.setOwner(caller.getTeam())
          mob.makeObedient()
        }
      }
    })

    if (mobs.length > 1) {
      let entityGroup = new EntityGroup()
      mobs.forEach((mob) => {
        entityGroup.addChild(mob)
      })
    }
  }
}

module.exports = SpawnMob
