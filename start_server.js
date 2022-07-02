const JunonServer = require("junon-io/server/server")

global.junonServer = new JunonServer()
global.junonServer.run()

const JunonMatchmaker = require("junon-matchmaker/src/index")

global.junonMatchmaker = new JunonMatchmaker()
global.junonMatchmaker.run()