const Node = require("../node")
const ActionContainer = require("../action_container")

class Else extends Node {

  constructor(parent, data, render) {
    super(parent.game, data)

    this.parent = parent
    if(render) {
      this.el = this.createEl()
      this.el.querySelector(".add_action_btn").addEventListener("click", this.onAddActionBtnClick.bind(this), true)
    } 

    this.initActionContainer(data)
  }

  onAddActionBtnClick() {
    this.game.commandBlockPicker.open({ mode: "actions", parent: this })
  }

  createEl() {
    let row = document.createElement("div")
    row.classList.add('else')
    row.classList.add('tab_1')
    row.dataset.id = this.id
    row.innerText = "Else:"

    let addActionBtn = document.createElement("img")
    addActionBtn.classList.add("add_action_btn")
    addActionBtn.src = "/assets/images/add_icon.png"
    row.appendChild(addActionBtn)

    this.parent.appendChildEl(row)
    return row
  }

  getNodeValue() {
    return "else"
  }

  getNodeType() {
    return "else"
  }

}

Object.assign(Else.prototype, ActionContainer.prototype, {
})


module.exports = Else
