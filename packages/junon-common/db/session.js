const sequelize = require("./sequelize")
const Sequelize = require("sequelize")

class Session extends Sequelize.Model {
  static async createOne(attributes) {
    return this.create(attributes)
  }
}


Session.init({
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userUid: Sequelize.STRING,
  duration:  Sequelize.INTEGER,
  ip: {
    type: Sequelize.STRING
  },
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
  modelName: 'Session',
  tableName: 'sessions',
  freezeTableName: true // prevent pluralization of names
})

module.exports = Session