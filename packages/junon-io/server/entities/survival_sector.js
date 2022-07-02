const Sector = require("./sector")
const Protocol = require('../../common/util/protocol')
const PositionSearchRequest = require("./position_search_request")
const Constants = require('../../common/constants.json')
const Buildings = require("./buildings/index")

class SurvivalSector extends Sector {
  onPlayerJoin(player) {
    if (player.isNewPlayer) {
      if (!this.isPeaceful() && (this.game.isCreatedByPlayer(player) || this.game.isPvP())) {
        this.findSpawnPositionForColonyOwner(player)
      } else {
        this.findSpawnPosition(player)
      }
      player.initStartingEquipment()
    } else {
      this.findSpawnPosition(player)
    }
  }

  findSpawnPosition(player) {
    let team = player.getTeam()
    if (!team.isJoinable()) return

    if (this.game.isPvP()) {
      if (player.spawnPosition) {
        // in pvp, respawn from original location
        player.repositionTo(player.spawnPosition.x, player.spawnPosition.y)
        return
      }
    } 

    let spawnPoint = player.getSpawnPosition()
    if (spawnPoint) {
      player.repositionTo(spawnPoint.x, spawnPoint.y)
      player.setPositionFound(true)
      return
    }

    let landedMember = team.getLandedMember({ exclude: player })
    if (landedMember && !this.game.isPvP()) {
      player.repositionTo(landedMember.getX(), landedMember.getY())
      player.setPositionFound(true)
    } else {
      this.findChunkFromStructure(team, player)
    }
  }

  findChunkFromStructure(team, player) {
    // find farthest chunkRegion from a structure
    for (let structureId in team.ownerships.structures) {
      let structure = team.ownerships.structures[structureId]
      let chunkRegion = structure.getChunkRegion()
      if (chunkRegion) {
        let spawnGround = this.pathFinder.findSpawnGround(chunkRegion)
        if (spawnGround) {
          player.repositionTo(spawnGround.getX(), spawnGround.getY())
          player.setPositionFound(true)
          return
        }
      }
    }

    // find random platform
    for (let platformId in team.ownerships.platforms) {
      let platform = team.ownerships.platforms[platformId]
      player.repositionTo(platform.getX(), platform.getY())
      player.setPositionFound(true)
      return
    }
    
    // last resort, land anywhere 
    let lands = this.landManager.findRandomSuitableLands()
    let request 
    request = new PositionSearchRequest(this)
    request.onComplete((x, y) => {
      player.repositionTo(x, y)
      player.setPositionFound(true)
    })

    request.search(lands)
  }

  findSpawnPositionForColonyOwner(player) {
    let lands = this.landManager.findRandomSuitableLands()
    if (lands.length === 0) {
      player.repositionTo(10, 10)
      player.setPositionFound(true)
      return
    }

    let request

    if (env === 'test') {
      request = new PositionSearchRequest(this, {row: 96, col: 4 })
    } else {
      request = new PositionSearchRequest(this)
    }

    request.onComplete((x, y) => {
      player.repositionTo(x, y)
      player.setPositionFound(true)
      this.initEscapePod(player)
    })

    request.search(lands)
  }

  initEscapePod(player) {
    // create escape pod beside
    let row = player.getRow()
    let col = player.getCol() + 2
    let owner = player.getJoinableTeam() ? player.getJoinableTeam() : player
    let data = {
      x: col * Constants.tileSize + Constants.tileSize/2,
      y: row * Constants.tileSize ,
      owner: owner,
      placer: player
    }

    let escapePod = new Buildings.EscapePod(data, this)

    escapePod.getInitialItems().forEach((itemName) => {
      let name = itemName.split(":")[0]
      let count = parseInt(itemName.split(":")[1])

      escapePod.store(this.createItem(name, {count: count }))
    })

    player.setInitialEscapePod(escapePod)
  }

  onPlayerRemoved(player) {
    this.removeInitialEscapePod(player)
  }

  removeInitialEscapePod(player) {
    if (player.isLoggedIn()) return
    if (!player.initialEscapePod) return
      
    if (this.structures[player.initialEscapePod.getId()]) {
      player.initialEscapePod.remove()
    }
  }

  onDayNightChanged(isNight) {
    super.onDayNightChanged(isNight)

    this.mobManager.onDayNightChanged(isNight)
  }

  onHourChanged(hour) {
    super.onHourChanged(hour)
    this.mobManager.onHourChanged(hour)
  }

  executeTurn() {
    super.executeTurn()

    this.mobManager.executeTurn()
  }

}

module.exports = SurvivalSector
