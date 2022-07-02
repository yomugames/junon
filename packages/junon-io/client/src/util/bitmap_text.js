const Poolable = require("../../../common/interfaces/poolable")
const ObjectPool = require("../../../common/entities/object_pool")

class BitmapText {
  static create(options) {
    let object = ObjectPool.obtain("BitmapText")
    object.setAttributes(options)
    return object
  }

  constructor() {
    const style  = { font : '23px CC Red Alert [INET]', align : 'center' }
    this.sprite = new PIXI.extras.BitmapText("", style)
    this.sprite.anchor.set(0.5)
  }

  wordWrap(text) {
    if (language === 'ja') {
      return this.wordWrapNonspaced(text)
    } else {
      return this.wordWrapSpaced(text)
    }

  }

  wordWrapSpaced(text) {
    let result = ""
    let buffer = ""

    let words = text.split(/\s+/)
    
    for (var i = 0; i < words.length; i++) {
      let word = words[i]
      buffer += word
      buffer += ' '

      if (buffer.length >= 30) {
        result += buffer
        result += "\n"
        buffer = ""
      }
    }

    result += buffer
    return result
  }

  wordWrapNonspaced(text) {
    let result = ""
    let buffer = ""

    for (var i = 0; i < text.length; i++) {
      let char = text[i]
      buffer += char
      if (buffer.length >= 15) {
        result += buffer
        result += "\n"
        buffer = ""
      }
    }

    result += buffer
    return result
  }

  setAttributes(options) {
    let spriteContainer = options.spriteContainer 
    spriteContainer.addChild(this.sprite)

    this.sprite.text = options.text
    this.sprite.name = options.label

    if (options.size) {
      this.sprite.font.size = options.size
    }

    if (options.align) {
      this.sprite.font.align = options.align
    }

    if (typeof options.anchor !== 'undefined') {
      this.sprite.anchor.set(options.anchor)
    }
    
    
    this.sprite.updateText()
  }

  remove() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite)
    }

    ObjectPool.free("BitmapText", this)
  }

}

Object.assign(BitmapText.prototype, Poolable.prototype, {
  reset() {
    this.sprite.anchor.set(0.5)
    this.sprite.position.x = 0
    this.sprite.position.y = 0
    this.sprite.alpha = 1
    this.sprite.font.size = 23
    this.sprite.tint = 0xffffff
    // not needed. every instance variable is overwritten anyway
  }
})

module.exports = BitmapText