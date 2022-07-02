const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants.json")
const Helper = require("./../../../common/helper")
const PathLocation = require("./path_location")

class Path extends BaseEntity {
  constructor(game, data) {
    super(game, data)

    this.locations = data.locations
    this.pathLocations = []
  }

  getWidth() {
    return 0
  }

  getHeight() {
    return 0
  }

  syncWithServer(data) {
    if (this.sprite) {
      this.removeSelfAndChildrens(this.sprite)
    }

    for (let key in data) {
      this.data[key] = data[key]
    }

    this.buildSprites()
    console.log("rebuild paths..")
  }

  initSprite() {
    // nothing
  }

  getPathLocationKlass() {
    return PathLocation
  }

  remove() {
    super.remove()
    this.getContainer().unregisterEntity("paths", this)
  }

  buildTileSprite(tile) {
    let klass = this.getPathLocationKlass()
    tile.container = this.data.container
    let pathLocation = new klass(this, tile)
    this.sprite.addChild(pathLocation.sprite)
    
    this.pathLocations.push(pathLocation)
  }

  buildSprites() {
    this.sprite = new PIXI.Container()
    this.sprite.name = "path"
    this.getSpriteContainer().addChild(this.sprite)

    let batches = Helper.batch(this.data.locations, 50)
    batches.forEach((batch) => {
      // setTimeout(() => {
        batch.forEach((tile) => {
          this.buildTileSprite(tile)
        })
      // }, 0)
    })

    let goal = this.data.goal
    let goalSprite = this.createTargetSprite(goal.row, goal.col)
    this.sprite.addChild(goalSprite)
  }

  createTargetSprite(row, col) {
    let texture = PIXI.utils.TextureCache[this.getTileSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.name = "goal_target"
    sprite.tint = 0x00ff00
    sprite.position.x = col * Constants.tileSize + Constants.tileSize / 2
    sprite.position.y = row * Constants.tileSize + Constants.tileSize / 2
    sprite.width  = Constants.tileSize
    sprite.height = Constants.tileSize
    sprite.anchor.set(0.5)

    this.getSpriteContainer().addChild(sprite)

    return sprite
  }

  getSpriteContainer() {
    return this.data.container.spriteLayers[this.getGroup()] 
  }

  getTileSpritePath() {
    return "room_tile.png"
  }

  getGroup() {
    return "paths"
  }


}

module.exports = Path