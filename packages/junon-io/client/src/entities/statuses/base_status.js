class BaseStatus {
  constructor() {
    this.sprite = this.getSprite()
  }

  touch() {
    this.lastShownTime = Date.now()    
  }

  getLastShownTime() {
    return this.lastShownTime
  }

  getStatusName() {
    return "oxygen"
  }

  getStatusTint() {
    return null
  }

  getSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getStatusName() + "_status.png"])
    sprite.name = this.getStatusName()

    let tint = this.getStatusTint()
    if (tint) {
      sprite.tint = tint
    }
    
    sprite.anchor.set(0)
    sprite.position.x = 12
    sprite.position.y = 8
    sprite.width = 25
    sprite.height = 25

    return sprite
  }

  getSpriteContainer() {
    return this.affectedEntity.statusContainer
  }

  remove() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite)
    }
  }
}

module.exports = BaseStatus