const RailTrackCommon = {
  hasTriangleRailNeighbors(container, row, col) {
    let left      = container.railMap.get(row    , col - 1) 
    let upLeft    = container.railMap.get(row - 1, col - 1) 
    let up        = container.railMap.get(row - 1, col    ) 
    let upRight   = container.railMap.get(row - 1, col + 1) 
    let right     = container.railMap.get(row    , col + 1) 
    let downRight = container.railMap.get(row + 1, col + 1) 
    let down      = container.railMap.get(row + 1, col    ) 
    let downLeft  = container.railMap.get(row + 1, col - 1) 

    return (left && upLeft && up)   ||
           (up && upRight && right) ||
           (right && downRight && down) ||
           (down && downLeft && left) 
  },

  hasInvalidRailStopNeighbor(container, row, col) {
    let left = container.structureMap.rowColHitTest(row, col - 1) 
    let right = container.structureMap.rowColHitTest(row, col + 1) 
    let up = container.structureMap.rowColHitTest(row - 1, col) 
    let down = container.structureMap.rowColHitTest(row + 1, col) 

    return this.isInvalidRailStopNeighborForTrack(left)  ||
           this.isInvalidRailStopNeighborForTrack(right) ||
           this.isInvalidRailStopNeighborForTrack(up)    ||
           this.isInvalidRailStopNeighborForTrack(down) 
  },

  isInvalidRailStopNeighborForTrack(hit) {
    if (hit.entity && hit.entity.hasCategory("rail_stop")) {
      let allowedRailStopNeighbors = hit.entity.getAllowedTrackNeighborHits()
      let isInAllowedPosition = allowedRailStopNeighbors.find((rowCol) => {
        return rowCol.row === hit.row && rowCol.col === hit.col 
      })
      return !isInAllowedPosition
    }
  }

}

module.exports = RailTrackCommon