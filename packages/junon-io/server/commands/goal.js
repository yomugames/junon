const BaseCommand = require("./base_command")
const Constants = require("../../common/constants")
const Protocol = require('../../common/util/protocol')

class Goal extends BaseCommand {
  getUsage() {
    return [
      "/goal move [mobId] goal",
      "/goal attack [mobId] target",
      "/goal clear [mobId] [goalId/all]",
      "Used to manage mob goals"
    ]
  }

  allowOwnerOnly() {
    return true
  }

  perform(caller, args) {
    const subcommand = args[0]
    const selector = args[1]
    const secondArgument = args[2]

    let entities = this.getEntitiesBySelector(selector)
    
    switch(subcommand) {
      case "move":
        const goal = this.game.getEntityByNameOrId(args[2])
        
        if (!goal) {
          caller.showChatError("No such goal")
          break
        }
        
        entities.forEach((entity) => {
          entity.addGoalTarget(goal)
        })
        caller.showChatSuccess(`Added goal for ${entities.length} mob(s)`)
        break
        
      case "attack":
        const target = this.game.getEntityByNameOrId(args[2])
        
        if (!target) {
          caller.showChatError("No such target")
          break
        }
        
        entities.forEach((entity) => {
          entity.setAttackTarget(target)
        })
        caller.showChatSuccess(`Added attack target for ${entities.length} mob(s)`)
        break
        
      case "clear":
        
        if (!secondArgument) {
          caller.showChatError("Invalid argument")
          break
        }
          
        if (secondArgument === "all") {
          entities.forEach((entity) => {
            entity.removeAllGoals()
            entity.setAttackTarget(null)
          })
        } else {
          const goal = this.game.getEntityByNameOrId(args[2])
          
          entities.forEach((entity) => {
            entity.removeGoalTarget(goal)
            entity.setAttackTarget(null)
          })
        }
        
        caller.showChatSuccess(`Cleared goals for ${entities.length} mob(s)`)
    }
  }
}

module.exports = Goal