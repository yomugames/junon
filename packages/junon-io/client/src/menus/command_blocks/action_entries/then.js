const Node = require("../node")
const ActionContainer = require("../action_container")

class Then extends Node {
  constructor(parent, data) {
    super(parent.game, data)

    this.parent = parent
    this.el = this.createEl()

    this.el.querySelector(".add_action_btn").addEventListener("click", this.onAddActionBtnClick.bind(this), true)

    this.initActionContainer(data)
  }

  createEl() {
    let row = document.createElement("div")
    row.classList.add('then')
    row.classList.add('tab_1')
    row.dataset.id = this.id
    row.innerText = "Then:"

    let addActionBtn = document.createElement("img")
    addActionBtn.classList.add("add_action_btn")
    addActionBtn.src = "/assets/images/add_icon.png"
    row.appendChild(addActionBtn)

    this.parent.appendChildEl(row)
    return row
  }

  onAddActionBtnClick() {
    this.game.commandBlockPicker.open({ mode: "actions", parent: this })
  }

  getNodeValue() {
    return "then"
  }

  getNodeType() {
    return "then"
  }


}

Object.assign(Then.prototype, ActionContainer.prototype, {
})


module.exports = Then
