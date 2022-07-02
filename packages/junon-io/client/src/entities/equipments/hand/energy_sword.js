const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class EnergySword extends MeleeEquipment {

  playSound() {
    let sound = Math.random() < 0.5 ? "saber_one" : "saber_two"

    this.game.playSound(sound)
  }

}

module.exports = EnergySword
