const BaseTransientEntity = require("./../base_transient_entity")
const Helper = require('../../../common/helper')

class BaseOre extends BaseTransientEntity {

  getType() {
    throw new Error("must implement BaseOre#getType")
  }

  getTypeName() {
    return Helper.getTypeNameById(this.getType())
  }

  static use(player, targetEntity) {
    // do nothing..
  }

  static isUsable() {
    return true
  }


  toJson() {
    return this.getType()
  }

}

module.exports = BaseOre