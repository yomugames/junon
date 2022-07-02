const LandMob = require('./land_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Interpolator = require("./../../util/interpolator")
const Equipper  = require("./../../../../common/interfaces/equipper")

class Messenger extends LandMob {
  constructor(game, data) {
    super(game, data)

    this.initEquipper()
  }

  openMenu() {
    this.game.npcDialogMenu.open(this.getNpcChoicesHTML(), { 
      title: i18n.t("Messenger"),
      team: this.game.player.getTeam(), 
      entityId: this.id 
    })

    if (typeof this.npcChoice !== 'undefined') {
      this.game.npcDialogMenu.hideConfirm()
    }
  }

  onHighlighted() {
    if (typeof this.npcChoice === 'undefined') {
      this.createChatBubble(i18n.t('Messenger.DemandPayment'))
    }
  }

  getNpcChoicesHTML() {
    if (this.npcChoice === 1) {
      return i18n.t('Messenger.RightChoice')
    } else if (this.npcChoice === 2) {
      return i18n.t('Messenger.Blasphemy')
    }

    return "<div data-choice='1' class='npc_choice'>1. " + i18n.t('Messenger.Choices.ProceedPay', { gold: "<span class='payment_amount'></span>"}) + "</div>" + 
           "<div data-choice='2' class='npc_choice'>2. " + i18n.t('Messenger.Choices.RefusePay') + "</div>"
  }

  getBaseRotationOffset() {
    return 0 * PIXI.DEG_TO_RAD
  }

  getWidth() {
    return 40
  }

  getHeight() {
    return 40
  }

  isInteractable() {
    return true
  }

  getConstantsTable() {
    return "Mobs.Messenger"
  }

  getType() {
    return Protocol.definition().MobType.Messenger
  }

  shouldShowOwner() {
    return false
  }

}

Object.assign(Messenger.prototype, Equipper.prototype, {
  getDefaultSpriteColor() {
    return 0x777777
  },
  getBodySpriteTint() {
    return 0x777777
  }
})


module.exports = Messenger

