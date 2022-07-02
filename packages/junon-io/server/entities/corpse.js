const BaseEntity = require('./base_entity')
const Pickup = require('./pickup')
const Constants = require('../../common/constants.json')
const Buildings = require("./buildings/index")
const Destroyable = require('../../common/interfaces/destroyable')
const ShipMountable = require('../../common/interfaces/ship_mountable')
const Protocol = require('../../common/util/protocol')
const Helper = require("../../common/helper")

class Corpse extends BaseEntity {
  constructor(container, data) {
    super(container.sector, data)

    this.container = container

    this.playerViewerships = {}

    this.applyData(data)

    this.burnCounter = 0
    this.BURN_TO_ASH_THRESHOLD = 10

    this.initDestroyable()
    this.onCorpseConstructed()
  }

  addPlayerViewership(player) {
    this.playerViewerships[player.getId()] = player
  }

  removePlayerViewership(player) {
    delete this.playerViewerships[player.getId()]
  }

  unregisterFromPlayerViewership() {
    for (let id in this.playerViewerships) {
      let player = this.playerViewerships[id]
      player.removeVisibleCorpse(this)
    }

    this.playerViewerships = {}
  }

  isCorpse() {
    return true
  }

  setName(name) {
    this.name = name
  }

  setOwner(owner) {
    let prevOwner = this.owner
    this.owner = owner

    if (prevOwner !== owner) {
      this.onOwnerChanged(prevOwner, owner)
    }

  }

  onOwnerChanged(prevOwner, owner) {
    if (prevOwner) {
      prevOwner.unregisterOwnership(this.getGroup(), this)
    }

    if (owner) {
      owner.registerOwnership(this.getGroup(), this)
    }
  }

  getMobKlass() {
    return this.sector.getMobKlassForType(this.type)
  }

  isTamable() {
    let mobKlass = this.sector.getMobKlassForType(this.type)
    return mobKlass.prototype.isTamable()
  }

  isSlave() {
    let mobKlass = this.sector.getMobKlassForType(this.type)
    return mobKlass.prototype.hasCategory('worker')
  }

  getMobMaxHealth() {
    let mobKlass = this.sector.getMobKlassForType(this.type)
    return mobKlass.prototype.getMaxHealth()
  }

  resurrect(mobName) {
    let mobType = mobName || Helper.getMobNameById(this.type)
    let data = { x: this.x, y: this.y, type: mobType, health: 1, name: this.name, owner: this.owner, isRevived: true, resurrectCount: this.resurrectCount + 1 }
    let mobs = this.sector.spawnMob(data)
    this.remove()

    this.game.triggerEvent("CorpseRevived", { corpseType: this.type })

    return mobs[0]
  }

  applyData(data) {
    this.angle = data.angle || 0

    if (typeof data.type === "string") {
      this.type = Protocol.definition().MobType[data.type]
    } else {
      this.type = data.type
    }

    if (data.aliveDurationInTicks) {
      this.createTimestamp = this.game.timestamp - data.aliveDurationInTicks
    }

    if (data.owner) {
      let owner = this.game.getEntity(data.owner.id)
      this.setOwner(owner)
    }

    this.resurrectCount = data.resurrectCount || 0

    if (data.name) {
      this.setName(data.name)
    }

    if (data.effects) {
      for (let effectName in data.effects) {
        let level = data.effects[effectName]
        if (level) {
          this.setEffectLevel(effectName, level)
        }
      }
    }

  }

  interact(user) {
    const item = user.getActiveItem()

    user.attemptDrag(this)
  }

  shouldDecay() {
    let aliveDuration = this.game.timestamp - this.createTimestamp
    let maxSeconds = 60 * 30
    let maxTicks   = maxSeconds * Constants.physicsTimeStep

    return aliveDuration > maxTicks
  }

  isDestroyed() {
    return false
  }

  onStorageChanged(storage) {

  }

  getX() {
    if (this.container.isSector()) {
      return super.getX()
    } else if (this.container.isShip()) {
      return this.getAbsoluteXOnContainer()
    } else {
      return this.getContainer().getGridRulerTopLeft().x + this.getRelativeX()
    }
  }

  getY() {
    if (this.container.isSector()) {
      return super.getY()
    } else if (this.container.isShip()) {
      return this.getAbsoluteYOnContainer()
    } else {
      return this.getContainer().getGridRulerTopLeft().y + this.getRelativeY()
    }
  }

  harvest(dropPosition) {
    let mobKlass = this.sector.getMobKlassForType(this.type)

    let pickup = null

    let drop = mobKlass.prototype.getDrop()
    if (drop) {
      if (this.sector.isLobby() || Math.random() < 0.8) {
        pickup = Pickup.createDrop({ sector: this.sector, x: dropPosition.x, y: dropPosition.y, type: drop })
      }
    }

    this.remove()

    return pickup
  }

  harvestToItem() {
    let mobKlass = this.sector.getMobKlassForType(this.type)
    let drop = mobKlass.prototype.getDrop()
    let item

    if (drop) {
      if (Math.random() < 0.8) {
        item = this.sector.createItem(drop)
      }
    }

    this.remove()

    return item
  }

  isPathFindable() {
    return false
  }

  isDraggable() {
    return true
  }

  setDormant() {

  }

  getDecayInHours() {
    return this.sector.getHourDuration(this.game.timestamp - this.createTimestamp)
  }

  getAliveDurationInTicks() {
    return this.game.timestamp - this.createTimestamp
  }

  isRotten() {
    let timestepPerHour = Constants.physicsTimeStep * Constants.secondsPerHour
    return this.getAliveDurationInTicks() > (timestepPerHour * 24)
  }

  onCorpseConstructed() {
    this.createTimestamp = this.game.timestamp

    this.getSector()["corpses"][this.id] = this
    this.getSector().insertEntityToTreeByName(this, "units")
    this.repositionOnUnitMap()
    this.onPositionChanged({ isGridPositionChanged: true })
    this.onStateChanged()

    if (this.sector.isFovMode()) {
      this.addNewlyVisibleCorpseToPlayers()
    }
  }

  addNewlyVisibleCorpseToPlayers() {
    let boundingBox = this.getNeighborBoundingBox(Constants.tileSize * 6)
    let players = this.sector.playerTree.search(boundingBox)
    for (var i = 0; i < players.length; i++) {
      let player = players[i]
      if (player.calculateEntityVisible(this)) {
        player.addVisibleCorpse(this)
      }
    }
  }

  canBeClaimedBySlave() {
    return !this.owner // no owner
  }

  isSlaveCorpse() {
    let mobKlass = this.sector.getMobKlassForType(this.type)
    return mobKlass.prototype.hasCategory("worker")
  }

  getGroup() {
    if (this.isTamable()) return "tames"
    if (this.isSlave()) return "slaves"
  }

  remove() {
    delete this.getSector()["corpses"][this.id]
    this.getSector().removeEntityFromTreeByName(this, "units")
    this.removeFromUnitMap()
    this.unregisterFromChunkRegions()
    this.unregisterFromPlayerViewership()

    this.removeMiasma()

    super.remove()

    if (this.owner) {
      this.owner.unregisterOwnership(this.getGroup(), this)
    }

    this.clientMustDelete = true

    if (this.dragger) {
      this.dragger.getChunk().addChangedCorpses(this)
    }

    this.onStateChanged()
  }

  getType() {
    return this.type
  }

  onStateChanged() {
    let chunk = this.getChunk()
    if (chunk) {
      chunk.addChangedCorpses(this)
    }

    if (this.sector.isFovMode()) {
      for (let id in this.playerViewerships) {
        this.playerViewerships[id].addChangedCorpses(this)
      }
    }
  }

  isHuman() {
    return this.sector.getMobKlassForType(this.getType()).prototype.isHuman()
  }

  isPlayer() {
    return false // this.getType() === Protocol.definition().MobType.Human
  }

  getConstantsTable() {
    return "Corpse"
  }

  registerToChunkRegions(chunkRegions) {
    if (this.chunkRegions) {
      for (let id in this.chunkRegions) {
        let chunkRegion = this.chunkRegions[id]
        chunkRegion.unregister("corpses", this)
      }
    }

    this.chunkRegions = chunkRegions

    for (let id in this.chunkRegions) {
      let chunkRegion = this.chunkRegions[id]
      chunkRegion.register("corpses", this)
    }
  }

  unregisterFromChunkRegions() {
    for (let id in this.chunkRegions) {
      let chunkRegion = this.chunkRegions[id]
      chunkRegion.unregister("corpses", this)
    }
  }

  onPositionChanged(options = {}) {
    if (this.isOutOfBounds()) {
      this.remove()
      return
    }

    this.repositionOnUnitMap()
    this.repositionOnUnitTree()
    this.updateFlowFieldsForSelf()

    if (options.isGridPositionChanged) {
      let platform = this.getStandingPlatform()

      if (platform && platform.isOnFire()) {
        this.addFire(3)
      }
      this.registerToChunkRegions(this.getChunkRegions())
    }

    if (options.isChunkPositionChanged) {
      this.getSocketUtil().broadcast(this.sector.getSocketIds(), "ChunkPositionChanged", { row: options.chunkRow, col: options.chunkCol, entityId: this.getId() })
    }


    this.onStateChanged()
  }

  getStandingPlatform() {
    return this.getContainer().getStandingPlatformFromBounds(this.getBoundingBox())
  }

  repositionOnUnitTree() {
    this.getSector().removeEntityFromTreeByName(this, "units")
    this.getSector().insertEntityToTreeByName(this, "units")
  }

  applyFireDamage() {
    this.burnCounter += 1
    if (this.burnCounter >= this.BURN_TO_ASH_THRESHOLD) {
      this.setHealth(0) // trigger callbacks
      this.remove()

      if (this.fireIgnitedBy && this.fireIgnitedBy.isPlayer()) {
        let player = this.fireIgnitedBy
        // player.progressTutorial("corpse", 0)
      }
    }
  }

  // for pathfinder to treat player mob goal as platform
  getTileType() {
    return Buildings.SteelFloor.getType()
  }

  getTypeName() {
    return Helper.getMobNameById(this.getType())
  }

}

Object.assign(Corpse.prototype, ShipMountable.prototype, {
  getRelativeX() {
    return this.relativePosition[0]
  },
  getRelativeY() {
    return this.relativePosition[1]
  }
})


Object.assign(Corpse.prototype, Destroyable.prototype, {
  getMaxHealth() {
    return 1
  }
})

module.exports = Corpse
