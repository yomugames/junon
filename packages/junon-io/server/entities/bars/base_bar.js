const BaseTransientEntity = require("./../base_transient_entity")
const Helper = require('../../../common/helper')

class BaseBar extends BaseTransientEntity {

  getType() {
    throw new Error("must implement BaseBar#getType")
  }
  
  getTypeName() {
    return Helper.getTypeNameById(this.getType())
  }

  static use(player, targetEntity) {
    // do nothing..
  }

  toJson() {
    return this.getType()
  }

}

module.exports = BaseBar