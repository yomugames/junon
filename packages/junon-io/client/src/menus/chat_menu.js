const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")

class ChatMenu extends BaseMenu {

  onMenuConstructed() {
    this.chatInput = this.el.querySelector("#chat_input")
    this.chatInputContainer = this.el.querySelector("#chat_input_container")
    this.chatHistory = {}
    this.chatHistory["local"]  = this.el.querySelector(".local_chat_history")
    this.chatHistory["global"] = this.el.querySelector(".global_chat_history")
    this.chatHistory["team"] = this.el.querySelector(".team_chat_history")
    this.chatGroup = 'local'

    this.commandHistory = []
    this.MAX_COMMAND_HISTORY = 100
    this.MAX_HISTORY_CHAT_MESSAGES = 200

    this.scrollIndex = 0
    this.el.style.display = 'inline-block'

  }

  setGlobalTabRegion() {
    document.querySelector(".global_chat_tab .chat_tab_label").innerText = i18n.t("Global") + " " + this.game.main.getRegionName()
  }

  requestChatHistory() {
    let region = this.game.main.region
    this.game.sendToMatchmaker({ event: "RequestChatHistory", data: { region: region } })
  }

  onChatHistory(chatHistory) {
    this.chatHistory["global"].innerText = ""

    for (var i = 0; i < chatHistory.length; i++) {
      let chat = chatHistory[i]
      this.createChatEntry("global", chat)
    }
  }

  getTotalMessageCount() {
    return this.chatHistory["global"].children.length +
           this.chatHistory["local"].children.length
  }

  isControllingPlayerRequired() {
    return false
  }

  initListeners() {
    this.chatInput.addEventListener("keyup", this.onInputKeyup.bind(this), true)
    this.chatInput.addEventListener("focusout", this.onInputFocusOut.bind(this), true)
    document.querySelector("#chat_group_tab_container").addEventListener("click", this.onChatTabClick.bind(this), true)
    document.querySelector("#chat_group_tab_content").addEventListener("click", this.onChatContentClick.bind(this), true)
    document.querySelector("#chat_group_tab_content").addEventListener("contextmenu", this.onChatContentRightClick.bind(this), true)
    document.querySelector("#chat_player_tooltip").addEventListener("click", this.onChatTooltipClick.bind(this), true)
  }

  onChatTooltipClick(e) {
    if (e.target.closest(".mute_player_btn")) {
      document.querySelector("#chat_player_tooltip").style.display = 'none'
      if (!this.focusedUsername) return
      if (this.game.player.name === this.focusedUsername) return

      this.game.addMutedPlayer(this.focusedUsername)
      let list = Array.from(this.el.querySelectorAll(`.chat_message[data-username='${this.focusedUsername}']`))
      list.forEach((el) => {
        el.parentElement.removeChild(el)
      })
    }
  }

  onChatTabClick(e) {
    let tab = e.target.closest(".chat_tab")
    if (tab) {
      let selected = document.querySelector(".chat_tab.selected")
      if (selected) {
        selected.classList.remove("selected")
      }

      tab.classList.add("selected")
      this.chatGroup = tab.dataset.chat
      this.showChatHistory(this.chatGroup)
      this.clearUnreadCount(this.chatGroup)

      this.chatInput.focus()
    }
  }

  onChatContentRightClick(e) {
    let chatUser = e.target.closest(".chat_user")
    if (chatUser) {
      document.querySelector("#chat_player_tooltip").style.display = 'block'
      this.repositionTooltip(e.target, e.target.getBoundingClientRect())

      this.focusedUsername = chatUser.dataset.username
    }
  }

  onChatContentClick(e) {
    let chatUser = e.target.closest(".chat_user")
    if (chatUser) {
      let uid = chatUser.dataset.uid
      let username = chatUser.dataset.username
      this.game.userProfileMenu.open({ username: username, uid: uid })
    }
  }

  showChatHistory(chatGroup) {
    let selected = document.querySelector(".chat_history.selected")
    if (selected) {
      selected.classList.remove("selected")
    }
    document.querySelector("." + chatGroup + "_chat_history").classList.add("selected")
  }

  isModal() {
    return false
  }

  onInputKeyup(event) {
    if (event.keyCode === 27) { // escape
      this.game.inputController.handleEsc()
    } else if (event.key === "Enter") {
      this.submit()
    } else if (event.key === "ArrowUp") {
      this.game.chatMenu.scrollHistory(1)
    } else if (event.key === "ArrowDown") {
      this.game.chatMenu.scrollHistory(-1)
    }
  }

  onInputFocusOut(e) {
    if (this.game.isMobile()) {
      // virtual keyboard "Done" key is tapped
      if (e.target.id === 'chat_input') return

      this.submit()
      this.close()
    } else {
      // this.close()
    }
  }

  isGlobalChat() {
    return this.chatGroup === 'global'
  }

  isTeamChat() {
    return this.chatGroup === 'team'
  }

  onGlobalServerChat(data) {
    this.createChatEntry("global", data)

    let chatMessages = Array.from(this.el.querySelectorAll(".global_chat_history .chat_message"))
    if (chatMessages.length > this.MAX_HISTORY_CHAT_MESSAGES) {
      let oldMessage = chatMessages[0]
      if (oldMessage.parentElement) {
        oldMessage.parentElement.removeChild(oldMessage)
      }

    }

  }

  submit() {
    let text = this.chatInput.value

    SocketUtil.emit("ClientChat", { message: text, isGlobal: this.isGlobalChat(), isTeam: this.isTeamChat() })

    if (text.length > 0) {
      this.commandHistory.unshift(text)
    }

    if (this.commandHistory.length > this.MAX_COMMAND_HISTORY) {
      this.commandHistory.pop()
    }

    this.chatInput.value = ""
    this.scrollIndex = -1 // start at -1
  }

  clearUnreadCount(chatGroup) {
    let chatTab = document.querySelector("." + chatGroup +  "_chat_tab")
    chatTab.querySelector(".chat_unread_count").innerText = ""
  }

  increaseUnreadCount(chatGroup) {
    let chatTab = document.querySelector("." + chatGroup +  "_chat_tab")
    let unreadCount = parseInt(chatTab.querySelector(".chat_unread_count").innerText)
    if (isNaN(unreadCount)) unreadCount = 0

    unreadCount += 1

    chatTab.querySelector(".chat_unread_count").innerText = unreadCount
  }

  repositionTooltip(el, boundingRect) {
    let tooltip = document.querySelector("#chat_player_tooltip")

    const bottomMargin = 5
    let left = boundingRect.x + el.offsetWidth / 2 
    let top  = boundingRect.y + bottomMargin
    const margin = 5

    left = Math.max(margin, left) // cant be lower than margin
    left = Math.min(window.innerWidth - tooltip.offsetWidth - margin, left) // cant be more than than margin

    if (top < margin) {
      // show at bottom instead
      top = boundingRect.y + (bottomMargin * 2)
    }
    top = Math.max(margin, top) // cant be lower than margin
    top = Math.min(window.innerHeight - tooltip.offsetHeight - margin, top) // cant be more than than margin

    tooltip.style.left = left + "px"
    tooltip.style.top  = top  + "px"
  }


  createChatEntry(chatGroup, messageObj) {
    let chatMessage = document.createElement("div")
    chatMessage.className = "chat_message"
    chatMessage.dataset.username = messageObj.username

    // username
    let chatUsername = document.createElement("span")
    chatUsername.className = "chat_user"
    if (messageObj.username) {
      chatUsername.innerText = "[" + messageObj.username + "]"
      if (messageObj.uid) {
        chatUsername.dataset.uid = messageObj.uid
      }
      chatUsername.dataset.username = messageObj.username
    }

    // message
    let chatContent = document.createElement("span")
    chatContent.className = "chat_content"
    chatContent.innerText = messageObj.message
    if (messageObj.status === "error") {
      chatContent.dataset.error = true
    }  else if (messageObj.status === "success") {
      chatContent.dataset.success = true
    } else if(messageObj.status === "hexcolor") {
      chatContent.style.color ="#"+ messageObj.color
    } else if(messageObj.status === "color") {
      chatContent.style.color = messageObj.color
    }

    chatMessage.appendChild(chatUsername)
    chatMessage.appendChild(chatContent)

    this.chatHistory[chatGroup].appendChild(chatMessage)
    this.chatHistory[chatGroup].scrollTop = this.chatHistory[chatGroup].scrollHeight

    if (this.chatGroup !== chatGroup) {
      this.increaseUnreadCount(chatGroup)
    }
  }

  setOpenDisplay() {
    this.el.style.display = 'inline-block'
  }

  isMuted(name) {
    return this.game.mutedPlayers[name]
  }

  onServerChat(data) {
    if (!this.game.hasJoinedGame) return

    const playerId = data.playerId
    const username = data.username
    const message  = data.message

    const chatUser = this.game.sector.players[playerId]

    let messageObj = this.parseServerChat(message)
    messageObj.username = username
    messageObj.uid = data.uid

    let chatGroup = data.isTeam ? "team" : "local"

    if (!this.isMuted(username)) {
      this.createChatEntry(chatGroup, messageObj)
    }

    if (chatUser && !this.isMuted(chatUser.name)) {
      chatUser.createChatBubble(messageObj.message)
    }

    let chatMessages = Array.from(this.el.querySelectorAll(`.${chatGroup}_chat_history .chat_message`))
    if (chatMessages.length > this.MAX_HISTORY_CHAT_MESSAGES) {
      let oldMessage = chatMessages[0]
      if (oldMessage.parentElement) {
        oldMessage.parentElement.removeChild(oldMessage)
      }
    }
  }

  parseServerChat(message) {
    let errorRegex = new RegExp(/^%error%/)
    let successRegex = new RegExp(/^%success%/)

    if (message.match(errorRegex)) {
      return { status: "error", message: message.replace(errorRegex, "") }

    } else if (message.match(successRegex)) {
      return { status: "success", message: message.replace(successRegex, "") }

    } else if (message.startsWith("%#")) { //regular expressions are consusing lol
        let colorEndIndex = message.indexOf("%", 2);

        if (colorEndIndex === -1) return
            
        let colorCode = message.slice(2, colorEndIndex);
        let restOfMessage = message.slice(colorEndIndex + 1);
        return { status: "hexcolor", message: restOfMessage, color: colorCode };
    } else if (message.startsWith("%")) {
      const colorEndIndex = message.indexOf("%", 2)
      if(colorEndIndex === -1) return

      const allowedColors = ["blue", "red", "green", "yellow", "brown", "purple", "pink", "gray", "orange", "black", "white",]

      const color = message.slice(1, colorEndIndex)
      if(allowedColors.indexOf(color) === -1) return { status: "normal", message: message };

      let restOfMessage = message.slice(colorEndIndex + 1);

      return { status: "color", message: restOfMessage, color:color}
    }
    return { status: "normal", message: message };
  }


  close() {
    if (this.isVoteMode) return

    let index = this.game.openMenus.indexOf(this)
    if (index >= 0) {
      this.game.openMenus.splice(index, 1)
    }

    if (this.getTotalMessageCount() > 0) {
      this.el.classList.add("non_empty")
    }

    this.el.classList.add("read_mode")
    this.el.classList.remove("chat_mode")
  }

  setVoteMode(voteMode) {
    if (voteMode) {
      this.isVoteMode = voteMode
      this.el.classList.add("vote_mode")
    } else {
      this.isVoteMode = voteMode
      this.el.classList.remove("vote_mode")
    }
  }

  hide() {
    this.el.style.display = 'none'
  }

  open(options = {}) {
    if (this.isVoteMode) return

    super.open(options)

    this.game.inputController.controlKeys = 0

    if (this.chatHideTween) {
      this.chatHideTween.stop()
    }

    if (this.game.isTutorial() || !this.game.isLoggedIn() || this.game.isPvP()) {
      document.querySelector(".global_chat_tab").style.display = 'none'
    } else {
      document.querySelector(".global_chat_tab").style.display = 'none'
    }

    if (this.game.isPvP()) {
      document.querySelector(".team_chat_tab").style.display = 'inline-block'
    } else {
      document.querySelector(".team_chat_tab").style.display = 'none'
    }

    if (options.message) {
      this.chatInput.value = options.message
    } else {
      this.chatInput.value = ""
    }

    this.el.classList.remove("read_mode")
    this.el.classList.add("chat_mode")

    if (document.activeElement !== this.chatInput) {
      this.chatInput.focus()
    }
  }

  isOpen() {
    return this.el.classList.contains("chat_mode")
  }

  isOpenAndFocused() {
    return this.isOpen() && document.activeElement === this.chatInput
  }

  isClose() {
    return !this.isOpen()
  }

  scrollHistory(direction) {
    if (this.commandHistory.length === 0) return

    this.scrollIndex += direction

    if (this.scrollIndex < 0) {
      this.scrollIndex = 0
    } else if (this.scrollIndex >= this.commandHistory.length) {
      this.scrollIndex = this.commandHistory.length - 1
    }

    this.chatInput.value = this.commandHistory[this.scrollIndex]
  }

  getChatHideTween() {
    let opacity = { opacity: 1 }
    this.chatHideTween = new TWEEN.Tween(opacity)
        .to({ opacity: 0 }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.chatMenu.style.opacity = opacity.opacity
        })
        .delay(3000)

    return this.chatHideTween
  }

}

module.exports = ChatMenu
