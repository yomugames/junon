const ActionEntries = {}

ActionEntries.CommandActionEntry = require("./command_action_entry")
ActionEntries.IfThenElse = require("./ifthenelse")
ActionEntries.Timer = require("./timer")

ActionEntries.forType = (actionKey) => {
  if (actionKey === "commands") {
    return ActionEntries.CommandActionEntry
  } else if (actionKey === "ifthenelse") {
    return ActionEntries.IfThenElse
  } else if (actionKey === "timer") {
    return ActionEntries.Timer
  }
}


module.exports = ActionEntries



