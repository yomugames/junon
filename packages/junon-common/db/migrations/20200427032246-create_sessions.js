'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('sessions', { 
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userUid: {
        type: Sequelize.STRING,
        references: {
            model: 'users',
            key: 'uid'
        },
        onDelete: 'SET NULL'
      },
      sectorUid: {
        type: Sequelize.DataTypes.STRING,
        references: {
          model: 'sectors',
          key: 'uid'
        },
        allowNull: true,
        onDelete: 'SET NULL'
      },
      ip: {
        type: Sequelize.STRING
      },
      duration:  Sequelize.INTEGER,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('sessions');
  }
};
