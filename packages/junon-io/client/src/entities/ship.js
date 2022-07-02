const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants.json")
const Grid = require("./../../../common/entities/grid")
const Shield = require("./shield")
const Buildings = require("./buildings/index")
const Destroyable  = require("./../../../common/interfaces/destroyable")
const Container = require("./../../../common/interfaces/container")
const ClientContainer = require("./client_container")
const RoomAlertManager = require("./room_alert_manager")
const LightManager = require("./light_manager")

class Ship extends BaseEntity {

  constructor(game, data, pilot) {
    super(game, data)

    this.thrusters = {}
    this.buildings = {}
    this.terrains = {}

    this.rowCount = data.rowCount
    this.colCount = data.colCount

    this.setOwner(data.ownerId)
    this.setPilot(pilot)
    this.initDestroyable()
    this.initGrids()
    this.initRoomAlertManager()


    this.buildingGroups = ["platforms", "distributions", "armors", "structures", "units"]
    this.groups = ["pickups"]
    this.tileGroups = ["buildings"]

    this.createSpriteLayersFor(this.sprite, this.buildingGroups)
    this.createSpriteLayersFor(this.sprite, this.groups)
    this.createColliderSprite()

    this.initLightManager()

    this.postInitSprite()
  }

  postInitSprite() {
    this.repositionSprite()  

    this.lightMapContainer = new PIXI.Container()
    let multiplyBlend = new PIXI.filters.AlphaFilter()
    multiplyBlend.blendMode = PIXI.BLEND_MODES.MULTIPLY
    this.lightMapContainer.filters = [multiplyBlend]

    this.createShadowMapSprite()
    this.createLightMapSprite()

    this.sprite.addChild(this.lightMapContainer)

    this.effectsContainer  = new PIXI.Container()
    this.effectsContainer.name = "Effects"

    this.sprite.addChild(this.effectsContainer)
  }

  onSelectionChanged(entity) {
  }

  onSelectionRemoved(entity) {
  }

  createShadowMapSprite() {
    this.skyMapSprite = new PIXI.Sprite()
    this.skyMapSprite.width  = this.getGridWidth()
    this.skyMapSprite.height = this.getGridHeight()
    this.skyMapSprite.texture = PIXI.Texture.fromCanvas(this.lightManager.skyMapCanvas)

    this.lightMapContainer.addChild(this.skyMapSprite)
  }

  createLightMapSprite() {
    this.lightMapSprite = new PIXI.Sprite()
    this.lightMapSprite.width  = this.getGridWidth()
    this.lightMapSprite.height = this.getGridHeight()
    this.lightMapSprite.name = "LightMap"
    this.lightMapSprite.blendMode = PIXI.BLEND_MODES.MULTIPLY
    this.lightMapSprite.texture = PIXI.Texture.fromCanvas(this.lightManager.lightMapCanvas)

    this.lightMapContainer.addChild(this.lightMapSprite)
  }

  getSpriteLayerForChunk(group, chunkRow, chunkCol) {
    return this.spriteLayers[group]
  }

  createColliderSprite() {
    this.colliderSprite = new PIXI.Graphics()
    this.getSpriteContainer().addChild(this.colliderSprite)
  }

  initRoomAlertManager() {
    this.roomAlertManager = new RoomAlertManager(this)
  }

  repositionSprite() {
    // hack: the ship is actually currently positioned at center of a 50x50 row,col tilesize. 
    // we reposition it to 0,0 coord 
    this.sprite.pivot.x = this.getGridWidth()  / 2
    this.sprite.pivot.y = this.getGridHeight() / 2
  }

  assignLightingFor() {

  }

  unassignLightingFor() {
    
  }

  setOwner(ownerId) {
    this.ownerId = ownerId
  }

  setPilot(pilot) {
    this.pilot = pilot
  }

  getSpriteContainer() {
    return this.game.sector.spriteLayers["ships"]
  }

  getSprite() {
    let sprite = this.getContainerSprite()
    sprite.name = "Ship"

    return sprite
  }

  addThruster(thruster) {
    this.thrusters[thruster.id] = thruster
  }

  isMovable() {
    return true
  }

  removeThruster(thruster) {
    delete this.thrusters[thruster.id]
  }

  initShield(data) {
    data.shield.ship = this
    this.shield = new Shield(this.game, data.shield)
    this.sprite.addChild(this.shield.sprite)
    if (this.isMe()) this.game.updateShieldBar(this.shield.health, this.shield.getMaxHealth())
  }


  setShield(data) {
    const isNewShield = !this.shield && data.shield
    const isShieldGone = this.shield && !data.shield

    if (isNewShield) {
      this.initShield(data)
    } else if (isShieldGone) {
      this.shield.remove()
      this.shield = null
      if (this.isMe()) this.game.updateShieldBar(0,0)

    } else if (data.shield) {
      this.shield.syncWithServer(data.shield)
      if (this.isMe()) this.game.updateShieldBar(this.shield.health, this.shield.getMaxHealth())
    }
  }

  remove() {
    super.remove()

    this.getContainer().unregisterEntity("players", this)

    if (this.collider) {
      this.getSpriteContainer().removeChild(this.colliderSprite)
    }

    this.lightManager.cleanup()
    this.roomAlertManager.clear()
  }

  isMe() {
    return this.pilot && this.pilot.id === player.id
  }

  setAngle(angle) {
    this.angle = angle
    this.instructToRotate(this.getRadAngle())
  }

  setSpeed(speed) {
    this.speed = speed
  }

  initLightManager() {
    this.lightManager = new LightManager(this)
  }


  syncWithServer(data) {
    this.instructToMove(data.x , data.y)

    this.setHealth(data.health)
    this.setAngle(data.angle)

    this.setLevel(data.level)
    this.setSpeed(data.speed)

    this.syncWithServerForGroups([this.groups, this.tileGroups].flat(), data)

    this.setCollider(data.collider)
    this.setShield(data)

    if (this.isMe()) {
      this.game.updateShipStats(this)
      this.game.updateHealthBar(this.health, this.getMaxHealth())
    }

    this.lightManager.updateLightMapTexture()
    this.lightManager.redrawChangedLightSources()
  }

  drawColliderDebug() {
    if (!this.collider) return

    let points = this.collider.map((point) => { return [point.x, point.y] })
    points = [].concat.apply([], points) // flatten
    points.push(points[0])
    points.push(points[1]) // reconnect last line to first point

    this.colliderSprite.clear()
    this.colliderSprite.lineStyle(5, 0xff0000, 0.7)
    this.colliderSprite.drawPolygon(points)
    this.colliderSprite.endFill()
  }

  setCollider(collider) {
    this.collider = collider
    this.drawColliderDebug()
  }


  getRelativeBox(box) {
    const gridTopLeft = this.getGridRulerTopLeft()
    box.pos.x -= gridTopLeft.x
    box.pos.y -= gridTopLeft.y
    return box
  }


  interpolate(lastFrameTime) {
    const prev = { x: this.sprite.position.x, y: this.sprite.position.y }
    super.interpolate(lastFrameTime)
    const curr = { x: this.sprite.position.x, y: this.sprite.position.y }

    if (curr.x !== prev.x || curr.y !== prev.y) {
      this.animateThursters()
    }
  }

  animateThursters() {
    for (let thrusterId in this.thrusters) {
      let thruster = this.thrusters[thrusterId]
      thruster.addTrail()
    }
  }

  getWidth() {
    return 32
  }

  getHeight() {
    return 32
  }

}

Object.assign(Ship.prototype, Container.prototype, {
  getRowCount() {
    return this.rowCount
  },
  getColCount() {
    return this.colCount
  }
})

Object.assign(Ship.prototype, ClientContainer.prototype, {
})


Object.assign(Ship.prototype, Destroyable.prototype, {
  onHealthReduced(delta) {
  },
  onHealthIncreased(delta) {
  },
  onPostSetHealth() {
    if (this.isMe()) {
      this.game.updateHealthBar(this.health, this.getMaxHealth())
    }
  },
  getMaxHealth() {
    return this.shipCore ? this.shipCore.getMaxHealth() : 0
  }

})


module.exports = Ship
