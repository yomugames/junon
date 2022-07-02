// has same basic interface as grid
class ChunkGrid {
  constructor(name, container, rowCount, colCount, initCallback) {
    this.name = name
    this.container = container
    this.mapData = []
    this.ROW_COUNT    = rowCount
    this.COLUMN_COUNT = colCount

    this.init(initCallback)
  }

  init(initCallback) {
    for(var row = 0; row < this.ROW_COUNT; row++) {
      this.mapData.push([])
      for(var col = 0; col < this.COLUMN_COUNT; col++) {
        this.mapData[row][col] = initCallback(row, col)
      }
    }
  }

  get(row, col) {
    let isRowColNaN = (isNaN(parseInt(row)) || isNaN(parseInt(col)))

    if (this.isOutOfBounds(row, col) || isRowColNaN) {
      return null
    } else {
      return this.mapData[row][col]
    }
  }

  rowColHitTest(row, col) {
    let isInvalid = (isNaN(row) || isNaN(col)) 

    if (this.isOutOfBounds(row, col) || isInvalid) {
      return { row: row, col: col, entity: null }
    } else {
      return { row: row, col: col, entity: this.mapData[row][col] }
    }
  }

  isOutOfBounds(row, col) {
    return this.isRowOutOfBounds(row) || this.isColumnOutOfBounds(col)
  }

  isRowOutOfBounds(row) {
    return row < 0 || row >= this.ROW_COUNT
  }

  isColumnOutOfBounds(col) {
    return col < 0 || col >= this.COLUMN_COUNT
  }
  
  forEach(cb) {
    for(let row = 0; row < this.ROW_COUNT; row++) {
      for(let col = 0; col < this.COLUMN_COUNT; col++) {
        let value = this.mapData[row][col]
        cb(row, col, value)
      }
    }
  }

  getRowCount() {
    return this.ROW_COUNT
  }

  getColCount() {
    return this.COLUMN_COUNT
  }


}

module.exports = ChunkGrid