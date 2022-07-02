class ChunkRegionPath {
  constructor(data, sector) {
    this.id = data.id
    this.sector = sector
    this.nodes = data.nodes
  }

  syncWithServer(data) {

  }

  remove() {
    
  }

  show() {
    for (var i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i]
      let chunkRegion = this.sector.getChunkRegionById(node.chunkRegionId)
      if (chunkRegion) {
        chunkRegion.show(0.7)
        chunkRegion.showDistanceLabel(node.distance)
      }
    }
  }

  hide() {
    for (var i = 0; i < this.nodes.length; i++) {
      let node = this.nodes[i]
      let chunkRegion = this.sector.getChunkRegionById(node.chunkRegionId)
      if (chunkRegion) {
        chunkRegion.hide()
      }
    }
  }

}

module.exports = ChunkRegionPath