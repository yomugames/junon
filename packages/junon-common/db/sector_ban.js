const sequelize = require("./sequelize")
const Sequelize = require("sequelize")

class SectorBan extends Sequelize.Model {
  static async createOne(attributes) {
    return this.create(attributes)
  }

  static async isBanned(ip) {
    let user = await this.findOne({ where: { ip: ip } })
    if (user) {
      return true
    }

    return false
  }
}


SectorBan.init({
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ip: {
    type: Sequelize.STRING,
  },
  userUid: {
    type: Sequelize.STRING,
  },
  username: Sequelize.STRING,
  sectorUid: {
    type: Sequelize.STRING,
    references: {
      model: 'sectors',
      key: 'uid'
    },
    onDelete: 'SET NULL',
    allowNull: true
  },
  createdAt: Sequelize.DATE,
  updatedAt: Sequelize.DATE
},{
  sequelize,
  modelName: 'SectorBan',
  tableName: 'sector_bans',
  freezeTableName: true // prevent pluralization of names
})

module.exports = SectorBan