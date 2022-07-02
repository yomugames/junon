const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class FriendRequestMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.addEventListener("click", this.onRequestMenuClick.bind(this), true)
  }

  createRequestEntry(data) {
    let playerName = data.sender.username

    let el = "<div class='friend_request_entry' data-request-id='" + data.id + "' data-player-uid='" + data.userUid + "' data-username='" + playerName + "'>" +
               "<div class='friend_request_message'><span class='friend_requester'>" + playerName + "</span> " + i18n.t('wants to be your friend') + "</div>" +
               "<div class='accept_friend_request_btn ui_btn' >" + i18n.t('Accept') + "</div>" +
               "<div class='ignore_friend_request_btn ui_btn' >" + i18n.t('Ignore') +"</div>" +
             "</div>"

    this.el.innerHTML += el
  }

  onRequestMenuClick(event) {
    let entry = event.target.closest(".friend_request_entry")
    let playerId = entry.dataset.playerId

    let acceptRequestBtn = event.target.closest(".accept_friend_request_btn")
    let ignoreRequestBtn = event.target.closest(".ignore_friend_request_btn")
    let profileBtn = event.target.closest(".friend_requester")

    if (acceptRequestBtn) {
      let requestId = entry.dataset.requestId
      this.game.main.acceptFriendRequest(requestId)
    } else if (ignoreRequestBtn) {
      let requestId = entry.dataset.requestId
      this.game.main.ignoreFriendRequest(requestId)
    } else if (profileBtn) {
      let uid = entry.dataset.playerUid
      let username = entry.dataset.username
      this.game.userProfileMenu.open({ uid: uid, username: username })
    }
  }

  onFriendRequestAccepted(requestId) {
    this.close()
  }

  onFriendRequestIgnored(requestId) {
    this.close()
  }



}


module.exports = FriendRequestMenu