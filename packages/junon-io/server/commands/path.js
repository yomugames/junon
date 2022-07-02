const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')
const Region = require("../entities/region")
const SocketUtil = require("junon-common/socket_util")

class Path extends BaseCommand {

  getUsage() {
    return [
      "/path list",
      "/path set [name] [row,col] [row,col] [row,col] ...",
      "/path delete [name]",
      "/path rename [name] [newname]"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(player, args) {
    let pathName
    let path
    let success

    let subcommand = args[0]

    switch(subcommand) {
      case "list":
        let pathNames = Object.keys(this.sector.paths)
        if (pathNames.length === 0) {
          player.showChatSuccess("No paths")
        } else {
          player.showChatSuccess(pathNames.join(", "))
        }
        break
      case "set":
        pathName = args[1]
        if (!pathName) {
          player.showChatError("missing region name")
          return
        }

        let coords = args.slice(2)
        path = []
        this.pairwise(coords, (row, col) => {
          row = parseInt(row)
          col = parseInt(col)
          if (this.isCoordValid(row, col)) {
            path.push([row, col].join("-"))
          }
        })

        this.sector.setPath(pathName, path)

        player.showChatSuccess("path " + pathName + " set to " + path.join(" "))
        break
      case "delete":
        pathName = args[1]
        if (!pathName) {
          player.showChatError("missing path name")
          return
        }
        path = this.sector.getPath(pathName)
        if (!path) {
          player.showChatError("path " + pathName + " not found")
          return
        }

        this.sector.removePath(pathName)
        player.showChatSuccess("path deleted")
        break
      case "rename":
        pathName = args[1]
        if (!pathName) {
          player.showChatError("missing path name")
          return
        }

        path = this.sector.getPath(pathName)
        if (!path) {
          player.showChatError("path " + pathName + " not found")
          return
        }

        let newPathName = args[2]
        if (!newPathName) {
          player.showChatError("/path rename [name] [newname]")
          return
        }

        if (this.sector.getPath(newPathName)) {
          player.showChatError("path named " + newPathName + " already exists")
          return
        }

        this.sector.renamePath(pathName, newPathName)
        player.showChatSuccess(`renamed path ${pathName} to ${newPathName} `)
        break
      default: 
        player.showChatError("No such subcommand /region " + subcommand)
        break
    }
  }

  pairwise(arr, cb) {
    for(var i = 0; i < arr.length - 1; i += 2){
        cb(arr[i], arr[i + 1])
    }
  }

  isCoordValid(row, col) {
    if (isNaN(row) || isNaN(col)) return false
    let isWithinBounds = row >= 0 && row < this.sector.getRowCount() &&
                         col >= 0 && col < this.sector.getColCount()
    if (!isWithinBounds) return false
    return this.sector.pathFinder.getTile(row, col)
  }


}

module.exports = Path

