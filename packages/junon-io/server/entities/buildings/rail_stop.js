const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const RailTram = require("./../transports/rail_tram")

class RailStop extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    return this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.replaceTracksIfPresent()
  }

  getConstantsTable() {
    return "Buildings.RailStop"
  }

  getType() {
    return Protocol.definition().BuildingType.RailStop
  }

  getTrackTowards(destination) {
    let tracks = this.getConnectedTracks()
    let railNetwork = destination.getRailNetwork()
    let flowField = railNetwork.getFlowField(destination)
    if (!flowField) return null

    let sortedTracks = tracks.filter((track) => {
      let coord = flowField.getCoordFromRowCol(track.getRow(), track.getCol())
      return flowField.distanceMap[coord]
    }).sort((track, otherTrack) => {
      let coord = flowField.getCoordFromRowCol(track.getRow(), track.getCol())
      let otherCoord = flowField.getCoordFromRowCol(otherTrack.getRow(), otherTrack.getCol())

      return flowField.distanceMap[coord] - flowField.distanceMap[otherCoord]
    })

    let fastestTrack = sortedTracks[0]
    return fastestTrack
  }

  getConnectedTracks() {
    let tramCenter = this.getTramCenter()
    let angle = this.getAngle()

    let trackLocations = {
      down:  { x: tramCenter.x,                          y: tramCenter.y + Constants.tileSize * 2 },
      left:  { x: tramCenter.x - Constants.tileSize * 2, y: tramCenter.y },
      up:    { x: tramCenter.x                         , y: tramCenter.y - Constants.tileSize * 2 },
      right: { x: tramCenter.x + Constants.tileSize * 2, y: tramCenter.y                          }
    }

    switch(angle) {
      case -90:
        delete trackLocations["right"]
        break
      case 0:
        delete trackLocations["down"]
        break
      case 90:
        delete trackLocations["left"]
        break
      case 180:
        delete trackLocations["up"]
        break
    }

    let tracks = []

    for (let direction in trackLocations) {
      let location = trackLocations[direction]
      let row = Math.floor(location.y / Constants.tileSize)
      let col = Math.floor(location.x / Constants.tileSize)
      let entity = this.getContainer().railMap.get(row, col)
      if (entity && entity.hasCategory("rail_track")) {
        tracks.push(entity)
      }
    }

    return tracks
  }

  interact(player, action) {
    let mode = action.split(":")[0]
    let targetId = action.split(":")[1]

    if (mode === 'view') {
      let destinationMap = this.getDestinationMap()
      this.sendRailDestinations(player, destinationMap)
    } else if (mode === 'travel') {
      if (!this.hasMetPowerRequirement()) return

      let destination = this.game.getEntity(targetId)
      if (!destination) return

      let railNetwork = this.getRailNetwork()
      let isDestinationInRailNetwork = railNetwork.stops[destination.getId()]
      if (!isDestinationInRailNetwork) return

      let passengers = this.getPassengers(player)
      if (Object.keys(passengers).length === 0) {
        player.showError("No Passengers on Tram", { isWarning: true })
        return
      }

      this.startTram(passengers, destination)
    }
  }

  getTramInnerBoundingBox() {
    let tramCenter = this.getTramCenter()
    let padding = Constants.tileSize + Constants.tileSize / 4

    return {
      minX: tramCenter.x - padding,
      minY: tramCenter.y - padding,
      maxX: tramCenter.x + padding,
      maxY: tramCenter.y + padding
    }
  }

  getPassengers() {
    let boundingBox = this.getTramInnerBoundingBox()
    let players = this.getSector().playerTree.search(boundingBox)
    let corpses = this.getSector().unitTree.search(boundingBox)
    let mobs = this.getSector().mobTree.search(boundingBox)

    let result = {}

    players.forEach((player) => {
      if (!player.isOnRailTram()) {
        result[player.getId()] = player
      }
    })

    corpses.forEach((corpse) => {
      if (!corpse.isOnRailTram()) {
        result[corpse.getId()] = corpse
      }
    })

    mobs.forEach((mob) => {
      if (!mob.isOnRailTram()) {
        result[mob.getId()] = mob
      }
    })

    return result
  }

  getDestinationMap() {
    let map = {}

    let railNetwork = this.getRailNetwork()
    if (!railNetwork) return map

    for (let id in railNetwork.stops) {
      let railStop = railNetwork.stops[id]
      if (railStop.getId() !== this.getId()) {
        map[railStop.getId()] = railStop.getStopName()
      }
    }

    return map
  }

  getStopName() {
    return this.content || ("Rail Stop " + this.id)
  }

  sendRailDestinations(player, destinationMap) {
    this.getSocketUtil().emit(player.getSocket(), "RailDestinations", { destinationMap: destinationMap })
  }

  getControlPanel() {
    let mainX = this.getX()
    let mainY = this.getY()
    let tileDistanceFromCenter = 1.5
    let x = mainX - Math.round(Math.sin(this.getRadAngle()) * Constants.tileSize * tileDistanceFromCenter)
    let y = mainY + Math.round(Math.cos(this.getRadAngle()) * Constants.tileSize * tileDistanceFromCenter)
    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    let w = Constants.tileSize * 2 * Math.round(Math.abs(Math.cos(this.getRadAngle()))) + Constants.tileSize
    let h = Constants.tileSize * 2 * Math.round(Math.abs(Math.sin(this.getRadAngle()))) + Constants.tileSize

    return {
      row: row,
      col: col,
      x: x,
      y: y,
      w: w,
      h: h
    }
  }

  getTramCenter() {
    // -90, x - 16
    // 0,   y - 16
    // 90,  x + 16
    // 180,  y + 16

    let x = this.getX() + Math.round(Math.sin(this.getRadAngle())) * Constants.tileSize / 2
    let y = this.getY() - Math.round(Math.cos(this.getRadAngle())) * Constants.tileSize / 2

    return { x: x, y: y }
  }

  getTramCenterHit() {
    let tramCenter = this.getTramCenter()

    let row = Math.floor(tramCenter.y / Constants.tileSize)
    let col = Math.floor(tramCenter.x / Constants.tileSize)

    return { row: row, col: col }
  }

  replaceTracksIfPresent() {
    let hits = this.container.railMap.hitTestTile(this.getRelativeBox())
    hits.forEach((hit) => {
      if (hit.entity) {
        hit.entity.remove()
      }
    })
  }


  startTram(passengers, destination) {
    let tracks = this.getConnectedTracks()
    if (tracks.length === 0) return

    let tramCenter = this.getTramCenter()
    let data = {
      x: tramCenter.x,
      y: tramCenter.y,
      owner: this.getOwner(),
      source: this,
      destination: destination,
      passengers: passengers
    }

    let tram = new RailTram(this.getSector(), data)

    // tram must now its destination..
  }

  breakBuilding(lastBreaker) {
    let railNetwork = this.getRailNetwork()
    if (railNetwork && railNetwork.hasMovingTransport()) {
      lastBreaker.showError("Rail Network is currently in use")
      return
    }

    super.breakBuilding(lastBreaker)
  }

  shouldObstruct(body, hit) {
    let box = this.getCollisionBox()

    let hits = this.getContainer().structureMap.hitTestTile(box)
    return hits.find((controlPanelHit) => {
      return controlPanelHit.row === hit.row &&
             controlPanelHit.col === hit.col
    })
  }

  getCollisionBox() {
    let controlPanel = this.getControlPanel()
    let box = this.getBox(controlPanel.x, controlPanel.y, controlPanel.w, controlPanel.h)
    return box
  }

  isHitPassable(hit) {
    return !this.shouldObstruct(null, hit)
  }

  getAllowedTrackNeighborHits() {
    let tramCenterHit = this.getTramCenterHit()

    let row = tramCenterHit.row
    let col = tramCenterHit.col

    return [
      { row: row - 1, col: col },
      { row: row    , col: col + 1 },
      { row: row + 1, col: col },
      { row: row    , col: col - 1 }
    ]
  }

}

module.exports = RailStop
