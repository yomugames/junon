'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query('ALTER TABLE ip_bans DROP PRIMARY KEY');
      await queryInterface.addColumn(
        'ip_bans',
        'id',
        {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query('ALTER TABLE ip_bans DROP PRIMARY KEY');
      await queryInterface.removeColumn('ip_bans', 'id', { transaction });
      await queryInterface.addConstraint('ip_bans', {
         fields: ['ip'],
         type: 'primary key'
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
