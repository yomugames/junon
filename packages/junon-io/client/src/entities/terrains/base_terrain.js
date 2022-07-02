const BaseEntity  = require("./../base_entity")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Helper = require("./../../../../common/helper")
const Tilable  = require("./../../../../common/interfaces/tilable")
const BaseBuildingCommon  = require("./../../../../common/entities/base_building_common")
const SocketUtil = require("./../../util/socket_util")
const SpriteEventHandler = require("./../../util/sprite_event_handler")

class BaseTerrain extends BaseEntity {
  static build(game, data) {
    return new this(game, data)
  }

  constructor(game, data) {
    super(game, data)

    this.row = Math.floor(data.y / Constants.tileSize)
    this.col = Math.floor(data.x / Constants.tileSize)

    this.lightings = []
    this.lighting = null
    this.chunks = {}

    if (data.isEquipDisplay) {

    } else {
      this.onBuildingConstructed()
      this.updateChunkSprite()
      this.assignShadow()
      this.redrawNeighborShadows()
    }
  }

  syncWithServer(data) {
    this.setEffects(data.effects)
  }

  static getTextures() {
    if (!this.textures) {
      this.textures = {}
    }

    if (!this.textures[this.getType()]) {
      this.textures[this.getType()] = this.getTextureMapping()
    }

    return this.textures[this.getType()]
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    return true
  }

  static getTextureMapping() {
    let spritePath = this.getSpritePath()

    return {
      line_zero: PIXI.utils.TextureCache[spritePath],
      line_one: PIXI.utils.TextureCache[spritePath],
      line_two: PIXI.utils.TextureCache[spritePath],
      line_two_straight: PIXI.utils.TextureCache[spritePath],
      line_three: PIXI.utils.TextureCache[spritePath],
      line_four: PIXI.utils.TextureCache[spritePath]
    }
  }

  static getSpritePath() {
    return this.prototype.getSpritePath()
  }

  updateChunkSprite() {
    if (!this.isChunkable()) return

    this.getChunk().updateSprite(this)
  }

  isChunkable() {
    if (this.getContainer().isMovable()) return false

    return true
  }

  onEffectAdded(effect) {
    super.onEffectAdded(effect)
    this.updateChunkSprite()
  }

  onBuildStart() {
  }

  onBuildStop() {
  }

  onEffectRemoved(effect) {
    super.onEffectRemoved(effect)
    this.updateChunkSprite()
  }

  onEffectLevelChanged(effect, level) {
    super.onEffectLevelChanged(effect, level)
    this.updateChunkSprite()
  }

  renderEntityMenu(entityMenu) {
    this.showLogs(entityMenu)
  }

  showLogs(entityMenu) {
    entityMenu.querySelector(".entity_logs").innerHTML = ""
  }

  applyTint(tint) {
    this.getTileSprite().tint = tint
  }

  getRedrawNeighborTileMaps() {
    return [this.game.sector.map, this.game.sector.groundMap]
  }

  redrawNeighborTiles() {
    const row = this.getRow()
    const col = this.getCol()
    // const tilemap = this.getTileMap()
    let tilemaps = this.getRedrawNeighborTileMaps()
    tilemaps.forEach((tilemap) => {
      let neighbors = tilemap.getNeighbors(row, col)
      neighbors.forEach((hit) => {
        hit.entity.redrawSprite()
      })
    })


  }

  animateWalk(entity) {

  }

  onClick(options) {
    this.game.resetEntitySelection()

    if (options.isRightClick) {
      // right click
      this.game.selectEntity(this)
      this.game.showEntityMenu(this)
    }

    this.handleDoubleClick()

  }

  static isTerrain() {
    return true
  }

  onMouseOver() {
    super.onMouseOver()

    if (this.isGroundTile()) return

    if (!Helper.isTargetWithinRange(this.game.player, this)) {
      return
    }

    if (this.isForegroundTile()) {
      this.game.player.setMineTarget(this)
    }

    this.game.highlight(this)
    this.game.showEntityMenu(this)
  }

  onMouseOut() {
    super.onMouseOut()

    if (this.isGroundTile()) return

    if (this.isForegroundTile()) {
      this.game.player.setMineTarget(null)
    }

    this.game.unhighlight(this)
    this.game.hideEntityMenu(this)
  }

  handleDoubleClick() {
    let currClickTime = (new Date()).getTime()
    let doubleClickThreshold = 500 // ms
    let isDblClick = this.lastClickTime && ((currClickTime - this.lastClickTime) < doubleClickThreshold)

    if (isDblClick) {
      if (debugMode) {
        SocketUtil.emit("ClientChat", { message: "/tp " + this.getRow() + " " + this.getCol() })
      }
    }

    this.lastClickTime = (new Date()).getTime()
  }


  redrawSprite() {
    this.layoutTile()
    this.updateChunkSprite()
  }

  getSelectionSprite() {
    const padding = 2
    const w = Constants.tileSize
    const h = Constants.tileSize
    const graphics = new PIXI.Graphics()
    const lineStyle = this.getSelectionLineStyle()
    graphics.lineStyle(lineStyle.lineWidth, lineStyle.color)
    graphics.drawRect(-w/2 + padding, -h/2 + padding, w - (padding * 2), h - (padding * 2))
    graphics.endFill()
    graphics.position.x = this.getX()
    graphics.position.y = this.getY()

    return graphics
  }

  getTypeName() {
    let label = this.getConstants().label
    if (label) return label

    const type = this.getType()
    return Helper.getTerrainNameById(type).replace(/([A-Z])/g, ' $1').trim() // space before capital letters
  }

  getSpriteLayerGroup() {
    return this.getGroup()
  }

  getSpriteContainer() {
    let group = this.getSpriteLayerGroup()

    if (this.data.isEquipDisplay) {
      return this.container.effectsContainer
    } else {
      return this.container.getSpriteLayerForChunk(group, this.getChunkRow(), this.getChunkCol())
    }
  }

  getGroundSpriteContainer() {
    return this.container.getSpriteLayerForChunk("grounds", this.getChunkRow(), this.getChunkCol())
  }

  getContainer() {
    return this.sector
  }

  onPositionChanged() {

  }

  rotateEquip() {

  }

  onGridPositionChanged() {
    this.renderInvalidArea()
  }

  getSprite() {
    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.name = this.getTypeName()
    sprite.anchor.set(0.5)
    sprite.width  = this.w
    sprite.height = this.h

    return sprite
  }

  getSelectionSpriteParent() {
    return this.game.sector.effectsContainer // selectionSpriteContainer
  }

  onBuildingConstructed() {
    this.getTileMap().register(this.getBox(), this)
    this.getChunk().register("terrains", this)

    this.layoutTile()
    this.redrawNeighborTiles()
    this.drawMinimap()
  }

  drawMinimap() {
    let color = this.getConstants().minimapColor
    if (color) {
      this.game.mapMenu.assignTile(this.getRow(), this.getCol(), color)
    }
  }

  undrawMinimap() {
    let color = this.getConstants().minimapColor
    if (color) {
      this.game.mapMenu.unassignTile(this.getRow(), this.getCol())
    }
  }

  assignShadow() {
    this.game.sector.lightManager.assignShadowFor(this, this.getShadowColor())
  }

  onShadowRendered() {
    this.sprite.alpha = 1
  }

  getPositionStat() {
    let el = "<div class='entity_stats_entry'>" +
                    "<div class='stats_type'>Coord:</div>" +
                    "<div class='stats_value'>" + [this.getRow(), this.getCol()].join(",") + "</div>" +
                "</div>"
    return el
  }

  getShadowColor() {
    let neighbors = this.game.sector.lightManager.getLightNeighbors({ row: this.getRow(), col: this.getCol() })
    let hasEmptySpace = neighbors.find((neighbor) => { return !neighbor.entity })
    if (hasEmptySpace) {
      return "#ffffff" // no shadows
    } else {
      return "#111111" // slightly hidden by default
    }
  }

  unassignShadow() {
    this.game.sector.lightManager.unassignShadowFor(this)
  }

  getBrightness() {
    return 0
  }

  getDefaultLightingColor() {
    return "#ffffff"
  }

  static getSellGroup() {
    return "Terrains"
  }

  redrawNeighborShadows() {
    let neighbors = this.game.sector.lightManager.getLightNeighbors(this)
    neighbors.forEach((neighbor) => {
      if (neighbor.entity) {
        neighbor.entity.assignShadow()
      }
    })
  }

  unregister() {
    this.getContainer().unregisterEntity("terrains", this)
    this.getChunk().unregister("terrains", this)

    this.undrawMinimap()

    this.getTileMap().unregister(this.getBox())
    if (this.isLightSource()) {
    } else {
    }
  }

  isLightSource() {
    return this.lightings.length > 0
  }

  remove() {
    super.remove()

    if (!this.data.isEquipDisplay) {
      this.unregister()
      this.updateChunkSprite()
      this.unassignShadow()

      this.redrawNeighborTiles()
      this.redrawNeighborShadows()
    }
  }

  // subclass overrides
  isUndergroundTile() {
    return false
  }

  // subclass overrides
  isGroundTile() {
    return false
  }

  isPlant() {
    return false
  }


  getTileMap() {
    if (this.isUndergroundTile()) {
      return this.game.sector.undergroundMap
    } else if (this.isGroundTile()) {
      return this.game.sector.groundMap
    } else {
      return this.game.sector.map
    }
  }

  getSideHitTileMaps() {
    return [this.getTileMap()]
  }

  getSideHits() {
    let tileMaps = this.getSideHitTileMaps()
    if (tileMaps.length === 1) {
      return this.getSideHitsFor(tileMaps[0])
    } else {
      return this.getSideHitsMulti(tileMaps)
    }
  }

  getSideHitsMulti(tileMaps) {
    let firstSideHits    = this.getSideHitsFor(tileMaps[0])
    let secondSideHits   = this.getSideHitsFor(tileMaps[1])
    let hits = {}

    for (let direction in firstSideHits) {
      let directionHits = firstSideHits[direction]
      let hit = directionHits[0] // it'll only have one entry only
      if (!hit) continue

      let firstHitDetected = hit.entity
      if (firstHitDetected) {
        hits[direction] = firstSideHits[direction]
      } else {
        hits[direction] = secondSideHits[direction]
      }
    }

    return hits
  }


  getSideHitsFor(tilemap) {
    const result = { left: [], up: [], right: [], down: [] }

    let neighbors = tilemap.getNeighborsAllowEmpty(this.getRow(), this.getCol())

    result["left"].push(neighbors[0])
    result["up"].push(neighbors[1])
    result["right"].push(neighbors[2])
    result["down"].push(neighbors[3])

    return result
  }

  getTileNeighbor(sideHits) {
    let tiles = {}

    // find out which ones are neighbor tiles
    for (let direction in sideHits) {
      let directionHits = sideHits[direction]
      if (this.hasTerrainInDirection(directionHits)) {
        tiles[direction] = true
      }
    }

    return tiles
  }

  hasTerrainInDirection(directionHits) {
    return directionHits.find((hit) => {
      return hit.entity
    })
  }

  getRelativeX() {
    return this.getX()
  }

  getRelativeY() {
    return this.getY()
  }

  getRow() {
    return Math.floor(this.getY() / Constants.tileSize)
  }

  getCol() {
    return Math.floor(this.getX() / Constants.tileSize)
  }

  static build(game, data) {
    return new this(game, data)
  }

  getType() {
    throw new Error("must implement BaseTerrain.getType")
  }

}

Object.assign(BaseTerrain.prototype, Tilable.prototype, {
  getTextures() {
    return this.constructor.getTextures()
  },
  getTileSprite() {
    return this.sprite
  },
  getSides() {
    const sides = this.getSideHits()
    return this.getTileNeighbor(sides)
  }

})

Object.assign(BaseTerrain.prototype, BaseBuildingCommon.prototype, {
})


module.exports = BaseTerrain
