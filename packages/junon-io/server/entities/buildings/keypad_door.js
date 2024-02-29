const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Airlock = require("./airlock")
const Team = require("../team")

class KeypadDoor extends Airlock {
    onBuildingPlaced() {
        super.onBuildingPlaced()
    }

    getDefaultAccessType() {
        let result = 0

        result += (1 << Team.SlaveRoleType)

        return result
    }

    getConstantsTable() {
        return "Buildings.KeypadDoor"
    }

    getType() {
        return Protocol.definition().BuildingType.KeypadDoor
    }

    isAutomatic() {
        return false
    }

    interact(user) {
        //wait for keypad usage instead
    }

    canBeSalvagedBy(player) {
        if (player.isSectorOwner()) {
            return super.canBeSalvagedBy(player)
        } else {
            player.showError("Wait for the map owner to break this door",  {isWarning: true})
            return false
        }
    }

    isAllowedToPass(entity) {
        if(entity.isMob()) return false
        
        else return true
    }

    shouldObstruct(body, hit) {
        return !this.isOpen
    }

    remove() {
        delete this.sector.keyCodes[this.id]
        super.remove()
    }

    setKeypadCode(player, data) {
        if(player.isAdmin() || player.isSectorOwner()) {
            if(this.sector.keyCodes[data.id]) return
            if(typeof data.keyCode != 'string') return
            if(data.keyCode.length > 10) return

            this.keyCode = data.keyCode

            player.showError("Code successfully set to " + data.keyCode)
            this.getSocketUtil().emit(player.getSocket(), "KeypadSuccessful", {})
            this.getSocketUtil().emit(player.getSocket(), "DoorStatus", {status: 'check code'})

            this.sector.keyCodes[data.id] = { keyCode: data.keyCode }
        } else {
            player.showError("Must be admin", {isWarning: true})
        }
    }

    checkKeypadCode(player, data) {
        if(!data || !data.keyCode) return


        let keyCode = this.sector.keyCodes[data.id]

        if(!keyCode) {
            player.showError("Code not set")
            return
        }


        if(data.keyCode === keyCode.keyCode) {
            if(this.isOpen) this.close()

            else this.open()

            this.getSocketUtil().emit(player.getSocket(), "KeypadSuccessful", {})

            setTimeout(() => {
                this.close()
            }, 3000)
        } else {
            this.getSocketUtil().emit(player.getSocket(), "KeypadUnsuccessful", {})
        }
    }

    getStatus(player) {
        if(this.sector.keyCodes[this.id]) {
            return "check code"
        }
        else {
            return "set code"
        }
    }
}

module.exports = KeypadDoor