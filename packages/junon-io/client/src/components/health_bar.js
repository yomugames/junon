const BitmapText = require("../util/bitmap_text")

class HealthBar {
  constructor(entity, options = {}) {
    this.width = 50
    this.height = 6
    this.border = 2
    this.margin = 10

    this.entity = entity
    this.sprite = this.getSprite(options)
    this.sprite.alpha = 0

    if (options.attribute) {
      this.attribute = options.attribute
      this.maxAttribute = options.maxAttribute
    }

    if (options.isFixedPosition) {
      this.entity.game.sector.effectsContainer.addChild(this.sprite)
      this.sprite.position.x += this.entity.getX()
      this.sprite.position.y += this.entity.getY()
    } else {
      this.entity.sprite.addChild(this.sprite)
    }

    this.entity.sector.registerBar(this)
  }

  getSprite(options) {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["health_bar_background.png"])
    sprite.name = this.getMeterAttribute() + "_bar"

    if (options.displayOnTop) {
      sprite.position.y = -((this.entity.getHeight() / 2) + this.margin)
    } else {
      sprite.position.y = (this.entity.getHeight() / 2) + this.margin
    }
    
    sprite.position.x = -this.width / 2

    this.barFill = new PIXI.Sprite(this.getBarFillTexture())
    this.barFill.name = this.getMeterAttribute() + "_bar_fill"

    sprite.addChild(this.barFill)

    return sprite
  }

  getMeterAttribute() {
    return this.attribute || "health"
  }

  getMeterMaxAttribute() {
    return this.maxAttribute || "getMaxHealth"
  }

  getBarFillTexture() {
    return PIXI.utils.TextureCache["health_bar_fill.png"]
  }

  drawMeter() {
    const width = this.width * (this.entity[this.getMeterAttribute()] / this.entity[this.getMeterMaxAttribute()]())
    this.barFill.width = width
  }


  draw() {
    this.drawMeter()
    this.display()
  }

  // dynamically create bar and remove after 
  // use for tiles where bar display is rare
  static draw(entity, options = {}) {
    let bar = entity.sector.getBar(entity)
    if (!bar) {
      bar = new this(entity, options)
    }

    bar.drawAndRemove()
  }

  drawAndRemove() {
    this.drawMeter()
    clearTimeout(this.removeTimeout)

    this.sprite.alpha = 1

    this.removeTimeout = setTimeout(() => {
      this.remove()
    }, 3000)
  }

  remove() {
    this.entity.sector.unregisterBar(this)

    this.sprite.removeChild(this.barFill)    
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite)
    }
  }

  hide() {
    this.sprite.alpha = 0
  }

  display() {
    clearTimeout(this.hideTimeout)

    this.sprite.alpha = 1

    this.hideTimeout = setTimeout(() => {
      this.sprite.alpha = 0
    }, 3000)
  }

  showHealthIncreased(amount) {
    const duration = 500
    const yLength  = 50

    const healthText = BitmapText.create({
      label: "Health",
      text: amount,
      size: 40,
      spriteContainer: this.entity.game.sector.effectsContainer
    })

    healthText.sprite.tint = 0x16d016

    let dimensions = {
      x: this.entity.getX(),
      y: this.entity.getY() - this.entity.getHeight(),
      size: 64
    }

    healthText.sprite.position.set(dimensions.x, dimensions.y)

    new TWEEN.Tween(dimensions) 
        .to({ x: dimensions.x, y: dimensions.y - yLength, size: 32 }, duration) 
        .easing(TWEEN.Easing.Quadratic.Out) 
        .onUpdate(() => { 
          healthText.sprite.position.y = dimensions.y
        })
        .onComplete(() => {
          healthText.remove()
        }) 
        .start()
 
  }

  showDamageTaken(amount) {
    this.constructor.showDamageTaken(this.entity, amount)
  }

  static showDamageTaken(entity, amount) {
    const duration = 500
    const yLength  = 50

    const healthText = BitmapText.create({
      label: "Health",
      text: amount,
      size: 40,
      spriteContainer: entity.game.sector.effectsContainer
    })

    healthText.sprite.tint = 0xff0000

    let dimensions = {
      x: entity.getX(),
      y: entity.getY() - entity.getHeight(),
      size: 64
    }

    healthText.sprite.position.set(dimensions.x, dimensions.y)

    new TWEEN.Tween(dimensions) 
        .to({ x: dimensions.x, y: dimensions.y - yLength, size: 32 }, duration) 
        .easing(TWEEN.Easing.Quadratic.Out) 
        .onUpdate(() => { 
          healthText.sprite.position.y = dimensions.y
          // sprite.width  = dimensions.size + 20
          // sprite.height = dimensions.size
        })
        .onComplete(() => {
          healthText.remove()
        }) 
        .start()

  }


}

module.exports = HealthBar