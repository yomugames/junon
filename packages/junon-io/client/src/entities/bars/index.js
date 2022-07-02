const Helper = require("./../../../../common/helper")

const Bars = {}
Bars.CopperBar = require("./copper_bar")
Bars.IronBar = require("./iron_bar")
Bars.Glass = require("./glass")
Bars.CircuitBoard = require("./circuit_board")
Bars.Cloth = require("../ores/cloth")

Bars.forType = (type) => {
  const klassName = Helper.getTypeNameById(type)
  return Bars[klassName]
}

module.exports = Bars

