const net = require("net")
const socketPath = process.argv[2]

const client = net.createConnection(socketPath)

client.on("connect", function() {
})

client.on("data", function(data) {
  process.stdout.write(data.toString())
  process.exit(0)
})

client.on("error", function(data) {
  process.exit(1)
})
