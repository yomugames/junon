const CDP = require('chrome-remote-interface');
const fs = require('fs')

let filename = "mem.heapsnapshot"
let host = "localhost"

if (!process.argv[2]) {
  console.log("./memdump [port]")
  process.exit(1)
}

let port = parseInt(process.argv[2])

class MemDump {
  static async run() {
    const file = fs.createWriteStream(filename)

    try {
      const client = await new CDP({ host: host, port: port })
      client.on('event', (message) => {
        switch (message.method) {
          case "HeapProfiler.addHeapSnapshotChunk":
            file.write(message.params.chunk)
            break
          case "HeapProfiler.reportHeapSnapshotProgress":
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
            process.stdout.write("reportHeapSnapshotProgress: " + Math.floor(100 * message.params.done / message.params.total))
            break
        }
      })


      const reportProgress = true
      await client.HeapProfiler.takeHeapSnapshot({ reportProgress: true })
      console.log("\nsnapshot complete..")
      file.end()
      process.exit(0)

    } catch(e) {
      console.log(`unable to connect to node program at ${host}:${port}`)
      console.error(e)
    }
  }
}


MemDump.run()
