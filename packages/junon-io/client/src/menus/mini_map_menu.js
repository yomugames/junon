const SocketUtil = require("./../util/socket_util")
const Constants = require("./../../../common/constants.json")
const BaseMenu = require("./base_menu")

class MiniMapMenu extends BaseMenu {

  onMenuConstructed() {
    this.canvas = this.el.querySelector("#mini_map_canvas")
    this.rowColPosition = document.querySelector("#mini_map_player_pos_label")
  }

  open() {
    this.el.style.display = 'block'
  }

  cleanup() {
    // let ctx = this.canvas.getContext("2d")
    // ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  displayPosition(player) {
    if (this.lastPosition !== player.getCoord()) {
      this.lastPosition = player.getCoord()
      this.rowColPosition.innerText = player.getCoord()
    }
    
  }

  updateViewport() {
    // if (this.isCanvasChanged) {
    //   this.isCanvasChanged = false
      
    //   let player = this.game.player

    //   let viewportWidth  = 200 // 1/3 of 600px buffermap
    //   let viewportHeight = 200
    //   let topLeftX = player.getCol() * 2 - viewportWidth/2
    //   let topLeftY = player.getRow() * 2 - viewportWidth/2

    //   let ctx = this.canvas.getContext("2d")
    //   ctx.fillStyle = "#0d151d"
    //   ctx.fillRect(0,0,150,150)
    //   ctx.drawImage(this.game.mapMenu.terrainCanvas, topLeftX, topLeftY, viewportWidth, viewportHeight, 
    //                                                  0, 0, 150, 150)
    //   ctx.drawImage(this.game.mapMenu.entityCanvas, topLeftX, topLeftY, viewportWidth, viewportHeight, 
    //                                                  0, 0, 150, 150)
    // }
  }

  invalidate() {
    this.isCanvasChanged = true
  }


}



module.exports = MiniMapMenu 