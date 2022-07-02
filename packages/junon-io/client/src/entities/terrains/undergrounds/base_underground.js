const BaseTerrain = require("./../base_terrain")
const Constants = require("./../../../../../common/constants.json")
const ClientHelper = require("./../../../util/client_helper")
const Trail = require("../../particles/trail")

class BaseUnderground extends BaseTerrain {
  getGroup() {
    return "undergrounds"
  }

  isUndergroundTile() {
    return true
  }

  onBuildingConstructed() {
    super.onBuildingConstructed()

    // this.shadowSprites = []
    // this.drawShadow()
  }

  getShadowColor() {
    return "#ffffff" // no shadows
  }

  redrawSprite() {
    // this.drawShadow()
  }

  getHitDirection(hit) {
    if (hit.row === this.getRow() - 1) {
      return "up"
    } else if (hit.row === this.getRow() + 1) {
      return "down"
    } else if (hit.col === this.getCol() - 1) {
      return "left"
    } else if (hit.col === this.getCol() + 1) {
      return "right"
    }
  }

  getShadowRotation(direction) {
    let angle  

    switch(direction) {
      case "up": 
        angle = Math.PI/2
        break
      case "right": 
        angle = Math.PI
        break
      case "down": 
        angle = -Math.PI/2
        break
      case "left": 
        angle = 0
        break
    }

    return angle
  }

  createShadowSprite(angle) {
    let texture = PIXI.utils.TextureCache["shadow.png"]
    let sprite = new PIXI.Sprite(texture)
    sprite.name = "Shadow"
    sprite.anchor.set(0.5)
    sprite.position.y = this.getRow() * Constants.tileSize + Constants.tileSize/2
    sprite.position.x = this.getCol() * Constants.tileSize + Constants.tileSize/2
    sprite.width  = 40
    sprite.height = 40
    sprite.rotation = angle
    return sprite
  }

  drawShadow() {
    this.removeShadowSprites()

    let groundNeighbors = this.sector.groundMap.getNeighbors(this.getRow(), this.getCol())
    if (Object.keys(groundNeighbors).length > 0) {
      groundNeighbors.forEach((hit) => {
        let direction = this.getHitDirection(hit)
        let angle  = this.getShadowRotation(direction)
        let sprite = this.createShadowSprite(angle)
        this.getSpriteContainer().addChild(sprite)
        this.shadowSprites.push(sprite)
      })
    }
  }

  removeShadowSprites() {
    this.shadowSprites.forEach((sprite) => {
      sprite.parent.removeChild(sprite)
    })

    this.shadowSprites = []
  }

  remove() {
    super.remove()
    // this.removeShadowSprites()
  }


  animateWalk(entity) {
    if (!this.getConstants().showLiquidTrail) return

    this.animationGap = this.animationGap || 0
    const animationInterval = 32

    if (this.animationGap % animationInterval === 0) {
      const radius = Math.floor(Math.random() * 10) + 32

      Trail.create({
        x: entity.getX(), 
        y: entity.getY(), 
        angle: 0, 
        color: this.getTrailColor(), 
        radius: radius, 
        offset: 0, 
        isExpanding: true, 
        spritePath: "circle_white.png", 
        spriteContainer: this.game.sector.highGroundEffectsContainer
      })
    
      // this.game.playSound("water_step")
    }

    this.animationGap += 1
  }

  getTrailColor() {
    let color = this.getConstants().liquidTrailColor
    if (color) {
      let numericalColor = parseInt(color.replace("#", ""), 16)
      return numericalColor
    } else {
      return 0x888888
    }
  }

  getSprite() {
    let sprite = super.getSprite()

    // we want it to be a little larger so that
    // edges above ground would be more visible
    let gameRowCount = this.sector.rowCount
    let gameColCount = this.sector.colCount

    let isEdgeOfMap =  this.data.row === 0 || this.data.row === gameRowCount - 1 ||
                       this.data.col === 0 || this.data.col === gameColCount - 1

    if (!isEdgeOfMap) {
      sprite.width = 48
      sprite.height = 48
    }

    return sprite
  }

}

module.exports = BaseUnderground
