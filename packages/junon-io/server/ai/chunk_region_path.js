const ExceptionReporter = require("junon-common/exception_reporter")

class ChunkRegionPath {
  /*

    chunkRegionId: {
      chunkRegion:
      distance:
      nextChunkRegion:
    }

  */
  constructor(pathFinder, targetChunkRegion) {
    this.id = "crp_" + targetChunkRegion.getChunkRowCol() + "_" + pathFinder.game.generateId("chunk_region_path")

    this.pathFinder = pathFinder
    this.game = pathFinder.game
    this.targetChunkRegion = targetChunkRegion
    this.nodes = {}
    this.tails = {}

    this.register()
  }

  register() {
    this.pathFinder.chunkRegionPaths[this.targetChunkRegion.getId()] = this
  }

  unregister() {
    delete this.pathFinder.chunkRegionPaths[this.targetChunkRegion.getId()]
  }

  remove() {
    this.unregister()
  }

  hasChunkRegion(chunkRegion) {
    return this.nodes[chunkRegion.getId()]
  }

  hasExistingPath(sourceChunkRegion, destinationChunkRegion) {
    let destinationNode = this.nodes[destinationChunkRegion.getId()]
    let sourceNode = this.nodes[sourceChunkRegion.getId()]

    if (!destinationNode) return false
    if (!sourceNode) return false
    if (destinationNode.distance > sourceNode.distance) return false // backwards (perhaps use double linkedlist in future, and traverse backwards?)

    return this.isTraversable(sourceNode, destinationNode)
  }

  isTraversable(sourceNode, destinationNode) {
    let result = false
    let current = sourceNode
    let hasMoved = false

    while (current) {
      if (hasMoved && current == destinationNode) {
        result = true
        break
      }

      if (!current.nextChunkRegion) {
        current = null
      } else {
        current = this.nodes[current.nextChunkRegion.getId()]
      }

      hasMoved = true
    }

    return result
  }

  getPaths() {
    let paths = {}

    for (let chunkRegionId in this.tails) {
      let node = this.tails[chunkRegionId]
      paths[node.chunkRegion.getId()] = []
      this.traverse(node, (chunkRegion) => {
        paths[node.chunkRegion.getId()].push(chunkRegion)
      })
    }

    return paths
  }

  getNodesEnterableFromSky() {
    let result = {}

    for (let chunkRegionId in this.nodes) {
      let node = this.nodes[chunkRegionId]
      let isEnterableFromSky = node.chunkRegion.hasGroundSkyEdge() ||
                               node.chunkRegion.canBeEnteredFromSpace()

      if (isEnterableFromSky) {
        result[node.chunkRegion.getId()] = node.chunkRegion
      }
    }

    return Object.values(result)
  }

  getNodesEnterableFromLand() {
    let result = {}

    for (let chunkRegionId in this.nodes) {
      let node = this.nodes[chunkRegionId]
      let isEnterableFromLand = node.chunkRegion.hasGroundEdge() ||
                                node.chunkRegion.canBeEnteredFromSpace()

      if (isEnterableFromLand) {
        result[node.chunkRegion.getId()] = node.chunkRegion
      }
    }

    return Object.values(result)
  }

  addNode(node) {
    this.nodes[node.chunkRegion.getId()] = node

    if (this.isTraversable(node, node)) {
      this.game.captureException(new Error("chunkRegionPath cycle detected"))
    }
  }

  addTail(node) {
    this.tails[node.chunkRegion.getId()] = node
  }

  getNextChunkRegion(chunkRegion) {
    let node = this.nodes[chunkRegion.getId()]
    if (!node) return null
    return node.nextChunkRegion
  }

  getFarthestNonHomeAreaChunkRegionNodes() {
    return this.getFarthestChunkRegionNodesWithCondition((chunkRegion) => {
      return !chunkRegion.isHomeArea()
    })
  }

  getFarthestChunkRegionNodes() {
    return this.getFarthestChunkRegionNodesWithCondition((chunkRegion) => {
      return true
    })
  }

  getFarthestChunkRegionNodesWithCondition(conditionCallback) {
    let results = []

    for (let chunkRegionId in this.tails) {
      let node = this.tails[chunkRegionId]
      let targetNode = this.traverseUntil(node, conditionCallback)
      if (targetNode) {
        results.push(targetNode)
      }
    }

    return results
  }

  traverse(node, cb) {
    let current = node

    while (current) {
      cb(current.chunkRegion)

      if (!current.nextChunkRegion) {
        break
      }

      current = this.nodes[current.nextChunkRegion.getId()]
    }
  }

  traverseUntil(node, conditionCallback) {
    let current = node
    let result = null

    while (current) {
      if (conditionCallback(current.chunkRegion)) {
        result = current
        break
      }

      if (!current.nextChunkRegion) {
        break
      }

      current = this.nodes[current.nextChunkRegion.getId()]
    }

    return result
  }

  finish() {
  }

  getId() {
    return this.id
  }

  toJson() {
    let json = []

    for (let chunkRegionId in this.nodes) {
      let node = this.nodes[chunkRegionId]
      json.push({ chunkRegionId: chunkRegionId, distance: node.distance  })
    }

    return { id: this.getId(), nodes: json }
  }

}

module.exports = ChunkRegionPath
