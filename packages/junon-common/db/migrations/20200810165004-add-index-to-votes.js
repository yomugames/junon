'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query('alter table votes add unique votes_unique_index(`userUid`, `sectorUid`)')
  },

  down: (queryInterface, Sequelize) => {
    // alter table votes drop foreign key votes_ibfk_1;
    // alter table votes drop foreign key votes_ibfk_2;
    return queryInterface.sequelize.query('drop index votes_unique_index on votes')
  }
};
