// each game has own task queue
// but queue limit will be managed by server..(no more than 15ms)

class MobTaskQueue {

  constructor(sector) {
    this.queue = []
    this.sector = sector
    this.game = sector.game
  }

  reset() {
    this.queue = []
  }

  getQueue() {
    return this.queue
  }

  executeTurn() {
    try {
      let queue = this.getQueue()

      let start = Date.now()

      let task = queue[0]
      task()
      queue.shift()

      let elapsed = Date.now() - start
      return elapsed
    } catch(e) {
      this.game.captureException(e)
      return 0
    }
  }

}

module.exports = MobTaskQueue