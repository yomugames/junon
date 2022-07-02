const BaseEntity = require('./base_entity')
const Constants     = require('../../../common/constants.json')
const ShipMountable = require('../../../common/interfaces/ship_mountable')
const Mobs = require("./mobs/index")
const SpriteEventHandler = require("./../util/sprite_event_handler")
const ClientHelper = require("./../util/client_helper")
const BitmapText = require("../util/bitmap_text")


class Corpse extends BaseEntity {
  constructor(game, data) {
    super(game, data)

    this.type = data.type
    this.angle = data.angle
    this.chunks = {}

    this.name = data.name
    if (this.name) {
      this.createUsernameSprite(this.sprite)
    }

    this.onCorpseConstructed()
  }

  isCorpse() {
    return true
  }

  getName() {
    return this.name
  }

  createUsernameSprite(container) {
    this.usernameText = BitmapText.create({
      label: "UsernameText",
      text: this.getName(),
      spriteContainer: container
    })

    const margin = this.getHeight()

    this.usernameText.sprite.position.y = margin
  }

  onMouseOver() {
    super.onMouseOver()

    this.game.highlight(this)
    this.game.showEntityMenu(this)
  }

  onMouseOut() {
    super.onMouseOut()

    this.game.unhighlight(this)
    this.game.hideEntityMenu(this)
  }

  getTypeName() {
    return Mobs.forType(this.type).getTypeName() +  " Corpse"
  }

  onCorpseConstructed() {
    this.repositionOnCorpseMap()
    if (this.getChunk()) {
      this.getChunk().register("corpses", this)
    }
  }

  getChunk() {
    return this.sector.getChunk(this.getChunkRow(), this.getChunkCol())
  }

  getType() {
    return this.type
  }

  getConstantsTable() {
    return "Corpse"
  }

  getGroup() {
    return "corpses"
  }

  onPositionChanged() {
    this.registerToChunk()
    this.repositionOnCorpseMap()
  }

  remove() {
    if (this.usernameText) {
      this.usernameText.remove()
    }
    
    this.getContainer().unregisterEntity("corpses", this)

    // chunk might be null (i.e outside of game bounds..)
    if (this.getChunk()) {
      this.getChunk().unregister("corpses", this)
    } else {
      this.sector.forEachChunk((chunk) => {
        chunk.unregister("corpses", this)
      })
    }
    
    this.removeFromCorpseMap()
    super.remove()
  }

  getContainer() {
    return this.ship || this.game.sector
  }

  syncWithServer(data) {
    this.instructToMove(data.x, data.y)
    this.setEffects(data.effects)
  }

  interpolate(lastFrameTime) {
    const prev = { x: this.sprite.position.x, y: this.sprite.position.y }
    super.interpolate(lastFrameTime)
    const curr = { x: this.sprite.position.x, y: this.sprite.position.y }

    if (curr.x !== prev.x || curr.y !== prev.y) {
      this.onPositionChanged()
    }
  }

  getSpriteContainer() {
    return this.game.sector.spriteLayers["corpses"]
  }

  getSprite() {
    const sprite = new PIXI.Container()
    sprite.name = "CorpseContainer"

    const mobKlass = Mobs.forType(this.data.type)

    this.characterSprite = mobKlass.prototype.getCorpseSprite()
    const baseRotationOffset = 90 * (Math.PI / 180)

    let dizzySpriteConfig = mobKlass.prototype.getDizzySpriteConfig()
    if (Object.keys(dizzySpriteConfig).length > 0) {
      this.addDizzyEyes(this.characterSprite)
      this.dizzySprite.width  = dizzySpriteConfig.width
      this.dizzySprite.height = dizzySpriteConfig.height
      this.dizzySprite.position.x = dizzySpriteConfig.position.x
      this.dizzySprite.position.y = dizzySpriteConfig.position.y
      this.dizzySprite.rotation = dizzySpriteConfig.rotation * Math.PI / 180
      if (dizzySpriteConfig.tint) {
        this.dizzySprite.tint = ClientHelper.hexToInt(dizzySpriteConfig.tint)
      }
    }

    let radian = this.data.angle * (Math.PI / 180)
    this.characterSprite.rotation = radian + baseRotationOffset
    sprite.addChild(this.characterSprite)

    return sprite
  }


}

Object.assign(Corpse.prototype, ShipMountable.prototype, {
  getRelativeX() {
    return this.sprite.position.x
  },
  getRelativeY() {
    return this.sprite.position.y
  }
})


module.exports = Corpse
