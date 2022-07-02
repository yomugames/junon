const sequelize = require("./sequelize")
const Sequelize = require("sequelize")

class IpBan extends Sequelize.Model {
  static async isBanned(ip) {
    let user = await this.findOne({ where: { ip: ip } })
    if (user) {
      return true
    }

    return false
  }
}


IpBan.init({
  ip: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  username: Sequelize.STRING,
  dayCount: Sequelize.INTEGER,
  reason: Sequelize.STRING
},{
  sequelize,
  modelName: 'IpBan',
  tableName: 'ip_bans',
  freezeTableName: true // prevent pluralization of names
})

module.exports = IpBan