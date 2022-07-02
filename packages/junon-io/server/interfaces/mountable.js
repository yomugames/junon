const Mountable = () => {
}

Mountable.prototype = {
  initMountable: () => {
    this.passenger = null  
  },

  mount(user) {
    if (this.passenger) return

    if (this.game.distanceBetween(this, user) >= this.getInteractDistance()) {
      if (user.isPlayer()) {
        user.showError("Too far", { isWarning: true })
      }
      
      return
    }

    this.passenger = user
    this.passenger.mounted = this
    this.passenger.setPosition(this.getX(), this.getY())
    this.passenger.setAngle(this.getAngle())
  },

  unmount() {
    if (this.passenger) {
      this.passenger.mounted = null
      this.passenger = null
    }
  },

  shouldUpdatePosition() {
    return true
  }

}

module.exports = Mountable
