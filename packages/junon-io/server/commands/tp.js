const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")

class Tp extends BaseCommand {

  getUsage() {
    return [
      "/tp [name]",
      "/tp [row] [col]",
      "/tp [name] [row] [col]",
      "/tp [name] [name]",
      "/tp [name] !randomland"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    let row 
    let col 
    let sourceEntities = []
    let opts

    if (args.length === 1) {
      // case 1: teleport to a player --- /tp someplayer
      const entityName = args[0]
      let entity = this.game.getEntityByNameOrId(entityName)
      if (!entity) {
        caller.showChatError("/tp [name]")
        return
      } 

      if (!entity.isPlayer() && !entity.isMob()) {
        return
      }

      sourceEntities = [caller]
      row = entity.getRow()
      col = entity.getCol()
    } else if (args.length === 2) {
      // case 2: teleport to coord --- /tp 20 30
      if (!isNaN(args[0]) && !isNaN(args[1])) {
        sourceEntities = [caller]
        row = args[0]
        col = args[1]
      } else {
        // case 3: teleport a player to other player --- /tp simpleyuji kuroro
        sourceEntities = this.getEntitiesBySelector(args[0])
        let otherEntity = this.game.getEntityByNameOrId(args[1])

        if (!otherEntity) {
          if (args[1] === "!randomland") {
            this.sector.findNewTeamSpawn(sourceEntities)
            return
          } else {
            caller.showChatError("/tp [name] [name]")
            return
          }
        }

        row = otherEntity.getRow()
        col = otherEntity.getCol()
      }
    } else if (args.length >= 3) {
      // case 4: teleport a player to coord --- /tp javo 30 50
      let entity
      let selector = args[0]

      sourceEntities = this.getEntitiesBySelector(selector)
      row = args[1]
      col = args[2]
      opts = args[3]
    }

    if (sourceEntities.length === 0) return
    if (isNaN(row) || isNaN(col)) {
      caller.showChatError("invalid row or col")
      return
    }

    sourceEntities.forEach((sourceEntity) => {
      if (this.isValidTeleportEntity(sourceEntity)) {
        let data = { player: caller, entityToTeleport: sourceEntity, x: col * Constants.tileSize, y: row * Constants.tileSize, opts: opts }
        this.sector.warp(data)
      }
    })

  }

  isValidTeleportEntity(entity) {
    return entity.isPlayer() || entity.isMob() || entity.isCorpse()
  }

}

module.exports = Tp