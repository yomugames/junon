const fs = require('fs')
const Buildings = require("./buildings/index")
const Helper = require("./../../common/helper")
const _ = require("lodash")

class Blueprint {
  constructor(blueprintData) {
    this.platforms = {}
    this.armors = {}
    this.distributions = {}
    this.structures = {}
    this.units = {}

    this.isInProgress = false

    this.import(blueprintData)
  }

  register(group, data) {
    const typeName = typeof data.type === "string" ? data.type : Helper.getTypeNameById(data.type)
    const id = this.getBlueprintItemKey(data)

    const item = {
      type: typeName,
      x: data.x,
      y: data.y,
      angle: data.angle,
    }

    if (data.health) {
      item.health = data.health
    }

    if (data.owner) {
      item.owner = data.owner.getName()
    }

    if (data.storage) {
      item.storage = data.storage
    }

    if (data.content) {
      item.content = data.content
    }

    if (data.usage) {
      item.usage = data.usage
    }

    if (data.isHarvestable) {
      item.isHarvestable = data.isHarvestable
    }

    this[group][id] = item

    return item
  }

  getBlueprintItemKey(data) {
    let type = data.type

    if (typeof data.type === "string") {
      type = Helper.getBuildingTypeByName(data.type)
    }

    return [type, data.x, data.y].join("-")
  }

  unregister(group, data) {
    const id = this.getBlueprintItemKey(data)
    delete this[group][id]
  }

  addOffset(data, offset) {
    data.x += offset.x
    data.y += offset.y
  }

  applyTo(container, offset, owner) {
    this.isInProgress = true

    for (let buildingId in this.platforms) {
      let data = this.platforms[buildingId]
      if (owner) data.owner = owner
      if (offset) this.addOffset(data, offset)
      container.placeBuilding(data)
    }

    for (let buildingId in this.armors) {
      let data = this.armors[buildingId]
      if (owner) data.owner = owner
      if (offset) this.addOffset(data, offset)
      container.placeBuilding(data)
    }

    for (let buildingId in this.structures) {
      let data = this.structures[buildingId]
      if (owner) data.owner = owner
      if (offset) this.addOffset(data, offset)
      container.placeBuilding(data)
    }

    for (let buildingId in this.units) {
      let data = this.units[buildingId]
      if (owner) data.owner = owner
      if (offset) this.addOffset(data, offset)
      container.placeBuilding(data)
    }

    for (let buildingId in this.distributions) {
      let data = this.distributions[buildingId]
      if (owner) data.owner = owner
      if (offset) this.addOffset(data, offset)

      container.placeBuilding(data)
    }

    this.isInProgress = false
  }

  import(blueprintData) {
    this.rowCount = blueprintData.rowCount
    this.colCount = blueprintData.colCount

    for (let group in blueprintData.components) {
      let items = blueprintData.components[group]
      items.forEach((data) => {
        this.register(group, data)
      })
    }
  }

  getComponents(owner) {
    let components = {
      platforms: Object.values(this.platforms),
      armors: Object.values(this.armors),
      structures: Object.values(this.structures),
      units: Object.values(this.units),
      distributions: Object.values(this.distributions)
    }

    if (owner) {
      for (let group in components) {
        components[group] = components[group].filter((building) => {
          return building.owner === owner.getName()
        }).map((building) => {
          return _.omit(building, 'owner')
        })
      }
    }

    return components
  }

  export(filename, owner) {
    const data = {
      rowCount: this.rowCount,
      colCount: this.colCount,
      components: this.getComponents(owner)
    }

    const indentation = 4
    let result = JSON.stringify(data, null, indentation)
    if (!result) {
      console.log("error saving file")
      return
    }

    fs.writeFile(filename, result, (err) => {
      if (err) throw err

      console.log("ship design saved")
    })
  }
}

module.exports = Blueprint
