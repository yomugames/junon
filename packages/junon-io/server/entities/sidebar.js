class Sidebar {
  constructor(player, options = {}) {
    this.game = options.game
    this.player = player
    this.title = null
    this.rows = {}
    this.scoreBoardRow = null

    this.MAX_ROW_COUNT = 16
  }

  getSocketUtil() {
    if (this.player) {
      return this.player.game.server.socketUtil
    } else {
      return this.game.server.socketUtil
    }
  }

  isGlobal() {
    return this.game
  }

  enableScoreboard(row, options = {}) {
    this.scoreboardType = options.teams ? "teams" : "players"
    this.scoreBoardRow = row
    this.computeScoreboard()
    this.broadcastContents()
  }

  isTeamScoreboard() {
    return this.scoreboardType === "teams"
  }

  isPlayerScoreboard() {
    return this.scoreboardType === "players"
  }

  isScoreboardEnabled() {
    return this.scoreBoardRow !== null
  }

  computeScoreboard() {
    if (!this.isScoreboardEnabled()) return

    let row = this.scoreBoardRow

    this.clearSidebarStartingAt(row)

    if (this.scoreboardType === "teams") {
      let teams = this.getSortedTeamsByScore()
      teams.forEach((team) => {
        if (!team.isSectorOwner()) {
          let text = team.getName() + " " + team.score
          this.rows[row] = text
          row++
        }
      })
    } else {
      let players = this.getSortedPlayersByScore()
      players.forEach((player) => {
        let text = player.getName() + " " + player.score
        this.rows[row] = text
        row++
      })
    }
  }

  getSortedTeamsByScore() {
    let teams = Object.values(this.game.teams)
    return teams.sort((a, b) => {
      return b.score - a.score
    })
  }
  getSortedPlayersByScore() {
    let players = Object.values(this.game.players)
    return players.sort((a, b) => {
      return b.score - a.score
    })
  }

  hideScoreboard() {
    let maxRow = this.scoreBoardRow + this.MAX_ROW_COUNT

    for (var row = this.scoreBoardRow; row < maxRow; row++) {
      if (typeof this.rows[row] !== 'undefined') {
        this.rows[row] = ''
      }
    }

    this.onSidebarUpdated({ rows: this.rows })

    this.scoreBoardRow = null
  }

  setSidebarText(options = {}) {
    this.rows[options.row] = options.text

    let data = {}
    data[options.row] = options.text
    this.onSidebarUpdated({ rows: data })
  }

  onSidebarUpdated(options = {}) {
    if (this.isGlobal()) {
      this.game.forEachPlayer((player) => {
        this.getSocketUtil().emit(player.getSocket(), "SidebarUpdated", options)
      })
    } else {
      this.getSocketUtil().emit(this.player.getSocket(), "SidebarUpdated", options)
    }
  }

  emitContentsToPlayer(player) {
    this.getSocketUtil().emit(player.getSocket(), "SidebarUpdated", { rows: this.rows })
  }

  broadcastContents() {
    if (!this.isGlobal()) return

    this.game.forEachPlayer((player) => {
      this.emitContentsToPlayer(player)
    })
  }

  getMaxRow() {
    let rowNumbers = Object.keys(this.rows).map((row) => {
      return parseInt(row)
    })

    return Math.max(...rowNumbers)
  }

  clearSidebarStartingAt(startRow) {
    for (var row = startRow; row <= (startRow + this.MAX_ROW_COUNT); row++) {
      if (this.rows[row]) {
        this.rows[row] = ''
      }
    }
  }

  clear() {
    this.scoreBoardRow = null

    let maxRow = this.getMaxRow()

    this.rows = {}

    let data = {}
    for (var i = 0; i <= maxRow; i++) {
      data[i] = ''
    }

    this.onSidebarUpdated({ rows: data })
  }
}

module.exports = Sidebar
