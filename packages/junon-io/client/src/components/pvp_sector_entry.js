const SectorEntry = require("./sector_entry")

class PvPSectorEntry extends SectorEntry {
  constructor(pvpExplorer, sector) {
    super(pvpExplorer.main.gameExplorer, sector)
    this.pvpExplorer = pvpExplorer
  }

  update(sector) {
    this.data = sector

    this.setIp(sector.ip)
    let regionData = main.regions.find((region) => { 
      return region.id === sector.region 
    })
    let regionName = regionData ? regionData.name : sector.region
    this.setName(sector.name)
    this.setOccupancy(sector.daysAlive)
    this.setPlayerCount(sector.playerCount)

    this.setVisibility(sector)
  }

  remove() {
    if (this.el.parentElement) {
      this.el.parentElement.removeChild(this.el)
    }

    delete this.pvpExplorer.sectorEntries[this.getId()]
  }
}

module.exports = PvPSectorEntry