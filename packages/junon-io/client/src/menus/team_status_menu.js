const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")


/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class TeamStatusMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {

  }

  cleanup() {
    this.el.innerHTML = ""
  }

  // if i joined/created a team, show members
  showTeamMembers(team) {
    if (!team) return
    this.renderMembers(team.members)
  }

  renderMembers(members) {
    this.el.innerHTML = this.createMemberListHTML(members)
  }

  createMemberListHTML(members) {
    let list = ""

    Object.values(members).forEach((member) => {
      let isSelf = member.id === this.game.player.id
      if (!isSelf) {
        let entry = "<div class='member_status_entry' data-member-id='" + member.id +  "' >" + 
                      "<div class='member_status_name'>" + member.name + "</div>" + 
                      "<div class='member_health_container bar_container'>" +
                        "<div class='bar_fill'></div>" +
                      "</div>" +
                    "</div>"
        list += entry
      }
    })

    return list
  }

  updateMemberHealth(data) {
    if (!this.game.sector) return
    let entityId = data.entityId
    let entity = this.game.sector.getEntity(entityId)

    let memberEntry = this.el.querySelector(".member_status_entry[data-member-id='" + entityId + "']")
    if (memberEntry && entity) {
      let curr = data.health
      let max  = entity.getMaxHealth()

      memberEntry.querySelector(".bar_fill").style.width = (curr/max * 100) + "%"
    }
  }


}



module.exports = TeamStatusMenu 