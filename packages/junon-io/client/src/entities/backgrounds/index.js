const Protocol = require("./../../../../common/util/protocol")

const Backgrounds = {}

Backgrounds.Planet = require("./planet")
Backgrounds.Star = require("./star")
Backgrounds.Ring = require("./ring")

Backgrounds.forType = (type) => {
  let targetKlass = ""
  const nameToTypeMap = Protocol.definition().BackgroundType

  for (let name in nameToTypeMap) {
    if (nameToTypeMap[name] === type) {
      targetKlass = name
    }
  }

  return Backgrounds[targetKlass]
}


module.exports = Backgrounds