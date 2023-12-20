const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const Region = require("../entities/region")
const Terrains = require("../entities/terrains/index")
const Buildings = require("../entities/buildings/index")

class Fill extends BaseCommand {
  getUsage() {
    return [
      "/fill [start_row] [start_col] [end_row] [end_col] [terrain_type] [color]",
      "/fill building [start_row] [start_col] [end_row] [end_col] [1x1 building] [color]"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }

  perform(player, args) {

    if(args[0] == 'building') {
      let startRow = parseInt(args[1])
      let startCol = parseInt(args[2])
      let endRow   = parseInt(args[3])
      let endCol   = parseInt(args[4])
      let type     = args[5]

      if (!Region.isBoundsValid(this.sector, startRow, startCol, endRow, endCol)) {
        // show invalid
        player.showChatError("Invalid bounds")
        return
      }

      if(!type) {
        player.showChatError("Must specify building type")
        return
      }
      const klassName = this.sector.klassifySnakeCase(type)

      let klass = Buildings[klassName]

      if(!klass) {
        player.showChatError("Invalid building type")
        return
      }
      if (klass && klass.prototype.hasCategory("platform")) {
        player.showChatError("You cannot fill with platforms")
      }
      
      if (Constants.Buildings[klassName]) {
        if(Constants.Buildings[klassName].width != Constants.tileSize || Constants.Buildings[klassName].height != Constants.tileSize) {
          player.showChatError('Building must be 1x1')
          return
        }
      }
      let data
      let floorData

      this.sector.roomManager.isAllocationDisabled = true

      for (var row = startRow; row <= endRow; row++) {
        for (var col = startCol; col <= endCol; col++) {
          let existingTerrain = this.sector.groundMap.get(row, col)
          if (existingTerrain) {
            existingTerrain.remove({ removeAll: true })
          }
   
          // remove any structures
          this.sector.removeAllBuildings(row, col)

          let floorKlass = Buildings.Floor
          let x = col * Constants.tileSize + Constants.tileSize / 2
          let y = row * Constants.tileSize + Constants.tileSize / 2
          let w = Constants.tileSize
          let h = Constants.tileSize
          data = { angle: 0, type: klass.getType(), x: x, y: y, w: w, h: h }
          floorData = { angle: 0, type: floorKlass.getType(), x:x, y:y, w:w, h:h, owner: player.getBuildOwner(), placer: player }
            data.owner = player.getBuildOwner()
            data.placer = player
  
          let floor = floorKlass.build(floorData, this.sector)
          let building = klass.build(data, this.sector)

          if (building && building.hasCustomColors()) {


            if(args[6] && Constants.FloorColors[args[6]]) {
              building.setColorIndex(Constants.FloorColors[args[6]].index)
            } else {
              if (player.colorIndex >= 0) {
                building.setColorIndex(player.colorIndex)
              }
            }

            

          }
        }
      }

      return
    }

    let startRow = parseInt(args[0])
    let startCol = parseInt(args[1])
    let endRow   = parseInt(args[2])
    let endCol   = parseInt(args[3])

    // auto invert coords to make it valid
//     if (startRow > endRow) {
//       let tempRow = startRow
//       startRow = endRow
//       endRow = startRow
//     }
// 
//     if (startCol > endCol) {
//       let tempCol = startCol
//       startCol = endCol
//       endCol = startCol
//     }

    let type   = args[4]

    if (!Region.isBoundsValid(this.sector, startRow, startCol, endRow, endCol)) {
      // show invalid
      player.showChatError("Invalid bounds")
      return
    }

    if (!type) {
      player.showChatError("Must specify terrain type")
      return
    }

    const klassName = this.sector.klassifySnakeCase(type)
    if (klassName === "Meteorite") {
      klassName = "MeteoriteAsteroid"
    }
    
    let klass = Terrains[klassName]
    let buildingklass = Buildings[klassName]
    let isPlatform = false

    if (!klass) {
      if (buildingklass && buildingklass.prototype.hasCategory("platform")) {
        klass = buildingklass
        isPlatform = true

      } else {
        player.showChatError("Invalid terrain type")
        return
      }
    }

    let data

    this.sector.roomManager.isAllocationDisabled = true

    for (var row = startRow; row <= endRow; row++) {
      for (var col = startCol; col <= endCol; col++) {
        let existingTerrain = this.sector.groundMap.get(row, col)
        if (existingTerrain) {
          existingTerrain.remove({ removeAll: true })
        }
 
        // remove any structures
        this.sector.removeAllBuildings(row, col)


        let x = col * Constants.tileSize + Constants.tileSize / 2
        let y = row * Constants.tileSize + Constants.tileSize / 2
        let w = Constants.tileSize
        let h = Constants.tileSize
        data = { angle: 0, type: klass.getType(), x: x, y: y, w: w, h: h }
        if (isPlatform) {
          data.owner = player.getBuildOwner()
          data.placer = player

        }
      
        let building = klass.build(data, this.sector)

        if (building && building.hasCustomColors()) {
          

          if(args[5] && Constants.FloorColors[args[5]]) {
            building.setColorIndex(Constants.FloorColors[args[5]].index)
          } else {
            if (player.colorIndex >= 0) {
              building.setColorIndex(player.colorIndex)
            }
            if (player.textureIndex >= 0) {
              building.setTextureIndex(player.textureIndex)
            }
          }
      
        }
      }
    }

    this.sector.roomManager.isAllocationDisabled = false
  }

}

module.exports = Fill
