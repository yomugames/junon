const Statuses = require("./statuses/index")
const Helper = require("./../../../common/helper")

class StatusManager {
  constructor(entity) {
    this.entity = entity
    this.game = this.entity.game

    this.statusSprites = {}
    this.statuses = {}
    this.STATUS_EFFECT_LIST = ["poison", "oxygen", "hunger", "thirst", "stamina", "fear", "rage", "paralyze", "drunk", "miasma"]

    this.createStatusContainer()
  }

  cleanup() {
    if (this.statusEffectTween) {
      this.statusEffectTween.stop()
    }

    if (this.multipleStatusTween) {
      this.multipleStatusTween.stop()
    }

  }

  update() {
    let seconds = parseInt(this.game.lastFrameTime / 1000)  
    let isThreeSecondInterval = seconds % 3 === 0
    if (!isThreeSecondInterval) return

    if (this.isStatusDisplaying) return

    for (let statusName in this.statuses) {
      let status = this.statuses[statusName]
      let canShowStatus = this.game.lastFrameTime - status.getLastShownTime() > (25 * 1000)
      if (canShowStatus) {
        this.showStatusEffect(statusName)
      }
    }
  }

  createStatusContainer() {
    this.statusContainer = this.getStatusContainerSprite()

    this.entity.sprite.addChild(this.statusContainer)
  }

  addStatus(statusName) {
    if (this.STATUS_EFFECT_LIST.indexOf(statusName) === -1) return

    if (!this.statuses[statusName]) {
      this.statuses[statusName] = true

      let klass = Statuses[Helper.capitalize(statusName)]
      let statusInstance = new klass(this)

      this.statuses[statusName] = statusInstance

      this.showStatusEffect(statusName)

      if (this.entity.isPlayer() && this.entity.isMe()) {
        this.entity.displayLowStatusWarning(statusName)
      }
    }
  }

  removeStatus(statusName) {
    if (!this.statuses[statusName]) return

    this.statuses[statusName].remove() 
    delete this.statuses[statusName]
  }

  addStatusSprite(statusName, sprite) {
    this.statusSprites[statusName] = sprite
  }

  removeStatusSprite(statusName, sprite) {
    delete this.statusSprites[statusName] 
  }

  getStatusContainerSprite() {
    let sprite = new PIXI.Container()
    sprite.name = "StatusEffects"
    sprite.position.y = -60
    sprite.position.x = this.entity.getWidth()/2
    sprite.alpha = 0
    sprite.pivot.x = 20
    sprite.pivot.y = 20

    this.statusBackground = new PIXI.Sprite(PIXI.utils.TextureCache["status_container.png"])
    this.statusBackground.name = "StatusBackground"
    sprite.addChild(this.statusBackground)

    return sprite
  }

  showStatusEffect(statusName) {
    if (this.isStatusDisplaying) return

    this.statusEffectTween = this.getStatusEffectTween(statusName)
    this.statusEffectTween.start()
  }

  hideStatusEffect() {
    this.statusContainer.alpha = 0

    if (this.statusEffectTween) {
      this.statusEffectTween.stop()
      this.statusEffectTween = null
    }

    if (this.multipleStatusTween) {
      this.multipleStatusTween.stop()
      this.multipleStatusTween = null
    }
  }

  getMultipleStatusEffectTween() {
    let statusSpriteList =  Object.values(this.statusSprites)
    this.multipleStatusIndex = this.multipleStatusIndex || 0

    // start with every sprite set to alpha 0 except first one
    statusSpriteList.forEach((sprite) => {
      sprite.alpha = 0
    })

    statusSpriteList[0].alpha = 1

    // cycle visibility of sprites
    let toggle = { toggle: 0 }

    return new TWEEN.Tween(toggle)
        .to({ toggle: 1 }, 2000)
        .onUpdate(() => {
          try {
            statusSpriteList = Object.values(this.statusSprites) // make sure to fetch updated sprites

            if (toggle.toggle === 1) {
              if (this.multipleStatusIndex > statusSpriteList.length - 1) {
                this.multipleStatusIndex = 0
              }

              let statusSprite = statusSpriteList[this.multipleStatusIndex]
              statusSprite.alpha = 0

              this.multipleStatusIndex += 1

              if (this.multipleStatusIndex > statusSpriteList.length - 1) {
                this.multipleStatusIndex = 0
              }

              statusSpriteList[this.multipleStatusIndex].alpha = 1
            }
          } catch(e) {
            console.log(e)
          }
        })
        .repeat(Infinity)
  }

  getStatusEffectTween(statusName) {
    const status = this.statuses[statusName]
    status.touch()
    this.statusContainer.addChild(status.sprite)

    this.isStatusDisplaying = true
    this.statusContainer.alpha = 1

    const origY = this.statusContainer.position.y
    let scale = { scale: 0 }
    let alpha = { alpha: 1 }

    const appearTween = new TWEEN.Tween(scale)
        .to({ scale: 0.8  }, 200)
        .onUpdate(() => {
          this.statusContainer.scale.set(scale.scale)
        })

    var delayTween = new TWEEN.Tween({ x: 0 })
        .to({ x: 1 }, 4000)

    const fadeTween = new TWEEN.Tween(alpha)
        .to({ alpha: 0 }, 1000)
        .onUpdate(() => {
          this.statusContainer.alpha = alpha.alpha
        })
        .onComplete(() => {
          this.isStatusDisplaying = false
          this.statusContainer.removeChild(status.sprite)
        })

    appearTween.chain(delayTween)
    delayTween.chain(fadeTween)

    return appearTween
  }


}

module.exports = StatusManager