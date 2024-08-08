const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Trigger = require("./command_blocks/trigger")
const ActionEntries = require("./command_blocks/action_entries/index")

class CommandBlockMenu extends BaseMenu {
  onMenuConstructed() {
    this.nodes = {}
    this.triggers = []
  }

  cleanup() {
    document.querySelector(".triggers_container").innerHTML = ""
    this.triggers = []
    this.nodes = {}
  }

  getActionEntryFor(actionKey) {
    return ActionEntries.forType(actionKey)
  }

  initListeners() {
    super.initListeners()
    this.el.querySelector(".command_block_tab_container").addEventListener("click", this.onTabClick.bind(this), true)
    this.el.querySelector(".add_trigger_btn").addEventListener("click", this.onNewTriggerBtnClick.bind(this), true)
    this.el.querySelector(".enable_trigger_toggle").addEventListener("click", this.onEnableTriggersClick.bind(this), true)
  }

  onEnableTriggersClick(e) {
    let toggle = e.target.closest(".enable_trigger_toggle")
    if (!toggle) return
    if (e.target.tagName !== 'INPUT') return // dont process label click event

    e.stopPropagation()
    e.preventDefault()

    let enabled = toggle.querySelector("input").checked

    let data = {
      operation: "enable",
      value: enabled ? "true" : "false"
    }

    SocketUtil.emit("EditCommandBlock", data)

    return false
  }


  onTabClick(e) {
    let tab = e.target.closest(".command_block_tab")
    if (!tab) return

    this.selectTab(tab.dataset.view)
  }

  open() {
    if (!this.game.player) return

    super.open()
    if (!this.game.player.canEditCommandBlock()) {
      if (!this.el.classList.contains("readonly")) {
        this.el.classList.add("readonly")
      }
    } else {
      this.el.classList.remove("readonly")
    }

    if (!this.game.player.isSectorOwner()) {
      document.querySelector(".command_block_tab_container").style.display = 'none'
      this.selectTab('triggers')
    } else {
      document.querySelector(".command_block_tab_container").style.display = 'block'
    }
  }

  onNewTriggerBtnClick(e) {
    this.game.commandBlockPicker.open({ mode: "triggers" })
  }

  hasTrigger(name) {
    return this.triggers.find((trigger) => {
      return trigger.event === name
    })
  }

  addTrigger(trigger) {
    this.triggers.push(trigger)
  }

  removeTrigger(trigger) {
    let index = this.triggers.indexOf(trigger)
    if (index !== -1) {
      this.triggers.splice(index, 1)
    }
  }

  selectTab(view) {
    let selected = this.el.querySelector(".command_block_tab.selected")
    if (selected) {
      selected.classList.remove('selected')
    }

    let activeTab = this.el.querySelector(".tab-pane.active")
    if (activeTab) {
      activeTab.classList.remove('active')
    }

    let tab = this.el.querySelector(`.command_block_tab[data-view='${view}']`)
    if (tab) {
      tab.classList.add("selected")
    }

    let tabContent = this.el.querySelector(`.tab-pane[data-view='${view}']`)
    if (tabContent) {
      tabContent.classList.add("active")
    }
  }

  registerNode(node) {
    this.nodes[node.id] = node
  }

  unregisterNode(node) {
    delete this.nodes[node.id] 
  }

  getNode(id) {
    return this.nodes[id]
  }

  renderFullJson(fullJson) {
    document.querySelector(".triggers_container").innerHTML = ""

    // removes invalid characters
    // https://stackoverflow.com/a/20856346
    const sanitatedJson = fullJson.replace(/[^\x00-\x7F§]/g, "")

    let data = JSON.parse(sanitatedJson)
    this.parseTriggers(data.triggers)
    this.setIsEnabled(data.isEnabled)
  }

  parseTriggers(triggers) {
    for (var i = 0; i < triggers.length; i++) {
      let trigger = triggers[i]
      triggers[i] = new Trigger(this, trigger)
    }
  }

  createTrigger(event) {
    let trigger = new Trigger(this, { event: event })
    trigger.submitSave()
  }

  appendTriggerChildEl(el) {
    document.querySelector(".triggers_container").appendChild(el)
  }

  update(data) {
    if (data.error) {
      this.game.displayError(data.error, { warning: true })
      return
    }

    if (data.operation === "enable") {
      this.setIsEnabled(data.value === 'true')

    } else if (data.operation === "edit") {
      let node = this.getNode(data.id)
      if (node) {
        node.edit(data.value)
      }
    } else if (data.operation === "delete") {
      let node = this.getNode(data.id)
      if (node) {
        node.remove()
      }
    } else if (data.operation === "add") {
      let node = this.getNode(data.tempId)
      if (node) {
        node.finishAdd(data)
      }
    }
  }

  setIsEnabled(isEnabled) {
    this.isEnabled = isEnabled

    document.querySelector(".enable_trigger_toggle input").checked = isEnabled
  }

  writeLog(data) {
    let log = document.createElement("div")
    log.classList.add("log_entry")

    let logType = document.createElement("div")
    logType.classList.add("log_type")
    logType.classList.add(data.type)
    logType.innerText = data.type


    let logMessage = document.createElement("div")
    logMessage.classList.add("log_message")
    logMessage.classList.add(data.type)
    logMessage.innerText = data.message

    log.appendChild(logType)
    log.appendChild(logMessage)

    this.el.querySelector(".commands_event_log").appendChild(log)

    this.removeOldLog()
  }

  writeLogBatched(logs) {
    let documentFragment = document.createDocumentFragment()

    for (var i = 0; i < logs.length; i++) {
      let data = logs[i]

      let log = document.createElement("div")
      log.classList.add("log_entry")

      let logType = document.createElement("div")
      logType.classList.add("log_type")
      logType.classList.add(data.type)
      logType.innerText = data.type


      let logMessage = document.createElement("div")
      logMessage.classList.add("log_message")
      logMessage.classList.add(data.type)
      logMessage.innerText = data.message

      log.appendChild(logType)
      log.appendChild(logMessage)

      documentFragment.appendChild(log)
    }

    this.el.querySelector(".commands_event_log").appendChild(documentFragment)

    this.removeOldLog()
  }

  removeOldLog() {
    let logs = Array.from(this.el.querySelectorAll(".log_entry"))
    if (logs.length > 5000) {
      let amountToRemove = logs.length - 5000
      for (var i = 0; i < amountToRemove; i++) {
        let log = logs[i]
        if (log.parentElement) {
          log.parentElement.removeChild(log)
        }
      }
    }
  }

}



module.exports = CommandBlockMenu 