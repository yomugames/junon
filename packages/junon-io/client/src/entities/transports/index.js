const Helper = require("./../../../../common/helper")

const Transports = {}

Transports.RailTram = require("./rail_tram")

Transports.forType = (type) => {
  const klassName = Helper.getTransportNameById(type) 
  return Transports[klassName]
}


module.exports = Transports
