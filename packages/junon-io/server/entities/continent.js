class Continent {
  constructor(sector) {
    this.sector = sector
    this.game = sector.game
    this.id = this.game.generateId("continent")

    this.chunkRegions = {}
    this.edges = {}
    this.exits = {}
    this.neighbors = {}

    this.register()
  }

  getId() {
    return this.id
  }

  markExits() {
    for (let chunkRegionId in this.edges) {
      let chunkRegion = this.edges[chunkRegionId]
      let neighbors = chunkRegion.getNeighbors({ sameBiome: false, passThroughWall: true })
      neighbors.forEach((neighbor) => {
        let continent = neighbor.findOrCreateContinent()
        if (continent !== this) {
          if (chunkRegion.isWallConnected(neighbor) ) {
            if (neighbor.canBeEnteredFromSpace()) {
              this.addExit(continent, chunkRegion)
              continent.addExit(this, neighbor)
            }
          } else {
            this.addExit(continent, chunkRegion)
            continent.addExit(this, neighbor)
          }
        }
      })
    }
  }

  addExit(continent, chunkRegion) {
    this.exits[continent.getId()] = this.exits[continent.getId()] || {}
    this.exits[continent.getId()][chunkRegion.getId()] = chunkRegion

    this.neighbors[continent.getId()] = continent
  }

  removeExit(continent) {
    delete this.exits[continent.getId()] 

    delete this.neighbors[continent.getId()] 
  }

  addChunkRegion(chunkRegion) {
    this.chunkRegions[chunkRegion.getId()] = chunkRegion

    this.sector.chunkRegionToContinentMap[chunkRegion.getId()] = this
  }

  addEdge(chunkRegion) {
    this.edges[chunkRegion.getId()] = chunkRegion
  }

  hasEdge(chunkRegion) {
    return this.edges[chunkRegion.getId()]
  }

  hasChunkRegion(chunkRegion) {
    return this.chunkRegions[chunkRegion.getId()]
  }

  register() {
    this.sector.continents[this.getId()] = this
  }

  getNeighbors() {
    return this.neighbors
  }

  unregister() {
    delete this.sector.continents[this.getId()]

    for (let chunkRegionId in this.chunkRegions) {
      delete this.sector.chunkRegionToContinentMap[chunkRegionId]
    }

    for (let continentId in this.sector.continents) {
      let continent = this.sector.continents[continentId]
      continent.removeExit(this)
    }
  }

  remove() {
    this.unregister()
  }
}

module.exports = Continent
