const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")
const Helper = require("./../../../common/helper")

class VoteMenu extends BaseMenu {
  onMenuConstructed() {
    this.votes = {}
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".vote_player_list").addEventListener("click", this.onVotePlayerListClick.bind(this), true)
    this.el.querySelector(".vote_action_container").addEventListener("click", this.onVoteActionContainerClick.bind(this), true)
  }

  onVotePlayerListClick(e) {
    let playerCell = e.target.closest(".vote_player_cell")
    if (playerCell && !playerCell.classList.contains("dead")) {
      this.selectPlayer(playerCell)
    }
  }

  onVoteActionContainerClick(e) {
    let voteBtn = e.target.closest(".vote_btn")
    if (voteBtn) {
      SocketUtil.emit("SendVote", { targetPlayerId: this.selectedPlayerId })      
    }

    let skipVoteBtn = e.target.closest(".skip_vote_btn")
    if (skipVoteBtn) {
      this.selectedPlayerId = null
      SocketUtil.emit("SendVote", { targetPlayerId: 0 })      
    }
  }

  setVotingEndTimestamp(votingEndTimestamp) {
    this.votingEndTimestamp = votingEndTimestamp

    this.timerInterval = setInterval(() => {
      let secondsRemaining = Math.floor((this.votingEndTimestamp - this.game.timestamp) / Constants.physicsTimeStep)

      let formattedTime = Helper.stringifyTimeShort(secondsRemaining)
      this.el.querySelector(".vote_timer").innerText = formattedTime

      if (secondsRemaining <= 0) {
        clearInterval(this.timerInterval)
      }
    }, 1000)
  }

  selectPlayer(playerCell) {
    if (this.hasVoted()) return

    let selected = this.el.querySelector(".vote_player_cell.selected")
    if (selected) {
      selected.classList.remove("selected")
    }

    playerCell.classList.add('selected')
    let playerId = playerCell.dataset.playerId
    this.selectedPlayerId = playerId
  }

  open(options = {}) {
    super.open(options)

    this.isFinal = false
    this.votes = {}

    this.game.chatMenu.open({ dontCloseMenus: true })
    this.game.chatMenu.setVoteMode(true)

    this.renderPlayers(this.game.sector.originalPlayers)
    this.renderActionButtons()

    this.game.denyMenuOpen()
  }

  rerenderPlayers() {
    if (!this.game.sector) return
    this.renderPlayers(this.game.sector.originalPlayers)
  }

  isControllingPlayerRequired() {
    return false
  }

  close() {
    this.game.chatMenu.setVoteMode(false)
    if (this.game.sector && !this.game.sector.shouldShowChat()) {
      this.game.chatMenu.hide()
    }
    super.close()
    this.game.allowMenuOpen()
  }

  getMostVotedPlayerId() {
    let highestVoteCount = 0
    let result = null

    for (let targetPlayerId in this.votes) {
      let voteCount = this.votes[targetPlayerId]
      if (voteCount > highestVoteCount) {
        result = parseInt(targetPlayerId)
        highestVoteCount = voteCount
      }
    }

    return result
  }

  updateVote(data) {
    if (data.isFinal) {
      this.isFinal = true
      this.votes = {}
      for (let targetPlayerId in data.voteResults) {
        let count = data.voteResults[targetPlayerId]
        this.votes[targetPlayerId] = count
      }
    } else {
      for (let sourcePlayerId in data.voteResults) {
        this.votes[sourcePlayerId] = true
      }
    }

    this.renderPlayers(this.game.sector.originalPlayers)
    this.renderActionButtons()
  }

  renderActionButtons() {
    if (!this.game.player) return

    if (this.votes[this.game.player.getId()]) {
      this.el.querySelector(".vote_action_container").style.display = 'none'
    } else {
      this.el.querySelector(".vote_action_container").style.display = 'block'
    }
  }

  renderPlayers(players) {
    let el = ""
    for (let id in players) {
      let player = players[id]
      el += this.createVotePlayerEl(player)
    }
    
    this.el.querySelector(".vote_player_list").innerHTML = el
  }

  hasVoted() {
    return this.votes[this.game.player.id]
  }

  createVotePlayerEl(player) {
    let voteResult = this.votes[player.id] || 0
    let votedEl = (voteResult && !this.isFinal) ? i18n.t("Voted") : ""

    let suitColor = "gray"
    if (this.game.sector.originalColors[player.id]) {
      suitColor = this.game.sector.originalColors[player.id]
    }
    
    let avatarPath = suitColor + "_suit.png"
    let isSelected = !this.isFinal && player.id === parseInt(this.selectedPlayerId)
    let voteCount = this.isFinal ? voteResult + " " + i18n.t("votes") : ""
    let mostVotedPlayerId = this.getMostVotedPlayerId()
    let deadClass = (player.health === 0 || player.hasLeftGame) ? "dead" : ""

    let selectedClass 
    if (isSelected) {
      selectedClass = "selected" 
    } else if (this.isFinal && mostVotedPlayerId === player.id) {
      selectedClass = "voted"
    } else {
      selectedClass = ""
    }

    return "<div class='vote_player_cell " + selectedClass + " " + deadClass + "' data-player-id='" + player.id +"'>" + 
      "<img class='vote_player_avatar' src='/assets/images/background/" + avatarPath + "'>" + 
      "<div class='vote_player_name'>" + player.name + "</div>" + 
      "<div class='player_voted'>" + votedEl + "</div>" + 
      "<div class='player_voted_by'>" + voteCount + "</div>" + 
      "<div class='dead_icon'>❌</div>" + 
    "</div>"
  }
  
}



module.exports = VoteMenu 