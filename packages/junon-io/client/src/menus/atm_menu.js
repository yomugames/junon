const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class AtmMenu extends BaseMenu {
  onMenuConstructed() {
    let tab = document.querySelector(".atm_tab.selected").dataset.tab
    this.activeTabContent = document.querySelector(".atm_content[data-tab='" + tab + "']")
    this.activeTabContent.style.display = 'block'
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".atm_withdraw_btn").addEventListener("click", this.onAtmWithdrawBtnClick.bind(this))
    this.el.querySelector(".atm_deposit_btn").addEventListener("click", this.onAtmDepositBtnClick.bind(this))

    this.el.querySelector(".atm_tab_container").addEventListener("click", this.onAtmTabClick.bind(this), true)

    this.el.querySelector(".send_money_btn").addEventListener("click", this.onSendMoneyBtnClick.bind(this))
    this.el.querySelector(".send_money_input").addEventListener("keyup", this.onSendMoneyInputKeyup.bind(this))
  }

  onSendMoneyInputKeyup(e) {
    if (e.key === "Enter") {
      this.sendMoney()
    }
  }

  onSendMoneyBtnClick(e) {
    this.sendMoney()
  }

  sendMoney() {
    let gold = parseInt(this.el.querySelector(".send_money_input").value)
    if (gold < 0) {
      this.game.displayError("Invalid Amount", { warning: true })
      return
    }

    let playerId = this.el.querySelector(".recepient_name_select").value
    if (!playerId) return

    SocketUtil.emit("SendMoney", { playerId: playerId, gold: gold })
  }


  onAtmTabClick(e) {
    this.selectTab(e.target)
  }

  selectTab(tabEl) {
    let tab = tabEl.dataset.tab
    if (!tab) return

    let selectedTab = this.el.querySelector(".atm_tab.selected")
    if (selectedTab) {
      selectedTab.classList.remove("selected")
    }

    tabEl.classList.add("selected")

    if (this.activeTabContent) {
      this.activeTabContent.style.display = 'none'
    }

    let tabContent = this.el.querySelector(".atm_content[data-tab='" + tab + "'")
    this.activeTabContent = tabContent
    this.activeTabContent.style.display = 'block'
  }

  onAtmWithdrawBtnClick(e) {
    let gold = parseInt(this.el.querySelector(".atm_money_input").value)
    if (isNaN(gold)) return
    // if (gold === 0) return
    // if (gold < 0) {
    //   this.game.displayError("Invalid Amount", { warning: true })
    //   return
    // }

    SocketUtil.emit("AtmAction", { action: 'withdraw', gold: gold })
  }

  onAtmDepositBtnClick(e) {
    let gold = parseInt(this.el.querySelector(".atm_money_input").value)
    if (isNaN(gold)) return
    // if (gold === 0) return
    // if (gold < 0) {
    //   this.game.displayError("Invalid Amount", { warning: true })
    //   return
    // }

    SocketUtil.emit("AtmAction", { action: 'deposit', gold: gold })
  }

  updateGoldCount(gold, delta) {
    this.el.querySelector(".local_gold_value").innerText = gold || 0
    this.el.querySelector(".player_gold_count_value").innerText = gold

    if (this.isOpen()) {
      this.animateGoldChanged(delta)
    }
  }

  open(options = {}) {
    super.open(options)

    this.entity = options.entity
    this.render()

  }

  updateBalance(balance) {
    this.el.querySelector(".atm_balance_value").innerText = balance
  }

  isNotAllowed() {
    return this.game.isHardcore()
  }

  render() {
    let accountTab = this.el.querySelector(".atm_tab[data-tab='account']")
    let transferTab = this.el.querySelector(".atm_tab[data-tab='transfer']")

    if (this.game.isPeaceful() || !this.game.isLoggedIn()) {
      accountTab.style.display = 'none'
      this.selectTab(transferTab)
    } else {
      accountTab.style.display = 'block'
      this.selectTab(accountTab)
    }

    if (this.isNotAllowed()) {
      this.el.querySelector(".atm_invalid_access").style.display = 'block'
      this.el.querySelector(".atm_invalid_access").innerText = i18n.t("ATM is disabled")

      this.el.querySelector(".atm_content_container").style.display = 'none'
    } else {
      this.el.querySelector(".atm_invalid_access").style.display = 'none'
      this.el.querySelector(".atm_content_container").style.display = 'block'
    }

    let gold = this.game.player.gold
    this.el.querySelector(".local_gold_value").innerText = gold
    this.el.querySelector(".player_gold_count_value").innerText = gold

    this.el.querySelector(".atm_balance_value").innerText = "Loading.."
    SocketUtil.emit("AtmAction", { action: 'balance' })

    this.renderSendMoneyRecipients()
  }

  renderSendMoneyRecipients() {
    let team = this.game.player.getTeam()
    if (!team) return

    this.el.querySelector(".recepient_name_select").innerHTML = ""

    for (let id in team.members) {
      let member = team.members[id]
      if (member.id !== this.game.player.id) {
        let option = "<option value='" + member.id + "'>" + member.name + "</option>"
        this.el.querySelector(".recepient_name_select").innerHTML += option
      }
    }
  }

  animateGoldChanged(delta) {
    let data = {}

    let activeTab = this.activeTabContent.dataset.tab
    let goldElKlass = activeTab === 'account' ? 'local_gold_value' : 'player_gold_count_value'
    let rect = this.el.querySelector("." + goldElKlass).getBoundingClientRect()
    data.y = rect.top - 20
    data.x = rect.left - 50

    let label = delta < 0 ? delta : "+" + delta
    let text = document.createElement("span")
    text.className = "gold_changed_label"
    text.innerText = label
    document.body.appendChild(text)

    text.style.top  = data.y + "px"
    text.style.left = data.x + "px"

    let position = { y: data.y }
    var tween = new TWEEN.Tween(position)
        .to({ y: data.y - 50 }, 1500)
        .onUpdate(() => {
          text.style.top = position.y + "px"
        })
        .onComplete(() => {
          if (text.parentElement) {
            text.parentElement.removeChild(text)
          }
        })
        .start()
  }


}



module.exports = AtmMenu
