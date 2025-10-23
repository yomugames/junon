const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseFloor = require("./platforms/base_floor")
const SocketUtil = require("./../../util/socket_util")
const Tilable = require("./../../../../common/interfaces/tilable")
const ClientHelper = require("../../util/client_helper")

class BaseWall extends BaseFloor {

  static isPositionValid(container, x, y, w, h, angle, player) {
    const hits = container.platformMap.hitTestTile(this.getBox(x, y, w, h))
    const isOnSoil = hits.every((hit) => { return hit.entity && hit.entity.hasCategory("soil") })

    return this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
           this.isWithinInteractDistance(x, y, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !this.hasRailNeighbor(container, x, y, w, h) &&
           !isOnSoil &&
           !container.railMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.unitMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  static isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player) {
    let box = this.getBox(x, y, w, h)

    return container.platformMap.hitTestTile(box).find((hit) => {
      if (!hit.entity) return false

      let placerOwnerId = player && player.getBuildOwnerId()
      return hit.entity.owner && (hit.entity.owner.id !== placerOwnerId)
    })
  }

  static getTextures() {
    if (!this.textures) {
      this.textures = {
        line_zero: PIXI.utils.TextureCache["wall_0.png"],
        line_one: PIXI.utils.TextureCache["wall_1.png"],
        line_two: PIXI.utils.TextureCache["wall_2.png"],
        line_two_straight: PIXI.utils.TextureCache["wall_2_straight.png"],
        line_three: PIXI.utils.TextureCache["wall_3.png"],
        line_four: PIXI.utils.TextureCache["wall_4.png"]
      }
    }

    return this.textures
  }

  hasEdgeSprite() {
    return true
  }

  getUpgradeCost() {
    return 300
  }

  getMaxHealth() {
    let maxHealth = super.getMaxHealth()
    if (this.level === 1) return maxHealth * 2
    return maxHealth
  }

  getGroup() {
    return "armors"
  }

  getBrightness() {
    return 0
  }

  getSideHitTileMaps() {
    return [this.container.armorMap]
  }

  getMap() {
    return this.container.armorMap
  }

  shouldDrawEdge(hit) {
    const isNotWall = hit.entity && !hit.entity.hasCategory("wall")
    const isEmpty = !hit.entity
    return isEmpty || isNotWall
  }

  getSpritePath() {
    let table = this.getConstants()
    if (table.sprite && table.sprite.path) {
      return table.sprite.path + ".png"
    }

    return this.getBaseSpritePath()
  }

  getBaseSpritePath() {
    let table = this.getConstants()
    if (table.sprite && table.sprite.path) {
      return table.sprite.basepath + ".png"
    }
    
    return 'wall_0.png'
  }

  getBuildingSprite() {
    let sprite = super.getBuildingSprite()

    this.baseSprite.name = "WallBaseSprite"
    this.baseSprite.tint = this.getWallColor()

    if (this.data.hasOwnProperty("colorIndex")) {
      let color = this.game.colors[this.data.colorIndex]
      this.baseSprite.tint = color.value
    }

    return sprite
  }

layoutTile(tiles = this.getSides(), targetSprite = this.getTileSprite()) {
  let down = tiles.down;
  let up = tiles.up;
  let left = tiles.left;
  let right = tiles.right;
  //there are 16 cases of up/down/right/left walls. Unfortunately a switch won't work here, and am not sure of a better way.
  let texture = '';
  if (!down && !up && !right && !left) {
    texture = "wall0";
  } else if (!left && !down && !right) {
    texture = "wall0";
  } else if (!up && !left && !down) {
    texture = "wall1";
  } else if (!left && !down) {
    texture = "wall1";
  } else if (!left && !up && !right) {
    texture = "wall2";
  } else if (!left && up && !right && down) {
    texture = "wall2";
  } else if (!left && !up && right && down) {
    texture = "wall3";
  } else if (!left && up && right && down) {
    texture = "wall3";
  } else if (!up && !right && !down) {
    texture = "wall4";
  } else if (!right && !down && left && up) {
    texture = "wall4";
  } else if (left && !up && right && !down) {
    texture = "wall5";
  } else if (left && up && right && !down) {
    texture = "wall5";
  } else if (left && !up && !right && down) {
    texture = "wall6";
  } else if (up && !right && down && left) {
    texture = "wall6";
  } else if (!up && right && down && left) {
    texture = "wall7";
  } else {
    texture = "wall8";
  }

  targetSprite.texture = require('./wall3d').prototype.getTextures()[texture]
  targetSprite.rotation = 0
}

  getDefaultSpriteColor() {
    if (this.data.colorIndex) {
      let color = this.game.colors[this.data.colorIndex]
      return color.value
    }
    
    return this.getWallColor()
  }

  getWallColor() {
    return ClientHelper.hexToInt(this.getConstants().sprite.color)
  }

  redrawSprite() {
    let tiles = this.convertNeighborsToSideHits(this.neighbors)
    for (let direction in tiles) {
      if (!tiles[direction]) {
        delete tiles[direction]
      }
    }

    this.layoutTile(tiles)

    super.redrawSprite()
  }

}

Object.assign(BaseWall.prototype, Tilable.prototype, {
  getTextures() {
    return this.constructor.getTextures()
  },
  getTileSprite() {
    return this.baseSprite
  },
  layoutTile(tiles = this.getSides(), targetSprite = this.getTileSprite()) {
    let down = tiles.down;
    let up = tiles.up;
    let left = tiles.left;
    let right = tiles.right;
    //there are 16 cases of up/down/right/left walls. Unfortunately a switch won't work here, and am not sure of a better way.
    let texture = '';
    if (!down && !up && !right && !left) {
      texture = "wall0";
    } else if (!left && !down && !right) {
      texture = "wall0";
    } else if (!up && !left && !down) {
      texture = "wall1";
    } else if (!left && !down) {
      texture = "wall1";
    } else if (!left && !up && !right) {
      texture = "wall2";
    } else if (!left && up && !right && down) {
      texture = "wall2";
    } else if (!left && !up && right && down) {
      texture = "wall3";
    } else if (!left && up && right && down) {
      texture = "wall3";
    } else if (!up && !right && !down) {
      texture = "wall4";
    } else if (!right && !down && left && up) {
      texture = "wall4";
    } else if (left && !up && right && !down) {
      texture = "wall5";
    } else if (left && up && right && !down) {
      texture = "wall5";
    } else if (left && !up && !right && down) {
      texture = "wall6";
    } else if (up && !right && down && left) {
      texture = "wall6";
    } else if (!up && right && down && left) {
      texture = "wall7";
    } else {
      texture = "wall8";
    }

    targetSprite.texture = require('./wall3d').prototype.getTextures()[texture];
    targetSprite.rotation = 0;
  }
});

module.exports  =BaseWall;