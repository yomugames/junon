const ExceptionReporter = require("./../util/exception_reporter")

class SpriteEventHandler {
  static on(sprite, eventName, handler) {
    sprite.on(eventName, (event) => {
      try {
        handler(event)
      } catch(e) {
        ExceptionReporter.captureException(e)
      }
    })
  }
}

module.exports = SpriteEventHandler