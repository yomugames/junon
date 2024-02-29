const BaseMenu = require("./base_menu");

class KeypadMenu extends BaseMenu {
    onMenuConstructed() {
        document.querySelector("#keypad_clear_button").addEventListener('click', () => {
            document.querySelector("#keypad_code_value").value = ''
        })

        document.querySelector("#keypad_submit_button").addEventListener("click", () => {
            if(!this.doorId) return
            let el = document.querySelector("#keypad_submit_button")
            let valueEl = document.querySelector("#keypad_code_value")
            switch (el.innerText) {
                case 'set code':
                    if(valueEl.value != '') {
                        this.game.getSocketUtil().emit("KeypadAction", {id: this.doorId, action: "setCode", keyCode: valueEl.value})
                    }
                    break
                    
                case 'check code':
                    if(valueEl.value != '') {
                        this.game.getSocketUtil().emit("KeypadAction", {id: this.doorId, action: "checkCode", keyCode: valueEl.value})
                    }
                    break;
                default:
                    break;
            }
        })

        document.querySelector("#keypad_code_value").addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                document.querySelector("#keypad_submit_button").click()
            }
        })

        for(let element of document.getElementsByClassName('keypad_button')) {
            if(element.id == 'keypad_clear_button' || element.id == 'keypad_submit_button') return
            element.addEventListener('click', () => {
                let valueEl = document.querySelector('#keypad_code_value')

                if(valueEl.value.length < 10) {
                    valueEl.value += element.innerText
                }
            })
        }
    }
    
    open(doorId=0) {
        this.el.style.display = 'block'
        document.querySelector("#keypad_code_value").focus()
        document.querySelector("#keypad_code_value").value = ''
        document.querySelector("#keypad_err_msg").style.visibility = 'hidden'

        this.doorId = doorId

        if(doorId == 0) return
        this.game.getSocketUtil().emit("GetDoorStatus", {id: doorId})
    }
    
}

module.exports = KeypadMenu