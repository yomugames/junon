const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")


/*
    while element references only inventory, it actually changes hotbar/quick_inventory as well
*/
class AllianceMenu extends BaseMenu {
  onMenuConstructed() {
  }

  render(team) {
    this.team = team

    this.el.querySelector(".alliance_relationship_percentage").innerText = this.team.relationshipScore + " / 100"

    this.renderRelationshipStatus()
    this.renderDeeds()
  }

  renderRelationshipStatus() {
    this.el.querySelector(".alliance_relationship_status").innerText = i18n.t(this.team.relationshipStatus)
    if (this.team.relationshipStatus === "Hostile") {
      this.el.querySelector(".alliance_relationship_status").classList.remove("friendly")
      this.el.querySelector(".alliance_relationship_status").classList.add("hostile")
    } else if (this.team.relationshipStatus === "Friendly") {
      this.el.querySelector(".alliance_relationship_status").classList.remove("hostile")
      this.el.querySelector(".alliance_relationship_status").classList.add("friendly")
    }
  }

  renderDeeds() {
    let deedList = ""

    for (let deed in this.team.deeds) {
      let deedData = Constants.Deeds[deed]
      let className = deedData.effect < 0 ? 'deed_entry negative' : 'deed_entry positive'
      let deedDescriptionTranslationKey = deed + ".Description"
      let deedDescription = i18n.has(deedDescriptionTranslationKey) ? i18n.t(deedDescriptionTranslationKey) : deedData.description
      deedList += "<div class='" + className + "'>" + deedData.effect + " " + deedDescription + "</div>"
    }

    this.el.querySelector(".alliance_relationship_details").innerHTML = deedList
  }
}

module.exports = AllianceMenu
