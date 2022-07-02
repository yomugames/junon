const SocketUtil = require("../../util/socket_util")
const Node = require("./node")

class ActionValue extends Node {
  constructor(actionEntry, data) {
    super(actionEntry.game, data)

    this.actionEntry = actionEntry

    this.value = data.value

    this.el = this.createEl()
    this.el.addEventListener("click", this.onContainerClick.bind(this), true)

    this.actionEntry.addActionValue(this)
  }

  finishAdd(data) {
    this.value = data.value
    this.replaceId(data.id)

    this.redraw()
  }

  onContainerClick(e) {
    if (e.target.classList.contains("edit_action_value_btn")) {
      let row = e.target.closest(".action_value_list_row")
      this.enterEditMode()
    } else if (e.target.classList.contains("delete_action_value_btn")) {
      if (this.isTempId()) {
        this.remove()
      } else {
        this.submitDelete()
      }
    }
  }

  focusInput() {
    this.el.querySelector("input").focus()
  }

  createEl(options = {}) {
    let row = document.createElement("div")
    row.dataset.id = this.id
    row.classList.add("action_value_list_row")

    let content = document.createElement("div")
    content.classList.add("row_content")
    content.innerText = this.value || ""

    let input = this.createActionValueInput(this.value)

    let editBtn = document.createElement("img")
    editBtn.classList.add("edit_action_value_btn")
    editBtn.src = "/assets/images/edit_icon.png"

    let deleteBtn = document.createElement("img") 
    deleteBtn.classList.add("delete_action_value_btn")
    deleteBtn.src = "/assets/images/trash_icon.png"

    row.appendChild(content)
    row.appendChild(input)

    row.appendChild(editBtn)
    row.appendChild(deleteBtn)

    this.actionEntry.appendChildEl(row)

    return row
  }

  createActionValueInput(value) {
    value = value || ""
    let width = value.length < 15 ? 15 : value.length
    let input = document.createElement("input")
    input.classList.add("black_input")
    input.addEventListener("keyup", this.onActionValueInputKeyup.bind(this), true)
    input.addEventListener("input", this.onActionValueInputChange.bind(this), true)
    input.addEventListener("blur", this.onActionValueInputBlur.bind(this), true)
    input.value = value
    input.style.width = width + "ch"

    return input
  }

  onActionValueInputChange(e) {
    let value = e.target.value
    let input = e.target

    value = value || ""
    let width = value.length < 15 ? 15 : value.length

    input.style.width = width + "ch"
  }

  redraw() {
    this.el.querySelector(".row_content").innerText = this.value
    this.el.querySelector("input").value = this.value
    this.exitEditMode()
  }

  onActionValueInputBlur(e) {
    let inputValue = e.target.value
    this.submitActionValueChange(inputValue)
  }

  onActionValueInputKeyup(e) {
    if (e.which === 13) {
      // enter
      let inputValue = e.target.value
      this.submitActionValueChange(inputValue)
    } else if (e.which === 27) {
      //esc
      this.exitEditMode()
    }
  }

  showActionValueEditError() {

  }

  exitEditMode() {
    this.el.classList.remove("edit_mode")
  }

  enterEditMode() {
    this.el.classList.add("edit_mode")
    this.focusInput()
  }

  getAction() {
    return this.actionEntry.actionKey
  }

  submitActionValueChange(value) {
    let data = {
      value: value
    }

    if (this.isTempId()) {
      data.operation = "add"
      data.tempId = this.id
      data.parentId = this.actionEntry.id
    } else {
      data.operation = "edit"
      data.id = this.id
    }


    SocketUtil.emit("EditCommandBlock", data)
  }

  edit(value) {
    this.value = value
    this.redraw()
  }

  remove() {
    super.remove()
    this.actionEntry.removeActionValue(this)
  }

}

module.exports = ActionValue