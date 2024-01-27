const Config = require("junon-common/config")
const TeamEntry = require("./team_entry")
const SectorEntry = require("./sector_entry")
const ClientHelper = require("./../util/client_helper")
const ExceptionReporter = require("./../util/exception_reporter")
const Cookies = require("js-cookie")

class GameExplorer {

  constructor(main) {
    this.main = main

    this.el = document.querySelector(".browse_games_container")

    this.MATCHMAKER_WEBSOCKET_URL = this.getMatchmakerWebsocketUrl()
    this.isFirstSocketSetup = true
    this.reconnectDelay = 5
    this.reconnectAttemptCount = 0

    this.sectorEntries = {}
    this.teamEntries = { }
    this.topColonyEntries = {}
    this.searchColonyEntries = {}
    this.mineColonyEntries = {}
    this.favoriteColonyEntries = {}
    this.privateSectors = {}

    document.querySelector(".game_list_container").addEventListener("click", this.onGameListContainerClick.bind(this))
    document.querySelector("#join_game_btn").addEventListener("click", this.onGameInviteJoinGameClick.bind(this))
    document.querySelector("#region_select").addEventListener("change", this.onRegionChanged.bind(this), true)
    document.querySelector(".game_list_container").addEventListener("mouseover", this.onColonyListMouseover.bind(this), true)
    document.querySelector(".game_list_container").addEventListener("mouseleave", this.onColonyListMouseleave.bind(this), true)
    document.querySelector("#minigames_tab_content").addEventListener("click", this.onMiniGamesClick.bind(this), true)
    document.querySelector(".list_mode_btn").addEventListener("click", this.onListModeClick.bind(this), true)
    document.querySelector(".gallery_mode_btn").addEventListener("click", this.onGalleryModeClick.bind(this), true)
    document.querySelector(".main_game_mode_selector").addEventListener("mouseover", this.onGameModeSelectorMouseOver.bind(this), true)
    document.querySelector(".minigame_details_container").addEventListener("mousemove", this.onMiniGameDetailsMouseMove.bind(this), true)
    document.querySelector("#import_sector_menu .cancel_btn").addEventListener("click", this.onImportSectorCancelClick.bind(this), true)
    document.querySelector("#import_sector_menu .import_sector_btn").addEventListener("click", this.onImportSectorSubmitClick.bind(this), true)

    let colony_filter_tabs = document.querySelectorAll(".colony_filter_tab")
    for (var i = 0; i < colony_filter_tabs.length; i++) {
      let colony_filter_tab = colony_filter_tabs[i]
      colony_filter_tab.addEventListener("click", this.onColonyFilterTabClick.bind(this), true)
    }

    this.listTopColonies() 
  }

  setMiniGames(miniGames) {
    this.miniGames = miniGames
    this.renderMiniGames()
  }

  onListModeClick() {
    this.el.querySelector(".main_colony_list").classList.add("list_mode")
    this.el.querySelector(".search_colony_list").classList.add("list_mode")
    Cookies.set("list_mode", true)
  }

  onGameInviteJoinGameClick(e) {
    document.querySelector("#join_game_btn").innerText = "Loading.."
    setTimeout(() => {
      document.querySelector("#join_game_btn").innerText = "Join Game"
    }, 5000)
    this.onJoinGameBtnClick(e)
  }

  onGalleryModeClick() {
    this.el.querySelector(".main_colony_list").classList.remove("list_mode")
    this.el.querySelector(".search_colony_list").classList.remove("list_mode")
    Cookies.set("list_mode", false)
  }

  getMiniGame(miniGameId) {
    if (this.miniGames[miniGameId]) {
      return this.miniGames[miniGameId]
    }

    if (miniGameId === 'vbj91eofmFCiu' || miniGameId === 'YcdqgbswlAqRi') {
      return {
        "name": "Tower Defense",
        "playerCount": 0,
        "screenshot": "9f2495eb19ba4bc4868966567222b1e9",
        "creator": "Starmancer"
      }
    }
  }

  renderMiniGames() {
    let el = ""
    for (let id in this.miniGames) {
      let miniGame = this.miniGames[id]
      miniGame.playerCount
      let gameModeEntry = document.querySelector(".main_game_mode_entry[data-id='" + id + "']")
      if (gameModeEntry) {
        gameModeEntry.querySelector(".minigame_player_count").innerText = miniGame.playerCount + " players"
      }
    }
  }

  createMiniGameEntry(id, miniGame) {
    let screenshotPath = this.main.getScreenshotThumbnailPath(miniGame.screenshot)
    return "<div class='minigame_entry' data-id='" + id + "'>" + 
      "<img class='minigame_thumbnail' src='" + screenshotPath + "' />" +
      "<div class='minigame_name'>" + miniGame.name +  "</div>" +
      "<div class='minigame_creator'>" + miniGame.creator +  "</div>" +
      "<div class='minigame_player_count'>" + miniGame.playerCount + " " + i18n.t('players') + "</div>" +
    "</div>"
  }

  onMiniGamesClick(e) {
    let miniGameEntry = e.target.closest(".minigame_entry")
    if (!miniGameEntry) return

    this.joinMiniGame(miniGameEntry.dataset.id)
  }

  joinMiniGame(miniGameId, options = {}) {
    if (this.main.isJoinInProgress) return
    this.main.lockJoin()

    document.querySelector(".loading_modal").style.display = 'block'

    this.main.joinMiniGame(miniGameId, options)
  }

  getOnlineTeamCount() {
    return Object.keys(this.teamEntries).length
  }

  onMenuInteract(cmd) {
    switch(cmd) {
      case "ShiftTab":
        this.onShiftTab()
        break
      case "Tab":
        this.onTab()
        break
    }
  }

  onShiftTab() {
    this.onTabDirection(-1)
  }

  onTab() {
    this.onTabDirection(1)
  }

  onTabDirection(direction) {
    let tabs = Array.from(this.el.querySelectorAll(".colony_filter_tab"))
    if (tabs.length <= 1) return

    let tabIndex = Array.prototype.indexOf.call(tabs, this.lastActiveTab)
    
    if (direction > 0) {
      // next
      let isLastTab = tabIndex === tabs.length - 1
      if (isLastTab) {
        this.selectColonyFilterTab(tabs[0])
      } else {
        this.selectColonyFilterTab(tabs[tabIndex + 1])
      }
    } else {
      // prev
      let isFirstTab = tabIndex === 0
      if (isFirstTab) {
        this.selectColonyFilterTab(tabs[tabs.length - 1])
      } else {
        this.selectColonyFilterTab(tabs[tabIndex - 1])
      }
    }
  }

  selectVisitColonyFilter() {
    if (this.main.inviteToken) {
      this.selectColonyFilterTabByName("online")
      return
    }
    
    if (this.getOnlineTeamCount() === 0) {
      this.selectColonyFilterTabByName("mine")
    } else {
      this.selectColonyFilterTabByName("online")
    }
  }

  onSectorListFetchedFromMatchmaker() {
    this.hasFetchedSectorsFromMatchmaker = true
    this.renderTopColonies()
  }

  onColonyFilterTabClick(e) {
    this.selectColonyFilterTab(e.target)
  }

  selectColonyFilterTab(tab) {
    let selectedColonyFilterTab = document.querySelector(".colony_filter_tab.selected")
    if (selectedColonyFilterTab) {
      selectedColonyFilterTab.classList.remove("selected")
    }

    selectedColonyFilterTab = tab
    selectedColonyFilterTab.classList.add("selected")

    document.querySelector(".new_colony_launch_btn").style.display = 'none'
    document.querySelector("#minigames_tab_content").style.display = 'none'
    document.querySelector("#region_tab_content").style.display = 'inline-block'

    if (selectedColonyFilterTab.classList.contains("online_colonies_tab")) {
      this.filterColonyList("online")
    } else if (selectedColonyFilterTab.classList.contains("new_colonies_tab")) {
      this.filterColonyList("new")
    } else if (selectedColonyFilterTab.classList.contains("top_colonies_tab")) {
      this.filterColonyList("top")
    } else if (selectedColonyFilterTab.classList.contains("mine_colonies_tab")) {
      this.filterColonyList("mine")
      document.querySelector(".new_colony_launch_btn").style.display = 'inline-block'
    } else if (selectedColonyFilterTab.classList.contains("favorite_colonies_tab")) {
      this.filterColonyList("favorite")
    } else if (selectedColonyFilterTab.classList.contains("minigames_tab")) {
      document.querySelector("#minigames_tab_content").style.display = 'block'
      document.querySelector("#region_tab_content").style.display = 'none'
    }

    this.lastActiveTab = selectedColonyFilterTab
  }

  filterColonyList(filterType) {
    if (filterType === "mine") {
      document.querySelector(".search_colony_list").style.display = 'none'
      document.querySelector(".main_colony_list").style.display = 'block'
    } else {
      if (this.hasSearchResults() && !this.el.classList.contains("in_game_middle_menu")) {
        document.querySelector(".search_colony_list").style.display = 'block'
        document.querySelector(".main_colony_list").style.display = 'none'
      } else {
        document.querySelector(".search_colony_list").style.display = 'none'
        document.querySelector(".main_colony_list").style.display = 'block'
      }
    }

    this.el.querySelector(".main_colony_list").dataset.filter = filterType
  }

  hasSearchResults() {
    return document.querySelector(".search_world_input").value !== ""
  }

  sortNewColonies(colonies) {
    let newColonies = Object.values(colonies).filter((colonyData) => {
      return colonyData.week
    }).map((colonyData) => {
      let data = Object.assign({}, colonyData)
      data.sectorId = data.uid
      delete data['top']
      return data
    })

    return newColonies.sort((sectorData, otherSectorData) => {
      // give priority to weekly ranked sector
      let otherDaysAlive = otherSectorData.daysAlive || 0
      let daysAlive = sectorData.daysAlive || 0
      return otherDaysAlive - daysAlive
    })
  }

  sortTopColonies(colonies) {
    let topColonies = Object.values(colonies).filter((colonyData) => {
      return colonyData.top
    }).map((colonyData) => {
      let data = Object.assign({}, colonyData)
      data.sectorId = data.uid
      delete data['new']
      return data
    })

    return topColonies.sort((sectorData, otherSectorData) => {
      // give priority to weekly ranked sector
      let otherFavoriteCount = otherSectorData.favoriteCount || 0
      let favoriteCount = sectorData.favoriteCount || 0
      return otherFavoriteCount - favoriteCount
    })
  }

  parseAndSortTopColonies(topColonies) {
    // stored sectorId in dictionary value for later use in TeamEntry
    let validColonies = {}

    for (let sectorId in topColonies) {
      if (topColonies[sectorId].daysAlive) {
        validColonies[sectorId] = topColonies[sectorId]
        validColonies[sectorId].sectorId = sectorId
      }
    }

    let result = Object.values(validColonies)
    result.sort((sectorData, otherSectorData) => {
      // give priority to weekly ranked sector
      let otherDaysAlive = otherSectorData.daysAlive || 0
      let daysAlive = sectorData.daysAlive || 0
      return otherDaysAlive - daysAlive
    })

    return result
  }

  renderTopColonies() {
    if (this.topColonies && this.hasFetchedSectorsFromMatchmaker && !this.hasRenderedTopColonies) {

      let sorted = this.sortNewColonies(this.topColonies)

      sorted.forEach((colonyData) => {
        this.renderTopColony(colonyData)
      })

      sorted = this.sortTopColonies(this.topColonies)
      sorted.forEach((colonyData) => {
        this.renderTopColony(colonyData)
      })

      this.hasRenderedTopColonies = true
    }
  }

  addMyColonies(saveEntries) {
    saveEntries.forEach((entry) => {
      let colonyData = entry
      colonyData.mine = true
      colonyData.sectorId = colonyData.uid


      if (!this.hasMineColonyEntry(colonyData.sectorId)) {
        let isTopColony = true
        let teamEntry = new TeamEntry(this, colonyData, isTopColony)
        this.mineColonyEntries[colonyData.sectorId] = teamEntry

        this.el.querySelector(".main_colony_list").appendChild(teamEntry.el)
      }
    })
  }

  addFavoriteColonies(entries) {
    entries.forEach((entry) => {
      let colonyData = entry
      colonyData.favorite = true
      colonyData.sectorId = colonyData.uid

      if (!this.hasFavoriteColonyEntry(colonyData.sectorId)) {
        let isTopColony = true
        let teamEntry = new TeamEntry(this, colonyData, isTopColony)
        this.favoriteColonyEntries[colonyData.sectorId] = teamEntry

        this.el.querySelector(".main_colony_list").appendChild(teamEntry.el)
      }
    })
  }

  removeFavoriteColonies(entries) {
    entries.forEach((entry) => {
      let colonyData = entry
      colonyData.sectorId = colonyData.uid

      let teamEntry = this.favoriteColonyEntries[colonyData.sectorId]
      if (teamEntry) {
        teamEntry.remove()
        delete this.favoriteColonyEntries[colonyData.sectorId]
      }

    })
  }

  hasMineColonyEntry(sectorId) {
    return this.mineColonyEntries[sectorId]
  }

  hasFavoriteColonyEntry(sectorId) {
    return this.favoriteColonyEntries[sectorId]
  }

  listTopColonies() {
    let matchmakerUrl = Config[env].matchmakerUrl
    ClientHelper.httpRequest(matchmakerUrl + "top_colonies", {
      success: (result) => {
        try {
          this.topColonies = JSON.parse(result)
        } catch (e) {
          ExceptionReporter.captureException(e)
          this.topColonies = {}
        }
        this.renderTopColonies()
      },
      error: () => {
      }
    })

  }

  open() {
    if (this.main.game.shouldDenyMenuOpen) return

    this.closeAllMenus()
    this.show()

    if (this.isInGame()) {
      document.querySelector("#game_list_action_container").style.display = 'none'
    } else {
      document.querySelector("#game_list_action_container").style.display = 'block'
    }

    let isNotOpen = this.main.game.openMenus.indexOf(this) === -1
    if (isNotOpen) {
      this.main.game.openMenus.push(this)
    }
  }

  isModal() {
    return true
  }

  closeAllMenus() {
    this.main.game.closeAllMenus()
  }

  show() {
    this.selectVisitColonyFilter()
  }

  isInGame() {
    if (!this.main.game) return false
    return this.main.game.player
  }
  
  isClose() {
    return this.el.style.display === 'none'
  }

  attachToBody() {
    this.isAttachedToBody = true
    document.querySelector(".wrapper").appendChild(this.el)
    this.el.classList.add("in_game_middle_menu")
  }

  attachToMiddleContainer() {
    this.isAttachedToBody = false
    document.querySelector(".middle_container").appendChild(this.el)
    this.el.classList.remove("in_game_middle_menu")
  }

  toggle() {
    if (!this.isInGame()) return

    if (this.isAttachedToBody) {
      this.attachToMiddleContainer()
    } else {
      this.attachToBody()
    }
  }

  close() {

  }

  hide() {
  }

  renderTopColony(colonyData) {
    let isTopColony = true


    let teamEntry = new TeamEntry(this, colonyData, isTopColony)
    this.topColonyEntries[colonyData.sectorId] = teamEntry

    this.el.querySelector(".main_colony_list").appendChild(teamEntry.el)
  }

  resetSearch() {
    this.searchColonyEntries = {}
    this.el.querySelector(".search_colony_list").innerHTML = ""
  }

  renderSearchColony(colonyData) {
    let isTopColony = true
    let teamEntry = new TeamEntry(this, colonyData, isTopColony)
    this.searchColonyEntries[colonyData.sectorId] = teamEntry
    this.el.querySelector(".search_colony_list").appendChild(teamEntry.el)
  }

  findTeamEntry(sectorId) {
    return this.teamEntries[sectorId]
  }

  onColonyListMouseover(e) {
    if (!this.el.querySelector(".main_colony_list").classList.contains("list_mode")) {
      return
    }

    const screenshotEl = e.target.closest('.screenshot')
    const teamEntryRow = e.target.closest('.team_entry_row')
    if (screenshotEl && teamEntryRow) {
      let teamEntry = this.getEntry(teamEntryRow.dataset.key)
      let screenshot = teamEntry && teamEntry.getScreenshot()

      if (screenshot) {
        this.showPopupTimeout = setTimeout(() => {
          this.renderScreenshotsPopup(screenshot, teamEntryRow)
          this.showPopupTimeout = null
        }, 500)
      } else {
        this.hideScreenshotsPopup()
      }
    }
  }

  onGameModeSelectorMouseOver() {
    this.hideScreenshotsPopup()
  }

  onMiniGameDetailsMouseMove() {
    this.hideScreenshotsPopup()
  }

  onColonyListMouseleave(e) {
    const newElement = e.toElement || e.relatedTarget
    const teamEntryRow = newElement && newElement.closest('.team_entry_row')
    if (teamEntryRow) {
      // still referencing team entry. 
      return
    }

    this.hideScreenshotsPopup()
  }

  hideScreenshotsPopup() {
    if (this.showPopupTimeout) {
      clearTimeout(this.showPopupTimeout)
    }

    document.querySelector(".colony_preview_popup").style.display = 'none'
  }

  renderScreenshotsPopup(screenshot, teamEntryRow) {
    if (!screenshot) return
    if (this.isClose()) return

    let screenshotPopup = document.querySelector(".colony_preview_popup")
    screenshotPopup.style.display = 'block'
    screenshotPopup.innerHTML = ""

    let thumbnailPath = this.main.getScreenshotThumbnailPath(screenshot)
    let el = "<img src='" + thumbnailPath + "' />"
    screenshotPopup.innerHTML += el

    this.repositionScreenshotPopup(teamEntryRow)
  }

  repositionScreenshotPopup(teamEntryRow) {
    let boundingRect = teamEntryRow.getBoundingClientRect()
    let screenshotPopup = document.querySelector(".colony_preview_popup")

    const bottomMargin = 10
    const margin = 50
    let left = boundingRect.x - screenshotPopup.offsetWidth  / 2 + teamEntryRow.offsetWidth / 2
    let top  = teamEntryRow.offsetTop - margin

    left = Math.max(margin, left) // cant be lower than margin
    left = Math.min(window.innerWidth - screenshotPopup.offsetWidth - margin, left) // cant be more than than margin

    // if (top < margin) {
    //   // show at bottom instead
    //   top = boundingRect.bottom + (bottomMargin * 2)
    // }
    // top = Math.max(margin, top) // cant be lower than margin
    // top = Math.min(window.innerHeight - screenshotPopup.offsetHeight - margin, top) // cant be more than than margin

    screenshotPopup.style.left = left + "px"
    screenshotPopup.style.top  = top  + "px"
  }

  getEntry(teamKey) {
    let topColonyEntry = this.topColonyEntries[teamKey]
    if (topColonyEntry) return topColonyEntry

    let searchColonyEntry = this.searchColonyEntries[teamKey]
    if (searchColonyEntry) return searchColonyEntry

    let mineColonyEntry = this.mineColonyEntries[teamKey]
    if (mineColonyEntry) return mineColonyEntry

    let favoriteColonyEntry = this.favoriteColonyEntries[teamKey]
    if (favoriteColonyEntry) return favoriteColonyEntry

    let colonyEntry = this.teamEntries[teamKey]
    if (colonyEntry) return colonyEntry
  }

  onGameListContainerClick(event) {
    const sectorEntryRow = event.target.closest('.sector_entry_row')
    if (sectorEntryRow) {
      this.hideScreenshotsPopup()

      const prevSelectedRow = sectorEntryRow.closest('.sector_list').querySelector('.selected')
      if (prevSelectedRow) {
        prevSelectedRow.classList.remove("selected")
      }
      sectorEntryRow.classList.add("selected")
      let sectorId = sectorEntryRow.dataset.id
      let sectorEntry = this.sectorEntries[sectorId]
      this.selectGameEntry(sectorEntry)
      this.onJoinGameBtnClick()
      return
    }

    const teamEntryRow = event.target.closest('.team_entry_row')
    if (teamEntryRow) {
      this.hideScreenshotsPopup()

      if (event.target.closest(".team_delete_btn")) {
        this.confirmSaveDelete(teamEntryRow)
        return  
      }

      if (event.target.closest(".ban_world_btn")) {
        let teamEntry = this.teamEntries[teamEntryRow.dataset.key]
        this.banWorld(teamEntry.data.host, teamEntry.data.sectorId, teamEntry.data.creatorUid)
        return  
      }

      if (event.target.closest(".export_world_btn")) {
        this.exportWorld(teamEntryRow)
        return  
      }

      if (event.target.closest(".import_world_btn")) {
        this.importWorld(teamEntryRow)
        return  
      }

      if (this.isInGame() && 
          this.main.game.isAnonymousGame() &&
          this.main.game.isCreatedByPlayer()) {
        this.main.game.confirmMenu.open({
          message: i18n.t('ColonyLeaveConfirmMessage'),
          proceedCallback: this.visitTeamEntry.bind(this, teamEntryRow)
        })
      } else {
        this.visitTeamEntry(teamEntryRow)
      }
    }
  }

  async banWorld(host, sectorUid, creatorUid) {
    this.main.banManager.banWorld(host, sectorUid, creatorUid)
  }

  async exportWorld(teamEntryRow) {
    let idToken = await this.main.getFirebaseIdToken()
    if (!idToken) return

    let matchmakerUrl = Config[env].matchmakerUrl

    let teamKey = teamEntryRow.dataset.key
    let teamEntry = this.mineColonyEntries[teamKey]

    let path = `export_sector?idToken=${idToken}` + 
               `&sectorUid=${teamEntry.getSectorId()}` + 
               `&uid=${this.main.uid}`

    document.location.href = matchmakerUrl + path
  }

  importWorld(teamEntryRow) {
    document.querySelector("#import_sector_menu input[type='file']").value = null
    document.querySelector("#import_sector_menu").style.display = 'block'
    document.querySelector("#import_sector_menu").style.top = window.scrollY + window.innerHeight/4 + "px"

    document.querySelector(".import_sector_btn").classList.remove("disabled")
    document.querySelector(".import_sector_btn").innerText = "Upload"

    let teamKey = teamEntryRow.dataset.key
    let teamEntry = this.mineColonyEntries[teamKey]

    this.importSectorUid = teamKey

    document.querySelector("#import_sector_menu .sector_name").innerText = teamEntry.name
    document.querySelector("#import_sector_menu .sector_thumbnail").src = teamEntry.getThumbnailPath()
  }

  onImportSectorCancelClick() {
    document.querySelector("#import_sector_menu").style.display = 'none'
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#handling_the_upload_process_for_a_file
  async onImportSectorSubmitClick() {

    if (document.querySelector(".import_sector_btn").classList.contains("disabled")) {
      return
    }

    document.querySelector(".import_sector_btn").classList.remove("disabled")

    let idToken = await this.main.getFirebaseIdToken()
    if (!idToken) return

    if (!this.importSectorUid) return

    let file = document.querySelector("#import_sector_menu input[type='file']")
                       .files[0]

    if (!file) {
      alert("Save File required")
      return 
    }

    let matchmakerUrl = Config[env].matchmakerUrl
    let url = matchmakerUrl + "import_sector"

    fetch(url, {
      method : 'POST',
      headers: { 
        "Content-Type": "multipart/form-data;",
        'Token': idToken,
        'Sector': this.importSectorUid,
        'Uid': this.main.uid
      },
      body: file
    }).then((response) => {
      return response.json().then((data) => {
        if (data.error) {
          alert(data.error);
        } else {
          console.log(data);
          // success
          document.querySelector(".import_sector_btn").innerText = "Success"
          document.querySelector(".import_sector_btn").classList.add("disabled")
        }
      });
    }).catch(() => {
      alert("Upload server error ");
    })

//     const xhr = new XMLHttpRequest();
//     xhr.upload.addEventListener("progress", function(e) {
//       if (e.lengthComputable) {
//         const percentage = Math.round((e.loaded * 100) / e.total);
//         console.log("upload percent :" + percentage);
//       }
//     }, false);
// 
// 
//     xhr.upload.addEventListener("load", function(e){
//       debugger
//       console.log("upload complete..")
//     }, false);
// 
//     xhr.open("POST", url, true)
//     xhr.setRequestHeader('Token', idToken);
//     xhr.setRequestHeader('Sector', this.importSectorUid);
//     xhr.setRequestHeader('Content-Type', 'multipart/form-data');
// 
//     xhr.send(file)
  }

  confirmSaveDelete(teamEntryRow) {
    let yes = confirm("Are you sure you want to delete this save file?")
    if (yes) {
      let teamKey = teamEntryRow.dataset.key
      let teamEntry = this.mineColonyEntries[teamKey]
      this.deleteSaveEntry(teamEntry)
    }
  }

  async deleteSaveEntry(teamEntry) {
    if (!teamEntry) return

    let idToken = await this.main.getFirebaseIdToken()
    if (!idToken) return

    let matchmakerUrl = Config[env].matchmakerUrl
    let data = {
      idToken: idToken,
      region: this.main.region,
      sectorId: teamEntry.getSectorId(),
      uid: this.main.uid
    }

    ClientHelper.httpPost(matchmakerUrl + "delete_save", data, {
      success: (result) => {
        try {
          let data = JSON.parse(result)
          if (data.error) {
            this.main.onPlayerCantJoin({ message: data.error })
          } else {
            // success
            this.removeSaveTeamEntry(teamEntry.getSectorId())
          }
        } catch(e) {
          this.main.onPlayerCantJoin({ message: i18n.t("Unable to delete save") })
        }
      },
      error: () => {
        this.main.onPlayerCantJoin({ message: i18n.t("Unable to delete save") })
      }
    })

  }

  removeSaveTeamEntry(sectorUid) {
    let teamEntry = this.mineColonyEntries[sectorUid]
    if (teamEntry) {
      teamEntry.remove()
      delete this.mineColonyEntries[sectorUid]
    }
  }


  visitTeamEntry(teamEntryRow) {
    const prevSelectedRow = teamEntryRow.closest('.colony_list').querySelector('.selected')
    if (prevSelectedRow) {
      prevSelectedRow.classList.remove("selected")
    }
    teamEntryRow.classList.add("selected")
    let teamKey = teamEntryRow.dataset.key

    let mineColonyEntry = this.mineColonyEntries[teamKey]
    if (mineColonyEntry) {
      this.selectGameEntry(mineColonyEntry)

      if (this.selectedEntry.isOffline() && !this.isInGame()) {
        this.showLoadGameSettings()
      } else {
        this.onJoinGameBtnClick()
      }
      return  
    }

    let favoriteColonyEntry = this.favoriteColonyEntries[teamKey]
    if (favoriteColonyEntry) {
      this.selectGameEntry(favoriteColonyEntry)
      this.onJoinGameBtnClick()
      return  
    }

    // find from topColonyEntries
    let topColonyEntry = this.topColonyEntries[teamKey]
    if (topColonyEntry) {
      this.selectGameEntry(topColonyEntry)
      this.onJoinGameBtnClick()
      return  
    }

    let searchColonyEntry = this.searchColonyEntries[teamKey]
    if (searchColonyEntry) {
      this.selectGameEntry(searchColonyEntry)
      this.onJoinGameBtnClick()
      return  
    }

    // find from teamEntries
    let teamEntry = this.teamEntries[teamKey]
    this.selectGameEntry(teamEntry)
    this.onJoinGameBtnClick()
    return
  }

  selectGameEntry(sectorEntry) {
    this.selectedEntry = sectorEntry
    document.querySelector("#join_game_btn").dataset.disabled = ''
  }

  isAlreadyInsideSector(sectorId) {
    return this.main.game.isActive && 
           this.main.game.sector && 
           this.main.game.sector.uid === sectorId 
  }

  onJoinGameBtnClick(event) {
    if (this.main.isJoinInProgress) return
    this.main.lockJoin()

    if (this.selectedEntry) {
      if (this.isAlreadyInsideSector(this.selectedEntry.getSectorId())) {
        return
      }

      let isOwnedByMe = this.main.user && this.main.user.uid === this.selectedEntry.data.creatorUid 
      if (!isOwnedByMe && this.selectedEntry.isPrivate) {
        let isDirectLinkMatch = this.main.getUrlParam().get("e") === this.selectedEntry.getSectorId()
        if (!isDirectLinkMatch) {
          this.main.onPlayerCantJoin({ message: "Colony is Private" })
          return
        }
      }


      if (this.selectedEntry.isOffline()) {
        // boot sector
        this.selectedEntry.startBoot()
      } else {
        this.selectedEntry.join()
      }
    } else {
      this.joinRandomSectorEntry()
    }
  }

  showLoadGameSettings() {
    this.main.showLoadGameSettings(this.selectedEntry)
    this.hide()
  }

  continueAction() {
    this.onJoinGameBtnClick()
  }



  visitSector(data) {
    let isTopColony = true
    let teamEntry = new TeamEntry(this, data, isTopColony)
    this.selectedEntry = teamEntry

    if (this.isInGame() && 
        this.main.game.isAnonymousGame() &&
        this.main.game.isCreatedByPlayer()) {
      this.main.game.confirmMenu.open({
        message: i18n.t('ColonyLeaveConfirmMessage'),
        proceedCallback: this.onJoinGameBtnClick.bind(this)
      })
    } else {
      this.onJoinGameBtnClick()
    }

  }

  isSectorOnline(sectorUid) {
    let sectorEntry = this.getSectorEntry(sectorUid)
    return !!sectorEntry
  }

  getSectorEntry(sectorUid) {
    return this.sectorEntries[sectorUid]
  }

  onSectorEntryAdded(sectorEntry) {
  }

  selectColonyFilterTabByName(filterType) {
    let tab = document.querySelector(`.colony_filter_tab.${filterType}_colonies_tab`)
    this.selectColonyFilterTab(tab)
  }

  joinRandomSectorEntry() {
    let sectorList = Object.values(this.sectorEntries)
    let joinableSectorList = sectorList.filter((sectorEntry) => {
      return sectorEntry.getPlayerCount() < 20
    })

    let currentVersionSectorList = joinableSectorList.filter((sectorEntry) => {
      return sectorEntry.getVersion() === this.main.getVersion()
    })

    let oldVersionSectorList = joinableSectorList.filter((sectorEntry) => {
      return sectorEntry.getVersion() !== this.main.getVersion()
    })

    let randomIndex
    let randomSectorEntry

    if (currentVersionSectorList.length > 0) {
      randomIndex = Math.floor(Math.random() * currentVersionSectorList.length)
      randomSectorEntry = currentVersionSectorList[randomIndex]
    }

    if (!randomSectorEntry && oldVersionSectorList.length > 0) {
      randomIndex = Math.floor(Math.random() * oldVersionSectorList.length)
      randomSectorEntry = oldVersionSectorList[randomIndex]
    }

    if (!randomSectorEntry) {
      this.main.onPlayerCantJoin({ message: "Unable to join any servers" })
      return
    }

    randomSectorEntry.join()
  }

  isSectorsTabSelected() {
    return document.querySelector(".sectors_tab").classList.contains("selected")
  }

  getRegion() {
    return this.main.region
  }

  onRegionChanged(event) {
    let region = event.target.value
    let oldRegion = this.getRegion()
    this.main.setRegion(region)
  }

  getMatchmakerWebsocketUrl() {
    return Config[env].matchmakerWebsocketUrl
  }

  requestGame(ip, options = {}) {
    this.main.requestGame(this.main.getServerWebsocketUrl(ip), options)
  }

  onInventoryChanged() {

  }

  init(cb) {
    this.websocketSetupTime = (new Date()).getTime()

    this.setupMatchmakerSocket({
      success: this.onMatchmakerConnectSuccess.bind(this, cb)
    })
  }

  setupMatchmakerSocket(callback) {
    this.socket = new WebSocket(this.MATCHMAKER_WEBSOCKET_URL)

    this.socket.onopen = () => {
      if (this.isFirstSocketSetup) {
        this.isFirstSocketSetup = false
        let selfTime = (new Date()).getTime() - this.websocketSetupTime
        let time = (new Date()).getTime() - window.initializeTime

        console.log("connected to: " + this.MATCHMAKER_WEBSOCKET_URL)
        console.log("matchmaker websocket established - " + [(selfTime / 1000).toFixed(1), (time / 1000).toFixed(1)].join("/") + " seconds")
      }

      if (callback.success) callback.success()
    }

    this.socket.onmessage = this.onMatchmakerMessage.bind(this)

    this.socket.onerror = () => {
      if (callback.error) callback.error()
    }

    this.socket.onclose = this.onSocketDisconnect.bind(this)
  }

  closeConnection() {
    this.isForceClosed = true

    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close()
    }
  }

  onSocketDisconnect(event) {
    if (this.isForceClosed) return

    const delay = (this.reconnectAttemptCount + 1) * this.reconnectDelay
    if (this.reconnectAttemptCount > 4) {

    } else {
      this.attemptReconnect(delay)
    }
  }

  attemptReconnect(delay) {
    let reconnect = this.reconnectWebsocket.bind(this, { success: this.onMatchmakerConnectSuccess.bind(this) })
    setTimeout(reconnect, delay * 1000)
  }

  onMatchmakerConnectSuccess(cb) {
    this.requestRegionGames()
    this.keepAlivePingInterval()
    this.main.onMatchmakerConnectSuccess()
    if (cb) cb()
  }

  keepAlivePingInterval() {
    clearInterval(this.keepAlivePingInterval)

    let twoMinutes = 1000 * 60 * 2
    setInterval(() => {
      this.sendToMatchmaker({ event: "1" })
    }, twoMinutes)
  }

  requestRegionGames() {
    let envToSend = window.test_vm ? 'vm' : env

    let data = { env: envToSend }

    this.sendToMatchmaker({ event: "MatchFilter", data: data })
    this.sendToMatchmaker({ event: "RequestSectorList" })
  }

  sendToMatchmaker(json) {
    let data = JSON.stringify(json)

    if (this.socket.readyState !== WebSocket.OPEN) return
      
    this.socket.send(data)
  }

  reconnectWebsocket(callback) {
    if (debugMode) {
      console.log("Reconnecting matchmaker socket...")
    }

    this.reconnectAttemptCount += 1
    this.setupMatchmakerSocket(callback)
  }

  onMatchmakerMessage(event) {
    let message = JSON.parse(event.data)

    switch(message.event) {
      // ping back from matchamerk
      case "1":
        this.onPong(message.data)
        break
      case "JoinMiniGameStatus":
        this.onJoinMiniGameStatus(message.data)
        break
      case "PlayerBootSectorStatus":
        this.onPlayerBootSectorStatus(message.data)
        break
      case "PlayerCreateSectorStatus":
        this.onPlayerCreateSectorStatus(message.data)
        break
      case "SectorList":
        this.renderSectorList(message.data)
        break
      case "RemoveSector":
        this.removeSectorFromMatchmaker(message.data)
        break
      case "ServerChat":
        this.onServerChat(message.data)
        break
      case "ChatHistory":
        this.onChatHistory(message.data)
        break
      case "Team":
        break
      case "SectorUpdated":
        this.renderTeam(message.data)
        break
      case "SectorInfo":
        this.onSectorInfo(message.data)
        break
      case "PlayerOnline":
        this.onPlayerOnline(message.data)
        break
      case "PlayerOffline":
        this.onPlayerOffline(message.data)
        break
      case "FriendRequest":
        this.onFriendRequest(message.data)
        break
      case "FriendAccepted":
        this.onFriendAccepted(message.data)
        break
      case "OnlineList":
        this.onOnlineList(message.data)
        break
    }
  }

  onPong(data) {
  }

  fetchSectorData(sectorId, cb){
    this.sendToMatchmaker({ event: "GetSector", data: { sectorId: sectorId } })
    this.onSectorFetched = cb
  }

  onSectorInfo(data) {
    this.onSectorFetched(data.sector)
  }

  onPlayerOnline(data) {
    this.main.onPlayerOnline(data)
  }

  onPlayerOffline(data) {
    this.main.onPlayerOffline(data)
  }

  onFriendRequest(data) {
    this.main.onFriendRequestReceived(data)
  }

  onFriendAccepted(data) {
    this.main.onFriendAccepted(data)
  }

  onOnlineList(data) {
    this.main.onOnlineList(data)
  }

  onServerChat(data) {
    if (!this.main.game) return
    if (!this.main.game.chatMenu) return

    this.main.game.chatMenu.onGlobalServerChat(data)
  }

  onChatHistory(data) {
    if (!this.main.game) return

    this.main.game.chatMenu.onChatHistory(data)
  }

  onJoinMiniGameStatus(data) {
    if (data.error) {
      document.querySelector(".loading_modal").style.display = 'none'
      this.main.onPlayerCantJoin({ message: data.error })
      this.main.enableJoin()
    } else {
      this.requestGame(data.host, { sectorId: data.sectorId })
    }
  }

  onPlayerBootSectorStatus(data) {
    if (!this.selectedEntry) return
    if (data.profile) console.log(data.profile)

    if (data.error) {
      this.main.onPlayerCantJoin({ message: data.error })
      this.selectedEntry.cancelBoot()
    } else {
      if (data.sector) {
        this.renderSector(data.sector)        
      }

      if (data.isGameReady) {
        this.selectedEntry.finishBoot()
      }
    }
  }

  onPlayerCreateSectorStatus(data) {
    this.main.onPlayerCreateSectorStatus(data)
  }

  renderSectorList(data) {
    this.main.onSectorListPopulated()
    this.main.pvpExplorer.renderSectorList(data)

    let sectors = data.sectors

    for (let id in this.sectorEntries) {
      let currentSectorEntry = this.sectorEntries[id]
      let isSectorNoLongerPresent = !sectors[id]
      if (isSectorNoLongerPresent) {
        this.removeSector({ region: data.region, id: id })
      }
    }
    
    for (let sectorId in sectors) {
      let sector = sectors[sectorId]

      this.renderSector(sector)
      this.renderTeam(sector)
    }

    this.onSectorListFetchedFromMatchmaker()
  }

  createTeamEntry(team) {
    team.online = true
    let teamEntry = new TeamEntry(this, team)

    let teamKey = this.getTeamKey(team)
    this.teamEntries[teamKey] = teamEntry

    let colonyListBody = this.el.querySelector(".main_colony_list")

    // determine insert position
    // if its daysAlive is less than mine, then insert it before there

    let teamEntryElements = colonyListBody.querySelectorAll(".team_entry_row.online")
    if (teamEntryElements.length === 0) {
      colonyListBody.insertBefore(teamEntry.el, colonyListBody.firstElementChild)
    } else {
      let insertBeforeEl = this.getTeamEntryElToInsertBefore(teamEntryElements, team)
      colonyListBody.insertBefore(teamEntry.el, insertBeforeEl)
    }
    
  }

  getTeamEntryElToInsertBefore(teamEntryElements, team) {
    let targetTeamEntryEl
    let teamEntryEl

    for (var i = 0; i < teamEntryElements.length; i++) {
      teamEntryEl = teamEntryElements[i]
      let teamEntryDaysAlive = teamEntryEl.dataset.days
      if (team.daysAlive >= teamEntryDaysAlive) {
        targetTeamEntryEl = teamEntryEl
        break
      }
    }

    if (!targetTeamEntryEl) {
      return teamEntryEl.nextSibling
    } else {
      return targetTeamEntryEl
    }
  }

  createSectorEntry(sector) {
    let sectorEntry = new SectorEntry(this, sector)

    this.sectorEntries[sector.id] = sectorEntry
    this.main.onSectorEntryAdded(sectorEntry)
  }

  removeSectorFromMatchmaker(sector) {
    this.main.pvpExplorer.removeSector(sector)
    this.removeSector(sector)
  }

  removeSector(sector) {
    let sectorEntry = this.sectorEntries[sector.id]
    if (sectorEntry) {
      sectorEntry.remove()
      this.main.onSectorEntryRemoved(sectorEntry)

      for (let teamName in sector.teams) {
        let team = sector.teams[teamName]
        this.removeTeam(team)
      }
    }

    // if pass in func parameter without teams data, we need to go through 
    // teamEntries as well and delete any that matches sector id
    for (let id in this.teamEntries) {
      let teamEntry = this.teamEntries[id]
      if (teamEntry.getSectorId() === sector.id) {
        teamEntry.remove()        
      }
    }
  }

  removeTeam(team) {
    let teamKey = this.getTeamKey(team)
    let teamEntry = this.teamEntries[teamKey]
    if (teamEntry) {
      teamEntry.remove()
    }
  }

  renderSector(sector) {
    this.main.pvpExplorer.renderSector(sector)

    if (sector.gameMode === 'pvp') return

    let sectorEntry = this.sectorEntries[sector.id]

    if (!sectorEntry) {
      this.createSectorEntry(sector)  
    } else {
      sectorEntry.update(sector)
    }
  }

  getTeamKey(team) {
    return team.sectorId
  }

  getTopColonyKey(team) {
    return team.sectorId
  }

  renderTeam(team) {
    let isMiniGame = team.id.match(/mini-(.*)-/)
    if (isMiniGame) return

    if (team.name === "Tutorial Lobby") return

    let teamKey = this.getTeamKey(team) 
    let teamEntry = this.teamEntries[teamKey]

    if (!teamEntry && team.playerCount > 0) {
      this.createTeamEntry(team)
      if (team.isPrivate) {
        this.privateSectors[team.sectorId] = true
      }
    } else if (team.playerCount === 0) {
      this.removeTeam(team)
    } else {
      teamEntry.update(team)
    }

    this.updateColonyEntries(team)
  }

  updateColonyEntries(team) {
    // make sure top colony entries are hidden if game is set to private
    let colonyKey = this.getTopColonyKey(team)


    let topColonyEntry = this.topColonyEntries[colonyKey]
    if (topColonyEntry) topColonyEntry.update(team)

    let searchColonyEntry = this.searchColonyEntries[colonyKey]
    if (searchColonyEntry) searchColonyEntry.update(team)

    let mineColonyEntry = this.mineColonyEntries[colonyKey]
    if (mineColonyEntry) mineColonyEntry.update(team)

    let favoriteColonyEntry = this.favoriteColonyEntries[colonyKey]
    if (favoriteColonyEntry) favoriteColonyEntry.update(team)
  }


}

module.exports = GameExplorer
