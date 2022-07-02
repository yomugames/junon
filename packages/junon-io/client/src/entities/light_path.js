const Path = require("./path")
const LightPathLocation = require("./light_path_location")

class LightPath extends Path {

  show(data) {
    if (this.sprite) {
      this.removeSelfAndChildrens(this.sprite)
    }

    for (let key in data) {
      this.data[key] = data[key]
    }

    this.buildSprites()
  }

  hide() {
    if (this.sprite) {
      this.removeSelfAndChildrens(this.sprite)
    }
  }

  shouldShowDirection() {
    return false
  }

  getPathLocationKlass() {
    return LightPathLocation  
  }

  getBaseSprite() {
    let sprite = super.getBaseSprite()
    sprite.tint = 0xffb6b6
    return sprite
  }

  getGroup() {
    return "light_paths"
  }

}

module.exports = LightPath