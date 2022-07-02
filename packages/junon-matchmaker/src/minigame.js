class MiniGame {

  constructor(matchmaker, data) {
    this.matchmaker = matchmaker

    this.id = data.id
    this.name = data.name
    this.screenshot = data.screenshot
    this.creator = data.creator

    this.sectors = {}

    this.register()
  }

  register() {
    this.matchmaker.miniGames[this.id] = this
  }

  addSector(sector) {
    this.sectors[sector.id] = sector
  }

  removeSector(sector) {
    delete this.sectors[sector.id] 
  }

  onPlayerCountChanged(sector) {
    
  }

  getTotalPlayerCount() {
    let count = 0
    for (let id in this.sectors) {
      count += this.sectors[id].getPlayerCount()
    }
    return count
  }

  getPlayerCountByLanguage() {
    let result = {}

    for (let id in this.sectors) {
      let sector = this.sectors[id]
      result[sector.language] = result[sector.language] || 0
      result[sector.language] += sector.getPlayerCount()
    }

    return result
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      screenshot: this.screenshot,
      creator: this.creator,
      playerCount: this.getTotalPlayerCount(),
      playerCountByLanguage: this.getPlayerCountByLanguage()
    }
  }

}

module.exports = MiniGame