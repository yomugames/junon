const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseWall = require("./base_wall")

class Wall3d extends BaseWall {

  getType() {
    return Protocol.definition().BuildingType.Wall3d
  }

  getConstantsTable() {
    return "Walls.Wall3d"
  }

  getWallColor() {
    return 0x2a2a2a
  }

  static getTextures() {
    if (!this.textures) {
      this.textures = {
        wall0: PIXI.utils.TextureCache["3dwall-0.png"],
        wall1: PIXI.utils.TextureCache["3dwall-1.png"],
        wall2: PIXI.utils.TextureCache["3dwall-2.png"],
        wall3: PIXI.utils.TextureCache["3dwall-3.png"],
        wall4: PIXI.utils.TextureCache["3dwall-4.png"],
        wall5: PIXI.utils.TextureCache["3dwall-5.png"],
        wall6: PIXI.utils.TextureCache["3dwall-6.png"],
        wall7: PIXI.utils.TextureCache["3dwall-7.png"],
        wall8: PIXI.utils.TextureCache["3dwall-8.png"],
      }
    } 

    return this.textures;
  }


}

module.exports = Wall3d

