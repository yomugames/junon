const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class TeamRequestMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.addEventListener("click", this.onTeamRequestMenuClick.bind(this), true)
  }

  createTeamRequestEntry(data) {
    let playerName = data.playerName

    let el = "<div class='team_request_entry' data-player-id=" + data.playerId + ">" +
               "<div class='team_request_message'><span class='team_requester'>" + playerName + "</span> " + i18n.t('requests to join your team') + "</div>" +
               "<div class='accept_team_request_btn ui_btn' >" + i18n.t('Accept') + "</div>" +
               "<div class='reject_team_request_btn ui_btn' >" + i18n.t('Reject') +"</div>" +
             "</div>"

    this.el.innerHTML += el
  }

  removeTeamRequestEntry(data) {
    let teamRequestEntry = this.el.querySelector(".team_request_entry[data-player-id='" + data.playerId + "']")
    if (teamRequestEntry && teamRequestEntry.parentElement) {
      teamRequestEntry.parentElement.removeChild(teamRequestEntry)
    }
  }

  onTeamRequestMenuClick(event) {
    let entry = event.target.closest(".team_request_entry")
    let playerId = entry.dataset.playerId

    if (event.target.classList.contains("accept_team_request_btn")) {
      entry.parentElement.removeChild(entry)
      SocketUtil.emit("AcceptTeamRequest", { playerId: playerId })
    } else if (event.target.classList.contains("reject_team_request_btn")) {
      entry.parentElement.removeChild(entry)
      SocketUtil.emit("AcceptTeamRequest", { playerId: playerId, isReject: true })
    }
  }


}



module.exports = TeamRequestMenu
