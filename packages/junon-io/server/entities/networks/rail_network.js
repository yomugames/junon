const BaseTransientEntity = require("./../base_transient_entity")
const Network = require('./network')
const FlowField = require("./../../ai/flow_field")
const Protocol = require('../../../common/util/protocol')
const FloodFillManager = require('../../../common/entities/flood_fill_manager')
const TileHit = require("../tile_hit")

// determines what stops are reachable

class RailNetwork extends Network {
  constructor(manager) {
    super(manager)

    this.game = manager.game
    this.container = manager.container
    this.railManager = manager

    this.flowFields = {}
    this.flowFieldRequests = {}
    this.grids = [this.getContainer().railMap, this.getContainer().structureMap]

    this.initFloodFillManager()
    this.PASSABLE_TYPES = new Set() 
    this.PASSABLE_TYPES.add(Protocol.definition().BuildingType.RailTrack) 
    this.PASSABLE_TYPES.add(Protocol.definition().BuildingType.RailStop)
  }

  getTileHit(row, col) {
    if (this.isOutOfBounds(row, col)) return null
    let grid = this.grids[0]

    let tile = TileHit.create()

    let entity = grid.get(row, col)
    if (entity) {
      tile.row = row
      tile.col = col
      tile.type = entity.getType()
      tile.entity = entity
    }

    return tile
  }

  initFloodFillManager() {
    this.floodFillManager = new FloodFillManager(this, { name: "rail_network", container: this.getContainer(), queue: this.getContainer().floodFillQueue.getQueue() })
    this.floodFillManager.setGrids(this.grids)
    this.floodFillManager.setStopIdentifier(this.shouldStopFloodFill.bind(this))
  }

  shouldStopFloodFill(hit, neighbors, originHit, sourceEntity) {
    if (hit.type === Protocol.definition().BuildingType.RailStop) {
      let allowedRailStopHits = hit.entity.getAllowedTrackNeighborHits()
      let center = hit.entity.getTramCenterHit()
      allowedRailStopHits.push(center)

      let isOnAllowedTile = allowedRailStopHits.find((allowedHit) => {
        return allowedHit.row === hit.row && allowedHit.col === hit.col
      })

      return !isOnAllowedTile
    }

    let isPassable = this.isPassable(hit, sourceEntity)
    if (!isPassable) return true

    return false
  }

  invalidateFlowFieldsFor(entity) {
    for (let flowFieldKey in this.flowFields) {
      let flowField = this.flowFields[flowFieldKey]
      let hasFlow = flowField.hasFlow(entity.getRow(), entity.getCol())
      if (hasFlow) {
        flowField.remove()
      }
    }
  }

  removeAllFlowFields() {
    for (let flowFieldKey in this.flowFields) {
      let flowField = this.flowFields[flowFieldKey]
      flowField.remove()
    }
  }

  getContainer() {
    return this.manager.container
  }

  initMembers() {
    this.tiles = {}

    this.stops = {}
  }

  hasFlowField(entity) {

  }

  requestFlowField(entity, options, callback) {
    let existingFlowFieldRequest = this.flowFieldRequests[entity.getId()]
    if (existingFlowFieldRequest) {
      return existingFlowFieldRequest
    }

    if (this.isOutOfBounds(entity.getRow(), entity.getCol())) return null

    let target = { row: entity.getRow(), col: entity.getCol(), entity: entity }
    let field = new FlowField(this, target, this.container, options)
    this.flowFieldRequests[entity.getId()] = field

    field.onPopulated(() => {
      delete this.flowFieldRequests[entity.getId()]

      if (callback) {
        callback()
      }
    })

    field.populate()

    return field
  }

  hasMovingTransport() {
    let result = false

    for (let id in this.container.transports) {
      let transport = this.container.transports[id]
      if (transport.hasCategory("rail_tram") && 
          transport.getRailNetwork() === this) {
        result = true
        break
      }
    }

    return result
  }

  getFlowField(entity) {
    return this.flowFields[this.getFlowFieldKey(entity)]
  }

  requestFloodFill(row, col, options) {
    return this.floodFillManager.requestFloodFill(row, col, options)
  }

  registerFlowField(entity, flowField) {
    this.flowFields[this.getFlowFieldKey(entity)] = flowField
    this.onFlowFieldAdded(flowField)
  }

  unregisterFlowField(flowField) {
    let flowFieldKey = this.getFlowFieldKey(flowField.sourceEntity)

    let storedFlowField = this.flowFields[flowFieldKey]
    if (!storedFlowField) return

    let isFlowFieldStoredInDictionary = flowField.getId() === storedFlowField.getId()
    if (isFlowFieldStoredInDictionary) {
      delete this.flowFields[flowFieldKey]
    }

    this.onFlowFieldRemoved(flowField)
  }

  onFlowFieldRemoved(flowField) {
  }

  onFlowFieldAdded(flowField) {

  }

  getFlowFieldKey(targetEntity) {
    return targetEntity.getId()
  }

  isPassable(hit, sourceEntity) {
    let type = hit.type

    return this.getPassableTypes().has(type) 
  }

  getPassableTypes() {
    return this.PASSABLE_TYPES
  }

  isOutOfBounds(row, col) {
    if (row < 0 || row > this.getContainer().getRowCount() - 1) return true
    if (col < 0 || col > this.getContainer().getColCount() - 1) return true

    return false
  }


  addRailStop(hit) {
    this.stops[hit.entity.getId()] = hit.entity
  }

  addRailTrack(hit) {
    let key = this.getTileKey(hit.entity)
    this.tiles[key] = hit
  }

  isEmpty() {
    let tileCount = Object.keys(this.tiles).length
    let stopCount = Object.keys(this.stops).length

    return (tileCount + stopCount) === 0 
  }

  removeMember(entity) {
    this.removeTile(entity)

    delete this.stops[entity.getId()]
  }

  getTileKey(entity) {
    return entity.getRow() + "-" + entity.getCol()
  }

  removeTile(entity) {
    let key = this.getTileKey(entity)

    this.unassignNetworkFromEntity({ entity: entity }, this)

    delete this.tiles[key]

    this.onTileRemoved(entity)
  }

  onTileRemoved(entity) {
  }

  reset() {
    for (let id in this.tiles) {
      let hit = this.tiles[id]
      this.unassignNetworkFromEntity(hit, this)
    }

    for (let id in this.stops) {
      let entity = this.stops[id]
      this.unassignNetworkFromEntity({ entity: entity }, this)
    }

    this.tiles = {}
    this.stops = {}

    this.removeAllFlowFields()
  }

  unassignNetworkFromEntity(hit, network) {
    this.railManager.unassignNetworkFromEntity(hit, network)
    this.onNetworkUnassigned(hit)
  }

  onNetworkUnassigned(hit) {

  }


}

module.exports = RailNetwork
