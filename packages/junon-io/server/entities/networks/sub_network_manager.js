class SubNetworkManager {
  constructor(container) {
    this.container = container
    this.game = container.game
    
    this.networks = {}
    this.parentNetworks = {}
  }

  createNetwork() {
    let klass = this.getNetworkKlass()
    let subNetwork = new klass(this)
    this.networks[subNetwork.id] = subNetwork
    return subNetwork
  }

  createParentNetwork() {
    let klass = this.getNetworkKlass()
    let subNetwork = new klass(this)
    this.parentNetworks[subNetwork.id] = subNetwork
    return subNetwork
  }

  getNetworkCount() {
    return Object.keys(this.networks).length
  }

  getNetworkKlass() {
    throw new Error("must implement getNetworkKlass")
  }

  getNetworkName() {
    throw new Error("must implement SubNetworkManager#getNetworkName")
  }

  allocateNetwork(member) {
    // one member only
    let subNetwork = this.createNetwork()
    subNetwork.addMember(member)

    return subNetwork
  }

  allocateNetworks(member, otherMember) {
    let subNetwork      = member && member[this.getNetworkName()]
    let otherSubNetwork = otherMember && otherMember[this.getNetworkName()]
    let subNetworkConflict = subNetwork && otherSubNetwork && (subNetwork !== otherSubNetwork)

    let networkAllocated = null

    if (subNetworkConflict) {
      return this.merge(subNetwork, otherSubNetwork)
    } else if (subNetwork && !otherSubNetwork ) {
      if (otherMember) {
        subNetwork.addMember(otherMember)
        subNetwork.link(member, otherMember)
      }

      networkAllocated = subNetwork
    } else if (otherSubNetwork && !subNetwork ) {
      if (member) {
        otherSubNetwork.addMember(member)
        otherSubNetwork.link(member, otherMember)
      }

      networkAllocated = otherSubNetwork
    } else {
      // no networks for both
      subNetwork = this.createNetwork()

      if (member)      subNetwork.addMember(member)
      if (otherMember) subNetwork.addMember(otherMember)

      if (member && otherMember) {
        subNetwork.link(member, otherMember)
      }

      networkAllocated = subNetwork
    }

    return networkAllocated
  }

  merge(subNetwork, otherSubNetwork) {
    let networkAllocated = null
    let parentSubNetwork = subNetwork.parent
    let otherParentSubNetwork = otherSubNetwork.parent
    let parentSubNetworkConflict = parentSubNetwork && otherParentSubNetwork && (parentSubNetwork !== otherParentSubNetwork)

    if (parentSubNetworkConflict) {
      // transfer members of one to other
      parentSubNetwork.transferChildrenTo(otherParentSubNetwork)
      delete this.parentNetworks[parentSubNetwork.id]

      networkAllocated = otherParentSubNetwork

    } else if (parentSubNetwork && !otherParentSubNetwork) {
      parentSubNetwork.addMember(otherSubNetwork)
      parentSubNetwork.link(subNetwork, otherSubNetwork)

      networkAllocated = parentSubNetwork
    } else if (otherParentSubNetwork && !parentSubNetwork) {
      otherParentSubNetwork.addMember(subNetwork)
      otherParentSubNetwork.link(subNetwork, otherSubNetwork)

      networkAllocated = otherParentSubNetwork
    } else {
      parentSubNetwork = this.createParentNetwork()

      parentSubNetwork.addMember(subNetwork)
      parentSubNetwork.addMember(otherSubNetwork)
      parentSubNetwork.link(subNetwork, otherSubNetwork)

      networkAllocated = parentSubNetwork
    }

    return networkAllocated
  }

  splitToTwoNetworks(subNetwork, member, otherMember) {
    let parentSubNetwork = subNetwork.parent
    subNetwork.unlink(member, otherMember)

    // create new networks, delete old one
    let subNetworkA = this.createNetwork()
    let subNetworkB = this.createNetwork()

    let connectedMembersA = subNetwork.getConnectedMembers(member)
    let connectedMembersB = subNetwork.getConnectedMembers(otherMember)

    connectedMembersA.forEach((memberId) => {
      let connectedMember = subNetwork.getMember(memberId)
      subNetworkA.addMember(connectedMember)
    })

    connectedMembersB.forEach((memberId) => {
      let connectedMember = subNetwork.getMember(memberId)
      subNetworkB.addMember(connectedMember)
    })

    // previous network has parent, set it to same for newly created one if any of its neighbors
    // are part of parent
    if (parentSubNetwork) {
      if (subNetworkA.shouldBelongToParent(parentSubNetwork)) {
        parentSubNetwork.addMember(subNetworkA)
      }

      if (subNetworkB.shouldBelongToParent(subNetwork.parent)) {
        parentSubNetwork.addMember(subNetworkB)
      }
    }

    // cleanup old subNetwork (no longer needed)
    subNetwork.reset()
  }

  unlinkSubnetworks(subNetwork, otherSubNetwork) {
    let parentSubNetwork = subNetwork.parent
    parentSubNetwork.unlink(subNetwork, otherSubNetwork)
    parentSubNetwork.removeMember(subNetwork)
    parentSubNetwork.removeMember(otherSubNetwork)

    // recheck whether one of the disconnected should still be part of parent
    if (subNetwork.shouldBelongToParent(parentSubNetwork)) {
      parentSubNetwork.addMember(subNetwork)
    }

    if (otherSubNetwork.shouldBelongToParent(parentSubNetwork)) {
      parentSubNetwork.addMember(otherSubNetwork)
    }
  }

  partition(member, otherMember) {
    let subNetwork      = member && member[this.getNetworkName()]
    let otherSubNetwork = otherMember && otherMember[this.getNetworkName()]
    let isSameNetwork = subNetwork && otherSubNetwork && subNetwork === otherSubNetwork
    let isDiffNetwork = subNetwork && otherSubNetwork && subNetwork !== otherSubNetwork

    if (isSameNetwork) {
      this.splitToTwoNetworks(subNetwork, member, otherMember)
    } else if (isDiffNetwork) {
      // different network, check if has same parent
      let hasSameParent = subNetwork.parent && otherSubNetwork.parent && subNetwork.parent === otherSubNetwork.parent
      if (hasSameParent) {
        this.unlinkSubnetworks(subNetwork, otherSubNetwork)
      }
    }

  }

}

module.exports = SubNetworkManager