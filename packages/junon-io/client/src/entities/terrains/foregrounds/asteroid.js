const BaseForeground = require("./base_foreground")
const Tilable  = require("./../../../../../common/interfaces/tilable")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const Helper = require("./../../../../../common/helper")
const ClientHelper = require("./../../../util/client_helper")
const Rock = require("./../grounds/rock")

class Asteroid extends BaseForeground {

  static build(game, data) {
    return new this(game, data)
  }

  // parent must implement
  getOreSpritePath() {
    return null
  }

  onBuildingConstructed() {
    super.onBuildingConstructed()
    this.drawGround()
  }

  drawGround() {
    let groundNeighbors = this.sector.groundMap.getNeighbors(this.getRow(), this.getCol())
    if (Object.keys(groundNeighbors).length > 0) {
      if (this.groundSprite) return // avoid double grounds
      let texture = Rock.getTextures()["line_four"]
      let sprite = new PIXI.Sprite(texture)
      sprite.name = "AsteroidGround"
      sprite.anchor.set(0.5)
      sprite.position.y = this.getRow() * Constants.tileSize + Constants.tileSize/2
      sprite.position.x = this.getCol() * Constants.tileSize + Constants.tileSize/2
      sprite.width  = Constants.tileSize
      sprite.height = Constants.tileSize
      this.getGroundSpriteContainer().addChild(sprite)
      this.groundSprite = sprite
    } else if (this.groundSprite) {
      this.removeGroundSprite()
    }
  }

  removeGroundSprite() {
    this.groundSprite.parent.removeChild(this.groundSprite)
    this.groundSprite = null
  }

  redrawSprite() {
    this.drawGround()
    super.redrawSprite()
  }

  getType() {
    return Protocol.definition().TerrainType.Asteroid
  }

  getConstantsTable() {
    return "Terrains.Asteroid"
  }

  remove() {
    super.remove()
    if (this.groundSprite) {
      this.removeGroundSprite()
    }
  }

  static getTextureMapping() {
    return {
      line_zero: PIXI.utils.TextureCache["asteroid_0_ridge.png"],
      line_one: PIXI.utils.TextureCache["asteroid_1_ridge.png"],
      line_two: PIXI.utils.TextureCache["asteroid_2_ridge.png"],
      line_two_straight: PIXI.utils.TextureCache["asteroid_2_straight_ridge.png"],
      line_three: PIXI.utils.TextureCache["asteroid_3_ridge.png"],
      line_four: PIXI.utils.TextureCache["asteroid_4_ridge.png"]
    }
  }

  getSpritePath() {
    return "asteroid_2_ridge.png"
  }

  onHealthReduced(delta) {
    if (this.health === 0) return

    ClientHelper.addSmoke(this.getX(), this.getY())
  }

}


module.exports = Asteroid
