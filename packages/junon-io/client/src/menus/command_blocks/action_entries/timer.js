const Helper = require("../../../../../common/helper")
const ActionEntry = require("./action_entry")
const SocketUtil = require("../../../util/socket_util")

class Timer extends ActionEntry {
  handleActionValues(data) {
    data.timer = data.timer || { name: "Timer", duration: 10, every: 1 }

    this.parseData(data) 

    this.redraw()
  }

  parseData(data) {
    this.timer = {
      name: data.timer.name,
      duration: data.timer.duration,
      every: data.timer.every 
    }
  }

  finishAdd(data) {
    this.replaceId(data.id)
  }

  edit(text) {
    let key     = text.split(":")[0]
    let value = text.split(":")[1]

    if (key === 'name') {
      this.timer.name = value
    } else if (key === 'duration') {
      this.timer.duration = parseInt(value)
    } else if (key === 'every') {
      this.timer.every = parseInt(value)
    }

    this.redraw()
  }

  redraw() {
    this.el.querySelector(".timer_name .row_content").innerText = this.timer.name
    this.el.querySelector(".timer_name input").value = this.timer.name
    this.el.querySelector(".timer_duration input").value = this.timer.duration
    this.el.querySelector(".timer_every input").value = this.timer.every

    this.exitEditMode(this.el.querySelector(".timer_name"))
  }

  onContainerClick(e) {
    if (e.target.classList.contains("edit_action_value_btn")) {
      let row = e.target.closest(".action_value_list_row")
      this.enterEditMode(row)
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

  createEl() {
    let row = document.createElement("div")
    row.dataset.id = this.id
    row.classList.add("timer")
    row.classList.add("action_entry")
    row.classList.add("tab_1")

    let actionKey = document.createElement("div")
    actionKey.classList.add("action_key")
    actionKey.innerText = Helper.capitalize(this.actionKey)

    let timerNameContainer = this.createTimerNameContainer()
    let timerDurationContainer = this.createTimerDurationContainer()
    let timerEveryContainer = this.createTimerEveryContainer()

    let deleteBtn = document.createElement("img")
    deleteBtn.classList.add("delete_action_btn")
    deleteBtn.src = "/assets/images/trash_icon.png"

    row.appendChild(deleteBtn)
    row.appendChild(actionKey)
    row.appendChild(timerNameContainer)
    row.appendChild(timerDurationContainer)
    row.appendChild(timerEveryContainer)

    this.parent.appendChildEl(row)

    return row
  }

  createTimerNameContainer() {
    let timerNameContainer = document.createElement("div")
    timerNameContainer.classList.add("timer_name")
    timerNameContainer.classList.add("action_value_list_row")
    timerNameContainer.classList.add("tab_1")

    let nameLabel = document.createElement("div")
    nameLabel.classList.add("label")
    nameLabel.innerText = "Name:"

    let content = document.createElement("div")
    content.classList.add("row_content")

    let nameInput = this.createActionValueInput("")
    let editBtn = document.createElement("img")
    editBtn.classList.add("edit_action_value_btn")
    editBtn.src = "/assets/images/edit_icon.png"

    let deleteBtn = document.createElement("img") 
    deleteBtn.classList.add("delete_action_value_btn")
    deleteBtn.src = "/assets/images/trash_icon.png"


    timerNameContainer.appendChild(nameLabel)
    timerNameContainer.appendChild(content)
    timerNameContainer.appendChild(nameInput)
    timerNameContainer.appendChild(editBtn)
    timerNameContainer.appendChild(deleteBtn)

    return timerNameContainer
  }

  createTimerDurationContainer() {
    let container = document.createElement("div")
    container.classList.add("timer_duration")
    container.classList.add("tab_1")

    let label = document.createElement("div")
    label.classList.add("label")
    label.innerText = "Duration:"

    let timerInput = document.createElement("input") 
    timerInput.setAttribute("type", "number")
    timerInput.setAttribute("min", "0")
    timerInput.classList.add("black_input")
    timerInput.addEventListener("change", this.onDurationChanged.bind(this), true)

    container.appendChild(label)
    container.appendChild(timerInput)

    return container
  }

  createTimerEveryContainer() {
    let container = document.createElement("div")
    container.classList.add("timer_every")
    container.classList.add("tab_1")

    let label = document.createElement("div")
    label.classList.add("label")
    label.innerText = "Tick:"

    let timerInput = document.createElement("input") 
    timerInput.setAttribute("type", "number")
    timerInput.setAttribute("min", "1")
    timerInput.classList.add("black_input")
    timerInput.addEventListener("change", this.onEveryChanged.bind(this), true)

    container.appendChild(label)
    container.appendChild(timerInput)

    return container
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

  onActionValueInputKeyup(e) {
    if (e.which === 13) {
      // enter
      let key = "name"
      let inputValue = e.target.value
      this.submitActionValueChange([key, inputValue].join(":"))
    } else if (e.which === 27) {
      let row = e.target.closest(".action_value_list_row")
      this.exitEditMode(row)
    }
  }

  exitEditMode(row) {
    row.classList.remove("edit_mode")
  }

  enterEditMode(row) {
    row.classList.add("edit_mode")
    this.focusInput(row)
  }

  focusInput(row) {
    row.querySelector("input").focus()
  }

  onActionValueInputChange(e) {
    let value = e.target.value
    let input = e.target

    value = value || ""
    let width = value.length < 15 ? 15 : value.length

    input.style.width = width + "ch"
  }

  onActionValueInputBlur(e) {
    let key = "name"
    let inputValue = e.target.value
    this.submitActionValueChange([key, inputValue].join(":"))
  }

  onDurationChanged(e) {
    let key = "duration"
    let inputValue = e.target.value
    this.submitActionValueChange([key, inputValue].join(":"))
  }

  onEveryChanged(e) {
    let key = "every"
    let inputValue = e.target.value
    this.submitActionValueChange([key, inputValue].join(":"))
  }

  appendChildEl(el) {
    this.el.appendChild(el)
  }

  submitActionValueChange(value) {
    let data = {
      id: this.id,
      value: value,
      operation: "edit"
    }

    SocketUtil.emit("EditCommandBlock", data)
  }

}

module.exports = Timer