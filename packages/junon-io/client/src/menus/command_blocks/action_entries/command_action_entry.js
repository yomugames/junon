const ActionEntry = require("./action_entry")
const Helper = require("../../../../../common/helper")
const Command = require("../command")

class CommandActionEntry extends ActionEntry {
  handleActionValues(data) {
    this.actionValues = []
    this.parseActionValues(data.actionValues)
  }

  parseActionValues(list) {
    if (!list) return

    for (var i = 0; i < list.length; i++) {
      let item = list[i]
      new Command(this, item)
    }
  }

  addActionValue(actionValue) {
    this.actionValues.push(actionValue)
  }

  removeActionValue(actionValue) {
    let index = this.actionValues.indexOf(actionValue)
    if (index !== -1) {
      this.actionValues.splice(index, 1)
    }
  }

  onContainerClick(e) {
    if (e.target.classList.contains("add_action_value_btn")) {
      if (!this.hasPendingActionValue()) {
        this.createActionValue()
      }
    } else if (e.target.classList.contains("delete_action_btn")) {
      let id = parseInt(e.target.closest(".action_entry").dataset.id)
      if (id !== this.id) return

      if (this.isTempId()) {
        this.remove()
      } else {
        this.submitDelete()
      }
    }
  }

  hasPendingActionValue() {
    return this.actionValues.find((actionValue) => {
      return actionValue.isTempId()
    })
  }

  createActionValue() {
    let container = this.el.querySelector(".action_value_list")
    let actionValue = new Command(this, {})
    actionValue.enterEditMode()
  }

  createEl() {
    let row = document.createElement("div")
    row.dataset.id = this.id
    row.classList.add("action_entry")
    row.classList.add("tab_1")

    let actionKey = document.createElement("div")
    actionKey.classList.add("action_key")
    actionKey.innerText = Helper.capitalize(this.actionKey)

    let addActionValueBtn = document.createElement("img")
    addActionValueBtn.classList.add("add_action_value_btn")
    addActionValueBtn.src = "/assets/images/add_icon.png"
    
    let actionValueEl = document.createElement("div")
    actionValueEl.classList.add("action_value")
    actionValueEl.classList.add("tab_1")

    let actionValueList = document.createElement("div")
    actionValueList.classList.add("action_value_list")
    actionValueEl.appendChild(actionValueList)

    let deleteBtn = document.createElement("img")
    deleteBtn.classList.add("delete_action_btn")
    deleteBtn.src = "/assets/images/trash_icon.png"

    row.appendChild(deleteBtn)
    row.appendChild(actionKey)
    row.appendChild(addActionValueBtn)
    row.appendChild(actionValueEl)

    this.parent.appendChildEl(row)

    return row
  }


}

module.exports = CommandActionEntry