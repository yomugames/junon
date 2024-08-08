const SocketUtil = require("../../util/socket_util")
const ActionContainer = require("./action_container")
const Node = require("./node")
const Constants = require("../../../../common/constants.json")

class Trigger extends Node {
  constructor(commandBlock, trigger) {
    super(commandBlock.game, trigger)

    this.event = trigger.event || ""
    this.el = this.createEl()
    this.el.addEventListener("click", this.onContainerClick.bind(this), true)
    this.el.querySelector(".event_help_btn").addEventListener("mouseover", this.onHelpMouseOver.bind(this), true)
    this.el.querySelector(".event_help_btn").addEventListener("mouseout", this.onHelpMouseOut.bind(this), true)
    this.el.querySelector(".add_action_btn").addEventListener("click", this.onAddActionBtnClick.bind(this), true)

    this.initActionContainer(trigger)

    this.commandBlock.addTrigger(this)
  }  

  onAddActionBtnClick(e) {
    this.game.commandBlockPicker.open({ mode: "actions", parent: this })
  }

  onHelpMouseOver(e) {
    let data = Constants.Triggers[this.event]
    if (!data) {
      if (this.event.match(":")) {
        let tokens = this.event.split(":")
        let key = tokens[tokens.length - 1]
        data = Constants.Triggers[key]
      } else {
        return
      }
    }

    let container = document.querySelector("#command_block_tooltip")
    this.renderEventDetails(container, this.event, data)

    document.querySelector("#command_block_tooltip").style.display = 'block'
    this.repositionTooltip(e.target, e.target.getBoundingClientRect())
  }

  onHelpMouseOut(e) {
    document.querySelector("#command_block_tooltip").style.display = 'none'
  }

  renderEventDetails(container, eventName, data) {
    if (container.querySelector(".event_name")) {
      container.querySelector(".event_name").innerText = eventName
    }
    
    container.querySelector(".event_description").innerText = data.description
    container.querySelector(".variables").innerHTML = ""

    for (let key in data.variables) {
      let description = data.variables[key]
      let el = this.createVariableEl(key, description)
      container.querySelector(".variables").appendChild(el)
    }
  }

  createVariableEl(key, description) {
    let div = document.createElement("div")
    div.classList.add("variable")

    let variable = document.createElement("div")
    variable.classList.add("key")
    variable.innerText = "$" + key

    let value = document.createElement("div")
    value.classList.add("description")
    value.innerText = description

    div.appendChild(variable)
    div.appendChild(value)

    return div
  }

  onContainerClick(e) {
    if (e.target.classList.contains("delete_trigger_btn")) {
      if (this.isTempId()) {
        this.remove()
      } else {
        this.submitDelete()
      }
    }
  }

  getParentId() {
    return 0
  }

  getNodeValue() {
    return this.event
  }

  getNodeType() {
    return "Trigger"
  }

  finishAdd(data) {
    this.event = data.value
    this.replaceId(data.id)
  }

  createEl() {
    let triggerEntry = document.createElement("div")
    triggerEntry.dataset.id = this.id
    triggerEntry.classList.add("trigger_entry")

    let eventEntry = document.createElement("div")
    eventEntry.classList.add("event_entry")

    let eventEntryLabel = document.createElement("label")
    eventEntryLabel.innerText = "Event:"

    let eventValue = document.createElement("div")
    eventValue.classList.add("event_value")
    eventValue.innerText = this.event

    let eventHelpBtn = document.createElement("img")
    eventHelpBtn.classList.add("event_help_btn")
    eventHelpBtn.src = "/assets/images/help_icon.png"

    eventEntry.appendChild(eventEntryLabel)
    eventEntry.appendChild(eventValue)
    eventEntry.appendChild(eventHelpBtn)

    let triggerActions = document.createElement("div")
    triggerActions.classList.add("trigger_actions")

    let actionsLabel = document.createElement("label")
    actionsLabel.innerText = "Actions:"

    let addActionBtn = document.createElement("img")
    addActionBtn.classList.add("add_action_btn")
    addActionBtn.src = "/assets/images/add_icon.png"

    let deleteTriggerBtn = document.createElement("img")
    deleteTriggerBtn.classList.add("delete_trigger_btn")
    deleteTriggerBtn.src = "/assets/images/trash_icon.png"

    triggerActions.appendChild(actionsLabel)

    triggerActions.appendChild(addActionBtn)
    triggerEntry.appendChild(deleteTriggerBtn)

    triggerEntry.appendChild(eventEntry)    
    triggerEntry.appendChild(triggerActions)    

    this.commandBlock.appendTriggerChildEl(triggerEntry)

    return triggerEntry
  }

  appendChildEl(el) {
    this.el.appendChild(el)
  }

  remove() {
    super.remove()
    this.commandBlock.removeTrigger(this)
  }

}

Object.assign(Trigger.prototype, ActionContainer.prototype, {
})


module.exports = Trigger