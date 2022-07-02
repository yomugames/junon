const Constants = require('../../../common/constants.json')
const FloodFillManager = require('../../../common/entities/flood_fill_manager')

class NetworkManager {
  constructor(container) {
    this.container = container
    this.game = container.game
    this.sector = this.game.sector

    this.networks = {}

    this.floodFillManager = new FloodFillManager(this, { name: this.getNetworkName(), container: container, useClientGetCell: true, queue: this.container.floodFillQueue.getQueue() })
    this.floodFillManager.setStartIdentifier(this.shouldStartFloodFill.bind(this))
    this.floodFillManager.setStopIdentifier(this.shouldStopFloodFill.bind(this))
    this.floodFillManager.setIncludeStopIdentifier(this.shouldIncludeStop.bind(this))
  }  

  shouldStartFloodFill(target) {
    return true // by default yes. 
  }

  shouldStopFloodFill(hit, neighbors) {
    return this.isNetworkEdge(hit, neighbors)
  }

  shouldIncludeStop(hit) {
    return hit.entity // only if its not empty space (i.e sky tile hit)
  }

  getGame() {
    return this.container.game
  }

  getNetworkKlass() {
    throw new Error("must implement getNetworkKlass")
  }

  getNetworkCount() {
    return Object.keys(this.networks).length
  }

  setGrids(grids) {
    // order is important (first is given priority)
    this.grids = grids
    this.floodFillManager.setGrids(grids)
  }

  // unique
  getAvailableNetworks(neighbors) {
    let networks = {}

    neighbors.forEach((hit) => { 
      if (hit.entity) {
        let network = hit.entity[this.getNetworkName()] 
        if (network) {
          networks[network.id] = network
        }
      }
    })

    return Object.values(networks)
  }

  removeMember(entity) {
    if (this.canBelongToMultipleNetworks({ entity: entity })) {
      let networks = entity[this.getNetworkCollection()]
      if (networks) {
        for (let networkId in networks) {
          let network = networks[networkId]
          network.removeMember(entity)
        }
      }
    } else {
      let network = entity[this.getNetworkName()]
      if (network) {
        network.removeMember(entity)
      }
    }
  }

  createNewNetworkFor(options) {
    let klass = this.getNetworkKlass()
    let newNetwork = new klass(this) 
    this.assignNetwork(options, newNetwork)
    this.networks[newNetwork.id] = newNetwork
    this.onNetworkCreated()

    return newNetwork
  }

  setAllocationDisabled(bool) {
    this.isAllocationDisabled = bool
  }

  allocateEntities(entities) {
    let networkName = this.getNetworkName()
    for (var i = 0; i < entities.length; i++) {
      let entity = entities[i]

      // sometimes entity is already deleted but still in here
      if (!this.game.getEntity(entity.id)) continue

      let tileEntity = this.getTile(entity.getRow(), entity.getCol())
      if (tileEntity && !tileEntity[networkName]) {
        let klass = this.getNetworkKlass()
        let network = new klass(this) 
        this.assignNetworks({ row: entity.getTopLeftRow(), col: entity.getTopLeftCol() }, network)
        this.networks[network.id] = network
        this.onNetworkCreated()
      }
    }
  }


  allocateNetwork(options) {
    if (this.isAllocationDisabled) return

    const neighbors = this.getNeighbors(options)
    const availableNetworks = this.getAvailableNetworks(neighbors)

    if (availableNetworks.length > 1) {
      this.merge(options)
    } else if (availableNetworks.length === 1) {
      let targetNetwork = availableNetworks[0]
      this.assignNetwork(options, targetNetwork, neighbors)
    } else {
      this.createNewNetworkFor(options)
    }
  }

  merge(options) {
    const neighbors = this.getNonEmptyNeighbors(options)
    this.resetNetworks(options, neighbors)

    // if there are more than 2 networks being merged
    // need to ensure only 1 new merged network is created
    let klass = this.getNetworkKlass()
    let network = new klass(this) 

    neighbors.forEach((hit) => {
      if (!this.hasNetworkAssignment(hit)) {

        this.assignNetworks(hit, network)
        this.networks[network.id] = network
        this.onNetworkCreated()
      }
    })
  }

  partition(options) {
    if (this.isAllocationDisabled) return
      
    const neighbors = this.getNonEmptyNeighbors(options)
    this.resetNetworks(options, neighbors)

    neighbors.forEach((hit) => {
      if (!this.hasNetworkAssignment(hit)) {
        let klass = this.getNetworkKlass()
        let network = new klass(this) 

        this.assignNetworks(hit, network)
        this.networks[network.id] = network
        this.onNetworkCreated()
      }
    })
  }

  resetNetworks(options, neighbors) {
    const hit = this.getTileHit(options.row, options.col)
    if (hit) {
      this.resetNetworkFor(hit.entity)
    }
    

    neighbors.forEach((hit) => {
      this.resetNetworkFor(hit.entity)
    })
  }

  onNetworkCreated() {
    // console.log("networkCount: " + this.getNetworkCount())
  }

  getSideHitsFor(options) {
    const row = options.row
    const col = options.col
    const rowCount = options.rowCount
    const colCount = options.colCount

    let result = []

    // left
    for (var i = 0; i < rowCount; i++) {
      result.push(this.getTileHit(row + i, col - 1))
    }

    // up
    for (var i = 0; i < colCount; i++) {
      result.push(this.getTileHit(row - 1, col + i))
    }

    // right
    for (var i = 0; i < rowCount; i++) {
      result.push(this.getTileHit(row + i, col + colCount))
    }

    // down
    for (var i = 0; i < colCount; i++) {
      result.push(this.getTileHit(row + rowCount, col + i))
    }

    return result
  }

  getNeighbors(options) {
    return this.getSideHitsFor(options)
  }

  getNonEmptyNeighbors(options) {
    const hits = this.getNeighbors(options)

    return hits.filter((hit) => {
      if (!hit) return false
      return hit.entity
    })
  }

  isNetworkMember(entity) {
    throw new Error("must implement isNetworkMember")
  }

  getCell(row, col) {
    return this.getTileHit(row, col)
  }

  getTileHit(row, col) {
    let result =  { row: row, col: col, entity: null }

    for (var i = 0; i < this.grids.length; i++) {
      let grid = this.grids[i]
      let hit = grid.rowColHitTest(row, col)

      if (this.isNetworkMember(hit.entity)) {
        result = hit
        break
      }
    }

    return result
  }

  getTile(row, col) {
    let result

    for (var i = 0; i < this.grids.length; i++) {
      let grid = this.grids[i]
      let entity = grid.get(row, col)

      if (this.isNetworkMember(entity)) {
        result = entity
        break
      }
    }

    return result
  }

  resetNetworkFor(entity) {
    if (!entity) return
      
    let network = entity[this.getNetworkName()]

    if (network) {
      delete this.networks[network.id]
      network.reset()  
    }
  }

  assignNetwork(options, network) {
    this.assignNetworkToEntity(options, network)
    this.addEntityToNetwork(options, network)

    return network
  }

  assignNetworkToEntity(hit, network) {
    if (this.canBelongToMultipleNetworks(hit)) {
      hit.entity.assignNetworkMultiple(this.getNetworkCollection(), network)
    } else {
      hit.entity.assignNetwork(this.getNetworkName(), network)
    }

    network.onNetworkAssigned(hit)
  }

  unassignNetworkFromEntity(hit, network) {
    if (this.canBelongToMultipleNetworks(hit)) {
      hit.entity.unassignNetworkMultiple(this.getNetworkCollection(), network)
    } else {
      hit.entity.unassignNetwork(this.getNetworkName(), network)
    }
  }

  canBelongToMultipleNetworks(hit) {
    return false
  }

  addEntityToNetwork(hit, network) {
    throw new Error("must implement NetworkManager#addEntityToNetwork")
  }

  getNetworkName() {
    throw new Error("must implement NetworkManager#getNetworkName")
  }

  hasNetworkAssignment(hit) {
    return hit.entity[this.getNetworkName()]
  }

  assignNetworks(hit, network) {
    this.floodFillManager.floodFill(hit.row, hit.col, {}, (visitedHit, neighbors) => {
      this.assignNetwork(visitedHit, network, neighbors)

      if (!this.game.sector.sectorLoader.isFinished) {
        if (network.manager.getNetworkName() !== "room") {
          visitedHit.entity.setNeighbors(neighbors)
        } else if (visitedHit.entity.isWall()) {
          if (!visitedHit.entity.neighbors) {
            visitedHit.entity.setNeighbors(this.getWallNeighbors(neighbors))
          }
        } else if (visitedHit.entity.isCarpet())
          visitedHit.entity.setNeighbors(this.getCarpetNeighbors(neighbors))
      }
    })

    return network 
  }

  getWallNeighbors(neighbors) {
    return neighbors.map((neighborHit) => {
      if (neighborHit.entity && neighborHit.entity.isWall()) {
        return { entity: neighborHit.entity }
      } else {
        return { entity: null }
      }
    })
  }

  getCarpetNeighbors(neighbors) {
    return neighbors.map((neighborHit) => {
      if (neighborHit.entity && neighborHit.entity.isCarpet()) {
        return { entity: neighborHit.entity }
      } else if (neighborHit.entity) {
        let platform = this.sector.platformMap.get(neighborHit.row, neighborHit.col)
        if (platform && platform.isCarpet()) {
          return { entity: platform }
        } else {
          return { entity: null }
        }
      } else {
        return { entity: null }
      }
    })
  }

  assignNetworksAsync(hit, network) {
    let request = this.floodFillManager.requestFloodFill(hit.row, hit.col)

    request.onUpdate((visitedHit, neighbors) => {
      this.assignNetwork(visitedHit, network, neighbors)
    })

    return request 
  }

  isNetworkEdge(hit, neighbors, network) {
    if (!hit.entity) return true
      
    return neighbors.every((otherHit) => {
      let isEmptySpace = !otherHit.entity
      let hasAssignment = otherHit.entity && this.hasNetworkAssignment(otherHit)
      let differentEntity = hit.entity !== otherHit.entity
      // if an entity occupies many tiles (i.e 3x3)
      // we want to ignore same entity hits as counting towards networkEdge

      return isEmptySpace || (hasAssignment && differentEntity)
    }) 
  }

}


module.exports = NetworkManager