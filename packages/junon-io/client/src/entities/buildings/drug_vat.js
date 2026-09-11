const BaseBuilding = require("./base_building")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const Drainable = require("../../../../common/interfaces/drainable")
const LiquidPipe = require("./liquid_pipe")
const ClientHelper = require("../../util/client_helper")

class DrugVat extends BaseBuilding {

 onBuildingConstructed() {
    super.onBuildingConstructed()

    this.initDrainable()
  }

  getType() {
    return Protocol.definition().BuildingType.DrugVat
  }

  getBuildingSprite() {
    let sprite = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache["drug_vat_base.png"])
    this.baseSprite.name = "TankBase"
    this.baseSprite.anchor.set(0.5)

    this.tankRidge = new PIXI.Sprite(PIXI.utils.TextureCache["drug_vat_lid.png"])
    this.tankRidge.name = "TankRidge"
    this.tankRidge.anchor.set(0.5)

    this.tankLiquid = new PIXI.Sprite(PIXI.utils.TextureCache["drug_vat_liquid.png"])
    this.tankLiquid.name = "TankLiquid"
    this.tankLiquid.anchor.set(0.5)
    this.tankLiquid.width = 0
    this.tankLiquid.height = 0
    this.applyDrugTint()

    sprite.addChild(this.baseSprite)
    sprite.addChild(this.tankLiquid)
    sprite.addChild(this.tankRidge)

    return sprite
  }

  getLiquidMaxWidth() {
    return 47
  }

  getSpritePath() {
    return "drug_vat.png"
  }

  onUsageChanged() {
    const usageRate = this.getUsage() / this.getUsageCapacity()

    this.tankLiquid.width = usageRate * this.getLiquidMaxWidth()
    this.tankLiquid.height = usageRate * this.getLiquidMaxWidth()
    this.applyDrugTint()
  }

  applyDrugTint() {
    if (!this.tankLiquid) return

    let tint = typeof this.drugTint === "undefined" ? this.data.drugTint : this.drugTint
    if (typeof tint === "string") {
      tint = tint.replace(/^#/, "")
    }

    this.tankLiquid.tint = tint && /^[0-9a-f]{6}$/i.test(tint) ? ClientHelper.hexToInt(tint) : 0xffffff
  }

  setDrugTint(drugTint) {
    this.drugTint = drugTint
    this.applyDrugTint()
  }

  onDrugTintChanged() {
    this.applyDrugTint()
  }

  onDrugEffectsChanged() {
    this.applyDrugTint()
  }

  getConstantsTable() {
    return "Buildings.DrugVat"
  }

  getStorageStat(name, unit = "") {
    let capacity = this.getResourceCapacity(name)
    let usage = this.getUsage()

    const el = "<div class='entity_stats_entry'>" +
                      "<div class='stats_type'>" + i18n.t('Stored') + ":</div>" +
                      "<div class='stats_value'>" + usage + "/" + capacity + " " + unit + "</div>" +
                  "</div>"
    return el
  }

}

module.exports = DrugVat
