const Powerable = () => {
}

Powerable.prototype = {
  setPowerStatus(isPowered) {
    if (this.isPowered !== isPowered) {
      this.isPowered = isPowered
      this.onPowerChanged()
    }
  },

  onPowerChanged() {

  }

}

module.exports = Powerable
