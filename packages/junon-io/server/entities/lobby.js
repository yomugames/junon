const Sector = require("./sector")
const Protocol = require('../../common/util/protocol')
const Constants = require('../../common/constants.json')
const Buildings = require("./buildings/index")
const MapGenerator = require("./../util/map_generator")

class Lobby extends Sector {

  constructor(game, metadata, entities) {
    super(game, metadata, entities)

    this.name = 'Tutorial Lobby'
  }

  isLobby() {
    return true
  }

  placeBuilding(data) {
    let buildingData = Object.assign({}, data, { owner: this })
    // let buildingData = Object.assign({}, data, { })
    return super.placeBuilding(buildingData)
  }

  onFinishedLoading() {
    super.onFinishedLoading()
  }

  getSpawnRoom() {
    // if (!this.spawnStructure) return null
    // return this.spawnStructure.getStandingPlatform().room
  }

  getSpawnLocation() {
    let row = 116
    let col = 47
    
    return {
      x: col * Constants.tileSize, 
      y: row * Constants.tileSize
    }
  }

  onPlayerJoin(player) {
    let position = this.getSpawnLocation()
    player.repositionTo(position.x, position.y)
    player.setPositionFound(true)

    const steelCrate = Object.values(this.structures).find((structure) => {
      return structure.getType() === Protocol.definition().BuildingType.SteelCrate
    })

    steelCrate.setOwner(player.getTeam())

    const suitStation = Object.values(this.structures).find((structure) => {
      return structure.getType() === Protocol.definition().BuildingType.SuitStation
    })

    suitStation.setOwner(player)

    this.refillableOxygenGenerator = this.game.getEntity(1521)
    this.refillableOxygenGenerator.setOwner(player)

    let escapePod = this.game.getEntity(1481)
    escapePod.setOwner(player.getTeam())

    let farmEscapePod = this.game.getEntity(1561)
    farmEscapePod.setOwner(player.getTeam())

    let soilNetwork = Object.values(this.soilManager.networks)[0]
    for (let key in soilNetwork.tiles) {
      let hit = soilNetwork.tiles[key]
      let soil = hit.entity
      let seed = soil.getSeed()
      if (seed) {
        seed.setOwner(player.getTeam())
      }

      soil.setOwner(player.getTeam())
    }
  }

  getTerrainData() {
    return {
      "Rock": [
        { row: "52", col: "94-104" },
        { row: "53", col: "92-107" },
        { row: "54", col: "92-108" },
        { row: "55", col: "92-108" },
        { row: "56", col: "93-109" },
        { row: "57", col: "93-109" },
        { row: "58", col: "93-109" },
        { row: "59", col: "93-109" },
        { row: "60", col: "94-108" },
        { row: "61", col: "95-107" },
        { row: "62", col: "96-107" },
        { row: "63", col: "97-106" },
        { row: "64", col: "97-105" }
      ],
      "Water": [
        { row: "56", col: "99" },
        { row: "57", col: "99" },
        { row: "58", col: "100" },
        { row: "59", col: "100-101" },
        { row: "60", col: "101" }
      ]
    }
  }

  initMap() {
    this.mapGenerator = new MapGenerator(this, this.groundMap)
    this.mapGenerator.generateCustom(this.getTerrainData())
  }

}

module.exports = Lobby