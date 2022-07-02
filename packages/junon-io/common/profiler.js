class Profiler {

  static start(label) {
    let start = Date.now()

    this.profiles = this.profiles || {}
    this.profiles[label] = { start: start }
  }

  static stop(label) {
    if (!this.profiles) return
    if (!this.profiles[label]) return

    this.profiles[label].stop = Date.now()

    let duration = (this.profiles[label].stop - this.profiles[label].start) / 1000
    this.profiles[label].duration = duration
  }
}

module.exports = Profiler
