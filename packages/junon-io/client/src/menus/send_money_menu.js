const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class SendMoneyMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

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

    SocketUtil.emit("SendMoney", { playerId: this.targetPlayer.id, gold: gold })
  }

  updateGoldCount(gold, delta) {
    this.el.querySelector(".player_gold_count_value").innerText = gold || 0

    if (this.isOpen()) {
      this.animateGoldChanged(delta)
    }
  }

  animateGoldChanged(delta) {
    let data = {}
    let rect = this.el.querySelector(".send_money_btn").getBoundingClientRect()
    data.y = rect.top - 20
    data.x = rect.left + 50

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
          document.body.removeChild(text)
        })
        .start()
  }

  open(options = {}) {
    super.open(options)

    this.targetPlayer = options.receiver
    this.render()
  }

  render() {
    let gold = this.game.player.gold
    this.el.querySelector(".recepient_name").innerText = this.targetPlayer.name
    this.el.querySelector(".player_gold_count_value").innerText = gold
  }


}



module.exports = SendMoneyMenu 