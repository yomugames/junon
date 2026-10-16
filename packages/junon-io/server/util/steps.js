// Runs long, synchronous work written as a generator function whose every
// `yield` is a safe pause point and carries the fraction done (0 to 1).
// Steps.run drains it at once, as plain code would. Steps.runInSlices runs it
// in slices of the event loop, so the server keeps answering requests (e.g.
// the local menu asking how far a new world has got) during a long job.
const Steps = {
  run(steps) {
    for (let fraction of steps) {} // eslint-disable-line no-unused-vars
  },

  async runInSlices(steps, onProgress, sliceMs = 50) {
    let sliceStart = Date.now()

    for (let fraction of steps) {
      if (Date.now() - sliceStart < sliceMs) continue

      if (onProgress) onProgress(fraction)
      await new Promise((resolve) => setImmediate(resolve))
      sliceStart = Date.now()
    }

    if (onProgress) onProgress(1)
  },

  // yields `weight` of the outer progress for each fraction a step yields,
  // starting at `start`
  *weighted(steps, start, weight) {
    for (let fraction of steps) {
      yield start + weight * Math.min(1, fraction)
    }
  }
}

module.exports = Steps
