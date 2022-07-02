const mergeWith = require("lodash/mergeWith")
const Constants = require("./../constants")
const Helper = require("./../helper")

let FlatConstants = JSON.parse(JSON.stringify(Constants))

let groups = ["Terrains", "Buildings", "Crops", "Equipments", "Mobs", 
              "Projectiles", "Bars", "Ores", "Ammos", "Drinks", "Foods", "Walls", "Floors", "Effects", "Transports"]

groups.forEach((group) => {
  for (let key in FlatConstants[group]) {
    if (FlatConstants[group][key].parent) {
      FlatConstants[group][key] = buildConstants(FlatConstants[group][key])
    }

    FlatConstants[group + "." + key] = FlatConstants[group][key]
  }
})

function buildConstants(table) {
  if (table.parent) {
    let parentTable = buildConstants(Helper.getAttribute(Constants, table.parent))
    let combinedTable = mergeWith({}, parentTable, table, Helper.combineArrays)
    if (!table["abstract"]) {
      // dont inherit abstract field
      delete combinedTable["abstract"]
    }
    return combinedTable
  } else {
    return table
  }
}

const Definable = () => {
}

Definable.prototype = {
  getConstants() {
    let constantsTable = this.getConstantsTable()
    if (constantsTable) {
      return FlatConstants[constantsTable]
    } else {
      return {}
    }
  },

  getConstantsTable() {
    return null // none by default
  }
}

module.exports = Definable

