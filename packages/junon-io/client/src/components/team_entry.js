class TeamEntry {
  constructor(gameExplorer, team, isTopColony) {
    this.gameExplorer = gameExplorer
    this.main = gameExplorer.main
    this.isTopColony = isTopColony

    this.el = document.createElement("div")
    this.el.className = "team_entry_row"

    if (team.week) {
      this.el.classList.add('new')
    } 
    if (team.top) {
      this.el.classList.add('top')
    }
    if (team.mine) {
      this.el.classList.add('mine')
      this.isMine = true
    } 
    if (team.favorite) {
      this.el.classList.add('favorite')
    } 
    if (team.online) {
      this.el.classList.add('online')
    }

    this.data = team
    
    if (!this.data.sectorId) {
      this.data.sectorId = this.data.uid
    }

    this.el.innerHTML += "<img class='screenshot' src='" + this.getThumbnailPath() + "' />"
    this.el.innerHTML += "<div class='info_name'></div>"
    
    if (team.online && this.main.isModerator()) {
      this.el.innerHTML += "<div class='ban_world_btn'>Ban</div>"
    }

    if (this.isMine) {
      this.el.innerHTML += "<img class='team_delete_btn' src='/assets/images/trash_icon.png' />"
      this.el.innerHTML += "<img class='export_world_btn' src='/assets/images/download_icon.png' />"
      this.el.innerHTML += "<img class='import_world_btn' src='/assets/images/upload_icon.png' />"
    }

    this.el.innerHTML += "<div class='team_member_count'></div>"
    this.el.innerHTML += "<div class='team_days_alive'></div>"

    this.update(team)
  }

  getThumbnailPath() {
    let screenshot = this.getScreenshot()
    let thumbnailPath
    if (!screenshot) {
      thumbnailPath = "/assets/images/background/placeholder_thumbnail.png"
    } else {
      thumbnailPath = this.main.getScreenshotThumbnailPath(screenshot)
    }

    return thumbnailPath
  }

  getScreenshot() {
    if (this.data.screenshot) return this.data.screenshot
    if (!this.data.screenshots) return null
    return Object.keys(this.data.screenshots)[0]
  }

  select() {
    this.el.classList.add("selected")
  }

  join() {
    if (this.isFull() && this.gameExplorer.isInGame()) {
      this.main.game.displayError("Max Players Reached. Unable to Join.", { warning: true })
      return
    }

    if (this.main.shouldShowVideoAd()) {
      this.main.videoAdCompleteCallback = this.joinColony.bind(this)
      this.main.displayVideoAd()
    } else {
      this.joinColony()
    }
  }

  joinColony() {
    this.main.recordColonyVisit()
    let ip = this.getIp()
    this.gameExplorer.requestGame(ip, { sectorId: this.getSectorId(), teamId: this.data.id })
  }

  startBoot() {
    if (this.main.shouldShowVideoAd()) {
      this.main.videoAdCompleteCallback = this.performBoot.bind(this)
      this.main.displayVideoAd()
    } else {
      this.performBoot()
    }
  }

  performBoot() {
    this.isBooting = true
    this.showBootStatus()
    this.main.bootSector(this.getSectorId())
  }

  showBootStatus() {
    document.querySelector(".loading_modal").style.display = 'block'
  }

  hideBootStatus() {
    document.querySelector(".loading_modal").style.display = 'none'
  }

  cancelBoot() {
    this.isBooting = false
    this.hideBootStatus()
  }

  finishBoot() {
    if (!this.isBooting) return
      
    this.isBooting = false
    this.hideBootStatus()

    let sectorEntry = this.getSectorEntry()
    if (sectorEntry) {
      this.main.recordColonyVisit()
      let ip = sectorEntry.getIp()
      this.gameExplorer.requestGame(ip, { sectorId: this.getSectorId() })
    }
  }

  isOffline() {
    return this.getMemberCount() === 0
  }

  getId() {
    return this.data.id
  }

  getSectorId() {
    return this.data.sectorId || this.data.uid
  }

  getName() {
    return this.data.name
  }

  isFull() {
    return this.getMemberCount() >= 20
  }

  getMemberCount() {
    if (this.data.hasOwnProperty("playerCount")) {
      return this.data.playerCount
    }
    
    if (this.isTopColony) {
      let teamEntry = this.gameExplorer.findTeamEntry(this.getSectorId())
      if (teamEntry) {
        return teamEntry.getMemberCount()
      } else {
        return 0
      }
    } else {
      return this.data.members.length
    }
  }

  getIp() {
    if (this.data.ip) return this.data.ip

    let sectorEntry = this.getSectorEntry()
    if (sectorEntry) return sectorEntry.getIp()
  }

  setIp(ip) {
    this.el.dataset.ip = ip
  }

  setName(name, gameMode) {
    name = name || ""
    let maxLength = 40
    let displayName = ""
    if (gameMode && gameMode !== 'pvp') {
      displayName += this.getGameModeEmoji(gameMode)
    }
    displayName += name.slice(0, maxLength)
    this.el.querySelector(".info_name").innerText = displayName
    this.name = name
  }

  getGameModeEmoji(gameMode) {
    // if (gameMode === 'peaceful') return "🏠"
    // if (gameMode === 'survival') return "🌎"
    // if (gameMode === 'hardcore') return "👾"
    return ""
  }

  setDayCount(dayCount) {
    this.el.dataset.days = dayCount
    this.el.querySelector(".team_days_alive").innerText = "Day " + dayCount
    this.dayCount = dayCount
  }

  getDayCount() {
    return this.dayCount
  }

  setColonyName(name, gameMode) {
    name = name || ""
    let maxLength = 40
    let displayName = ""
    if (gameMode && gameMode !== 'pvp') {
      displayName += this.getGameModeEmoji(gameMode)
    }
    displayName += name.slice(0, maxLength)
    this.el.querySelector(".info_name").innerText = displayName
    this.name = name
  }

  setDaysAlive(daysAlive) {
    this.el.dataset.days = daysAlive
    this.el.querySelector(".team_days_alive").innerText = "Day " + daysAlive
  }

  setMemberCount(count) {
    this.el.querySelector(".team_member_count").innerHTML = "<span class='player_count_value'>" + count + "</span><img class='person_icon' src='/assets/images/person_icon.png' />"

    this.onMemberCountChanged()
  }

  onMemberCountChanged() {
    if (this.isTopColony) {
      if (this.getMemberCount() > 0) {
        this.el.classList.add("ranked_online")
      } else {
        this.el.classList.remove("ranked_online")
      }
    }
  }

  setPrivacy(isPrivate) {
    this.isPrivate = isPrivate

    this.el.dataset.private = isPrivate
  }

  onTeamInviteFound() {

  }

  getRegion() {
    return this.data.region
  }

  getSectorEntry() {
    return this.gameExplorer.sectorEntries[this.getSectorId()]
  }

  setSectorNameById(sectorId) {
    let sectorEntry = this.getSectorEntry()
    if (sectorEntry) {
      // this.el.querySelector(".team_sector_name").innerText = sectorEntry.getName()
    }
  }

  update(team) {
    this.data = team

    this.setKey()

    if (this.isTopColony) {
      this.setColonyName(team.name, team.gameMode)
      this.setDaysAlive(team.daysAlive)
      this.setMemberCount(this.getMemberCount())
      this.setPrivacy(team.isPrivate)
    } else {
      this.setName(team.name, team.gameMode)
      this.setDayCount(team.daysAlive)
      this.setMemberCount(this.getMemberCount())
      this.setSectorNameById(team.sectorId)
      this.setPrivacy(team.isPrivate)
      this.setIp(team.ip)
      this.setTags()
    }

  }

  setOwner(team) {
    if (team.creatorUid) {
      this.ownerName = team.owners[team.creatorUid]
      this.el.querySelector(".team_owner_name").innerText = this.ownerName
    }
  }
  
  setTags() {
    let name = this.getName()

    if (this.isOlderVersion()) {
      name = "[" + this.getVersion() + "] " + name
    }

    if (this.isAnonymousGame()) {
      name = "[temp] " + name
    }

    this.setName(name, this.data.gameMode)
  }

  isAnonymousGame() {
    let uuidv4Regex = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i)
    return uuidv4Regex.test(this.data.creatorUid)
  }

  isOlderVersion() {
    let clientVersionValue = this.getVersionValue(main.getVersion())
    let serverVersionValue = this.getVersionValue(this.getVersion())
    return serverVersionValue < clientVersionValue
  }

  getVersionValue(versionString) {
    versionString = versionString.replace(/^v/,'') // remove leading v character
    let tokens = versionString.split(".")
    let numTokens = tokens.map((el, index) => { 
      return parseInt(el) * (tokens.length - index) 
    })

    return numTokens.reduce((sum, el) => { return sum + el }, 0)
  }

  getVersion() {
    let sectorEntry = this.getSectorEntry()
    if (sectorEntry) {
      return sectorEntry.getVersion()
    } else {
      return main.getVersion() // last resort fallback
    }
  }


  setKey() {
    this.el.dataset.key = this.getTeamKey()
  }

  getTeamKey() {
    return this.getSectorId()
  }

  remove() {
    if (this.el.parentElement) {
      this.el.parentElement.removeChild(this.el)
    }

    if (this.gameExplorer.selectedEntry === this) {
      this.gameExplorer.selectedEntry = null
    }

    let teamKey = this.getTeamKey()
    let teamEntries = this.gameExplorer.teamEntries
    if (teamEntries) {
      delete teamEntries[teamKey]
    }
    
  }

}

module.exports = TeamEntry