const BaseCommand = require("./base_command")

class GetNthWord extends BaseCommand {
    getUsage() {
        return [
            "Gets nth word of sentence and sets it to $word variable",
            "/getnthword [index] [message]",
            "Ex: /getnthword 2 a random message - creates a $word variable, and assigns the word 'random' to it."
        ]
    }
    allowOwnerOnly() {
        return true;
    }
    perform(caller,args) {
        let index = args[0];
        if(isNaN(index)) {
            caller.showChatError(`index must be a number`)
            // In commandblocks, you can't tell if $word is the last word of the message, so making it undefined should fix this
            this.game.executeCommand(this.sector,`/variable set word undefined`)
            return
        }
        let text = args.slice(1).join(" ")
        
        let stringArray = text.split(" ")

        if(index > stringArray.length+1) {
            caller.showChatError(`Invalid index`);
            return;
        }

        this.game.executeCommand(this.sector,`/variable set word ${stringArray[index-1]}`)
        caller.showChatSuccess('Success')
    }
    
}

module.exports = GetNthWord
