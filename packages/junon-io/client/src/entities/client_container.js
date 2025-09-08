const ExceptionReporter = require("./../util/exception_reporter")
const Helper = require("./../../../common/helper")

const ClientContainer = () => {
}

ClientContainer.prototype = {
  initClientContainer() {
    this.staticSyncQueue = []
    this.dynamicSyncQueue = []
    this.clientContainerInitTime = Date.now()
  },

  syncWithServerForGroups(groups, data, options = {}) {
    let staticGroups = ["buildings", "rooms", "pickups", "chunkRegionPaths"]
    for (var i = 0; i < groups.length; i++) {
      let group = groups[i]
      if (!data[group]) continue
      if (data[group].length === 0) continue

      let entities = data[group]
      let initialMapLoad = (Date.now() - this.clientContainerInitTime) < 3000
      if (initialMapLoad || options.sync) {
        entities.forEach((entityData) => {
          this.processEntitySync(group, entityData)
        })
        return
      }

      let immediateInteractData = entities.find((entityData) => {
         return entityData.id === this.game.lastInteractEntityId
      })
 
      if (immediateInteractData) {
        this.processEntitySync(group, immediateInteractData)
      }
 
      if (staticGroups.indexOf(group) !== -1) {
        this.pushToStaticSyncQueue({ group: group, entities: data[group] })
      } else {
        this.pushToDynamicSyncQueue({ group: group, entities: data[group] })
      }
    }
  },

  sortByDeleteFirst(entities) {
    return entities.sort((a, b) => {
      // https://stackoverflow.com/a/17387454
      return (a.clientMustDelete === b.clientMustDelete)? 0 : a.clientMustDelete ? -1 : 1
    })
  },

  syncTerrains(data, options = {}) {
    if (data.terrains.length === 0) return

    data.terrains = this.sortByDeleteFirst(data.terrains)

    let initialMapLoad = (Date.now() - this.clientContainerInitTime) < 3000
    if (initialMapLoad || options.sync) {
      data.terrains.forEach((entityData) => {
        this.processEntitySync("terrains", entityData)
      })
    } else {
      this.pushToStaticSyncQueue({ group: "terrains", entities: data.terrains })
    }
  },

  getTerrainId(data) {
    let absoluteIndex = data.row * this.getColCount() + data.col
    return [data.type, absoluteIndex].join("-")
  },

  pushToDynamicSyncQueue(options) {
    this.dynamicSyncQueue.push(options)
  },

  pushToStaticSyncQueue(options) {
    this.staticSyncQueue.push(options)
  },

  processDynamicSyncQueue() {
    let allowedMs = 5
    let elapsed = 0

    // dynamic sync
    while (this.dynamicSyncQueue.length > 0 && elapsed < allowedMs) {
      let data = this.dynamicSyncQueue[0]

      while (data.entities.length > 0 && elapsed < allowedMs) {
        let startTime = Date.now()

        let entityData = data.entities.shift()
        this.processEntitySync(data.group, entityData)

        let duration = Date.now() - startTime
        elapsed += duration
      }

      if (data.entities.length === 0) {
        this.dynamicSyncQueue.shift()
      }
    }
  },

  processStaticSyncQueue() {
    let allowedMs 
    if ((Date.now() - this.clientContainerInitTime) < 3000) {
      allowedMs = 1000
    } else if (this.game.resolution < 1) {
      allowedMs = 150
    } else {
      allowedMs = 7
    }

    let elapsed = 0
    // static sync queue
    while (this.staticSyncQueue.length > 0 && elapsed < allowedMs) {
      let data = this.staticSyncQueue[0]

      while (data.entities.length > 0 && elapsed < allowedMs) {
        let startTime = Date.now()

        let entityData = data.entities.shift()
        this.processEntitySync(data.group, entityData)

        let duration = Date.now() - startTime
        elapsed += duration
      }

      if (data.entities.length === 0) {
        this.staticSyncQueue.shift()
      }
    }
  },

  processEntitySyncQueue() {
    this.processDynamicSyncQueue()
    this.processStaticSyncQueue()
  },

  processEntitySync(group, entityData) {
    if (group === 'terrains') {
      this.syncTerrain(entityData)
      return
    } else {
      this.syncGroup(entityData, group)
    }
  },

  syncTerrain(entityData) {
    entityData.id = this.getTerrainId(entityData)

    try {
      if (entityData.clientMustDelete) {
        let entity = this.terrains[entityData.id]
        this.removeEntity(entity, "terrains")
      } else {
        this.renderEntity(entityData, "terrains")
      }
    } catch(e) {
      console.log("failed to sync terrain:")
      console.log(e)
    }
  },

  syncGroup(entityData, group) {
    if (entityData.clientMustDelete) {
      let entity = this[group][entityData.id]
      if (entity) {
        // its possible that clientMustDelete sent more than once 
        // (i.e projectile remove broacasted in all chunks (i.e 3) traversed by projectile)
        this.removeEntity(entity, group, entityData)
      }
    } else {
      this.renderEntity(entityData, group)
    }
  },

  renderEntity(data, group) {
    try {
      const localEntity = this.getLocalEntity(data, group)
      localEntity.syncWithServer(data)
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  },

  getLocalEntity(data, group) {
    let entity = this[group][data.id]

    if (!entity) {
      entity = this.createEntity(data, group)
    }

    return entity
  },

  createEntity(data, group) {
    data.container = this
    let entity = this.game.createEntity(group, data)
    if(entity.getChunk && this.chunks[entity.getChunk().id][group]) {
      this.chunks[entity.getChunk().id][group][entity.id] = entity
      //chunk.register() isn't always called, and removeStale() which is the primary removing function, wil not be called. Since sector[group] seems to be always populated, we will just add it to the chunk so that projectiles will always be removed.
    }
    this[group][entity.id] = entity

    return entity
  },

  // dont need to trigger entity remove callbacks. just need to clear reference..
  removeAllEntities(entityType) {
    for (let clientId in this[entityType]) {
      delete this[entityType][clientId]
    }
  },

  removeAllNonIdEntities(entityType) {
    this[entityType] = []
  },

  removeEntity(entity, entityType, entityData) {
    try {
      if (!entity) return
      entity.remove(entityData)
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  },

  unregisterEntity(entityType, entity) {
    delete this[entityType][entity.id]
  },

  isRegisterableInMap(entity) {
    return [
      Constants.collisionGroup.Player,
      Constants.collisionGroup.Building,
      Constants.collisionGroup.Unit,
      Constants.collisionGroup.Mob
    ].indexOf(entity.getCollisionGroup()) !== -1
  },

  getGridRulerSprite() {
    let texture = PIXI.utils.TextureCache["grid_ruler.png"]
    const width  = this.getGridWidth()
    const height = this.getGridHeight()
    const sprite = new PIXI.extras.TilingSprite(texture, width, height)
    sprite.alpha = 0
    sprite.anchor.set(0)
    sprite.name = "GridRuler"
    return sprite
  },

  getRegion(x, y) {
    let result = null

    for (let regionId in this.regions) {
      let region = this.regions[regionId]
      let isColliding = this.testBoxPoint(region.getStart().x, region.getStart().y, region.getWidth(), region.getHeight(), x, y)
      if (isColliding) {
        result = region
        break
      }
    }

    return result
  },

  createSpriteLayer(group) {
    const sprite = new PIXI.Container()
    sprite.name = group

    return sprite
  },

  toggleRangeLayer() {
    let alpha = 1 - this.rangeContainerSprite.alpha
    this.setRangeAlpha(alpha)
  },

  setRangeAlpha(alpha) {
    this.rangeContainerSprite.alpha = alpha
    this.setAllRangeAlpha(alpha)
  },

  setAllRangeAlpha(alpha) {
    for (let shipId in this.structures) {
      let ship = this.structures[shipId]
      if (ship.isTower()) {

        if (alpha === 0) {
          ship.hideRange()
        } else {
          ship.drawRange()
        }
      }
    }
  },

  createSpriteLayersFor(parent, groups) {
    this.spriteLayers = this.spriteLayers || {}

    groups.forEach((group) => {
      let layer = this.createSpriteLayer(group)
      this.spriteLayers[group] = layer
      parent.addChild(layer)
    })

  },

  getContainerSprite() {
    const sprite = new PIXI.Container()

    this.gridRulerSprite = this.getGridRulerSprite()

    sprite.addChild(this.gridRulerSprite)

    return sprite
  }

}

module.exports = ClientContainer