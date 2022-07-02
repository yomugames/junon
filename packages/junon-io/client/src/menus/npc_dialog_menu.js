const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Mobs = require("./../entities/mobs/index")
const Ores = require("./../entities/ores/index")
const Item = require("./../entities/item")
const Buildings = require("./../entities/buildings/index")
const Equipments = require("./../entities/equipments/index")
const Helper = require("./../../../common/helper")

/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class NPCDialogMenu extends BaseMenu {
  onMenuConstructed() {
    this.el.querySelector(".confirm_npc_choice_btn").addEventListener("click", this.onChoiceConfirmClick.bind(this), true)
    this.el.querySelector(".npc_choices_container").addEventListener("click", this.onChoiceItemClick.bind(this) , true)
  }

  onChoiceItemClick(e) {
    let npcChoice = e.target.closest(".npc_choice")
    if (npcChoice) {
      if (this.selectedChoice) {
        this.selectedChoice.classList.remove("selected")
      }

      this.selectedChoice = npcChoice
      this.selectedChoice.classList.add("selected")
    }
  }

  onChoiceConfirmClick() {
    if (!this.selectedChoice) return

    let choice = this.selectedChoice.dataset.choice
    SocketUtil.emit("NPCClientMessage", { entityId: this.entityId, choice: choice })
  }

  open(choicesHTML, options = {}) {
    super.open()

    this.el.querySelector(".menu_main_header").innerText = options.title
    this.el.querySelector(".npc_choices_container").innerHTML = choicesHTML
    this.el.querySelector(".confirm_npc_choice_btn").style.display = 'block'    

    this.entityId = options.entityId
    this.team = options.team
    this.renderPaymentAmount()
  }

  getPaymentAmount() {
    let paymentAmount = 100 * Math.ceil(this.team.dayCount / 3) 
    paymentAmount = Math.max(0, paymentAmount)
    paymentAmount = Math.min(5000, paymentAmount)
    return paymentAmount
  }

  hideConfirm() {
    this.el.querySelector(".confirm_npc_choice_btn").style.display = 'none'    
  }

  renderPaymentAmount() {
    if (!this.el.querySelector(".payment_amount")) return

    let paymentAmount = this.getPaymentAmount()

    this.el.querySelector(".payment_amount").innerText = paymentAmount
  }

}

module.exports = NPCDialogMenu