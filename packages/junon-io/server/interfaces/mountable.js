const Mountable = () => {
}

Mountable.prototype = {
  initMountable: () => {
    this.passenger = null  
  },

  mount(user) {
    if (this.passenger) return

    if (isTooFar(user)) {
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
  },

  isMountable(user) {
    if (this.passenger) return false
    if (!isTooFar(user)) return false
    
    return true
  }

  isTooFar(user) {
    if (this.game.distanceBetween(this, user) >= this.getInteractDistance()) {
      return true
    }
  }
}

module.exports = Mountable
