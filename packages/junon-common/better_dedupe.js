class BetterDedupe {

  constructor() {
    this.name = "BetterDedupe"
    this.pastMessages = {}
    this.pastFingerprintHashes = {}
    this.pastStacktraceHashes  = {}
  }

  setupOnce(addGlobalEventProcessor, getCurrentHub) {
    addGlobalEventProcessor((event) => {
      const self = getCurrentHub().getIntegration(BetterDedupe);
      if (self) {
        if (self._shouldDropEvent(event)) {
          return null
        }
        this.registerEvent(event)
      }

      return event
    });
  }

  registerEvent(event) {
    try {
      if (event.message) {
        this.pastMessages[event.message] = event
      }
      
      this.pastFingerprintHashes[this.getFingerprintHash(event)] = event
      this.pastStacktraceHashes[this.getStacktraceHash(event)] = event
    } catch(e) {

    }
  }

  _shouldDropEvent(event) {
    try {
      let isMessageEvent = event.message
      if (isMessageEvent && !this._hasPastMessage(event)) {
        return false
      }

      if (!this._hasPastFingerprint(event)) {
        return false
      }

      if (!this._hasPastStacktrace(event)) {
        return false
      }

      return true
    } catch(e) {
      return false
    }
  }

  getFingerprintHash(event) {
    if (!event.fingerprint) return ""

    return event.fingerprint.join('')
  }

  getStacktraceHash(event) {
    if (!event.exception) return "" 
    if (!event.exception.values) return "" 

    let frames = this._getFramesFromEvent(event)
    if (!frames) return ""

    let stringifiedFrames = frames.map((frame) => {
      return [frame.filename, frame.lineno, frame.colno, frame.function.toString()].join("-")
    }).join("\n")

    return this.hashCode(stringifiedFrames)
  }

  // https://stackoverflow.com/a/7616484
  hashCode(string) {
    let hash = 0, i, chr
    if (string.length === 0) return hash
    for (i = 0; i < string.length; i++) {
      chr   = string.charCodeAt(i)
      hash  = ((hash << 5) - hash) + chr
      hash |= 0 // Convert to 32bit integer
    }
    return hash
  }

  _hasPastMessage(event) {
    return !!this.pastMessages[event.message]
  }

  _hasPastFingerprint(event) {
    return !!this.pastFingerprintHashes[this.getFingerprintHash(event)]
  }

  _hasPastStacktrace(event) {
    return !!this.pastStacktraceHashes[this.getStacktraceHash(event)]
  }
  
  _getFramesFromEvent(event) {
    const exception = event.exception

    if (exception) {
      try {
        // @ts-ignore
        return exception.values[0].stacktrace.frames
      } catch (e) {
        return undefined
      }
    } else if (event.stacktrace) {
      return event.stacktrace.frames
    }
    return undefined;
  }


}

BetterDedupe.id = "BetterDedupe"

module.exports = BetterDedupe