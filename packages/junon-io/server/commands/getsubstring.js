const BaseCommand = require("./base_command")

class GetSubstring extends BaseCommand {
    getUsage() {
        return [
            "Returns a variable named $substring",
            "/getsubstring [substring] [message]",
            "Ex: /getsubstring 2 a random message, creates a $substring variable, and assigns random to it."
        ]
    }
    allowOwnerOnly() {
        return true;
    }
    perform(caller,args) {
        let substringSelector = args[0];
        if(isNaN(substringSelector)) {
            caller.showChatError(`Substring selector cannot be NaN`)
            return
        }
        let text = args.slice(1).join(" ")
        
        let substrings = text.split(" ")

        if(substringSelector > substrings.length+1) {
            caller.showChatError(`Invalid substring selector.`);
            return;
        }

        this.game.executeCommand(this.sector,`/variable set substring ${substrings[substringSelector-1]}`)
        caller.showChatSuccess('Success')
    }
    
}

module.exports = GetSubstring