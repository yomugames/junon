const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Tilable = require("./../../../../common/interfaces/tilable")
const BaseBuilding = require("./base_building")

class RailStop extends BaseBuilding {

  getSpritePath() {
    return 'rail_stop.png'
  }

  getSelectionRect() {
    return this.getControlPanel()
  }

  static isPositionValid(container, x, y, w, h, angle, player, type, instance) {
    let box = this.getBox(x, y, w, h)
    let hasRailStopNeighbor = this.getNeighborTiles(container.structureMap, box)
                                  .find((hit) => {
      return hit.entity && hit.entity.hasCategory("rail_stop")
    })


    return this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
           this.isWithinInteractDistance(x, y, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !hasRailStopNeighbor &&
           !this.hasInvalidRailTrackPosition(container, box, instance) &&
           !container.unitMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  static hasInvalidRailTrackPosition(container, box, instance) {
    let allowedTrackHits = instance.getAllowedTrackHits()

    let paddedBox = this.getPaddedRelativeBox(box)

    return container.railMap.hitTestTile(paddedBox)
                                  .find((hit) => {
      if (hit.entity && hit.entity.hasCategory("rail_track")) {
        let isNotValidTrackPosition = !allowedTrackHits.find((allowedHit) => {
          return allowedHit.row === hit.row && allowedHit.col === hit.col
        })

        return isNotValidTrackPosition
      }

      return false
    })
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

  getAllowedTrackHits() {
    let tramCenterHit = this.getTramCenterHit()
    let row = tramCenterHit.row
    let col = tramCenterHit.col

    let innerHits = this.getAllowedTrackNeighborHits()

    let outerHits = [
      { row: row - 2, col: col },
      { row: row    , col: col + 2 },
      { row: row + 2, col: col },
      { row: row    , col: col - 2 }
    ]

    return [tramCenterHit].concat(outerHits).concat(innerHits)
  }

  getControlPanel() {
    let mainX = this.getX()
    let mainY = this.getY()
    let tileDistanceFromCenter = 1.5

    let x
    let y

    let angle = this.angle % 360

    switch(angle) {
      case -90:
        x = Constants.tileSize
        y = -Constants.tileSize * 1.5
        break
      case 0:
        x = -Constants.tileSize * 1.5
        y = Constants.tileSize 
        break
      case 90:
        x = -Constants.tileSize * 2
        y = -Constants.tileSize * 1.5
        break
      case 180:
        x = -Constants.tileSize * 1.5
        y = -Constants.tileSize * 2
        break

    }

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


  getType() {
    return Protocol.definition().BuildingType.RailStop
  }

  getConstantsTable() {
    return "Buildings.RailStop"
  }

  getStopName() {
    return this.content || ("Rail Stop " + this.id)
  }

  openMenu() {
    let options = { entity: this }
    if (!this.isPowered) options['disabled'] = 'Insufficient Power'

    this.game.railStopMenu.open(options)
  }

  onContentChanged() {
    this.game.railStopMenu.render(this)  
  }

  remove() {
    super.remove() 
  }

}

module.exports = RailStop