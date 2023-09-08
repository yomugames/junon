const BaseCommand = require("./base_command");

class GetNthLetter extends BaseCommand {
    getUsage() {
        return [
            "Gets nth letter of a word and sets it to $letter variable",
            "/getnthletter [index] [word]",
            "Ex: /getnthletter 3 example - creates a $letter variable and assigns the letter 'a' to it."
        ];
    }

    allowOwnerOnly() {
        return true;
    }

    perform(caller, args) {
        let index = args[0];
        if (isNaN(index)) {
            caller.showChatError("Index must be a number");
            return;
        }

        let word = args[1];
        if (!word || typeof word !== "string") {
            caller.showChatError("Invalid word");
            return;
        }

        if (index < 1 || index > word.length) {
            caller.showChatError("Invalid index");
            return;
        }

        let letter = word[index - 1];
        this.game.executeCommand(this.sector, `/variable set letter ${letter}`);
        caller.showChatSuccess("Success");
    }
}

module.exports = GetNthLetter;
