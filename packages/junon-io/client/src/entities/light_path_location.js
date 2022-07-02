const PathLocation = require("./path_location")
const Constants = require("./../../../common/constants.json")
const SpriteEventHandler = require("./../util/sprite_event_handler")

class LightPathLocation extends PathLocation {
  
  constructor(game, data) {
    super(game, data)

    this.sprite.interactive = true
    SpriteEventHandler.on(this.sprite, "pointerdown", this.onClick.bind(this))
  }

  onClick() {
    this.game.selectEntity(this)
    this.game.showEntityMenu(this, { dontCloseMenus: true })
  }

  renderEntityMenu(entityMenu) {
    this.showLighting(this.game.sector, entityMenu)
  }

  shouldShowDirection() {
    return false
  }


}

module.exports = LightPathLocation