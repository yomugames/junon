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
        if (args.length < 2) { 
            caller.showChatError(`Usage: /getnthword [index] [message]`);
            this.game.executeCommand(this.sector, `/variable set word undefined`);
            return;
        }

        let index = parseInt(args[0], 10);
        if (isNaN(index) || index < 1) {
            caller.showChatError(`Index must be a positive number.`);
            this.game.executeCommand(this.sector, `/variable set word undefined`);
            return;
        }

        let text = args.slice(1).join(" ")
        let stringArray = text.split(" ")

        if(index > stringArray.length+1) {
            caller.showChatError(`Invalid index`);
            this.game.executeCommand(this.sector, `/variable set word undefined`); 
            return;
        }

        this.game.executeCommand(this.sector,`/variable set word ${stringArray[index - 1]}`)
        caller.showChatSuccess('Success')
    }
    
}

module.exports = GetNthWord
