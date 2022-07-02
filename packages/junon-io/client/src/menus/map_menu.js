const SocketUtil = require("./../util/socket_util")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")
const BaseMenu = require("./base_menu")

class MapMenu extends BaseMenu {

  resizeCanvas(sector) {
    let cssCanvasWidth = 512
    this.zoomMultiplier = Math.floor(cssCanvasWidth / sector.getRowCount())
    this.mapSize = this.zoomMultiplier * sector.getRowCount()

    this.terrainCanvas.width = this.mapSize
    this.terrainCanvas.height = this.mapSize

    this.entityCanvas.width = this.mapSize
    this.entityCanvas.height = this.mapSize
  }

  onMenuConstructed() {
    this.terrainCanvas = document.querySelector("#map_terrain_canvas")
    this.entityCanvas = document.querySelector("#map_entity_canvas")
    this.miniMapTerrainCanvas = document.querySelector("#mini_map_terrain_canvas")
    this.miniMapEntityCanvas  = document.querySelector("#mini_map_entity_canvas")
    this.miniMapMenu = document.querySelector("#mini_map_menu")

    this.STRUCTURE_COLOR = "#888888"

    this.labels = {}
    this.mapPositions = {}
    this.alerts = {}
    this.renderQueue = []

    if (this.game.isMobile()) {
      this.repositionMapCanvas() 
    }
  }

  isControllingPlayerRequired() {
    return false
  }

  repositionMapCanvas() {
    let targetWidth 
    if (window.innerWidth < window.innerHeight) {
      targetWidth = window.innerWidth - 75
    } else {
      targetWidth = window.innerHeight - 75
    }

    this.terrainCanvas.style.width = targetWidth + "px"
    this.entityCanvas.style.width = targetWidth + "px"
    document.querySelector("#map_menu_frame").style.width = targetWidth + "px"
    document.querySelector("#map_menu_frame").style.margin = 'auto'
  }

  reinit() {
    // the grid size is 200x200. map is 600px by 600px wide
    let sectorColCount = this.game.sector.getColCount()

    this.zoomMultiplier = Math.floor(this.mapSize / sectorColCount)
  }

  syncWithServer(data) {
    let isEntityMapChanged = false

    data.positions.forEach((position) => {
      isEntityMapChanged = true

      if (this.mapPositions[position.id]) {
        if (position.clientMustDelete) {
          // delete position
          delete this.mapPositions[position.id] 
        } else {
          // update position
          this.mapPositions[position.id] = position
        }
      } else if (!position.clientMustDelete) {
        // create position
        this.mapPositions[position.id] = position
      }
    })

    if (isEntityMapChanged) {
      this.redrawEntityMap()
    }
  }

  addAlert(chunkRow, chunkCol) {
    let key = [chunkRow, chunkCol].join("-")
    this.alerts[key] = true
    this.redrawEntityMap()
  }

  removeAlert(chunkRow, chunkCol) {
    let key = [chunkRow, chunkCol].join("-")
    delete this.alerts[key] 
    this.redrawEntityMap()
  }

  addLabel(id, text, x, y) {
    if (this.game.isMiniGame()) {
      text = i18n.t(text)  
    }
    this.labels[id] = { x: x, y: y, text: text }

    this.redrawEntityMap()
  }

  removeLabel(id) {
    delete this.labels[id] 

    this.redrawEntityMap()
  }

  removePrevTeamMembers(prevMembers) {
    for (let id in prevMembers) {
      delete this.mapPositions[id]
    }
    this.redrawEntityMap()
  }

  redrawEntityMap() {
    this.getEntityContextList().forEach((ctx) => {
      ctx.clearRect(0, 0, this.entityCanvas.width, this.entityCanvas.height)
    })

    for (let id in this.labels) {
      let label = this.labels[id]
      this.drawLabel(label)
    }

    for (let positionId in this.mapPositions) {
      let position = this.mapPositions[positionId]
      this.drawEntityPosition(position)
    }

    for (let alertKey in this.alerts) {
      this.drawAlert(alertKey)
    }
  }

  shouldExcludePosition(ctx, position) {
    return ctx.canvas.id === "mini_map_entity_canvas" && position.id === this.game.playerId
  }

  setPositionChanged() {
    this.isPositionChanged = true
  }

  repositionMiniMap(player) {
    let miniMapWidth  = this.miniMapMenu.offsetWidth
    let actualMapWidth = this.mapSize
    let topLeftX = (player.getX() / this.game.sector.getSectorWidth()) * actualMapWidth - miniMapWidth / 2
    let topLeftY = (player.getY() / this.game.sector.getSectorWidth()) * actualMapWidth - miniMapWidth /2

    this.miniMapTerrainCanvas.style.marginLeft = (0 - topLeftX) + "px"
    this.miniMapTerrainCanvas.style.marginTop =  (0 - topLeftY) + "px"

    this.miniMapEntityCanvas.style.marginLeft = (0 - topLeftX) + "px"
    this.miniMapEntityCanvas.style.marginTop =  (0 - topLeftY) + "px"
  }

  getTerrainCanvasContext() {
    if (!this.terrainCanvasCtx) {
      this.terrainCanvasCtx = this.terrainCanvas.getContext("2d")
      this.terrainCanvasCtx.strokeStyle = 'rgba(0,0,0,0)'
    }

    return this.terrainCanvasCtx
  }

  getEntityCanvasContext() {
    if (!this.entityCanvasCtx) {
      this.entityCanvasCtx = this.entityCanvas.getContext("2d")
    }

    return this.entityCanvasCtx
  }

  getMiniMapTerrainCanvasContext() {
    if (!this.miniMapTerrainCanvasCtx) {
      this.miniMapTerrainCanvasCtx = this.miniMapTerrainCanvas.getContext("2d")
    }

    return this.miniMapTerrainCanvasCtx
  }

  getMiniMapEntityCanvasContext() {
    if (!this.miniMapEntityCanvasCtx) {
      this.miniMapEntityCanvasCtx = this.miniMapEntityCanvas.getContext("2d")
    }

    return this.miniMapEntityCanvasCtx
  }

  getTerrainContextList() {
    return [this.getTerrainCanvasContext(), this.getMiniMapTerrainCanvasContext()]
  }

  getEntityContextList() {
    return [this.getEntityCanvasContext(), this.getMiniMapEntityCanvasContext()]
  }

  clearMapPositions() {
    this.mapPositions = {}
  }

  setMapPosition(entity, type) {
    this.mapPositions[entity.getId()] = { x: entity.getX(), y: entity.getY(), type: type, id: entity.getId() }
  }

  cleanup() {
    this.mapPositions = {}
    this.labels = {}
    this.renderQueue = []

    this.getTerrainContextList().forEach((ctx) => {
      ctx.clearRect(0, 0, this.terrainCanvas.width, this.terrainCanvas.height)
    })

    this.getEntityContextList().forEach((ctx) => {
      ctx.clearRect(0, 0, this.entityCanvas.width, this.entityCanvas.height)
    })
  }

  repositionTo(player) {
    if (this.lastPosition !== player.getCoord()) {
      this.lastPosition = player.getCoord()
      this.repositionMiniMap(player)
    }
  }

  getEntityRadius(position) {
    if (position.type === Protocol.definition().EntityType.Player) {
      return 8
    }

    return 4
  }

  getLineWidth(position) {
    if (position.type === Protocol.definition().EntityType.Player) {
      return 2
    }

    return 1
  }

  getEntityMapPositionColor(position) {
    if (position.type === Protocol.definition().EntityType.Player) {
      return "#bf5036"
    } else if (position.type === Protocol.definition().EntityType.Slave) {
      return "#ffff22"
    } else if (position.type === Protocol.definition().EntityType.Mob) {
      return "#ff2222"
    } else {
      throw new Error("Invalid position type: " + JSON.stringify(position))
    }
  }

  drawAlert(alertKey) {
    let chunkRow = alertKey.split("-")[0]
    let chunkCol = alertKey.split("-")[1]
    let radius = 80

    let row = chunkRow * Constants.chunkColCount + (Constants.chunkColCount)
    let col = chunkCol * Constants.chunkColCount + (Constants.chunkColCount)
    let color = "#ff5b5b"

    this.getEntityContextList().forEach((ctx) => {
      ctx.beginPath()
      ctx.globalAlpha = 0.35
      ctx.arc(col * this.zoomMultiplier, row * this.zoomMultiplier, radius, 0, 2 * Math.PI, false)
      ctx.fillStyle = color
      ctx.lineWidth = 1
      ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = 1
    })

  }

  drawLabel(options) {
    let ctx = this.getEntityCanvasContext()
    ctx.font = "14px Arial"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = "#eadd2b"
    ctx.strokeStyle = "black"
    ctx.lineWidth = 4;

    let row = options.y / Constants.tileSize
    let col = options.x / Constants.tileSize

    ctx.strokeText(options.text, col * this.zoomMultiplier, row * this.zoomMultiplier)

    ctx.fillText(options.text, col * this.zoomMultiplier, row * this.zoomMultiplier)
  }

  drawEntityPosition(position) {
    let radius = this.getEntityRadius(position)
    let row = Math.floor(position.y / Constants.tileSize)
    let col = Math.floor(position.x / Constants.tileSize)
    let color = this.getEntityMapPositionColor(position)

    this.getEntityContextList().forEach((ctx) => {
      if (!this.shouldExcludePosition(ctx, position)) {
        ctx.beginPath()
        ctx.arc(col * this.zoomMultiplier, row * this.zoomMultiplier, radius, 0, 2 * Math.PI, false)
        ctx.fillStyle = color
        ctx.lineWidth = this.getLineWidth(position)
        ctx.fill()
        ctx.stroke()
      }
    })
  }

  assignTile(row, col, color) {
    this.renderQueue.push({ row: row, col: col, color: color, type: 'tile' })
  }

  unassignTile(row, col, color) {
    this.renderQueue.push({ row: row, col: col, type: 'tile', shouldRemove: true })
  }

  drawTile(row, col, color) {
    this.getTerrainContextList().forEach((ctx) => {
      ctx.fillStyle = color
      ctx.fillRect(col * this.zoomMultiplier, row * this.zoomMultiplier, this.zoomMultiplier, this.zoomMultiplier)
    })
  }

  undrawTile(row, col) {
    this.getTerrainContextList().forEach((ctx) => {
      ctx.clearRect(col * this.zoomMultiplier, row * this.zoomMultiplier, this.zoomMultiplier, this.zoomMultiplier)
    })
  }

  drawSquareWithColor(ctx, row, col, color) {
    let widthInTiles = 2
    let heightInTiles = 2

    ctx.fillStyle = color

    ctx.fillRect(col * this.zoomMultiplier, 
                 row * this.zoomMultiplier, 
                 widthInTiles * this.zoomMultiplier, 
                 heightInTiles * this.zoomMultiplier)
  }

  drawStructureWithColor(ctx, entity, color) {
    let widthInTiles = entity.getRotatedWidth() / Constants.tileSize
    let heightInTiles = entity.getRotatedHeight() / Constants.tileSize

    ctx.fillStyle = color

    ctx.fillRect(entity.getUpperLeftCol() * this.zoomMultiplier, 
                 entity.getUpperLeftRow() * this.zoomMultiplier, 
                 widthInTiles * this.zoomMultiplier, 
                 heightInTiles * this.zoomMultiplier)
  }

  assignStructure(entity) {
    this.renderQueue.push({ entity: entity, type: 'structure' })
  }

  unassignStructure(entity) {
    this.renderQueue.push({ entity: entity, type: 'structure', shouldRemove: true })
  }

  processRenderQueue() {
    let elapsed = 0

    while (this.renderQueue.length > 0 && elapsed < 5) {
      let queueItem = this.renderQueue.shift()
      if (queueItem.type === 'structure') {
        if (queueItem.shouldRemove) {
          this.removeStructure(queueItem.entity)
        } else {
          this.drawStructure(queueItem.entity)
        }
      } else if (queueItem.type === 'tile') {
        if (queueItem.shouldRemove) {
          this.undrawTile(queueItem.row, queueItem.col)
        } else {
          this.drawTile(queueItem.row, queueItem.col, queueItem.color)
        }
      }
    }
  }

  drawStructure(entity) {
    if (!entity.hasCategory("wall") && entity.hasWallOnTop()) return
    if (!entity.hasCategory("rail") && entity.hasRailOnTop()) return
    if (entity.hasCategory("platform") && entity.hasStructureOnTop()) return

    let structureColor = entity.getMinimapColor() || this.STRUCTURE_COLOR
    this.getTerrainContextList().forEach((ctx) => {
      this.drawStructureWithColor(ctx, entity, structureColor)
    })
  }

  getDamageTween(row, col) {
    let state = { state: 0 }

    let tween = new TWEEN.Tween(state)
        .to({ state: 1 }, 250)
        .delay(250)
        .onStart(() => {
          this.getTerrainContextList().forEach((ctx) => {
            this.drawSquareWithColor(ctx, row, col, '#ff2222') // red
          })
        })
        .onComplete(() => {
          this.getTerrainContextList().forEach((ctx) => {
            this.drawSquareWithColor(ctx, row, col, this.STRUCTURE_COLOR) 
          })
        })
        .onStop(() => {
          this.getTerrainContextList().forEach((ctx) => {
            this.drawSquareWithColor(ctx, row, col, this.STRUCTURE_COLOR) 
          })
        })

    return tween
  }

  drawDamage(row, col) {
    let damageTweenA = this.getDamageTween(row, col)
    let damageTweenB = this.getDamageTween(row, col)
    damageTweenA.chain(damageTweenB)
    damageTweenA.start()
  }

  removeStructure(entity) {
    this.getTerrainContextList().forEach((ctx) => {
      let widthInTiles = entity.getRotatedWidth() / Constants.tileSize
      let heightInTiles = entity.getRotatedHeight() / Constants.tileSize

      ctx.clearRect(entity.getUpperLeftCol() * this.zoomMultiplier, 
                    entity.getUpperLeftRow() * this.zoomMultiplier, 
                    widthInTiles * this.zoomMultiplier, 
                    heightInTiles * this.zoomMultiplier)
    })
  }

}



module.exports = MapMenu 