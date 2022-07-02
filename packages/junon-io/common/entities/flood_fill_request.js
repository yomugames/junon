class FloodFillRequest {
  constructor(manager, row, col, options = {}) {
    this.manager = manager
    this.caller  = options.caller || this.manager
    this.sourceEntity = options.sourceEntity
    this.shouldCalculateDistance = options.shouldCalculateDistance
    this.shouldTrackPreviousEntity = options.shouldTrackPreviousEntity
    this.shouldStopFunc = options.shouldStop || this.manager.shouldStop.bind(this.manager)
    this.includeStopIdentifier = options.includeStopIdentifier || (this.manager.includeStopIdentifier && this.manager.includeStopIdentifier.bind(this.manager))
    this.additionalTargets = options.additionalTargets
    this.shouldRevisit = options.shouldRevisit

    // beginning position
    this.id = [row, col].join("-")
    this.name = this.manager.name + "_request"

    this.row = row
    this.col = col

    this.isCanceled  = false
    this.isCompleted = false
    this.target   = this.manager.getCell(row, col)

    if (this.shouldCalculateDistance) {
      this.target.distance = 0
    }
    
    this.visited = {}

    this.frontier = [this.target]
    this.visited[this.manager.getCellKey(this.target)] = true

    if (this.additionalTargets) {
      this.additionalTargets.forEach((target) => {
        target.distance = 0
        this.frontier.push(target)
        this.visited[this.manager.getCellKey(target)] = true
      }) 
    }
  }

  perform() {
    let maxDuration = 60 * 1000
    let elapsed = this.performAsync(maxDuration) // synchronoulsy let it complete
  }

  cancel() {
    this.isCanceled = true
  }

  isCompletedOrCanceled() {
    return this.isCompleted || this.isCanceled
  }

  isHitOrigin(hit) {
    if (hit.entity && !hit.entity.hasCategory('partially_passable')) {
      // some structures 3x3 have origin at middle, we want its neighbors (which is still itself)
      // to be treated as an origin
      return hit.entity === this.target.entity
    } else {
      return hit === this.target
    }
  }

  performAsync(maxDuration) {
    let startTime = Date.now()
    let elapsed = 0
    let visitCount = 0

    if (!this.caller.shouldStart(this.target)) {
      this.isCompleted = true

      if (this.onHaltCallback) {
        this.onHaltCallback(this.target)
        return
      }
    }

    while (this.frontier.length > 0 && elapsed < maxDuration) {
      let visitTime = Date.now()
      let current = this.frontier.shift()
      let isOrigin = this.isHitOrigin(current) 

      let neighbors = this.manager.getNeighbors(current.row, current.col)

      let currentKey = [current.row, current.col].join(",")

      if (!isOrigin && this.shouldStopFunc(current, neighbors, this.target, this.sourceEntity)) {
        if (this.includeStopIdentifier && this.includeStopIdentifier(current)) {
          if (this.onUpdateCallback) {
            this.onUpdateCallback(current, neighbors)
          }
        } else if (this.shouldRevisit && this.shouldRevisit(current)) {
          delete this.visited[this.manager.getCellKey(current)]
        }

        continue
      }

      if (this.onUpdateCallback) {
        this.onUpdateCallback(current, neighbors)
      }

      for (var i = 0; i < neighbors.length; i++) {
        let hit = neighbors[i]
        
        if (!this.visited[this.manager.getCellKey(hit)]) {
          if (this.shouldCalculateDistance) {
            hit.distance = current.distance + 1
          }

          if (this.shouldTrackPreviousEntity) {
            hit.previousEntity = current.entity
          }

          this.frontier.push(hit)
          this.visited[this.manager.getCellKey(hit)] = true
        }
      }


      visitCount += 1
      let duration = (Date.now() - visitTime)
      elapsed += duration
    }

    if (this.frontier.length === 0) {
      let preCallbackTime = Date.now()

      this.isCompleted = true

      if (this.onCompleteCallback) {
        this.onCompleteCallback(this.target)
      }

      let duration = (Date.now() - preCallbackTime)
      elapsed += duration
    }

    // if (debugMode) {
    //   console.log([this.row, this.col].join(",") + " " + this.name + " @ " + visitCount + " visits took: " + elapsed + "ms")
    // }
    

    return elapsed
  }

  onHalt(callback) {
    this.onHaltCallback = callback
  }

  onUpdate(callback) {
    this.onUpdateCallback = callback
  }

  onComplete(callback) {
    this.onCompleteCallback = callback
  }

}


module.exports = FloodFillRequest