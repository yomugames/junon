const LOG = require('junon-common/logger')

class GameLoop {

  constructor() {
    this.aveTimeMs = {}
    this.previousTickMap = {}
  }

  // http://timetocode.tumblr.com/post/71512510386/an-accurate-nodejs-game-loop-inbetween-settimeout
  smartSetInterval(callback, tickLengthMs, callbackName) {
    const _this = this
    const now = Date.now()

    if (!(callbackName in this.previousTickMap)) {
      this.previousTickMap[callbackName] = now
    }
    let previousTick = this.previousTickMap[callbackName]
    if (previousTick + tickLengthMs <= now) {
      previousTick = now
      this.previousTickMap[callbackName] = previousTick
      callback()
    }
    const elapsedMs = Date.now() - previousTick
    if (elapsedMs < tickLengthMs - 16) {
      setTimeout(() => {
        _this.smartSetInterval(callback, tickLengthMs, callbackName)
      })
    } else {
      setImmediate(() => {
        _this.smartSetInterval(callback, tickLengthMs, callbackName)
      })
    }
  }

  loopAndProfile(callback, intervalMs, callbackName) {
    const _this = this
    let tick = 0
    let n = 0; // num of averaged values
    _this.aveTimeMs[callbackName] = 0

    _this.smartSetInterval(() => {
      LOG.debug("**" + callbackName + "**")
      const hrstart = process.hrtime()
      callback()
      const hrend = process.hrtime(hrstart)
      const diffMs = hrend[1] * 1.0 / 1000000
      _this.aveTimeMs[callbackName] = computeCMA(_this.aveTimeMs[callbackName], diffMs, n)

      if (++tick % 5 === 0) {
        LOG.debug(callbackName + " recent aveMs=" + _this.aveTimeMs[callbackName] + " ms")
        _this.aveTimeMs[callbackName] = 0
        n = 0
      }
    }, intervalMs, callbackName)
  }

  // cumulative moving average
  // https://en.wikipedia.org/wiki/Moving_average
  computeCMA(cmaCurr, newValue, n) {
    return cmaCurr + (newValue - cmaCurr) * 1.0 / (n + 1)
  }


}

module.exports = GameLoop
