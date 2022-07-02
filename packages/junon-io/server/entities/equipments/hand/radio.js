const HandEquipment = require("./hand_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")
const SocketUtil = require("junon-common/socket_util")

class Radio extends HandEquipment {
  use(player, targetEntity) {
    super.use(player, targetEntity)

    if (!this.game.isMiniGame()) return
    if (player.sector.eventHandler.isRoundEnding) return

    if (this.sector.getFlameCount() > 0) {
      return
    }

    let corpses = player.sector.getCorpsesByBox(player.getBoxWithRadius(Constants.tileSize * 6))
    let isPlayerCorpse = corpses.length > 0 && corpses.find((corpse) => {
      return corpse.getType() === Protocol.definition().MobType.Human
    })

    if (isPlayerCorpse) {
      player.game.addTimer({
        name: "BodyReportedTimer",
        duration: 2
      })

      player.game.forEachPlayer((targetPlayer) => {
        SocketUtil.emit(targetPlayer.socket, "PlaySound", { id: Protocol.definition().SoundType.Alert })
      })
      
    } else {
      player.showError("No corpses nearby")
    }
  }

  getType() {
    return Protocol.definition().BuildingType.Radio
  }

  getConstantsTable() {
    return "Equipments.Radio"
  }
}

module.exports = Radio
