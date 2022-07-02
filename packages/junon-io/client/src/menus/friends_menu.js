const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Config = require("junon-common/config")
const ClientHelper = require("../util/client_helper")


class FriendsMenu extends BaseMenu {
  onMenuConstructed() {
    this.el.querySelector(".friends_tab_container").addEventListener("click", this.onTabClick.bind(this))
    this.el.querySelector(".pending_requests_content").addEventListener("click", this.onPendingRequestContainerClick.bind(this))
    this.el.querySelector(".my_friends_content").addEventListener("click", this.onFriendsContainerClick.bind(this))
    this.el.querySelector(".player_search_btn").addEventListener("click", this.onPlayerSearchClick.bind(this))
    this.el.querySelector(".player_search_results").addEventListener("click", this.onPlayerSearchResultsClick.bind(this))
    this.el.querySelector(".player_search_input").addEventListener("keyup", this.onPlayerSearchInputKeyup.bind(this))
  }

  resetSearch() {
    this.el.querySelector(".player_search_results").innerHTML = ""
  }

  onPlayerSearchClick() {
    let search = this.el.querySelector(".player_search_input").value
    if (search.length === 0) {
      this.resetSearch()
      return
    }

    if (this.searchLock) return
    this.searchLock = true

    let matchmakerUrl = Config[env].matchmakerUrl
    ClientHelper.httpRequest(matchmakerUrl + "search_player?q=" + search, {
      success: (result) => {
        try {
          this.resetSearch()

          let users = JSON.parse(result)
          for (var i = 0; i < users.length; i++) {
            let userData = users[i]
            this.createSearchPlayerResult(userData)
          }

          this.searchLock = false
        } catch(e) {

          this.searchLock = false
        }
      },
      error: () => {
        this.searchLock = false
      }
    })
  }

  createSearchPlayerResult(data) {
    let isMyFriend = this.game.main.isMyFriend(data.uid)
    let isPending = this.game.main.isFriendRequestPending(data.uid)
    let isMe = this.game.playerUid === data.uid

    let addBtn = "<img class='add_search_friend_btn' src='/assets/images/add_friend_icon.png'>"
    if (isMe || isMyFriend || isPending) addBtn = ""

    let el = "<div class='player_search_row' data-uid='" + data.uid + "' data-username='" + data.username + "'>" +
               "<span class='search_username'>" + data.username + "</span>" +
               addBtn +
               "<div class='profile_btn'><img src='/assets/images/profile_icon.png'></div>" + 
             "</div>"

    document.querySelector(".player_search_results").innerHTML += el
  }

  open(options = {}) {
    this.redraw()
    super.open(options)
  }

  redraw() {
    this.renderPendingRequests()
    this.renderFriends()
  }

  onRemoveFriendSuccessful() {
    this.redraw()
  }

  onFriendRequestAccepted(requestId) {
    this.redraw()
  }

  onFriendRequestIgnored(requestId) {
    this.redraw()
  }

  onFriendRequestSent() {
    this.redraw()
  }

  onTabClick(e) {
    let tab = e.target.closest(".friend_tab")
    if (!tab) return

    this.selectTab(tab.dataset.tab)
  }

  selectTab(view) {
    let selected = this.el.querySelector(".friend_tab.selected")
    if (selected) {
      selected.classList.remove('selected')
    }

    let activeTab = this.el.querySelector(".tab-pane.active")
    if (activeTab) {
      activeTab.classList.remove('active')
    }

    let tab = this.el.querySelector(`.friend_tab[data-tab='${view}']`)
    if (tab) {
      tab.classList.add("selected")
    }

    let tabContent = this.el.querySelector(`.tab-pane[data-tab='${view}']`)
    if (tabContent) {
      tabContent.classList.add("active")
    }
  }

  onPlayerSearchInputKeyup(e) {
    if (e.which === 13) {
      this.onPlayerSearchClick()
    }
  }

  onPlayerSearchResultsClick(e) {
    let row = e.target.closest(".player_search_row")
    let uid = row.dataset.uid
    let username = row.dataset.username

    let profileBtn = e.target.closest(".profile_btn")
    let addFriendBtn = e.target.closest(".add_search_friend_btn")

    if (profileBtn) {
      this.game.userProfileMenu.open({ uid: uid, username: username })
    } else if (addFriendBtn) {
      this.game.main.addFriend(uid)
      let btn = row.querySelector(".add_search_friend_btn")
      btn.parentElement.removeChild(btn)
    }
  }

  onFriendsContainerClick(e) {
    let removeFriendBtn = e.target.closest(".remove_friend_btn")
    let profileBtn = e.target.closest(".profile_btn")
    let friendRow = e.target.closest(".friend_row")

    if (profileBtn) {
      let uid = friendRow.dataset.uid
      let username = friendRow.dataset.username
      this.game.userProfileMenu.open({ uid: uid, username: username })
    } else if (removeFriendBtn) {
      //
      this.game.main.removeFriend(friendRow.dataset.uid)
    }
  }


  onPendingRequestContainerClick(e) {
    let acceptRequestBtn = e.target.closest(".accept_request_btn")
    let ignoreRequestBtn = e.target.closest(".ignore_request_btn")
    let friendRequestRow = e.target.closest(".friend_request_row")

    if (acceptRequestBtn) {
      let requestId = friendRequestRow.dataset.requestId
      this.game.main.acceptFriendRequest(requestId)
    } else if (ignoreRequestBtn) {
      let requestId = friendRequestRow.dataset.requestId
      this.game.main.ignoreFriendRequest(requestId)
    }
  }

  renderFriends() {
    document.querySelector(".my_friends_content").innerHTML = ""

    // online first
    for (let uid in this.game.main.friends) {
      let data = this.game.main.friends[uid]
      let onlineStatus = this.getOnlineStatus(data)
      if (onlineStatus === "Online") {
        let el = this.createFriendEl(data)
        document.querySelector(".my_friends_content").innerHTML += el
      }
    }

    // offline next
    for (let uid in this.game.main.friends) {
      let data = this.game.main.friends[uid]
      let onlineStatus = this.getOnlineStatus(data)
      if (onlineStatus !== "Online") {
        let el = this.createFriendEl(data)
        document.querySelector(".my_friends_content").innerHTML += el
      }
    }
  }

  renderPendingRequests() {
    document.querySelector(".pending_requests_content").innerHTML = ""

    let count = this.game.main.getPendingReceivedFriendRequestsCount()
    if (count === 0) {
      document.querySelector(".pending_request_tab").innerText = "Requests"
    } else {
      document.querySelector(".pending_request_tab").innerHTML = "<div>Requests <span class='pendign_request_count'>" + count + "</span></div>"
    }
    

    for (let uid in this.game.main.receivedFriendRequests) {
      let data = this.game.main.receivedFriendRequests[uid]
      if (data.status !== 'ignored') {
        let el = this.createFriendRequestEl(data)
        document.querySelector(".pending_requests_content").innerHTML += el
      }
    }
  }

  getOnlineStatus(data) {
    let friendUid

    let isRequestSentByMe = data.userUid === this.game.main.uid
    if (isRequestSentByMe) {
      friendUid = data.friendUid
    } else {
      friendUid = data.userUid
    }

    return this.game.main.onlinePlayers[friendUid] ? "Online" : "Offline"
  }

  createFriendEl(data) {
    let friendUid
    let friendName

    let isRequestSentByMe = data.userUid === this.game.main.uid
    if (isRequestSentByMe) {
      friendUid = data.friendUid
      friendName = data.receiver.username
    } else {
      friendUid = data.userUid
      friendName = data.sender.username
    }

    let status = this.game.main.onlinePlayers[friendUid] ? "Online" : "Offline"
    let statusKlass = this.game.main.onlinePlayers[friendUid] ? "online" : ""

    let removeFriendBtn = "<div class='remove_friend_btn'><img src='/assets/images/remove_friend_icon.png'></div>"  

    let el = "<div class='friend_row' data-uid='" + friendUid + "' data-username='" + friendName + "'>" + 
                "<div class='name'>" + friendName + "</div>" +
                removeFriendBtn +
                "<div class='profile_btn'><img src='/assets/images/profile_icon.png'></div>" + 
                "<div class='online_status " + statusKlass + "'>" + status + "</div>" + 
             "</div>"
    return el
  }

  createFriendRequestEl(data) {
    let el = "<div class='friend_request_row' data-request-id=" + data.id + ">" + 
                "<div class='name friend_requester_name'>" + data.sender.username + "</div>" +
                "<div class='ignore_request_btn'>Ignore</div>" + 
                "<div class='accept_request_btn'>Accept</div>" + 
             "</div>"
    return el
  }

}

module.exports = FriendsMenu
