class ChunkGate {
  constructor(chunkRegion, direction) {
    this.chunkRegion = chunkRegion
    this.direction   = direction
  }

  getId() {
    return this.id
  }

  getChunkRegion() {
    return this.chunkRegion
  }

  getMidpoint() {
    let row = Math.floor((this.end.row + this.start.row) / 2)
    let col = Math.floor((this.end.col + this.start.col) / 2)
    return { row: row, col: col }
  }

  toJson() {
    return {
      id: this.id,
      start: this.start,
      end: this.end
    }
  }

  getDirection() {
    return this.direction
  }

  // we assume they're opposite directions
  isConnectedTo(otherGate) {
    if (!this.isBesideEachOther(otherGate)) return false

    return this.hasCommonGap(otherGate)
  }

  isBesideEachOther(otherGate) {
    if (this.direction === "left") {
      return otherGate.start.col === this.start.col - 1
    }

    if (this.direction === "up") {
      return otherGate.start.row === this.start.row - 1
    }

    if (this.direction === "right") {
      return otherGate.start.col === this.start.col + 1
    }

    if (this.direction === "down") {
      return otherGate.start.row === this.start.row + 1
    }
  }

  hasCommonGap(otherGate) {
    let attribute

    if (this.direction === "left" || this.direction === "right") {
      attribute = "row"
    } else {
      attribute = "col"
    }

    let startIsInsideOther = otherGate.start[attribute] <= this.start[attribute]      && this.start[attribute]      <= otherGate.end[attribute]
    let otherIsInsdeStart  = this.start[attribute]      <= otherGate.start[attribute] && otherGate.start[attribute] <= this.end[attribute]

    return startIsInsideOther || otherIsInsdeStart
  }

  hasTile(row, col) {
    let isRowFound = row >= this.start.row && row <= this.end.row
    let isColFound = col >= this.start.col && col <= this.end.col

    return isRowFound && isColFound
  }

  markStart(row, col) {
    this.id = this.getGateKey(row, col)
    this.start = { row: row, col: col }
  }

  getGateKey(startRow, startCol) {
    return [startRow, startCol].join("-")
  }

  markEnd(row, col) {
    this.end = { row: row, col: col }
  }

  forEachRowCol(cb) {
    for (let row = this.start.row; row <= this.end.row ; row++) {
      for (let col = this.start.col; col <= this.end.col ; col++) {
        cb(row, col)
      }
    }
  }

  isNotTerminated() {
    return !this.end
  }
}

module.exports = ChunkGate