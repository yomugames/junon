'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('sector_bans', { 
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      ip: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      username: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      sectorUid: {
        type: Sequelize.DataTypes.STRING,
        references: {
          model: 'sectors',
          key: 'uid'
        },
        allowNull: false,
        onDelete: 'CASCADE'
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('sector_bans');
  }
};

