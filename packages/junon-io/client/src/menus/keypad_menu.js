const BaseMenu = require("./base_menu");

class KeypadMenu extends BaseMenu {
    onMenuConstructed() {
        document.querySelector("#keypad_clear_button").addEventListener('click', () => {
            document.querySelector("#keypad_code_value").innerHTML = ''
        })

        document.querySelector("#keypad_submit_button").addEventListener("click", () => {
            if(!this.doorId) return
            let el = document.querySelector("#keypad_submit_button")
            let valueEl = document.querySelector("#keypad_code_value")
            switch (el.innerHTML) {
                case 'set code':
                    if(valueEl.innerHTML != '') {
                        this.game.getSocketUtil().emit("KeypadAction", {id: this.doorId, action: "setCode", keyCode: valueEl.innerHTML})
                    }
                    break
                case 'check code':
                    if(valueEl.innerHTML != '') {
                        this.game.getSocketUtil().emit("KeypadAction", {id: this.doorId, action: "checkCode", keyCode: valueEl.innerHTML})
                    }
                    break;
                default:
                    break;
            }
        })

        for(let element of document.getElementsByClassName('keypad_button')) {
            if(element.id == 'keypad_clear_button' || element.id == 'keypad_submit_button') return
            element.addEventListener('click', () => {
                let valueEl = document.querySelector('#keypad_code_value')

                if(valueEl.innerHTML.length < 10) {
                    valueEl.innerHTML += element.innerHTML
                }
            })
        }
    }
    
    open(doorId=0) {
        this.el.style.display = 'block'
        document.querySelector("#keypad_code_value").innerHTML = ''
        document.querySelector("#keypad_err_msg").style.visibility = 'hidden'

        this.doorId = doorId

        if(doorId == 0) return
        this.game.getSocketUtil().emit("GetDoorStatus", {id: doorId})
    }
    
}

module.exports = KeypadMenu