class FloodFillQueue {

  constructor() {
    this.queue = []
  }

  getQueue() {
    return this.queue
  }

  executeTurn() {
    let queue = this.getQueue()
    let maxDuration = 20 // 20ms
    let elapsed = 0

    while (queue.length > 0 && elapsed < maxDuration) {
      let floodFillRequest = queue[0]
      if (floodFillRequest.isCompletedOrCanceled()) {
        queue.shift()
      } else {
        let duration = floodFillRequest.performAsync(maxDuration)
        elapsed += duration
      }
    }
  }
}

module.exports = FloodFillQueue