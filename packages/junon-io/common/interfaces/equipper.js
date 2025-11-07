const Constants = require("./../constants")
const Protocol = require("./../util/protocol")

const Equipper = () => {
}

Equipper.prototype = {
  initEquipper() {
    this.equipments = {}
  },
  getDefaultSpriteColor() {
    throw new Error("must implement Equipper#getDefaultSpriteColor")
  },
  getBodySpriteTint() {
    return 0xd2b48c
  },
  getSingleHandPosition() {
    return 20
  },
  getEquipperBodySpritePath() {
    return "player_body.png"
  },
  setDefaultTint(sprite, tint) {
    sprite.defaultTint = tint
    sprite.tint = tint
  },
  getTintableSprites() {
    let sprites = [this.body, this.hands, this.rightHand, this.leftHand]

    let armorEquipment = this.getArmorEquipment()
    if (armorEquipment) {
      sprites.push(armorEquipment.sprite)
    }

    return sprites
  },
  getCharacterSprite() {
    const sprite = new PIXI.Container()
    sprite.name = "Character"
    sprite.pivot.x = this.getDisplayWidth() / 2
    sprite.pivot.y = this.getDisplayWidth() / 2

    this.handContainer = new PIXI.Container()
    /*       
      pivot is at top-left by default. rotating around there.
      we have left  hand at upper y, we have right hand at lower y
      must rotate around middle of y, and maintain left edge x
    */
    this.handContainer.pivot.y = 20
    // pivot change above will also shift the sprite up, so compensate by moving sprite position down
    this.handContainer.position.y = 20
    // move the hands forward so it can be more visible
    this.handContainer.position.x = 15
    this.handContainer.name = "HandContainer"

    // body
    this.body   = new PIXI.Sprite(PIXI.utils.TextureCache[this.getEquipperBodySpritePath()])
    this.body.name = "Body"
    this.body.width = this.getBodyWidth()
    this.body.height = this.getBodyHeight()
    this.body.position.x = this.getBodyPositionX()
    this.body.position.y = this.getBodyPositionY()

    // both hands
    this.hands  = new PIXI.Sprite(PIXI.utils.TextureCache["player_hands.png"])
    this.hands.name = "Hands"
    this.hands.width = this.hands.height = this.getDisplayWidth()

    // left hand
    this.leftHand  = new PIXI.Sprite(PIXI.utils.TextureCache["player_hands_single.png"])
    this.leftHand.name = "LeftHand"
    this.leftHand.alpha = 0
    this.leftHand.width = this.leftHand.height = Constants.tileSize/2
    this.leftHand.position.x = this.getSingleHandPosition()

    // right hand
    this.rightHand  = new PIXI.Sprite(PIXI.utils.TextureCache["player_hands_single.png"])
    this.rightHand.name = "RightHand"
    this.rightHand.alpha = 0
    this.rightHand.width = this.rightHand.height = Constants.tileSize/2
    this.rightHand.position.x = this.getSingleHandPosition()
    this.rightHand.position.y = 24

    // tint
    this.setDefaultTint(this.hands, this.getDefaultSpriteColor())
    this.setDefaultTint(this.leftHand, this.getDefaultSpriteColor())
    this.setDefaultTint(this.rightHand, this.getDefaultSpriteColor())
    this.setDefaultTint(this.body, this.getBodySpriteTint())
// equipments
    this.handEquipContainer = new PIXI.Container()
    this.handEquipContainer.name = "HandEquipment"
    this.handEquipContainer.position.x = -15

    this.armorEquipContainer = new PIXI.Container()
    this.armorEquipContainer.name = "ArmorEquipment"

    this.handContainer.addChild(this.handEquipContainer)
    this.handContainer.addChild(this.hands)
    this.handContainer.addChild(this.leftHand)
    this.handContainer.addChild(this.rightHand)

    sprite.addChild(this.handContainer)
    sprite.addChild(this.body)
    sprite.addChild(this.armorEquipContainer)

    // hat
    // piece of code is used only with visitors. If you add functionality with players, you'll need to change this
    if(!this.getConstants().hat) return sprite;

    this.hatSpritePath = this.selectRandomHatSpritePath()
    this.hat = new PIXI.Sprite(PIXI.utils.TextureCache[this.hatSpritePath])
    this.hat.name = "Hat"
    this.hat.rotation = -90 * (Math.PI / 180)
    let constants = this.getConstants().hat.armorOn[this.hatSpritePath.replace(".png", "")]
    if(constants) {
      this.hat.x = constants.x 
      this.hat.y = constants.y
      this.hat.width = this.hat.height = constants.size
    }

    sprite.addChild(this.hat)
    
    return sprite
  },

  onAttackStateChanged() {
    if (this.isAttacking) {
      // start attacking
      const handEquipment = this.equipments[Protocol.definition().EquipmentRole.Hand]
      if (handEquipment ) {
        if (handEquipment.isAnimatable()) {
          this.animateHands(handEquipment)
        }
      } else {
        this.animateHands() // bare hands
      }
    } else {
    }
  },

  animateEquipment() {
    const handEquipment = this.getHandEquipment()
    if (handEquipment && handEquipment.isAnimatable()) {
      handEquipment.animate()
      handEquipment.playSound()
    } else if(!handEquipment) {
      this.animateHands()
    }
  },

  stopEquipmentAnimation() {
    const handEquipment = this.getHandEquipment()
    if (handEquipment && handEquipment.isAnimatable()) {
      handEquipment.stopAnimation()
    } else {
      if (this.handAnimationTween) {
        this.handAnimationTween.stop()
        this.handAnimationTween = null
      }
    }
  },

  animateHands(handEquipment) {
    this.handAnimationTween = this.getPunchAnimationTween()
    this.handAnimationTween.start()
  },

  hideLeftRightHands() {
    this.leftHand.alpha = 0
    this.rightHand.alpha = 0

    this.hands.alpha = 1
  },

  resetHands() {
    this.leftHand.position.x = this.getSingleHandPosition()
    this.leftHand.position.y = 0
    this.rightHand.position.x = this.getSingleHandPosition()
    this.rightHand.position.y = 24
  },

  getPunchAnimationTween() {
    this.hands.alpha = 0
    this.leftHand.alpha = 1
    this.rightHand.alpha = 1

    let hand = Math.random() < 0.5 ? this.leftHand : this.rightHand

    let orig = { x: hand.position.x, y: hand.position.y }
    let position = { x: orig.x, y: orig.y }
    let target = { x: orig.x + Constants.tileSize, y: 12 }

    const tween = new TWEEN.Tween(position)
        .to(target, 200)
        .onUpdate(() => {
          hand.position.x = position.x
          hand.position.y = position.y
        })
        .onComplete(() => {
          this.resetHands()

          if (this.hideLeftRightTimeout) {
            clearTimeout(this.hideLeftRightTimeout)  
          }
          this.hideLeftRightTimeout = setTimeout(this.hideLeftRightHands.bind(this), 1000)
        })

    return tween
  },

  getArmorEquip() {
    return this.getArmorEquipment()
  },

  getArmorEquipment() {
    return this.equipments[Protocol.definition().EquipmentRole.Armor]
  },

  setArmorEquipment(equipment) {
    this.equipments[Protocol.definition().EquipmentRole.Armor] = equipment
  },

  getHandEquipment() {
    return this.equipments[Protocol.definition().EquipmentRole.Hand]
  },

  setHandEquipment(equipment) {
    this.equipments[Protocol.definition().EquipmentRole.Hand] = equipment
  },

  removeEquipments() {
    for (let index in this.equipments) {
      let equipment = this.equipments[index]
      equipment.remove()
      delete this.equipments[index]
    }
  },

  getBodyWidth() {
    return this.getDisplayWidth()
  },

  getBodyHeight() {
    return this.getDisplayWidth()
  },

  getBodyPositionX() {
    return 0
  },

  getBodyPositionY() {
    return 0
  }

}

module.exports = Equipper

