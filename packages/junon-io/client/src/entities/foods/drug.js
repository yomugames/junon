const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class Drug extends BaseFood {

  constructor(game, data) {
    super(game, data)
    this.applyDrugTint()
  }

  getInventoryImageStyle() {
    return {
      width: '75%',
      height: '75%',
      transform: 'translate(-50%, -50%) scale(1.4,1.4)'
    }
  }

  syncWithServer(data) {
    super.syncWithServer(data)
    this.data.instance = data.instance
    this.applyDrugTint()
  }

  applyDrugTint() {
    let tint = this.data.instance && this.data.instance.drugTint
    if (typeof tint === "string") {
      tint = tint.replace(/^#/, "")
    }
    if (tint && /^[0-9a-f]{6}$/i.test(tint)) {
      this.sprite.tint = parseInt(tint, 16)
    }
  }

  static getDescription(content) {
    if (content) return content

    return super.getDescription()
  }

  getSpritePath() {
    return 'drug_bottle_full.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Drug
  }

  getConstantsTable() {
    return "Foods.Drug"
  }

}

module.exports = Drug
