const BaseFloor = require("./base_floor")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Floor extends BaseFloor {

  getBaseSpritePath() {
    return "solid_texture.png";
  }

  getTextureSpritePath() {
    if (this.data && this.data.textureIndex) {
      let textureName = this.game.floorTextures[this.data.textureIndex]
      return textureName
    }

    return "solid_texture.png";
  }

  getBuildingSprite(x, y) {
    if(this.getTextureSpritePath() === "simplex_texture.png") {
      let sprite = new PIXI.Container()

      this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["solid_texture.png"])
      this.baseSprite.anchor.set(0.5)

      // this.texture = new PIXI.Sprite(PIXI.utils.TextureCache["noiseTexture" + String(Math.floor(Math.random() * 6)) + ".png"])
      const baseTexture = PIXI.utils.TextureCache[this.getTextureSpritePath()]


      if (this.getTextureSpritePath() === "simplex_texture.png") {
        const chunk = new PIXI.Rectangle(x % (31 * 32), y % (31 * 32), 32, 32)
        const texture = new PIXI.Texture(baseTexture, chunk)
        this.texture = new PIXI.Sprite(texture)
        this.texture.alpha = 0.2
      } else {
        this.texture = new PIXI.Sprite(baseTexture)
      }

      if (this.data.hasOwnProperty("colorIndex")) {
        let color = this.game.colors[this.data.colorIndex]
        this.baseSprite.tint = color.value
        this.texture.tint = color.value
      }

      this.texture.anchor.set(0.5) 
      this.baseSprite.addChild(this.texture)
      sprite.addChild(this.baseSprite)
      return sprite;
    }
      
      let sprite = new PIXI.Container()
      this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getTextureSpritePath()])
      this.baseSprite.anchor.set(0.5)
      sprite.addChild(this.baseSprite)
      return sprite;
  }


  getOverlayTexturePath() {
    return 'bevelled_texture.png'
  }

  getEdgeSpritePath() {
    return 'platform_edge.png'
  }

  hasEdgeSprite() {
    return false
  }

  getType() {
    return Protocol.definition().BuildingType.Floor
  }

  getConstantsTable() {
    return "Floors.Floor"
  }

}

module.exports = Floor
