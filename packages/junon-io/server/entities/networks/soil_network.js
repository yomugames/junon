const BaseTransientEntity = require("./../base_transient_entity")
const Network = require('./network')
const FlowField = require("./../../ai/flow_field")
const Protocol = require('../../../common/util/protocol')
const FloodFillManager = require('../../../common/entities/flood_fill_manager')
const TileHit = require("../tile_hit")

// determines what stops are reachable

class SoilNetwork extends Network {
  constructor(manager) {
    super(manager)

    this.game = manager.game
    this.container = manager.container
    this.soilManager = manager

    this.unplantedSet = new Set()
    this.unwateredSet = new Set()
    this.harvestableSet = new Set()

    this.chunkRegions = {}
  }

  getContainer() {
    return this.manager.container
  }

  initMembers() {
    this.tiles = {}
    this.farmControllers = {}
  }

  getFarmController() {
    let key = Object.keys(this.farmControllers)[0]
    if (!key) return null

    return this.farmControllers[key].entity
  }

  addTile(hit) {
    let key = this.getTileKey(hit)
    this.tiles[key] = hit

    if (!this.randomTileKey) {
      this.randomTileKey = key
    }

    this.onTileAdded(hit)
  }

  onTileAdded(hit) {
    // unwatered/unplanted map
    let entity = this.container.distributionMap.get(hit.row, hit.col)
    if (entity && entity.hasObstacleOnTop()) return
    
    if (entity && entity.hasCategory("seed")) {
      if (!entity.isWatered && !entity.isCropHarvestable()) {
        this.setUnwatered(hit.row, hit.col)
      } else if (entity.isCropHarvestable()) {
        this.setHarvestable(hit.row, hit.col)
      }
    } else {
      this.setUnplanted(hit.row, hit.col)
    }

    let chunkRegion = this.container.getChunkRegionAt(hit.row, hit.col)
    if (chunkRegion) {
      chunkRegion.addSoilNetwork(this)
      this.addChunkRegion(chunkRegion)
    }
  }

  setUnwatered(row, col){
    let key = row + "-" + col
    this.unwateredSet.add(key)
  }

  removeUnwatered(row, col){
    let key = row + "-" + col
    this.unwateredSet.delete(key)
  }

  setHarvestable(row, col){
    let key = row + "-" + col
    this.harvestableSet.add(key)
  }

  removeHarvestable(row, col){
    let key = row + "-" + col
    this.harvestableSet.delete(key)
  }

  setUnplanted(row, col){
    let key = row + "-" + col
    this.unplantedSet.add(key)
  }

  removeUnplanted(row, col){
    let key = row + "-" + col
    this.unplantedSet.delete(key)
  }

  addFarmController(hit) {
    let key = this.getTileKey(hit)
    this.farmControllers[key] = hit
  }

  removeMember(entity) {
    this.removeTile(entity)

    delete this.farmControllers[entity.getId()]
  }

  getTileKey(hit) {
    return hit.row + "-" + hit.col
  }

  getTileKeyFromEntity(entity) {
    return entity.getRow() + "-" + entity.getCol()
  }

  removeTile(entity) {
    let key = this.getTileKeyFromEntity(entity)

    this.unassignNetworkFromEntity({ entity: entity }, this)

    delete this.tiles[key]

    if (this.randomTileKey === key) {
      for (let key in this.tiles) {
        this.randomTileKey = key
        break
      }
    }

    this.onTileRemoved(entity)
  }

  onTileRemoved(entity) {
  }

  reset() {
    for (let id in this.tiles) {
      let hit = this.tiles[id]
      this.unassignNetworkFromEntity(hit, this)
    }

    for (let id in this.farmControllers) {
      let hit = this.farmControllers[id]
      this.unassignNetworkFromEntity(hit, this)
    }

    for (let id in this.chunkRegions) {
      let chunkRegion = this.chunkRegions[id]
      chunkRegion.removeSoilNetwork(this)
    }

    this.tiles = {}
    this.farmControllers = {}
    this.chunkRegions = {}
  }

  unassignNetworkFromEntity(hit, network) {
    this.soilManager.unassignNetworkFromEntity(hit, network)
    this.onNetworkUnassigned(hit)
  }

  onNetworkUnassigned(hit) {

  }

  addChunkRegion(chunkRegion) {
    this.chunkRegions[chunkRegion.getId()] = chunkRegion
  }

  removeChunkRegion(chunkRegion) {
    delete this.chunkRegions[chunkRegion.getId()] 
  }

  getRandomTile() {
    return this.tiles[this.randomTileKey]
  }

  getUnplantedSoil() {
    let setEntry = this.unplantedSet.keys().next()
    let key = setEntry.value
    return this.tiles[key].entity
  }

  getUnwateredSoil() {
    let setEntry = this.unwateredSet.keys().next()
    let key = setEntry.value
    return this.tiles[key].entity
  }

  getHarvestableCrop() {
    let setEntry
    let setIterator = this.harvestableSet.keys()
    let crop 

    while (true) {
      let setEntry = setIterator.next()
      if (!setEntry.value) break
        
      let key = setEntry.value
      let tile = this.tiles[key]
      if (tile) {
        let entity = tile.entity
        let seed = entity.getSeed()
        if (seed && !seed.isClaimed()) {
          crop = seed
          break
        }
      }
    }

    return crop
  }
  
  getHarvestableCount() {
    return this.harvestableSet.size
  }

  getUnwateredCount() {
    return this.unwateredSet.size
  }

  getUnplantedCount() {
    return this.unplantedSet.size
  }

  isOwnedBy(owner) {
    if (!this.getRandomTile()) return false

    return this.getRandomTile().entity.isOwnedBy(owner)
  }

  hasRemainingWork() {
    let farmController = this.getFarmController()
    if (!farmController) return false

    if (!farmController.hasCropTarget()) return false

    return this.getUnplantedCount() + this.getUnwateredCount() > 0
  }

  getSeedType() {
    let farmController = this.getFarmController()
    if (!farmController) return null

    return farmController.getSeedType() 
  }

}

module.exports = SoilNetwork
