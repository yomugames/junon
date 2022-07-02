const graphlib = require("@dagrejs/graphlib")
const Graph = graphlib.Graph
const GraphAlg = graphlib.alg

/*
  SubNetwork inspired by https://www.factorio.com/blog/post/fff-115

  Instead of merging/partitioning members, we create subnetworks that link other subnetworks together
  Meant to be used for networks that constantly changes (insert/delete)

*/

class SubNetwork {
  constructor(manager) {
    this.manager = manager
    this.graph = new Graph()
    this.id = this.generateId()
    this.children = {}
  }

  generateId() {
    return this.manager.game.generateId("sub_network")
  }

  getNetworkName() {
    throw new Error("must implement SubNetwork#getNetworkName")
  }

  getMember(memberId) {
    return this.graph.node(memberId)
  }

  getMemberName() {
    throw new Error("must implement SubNetwork#getMemberName")
  }

  getNeighborMembers() {
    throw new Error("must implement getNeighborMembers")
  }

  shouldBelongToParent(subNetwork) {
    return this.getNeighborMembers().find((member) => {
      let memberSubNetwork = member[this.getNetworkName()]
      let memberParentSubNetwork = memberSubNetwork && memberSubNetwork.parent
      return memberParentSubNetwork === subNetwork
    })
  }

  addMember(member) {
    this.graph.setNode(this.getMemberId(member), member)

    if (member instanceof SubNetwork) {
      member.parent = this
      this.children[member.id] = member
    } else {
      member[this.getNetworkName()] = this
    }

    this.onNetworkChanged()
  }

  removeMember(member) {
    this.graph.removeNode(this.getMemberId(member))

    if (member instanceof SubNetwork) {
      member.parent = null
      delete this.children[member.id]
    } else {
      member[this.getNetworkName()] = null
    }

    this.onNetworkChanged()
  }

  onNetworkChanged() {
    this.removeEmptyNetwork()
  }

  removeEmptyNetwork() {
    if (this.isEmpty()) {
      if (this.parent) {
        this.parent.removeMember(this)
      }
      delete this.manager.networks[this.id]
      delete this.manager.parentNetworks[this.id]
    }
  }

  isEmpty() {
    return this.graph.nodes().length === 0
  }

  transferChildrenTo(otherSubNetwork) {
    for (let key in this.children) {
      let subNetwork = this.children[key]
      otherSubNetwork.addMember(subNetwork) // sets the parent/children
    }

    this.children = {}
  }

  hasMember(member) {
    let result = false

    let subNetworks = this.getAllSubNetworks()

    return subNetworks.find((subNetwork) => {
      return subNetwork.hasNode(member)
    })
  }


  hasNode(member) {
    return this.graph.hasNode(this.getMemberId(member))
  }

  getRootSubNetwork() {
    let parent = this
    let rootSubNetwork

    while (parent) {
      rootSubNetwork = parent
      parent = parent.parent
    }

    return rootSubNetwork
  }

  getAllSubNetworks() {
    let subNetworks = []

    this.walkSubNetworks(this.getRootSubNetwork(), (subNetwork) => {
      subNetworks.push(subNetwork)
    })

    return subNetworks
  }

  getChildren() {
    return Object.values(this.children)
  }

  walkSubNetworks(subNetwork, cb) {
    let children = subNetwork.getChildren()
    if (children.length > 0) {
      children.forEach((child) => {
        this.walkSubNetworks(child, cb)
      })
    } else {
      cb(subNetwork)
    }
  }

  getConnectedMembers(member) {
    let members = []

    this.walkGraph(this.getMemberId(member), {}, (memberId) => {
      members.push(memberId)
    })

    return members
  }

  getMembers() {
    return this.graph.nodes().map((memberId) => {
      return this.graph.node(memberId)
    })
  }

  getMemberId() {
    throw new Error("must implement SubNetwork#getMemberId")
  }

  link(member, otherMember) {
    this.graph.setEdge(this.getMemberId(member), this.getMemberId(otherMember))
  }

  unlink(member, otherMember) {
    this.graph.removeEdge(this.getMemberId(member), this.getMemberId(otherMember))
  }

  walkGraph(node, isWalked, cb) {
    isWalked[node] = true

    const neighbors = this.graph.neighbors(node)
    let neighbor
    for (var i = 0; i < neighbors.length; i++) {
      neighbor = neighbors[i]
      if (!isWalked[neighbor]) {
        this.walkGraph(neighbor, isWalked, cb)
      }
    }

    cb(node)
  }


  reset() {
    let nodes = this.graph.nodes()
    nodes.forEach((node) => {
      this.graph.removeNode(node.v)
    })

    this.children = {}

    if (this.parent) {
      this.parent.removeMember(this)
    }

    delete this.manager.networks[this.id]
  }

  toGraphJson() {
    throw new Error("must implement toGraphJson")
  }


}

module.exports = SubNetwork
