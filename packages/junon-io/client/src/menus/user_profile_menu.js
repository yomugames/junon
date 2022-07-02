const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const FirebaseClientHelper = require('./../util/firebase_client_helper')

class UserProfileMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    document.querySelector(".visit_colony_btn").addEventListener("click", this.onVisitColonyBtnClick.bind(this), true)
    document.querySelector(".user_colonies").addEventListener("click", this.onUserColoniesClick.bind(this), true)
  }

  onVisitColonyBtnClick() {
    if (this.userData) {
      let sector = this.userData.sector

      let data = {
        name: sector.name,
        daysAlive: sector.dayCount,
        sectorId: sector.uid
      }

      this.getGameExplorer().visitSector(data)
    }
  }

  onUserColoniesClick(e) {
    let colonyEntry = e.target.closest('.user_colony_entry')
    if (colonyEntry) {
      let sectorUid = colonyEntry.dataset.uid
      let daysAlive = colonyEntry.dataset.days
      let data = {
        name: colonyEntry.querySelector(".user_colony_name").innerText,
        daysAlive: daysAlive,
        sectorId: sectorUid
      }
      this.getGameExplorer().visitSector(data)
    }
  }

  getGameExplorer() {
    return this.game.main.gameExplorer
  }

  async open(options = {}) {
    options.dontCloseMenus = true

    super.open(options)

    this.uid = options.uid
    this.username = options.username

    if (this.uid) {
      document.querySelector("#user_profile_menu .guest_account_label").style.display = 'none'

      let result = await this.game.main.getUserRecord(this.uid)
      if (!result.error) {
        this.userData = result
        this.renderAccount()
      } else {
        this.userData = null
        this.renderAnonymous()
      }
    } else {
      this.userData = null
      this.renderAnonymous()
    }
  }

  renderAccount() {
    let sector = this.userData.sector
    let colonies = this.userData.saves

    document.querySelector("#user_profile_menu .username_header").innerText = this.username
    document.querySelector("#user_profile_menu .user_profile_details").style.display = 'block'

    if (sector && !sector.isPrivate) {
      document.querySelector("#user_profile_menu .visit_colony_btn").style.display = 'inline-block'
      document.querySelector("#user_profile_menu .colony_name").innerText = sector.name
      document.querySelector("#user_profile_menu .colony_day_count").innerText = sector.dayCount
    } else {
      document.querySelector("#user_profile_menu .visit_colony_btn").style.display = 'none'
    }

    document.querySelector(".user_colonies").innerHTML = ""

    let isMe = this.game.main.user && this.game.main.user.uid === this.userData.uid 

    for (let sectorUid in colonies) {
      let colony = colonies[sectorUid]

      if (colony.isPrivate) {
      } else {
        this.createColonyEntry(colony)
      }
    }
  }

  createColonyEntry(colony) {
    let entry = "<div class='user_colony_entry' data-uid='" + colony.uid + "' data-days='" + colony.daysAlive + "'>" + 
                  "<div class='user_colony_name'>" + colony.name + "</div>" +    
                  "<div class='user_colony_visit_btn ui_btn'>" + i18n.t('Visit') + "</div>" +    
                  "<div class='user_colony_day_count'>" + colony.daysAlive + " " + i18n.t('Days') + "</div>" +    
                "</div>"

    document.querySelector(".user_colonies").innerHTML += entry
  }

  renderAnonymous() {
    document.querySelector("#user_profile_menu .username_header").innerText = this.username
    document.querySelector("#user_profile_menu .user_profile_details").style.display = 'none'
    document.querySelector("#user_profile_menu .visit_colony_btn").style.display = 'none'

    document.querySelector("#user_profile_menu .guest_account_label").style.display = 'block'
  }

}



module.exports = UserProfileMenu 