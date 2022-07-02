const FloodFillRequest = require("./flood_fill_request")

class FloodFillManager {

  constructor(client, options = {}) {
    this.client = client
    this.container = options.container
    this.name  = options.name
    this.includeDiagonals = options.includeDiagonals
    this.useClientGetCell = options.useClientGetCell

    this.queue = options.queue
  }

  getQueue() {
    return this.queue
  }

  setGrids(grids) {
    this.grids = grids
  }

  requestFloodFill(row, col, options) {
    // console.log("request flood fill: " + [row, col].join(","))
    let request = new FloodFillRequest(this, row, col, options)
    this.getQueue().push(request)
    return request
  }

  floodFill(row, col, options, callback) {
    let request = new FloodFillRequest(this, row, col, options)

    if (callback) {
      request.onUpdate((current, neighbors, sourceHit) => {
        callback(current, neighbors, sourceHit)
      })
    }

    request.perform()
    return Object.values(request.visited)
  }

  setStopIdentifier(identifier) {
    this.stopIdentifier = identifier
  }

  setStartIdentifier(identifier) {
    this.startIdentifier = identifier
  }

  setIncludeStopIdentifier(identifier) {
    this.includeStopIdentifier = identifier
  }

  shouldStart(target) {
    if (!this.startIdentifier) return true

    return this.startIdentifier(target) 
  }

  shouldStop(hit, neighbors, originHit, sourceEntity) {
    if (!this.stopIdentifier) return false

    return this.stopIdentifier(hit, neighbors, originHit, sourceEntity) 
  }

  getCellKey(hit) {
    return [hit.row, hit.col].join("-")
  }

  getNeighbors(row, col) {
    if (this.includeDiagonals) {
      return [
        this.getCell(row - 1, col    ), // top
        this.getCell(row - 1, col - 1), // top-left
        this.getCell(row    , col - 1), // left
        this.getCell(row + 1, col - 1), // left-down
        this.getCell(row + 1, col    ), // down
        this.getCell(row + 1, col + 1), // down-right
        this.getCell(row    , col + 1), // right
        this.getCell(row - 1, col + 1)  // right-top
      ].filter((hit) => {
        return hit // null if out of bounds. dont include it
      })

    } else if (this.useClientGetCell) {
      return this.client.getNeighbors({ row: row, col: col, rowCount: 1, colCount: 1 })
    } else {
      return [
        this.getCell(row    , col - 1), // left
        this.getCell(row - 1, col    ), // top
        this.getCell(row    , col + 1), // right
        this.getCell(row + 1, col    )  // down
      ].filter((hit) => {
        return hit // null if out of bounds. dont include it
      })
    }
  }

  getCell(row, col) {
    if (this.useClientGetCell) {
      return this.client.getCell(row, col)
    } else {
      return this.getCellNative(row, col)
    }
  }

  getCellNative(row, col) {
    let maxRowCount = this.grids[0].getRowCount()

    if (row < 0 || row > maxRowCount - 1) return null
    if (col < 0 || col > maxRowCount - 1) return null

    let cell = { row: row, col: col, type: 0, entity: null } // 0 means empty 

    for (var i = 0; i < this.grids.length; i++) {
      let grid = this.grids[i]
      let entity = grid.get(row, col)
      if (entity) {
        if (typeof entity.getType === "function") {
          cell.type = entity.getType()
        }
        
        cell.entity = entity
        break
      }
    }
  
    return cell
  }


}

module.exports = FloodFillManager