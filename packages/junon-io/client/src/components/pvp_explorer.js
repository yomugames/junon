const Config = require("junon-common/config")
const TeamEntry = require("./team_entry")
const PvPSectorEntry = require("./pvp_sector_entry")
const ClientHelper = require("./../util/client_helper")
const ExceptionReporter = require("./../util/exception_reporter")
const Cookies = require("js-cookie")

class PvPExplorer {
  constructor(main) {
    this.main = main
    this.el = document.querySelector(".pvp_games_container")
    this.sectorEntries = {}

    this.el.querySelector(".pvp_colony_list").addEventListener("click", this.onColonyListClick.bind(this), true)
  }

  show() {
    this.el.style.display = 'block'
    let highlightedEntry = this.el.querySelector(".sector_entry_row.highlighted")
    if (highlightedEntry) {
      highlightedEntry.classList.remove("highlighted")
    }

    let pvpSectorUid = Cookies.get("pvpSectorUid")
    if (pvpSectorUid) {
      let sectorRow = this.el.querySelector(`.sector_entry_row[data-id='${pvpSectorUid}']`)
      if (sectorRow) {
        sectorRow.classList.add("highlighted")
      }
    }
  }

  hide() {
    this.el.style.display = 'none'
  }

  onColonyListClick(e) {
    let sectorEntryRow = e.target.closest(".sector_entry_row")
    if (!sectorEntryRow) return

    let sectorEntry = this.sectorEntries[sectorEntryRow.dataset.id]
    if (sectorEntry) {
      this.lastSectorEntry = sectorEntry
      sectorEntry.join()
    }

  }

  renderSectorList(data) {
    let sectors = data.sectors

    // since sectors come from different regions, we cant compare presence
    // unless we track this.sectorEntries by region as well. skip delete for now

    // for (let id in this.sectorEntries) {
    //   let isSectorNoLongerPresent = !sectors[id]
    //   if (isSectorNoLongerPresent) {
    //     this.removeSector({ id: id })
    //   }
    // }

    for (let sectorId in sectors) {
      let sector = sectors[sectorId]
        this.renderSector(sector)
    }
  }

  renderSector(sector) {
    if (!sector.gameMode) return
    if (sector.gameMode !== 'pvp') return

    let sectorEntry = this.sectorEntries[sector.id]

    if (!sectorEntry) {
      this.createSectorEntry(sector)  
    } else {
      sectorEntry.update(sector)
    }
  }

  createSectorEntry(sector) {
    let sectorEntry = new PvPSectorEntry(this, sector)
    this.sectorEntries[sector.id] = sectorEntry

    this.el.querySelector(".pvp_colony_list tbody").appendChild(sectorEntry.el)
  }

  removeSector(data) {
    let sectorEntry = this.sectorEntries[data.id]
    if (sectorEntry) {
      sectorEntry.remove()
    }
  }
}

module.exports = PvPExplorer
