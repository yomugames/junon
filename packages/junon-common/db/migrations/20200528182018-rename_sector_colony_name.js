'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('sectors', 'colonyName', 'name');
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('sectors', 'name', 'colonyName');
  }
};
