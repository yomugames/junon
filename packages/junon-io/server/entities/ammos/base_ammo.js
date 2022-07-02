const BaseTransientEntity = require("./../base_transient_entity")
const Helper = require('../../../common/helper')

class BaseAmmo extends BaseTransientEntity {

  static isUsable() {
    return true
  }

  static use(player, targetEntity) {
    // do nothing..
  }

  getType() {
    throw new Error("must implement BaseAmmo#getType")
  }

  getTypeName() {
    return Helper.getTypeNameById(this.getType())
  }

  toJson() {
    return this.getType()
  }

}

module.exports = BaseAmmo