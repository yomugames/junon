'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query('alter table favorites add unique favorites_unique_index(`userUid`, `sectorUid`)')
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query('drop index favorites_unique_index on favorites')
  }
};
