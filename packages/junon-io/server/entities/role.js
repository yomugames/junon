const BadWordsFilter = require("../util/bad_words_filter")
const Helper = require("../../common/helper")

class Role {
  constructor(options = {}) {
    this.permissions = {
      "Kick":              false,
      "Ban":               false,
      "Build":             false,
      "Deconstruct":       false,
      "MineAsteroids":     false,
      "PlantSeeds":        false,
      "HarvestCrops":      false,
      "ButcherCorpse":     false,
      "Cook":              false,
      "SellToTrader":      false,
      "EditSign":          false,
      "AccessStorage":     false,
      "AccessMiningDrill": false,
      "DamagePvpPlayers":  true,
      "UseVents":          false,
      "UseCommands":       false,
      "EditCommandBlocks": false,
    }

    this.applyData(options)

    this.registerRole()
  }

  isPermissionValid(permission) {
    return this.permissions.hasOwnProperty(permission)
  }

  applyData(options) {
    this.id = options.id
    this.name = options.name
    this.team = options.team

    if (options.permissions) {
      this.applyPermissions(options.permissions)
    }

    if (options.kitName) {
      this.kitName = options.kitName
    }
  }

  getSocketUtil() {
    return this.team.getSocketUtil()
  }

  applyPermissions(permissions) {
    for (let name in permissions) {
      let value = permissions[name]
      this.permissions[name] = value
    }
  }

  setName(name) {
    if (this.isReserved()) return

    this.name = name.replace(/\s+/g, '')

    this.onRoleChanged()
  }

  setKitName(kitName) {
    this.kitName = kitName
  }

  hasKit() {
    return this.kitName
  }

  resetKitName() {
    this.kitName = null
  }

  isReserved() {
    return this.id <= 3 // guest/member/admin/slave
  }

  setPermissions(permissions) {
    for (let name in permissions) {
      let value = permissions[name]

      if (typeof this.permissions[name] !== 'undefined') {
        this.permissions[name] = value
      }
    }

    this.onRoleChanged()
  }

  isAllowedTo(permission) {
    return this.permissions[permission]
  }

  registerRole() {
    this.team.roles[this.id] = this
  }

  unregisterRole() {
    this.team.removeRole(this)
  }

  allowAll() {
    for (let name in this.permissions) {
      this.permissions[name] = true
    }
  }

  onRoleChanged() {
    this.getSocketUtil().broadcast(this.team.getSocketIds(), "RoleUpdated", { teamId: this.team.id, role: this })
  }

  canBeDeleted() {
    return !this.isReserved()
  }

  remove() {
    this.unregisterRole()
    this.getSocketUtil().broadcast(this.team.getSocketIds(), "RoleUpdated", { teamId: this.team.id, role: this, clientShouldDelete: true })
  }

}

module.exports = Role
