const SocketUtil = require("junon-common/socket_util")
const Constants = require("../../common/constants")

class VoteManager {
  constructor(sector) {
    this.sector = sector
    this.game = sector.game

    this.emergencyMeetings = {}
    this.lastEmergencyMeeting = null

    this.votes = {}
  }

  canUseEmergencyMeeting(user) {
    if (this.emergencyMeetings[user.id]) return false
    if (!this.sector.eventHandler.roundStartTimestamp) return false

    let cooldown = this.getRemainingCooldown()

    return cooldown === 0
  }

  triggerEmergencyMeeting(user) {
    this.emergencyMeetings[user.id] = user
    this.lastEmergencyMeeting = this.game.timestamp

    this.game.addTimer({
      name: "EmergencyMeetingTimer",
      duration: 3
    })
  }

  getRemainingCooldown() {
    let duration

    if (!this.lastEmergencyMeeting) {
      let initialCooldown = 60
      duration = Math.floor((this.game.timestamp - this.sector.eventHandler.roundStartTimestamp) / Constants.physicsTimeStep)
      return Math.max(0, initialCooldown - duration)
    }

    let seconds = 60
    duration = Math.floor((this.game.timestamp - this.lastEmergencyMeeting) / Constants.physicsTimeStep)

    return Math.max(0, seconds - duration)
  }

  hasUsedEmergencyMeeting(user) {
    return this.emergencyMeetings[user.id]
  }

  start() {
    if (this.isStarted) return
    this.isStarted = true
    this.game.pause()

    this.startCountdown()

    this.game.forEachPlayer((player) => {
      SocketUtil.emit(player.getSocket(), "StartVote", { votingEndTimestamp: this.votingEndTimestamp })
    })
  }

  startCountdown() {
    let seconds = 90
    this.votingEndTimestamp = this.sector.game.timestamp + (Constants.physicsTimeStep * seconds)

    this.stopVotes = false
  }

  addVote(vote) {
    if (this.stopVotes) return
    if (this.votes[vote.sourcePlayerId]) return

    let voter = this.game.getPlayerById(vote.sourcePlayerId)
    if (!voter) return
    if (voter.isDestroyed()) return

    this.votes[vote.sourcePlayerId] = vote.targetPlayerId
    this.onVotePlaced(vote.sourcePlayerId, vote.targetPlayerId)
  }

  executeTurn() {
    const isOneSecondInterval = this.sector.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    if (this.isVoteFinished()) {
      this.onVotingFinished()
    }
  }

  onVotePlaced(sourcePlayerId, targetPlayerId) {
    let result = {}
    result[sourcePlayerId] = 0 // indicating voted, but dont reveal player

    this.sector.forEachPlayer((player) => {
      SocketUtil.emit(player.getSocket(), "VoteUpdated", { voteResults: result })
    })

    if (this.isVoteFinished()) {
      this.onVotingFinished()
    }
  }

  isVoteFinished() {
    if (this.game.timestamp >= this.votingEndTimestamp) return true

    let voteCount = Object.keys(this.votes).length
    let playerCount = Object.keys(this.game.getAlivePlayers()).length 

    if (voteCount >= playerCount) {
      return true
    }

    return false
  }

  getVoteCountResult() {
    let highestCount = 0
    let countMap = {}
    let mostVotedPlayer = null

    for (let sourcePlayerId in this.votes) {
      let targetPlayerId = this.votes[sourcePlayerId]
      if (countMap[targetPlayerId]) {
        countMap[targetPlayerId] += 1
      } else {
        countMap[targetPlayerId] = 1
      }

      if (countMap[targetPlayerId] > highestCount) {
        highestCount = countMap[targetPlayerId]
        mostVotedPlayer = this.game.players[targetPlayerId]
      }
    }

    if (!mostVotedPlayer) {
      // most people skipped vote
      return { mostVotedPlayer: null, countMap: countMap }
    }

    let voteCount = countMap[mostVotedPlayer.getId()]
    let isTiePresent = Object.keys(countMap).find((playerId) => { 
      playerId = parseInt(playerId)
      let count = countMap[playerId]
      return playerId !== mostVotedPlayer.getId() && count === voteCount 
    })
    
    if (isTiePresent) {
      return { mostVotedPlayer: null, countMap: countMap }
    } else {
      return { mostVotedPlayer: mostVotedPlayer, countMap: countMap }
    }
  }

  resetVotes() {
    this.votes = {}
  }

  onVotingFinished() {
    if (this.stopVotes) return
    this.stopVotes = true
    this.isStarted = false 

    this.game.unpause()
    this.game.resumeCooldown()

    let voteResult = this.getVoteCountResult()

    this.sendFinalVoteResults(voteResult.countMap)
    this.resetVotes()

    setTimeout(() => {
      let isVotingSkipped = !voteResult.mostVotedPlayer
      if (isVotingSkipped) {
        this.game.triggerEvent("VoteEndedSkip")
      } else {
        this.game.triggerEvent("VoteEnded", { mostVoted: voteResult.mostVotedPlayer.id })
      }

      this.game.forEachPlayer((player) => {
        SocketUtil.emit(player.getSocket(), "EndVote", {})
      })
      
      this.lastEmergencyMeeting = this.game.timestamp
    }, 3000)
  }

  sendFinalVoteResults(countMap) {
    this.sector.forEachPlayer((player) => {
      SocketUtil.emit(player.getSocket(), "VoteUpdated", { voteResults: countMap, isFinal: true })
    })
  }

  determineImposter() {
  }


}

module.exports = VoteManager