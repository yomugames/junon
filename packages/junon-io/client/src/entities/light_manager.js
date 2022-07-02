const tinycolor = require("tinycolor2")
const Grid = require("./../../../common/entities/grid")
const Helper = require("./../../../common/helper")
const Constants = require("./../../../common/constants")
const Lighting = require("./lighting")
const ClientHelper = require("./../util/client_helper")
const ExceptionReporter = require("./../util/exception_reporter")
const Fov = require('../../../common/entities/fov')

class LightManager {

  constructor(container) {
    this.container = container
    this.game = container.game
    this.sector = this.game.sector

    this.shadowMap         = new Grid("shadow", container, container.getRowCount(), container.getColCount(), null)
    this.lightMap          = new Grid("light",  container, container.getRowCount(), container.getColCount())
    this.fovMap            = new Grid("fov",  container, container.getRowCount(), container.getColCount())
    this.MAX_LIGHT_DISTANCE = 3

    this.shadowQueue = []
    this.lightSourceQueue = []
    this.changedLightSources = {}
    this.fovTileHits = {}
    this.skyColor = '#ffffff'
    this.skyBrightness = 100
    this.fovManager = new Fov(this)

    // if (!this.container.isMovable()) {
      this.initSkyMapCanvas()
    // }
    this.initLightMapCanvas()
    this.initFovMapCanvas()
  }

  initSkyMapCanvas() {
    this.skyMapCanvas = document.createElement("canvas")
    this.skyMapCanvas.width  = this.container.getColCount()
    this.skyMapCanvas.height = this.container.getRowCount()
    this.skyMapCanvas.id = "skymap_canvas"
    // document.body.appendChild(this.skyMapCanvas) // uncomment to debug lightmap

    this.drawSky()
  }

  initFovMapCanvas() {
    this.fovMapCanvas = document.createElement("canvas")
    this.fovMapCanvas.width  = this.container.getColCount()
    this.fovMapCanvas.height = this.container.getRowCount()
    this.fovMapCanvas.id = "fov_canvas"
    // let ctx = this.fovMapCanvas.getContext("2d")
    // ctx.fillStyle = '#333333'
    // ctx.fillRect(0, 0, this.fovMapCanvas.width, this.fovMapCanvas.height)
     // document.body.appendChild(this.fovMapCanvas) // uncomment to debug lightmap
  }

  initLightMapCanvas() {
    this.lightMapCanvas = document.createElement("canvas")
    this.lightMapCanvas.width  = this.container.getColCount()
    this.lightMapCanvas.height = this.container.getRowCount()
    this.lightMapCanvas.id = "lightmap_canvas"
    // let ctx = this.lightMapCanvas.getContext("2d")
    // ctx.fillStyle = '#333333'
    // ctx.fillRect(0, 0, this.lightMapCanvas.width, this.lightMapCanvas.height)

    // document.body.appendChild(this.lightMapCanvas) // uncomment to debug lightmap
  }

  redrawChangedLightSources() {
    // we dont want to redraw too many lighting
    // to reduce lag.
    let allowedMs = 8
    let elapsed = 0

    for (let id in this.changedLightSources) {
      if (elapsed > allowedMs) {
        break
      }

      try {
        let lighting = this.changedLightSources[id]
        let lightEntity = lighting.source

        let startTime = Date.now()

        this.unregisterLightSource(lightEntity)
        if (lightEntity.isLightOn()) {
          this.registerLightSource(lightEntity)
        } 

        let duration = Date.now() - startTime
        elapsed += duration

        delete this.changedLightSources[id]
      } catch(e) {
        ExceptionReporter.captureException(e)
      }
    }
  }

  getLightNeighbors(target) {
    let deltas = [{ row: -1, col: 0 }, { row: 0, col: -1 }, { row: +1, col: 0 }, { row: 0, col: +1 }]

    let neighbors = []

    deltas.forEach((delta) => {
      let row = target.row + delta.row
      let col = target.col + delta.col

      if (!this.container.platformMap.isOutOfBounds(row, col)) {
        let tile = this.getLightTile(row, col)
        neighbors.push(tile)
      }
    })

    return neighbors
  }

  getLightTile(row, col) {
    let hit = this.container.structureMap.rowColHitTest(row, col)
    if (hit.entity) return hit

    hit = this.container.armorMap.rowColHitTest(row, col)
    if (hit.entity) return hit

    hit = this.container.platformMap.rowColHitTest(row, col)
    if (hit.entity) return hit

    hit = this.container.map.rowColHitTest(row, col)
    if (hit.entity) return hit

    hit = this.container.groundMap.rowColHitTest(row, col)
    if (hit.entity) return hit

    hit = this.container.undergroundMap.rowColHitTest(row, col)
    if (hit.entity) return hit

    return hit
  }

  getPassableNeighbors(target) {
    let neighbors = this.getLightNeighbors(target)


    return neighbors.filter((neighbor) => {
      if (!neighbor) return null
      if (!neighbor.entity) return true // no obstacle, passable

      let isPassableTileType = !neighbor.entity.isLightBlocker()
      return isPassableTileType
    })
  }

  hasLighting(key) {
    return this.lightings[key]
  }

  registerShadow(hit, color) {
    this.shadowMap.set({ row: hit.row, col: hit.col, value: color })

    this.isShadowMapChanged = true
  }

  unregisterShadow(hit, color) {
    this.shadowMap.set({ row: hit.row, col: hit.col, value: color })

    this.isShadowMapChanged = true
  }

  registerLighting(hit, color) {
    let lighting = Lighting.create({ source: hit.source, distance: hit.distance, color: color, brightnessFactor: hit.brightnessFactor, row: hit.row, col: hit.col })

    this.lightMap.addToCollection(hit.row, hit.col, lighting)

    this.isLightMapChanged = true


    return lighting
  }

  unregisterLighting(lighting) {
    this.lightMap.removeFromCollection(lighting.row, lighting.col, lighting)

    this.isLightMapChanged = true
  }

  computeShadowValue(row, col) {
    let shadowColor = this.getShadowColor(row, col)
    if (!shadowColor) return { r: 255, g: 255, b: 255, a: 1 }

    let color = this.getColorInRange(shadowColor, "#000000", this.skyBrightness)
    return tinycolor(color).toRgb()
  }

  computeLightValue(row, col) {
    let lightSourceColor = this.getLightSourceColor(row, col)
    let totalBrightness = this.getTotalBrightness(row, col)

    if (lightSourceColor) {
      let rgb = lightSourceColor.toRgb()
      rgb.a = totalBrightness / 100

      return rgb
    } else {
      return { r: 0, g: 0, b: 0, a: 0 }
    }

    return 
  }

  getTotalBrightness(row, col) {
    let lightings = this.lightMap.get(row, col)
    let total = 0

    let result = this.applyLightBlocking(lightings)

    let negativeBrightness = 0
    let positiveBrightness = 0

    for (let key in result) {
      let lighting = result[key]
      if (lighting.brightnessFactor < 0) {
        negativeBrightness += lighting.brightnessFactor
      } else if (lighting.brightnessFactor > 0) {
        positiveBrightness += lighting.brightnessFactor
      }
    }

    total += negativeBrightness
    total = Math.max(0, total) // cant be lower than 0

    total += positiveBrightness
    total = Math.min(100, total) // cant be more than 100

    return total
  }

  colorWithBrightness(color, brightness) {
    let hsl = tinycolor(color).toHsl()
    let highestLuminance = hsl.l
    hsl.l = (brightness/100) * highestLuminance
    return tinycolor(hsl)
  }

  getColorInRange(startColor, endColor, brightness) {
    return ClientHelper.getRandomColorInRange(startColor, endColor, brightness / 100) 
  }

  getShadowColor(row, col) {
    return this.shadowMap.get(row, col)
  }

  getLightSourceColor(row, col) {
    let lightings = this.lightMap.get(row, col) || {}

    return this.addLightSourceColors(lightings)
  }

  getNaturalLightColor(row, col) {
    let lightings = this.lightMap.get(row, col) || {}

    const nonLightSourceLightings = Object.values(lightings).filter((lighting) => {
      return !lighting.isLightSource()
    })

    const nonLightSourceLighting = nonLightSourceLightings[0]
    if (nonLightSourceLighting) {
      return this.colorWithBrightness(nonLightSourceLighting.color, nonLightSourceLighting.brightnessFactor)
    } else {
      return this.colorWithBrightness(this.skyColor, this.skyBrightness)
    }
  } 

  addLightSourceColors(lightings) {
    let totalBrightness = 0
    let colorRatios = []

    for (let key in lightings) {
      let lighting = lightings[key]
      if (lighting.isLightSource()) {
        totalBrightness += lighting.brightnessFactor
      }
    }

    for (let key in lightings) {
      let lighting = lightings[key]
      if (lighting.isLightSource()) {
        colorRatios.push({ hex: lighting.color, ratio: lighting.brightnessFactor / totalBrightness })
      }
    }

    let rgb = ClientHelper.mixColors(colorRatios)

    return tinycolor({ r: rgb[0], g: rgb[1], b: rgb[2] })
  }

  applyLightBlocking(lightings) {
    let blocker

    for (let key in lightings) {
      let lighting = lightings[key]
      if (lighting.isLightBlocker()) {
        blocker = lighting
        break
      }
    }

    if (blocker) {
      // remove light source lightings
      let result = []

      for (let key in lightings) {
        let lighting = lightings[key]
        if (!lighting.isLightSource()) {
          result.push(lighting)
        }
      }

      return result
    } else {
      return lightings
    }
  }

  assignShadowFor(entity, color) {
    let row = entity.getRow()
    let col = entity.getCol()
    this.registerShadow({ row: row, col: col }, color)
    this.shadowQueue.push(entity)
  }

  unassignShadowFor(entity, color) {
    let row = entity.getRow()
    let col = entity.getCol()
    this.unregisterShadow({ row: row, col: col }, color)
  }

  assignLightingFor(entity, color, brightnessFactor) {
    let lightDistance = 1
    let hit = { source: entity, row: entity.getRow(), col: entity.getCol(), distance: lightDistance, brightnessFactor: brightnessFactor }
    let lighting = this.registerLighting(hit, color)
    entity.lighting = lighting 

    this.assignLightPixelValue(hit.row, hit.col)
  }

  clearFovCanvas() {
    let ctx = this.fovMapCanvas.getContext("2d")
    ctx.clearRect(0, 0, this.fovMapCanvas.width, this.fovMapCanvas.height)
  }

  applyFov() {
    if (!this.sector.isFovMode()) return
    if (!this.game.player) return
    this.clearFovCanvas()
    this.fovTileHits = this.fovManager.calculateFov(this.game.player, { shouldIncludeLightBlocker: true })
    this.assignFovLightBatched(this.fovTileHits)
    this.isFovMapChanged = true
    this.updateFovMapTexture()
  }

  removeFov() {
    this.clearFovCanvas()
    this.isFovMapChanged = true
    this.updateFovMapTexture()
  }

  assignLightPixelValue(row, col) {
    try {
      const pixel = this.getLightMapCanvasImageData()

      let rgb = this.computeLightValue(row, col)

      pixel.data[0] = rgb.r
      pixel.data[1] = rgb.g
      pixel.data[2] = rgb.b
      pixel.data[3] = Math.floor(rgb.a * 255)

      this.lightMapCanvas.getContext('2d').putImageData(pixel, col, row) // col - x, row - y
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  isLightingsEmpty(lightings) {
    if (Array.isArray(lightings)) {
      return lightings.length === 0
    } else {
      return Object.keys(lightings).length === 0
    }
  }

  assignFovLightBatched(lightings) {
    if (this.isLightingsEmpty(lightings)) return

    let box
    try {
      box = this.getLightingBox(lightings)
      const imageData = this.getFovMapCanvasImageDataBatched(box)

      this.forEachLightings(lightings, (lighting) => {
        let rgb = { r: 255, g: 255, b: 255, a: 1 }
        let relativeRow = lighting.row - box.top
        let relativeCol = lighting.col - box.left
        let bufferInterval = 4
        let absoluteBaseIndex = bufferInterval * (relativeRow * box.width + relativeCol)

        imageData.data[absoluteBaseIndex    ] = rgb.r
        imageData.data[absoluteBaseIndex + 1] = rgb.g
        imageData.data[absoluteBaseIndex + 2] = rgb.b
        imageData.data[absoluteBaseIndex + 3] = Math.floor(rgb.a * 255)
      })

      this.fovMapCanvas.getContext('2d').putImageData(imageData, box.left, box.top) 
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  assignLightPixelValueBatched(lightings) {
    if (this.isLightingsEmpty(lightings)) return

    let box
    try {
      box = this.getLightingBox(lightings)
      const imageData = this.getLightMapCanvasImageDataBatched(box)

      this.forEachLightings(lightings, (lighting) => {
        let rgb = this.computeLightValue(lighting.row, lighting.col)
        let relativeRow = lighting.row - box.top
        let relativeCol = lighting.col - box.left
        let bufferInterval = 4
        let absoluteBaseIndex = bufferInterval * (relativeRow * box.width + relativeCol)

        imageData.data[absoluteBaseIndex    ] = rgb.r
        imageData.data[absoluteBaseIndex + 1] = rgb.g
        imageData.data[absoluteBaseIndex + 2] = rgb.b
        imageData.data[absoluteBaseIndex + 3] = Math.floor(rgb.a * 255)
      })

      this.lightMapCanvas.getContext('2d').putImageData(imageData, box.left, box.top) 
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  assignShadowPixelValue(row, col) {
    try {
      const pixel = this.getSkyMapCanvasImageData()

      let rgb = this.computeShadowValue(row, col)

      pixel.data[0] = rgb.r
      pixel.data[1] = rgb.g
      pixel.data[2] = rgb.b
      pixel.data[3] = Math.floor(rgb.a * 255)

      this.skyMapCanvas.getContext('2d').putImageData(pixel, col, row) // col - x, row - y
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  getSkyMapCanvasImageData() {
    if (!this.skyMapImageData) {
      let ctx = this.skyMapCanvas.getContext('2d')
      this.skyMapImageData = ctx.getImageData(0, 0, 1, 1)
    }
  
    return this.skyMapImageData
  }

  getLightMapCanvasImageData() {
    if (!this.lightMapImageData) {
      let ctx = this.lightMapCanvas.getContext('2d')
      this.lightMapImageData = ctx.getImageData(0, 0, 1, 1)
    }
  
    return this.lightMapImageData
  }

  getSkyMapCanvasImageDataBatched(box) {
    let ctx = this.skyMapCanvas.getContext('2d')
    return ctx.getImageData(box.left, box.top, box.width, box.height)
  }

  getLightMapCanvasImageDataBatched(box) {
    let ctx = this.lightMapCanvas.getContext('2d')
    return ctx.getImageData(box.left, box.top, box.width, box.height)
  }

  getFovMapCanvasImageDataBatched(box) {
    let ctx = this.fovMapCanvas.getContext('2d')
    return ctx.getImageData(box.left, box.top, box.width, box.height)
  }

  forEachLightings(lightings, cb) {
    if (Array.isArray(lightings)) {
      for (var i = 0; i < lightings.length; i++) {
        cb(lightings[i])
      }
    } else {
      for (let key in lightings) {
        cb(lightings[key])
      }
    }
  }

  isOutOfBounds(row, col) {
    return row < 0 || row >= this.container.getRowCount() ||
           col < 0 || col >= this.container.getColCount()
  }

  getShadowBox(shadows) {
    let top = 100000
    let left = 100000
    let right = 0
    let bottom = 0

    for (var i = 0; i < shadows.length; i++) {
      let shadow = shadows[i]
      if (shadow.row < top) {
        top = shadow.row
      }

      if (shadow.col < left) {
        left = shadow.col
      }

      if (shadow.row > bottom) {
        bottom = shadow.row
      }

      if (shadow.col > right) {
        right = shadow.col
      }

    }

    return {
      top: top,
      left: left,
      width: right - left + 1,
      height: bottom - top + 1
    }
  }

  getLightingBox(lightings) {
    let top = 100000
    let left = 100000
    let right = 0
    let bottom = 0

    this.forEachLightings(lightings, (lighting) => {
      if (lighting.row < top) {
        top = lighting.row
      }

      if (lighting.col < left) {
        left = lighting.col
      }

      if (lighting.row > bottom) {
        bottom = lighting.row
      }

      if (lighting.col > right) {
        right = lighting.col
      }
    })

    return {
      top: top,
      left: left,
      width: right - left + 1,
      height: bottom - top + 1
    }
  }

  cleanup() {
    let ctx = this.lightMapCanvas.getContext("2d")
    ctx.clearRect(0, 0, this.lightMapCanvas.width, this.lightMapCanvas.height)

    ctx = this.fovMapCanvas.getContext("2d")
    ctx.clearRect(0, 0, this.fovMapCanvas.width, this.fovMapCanvas.height)

    ctx = this.skyMapCanvas.getContext("2d")
    ctx.fillStyle = "rgba(255, 255, 255, 1.000)"
    ctx.fillRect(0, 0, this.skyMapCanvas.width, this.skyMapCanvas.height)
    
    if (this.lightMapCanvas.parentElement) {
      this.lightMapCanvas.parentElement.removeChild(this.lightMapCanvas)
    }

    if (this.fovMapCanvas.parentElement) {
      this.fovMapCanvas.parentElement.removeChild(this.fovMapCanvas)
    }

    if (this.skyMapCanvas.parentElement) {
      this.skyMapCanvas.parentElement.removeChild(this.skyMapCanvas)
    }

  }


  addChangedLightSource(lightSource) {
    this.changedLightSources[lightSource.id] = lightSource
  }

  clearChangedLightSources() {
    this.changedLightSources = {}
  }

  invalidateLightSources(row, col) {
    let lightings = this.lightMap.get(row, col)
    let lightSources = Object.values(lightings).filter((lighting) => {
      return lighting.isLightSource()
    })

    lightSources.forEach((lightSource) => {
      this.addChangedLightSource(lightSource)
    })
  }

  isLightSourceRegistered(targetEntity) {
    return targetEntity.lightings.length > 0
  }

  getLightingKey(target) {
    return target.row + "-" + target.col
  }

  assignShadowPixelValueForEntities() {
  }

  assignShadowPixelValueForEntity(entity) {
    if (!entity) return

    try {
      let tiles = entity.getTiles()
      tiles.forEach((tile) => {
        this.assignShadowPixelValue(tile.row, tile.col)
      })
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  // shadows is array of { row: col: }
  assignShadowPixelValueBatched(shadows) {
    if (shadows.length === 0) return

    let box
    try {
      box = this.getShadowBox(shadows)
      const imageData = this.getSkyMapCanvasImageDataBatched(box)

      for (var i = 0; i < shadows.length; i++) {
        let shadow = shadows[i]

        let rgb = this.computeShadowValue(shadow.row, shadow.col)
        let relativeRow = shadow.row - box.top
        let relativeCol = shadow.col - box.left
        let bufferInterval = 4
        let absoluteBaseIndex = bufferInterval * (relativeRow * box.width + relativeCol)

        imageData.data[absoluteBaseIndex    ] = rgb.r
        imageData.data[absoluteBaseIndex + 1] = rgb.g
        imageData.data[absoluteBaseIndex + 2] = rgb.b
        imageData.data[absoluteBaseIndex + 3] = Math.floor(rgb.a * 255)
      }

      this.skyMapCanvas.getContext('2d').putImageData(imageData, box.left, box.top) 
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  setSkyColor(color) {
    this.skyColor = color
    this.drawSky()
  }

  setSkyBrightness(brightnessFactor) {
    if (this.sector.settings.isShadowsEnabled) {
      this.skyBrightness = brightnessFactor
    } else {
      this.skyBrightness = 100
    }

    this.drawSky()
  }

  drawSky() {
    let color = this.colorWithBrightness(this.skyColor, this.skyBrightness)

    let ctx = this.skyMapCanvas.getContext("2d")
    ctx.fillStyle = color.toString()
    ctx.fillRect(0, 0, this.skyMapCanvas.width, this.skyMapCanvas.height)


    let entities = Object.values(this.container.platforms).concat(Object.values(this.container.terrains))
    this.shadowQueue = this.shadowQueue.concat(entities)
  }

  nightMode() {
    this.setSkyBrightness(60)
  }

  dayMode() {
    this.setSkyBrightness(100)
  }

  setLightMapContainerAlpha(alpha) {
    if (this.game.isCanvasMode()) return
    if (!this.container.lightMapContainer) return

    if (this.sector.settings.isShadowsEnabled) {
      this.container.lightMapContainer.alpha = alpha  
    } else {
      this.container.lightMapContainer.alpha = 0.3
    }
  }

  setDarkness(hour) {
    if (this.game.isMiniGame()) {
      this.setLightMapContainerAlpha(0.95)
      this.setSkyBrightness(60)
      return
    }

    switch(hour) {
      case 21:
        this.setLightMapContainerAlpha(0.95)
        this.setSkyBrightness(60)
        break
      case 20:
        this.setLightMapContainerAlpha(0.8)
        this.setSkyBrightness(70)
        break
      case 19:
        this.setLightMapContainerAlpha(0.7)
        this.setSkyBrightness(80)
        break
      case 18:
        this.setLightMapContainerAlpha(0.6)
        this.setSkyBrightness(90)
        break
      case 6:
        this.setLightMapContainerAlpha(0.8)
        this.setSkyBrightness(70)
        break
      case 7:
        this.setLightMapContainerAlpha(0.7)
        this.setSkyBrightness(80)
        break
      case 8:
        this.setLightMapContainerAlpha(0.6)
        this.setSkyBrightness(90)
        break
      case 9:
        this.setLightMapContainerAlpha(0.5)
        this.setSkyBrightness(100)
        break
      default:
        if (hour < 6 || hour > 21) {
          this.setLightMapContainerAlpha(0.95)
          this.setSkyBrightness(60)
        } else {
          this.setLightMapContainerAlpha(0.5)
          this.setSkyBrightness(100)
        }
    }

  }

  updateLightMapTexture() {
    if (this.isLightMapChanged) {
      this.isLightMapChanged = false
      this.container.lightMapSprite.texture.update()
    }
  }

  updateFovMapTexture() {
    if (this.isFovMapChanged) {
      this.isFovMapChanged = false
      this.container.fovMapSprite.texture.update()
    }
  }

  updateShadowMapTexture() {
    if (!this.container.skyMapSprite) return

    if (this.isShadowMapChanged) {
      this.isShadowMapChanged = false
      this.container.skyMapSprite.texture.update()
      this.shadowQueue.forEach((entity) => {
        entity.onShadowRendered()
      })

      this.shadowQueue = []
    }
  }

  reduceBrightnessFactor(target, amount) {
    target.brightnessFactor -= amount

    if (target.brightnessFactor < 0) {
      target.brightnessFactor = 0
    }
  }

  processQueue() {
    this.processLightQueue()
    this.processShadowQueue()
  }

  processShadowQueue() {
    let elapsed = 0
    let batchCount = 300 

    let prevShadowQueueLength = this.shadowQueue.length

    while (this.shadowQueue.length > 0 && elapsed < 5) {
      let entities = this.shadowQueue.splice(0, batchCount)
      let start = Date.now()
      this.assignShadowPixelValueBatched(entities)
      elapsed += (Date.now() - start)
    }

    if (this.shadowQueue.length === 0 && prevShadowQueueLength > 0) {
      this.isShadowMapChanged = true
      this.updateShadowMapTexture()
    }
  }

  processLightQueue() {
    let allowedMs = 5
    let elapsed = 0

    while (this.lightSourceQueue.length > 0 && elapsed < allowedMs) {
      let startTime = Date.now()

      let data = this.lightSourceQueue.shift()
      if (data.action === 'register') {
        this.registerLightSource(data.entity)
      } else if (data.action === 'unregister') {
        this.unregisterLightSource(data.entity)
      }

      let duration = Date.now() - startTime
      elapsed += duration
    }
  }

  queueLightSource(data) {
    this.lightSourceQueue.push(data)
  }

  registerLightSource(targetEntity) {
    if (this.isLightSourceRegistered(targetEntity)) return

    let color = targetEntity.getLightColor()
    let radiusTileCount = targetEntity.getLightRadius()

    let lightings = {} // remember them so we can easily remove after

    let target = { 
      id: targetEntity.id, 
      source: targetEntity, 
      row: targetEntity.getRow(), 
      col: targetEntity.getCol(), 
      color: color,
      brightnessFactor: 100 
    }

    let frontier = [target]

    let lightingKey = this.getLightingKey(target)
    target.distance = 0

    let lighting = this.registerLighting(target, color)
    lightings[lightingKey] = lighting

    let brightnessDecay = 100 / radiusTileCount

    // create flows for neighbors recursively
    while (frontier.length > 0) {
      let current = frontier.shift()
      let neighbors = this.getLightNeighbors(current)
      neighbors.forEach((neighbor) => {
        let lightingKey = this.getLightingKey(neighbor)

        // if we've already marked the flow before, dont do it again
        if (!lightings[lightingKey] && current.distance < radiusTileCount) { 
          neighbor.distance = current.distance + 1 
          neighbor.source = targetEntity

          // reduce brightness
          neighbor.brightnessFactor = current.brightnessFactor 
          this.reduceBrightnessFactor(neighbor, brightnessDecay)

          if (neighbor.entity && neighbor.entity.isLightBlocker()) {
            // stop propagating further from that tile. 
            neighbor.brightnessFactor = 0
          } else if (neighbor.entity && neighbor.entity.isLightDiffuser()) {
            this.reduceBrightnessFactor(neighbor, 10)
          }

          if (neighbor.brightnessFactor > 0) {
            frontier.push(neighbor)
          }

          lighting = this.registerLighting(neighbor, color)
          lightings[lightingKey] = lighting
        }
      })
    }

    targetEntity.lightings = Object.values(lightings)  // remember so we can remove later

    this.assignLightPixelValueBatched(lightings)
  }

  unregisterLightSource(targetEntity) {
    for (var i = 0; i < targetEntity.lightings.length; i++) {
      let lighting = targetEntity.lightings[i]
      this.unregisterLighting(lighting)
    }

    this.assignLightPixelValueBatched(targetEntity.lightings)

    for (var i = 0; i < targetEntity.lightings.length; i++) {
      let lighting = targetEntity.lightings[i]
      lighting.remove()
    }

    targetEntity.lightings = []
  }

}

module.exports = LightManager