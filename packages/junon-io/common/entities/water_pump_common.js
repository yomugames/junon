const Constants = require("./../constants.json")

const WaterPumpCommon = {
  getExtractor(centerX, centerY, angle) {
    let radian = angle * (Math.PI / 180)
    let tileDistanceFromHinge = 1
    let x = centerX + Math.floor(Math.sin(radian) * Constants.tileSize * tileDistanceFromHinge)
    let y = centerY - Math.floor(Math.cos(radian) * Constants.tileSize * tileDistanceFromHinge)
    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    return {
      row: row,
      col: col,
      x: x,
      y: y,
      w: this.getRotatedExtractorWidth(angle),
      h: this.getRotatedExtractorHeight(angle)
    }
  },

  getSquare(centerX, centerY, angle) {
    let radian = angle * (Math.PI / 180)
    let tileDistanceFromHinge = 0.5
    let x = centerX - Math.round(Math.sin(radian) * Constants.tileSize * tileDistanceFromHinge)
    let y = centerY + Math.round(Math.cos(radian) * Constants.tileSize * tileDistanceFromHinge)
    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    return {
      row: row,
      col: col,
      x: x,
      y: y,
      w: Constants.tileSize*2,
      h: Constants.tileSize*2
    }
  },

  getRotatedExtractorWidth(angle) {
    let radian = angle * (Math.PI / 180)
    let w = Constants.tileSize
    let h = Constants.tileSize*2
    return Math.round(Math.abs(Math.cos(radian)) * h + Math.abs(Math.sin(radian)) * w)
  },

  getRotatedExtractorHeight(angle) {
    let radian = angle * (Math.PI / 180)
    let w = Constants.tileSize
    let h = Constants.tileSize*2
    return Math.round(Math.abs(Math.cos(radian)) * w + Math.abs(Math.sin(radian)) * h)
  }

}

module.exports = WaterPumpCommon
