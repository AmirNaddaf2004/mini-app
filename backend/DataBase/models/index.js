'use strict';

const { sequelize, user_db_sequelize } = require('../database');
const { DataTypes, Sequelize } = require('sequelize');

// Create an object to hold our models and sequelize instance
const db = {};

// Import and instantiate models with their correct Sequelize instance
// Models for the main database (colormemory_db)
db.User = require('./User')(sequelize, DataTypes);
db.Score = require('./Score')(sequelize, DataTypes);
db.Reward = require('./Reward')(sequelize, DataTypes);

// Model for the separate user-centric database (momis_users)
// Note: This User model is distinct from the one in the main database
db.User_Momis = require('./User')(user_db_sequelize, DataTypes);

// Define associations between models
// These associations are all within the 'main' database (colormemory_db)
// User <-> Score: A User can have many Scores; A Score belongs to one User.
db.User.hasMany(db.Score, {
    foreignKey: {
        name: 'userTelegramId',
        allowNull: false
    },
    sourceKey: 'telegramId',
    as: 'Scores'
});
db.Score.belongsTo(db.User, {
    foreignKey: {
        name: 'userTelegramId',
        allowNull: false
    },
    targetKey: 'telegramId'
});

// User <-> Reward: A User can have many Rewards; A Reward belongs to one User.
db.User.hasMany(db.Reward, {
    foreignKey: {
        name: 'userTelegramId',
        allowNull: false
    },
    sourceKey: 'telegramId',
    as: 'Rewards'
});
db.Reward.belongsTo(db.User, {
    foreignKey: {
        name: 'userTelegramId',
        allowNull: false
    },
    targetKey: 'telegramId'
});

// --- New Associations for Referral System ---
// A user can refer many other users (ReferredUsers)
db.User.hasMany(db.User, {
    foreignKey: {
        name: 'referrerTelegramId',
        allowNull: true
    },
    as: 'ReferredUsers',
    sourceKey: 'telegramId'
});

// A user belongs to one referrer
db.User.belongsTo(db.User, {
    foreignKey: {
        name: 'referrerTelegramId',
        allowNull: true
    },
    as: 'Referrer',
    targetKey: 'telegramId'
});
// --- End of new associations ---

// Add the sequelize instances to the db object
db.sequelize = sequelize;
db.user_db_sequelize = user_db_sequelize;

// Add Sequelize library itself if needed elsewhere
db.Sequelize = Sequelize;

// Export the db object
module.exports = db;