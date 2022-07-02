const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Tilable = require("./../../../../common/interfaces/tilable")
const BaseEntity = require("./../base_entity")

class RailTram extends BaseEntity {

  constructor(game, data) {
    super(game, data)
    
    this.chunks = {}
  }

  static build(game, data) {
    return new this(game, data)
  }

  getSpriteContainer() {
    return this.game.sector.spriteLayers["transports"]
  }

  getSpritePath() {
    return 'rail_tram.png'
  }

  syncWithServer(data) {
    this.instructToMove(data.x, data.y)
  }

//   instructToMove(x, y) {
//     // this.direction = [x - this.sprite.x, y - this.sprite.y]
//     // console.log("direction: " + this.direction)
//     this.sprite.instructToMove(x, y)
// 
//     console.log('move: ' + [x,y].join("-"))
//     console.log('distanceToCover: ' + JSON.stringify(this.sprite.interpolator.distanceToCover))
//   }

  interpolate(lastFrameTime) {
    this.interpolateCustom(lastFrameTime)
  }

  interpolateCustom(lastFrameTime) {
    const prev = { x: this.sprite.position.x, y: this.sprite.position.y }

    const oldX = this.sprite.x
    const oldY = this.sprite.y
    const oldRow = Math.floor(oldY / Constants.tileSize)
    const oldCol = Math.floor(oldX / Constants.tileSize)

    super.interpolate(lastFrameTime)
    const curr = { x: this.sprite.position.x, y: this.sprite.position.y }

    const row = Math.floor(this.sprite.y / Constants.tileSize)
    const col = Math.floor(this.sprite.x / Constants.tileSize)

    if (curr.x !== prev.x || curr.y !== prev.y) {
      this.onPositionChanged()

      if (oldRow !== row || oldCol !== col) {
        this.onGridPositionChanged()
      }
    }
  }

  onPositionChanged() {

  }

  onGridPositionChanged() {
    this.registerToChunk()
  }

  getGroup() {
    return "transports"
  }

  getType() {
    return Protocol.definition().TransportType.RailTram
  }

  getConstantsTable() {
    return "Transports.RailTram"
  }

  remove() {
    this.getContainer().unregisterEntity("transports", this)

    if (this.getChunk()) {
      this.getChunk().unregister("transports", this)
    }
    
    super.remove()
  }

}

module.exports = RailTram