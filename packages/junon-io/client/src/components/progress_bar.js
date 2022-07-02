const HealthBar = require("./health_bar")

class ProgressBar extends HealthBar {
  constructor(entity, options = {}) {
    super(entity, options)
  }

  display() {
    this.sprite.alpha = 1
  }

  getBarFillTexture() {
    return PIXI.utils.TextureCache["progress_bar_fill.png"]
  }


}

module.exports = ProgressBar