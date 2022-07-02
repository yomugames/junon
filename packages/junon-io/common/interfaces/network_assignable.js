const NetworkAssignable = () => {
}

NetworkAssignable.prototype = {
  assignNetwork(networkName, network) {
    this[networkName] = network
    this.onNetworkAssignmentChanged(networkName)
  },

  unassignNetwork(networkName, network) {
    this[networkName] = null
    this.onNetworkAssignmentChanged(networkName)
  },

  assignNetworkMultiple(networkCollection, network) {
    this[networkCollection] = this[networkCollection] || {} // initialize if not present before

    this[networkCollection][network.id] = network
    this.onNetworkAssignmentChanged(networkCollection, network)
  },

  unassignNetworkMultiple(networkCollection, network) {
    this[networkCollection] = this[networkCollection] || {} // initialize if not present before

    delete this[networkCollection][network.id] 
    this.onNetworkAssignmentChanged(networkCollection, network)
  },

  onNetworkAssignmentChanged(networkName) {
  }
}

module.exports = NetworkAssignable


