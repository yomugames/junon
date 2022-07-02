'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('votes', { 
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
      upvote: {
        type: Sequelize.DataTypes.SMALLINT,
        defaultValue: 0
      },
      downvote: {
        type: Sequelize.DataTypes.SMALLINT,
        defaultValue: 0
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('votes');
  }
};
