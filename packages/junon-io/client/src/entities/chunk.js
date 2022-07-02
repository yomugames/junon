const Constants = require("./../../../common/constants.json")
const SocketUtil = require("./../util/socket_util")

/*
  cache chunk to rendertexture
  1. init cachedChunks - sprites (not visible at first)
  2. when caching, call renderTexture.
*/

class Chunk {
  constructor(sector, row, col) {
    this.sector = sector

    this.id = this.constructor.getKey(row, col)
    this.row = row
    this.col = col

    this.tileStartRow = row * Constants.chunkRowCount
    this.tileStartCol = col * Constants.chunkRowCount

    this.spriteLayers = {}
    this.bitmapCacheTimeouts = {}
    this.chunkRegions = {}
    this.cachedChunks = {}

    this.terrains = {}
    this.buildings = {}
    this.corpses = {}
    this.rooms = {}
    this.mobs = {}
    this.pickups = {}
    this.players = {}
    this.projectiles = {}
    this.transports = {}
    this.layersToCache = {}

    this.initContainers()
  }

  removeStale(data) {
    let groupsToSkip = []
    if (this.sector.isFovMode()) {
      groupsToSkip = ["players", "corpses"]
    }

    let currentCollectionMap = this.getCollectionMapFromData(data)
    for (let group in currentCollectionMap) {
      let collection = currentCollectionMap[group]
      for (let existingEntityId in this[group]) {
        let existingEntity = this[group][existingEntityId]
        let isNoLongerInChunk = !collection[existingEntityId]
        let shouldSkipGroup = groupsToSkip.indexOf(group) !== -1
        if (isNoLongerInChunk && !shouldSkipGroup) {
          this.unregister(group, existingEntity)
          existingEntity.remove()
        }
      }
    }

  }

  cacheSpriteLayer(spriteLayer, group) {
    spriteLayer.cacheAsBitmap = true
  }

// cacheSpriteLayer(spriteLayer, group) {
//     var m = new PIXI.Matrix()
// 
//     if (!spriteLayer.visible) {
//       spriteLayer.visible = true
//     }
// 
//     spriteLayer.transform.localTransform.copy(m)
//     m.invert()
// 
//     // getLocalBounds is mutable function. its somehow 
//     // needed for renderer.render to work properly below
//      let bounds = spriteLayer.getLocalBounds()
// 
//     // let xDelta = bounds.x % 512
//     // let yDelta = bounds.y % 512
// 
//     m.tx -= (this.col * 512) //(bounds.x - xDelta)
//     m.ty -= (this.row * 512) //(bounds.y - yDelta)
// 
//     let texture = PIXI.RenderTexture.create(16 * Constants.tileSize, 16 * Constants.tileSize)
//     this.sector.game.app.renderer.render(spriteLayer, texture, true, m, true)
//     spriteLayer.visible = false
//     spriteLayer.isCustomCached = true
// 
//     let cachedSprite = this.cachedChunks[group]
//     cachedSprite.texture = texture
//     cachedSprite.visible = true
//   }

  purgeSpriteLayerCache(spriteLayer, group) {
    if (spriteLayer.cacheAsBitmap) {
      spriteLayer.cacheAsBitmap = false
    }
//     this.cachedChunks[group].texture.destroy()
//     this.cachedChunks[group].visible = false
// 
//     this.spriteLayers[group].visible = true
//     this.spriteLayers[group].isCustomCached = false
  }

  cleanup() {
    this.cleanupBitmapCaches()  
  }

  cleanupBitmapCaches() {
    for (let name in this.spriteLayers) {
      let spriteLayer = this.spriteLayers[name]
      // if (spriteLayer.isCustomCached) {
        this.purgeSpriteLayerCache(spriteLayer, name)
      // }
    }
  }

  getCollectionMapFromData(data) {
    let terrainsJson = data.terrains.reduce((result, entityData) => { 
      let id = this.sector.getTerrainId(entityData)
      result[id] = true 
      return result
    }, {})

    let buildingsJson = data.buildings.reduce((result, entityData) => { 
      result[entityData.id] = true 
      return result
    }, {})

    let corpsesJson = data.corpses.reduce((result, entityData) => { 
      result[entityData.id] = true 
      return result
    }, {})

    let roomsJson = data.rooms.reduce((result, entityData) => { 
      result[entityData.id] = true 
      return result
    }, {})

    let mobsJson = data.mobs.reduce((result, entityData) => { 
      result[entityData.id] = true 
      return result
    }, {})

    let pickupsJson = data.pickups.reduce((result, entityData) => { 
      result[entityData.id] = true 
      return result
    }, {})

    let playersJson = data.players.reduce((result, entityData) => { 
      result[entityData.id] = true 
      return result
    }, {})

    let projectilesJson = data.projectiles.reduce((result, entityData) => { 
      result[entityData.id] = true 
      return result
    }, {})

    let transportsJson = data.transports.reduce((result, entityData) => { 
      result[entityData.id] = true 
      return result
    }, {})

    return {
      terrains: terrainsJson,
      buildings: buildingsJson,
      corpses: corpsesJson,
      rooms: roomsJson,
      mobs: mobsJson,
      pickups: pickupsJson,
      players: playersJson,
      projectiles: projectilesJson,
      transports: transportsJson
    }
  }

  register(group, entity) {
    this[group][entity.id] = entity 
    entity.chunks[this.id] = this
  }

  unregister(group, entity) {
    delete this[group][entity.id] 
    delete entity.chunks[this.id] 
  }

  getTopleftX() {
    return this.tileStartCol * Constants.tileSize
  }

  getTopleftY() {
    return this.tileStartRow * Constants.tileSize
  }

  hasChunkRegions() {
    return Object.keys(this.chunkRegions).length > 0
  }

  registerChunkRegion(chunkRegion) {
    this.chunkRegions[chunkRegion.getId()] = chunkRegion
  }

  unregisterChunkRegion(chunkRegion) {
    delete this.chunkRegions[chunkRegion.getId()] 
  }

  static getKey(row, col) {
    return [row, col].join("-")
  }

  getRandomRow() {
    return this.tileStartRow + Math.floor(Math.random() * Constants.chunkRowCount)
  }

  getRandomCol() {
    return this.tileStartCol + Math.floor(Math.random() * Constants.chunkColCount)
  }

  getSelectionLineStyle() {
    return {
      lineWidth: 4,
      color: 0x66ff66,
      alpha: 0.7
    }
  }

  getBorderSprite() {
    let sprite = new PIXI.Graphics()
    sprite.tint = 0x66ff66
    sprite.name = "ChunkBorder"

    const lineStyle = this.getSelectionLineStyle()

    sprite.lineStyle(lineStyle.lineWidth, lineStyle.color)
    sprite.drawRect(0, 0, Constants.chunkRowCount * Constants.tileSize, Constants.chunkRowCount * Constants.tileSize)
    sprite.endFill()

    return sprite
  }

  initSprite() {
    // this.debugSprite = new PIXI.Container()
    // this.debugSprite.name = "ChunkDebugContainer"

    // // this.debugSpriteBackground = this.getBorderSprite()

    // const style  = { fontFamily : 'PixelForce', fontSize: 36, fill : 0xffffff, align : 'center', strokeThickness: 4, miterLimit: 3 }
    // const textSprite = new PIXI.Text(this.id, style)
    // textSprite.position.set(Constants.chunkRowCount * Constants.tileSize / 2)
    // textSprite.anchor.set(0.5)

    // // this.debugSprite.addChild(this.debugSpriteBackground)
    // this.debugSprite.addChild(textSprite)

    // this.tileStartRow = this.row * Constants.chunkRowCount
    // this.tileStartCol = this.col * Constants.chunkRowCount
    // let x = this.tileStartCol * Constants.tileSize
    // let y = this.tileStartRow * Constants.tileSize

    // this.debugSprite.position.set(x, y)
    // this.sector.chunkDebugSprite.addChild(this.debugSprite)
  }

  showDebug() {
    // this.initSprite()
  }

  hideDebug() {
    // this.debugSprite.parent.removeChild(this.debugSprite)
  }

  getChunkRegion(row, col) {
    for (let chunkRegionId in this.chunkRegions) {
      let chunkRegion = this.chunkRegions[chunkRegionId]  
      let isActiveChunkRegion = chunkRegion.hasTile(row, col)
      if (isActiveChunkRegion) return chunkRegion
    }

    return null
  }

  showChunkRegions() {
    for (let chunkRegionId in this.chunkRegions) {
      let chunkRegion = this.chunkRegions[chunkRegionId]  
      chunkRegion.show()
    }
  }

  hideChunkRegions() {
    for (let chunkRegionId in this.chunkRegions) {
      let chunkRegion = this.chunkRegions[chunkRegionId]  
      chunkRegion.hide()
    }
  }

  getId() {
    return this.id
  }

  getSpriteLayer(group) {
    return this.spriteLayers[group]
  }

  updateSprite(entity) {
    let group = entity.getSpriteLayerGroup()
    let spriteLayer = this.getSpriteLayer(group)

    this.purgeSpriteLayerCache(spriteLayer, group) // whenever sprite has changed, removed the cached bitmap as its dirty

    this.layersToCache[group] = { lastUpdate: Date.now(), spriteLayer: spriteLayer }
    this.sector.addChunksToCache(this)
  }

  cacheLayers() {
    let readyToCacheThreshold = 1000 // 1 sec
    let timeNow = Date.now()
    for (let group in this.layersToCache) {
      let data = this.layersToCache[group]
      if (timeNow - data.lastUpdate >= readyToCacheThreshold) {
        this.cacheSpriteLayer(data.spriteLayer, group)
        delete this.layersToCache[group]
      }
    }
  }

  hasLayersToCache() {
    return Object.keys(this.layersToCache).length > 0
  }

  initContainers() {
    let collections = [
      this.sector.terrainGroups,
      this.sector.buildingGroups, 
      this.sector.structureGroups, 
      this.sector.wallGroups,   
      this.sector.ceilingGroups 
    ]

    collections.forEach((collection) => {
      collection.forEach((group) => {
        this.createChunkContainer(group)
        // this.createCachedChunk(group)
      })
    })
  }

  hide() {
    for (let group in this.spriteLayers) {
      let spriteLayer = this.spriteLayers[group]
      if (spriteLayer.isCustomCached) {
        this.cachedChunks[group].visible = false
      } else {
        spriteLayer.visible = false
      }
    }
  }

  show() {
    for (let group in this.spriteLayers) {
      let spriteLayer = this.spriteLayers[group]
      if (spriteLayer.isCustomCached) {
        this.cachedChunks[group].visible = true
      } else {
        spriteLayer.visible = true
      }
    }
  }

  createChunkContainer(group) {
    let container 

    let shouldUseParticleContainer = group === "platforms" //this.sector.terrainGroups.indexOf(group) !== -1
    if (false) {
      container = new PIXI.ParticleContainer() 
    } else {
      container = new PIXI.Container()
    }
    container.name = ["chunk", this.id, group].join("_")
    container.visible = false // not visible by default

    this.spriteLayers[group] = container 

    this.sector.spriteLayers[group].addChild(container)
  }

  createCachedChunk(group) {
    let sprite = new PIXI.Sprite()
    this.cachedChunks[group] = sprite
    this.cachedChunks[group].name = "CachedChunk-" + [this.row, this.col].join("-")
    this.cachedChunks[group].width  = 16 * Constants.tileSize
    this.cachedChunks[group].height = 16 * Constants.tileSize
    this.cachedChunks[group].visible = false
    // need to be positioned properly as well, as texture created is in relative local coord

    this.cachedChunks[group].position.x = this.col * Constants.tileSize * 16
    this.cachedChunks[group].position.y = this.row * Constants.tileSize * 16

    this.sector.spriteLayers[group].addChild(sprite)
  }
}

module.exports = Chunk