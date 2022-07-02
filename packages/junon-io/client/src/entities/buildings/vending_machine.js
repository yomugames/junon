const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class VendingMachine extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getEntityMenuStats() {
    let el = super.getEntityMenuStats()

    el += this.getTotalGoldStat()

    return el
  }

  getTotalGoldStat() {
    let totalGold = this.content ? this.content : 0
    let el = "<div class='entity_stats_entry vending_machine_total_gold_entry'>" +
                  "<div class='stats_type'>" + i18n.t('Total Gold') + ":</div>" +
                  "<div class='stats_value'>" + totalGold  + "</div>" +
              "</div>"
    return el
  }

  getActions() {
    const withdraw = "<div class='vending_widthdraw_btn ui_btn' data-action='vending_withdraw'>" + i18n.t("Withdraw") + "</div>"

    let actions = ""

    let team = this.game.player.getTeam()
    if (this.game.isLeaderAndOwner(this, team, this.game.player)) {
      actions += withdraw
    }

    return actions
  }

  onContentChanged() {
    if (this.game.vendingMachineMenu.entity === this) {
      this.game.vendingMachineMenu.updateStorageGoldAmount()
    }

    if (this.game.entityMenu.isOpen(this)) {
      this.game.entityMenu.update(this)
    }
  }


}

module.exports = VendingMachine
