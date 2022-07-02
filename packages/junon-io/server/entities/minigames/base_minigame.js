class BaseMiniGame {
  canAcceptPlayersMidGame() {
    return false
  }

  getAFKLimit() {
    return 2
  }

  getMaxPlayers() {
    return this.MAX_PLAYER_COUNT
  }

  getRequiredPlayerCount() {
    return this.REQUIRED_PLAYER_COUNT
  }

  shouldSendFullMap() {
    return true
  }

  canCraftItem(type) {
    return true
  }

  shouldImportCommandBlock() {
    return false
  }

  canRespawn(player) {
    return false
  }

  canCraft() {
    return false
  }

  onIsPrivateChanged(isPrivate) {
  }

}

module.exports = BaseMiniGame