// tightly coupled to BaseBuilding

const Tilable = require("./tilable")

const Conductor = () => {
}

Conductor.prototype = {
  canConduct(hit) {
    throw new Error("must implement Conductor#canConduct")
  },

  layoutConduits() {
    let hits = this.getCoreHits()
    hits.forEach((hit) => {
      let sides = this.getSidesWithConduit(hit.row, hit.col)
      let sprite = this.getConduitSprite(hit.row, hit.col)

      if (Object.keys(sides).length > 0) {
        sprite.visible = true
        this.layoutTile(sides, sprite)
      } else {
        sprite.visible = false
      }
    })
  },

  getConduitMap() {
    throw new Error("must implement Conductor#getConduitMap")
  },

  getSidesWithConduit(row, col) {
    let result = {}
    let sideHits = this.getRowColSideHitsFor(this.getConduitMap(), row, col)

    for (let direction in sideHits) {
      let hit = sideHits[direction]
      if (this.canConduct(hit)) {
        result[direction] = true
      }
    }

    return result
  }

}

Object.assign(Conductor.prototype, Tilable.prototype, {

})



module.exports = Conductor