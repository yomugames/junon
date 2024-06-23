const Helper = require("../../../../../common/helper")
const ActionEntry = require("./action_entry")
const SocketUtil = require("../../../util/socket_util")
const If = require("./if")
const Else = require("./else")
const Then = require("./then")


class IfThenElse extends ActionEntry {
  handleActionValues(data, render) {
    data.ifthenelse = data.ifthenelse || { if: [], else: [], then: [] }

    this.ifthenelse = {
      if: new If(this, data.ifthenelse.if, render),
      then: new Then(this, data.ifthenelse.then, render),
      else: new Else(this, data.ifthenelse.else, render)
    }
  }

  finishAdd(data) {
    this.actionKey = data.value
    this.replaceId(data.id)
    this.redraw()

    this.ifthenelse.if.submitSave()
    this.ifthenelse.else.submitSave()
    this.ifthenelse.then.submitSave()
  }

  redraw() {
    this.el.querySelector(".action_key").innerText = Helper.capitalize(this.actionKey)
  }

  onContainerClick(e) {
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

  createEl() {
    let row = document.createElement("div")
    row.dataset.id = this.id
    row.classList.add("action_entry")
    row.classList.add("ifthenelse")
    row.classList.add("tab_1")

    let actionKey = document.createElement("div")
    actionKey.classList.add("action_key")
    actionKey.innerText = "IfThenElse"

    row.appendChild(actionKey)

    let deleteBtn = document.createElement("img")
    deleteBtn.classList.add("delete_action_btn")
    deleteBtn.src = "/assets/images/trash_icon.png"

    row.appendChild(deleteBtn)

    this.parent.appendChildEl(row)

    return row
  }

  appendChildEl(el) {
    this.el.appendChild(el)
  }

}

module.exports = IfThenElse