const Constants = require('../../common/constants.json')
const BaseTransientEntity = require("./base_transient_entity")
const BoundingBox = require("../../common/interfaces/bounding_box")

class Region extends BaseTransientEntity {
  constructor(sector, data = {}) {
    super(sector.game)
    this.sector = sector

    this.applyData(data)

    this.sector.regions[this.name] = this
  }

  applyData(data) {
    this.name = data.name

    if (data.hasOwnProperty("x")) {
      this.x = data.x
      this.y = data.y
      this.w = data.w
      this.h = data.h
      this.onDimensionsChanged()
    }

    if (data.flags) {
      this.flags = data.flags
    } else {
      this.flags = {
      }
    }
  }

  static isBoundsValid(sector, startRow, startCol, endRow, endCol) {
    if (isNaN(startRow) || isNaN(startCol) || isNaN(endRow) || isNaN(endCol)) return false

    if (sector.isOutOfBounds(startRow, startCol) ||
        sector.isOutOfBounds(endRow, endCol)) return false

    if (Math.abs(startRow - endRow) < 0) return false
    if (Math.abs(startCol - endCol) < 0) return false

    return true
  }

  setName(name) {
    this.name = name
  }

  setDimensions(startRow, startCol, endRow, endCol) {
    let isNew = !this.w

    this.w = (Math.abs(startCol - endCol) + 1) * Constants.tileSize
    this.h = (Math.abs(startRow - endRow) + 1) * Constants.tileSize
    this.x = ((startCol + endCol + 1) / 2)   * Constants.tileSize
    this.y = ((startRow + endRow + 1) / 2)   * Constants.tileSize

    if (!isNew) {
      this.sector.removeEntityFromTreeByName(this, "regions")
    }

    this.onDimensionsChanged()
    this.onStateChanged()
  }

  onDimensionsChanged() {
    this.updateRbushCoords()
    this.sector.insertEntityToTree(this, this.sector.regionTree)
  }

  isHangar() {
    return false
  }

  setData(data) {
    this.body.position[0] = data.x
    this.body.position[1] = data.y
    this.setXYFromBodyPosition()
    this.w = data.w
    this.h = data.h
  }

  getWidth() {
    return this.w
  }

  getHeight() {
    return this.h
  }

  getStart() {
    return {
      x: this.getX() - this.getWidth()  / 2,
      y: this.getY() - this.getHeight() / 2
    }
  }

  getRowCount() {
    return this.getHeight() / Constants.tileSize
  }

  getColCount() {
    return this.getWidth() / Constants.tileSize
  }

  getCollisionGroup() {
    return Constants.collisionGroup.Ground
  }

  getCollisionMask() {
    return 0
  }

  rename(name, newName) {
    delete this.sector.regions[this.name]

    this.setName(newName)

    this.sector.regions[this.name] = this
    this.onStateChanged()
  }

  remove() {
    delete this.sector.regions[this.name]
    this.sector.removeEntityFromTreeByName(this, "regions")
    super.remove()

    this.clientMustDelete = true
    this.onStateChanged()
  }

  toJson() {
    return {
      id: this.id,
      x: this.getX(),
      y: this.getY(),
      w: this.getWidth(),
      h: this.getHeight()
    }
  }

  setFlag(key, value) {
    this.flags[key] = value

    this.onStateChanged()
  }

  getFlag(key) {
    return this.flags[key]
  }

  onWorldPostStep() {

  }

  prettyPrintFlags() {
    let result = []

    for (let key in this.flags) {
      let value = this.flags[key]
      result.push(`${key}:${value}`)
    }

    return result.join(" ")
  }

  getContainer() {
    return this.sector
  }

  onEntityLeave(entity) {
    let data = {
      entityId: entity.getId(),
      region: this.name,
      player: "",
      playerRole: "",
      entityType: ""
    }

    if (entity.isPlayer()) {
      data['player'] = entity.name
      data['playerRole'] = entity.getRoleName()
    } else if (entity.isMob()) {
      data['entityType'] = entity.getTypeName()
    }

    this.game.triggerEvent("RegionLeave", data)
  }

  onEntityEnter(entity) {
    let data = {
      entityId: entity.getId(),
      region: this.name,
      player: "",
      playerRole: "",
      entityType: ""
    }

    if (entity.isPlayer()) {
      data['player'] = entity.name
      data['playerRole'] = entity.getRoleName()
    } else if (entity.isMob()) {
      data['entityType'] = entity.getTypeName()
    }

    this.game.triggerEvent("RegionEnter", data)
  }

  onStateChanged() {
    this.game.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.getSocket(), "RegionUpdated", { region: this })
    })
  }

  getAllBoundedEntities() {
    let buildings = this.sector.buildingTree.search(this.getBoundingBox())
    let mobs = this.sector.mobTree.search(this.getBoundingBox())

    return mobs.concat(buildings)
  }

  getPlayerCount() {
    let players = this.sector.playerTree.search(this.getBoundingBox())
    return players.length
  }

  getMemberNamesJson() {
    let players = this.sector.playerTree.search(this.getBoundingBox())
    return players.length
  }
  
  getBuildings() {
    return this.sector.buildingTree.search(this.getBoundingBox())
  }

  getMobs() {
    return this.sector.mobTree.search(this.getBoundingBox())
  }

  getPlayers() {
    return this.sector.playerTree.search(this.getBoundingBox())
  }

  getEntitiesByGroup(group) {
    if (group === "players") return this.getPlayers()
    if (group === "buildings") return this.getBuildings()
    if (group === "mobs") return this.getMobs()
  }

}


Object.assign(Region.prototype, BoundingBox.prototype, {
  getX() {
    return this.x
  },
  getY() {
    return this.y
  },
  getWidth() {
    return this.w - Constants.tileSize/2
  },
  getHeight() {
    return this.h - Constants.tileSize/2
  }
})

module.exports = Region
