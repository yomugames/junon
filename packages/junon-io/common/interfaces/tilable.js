// tiedly coupled to pressureNetwork..
const Tilable = () => {
}

Tilable.prototype = {
  getTileSprite() {
    throw new Error("must implement Tilable#getTileSprite")
  },

  getSides() {
    throw new Error("must implement Tilable#getSides")
  },

  // ideally cached 
  getTextures() {
    throw new Error("must implement Tilable#getTextures")
  },

  /**
   * Function to change the sprite of a wall.
   * Runs every time a wall sprite has to be changed. If a wall is placed, not only the wall being placed will call but the walls around will call this.
   * @param {Object} tiles Tiles that the wall that is being changed touches. Example: {up: true, down: true, left: true, right: true}
   * @param {Object} targetSprite Sprite of wall to be changed
   */
  layoutTile(tiles = this.getSides(), targetSprite = this.getTileSprite()) {
    if(this.constructor.name === "Wall3d") {
      return this.layoutTileWall3d(tiles, targetSprite)
    }

    //regular wall
    const numOfTiles = Object.keys(tiles).length

    switch(numOfTiles) {
      case 4:
        targetSprite.texture = this.getTextures()["line_four"]
        break
      case 3:
        targetSprite.texture = this.getTextures()["line_three"]
        targetSprite.rotation = this.getConduitRotation(tiles)
        break
      case 2:
        let textureName = this.isStraightLine(tiles) ? "line_two_straight" : "line_two"
        targetSprite.texture = this.getTextures()[textureName]
        targetSprite.rotation = this.getConduitRotation(tiles)
        break
      case 1:
        targetSprite.texture = this.getTextures()["line_one"]
        targetSprite.rotation = this.getConduitRotation(tiles)
        break
      case 0:
        targetSprite.texture = this.getTextures()["line_zero"]
        break
    }

  },

  layoutTileWall3d(tiles = this.getSides(), targetSprite = this.getTileSprite()) {
    let down = tiles.down
    let up = tiles.up
    let left = tiles.left
    let right = tiles.right
    //there are 16 cases of up/down/right/left walls. Unfortunately a switch won't work here, and am not sure of a better way.
    let texture = '';
    if(!down && !up && !right && !left) {
      texture = "wall0"
    } else if(!left && !down && !right) {
      texture = "wall0"
    } else if(!up && !left && !down) {
      texture = "wall1"
    } else if(!left && !down) {
      texture = "wall1"
    } else if(!left && !up && !right) {
      texture = "wall2" 
    } else if(!left && up && !right && down) {
      texture = "wall2"
    } else if(!left && !up && right && down) {
      texture = "wall3"
    } else if(!left && up && right && down) {
      texture = "wall3"
    } else if(!up && !right && !down) {
      texture = "wall4"
    } else if(!right && !down && left && up) {
      texture = "wall4"
    } else if(left && !up && right && !down) {
      texture = "wall5"
    } else if(left && up && right && !down) {
      texture = "wall5"
    } else if(left && !up && !right && down) {
      texture = "wall6"
    } else if(up && !right && down && left) {
      texture = "wall6"
    } else if(!up && right && down && left) {
      texture = "wall7"
    } else {
      texture = "wall8"
    }

    targetSprite.texture = this.getTextures()[texture]
    targetSprite.rotation = 0
  },

  isStraightLine(tiles) {
    return (tiles["left"] && tiles["right"]) || (tiles["up"] && tiles["down"])
  },

  getConduitRotation(sideTiles) {
    let rotation = 0
    let c = sideTiles

    switch(true) {
      case (c["down"] && c["right"] && c["up"]):
        rotation = 0 * PIXI.DEG_TO_RAD
        break
      case (c["right"] && c["up"] && c["left"]):
        rotation = -90 * PIXI.DEG_TO_RAD
        break
      case (c["up"] && c["left"] && c["down"]):
        rotation = 180 * PIXI.DEG_TO_RAD
        break
      case (c["left"] && c["down"] && c["right"]):
        rotation = 90 * PIXI.DEG_TO_RAD
        break
      case (c["right"] && c["up"]):
        rotation = 0 * PIXI.DEG_TO_RAD
        break
      case (c["up"] && c["left"]):
        rotation = -90 * PIXI.DEG_TO_RAD
        break
      case (c["left"] && c["down"]):
        rotation = 180 * PIXI.DEG_TO_RAD
        break
      case (c["down"] && c["right"]):
        rotation = 90 * PIXI.DEG_TO_RAD
        break
      case (c["left"] && c["right"]):
        rotation = 0 * PIXI.DEG_TO_RAD
        break
      case (c["down"] && c["up"]):
        rotation = -90 * PIXI.DEG_TO_RAD
        break
      case (c["right"]):
        rotation = 0 * PIXI.DEG_TO_RAD
        break
      case (c["up"]):
        rotation = -90 * PIXI.DEG_TO_RAD
        break
      case (c["left"]):
        rotation = 180 * PIXI.DEG_TO_RAD
        break
      case (c["down"]):
        rotation = 90 * PIXI.DEG_TO_RAD
        break
    }

    return rotation
  }

}

module.exports = Tilable