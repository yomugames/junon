const ActionEntry = require("./action_entry")
const ActionContainer = require("../action_container")
const Helper = require("../../../../../common/helper")
const SocketUtil = require("../../../util/socket_util")

class Repeat extends ActionEntry {

  constructor(parent, data) {
    super(parent, data)

    this.el.querySelector(".add_action_btn")
      .addEventListener("click", this.onAddActionBtnClick.bind(this), true)
  }

  static create(parent, data) {
    if (!this.isValid(parent, data.actionKey)) return
    return new Repeat(parent, data)
  }

  static isValid(parent, actionKey) {
    return true
  }

  handleActionValues(data) {
    this.times = data.times
    this.initActionContainer(data)
  }

  createEl() {
    let row = document.createElement("div")
    row.dataset.id = this.id
    row.classList.add("action_entry")
    row.classList.add("tab_1")

    let deleteBtn = document.createElement("img")
    deleteBtn.classList.add("delete_action_btn")
    deleteBtn.src = "/assets/images/trash_icon.png"

    let actionKey = document.createElement("div")
    actionKey.classList.add("action_key")
    actionKey.innerText = Helper.capitalize(this.actionKey)

    let addActionBtn = document.createElement("img")
    addActionBtn.classList.add("add_action_btn")
    addActionBtn.src = "/assets/images/add_icon.png"

    let actionValue = document.createElement("div")
    actionValue.classList.add("action_value")
    actionValue.classList.add("tab_1")

    let actionValueList = document.createElement("div")
    actionValueList.classList.add("action_value_list")
    actionValue.appendChild(actionValueList)

    row.appendChild(deleteBtn)
    row.appendChild(actionKey)
    row.appendChild(this.createTimesContainer())
    row.appendChild(addActionBtn)
    row.appendChild(actionValue)

    this.parent.appendChildEl(row)

    return row
  }

  createTimesContainer() {
    let row = document.createElement("div")
    row.classList.add("action_value_list_row")
    row.classList.add("repeat_times")

    let content = document.createElement("div")
    content.classList.add("row_content")
    content.innerText = this.times || ""

    let input = this.createTimesInput(this.times)

    let editBtn = document.createElement("img")
    editBtn.classList.add("edit_action_value_btn")
    editBtn.src = "/assets/images/edit_icon.png"

    row.appendChild(content)
    row.appendChild(input)
    row.appendChild(editBtn)

    return row
  }

  createTimesInput(value) {
    value = value || ""
    let width = value.length < 15 ? 15 : value.length

    let input = document.createElement("input")
    input.classList.add("black_input")
    input.value = value
    input.style.width = width + "ch"

    input.addEventListener("keyup", this.onTimesInputKeyup.bind(this), true)
    input.addEventListener("input", this.onTimesInputChange.bind(this), true)
    input.addEventListener("blur", this.onTimesInputBlur.bind(this), true)

    return input
  }

  getTimesInputWidth(value) {
    value = (value || "").toString()
    return value.length < 15 ? 15 : value.length
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

    if (e.target.classList.contains("edit_action_value_btn")) {
      let row = e.target.closest(".action_value_list_row")
      this.enterEditMode(row)
    }
  }

  enterEditMode(row) {
    row.classList.add("edit_mode")
    let input = row.querySelector("input")
    input.focus()
    input.select()
  }

  exitEditMode(row) {
    row.classList.remove("edit_mode")
  }

  onTimesInputKeyup(e) {
    if (e.which === 13) {
      this.submitTimesChange(e.target.value)
    } else if (e.which === 27) {
      this.exitEditMode(e.target.closest(".action_value_list_row"))
    }
  }

  onTimesInputBlur(e) {
    this.submitTimesChange(e.target.value)
  }

  onTimesInputChange(e) {
    e.target.style.width = this.getTimesInputWidth(e.target.value) + "ch"
  }

  submitTimesChange(value) {
    value = (value || "").trim()

    if (value === "")
      value = "1"

    SocketUtil.emit("EditCommandBlock", {
      operation: "edit",
      id: this.id,
      value: "times:" + value
    })
  }

  edit(text) {
    let tokens = text.split(":")

    if (tokens[0] !== "times")
      return

    this.times = tokens[1]

    let row = this.el.querySelector(".repeat_times")
    row.querySelector(".row_content").innerText = this.times || ""

    let input = row.querySelector("input")
    input.value = this.times || ""
    input.style.width = this.getTimesInputWidth(input.value) + "ch"

    this.exitEditMode(row)
  }

  onAddActionBtnClick() {
    this.game.commandBlockPicker.open({
      mode: "actions",
      parent: this
    })
  }

  editChildNode(data) {
  }

  toJson() {
    return {
      id: this.id,
      actionKey: this.actionKey,
      times: this.times,
      actions: this.actions.map(action => action.toJson())
    }
  }

}

Object.assign(Repeat.prototype, ActionContainer.prototype, {})

module.exports = Repeat