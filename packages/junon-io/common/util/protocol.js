const Protocol = {
  initClient(cb) {
    let protoFile = debugMode ? "app_debug-" + window.protocolHash + ".proto" : "app-" + window.protocolHash + ".proto"
    this.init(protoFile, cb)
  },
  initServer(cb) {
    let nodeModulesPath = require('child_process').execSync("npm root").toString().replace("\n","")
    const directory = nodeModulesPath + "/junon-common/protocol"
    let protoFile = debugMode ? `${directory}/app_debug.proto` : `${directory}/app.proto`
    this.init(protoFile, cb)
  },
  init(filePath, cb){
    let protobuf 
    let isClient = typeof window !== 'undefined'
    if (typeof window !== 'undefined' && window.Protobuf) {
      protobuf = window.Protobuf
    } else {
      protobuf = require("protobufjs")
    }

    let root = new protobuf.Root()

    
          
            
    

          
          Expand Down
    
    
  
    root.resolvePath = function(origin, target) {
      let protoMatch = origin.match(/(.*)\/.*\.proto/)
      let directory = protoMatch ? protoMatch[1] : ""
      let path 
      if (isClient) {
        path = directory.length > 0 ? directory + "/" + target : "/" + target
      } else {
        path = directory.length > 0 ? directory + "/" + target : target
      }
      
      return path
    }
    root.load(filePath, (err, root) => {
      if (err) {
        cb(err)
        return
      }
      if (!root.nested) {
        cb("error_fetching_proto_file")
        return
      }
      this.protocol = root.nested.app
      cb(null, this.protocol)
    })
  },
  definition() {
    return this.protocol
  }
}
module.exports = Protocol
