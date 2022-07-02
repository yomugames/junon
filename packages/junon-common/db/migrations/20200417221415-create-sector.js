'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('sectors', { 
      uid: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      colonyName: Sequelize.STRING,
      creatorUid: {
        type: Sequelize.STRING,
        references: {
            model: 'users',
            key: 'uid'
        },
        onDelete: 'SET NULL'
      },
      daysAlive:  Sequelize.INTEGER,
      screenshot:  Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('sectors')
  }
};
