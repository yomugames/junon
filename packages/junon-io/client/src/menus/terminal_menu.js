const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Protocol = require("./../../../common/util/protocol")

class TerminalMenu extends BaseMenu {
  onMenuConstructed() {
    this.chatInput = this.el.querySelector(".terminal_chat_input")
    this.chatContent = this.el.querySelector(".terminal_chat_content")
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".confirm_choice_btn").addEventListener("click", this.onChoiceConfirmClick.bind(this), true)
    this.el.querySelector(".terminal_choices_container").addEventListener("click", this.onTerminalChoiceClick.bind(this) , true)
    this.el.querySelector(".terminal_chat_input").addEventListener("keyup", this.onTerminalChatInputKeyup.bind(this) , true)
    this.el.querySelector(".terminal_chat_send_btn").addEventListener("click", this.onTerminalChatSendClick.bind(this) , true)
    this.el.querySelector(".terminal_tab_container").addEventListener("click", this.onTerminalTabClick.bind(this) , true)
  }

  open(options = {}) {
    super.open(options)

    this.entity = options.entity
    this.render()
  }

  onTerminalChatInputKeyup(e) {
    if (e.which === 13) {
      let chat = this.chatInput.value
      this.chatInput.value = ""
      SocketUtil.emit("InteractTarget", { id: this.entity.id, action: "chat", content: chat })
    }
  }

  onTerminalTabClick(e) {
    let tab = e.target.dataset.tab
    if (tab) {
      this.selectTab(tab)
    }
  }

  selectTab(tab) {
    // remove previous selected
    let prevSelectedTab = this.el.querySelector(".terminal_tab.selected")
    if (prevSelectedTab) {
      prevSelectedTab.classList.remove("selected")
      
      let prevTabContent = this.el.querySelector(".terminal_tab_content div[data-tab='" + prevSelectedTab.dataset.tab + "']")
      prevTabContent.classList.remove("selected")
    }

    let targetTab = this.el.querySelector(".terminal_tab[data-tab='" + tab + "']")
    targetTab.classList.add("selected")
    let tabContent = this.el.querySelector(".terminal_tab_content div[data-tab='" + tab + "']")
    tabContent.classList.add("selected")
  }

  onTerminalChatSendClick(e) {
    let chat = this.chatInput.value
    this.chatInput.value = ""
    SocketUtil.emit("InteractTarget", { id: this.entity.id, action: "chat", content: chat })
  }

  render() {
    this.el.querySelector(".terminal_chat_content").innerHTML = this.getChatContent()

    if (this.game.isMiniGame() && this.isUserImposter()) {
      if (!this.game.terminalMenu.isChoiceSubmitted) {
        this.el.querySelector(".terminal_tab[data-tab='hack']").style.display = 'inline-block'
      } else {
        this.el.querySelector(".terminal_tab[data-tab='hack']").style.display = 'none'
        this.selectTab("chat")
      }
    } else {
      this.el.querySelector(".terminal_tab[data-tab='hack']").style.display = 'none'
      this.selectTab("chat")
    }
  }

  isUserImposter() {
    let result = false
    
    for (let index in this.game.player.inventory) {
      let item = this.game.player.inventory[index]
      if (item.type === Protocol.definition().BuildingType.AssassinsKnife) {
        result = true
        break
      }
    }

    return result
  }


  getChatContent() {
    let result = ""
    for (var i = 0; i < this.game.sector.terminalMessages.length; i++) {
      let msg = this.game.sector.terminalMessages[i]
      let el = this.createChatEntry(msg)
      result += el
    }

    return result
  }

  createChatEntry(msg) {
    return "<div class='terminal_chat_entry'>" + msg + "</div>"
  }

  addTerminalMessage(message) {
    let el = this.createChatEntry(message)
    this.chatContent.innerHTML += el
    this.chatContent.scrollTop = this.chatContent.scrollHeight
  }

  onTerminalChoiceClick(e) {
    let choice = e.target.closest(".terminal_choice")
    if (choice) {
      if (this.selectedChoice) {
        this.selectedChoice.classList.remove("selected")
      }

      this.selectedChoice = choice
      this.selectedChoice.classList.add("selected")
    }
  }

  onChoiceConfirmClick() {
    if (!this.selectedChoice) return

    let choice = this.selectedChoice.dataset.choice
    SocketUtil.emit("InteractTarget", { id: this.entity.id, action: choice })
    this.isChoiceSubmitted = true
  }

}



module.exports = TerminalMenu 