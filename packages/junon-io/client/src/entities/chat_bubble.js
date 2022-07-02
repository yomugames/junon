const ClientHelper = require("./../util/client_helper")

class ChatBubble {
  constructor(options = {}) {
    this.entity = options.entity

    let text = options.text
    let spriteContainer = options.entity.sprite
    let sector = options.entity.sector

    let container = new PIXI.Container()
    container.name = "SpeechBubble"

    let sprite = new PIXI.Text(text, {fontFamily: "Arial", fontSize: 18, align: "left", fill : 0xcccccc, wordWrapWidth: 250, wordWrap: true })
    sprite.name = "text"

    this.textSprite = sprite

    let backgroundPadding = 10
    const graphics = new PIXI.Graphics()
    graphics.name = "SpeechBackground"
    graphics.beginFill(0x000000)
    // graphics.lineStyle(2, 0x000000, 1)
    graphics.drawRoundedRect(-backgroundPadding, -backgroundPadding/2, sprite.width + backgroundPadding * 2, sprite.height + backgroundPadding, 5)
    graphics.endFill()
    graphics.alpha = 0.8

    container.addChild(graphics)
    container.addChild(sprite)

    let margin = 20
    let x = -sprite.width/2
    let y = -sprite.height/2 - margin - (player.getHeight())

    container.position.x = x
    container.position.y = y

    this.chatBubbleContainer = container

    if (options.isAbsolutePosition) {
      container.position.x += spriteContainer.position.x
      container.position.y += spriteContainer.position.y
      
      sector.effectsContainer.addChild(container)
    } else {
      spriteContainer.addChild(container)
    }
  } 

  remove() {
    this.isRemoved = true
    this.entity.chatBubble = null
    clearTimeout(this.removeChatBubbleTimeout)
    this.textSprite.destroy() 
    ClientHelper.removeSelfAndChildrens(this.chatBubbleContainer)
  }

  delayedRemove(timeout) {
    clearTimeout(this.removeChatBubbleTimeout)

    this.removeChatBubbleTimeout = setTimeout(() => {
      this.remove()
      this.removeChatBubbleTimeout = null
    }, timeout)
  }

}

module.exports = ChatBubble


