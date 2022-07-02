class NewGameMenu {
  constructor(main) {
    this.main = main
    this.game = main.game
  }

  open(options = {}) {
    let name = options.name
    document.querySelector(".new_game_title").innerText = name
    this.show()
  }

  show() {
    document.querySelector(".new_game_container").style.display = 'block'
    this.main.lastMenu = this.main.gameExplorer
    this.main.gameExplorer.hide()
  }

  hide() {
    document.querySelector(".new_game_container").style.display = 'none'
  }

  
}

module.exports = NewGameMenu