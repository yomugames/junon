const ActionEntry = require("./action_entry")
const Helper = require("../../../../../common/helper")
const ActionContainer = require("../action_container")

class Repeat extends ActionEntry {

  constructor(parent, data) {
    super(parent, data)

    // handleActionValues() has already run, so times is available
    this.redraw()

    this.el.querySelector(".add_action_btn")
      .addEventListener("click", this.onAddActionBtnClick.bind(this), true)
  }

  handleActionValues(data) {
    this.times = 5

    this.initActionContainer(data)
  }

  enterEditMode() {
    let label = this.el.querySelector(".repeat_label")

    let input = document.createElement("input")
    input.type = "number"
    input.min = 1
    input.value = this.times
    input.style.width = "50px"

    label.replaceWith(input)

    input.focus()
    input.select()

    const finish = () => {
        this.times = Math.max(1, parseInt(input.value) || 1)
        this.redraw()
    }

    input.addEventListener("blur", finish)

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            finish()
        }
    })
  }

  onContainerClick(e) {
    if (e.target.classList.contains("repeat_label")) {
        this.enterEditMode()
        return
    }
    if (e.target.classList.contains("delete_action_btn")) {
      let id = parseInt(e.target.closest(".action_entry").dataset.id)
      if (id !== this.id) return

      if (this.isTempId()) {
        this.remove()
      } else {
        this.submitDelete()
      }
    }
  }

  onAddActionBtnClick() {
    this.game.commandBlockPicker.open({
      mode: "actions",
      parent: this
    })
  }

  redraw() {
    let old = this.el.querySelector(".repeat_label, input")

    let label = document.createElement("div")
    label.classList.add("action_key")
    label.classList.add("repeat_label")
    label.innerText =
        `${Helper.capitalize(this.actionKey)} (${this.times}x)`

    old.replaceWith(label)
  }

  createEl() {
    let row = document.createElement("div")
    row.dataset.id = this.id
    row.classList.add("action_entry")
    row.classList.add("tab_1")

    let actionKey = document.createElement("div")
    actionKey.classList.add("action_key")
    actionKey.classList.add("repeat_label")
    actionKey.innerText = `${Helper.capitalize(this.actionKey)} (${this.times}x)`

    let addActionBtn = document.createElement("img")
    addActionBtn.classList.add("add_action_btn")
    addActionBtn.src = "/assets/images/add_icon.png"

    let actionValue = document.createElement("div")
    actionValue.classList.add("action_value")
    actionValue.classList.add("tab_1")

    let actionValueList = document.createElement("div")
    actionValueList.classList.add("action_value_list")
    actionValue.appendChild(actionValueList)

    let deleteBtn = document.createElement("img")
    deleteBtn.classList.add("delete_action_btn")
    deleteBtn.src = "/assets/images/trash_icon.png"

    row.appendChild(deleteBtn)
    row.appendChild(actionKey)
    row.appendChild(addActionBtn)
    row.appendChild(actionValue)

    this.parent.appendChildEl(row)

    return row
  }

}

Object.assign(Repeat.prototype, ActionContainer.prototype, {})

module.exports = Repeat