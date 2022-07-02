const Cookies = require("js-cookie")

class SectorEntry {
  constructor(gameExplorer, sector) {
    this.gameExplorer = gameExplorer
    this.el = document.createElement("tr")
    this.el.className = "sector_entry_row"

    this.el.innerHTML += "<td class='info_name'></td>"
    this.el.innerHTML += "<td class='sector_occupancy'></td>"
    this.el.innerHTML += "<td class='sector_player_count'></td>"

    this.setId(sector.sectorId)
    this.update(sector)
  }

  join(options = {}) {
    let ip = this.getIp()

    options['sectorId'] = this.getId()

    if (!Cookies.get('tutorial_done')) {
      this.gameExplorer.main.game.confirmMenu.open({
        message: i18n.t('AskTutorialMessage'),
        proceedCallback: this.gameExplorer.main.onTutorialMenuBtnClick.bind(this.gameExplorer.main),
        cancelCallback: this.onSkipTutorial.bind(this, ip, options)
      })
      return
    } else {
      this.gameExplorer.requestGame(ip, options)
    }
  }

  onSkipTutorial(ip, options) {
    Cookies.set('tutorial_done', true)  
    this.gameExplorer.requestGame(ip, options)
  }

  getHost() {
    return this.data.host
  }

  getScreenshot() {
    if (!this.data.screenshots) return null
    return Object.keys(this.data.screenshots)[0]
  }

  select() {
    this.el.classList.add("selected")
  }

  getRegion() {
    return this.gameExplorer.getRegion()
  }

  getVersion() {
    return this.data.version
  }

  getName() {
    return this.data.name
  }

  getId() {
    return this.data.sectorId
  }

  getIp() {
    return this.data.ip
  }

  setIp(ip) {
    this.el.dataset.ip = ip
  }

  setId(id) {
    this.el.dataset.id = id
  }

  setName(name) {
    this.el.querySelector(".info_name").innerText = name
  }

  setPlayerCount(count) {
    this.el.querySelector(".sector_player_count").innerText = `${count} / 50` 
  }

  setOccupancy(occupancy) {
    this.el.querySelector(".sector_occupancy").innerText = `${occupancy}` 
  }

  getPlayerCount() {
    return this.data.playerCount
  }

  update(sector) {
    this.data = sector

    this.setIp(sector.ip)
    this.setName(sector.name)
    this.setOccupancy(sector.daysAlive)
    this.setPlayerCount(sector.playerCount)

    this.setVisibility(sector)
  }

  setVisibility(sector) {
//     if (sector.hidden) {
//       this.el.dataset.hidden = true
//     }
// 
//     if (this.isOlderVersion()) {
//       this.el.dataset.hidden = true
//     }
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

  remove() {
    if (this.el.parentElement) {
      this.el.parentElement.removeChild(this.el)
    }

    if (this.gameExplorer.selectedEntry === this) {
      this.gameExplorer.selectedEntry = null
    }

    delete this.gameExplorer.sectorEntries[this.getId()]
  }

}

module.exports = SectorEntry