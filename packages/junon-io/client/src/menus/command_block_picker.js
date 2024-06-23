const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Trigger = require("./command_blocks/trigger")

class CommandBlockPicker extends BaseMenu {
  initListeners() {
    super.initListeners()

    this.el.querySelector(".create_block_item_btn").addEventListener("click", this.onSubmitClick.bind(this), true)
    this.el.querySelector(".left_content").addEventListener("click", this.onLeftContentClick.bind(this), true)
    this.el.querySelector(".left_content").addEventListener("dblclick", this.onLeftContentDblClick.bind(this), true)
  }

  onLeftContentDblClick(e) {
    this.onSubmitClick()
  }

  onLeftContentClick(e) {
    let selected = this.el.querySelector(".left_content_entry.selected")
    if (selected) {
      selected.classList.remove("selected")
    }

    let el = e.target.closest(".left_content_entry") 
    if (!el) return

    el.classList.add("selected")
    let value = el.innerText

    if (!this.el.classList.contains("active")) {
      this.el.classList.add("active")
    }

    if (this.mode === "triggers") {
      this.handleTriggerSelected(value)
    } else if (this.mode === "actions") {
      this.handleActionSelected(value)
    }
  }

  handleTriggerSelected(triggerName) {
    let data = Constants.Triggers[triggerName]
    if (!data) {
      let tokens = triggerName.split(":")
      let timerEvent = tokens[2]
      if (!timerEvent) return

      data = Constants.Triggers[timerEvent]
      if (!data) return
    }

    let container = this.el.querySelector(".trigger_details")
    Trigger.prototype.renderEventDetails(container, triggerName, data)
  }

  handleActionSelected(actionName) {
    let data = Constants.Actions[actionName]
    if (!data) return

    let description = this.el.querySelector(".action_description")
    description.innerHTML = data.description

    this.el.querySelector(".action_details .examples").innerHTML = ""

    data.examples.forEach((example) => {
      let el = "<div class='action_example'>" + example + "</div>"
      this.el.querySelector(".action_details .examples").innerHTML += el
    })

  }

  onSubmitClick(e) {
    let selected = this.el.querySelector(".left_content_entry.selected")
    if (!selected) return

    let value = selected.innerText

    if (this.mode === 'triggers') {
      if (this.game.commandBlockMenu.hasTrigger(value)) {
        this.game.displayError("Trigger already added", { warning: true })
        return
      } else {
        this.game.commandBlockMenu.createTrigger(value, false) //will render once server has sent mass broadcast of command block update. Don't want render twice
      }
    } else if (this.mode === 'actions') {
      if (this.parent) {
        if (value === 'commands' && this.parent.hasActionEntry(value)) {
          this.game.displayError("Action already added", { warning: true })
          return
        } else {
          this.parent.createActionEntry(value)
        }
      }
      
    }

    this.close()
  }

  close() {
    this.cleanup() 
    super.close()
  }

  open(options = {}) {
    options.dontCloseMenus = true
    
    super.open(options)

    this.mode = options.mode
    this.el.dataset.mode = this.mode

    if (options.parent) {
      this.parent = options.parent
    }

    this.el.querySelector(".left_content").innerHTML = ""

    if (options.mode === 'triggers') {
      this.displayTriggersPicker()
    } else if (options.mode === 'actions') {
      this.displayActionsPicker()
    }
  }

  getTriggerNames() {
    let names = Object.keys(Constants.Triggers)

    let skip = ["start", "tick", "end"]
    skip.forEach((name) => {
      const index = names.indexOf(name)
      if (index > -1) {
        names.splice(index, 1)
      }
    })

    return names
  }


  displayTriggersPicker() {
    this.el.querySelector(".menu_main_header").innerText = "Triggers"

    let triggers =  this.getTriggerNames()
    triggers.forEach((name) => {
      let el = this.createTriggerEntry(name)
      this.el.querySelector(".left_content").appendChild(el)
    })

    for (let id in this.game.commandBlockTimers) {
      let timer = this.game.commandBlockTimers[id]
      let events = ["start", "tick", "end"]
      events.forEach((event) => {
        let name = "Timer:" + timer.timer.name + ":" + event
        let existingTrigger = this.el.querySelector(`.trigger_name[data-name='${name}']`)
        if (!existingTrigger) {
          let el = this.createTriggerEntry(name)
          this.el.querySelector(".left_content").appendChild(el)
        }
      })
    }
  }

  displayActionsPicker() {
    this.el.querySelector(".menu_main_header").innerText = "Actions"

    let actions = ["commands", "ifthenelse", "timer"]
    actions.forEach((name) => {
      let el = this.createActionEntry(name)
      this.el.querySelector(".left_content").appendChild(el)
    })
  }

  createTriggerEntry(name) {
    let div = document.createElement("div")
    div.classList.add("left_content_entry")
    div.classList.add("trigger_name")
    div.dataset.name = name
    div.innerText = name

    return div
  }

  createActionEntry(name) {
    let div = document.createElement("div")
    div.classList.add("left_content_entry")
    div.classList.add("action_name")
    div.innerText = name

    return div
  }

  cleanup() {
    this.el.classList.remove("active")
    this.el.dataset.mode = ""
    this.parent = null
  }
}

module.exports = CommandBlockPicker