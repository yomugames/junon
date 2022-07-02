const Effects = {}
const Helper = require("./../../../../common/helper")

Effects.Fire = require("./fire")
Effects.Blood = require("./blood")
Effects.Web = require("./web")
Effects.Poison = require("./poison")
Effects.Residue = require("./residue")
Effects.Dirt = require("./dirt")
Effects.Break = require("./break")
Effects.Miasma = require("./miasma")
Effects.Spin = require("./spin")
Effects.Smoke = require("./smoke")
Effects.Invisible = require("./invisible")
Effects.Haste = require("./haste")

Effects.forName = (effectName) => {
  return Effects[Helper.capitalize(effectName)]
}


module.exports = Effects