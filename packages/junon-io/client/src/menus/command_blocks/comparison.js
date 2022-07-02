const SocketUtil = require("../../util/socket_util")
const Node = require("./node")
const Constants = require("../../../../common/constants.json")

class Comparison extends Node {
  constructor(parent, data) {
    super(parent.game, data)

    this.parent = parent
    this.parent.addCondition(this)

    this.value1 = data.value1 || ""
    this.operator = data.operator || "=="
    this.value2 = data.value2 || ""

    this.el = this.createEl()
    this.el.addEventListener("click", this.onContainerClick.bind(this), true)
  }

  onContainerClick(e) {
    if (e.target.classList.contains("edit_action_value_btn")) {
      let row = e.target.closest(".action_value_list_row")
      this.enterEditMode(row)
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

  createEl() {
    let div = document.createElement("div")
    div.dataset.id = this.id
    div.classList.add("comparison")
    div.classList.add("tab_1")

    let valueContainer = this.createValueContainer(this.value1)
    valueContainer.querySelector(".label").innerText = "Value1:"
    valueContainer.dataset.key = 'value1'
    valueContainer.classList.add("value1")

    let otherValueContainer = this.createValueContainer(this.value2)
    otherValueContainer.querySelector(".label").innerText = "Value2:"
    otherValueContainer.dataset.key = 'value2'
    otherValueContainer.classList.add("value2")

    let operatorContainer = document.createElement("div")
    operatorContainer.dataset.key = 'operator'
    operatorContainer.classList.add("operator")

    let operatorLabel = document.createElement("div")
    operatorLabel.classList.add("label")
    operatorLabel.innerText = "Operator:"

    let operatorSelect = this.createOperatorSelect()

    operatorContainer.appendChild(operatorLabel)
    operatorContainer.appendChild(operatorSelect)

    div.appendChild(valueContainer)
    div.appendChild(operatorContainer)
    div.appendChild(otherValueContainer)

    this.parent.appendChildEl(div)

    return div
  }

  onOperatorChange(e) {
    let key = "operator"
    let inputValue = e.target.value
    this.submitActionValueChange([key, inputValue].join(":"))
  }

  createOperatorSelect() {
    let select = document.createElement("select")
    select.addEventListener("change", this.onOperatorChange.bind(this), true)

    let operators = ["==", "!=", ">", "<", ">=", "<=", "=~"]
    operators.forEach((operator) => {
      let option = document.createElement("option")

      if (operator === "=~") {
        option.innerText = operator + " (contains word)"
      } else {
        option.innerText = operator
      }

      option.value = operator

      if (this.operator === operator) {
        option.selected = true
      }

      select.appendChild(option)
    })

    return select
  }

  createValueContainer(value) {
    let valueContainer = document.createElement("div")
    valueContainer.classList.add('action_value_list_row')

    let label = document.createElement("div")
    label.classList.add("label")

    let content = document.createElement("div")
    content.classList.add("row_content")
    content.innerText = value

    let input = this.createActionValueInput("value")
    input.value = value

    let editBtn = document.createElement("img")
    editBtn.classList.add("edit_action_value_btn")
    editBtn.src = "/assets/images/edit_icon.png"

    valueContainer.appendChild(label)
    valueContainer.appendChild(content)
    valueContainer.appendChild(input)
    valueContainer.appendChild(editBtn)

    return valueContainer
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
      let key = e.target.closest(".action_value_list_row").dataset.key
      let inputValue = e.target.value
      this.submitActionValueChange([key, inputValue].join(":"))
    } else if (e.which === 27) {
      let row = e.target.closest(".action_value_list_row")
      this.exitEditMode(row)
    }
  }

  onActionValueInputBlur(e) {
    let key = e.target.closest(".action_value_list_row").dataset.key
    let inputValue = e.target.value
    this.submitActionValueChange([key, inputValue].join(":"))
  }

  onActionValueInputChange(e) {
    let value = e.target.value
    let input = e.target

    value = value || ""
    let width = value.length < 15 ? 15 : value.length

    input.style.width = width + "ch"
  }

  edit(text) {
    let key   = text.split(":")[0]
    let value = text.split(":")[1]

    let actionValueListRow = this.el.querySelector(".action_value_list_row[data-key='" + key + "'")
    if (actionValueListRow) {
      this.redraw(actionValueListRow, value)
    }
  }

  redraw(actionValueListRow, value) {
    actionValueListRow.querySelector(".row_content").innerText = value
    this.exitEditMode(actionValueListRow)
  }

  submitActionValueChange(value) {
    let data = {
      id: this.id,
      value: value,
      operation: "edit"
    }

    SocketUtil.emit("EditCommandBlock", data)
  }

  remove() {
    this.parent.removeCondition(this)
    super.remove() 
  }

}

module.exports = Comparison
