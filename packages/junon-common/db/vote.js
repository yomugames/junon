const sequelize = require("./sequelize")
const Sequelize = require("sequelize")

class Vote extends Sequelize.Model {
  static async createOne(attributes) {
    return this.create(attributes)
  }
}

Vote.init({
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userUid: Sequelize.STRING,
  sectorUid: {
    type: Sequelize.STRING,
    references: {
      model: 'sectors',
      key: 'uid'
    },
    onDelete: 'SET NULL',
    allowNull: true
  },
  upvote: {
    type: Sequelize.SMALLINT,
    defaultValue: 0
  },
  downvote: {
    type: Sequelize.SMALLINT,
    defaultValue: 0
  }
},{
  sequelize,
  modelName: 'Vote',
  tableName: 'votes',
  timestamps: false,
  freezeTableName: true // prevent pluralization of names
})

module.exports = Vote