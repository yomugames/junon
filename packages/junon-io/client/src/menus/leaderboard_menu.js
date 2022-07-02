const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const ClientHelper = require("./../util/client_helper")

class LeaderboardMenu extends BaseMenu {

  onMenuConstructed() {
    this.el.querySelector(".leaderboard_tab_container").addEventListener("click", this.onTabClick.bind(this), true)
    this.activeTabContent = this.el.querySelector(".leaderboard_tab_content[data-tab='team']")
  }

  onTabClick(e) {
    let tab = e.target.closest(".leaderboard_tab")
    if (!tab) return

    let selectedTab = this.el.querySelector(".leaderboard_tab.selected")
    if (selectedTab) {
      selectedTab.classList.remove("selected")
    }

    tab.classList.add("selected")

    let tabName = tab.dataset.tab

    let tabContent = this.el.querySelector(".leaderboard_tab_content[data-tab='" + tabName + "']")
    if (!tabContent) return

    this.activeTabContent.style.display = 'none'

    this.activeTabContent = tabContent
    this.activeTabContent.style.display = 'block'
  }

  isModal() {
    return false
  }

  onCancelBtnClick() {
  }

  update(data) {
    this.updateTeamRankings(data)
    this.updatePlayerRankings(data)
  }

  updateTeamRankings(data) {
    let el = ""
    let sortedRankings = data.rankings.sort((a, b) => {
      return b.score - a.score
    })
    
    for (let i = 0; i < sortedRankings.length; i++) {
      let ranking = sortedRankings[i]
      el += "<div class='leaderboard_entry' data-id='" + ranking.id +  "'>" +
              "<div class='team_name'>" + ranking.name + "</div>" +
              "<div class='team_score'>" + ranking.score + "</div>" +
            "</div>"
    }

    this.el.querySelector(".team_ranking").innerHTML = el
  }

  updatePlayerRankings(data) {
    let el = ""
    let sortedRankings = data.playerRankings.sort((a, b) => {
      return b.score - a.score
    })
    
    for (let i = 0; i < sortedRankings.length; i++) {
      let ranking = sortedRankings[i]
      el += "<div class='leaderboard_entry' data-id='" + ranking.id +  "'>" +
              "<div class='team_name'>" + ranking.name + "</div>" +
              "<div class='team_score'>" + ranking.score + "</div>" +
            "</div>"
    }

    this.el.querySelector(".player_ranking").innerHTML = el
  }

  open() {
    this.el.style.display = 'block'
  }

}

module.exports = LeaderboardMenu