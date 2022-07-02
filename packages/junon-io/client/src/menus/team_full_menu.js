const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class TeamFullMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".create_new_team_btn").addEventListener("click", this.onCreateNewTeamBtnClick.bind(this))
  }

  open(options = {}) {
    super.open(options)

    let teamData = options.team
    let memberNames = Object.values(teamData.members).map((member) => { return member.name })
    memberNames = ["sneaky", "xbeep"]

    this.el.querySelector(".team_full_description").innerText = "Team " + teamData.name + " is currently FULL with 5 members online" 
    this.el.querySelector(".team_full_member_names").innerText = memberNames.join(", ")
  }

  isControllingPlayerRequired() {
    return false
  }

  onCreateNewTeamBtnClick() {
    this.game.main.pvpExplorer.lastSectorEntry.join({ isNewTeam: true })
  }

}



module.exports = TeamFullMenu 