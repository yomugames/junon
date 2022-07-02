const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Table = require("./table")
const ProgressBar = require("./../../components/progress_bar")

class ButcherTable extends Table {

  getType() {
    return Protocol.definition().BuildingType.ButcherTable
  }

  getSpritePath() {
    return "butcher_table.png"
  }

  getConstantsTable() {
    return "Buildings.ButcherTable"
  }

  onUsageChanged() {
    if (this.isButcheringComplete()) {
      this.initButcherProgressBar()
      this.butcherProgressBar.remove()
      this.butcherProgressBar = null
    } else {
      this.initButcherProgressBar()
      this.butcherProgressBar.draw()
    }
  }

  isButcheringComplete() {
    return this.usage >= 100 || this.usage === 0
  }

  initButcherProgressBar() {
    if (this.butcherProgressBar) return

    this.butcherProgressBar = new ProgressBar(this, { 
      attribute: "usage", 
      maxAttribute: "getUsageCapacity", 
      isFixedPosition: true,
      displayOnTop: true
    })
  }

}

module.exports = ButcherTable
