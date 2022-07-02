'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'sectors',
        'rating',
        {
          type: Sequelize.DataTypes.TINYINT,
          allowNull: false,
          defaultValue: 0
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'sectors',
        'upvoteCount',
        {
          type: Sequelize.DataTypes.SMALLINT,
          allowNull: false,
          defaultValue: 0
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'sectors',
        'downvoteCount',
        {
          type: Sequelize.DataTypes.SMALLINT,
          allowNull: false,
          defaultValue: 0
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
      await queryInterface.removeColumn('sectors', 'rating', { transaction });
      await queryInterface.removeColumn('sectors', 'upvoteCount', { transaction });
      await queryInterface.removeColumn('sectors', 'downvoteCount', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
