const CDP = require('chrome-remote-interface');
const fs = require('fs')

let filename = "junon.cpuprofile"
let host = "localhost"

if (!process.argv[2]) {
  console.log("./profile [port]")
  process.exit(1)
}

let port = parseInt(process.argv[2])

class Profile {
  static acceptInput(client) {
    const stdin = process.openStdin()

    stdin.addListener("data", async () => {
      console.log("Saving profile")
      const data = await client.Profiler.stop()
      fs.writeFileSync(filename, JSON.stringify(data.profile))
      process.exit(0)
    })

    console.log("press [enter] to stop profiling")

  }

  static async run() {
    try {
      const client = await new CDP({ host: host, port: port })

      await client.Profiler.enable()
      await client.Profiler.start()

      this.acceptInput(client)
    } catch(e) {
      console.log(`unable to connect to node program at ${host}:${port}`)
      console.error(e)
    }
  }
}


Profile.run()
