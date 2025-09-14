// Import the sequelize instance
const { sequelize, user_db_sequelize } = require('../database');
const { DataTypes, Sequelize } = require('sequelize');

// Import all models
const User = require('./User');
const Score = require('./Score');
const Reward = require('./Reward');

// Create an object to hold our models and sequelize instance
const db = {};

// Add models to the db object
db.User = User;
db.Score = Score;
db.Reward = Reward;

db.User_Momis = require('./User')(user_db_sequelize, DataTypes);

// Define associations between models

// User <-> Score: A User can have many Scores; A Score belongs to one User.
db.User.hasMany(db.Score, {
    foreignKey: {
        name: 'userTelegramId', // Foreign key in the Scores table
        allowNull: false
    },
    sourceKey: 'telegramId',      // The User.telegramId is the source key for this association
    as: 'Scores'                  // Alias for easy access (e.g., user.getScores(), user.addScore())
});
db.Score.belongsTo(db.User, {
    foreignKey: {
        name: 'userTelegramId',
        allowNull: false
    },
    targetKey: 'telegramId'       // The Score.userTelegramId targets User.telegramId
});

// User <-> Reward: A User can have many Rewards; A Reward belongs to one User.
db.User.hasMany(db.Reward, {
    foreignKey: {
        name: 'userTelegramId', // Foreign key in the Rewards table
        allowNull: false
    },
    sourceKey: 'telegramId',
    as: 'Rewards'                 // Alias for easy access (e.g., user.getRewards(), user.addReward())
});
db.Reward.belongsTo(db.User, {
    foreignKey: {
        name: 'userTelegramId',
        allowNull: false
    },
    targetKey: 'telegramId'
});

// --- ارتباطات جدید برای سیستم ارجاع ---
// یک کاربر می‌تواند چندین کاربر دیگر را ارجاع دهد (ReferredUsers)
db.User.hasMany(db.User, {
    foreignKey: {
        name: 'referrerTelegramId', // این کلید خارجی در خود جدول 'users' است
        allowNull: true             // یک کاربر لزوماً ارجاع‌دهنده ندارد
    },
    as: 'ReferredUsers', // نام مستعار برای دریافت کاربرانی که توسط این کاربر ارجاع شده‌اند (مثلاً user.getReferredUsers())
    sourceKey: 'telegramId' // telegramId ارجاع‌دهنده مبدأ است
});

// یک کاربر به یک ارجاع‌دهنده تعلق دارد
db.User.belongsTo(db.User, {
    foreignKey: {
        name: 'referrerTelegramId',
        allowNull: true
    },
    as: 'Referrer', // نام مستعار برای دریافت کاربری که این کاربر را ارجاع داده است (مثلاً user.getReferrer())
    targetKey: 'telegramId' // telegramId ارجاع‌دهنده مقصد است
});
// --- پایان ارتباطات جدید ---

// Add the sequelize instance to the db object
db.sequelize = sequelize;
// Add Sequelize library itself if needed elsewhere (optional)
db.Sequelize = Sequelize;

// Export the db object
module.exports = db;