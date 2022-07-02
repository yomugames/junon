const Constants = require('../../common/constants.json')
const FlowField = require("./flow_field")
const FloodFillManager = require("./../../common/entities/flood_fill_manager")
const Buildings = require("./../entities/buildings/index")
const Terrains = require("./../entities/terrains/index")
const ChunkRegionPath = require("./chunk_region_path")
const TileHit = require("../entities/tile_hit")
const Helper = require("../../common/helper")

/* using flow field via BFS - https://www.redblobgames.com/pathfinding/tower-defense/index.html */
class PathFinder {
  constructor(container) {
    this.container = container
    this.game = container.game

    this.grids = this.container.getPathFindableGrids()

    this.initPassableTypes()

    // high level datastructure that helps ai navigate around chunk regions
    this.chunkRegionPaths = {}
    this.wallPassChunkRegionPaths = {}

    // low level flowField that helps ai navigate around tiles
    this.flowFields = {}

    // group by chunkRegion for fast access and modification.
    // if chunkRegion changes, only upate flowFields for it
    this.flowFieldsByChunkRegion = {}

    this.flowFieldRequests = {}

    // track when chunk becomes invalid (structure placed/modified)
    // and rebuild chunkRegions and paths
    this.chunkInvalidations = {}

    this.flowFieldCache = {}

    this.debugSubscribers = {}
    this.flowSubscriptions = {}
    this.pendingFlowFieldUpdates = {}

    this.initFloodFillManager()
    this.initChunkRegionFloodFillManager()
  }

  getSocketUtil() {
    return this.game.server.socketUtil
  }

  initPassableTypes() {
    this.SKY_PASSABLE_TYPES = new Set()
    this.SKY_PASSABLE_TYPES.add(0)

    this.GROUND_PASSABLE_TYPES = new Set()
    let buildingTypes = Buildings.getPassableTileTypes()
    let groundTypes = Terrains.getPassableTileTypes()
    for (let i = 0; i < buildingTypes.length; i++) {
      this.GROUND_PASSABLE_TYPES.add(buildingTypes[i])
    }
    for (let i = 0; i < groundTypes.length; i++) {
      this.GROUND_PASSABLE_TYPES.add(groundTypes[i])
    }
  }

  // for floodfilling tiles (low-level)
  initFloodFillManager() {
    this.floodFillManager = new FloodFillManager(this, { name: "path_finder", container: this.container, queue: this.container.floodFillQueue.getQueue() })
    this.floodFillManager.setGrids(this.grids)
    this.floodFillManager.setStopIdentifier(this.shouldStopFloodFill.bind(this))
  }

  initChunkRegionFloodFillManager() {
    this.chunkRegionFloodFillManager = new FloodFillManager(this, { name: "chunk_region", container: this.container, queue: this.container.floodFillQueue.getQueue() })
    this.chunkRegionFloodFillManager.setGrids(this.grids)
  }

  requestFloodFill(row, col, options) {
    return this.floodFillManager.requestFloodFill(row, col, options)
  }

  floodFill(row, col, options, callback) {
    return this.floodFillManager.floodFill(row, col, options, callback)
  }

  addDebugSubscriber(player) {
    this.debugSubscribers[player.getId()] = player
  }

  addFlowSubscription(flowField, player) {
    this.flowSubscriptions[flowField.sourceEntity.getId()] = this.flowSubscriptions[flowField.sourceEntity.getId()] || {}
    this.flowSubscriptions[flowField.sourceEntity.getId()][player.getId()] = player
  }

  isDebugSubscriber(player) {
    return this.debugSubscribers[player.getId()]
  }

  removeDebugSubscriber(player) {
    delete this.debugSubscribers[player.getId()]
  }

  chunkRegionFloodFill(row, col, options, callback) {
    options.shouldTrackPreviousEntity = true
    return this.chunkRegionFloodFillManager.floodFill(row, col, options, callback)
  }

  getPathFindingDistanceLimit(targetEntity) {
    if (!targetEntity) return null

    if (targetEntity.isPlayer() || targetEntity.isMob()) {
      return 15 // num of tiles
    } else if (targetEntity.isSkyTile()) {
      return 8
    } else {
      return null // no limit
    }
  }

  getFlowFieldKey(targetEntity, tile) {
    if (!targetEntity && tile) {
      ["tile", tile.row, tile.col].join("-")
    } else {
      return targetEntity.getId()
    }
  }

  getFlow(sourceEntity, targetEntity) {
    if (!targetEntity) return null

    let flowField = this.flowFields[this.getFlowFieldKey(targetEntity)]
    if (!flowField) return null

    let flow = flowField.getFlow(sourceEntity.getRow(), sourceEntity.getCol())
    return flow
  }

  canReach(sourceEntity, targetEntity) {
    return !!this.getFlow(sourceEntity, targetEntity)
  }

  getFlowFieldToReachSameChunkRegion(targetEntity, options = {}) {
    // Low Level Pathfinding: we are in target chunk region, simply get flowField for target entity
    let flowField = this.flowFields[this.getFlowFieldKey(targetEntity)]

    if (!flowField) {
      if (!options.async) {
        let target = { row: targetEntity.getRow(), col: targetEntity.getCol(), entity: targetEntity }
        flowField = this.requestFlowFieldSync(target)
      } else {
        flowField = this.requestFlowField(targetEntity, {})
      }
    }

    if (flowField) {
      let chunkRegions = targetEntity.getChunkRegions()
      for (let id in chunkRegions) {
        let chunkRegion = chunkRegions[id]
        this.registerFlowFieldToChunkRegion(chunkRegion.getId(), targetEntity.getId(), flowField)
      }
    }

    return flowField
  }

  getFlowFieldToReachDifferentChunkRegion(sourceEntity, sourceChunkRegion, destinationChunkRegions) {
    let flowField = null
    let targetDestinationChunkRegion = null

    let destinationChunkRegionList = Object.values(destinationChunkRegions)
    let sameBiomeAsSourceEntityChunkRegions = destinationChunkRegionList.filter((chunkRegion) => {
      return sourceEntity.isOnLand() ? chunkRegion.isLandChunkRegion() : !chunkRegion.isSkyChunkRegion()
    })

    let diffBiomeAsSourceEntityChunkRegions = destinationChunkRegionList.filter((chunkRegion) => {
      return sourceEntity.isOnLand() ? !chunkRegion.isLandChunkRegion() : chunkRegion.isSkyChunkRegion()
    })

    let chunkRegions = sameBiomeAsSourceEntityChunkRegions.concat(diffBiomeAsSourceEntityChunkRegions)

    for (let chunkRegionId in chunkRegions) {
      let destinationChunkRegion = chunkRegions[chunkRegionId]

      // High Level Pathfinding: get to destination chunk region
      if (sourceChunkRegion && destinationChunkRegion && sourceChunkRegion !== destinationChunkRegion) {
        flowField = this.getFlowFieldToReachChunkRegion(sourceEntity, sourceChunkRegion, destinationChunkRegion)
        if (flowField) {
          targetDestinationChunkRegion = destinationChunkRegion
          break
        }
      }
    }

    return { flowField: flowField, destinationChunkRegion: targetDestinationChunkRegion }
  }

  getDirectionToReach(sourceEntity, targetEntity) {
    let flowField = this.getFlowFieldToReach(sourceEntity, targetEntity, { async: true })
    if (!flowField) return null

    return flowField.getBilinearInterpolatedDirection(sourceEntity)
  }

  getDirectionToReachSync(sourceEntity, targetEntity) {
    let flowField = this.getFlowFieldToReach(sourceEntity, targetEntity, { async: false })
    if (!flowField) return null

    return flowField.getBilinearInterpolatedDirection(sourceEntity)
  }

  getFlowFieldCacheKey(sourceChunkRegion, targetEntity) {
    return sourceChunkRegion.id + "-" + targetEntity.getRow() + "-" + targetEntity.getCol()
  }

  cacheFlowField(flowFieldCacheKey, flowField) {
    if (!flowField) return

    this.flowFieldCache[flowFieldCacheKey] = {
      flowField: flowField,
      lastUsedTimestamp: this.game.timestamp
    }

    flowField.addCacheDependency(flowFieldCacheKey)
  }

  getFlowFieldToReach(sourceEntity, targetEntity, options = {}) {
    if (!targetEntity) return null

    let sourceChunkRegion = sourceEntity.getChunkRegion()
    let flowFieldCacheKey

    if (sourceChunkRegion) {
      flowFieldCacheKey = this.getFlowFieldCacheKey(sourceChunkRegion, targetEntity)
      if (this.flowFieldCache[flowFieldCacheKey]) {
        this.flowFieldCache[flowFieldCacheKey].lastUsedTimestamp = this.game.timestamp
        return this.flowFieldCache[flowFieldCacheKey].flowField
      }
    }

    let destinationChunkRegions = targetEntity.getChunkRegions()

    let isOnSameChunkRegion  = sourceChunkRegion &&
                               destinationChunkRegions[sourceChunkRegion.getId()]

    let notInChunkRegion = !sourceChunkRegion || Object.keys(destinationChunkRegions).length === 0

    if (isOnSameChunkRegion || notInChunkRegion) {
      let flowField = this.getFlowFieldToReachSameChunkRegion(targetEntity, options)
      if (flowField) {
        this.cacheFlowField(flowFieldCacheKey, flowField)
      }

      return flowField
    } else {
      let result = this.getFlowFieldToReachDifferentChunkRegion(sourceEntity, sourceChunkRegion, destinationChunkRegions, sourceEntity, targetEntity)

      if (targetEntity.isBuilding()) {
        // before getting flowField to different chunkRegion of a building, check targetEntity can be reached from gates of its chunkRegion
        // TBD: this probably needs to stay synchronou..
        let flowField = this.getFlowFieldToReachSameChunkRegion(targetEntity)
        if (!flowField.isInitialized()) return null
        if (!result.destinationChunkRegion) return null

        if (!this.isTargetReachableFromItsChunkRegion(result.destinationChunkRegion, flowField)) {
          return null
        }
      }

      let flowField = result.flowField
      if (flowField) {
        this.cacheFlowField(flowFieldCacheKey, flowField)
      }

      return flowField
    }
  }

  isTargetReachableFromItsChunkRegion(chunkRegion, flowField) {
    let gateCoord = chunkRegion.getRandomGateCoord()
    if (!gateCoord) return true

    return flowField.hasFlow(gateCoord.row, gateCoord.col)
  }

  shouldStopFloodFill(hit, neighbors, originHit, sourceEntity) {
    let hitChunkRegions = this.game.sector.getChunkRegionsAt(hit.row, hit.col)

    let isPassable

    let isSkyTile = !hit.entity
    let isSkyOrigin = !originHit.entity
    if (isSkyOrigin && isSkyTile) {
      isPassable = true
    } else {
      isPassable = this.isPassable(hit, sourceEntity)
    }

    if (!isPassable) return true

    let destinationChunkRegions = sourceEntity && sourceEntity.getChunkRegions()

    if (Object.keys(destinationChunkRegions).length > 0) {
      let isPartOfSourceChunkRegions

      // see if its part of destinationChunkRegion. forgot reason why this is needed
      for (let chunkRegionId in hitChunkRegions) {
        let hitChunkRegion = hitChunkRegions[chunkRegionId]
        if (destinationChunkRegions[hitChunkRegion.getId()]) {
          isPartOfSourceChunkRegions = true
          break
        }
      }

      return !isPartOfSourceChunkRegions
    } else {
      // try distance limit
      let distanceLimit = this.getPathFindingDistanceLimit(sourceEntity)
      let isDistanceLimitExceeded = distanceLimit && hit.distance >= distanceLimit
      return isDistanceLimitExceeded
    }
  }


  getFlowFieldsByChunkRegion(chunkRegion) {
    this.flowFieldsByChunkRegion[chunkRegion.getId()] = this.flowFieldsByChunkRegion[chunkRegion.getId()] || {}
    return this.flowFieldsByChunkRegion[chunkRegion.getId()]
  }

  getFlowFieldsByChunkRegionId(chunkRegionId) {
    this.flowFieldsByChunkRegion[chunkRegionId] = this.flowFieldsByChunkRegion[chunkRegionId] || {}
    return this.flowFieldsByChunkRegion[chunkRegionId]
  }

  findReusableChunkRegionPath(sourceChunkRegion, destinationChunkRegion) {
    // check existing flowField, see if we know how to reach destination from source
    let reusablePath = null

    for (let chunkRegionId in this.chunkRegionPaths) {
      let chunkRegionPath = this.chunkRegionPaths[chunkRegionId]
      let hasExistingPath = chunkRegionPath.hasExistingPath(sourceChunkRegion, destinationChunkRegion)
      if (hasExistingPath) {
        reusablePath = chunkRegionPath
        break
      }
    }

    return reusablePath
  }

  getFlowFieldToReachDifferentBiome(sourceChunkRegion, destinationChunkRegion) {
    // they need to be neighbors
    let isNeighbor = sourceChunkRegion.chunk === destinationChunkRegion.chunk ||
                     sourceChunkRegion.getGatesToEnterFrom(destinationChunkRegion).length > 0

    if (!isNeighbor) return null

    let flowFields = this.getFlowFieldsByChunkRegion(sourceChunkRegion)
    let flowField = flowFields[destinationChunkRegion.getId()]

    if (!flowField) {
      flowField = this.createFlowFieldForDifferentBiomeChunkRegions(sourceChunkRegion, destinationChunkRegion)
    }

    return flowField
  }


  getNextChunkRegionInSameContinent(sourceChunkRegion, destinationChunkRegion) {
    if (!destinationChunkRegion) return null

    let chunkRegionPath = this.getChunkRegionPath(destinationChunkRegion, sourceChunkRegion)

    let nextChunkRegion = chunkRegionPath.getNextChunkRegion(sourceChunkRegion)
    return nextChunkRegion
  }

  getChunkRegionPath(destinationChunkRegion, sourceChunkRegion) {
    let chunkRegionPath = this.chunkRegionPaths[destinationChunkRegion.getId()]

    if (!chunkRegionPath && sourceChunkRegion) {
      chunkRegionPath = this.findReusableChunkRegionPath(sourceChunkRegion, destinationChunkRegion)
    }

    if (!chunkRegionPath) {
      chunkRegionPath = this.requestChunkRegionPath(destinationChunkRegion)
    }

    return chunkRegionPath
  }

  isAtExitLandChunkRegion(chunkRegion) {
    return chunkRegion.hasSkyEdge()
  }

  getExitChunkRegion(chunkRegion, destinationChunkRegion, nextContinent) {
    let continent = chunkRegion.getContinent()
    if (!continent) return null

    let exitChunkRegions = continent.exits[nextContinent.getId()]
    if (!exitChunkRegions) return null

    let neighborDestinationChunkRegions = destinationChunkRegion.getNeighbors({sameBiome: false, passThroughWall: true})

    let exit

    let preferredExitChunkRegions = neighborDestinationChunkRegions.filter((neighborChunkRegion) => {
      let isExitChunkRegion = exitChunkRegions[neighborChunkRegion.getId()]
      return isExitChunkRegion
    })

    let isAtPreferredExitChunkRegion = preferredExitChunkRegions.find((exitChunkRegion) => {
      return exitChunkRegion === chunkRegion
    })

    if (isAtPreferredExitChunkRegion) {
      exit = chunkRegion
    } else if (preferredExitChunkRegions.length > 0) {
      exit = preferredExitChunkRegions[0]
    } else if (exitChunkRegions[chunkRegion.getId()]) {
      exit = chunkRegion // if chunkRegion im on is on SkyLand edge, make it exit
    } else {
      exit = Object.values(exitChunkRegions)[0]
    }

    let enter

    if (exit) {
      let neighbors = exit.getNeighbors({ sameBiome: false, passThroughWall: true })
      enter = neighbors.find((neighbor) => {
        return neighbor.getContinent() === nextContinent
      })
    }

    return { exit: exit, enter: enter }
  }

  getNextChunkRegion(sourceChunkRegion, destinationChunkRegion) {
    // attempt direct chunk region path
    let nextChunkRegion = this.getNextChunkRegionInSameContinent(sourceChunkRegion, destinationChunkRegion)

    if (!nextChunkRegion && !this.game.isPvP()) {
      let sourceContinent = this.container.findOrCreateContinent(sourceChunkRegion)
      let destinationContinent = this.container.findOrCreateContinent(destinationChunkRegion)
      if (sourceContinent !== destinationContinent) {
        if (this.canBeReachedFromEdgesOfContinent(destinationChunkRegion, destinationContinent)) {
          nextChunkRegion = this.getNextChunkRegionToReachDifferentContinent(sourceChunkRegion, destinationChunkRegion, sourceContinent, destinationContinent)
        }
      }
    }

    return nextChunkRegion
  }

  canBeReachedFromEdgesOfContinent(chunkRegion, continent) {
    let chunkRegionPath = this.getChunkRegionPath(chunkRegion)
    let isContinentEdgeInPath = Object.values(continent.edges).find((edgeChunkRegion) => {
      return chunkRegionPath.hasChunkRegion(edgeChunkRegion)
    })

    return isContinentEdgeInPath
  }

  getFlowFieldToReachChunkRegion(sourceEntity, sourceChunkRegion, destinationChunkRegion) {
    if (!destinationChunkRegion) return null

    let nextChunkRegion = this.getNextChunkRegion(sourceChunkRegion, destinationChunkRegion)
    if (!nextChunkRegion) return null

    if (sourceChunkRegion.isSky !== nextChunkRegion.isSky) {
      return this.getFlowFieldToReachDifferentBiome(sourceChunkRegion, nextChunkRegion)
    }

    let flowFields = this.getFlowFieldsByChunkRegion(sourceChunkRegion)
    let flowField = flowFields[nextChunkRegion.getId()]

    if (!flowField) {
      flowField = this.createFlowFieldForSameBiomeChunkRegions(sourceChunkRegion, nextChunkRegion)
    }

    return flowField
  }

  getNextContinent(sourceContinent, destinationContinent) {
    let visited = {}

    let frontier = [destinationContinent]
    visited[destinationContinent.getId()] = true

    let result

    while (frontier.length > 0) {
      let continent = frontier.shift()

      let neighbors = continent.getNeighbors()
      if (neighbors[sourceContinent.getId()]) {
        result = continent
        break
      }

      for (let id in neighbors) {
        let neighbor = neighbors[id]
        if (!visited[neighbor.getId()]) {
          frontier.push(neighbor)
          visited[neighbor.getId()] = true
        }
      }
    }

    return result
  }

  getNextChunkRegionToReachDifferentContinent(sourceChunkRegion, destinationChunkRegion, sourceContinent, destinationContinent) {
    let nextChunkRegion

    let nextContinent = this.getNextContinent(sourceContinent, destinationContinent)
    if (!nextContinent) return null

    let exitResult = this.getExitChunkRegion(sourceChunkRegion, destinationChunkRegion, nextContinent)
    let exitChunkRegion = exitResult.exit

    if (sourceChunkRegion === exitChunkRegion) {
      nextChunkRegion = exitResult.enter
    } else if (exitChunkRegion) {
      nextChunkRegion = this.getNextChunkRegionInSameContinent(sourceChunkRegion, exitChunkRegion)
    }

    return nextChunkRegion
  }

  createFlowFieldForDifferentBiomeChunkRegions(sourceChunkRegion, nextChunkRegion) {
    let transitionEdges = nextChunkRegion.getLandSkyTransitionEdges()
    let transitionEdgeList = Object.keys(transitionEdges)
    if (transitionEdgeList.length === 0) return null

    transitionEdges

    let options = {
      shouldStop: this.shouldStopLandToSkyChunkRegionFlowField.bind(this, sourceChunkRegion, transitionEdges),
      isLandAndSky: true,
      isChunkRegionFlowField: true
    }

    let row = parseInt(transitionEdgeList[0].split("-")[0])
    let col = parseInt(transitionEdgeList[0].split("-")[1])

    let tileTarget = this.getTileHit(row, col)

    options.additionalTargets = transitionEdgeList.map((edge) => {
      let row = parseInt(edge.split("-")[0])
      let col = parseInt(edge.split("-")[1])
      return this.getTileHit(row, col)
    })

    let flowField = this.requestFlowFieldSync(tileTarget, options)

    if (options.additionalTargets) {
      for (var i = 0; i < options.additionalTargets.length; i++) {
        let otherHit = options.additionalTargets[i]
        otherHit.remove()
      }
    }

    this.registerFlowFieldToChunkRegion(sourceChunkRegion.getId(), nextChunkRegion.getId(), flowField)
    return flowField
  }

  getAdditionalFlowFieldTargets(sourceChunkRegion, nextChunkRegion, gates) {
    if (sourceChunkRegion.isSkyChunkRegion() && nextChunkRegion.isSkyChunkRegion()) {
      return []
      // return this.getAdditionalFlowFieldTargetsForSky(sourceChunkRegion, nextChunkRegion, gates)
    } else {
      return this.getAdditionalFlowFieldTargetsForLand(sourceChunkRegion, nextChunkRegion, gates)
    }
  }

  getAdditionalFlowFieldTargetsForSky(sourceChunkRegion, nextChunkRegion, gates) {
    let gate = gates[0]
    let hits = []

    gate.forEachRowCol((row, col) => {
      let tileHit = this.getTileHit(row, col)
      hits.push(tileHit)
    })

    return hits
  }

  getAdditionalFlowFieldTargetsForLand(sourceChunkRegion, nextChunkRegion, gates) {
    let otherGates = gates.slice(1)
    let hits = []

    if (otherGates.length > 0) {
      hits = otherGates.map((gate) => {
        let midpoint = gate.getMidpoint()
        return this.getTileHit(midpoint.row, midpoint.col)
      })
    }

    return hits
  }

  createFlowFieldForSameBiomeChunkRegions(sourceChunkRegion, nextChunkRegion) {
    // multiple initialFrontier if multiple gates
    let gates = nextChunkRegion.getGatesToEnterFrom(sourceChunkRegion)
    if (gates.length === 0) return null // handle this case..

    let options = {
      shouldStop: this.shouldStopChunkRegionFlowField.bind(this, sourceChunkRegion, gates),
      isChunkRegionFlowField: true
    }

    let midpoint = gates[0].getMidpoint()
    let tileTarget = this.getTileHitCopy(midpoint.row, midpoint.col)

    let additionalTargets = this.getAdditionalFlowFieldTargets(sourceChunkRegion, nextChunkRegion, gates)
    if (additionalTargets.length > 0) {
      options.additionalTargets = additionalTargets
    }

    let flowField = this.requestFlowFieldSync(tileTarget, options)

    if (options.additionalTargets) {
      for (var i = 0; i < options.additionalTargets.length; i++) {
        let otherHit = options.additionalTargets[i]
        otherHit.remove()
      }
    }

    this.registerFlowFieldToChunkRegion(sourceChunkRegion.getId(), nextChunkRegion.getId(), flowField)
    return flowField
  }

  shouldStopLandToSkyChunkRegionFlowField(sourceChunkRegion, transitionEdges, hit, neighbors, originHit, sourceEntity) {
    let isPassable

    if (sourceChunkRegion.isSkyChunkRegion()) {
      // transitioning from sky to land
      let isSkyTile = !hit.entity
      isPassable = this.isPassable(hit, sourceEntity) || isSkyTile
    } else {
      if (!hit.entity) {
        // allow empty tiles if they are transition edges from land to sky
        let tileKey = [hit.row, hit.col].join("-")
        isPassable = !!transitionEdges[tileKey]
      } else {
        isPassable = this.isPassable(hit, sourceEntity)
      }
    }

    if (!isPassable) return true

    let hitChunkRegion = this.game.sector.getChunkRegionAt(hit.row, hit.col)

    let isOnSourceChunkRegion = sourceChunkRegion === hitChunkRegion
    if (!isOnSourceChunkRegion) {
      // should stop only if not in transition edge

      let tileKey = [hit.row, hit.col].join("-")
      return !transitionEdges[tileKey]
    }

    return false

  }

  shouldStopChunkRegionFlowField(sourceChunkRegion, gates, hit, neighbors, originHit, sourceEntity) {
    let isPassable

    if (sourceChunkRegion.isSkyChunkRegion()) {
      let isSkyTile = !hit.entity
      isPassable = this.isPassable(hit, sourceEntity) || isSkyTile
    } else {
      if (!hit.entity) return true
      isPassable = this.isPassable(hit, sourceEntity)
    }

    if (!isPassable) return true

    let hitChunkRegion = this.game.sector.getChunkRegionAt(hit.row, hit.col)

    let isOnSourceChunkRegion = sourceChunkRegion === hitChunkRegion
    if (!isOnSourceChunkRegion) {
      // can only allow tiles inside gates
      let isOnGate = gates.find((gate) => {
        return gate.hasTile(hit.row, hit.col)
      })

      return !isOnGate
    }

    return false
  }

  requestChunkRegionPath(destinationChunkRegion) {
    if (this.chunkRegionPaths[destinationChunkRegion.getId()]) {
      return this.chunkRegionPaths[destinationChunkRegion.getId()]
    }

    if (this.wallPassChunkRegionPaths[destinationChunkRegion.getId()]) {
      return this.wallPassChunkRegionPaths[destinationChunkRegion.getId()]
    }

    let chunkRegionPath = new ChunkRegionPath(this, destinationChunkRegion)

    let node = {
      chunkRegion: destinationChunkRegion,
      distance: 0,
      nextChunkRegion: null
    }

    let visited = {}
    visited[destinationChunkRegion.getId()] = true
    let frontier = [node]
    let distance = 0

    while (frontier.length > 0) {
      let current = frontier.shift()

      let isNeighborAdded = false
      let neighbors = current.chunkRegion.getNeighbors({ sameBiome: true })
      neighbors.forEach((neighbor) => {
        if (!visited[neighbor.getId()]) {
          isNeighborAdded = true
          let neighborNode = {
            chunkRegion: neighbor,
            distance: current.distance + 1,
            nextChunkRegion: current.chunkRegion
          }

          frontier.push(neighborNode)
          visited[neighbor.getId()] = true
        }
      })

      chunkRegionPath.addNode(current)
      if (!isNeighborAdded) {
        chunkRegionPath.addTail(current)
      }

    }

    chunkRegionPath.finish()

    if (this.getDebugSubscriberIds().length > 0) {
      let socketIds = this.getDebugSubscriberIds()
      this.getSocketUtil().broadcast(socketIds, "UpdateChunkRegionPath", { chunkRegionPaths: [chunkRegionPath.toJson()] })
    }

    return chunkRegionPath
  }

  getDebugSubscriberIds() {
    return this.getDebugSubscribers().map((player) => { return player.getSocketId() })
  }

  getDebugSubscribers() {
    return Object.values(this.debugSubscribers)
  }

  registerFlowField(entity, flowField) {
    if (entity) {
      this.flowFields[this.getFlowFieldKey(entity, flowField.target)] = flowField
    }

    this.onFlowFieldAdded(flowField)
  }

  onFlowFieldAdded(flowField) {
    if (!flowField.sourceEntity) return

    let subscribers = this.flowSubscriptions[flowField.sourceEntity.getId()]
    if (!subscribers) return

    let json = flowField.toJson()

    for (let playerId in subscribers) {
      let player = subscribers[playerId]
      this.getSocketUtil().emit(player.getSocket(), "FlowField", json)
    }
  }

  onFlowFieldRemoved(flowField) {
    if (!flowField.sourceEntity) return

    let subscribers = this.flowSubscriptions[flowField.sourceEntity.getId()]
    if (!subscribers) return

    let json = flowField.toJson()
    json.clientMustDelete = true

    for (let playerId in subscribers) {
      let player = subscribers[playerId]
      this.getSocketUtil().emit(player.getSocket(), "FlowField", json)
    }
  }

  registerFlowFieldToChunkRegion(sourceChunkRegionId, entityId,  flowField) {
    this.flowFieldsByChunkRegion[sourceChunkRegionId] = this.flowFieldsByChunkRegion[sourceChunkRegionId] || {}
    this.flowFieldsByChunkRegion[sourceChunkRegionId][entityId] = flowField
  }

  unregisterFlowField(flowField) {
    let flowFieldKey = this.getFlowFieldKey(flowField.sourceEntity, flowField.target)

    if (flowField.sourceEntity) {
      let chunkRegions = flowField.sourceEntity.getChunkRegions()
      for (let id in chunkRegions) {
        let chunkRegion = chunkRegions[id]
        let flowFields = this.flowFieldsByChunkRegion[chunkRegion.getId()]
        if (flowFields) {
          delete flowFields[flowField.sourceEntity.getId()]
        }
      }

      let chunkRow = Helper.getChunkRowFromRow(flowField.target.row)
      let chunkCol = Helper.getChunkColFromCol(flowField.target.col)

      let chunk = this.container.getChunk(chunkRow, chunkCol)
      if (chunk) {
        chunkRegions = chunk.chunkRegions
        for (let id in chunkRegions) {
          let chunkRegion = chunkRegions[id]
          let flowFields = this.flowFieldsByChunkRegion[chunkRegion.getId()]
          if (flowFields) {
            delete flowFields[flowField.sourceEntity.getId()]
          }
        }
      }
    }


    let storedFlowField = this.flowFields[flowFieldKey]
    if (!storedFlowField) return

    let isFlowFieldStoredInDictionary = flowField.getId() === storedFlowField.getId()
    if (isFlowFieldStoredInDictionary) {
      delete this.flowFields[flowFieldKey]
    }

    delete this.flowFieldRequests[flowFieldKey]
    delete this.pendingFlowFieldUpdates[flowField.getId()]

    this.onFlowFieldRemoved(flowField)
  }

  invalidateChunk(chunk) {
    if (!chunk) return
    if (this.container.isChunkInvalidationDisabled) return
    this.chunkInvalidations[chunk.getId()] = { chunk: chunk, lastInvalidateTime: Date.now() }
  }

  cleanupStaleCache() {
    for (let cacheKey in this.flowFieldCache) {
      let durationTimestamp = this.game.timestamp - this.flowFieldCache[cacheKey].lastUsedTimestamp
      let duration = Constants.physicsTimeStep * 30
      if (durationTimestamp > duration) {
        let flowField = this.flowFieldCache[cacheKey].flowField
        if (flowField) {
          flowField.removeCacheDependency(cacheKey)
        }

        delete this.flowFieldCache[cacheKey]
      }
    }
  }

  rebuildInvalidatedChunks() {
    let maxDuration = 10 // ms
    let elapsed = 0

    for (let chunkId in this.chunkInvalidations) {
      let isTimeAllowed = elapsed < maxDuration
      if (!isTimeAllowed) return

      let invalidation = this.chunkInvalidations[chunkId]
      let isReadyToRebuild = Date.now() - invalidation.lastInvalidateTime > 1000
      if (isReadyToRebuild) {
        let timeSpent = this.rebuildChunk(invalidation.chunk)
        elapsed += timeSpent
      }
    }
  }

  rebuildChunk(chunk) {
    let startTime = Date.now()
    let changedChunkedRegionsJson = []

    let chunkRegions = chunk.getChunkRegions()
    for (let chunkRegionId in chunkRegions) {
      let chunkRegion = chunkRegions[chunkRegionId]
      this.removeChunkRegionPathsFor(chunkRegion)
      this.removeChunkRegionFlowFieldsFor(chunkRegion)
      chunkRegion.remove()
      changedChunkedRegionsJson.push({ id: chunkRegion.getId(), clientMustDelete: true })
    }

    chunk.rebuildRegions()
    chunk.getChunkRegionList().forEach((chunkRegion) => {
      changedChunkedRegionsJson.push(chunkRegion.toJson())
    })

    this.getDebugSubscribers().forEach((player) => {
      this.getSocketUtil().emit(player.getSocket(), "UpdateChunkRegion", { chunkRegions: changedChunkedRegionsJson })
    })

    delete this.chunkInvalidations[chunk.getId()]
    let endTime = Date.now()

    return endTime - startTime
  }

  removeChunkRegionPathsFor(chunkRegion) {
    let changedChunkedRegionPathsJson = []

    for (let chunkRegionId in this.chunkRegionPaths) {
      let chunkRegionPath = this.chunkRegionPaths[chunkRegionId]
      if (chunkRegionPath.hasChunkRegion(chunkRegion)) {
        chunkRegionPath.remove()
        changedChunkedRegionPathsJson.push({ id: chunkRegionPath.getId(), clientMustDelete: true })
      }
    }

    this.getDebugSubscribers().forEach((player) => {
      this.getSocketUtil().emit(player.getSocket(), "UpdateChunkRegionPath", { chunkRegionPaths: changedChunkedRegionPathsJson })
    })
  }

  removeChunkRegionFlowFieldsFor(chunkRegion) {
    let flowFields = this.flowFieldsByChunkRegion[chunkRegion.getId()]
    if (flowFields) {
      Object.values(flowFields).forEach((flowField) => {
        this.unregisterFlowField(flowField)
      })
      delete this.flowFieldsByChunkRegion[chunkRegion.getId()]
    }

    let neighborChunkRegions = chunkRegion.getNeighbors({ sameBiome: true })

    neighborChunkRegions.forEach((neighborChunkRegion) => {
      let flowFields = this.flowFieldsByChunkRegion[neighborChunkRegion.getId()]
      if (flowFields) {
        let flowField = flowFields[chunkRegion.getId()]
        if (flowField) {
          this.unregisterFlowField(flowField)
        }
        delete flowFields[chunkRegion.getId()]
      }
    })
  }

  updateFlowFieldsNear(entity) {
    let flowFields = this.getFlowFieldsNear(entity)
    flowFields.forEach((flowField) => {
      this.updateFlowField(flowField)
    })
  }

  updateFlowField(flowField) {
    // we want entities to be able to use old one while new one is being created
    // so that flowField movement is seamless

    let options = flowField.options
    options.updateTimestamp = flowField.updateTimestamp // resume tracking of when it was last used

    let newFlowField = this.requestFlowField(flowField.sourceEntity, flowField.options, () => {
      flowField.remove() // delete old one
    })

    if (newFlowField) {
      let chunkRegions = newFlowField.sourceEntity.getChunkRegions()
      for (let id in chunkRegions) {
        let chunkRegion = chunkRegions[id]
        this.registerFlowFieldToChunkRegion(chunkRegion.getId(), flowField.sourceEntity.getId(), newFlowField)
      }
    }

    return newFlowField
  }

  updateFlowFieldForEntity(entity) {
    let flowField = this.flowFields[this.getFlowFieldKey(entity)]
    if (flowField) {
      if (flowField.isInactive()) {
        flowField.remove()
      } else if (flowField.isRecentlyCreated()) {
        this.addPendingFlowFieldUpdate(flowField)
      } else {
        this.removePendingFlowFieldUpdate(flowField)
        this.updateFlowField(flowField)
      }
    }
  }

  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    this.processPendingFlowFieldUpdates()

    const isOneMinuteInterval = this.game.timestamp % (Constants.physicsTimeStep * 60) === 0
    if (!isOneMinuteInterval) return

    this.removeInactiveFlowFields()
    this.cleanupStaleCache()
  }

  processPendingFlowFieldUpdates(flowField) {
    for (let id in this.pendingFlowFieldUpdates) {
      let flowField = this.pendingFlowFieldUpdates[id]
      this.removePendingFlowFieldUpdate(flowField)
      this.updateFlowField(flowField)
    }
  }

  removeInactiveFlowFields() {
    for (let flowFieldId in this.flowFields) {
      let flowField = this.flowFields[flowFieldId]
      if (!flowField.isPersistent && !flowField.isChunkRegionFlowField) {
        if (flowField.isInactive()) {
          flowField.remove()
        }
      }
    }
  }

  addPendingFlowFieldUpdate(flowField) {
    this.pendingFlowFieldUpdates[flowField.getId()] = flowField
  }

  removePendingFlowFieldUpdate(flowField) {
    delete this.pendingFlowFieldUpdates[flowField.getId()]
  }

  // when we want to update someone's flowField, we request temp flowField
  // and populate it asycnhornously. Only when its populated do we replace
  // the old one

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

  requestFlowFieldSync(target, options) {
    let field = new FlowField(this, target, this.container, options)
    field.populateSync()
    return field
  }

  getFlowField(entity) {
    return this.flowFields[this.getFlowFieldKey(entity)]
  }

  getPathFindingNeighbors(row, col) {
    return [
      { row: row - 1, col: col    }, // top
      { row: row    , col: col - 1}, // left
      { row: row + 1, col: col    }, // down
      { row: row    , col: col + 1}, // right
    ].filter((coord) => {
      let tile = this.getTile(coord.row, coord.col)
      if (!tile) return false

      return tile.getType() !== 0
    })
  }

  isPassable(hit, sourceEntity) {
    if (!hit) return true

    if (hit.entity && hit.entity.isBuilding() && hit.entity.isConstructionInProgress()) {
      // still under construction, so passable
      return true
    }

    let type = hit.type

    if (hit.entity && hit.entity.hasCategory("partially_passable")) {
      return hit.entity.isHitPassable(hit)
    }
    return this.getPassableTypes(sourceEntity).has(type)
  }

  // depends on where targetEntity/flood-fill origin is sky or not
  getPassableTypes(sourceEntity) {
    if (sourceEntity && (sourceEntity.isSkyTile() || !sourceEntity.getStandingPlatform())) {
      return this.SKY_PASSABLE_TYPES
    } else {
      return this.GROUND_PASSABLE_TYPES
    }
  }

  canPassEntity(sourceEntity, row, col) {
    let tile = this.getTile(row, col)
    if (!tile) {
      // sky
      return sourceEntity.canTravelInSpace()
    }

    return this.isTileGroundPassable(tile.getType())
  }

  isTileGroundPassable(tileType) {
    return this.GROUND_PASSABLE_TYPES.has(tileType)
  }

  isOutOfBounds(row, col) {
    if (row < 0 || row > this.container.getRowCount() - 1) return true
    if (col < 0 || col > this.container.getColCount() - 1) return true

    return false
  }

  getTileHit(row, col) {
    if (this.isOutOfBounds(row, col)) return null

    let tile = TileHit.create()
    tile.row = row
    tile.col = col

    for (var i = 0; i < this.grids.length; i++) {
      let grid = this.grids[i]
      let entity = grid.get(row, col)
      if (entity) {
        tile.type = entity.getType()
        tile.entity = entity
        break
      }
    }

    return tile
  }

  getTileHitCopy(row, col) {
    let result = {}

    let hit = this.getTileHit(row, col)
    result.row = hit.row
    result.col = hit.col
    result.type = hit.type
    result.entity = hit.entity

    hit.remove()

    return result
  }

  getTile(row, col) {
    if (this.isOutOfBounds(row, col)) return null

    let tile = null

    for (var i = 0; i < this.grids.length; i++) {
      let grid = this.grids[i]
      let entity = grid.get(row, col)
      if (entity) {
        tile = entity
        break
      }
    }

    return tile
  }

  getFlowFieldsNear(entity) {
    const chunkRegion = entity.getChunkRegion()
    if (!chunkRegion) return []

    let chunkRegionFlowFieldList = Object.values(this.getFlowFieldsByChunkRegion(chunkRegion))

    let flowFieldsInEntityPosition = chunkRegionFlowFieldList.filter((flowField) => {
      return flowField.getFlow(entity.getRow(), entity.getCol())
    })

    if (flowFieldsInEntityPosition.length > 0) {
      return flowFieldsInEntityPosition
    } else {
      return this.getFlowFieldsNearNeighbor(entity, chunkRegionFlowFieldList)
    }
  }

  getFlowFieldsNearNeighbor(entity, flowFieldList) {
    let hits = this.getPathFindingNeighbors(entity.getRow(), entity.getCol())
    let flowFields = {}

    hits.forEach((hit) => {
      flowFieldList.forEach((flowField) => {
        if (flowField.getFlow(hit.row, hit.col)) {
          flowFields[flowField.getId()] = flowField
        }
      })
    })

    return Object.values(flowFields)
  }

  markChangesRead() {
    for (let key in this.flowFields) {
      this.flowFields[key].isChanged = false
    }
  }

  findSpawnChunkRegion(targetStructure, options = {}) {
    let destinationChunkRegion
    let chunkRegions = Object.values(targetStructure.getChunkRegions())
    let skyEdgedChunkRegion = chunkRegions.find((chunkRegion) => { return chunkRegion.hasSkyEdge() })

    if (skyEdgedChunkRegion) {
      destinationChunkRegion = skyEdgedChunkRegion
    }

    if (!destinationChunkRegion) {
      // pick one that has a non-homearea chunkRegionPath spawn point
      for (var i = 0; i < chunkRegions.length; i++) {
        let chunkRegion = chunkRegions[i]
        let chunkRegionPath = chunkRegion.requestChunkRegionPath()

        let chunkRegionNodes
        if (options.allowHomeArea) {
          chunkRegionNodes = chunkRegionPath.getFarthestChunkRegionNodes()
        } else {
          chunkRegionNodes = chunkRegionPath.getFarthestNonHomeAreaChunkRegionNodes()
        }
        if (chunkRegionNodes.length > 0) {
          destinationChunkRegion = chunkRegion
          break
        }
      }
    }

    if (!destinationChunkRegion) return null

    let chunkRegionPath = destinationChunkRegion.requestChunkRegionPath()

    let chunkRegionNodes
    if (options.allowHomeArea) {
      chunkRegionNodes = chunkRegionPath.getFarthestChunkRegionNodes()
    } else {
      chunkRegionNodes = chunkRegionPath.getFarthestNonHomeAreaChunkRegionNodes()
    }

    // prefer one that is sky edged
    let skyEdgedNonHomeAreaChunkRegionNodes = chunkRegionNodes.filter((chunkRegionNode) => {
      return chunkRegionNode.chunkRegion.hasSkyEdge()
    })

    if (skyEdgedNonHomeAreaChunkRegionNodes.length > 0) {
      let farthestNode = this.getFarthestNode(skyEdgedNonHomeAreaChunkRegionNodes)
      if (farthestNode) return farthestNode.chunkRegion
    } else {
      let farthestNode = this.getFarthestNode(chunkRegionNodes)
      if (farthestNode) return farthestNode.chunkRegion
    }

    return null
  }

  getFarthestNode(nodes) {
    let maxDistance = 0
    let farthest = nodes[0]
    for (var i = 0; i < nodes.length; i++) {
      let node = nodes[i]
      if (node.distance > maxDistance) {
        farthest = node
        maxDistance = node.distance
      }
    }

    return farthest
  }

  findSpawnGround(spawnChunkRegion) {
    let tile

    if (spawnChunkRegion.hasGroundSkyEdge()) {
      tile = spawnChunkRegion.getRandomGroundSkyEdgeTile()
    } else {
      tile = spawnChunkRegion.getRandomPlatformTile()
    }

    return tile
  }


}

module.exports = PathFinder
