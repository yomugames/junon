const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const Region = require("../entities/region")
const Terrains = require("../entities/terrains/index")
const Buildings = require("../entities/buildings/index")

class Fill extends BaseCommand {
  getUsage() {
    return [
      "/fill [start row] [start col] [end row] [end col] terrain  [flags:value]",
      "/fill building [start row] [start col] [end row] [end col] building [flags:value]",
      "",
      "Available flags for terrain:",
      "color - ex: color:red_3",
      "texture - ex: texture:x_texture",
      "",
      "Available flags for buildings:",
      "color (walls and cages) - ex: color:red_3",
      "terrain (background) - ex: terrain:rock",
      "terraincolor (background) - ex: terraincolor:red_3",
      "terraintexture (background) - ex:terraintexture:x_texture"
    ]
  }
  
  allowOwnerOnly() {
    return true
  }
  
  perform(player, args) {
    
    if(args[0] == 'building') {
      let floorKlass;

      let startRow = parseInt(args[1])
      let startCol = parseInt(args[2])
      let endRow   = parseInt(args[3])
      let endCol   = parseInt(args[4])
      let type     = args[5]
      
      let keyValueArgs = isNaN(row) ? args.slice(2) : args.slice(4)
      let keyValueMap = this.convertKeyValueArgsToObj(keyValueArgs)
      
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
          
          if(keyValueMap["terrain"]) {
            let underneath = keyValueMap["terrain"]
            
            const underneathKlassName = this.sector.klassifySnakeCase(underneath)

            if (underneathKlassName === "Meteorite") {
              underneathKlassName = "MeteoriteAsteroid"
            }

            let underneathKlass = Terrains[underneathKlassName]
            let underneathBuildingKlass = Buildings[underneathKlassName]

            if(!underneathKlass) {
              if(underneathBuildingKlass && underneathBuildingKlass.prototype.hasCategory("platform")) {
                underneathKlass = underneathBuildingKlass
              }
              else {
                player.showChatError("Invalid terrain type for underneath the building")
                return
              }
            } 

            floorKlass = underneathKlass
          }
          
          if(!floorKlass) floorKlass = Buildings.Floor
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
            
            
            if(keyValueMap["color"] && Constants.FloorColors[keyValueMap["color"]]) {
              building.setColorIndex(Constants.FloorColors[keyValueMap["color"]].index)
            } else {
              if (player.colorIndex >= 0) {
                building.setColorIndex(player.colorIndex)
              }
            }
          }

          if(floor && floor.hasCustomColors) {
            if(keyValueMap["terraincolor"] && Constants.FloorColors[keyValueMap["terraincolor"]]) {
              floor.setColorIndex(Constants.FloorColors[keyValueMap["terraincolor"]].index)
            }

            if(keyValueMap["terraintexture"] && Constants.FloorTextures[keyValueMap["terraintexture"]]) {
              floor.setTextureIndex(Constants.FloorTextures[keyValueMap["terraintexture"]].index)
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
    
    
    let keyValueArgs = isNaN(row) ? args.slice(2) : args.slice(4)
    let keyValueMap = this.convertKeyValueArgsToObj(keyValueArgs)
    
    
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
          
          
          if(keyValueMap["color"] && Constants.FloorColors[keyValueMap["color"]]) {
            building.setColorIndex(Constants.FloorColors[keyValueMap["color"]].index)
          } else {
            if (player.colorIndex >= 0) {
              building.setColorIndex(player.colorIndex)
            }
          }
          
          if(keyValueMap["texture"] && Constants.FloorTextures[keyValueMap["texture"]]) {
            building.setTextureIndex(Constants.FloorTextures[keyValueMap["texture"]].index)
          }
          else {
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
