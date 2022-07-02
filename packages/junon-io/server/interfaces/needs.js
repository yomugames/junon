const Constants = require('../../common/constants.json')
const Protocol = require('../../common/util/protocol')

const NeedsServer = () => {
}

NeedsServer.prototype = {
  consumeHunger() {
    if (this.sector.settings['isHungerEnabled'] === false) return

    const isFiveSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * this.getHungerReduceInterval()) === 0
    if (!isFiveSecondInterval) return

    if (this.sector.isLobby()) return

    this.setHunger(this.hunger - 1)
  },
  getHungerReduceInterval() {
    return 7
  }
}

module.exports = NeedsServer