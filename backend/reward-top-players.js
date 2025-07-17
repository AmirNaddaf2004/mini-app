// backend/reward-top-players.js

require('dotenv').config();
const { Score, User, sequelize } = require('./DataBase/models');
const { rewardUser } = require('./ontonApi');
const logger = require('./logger');

const EVENT_ID_TO_PROCESS = process.env.ONTON_EVENT_UUID;
const TOP_N_PLAYERS = 10; // تعداد نفرات برتر که پاداش می‌گیرند

async function findAndRewardTopPlayers() {
    if (!EVENT_ID_TO_PROCESS) {
        logger.error('CRITICAL: ONTON_EVENT_UUID is not defined in .env file. Cannot process rewards.');
        return;
    }

    logger.info(`Starting reward process for event: ${EVENT_ID_TO_PROCESS}`);

    try {
        // ۱. پیدا کردن ۱۰ امتیاز برتر برای کاربران مختلف در این رویداد
        const topScores = await Score.findAll({
            where: { eventId: EVENT_ID_TO_PROCESS },
            attributes: [
                'userTelegramId',
                [sequelize.fn('MAX', sequelize.col('score')), 'max_score']
            ],
            group: ['userTelegramId'],
            order: [[sequelize.fn('MAX', sequelize.col('score')), 'DESC']],
            limit: TOP_N_PLAYERS,
            raw: true,
        });

        if (topScores.length === 0) {
            logger.info(`No scores found for event ${EVENT_ID_TO_PROCESS}. No rewards will be sent.`);
            return;
        }

        logger.info(`Found ${topScores.length} top players to reward. Starting to send rewards...`);

        // ۲. حلقه زدن روی نفرات برتر و ارسال پاداش به هر کدام
        for (const entry of topScores) {
            const userId = entry.userTelegramId;
            const score = entry.max_score;
            logger.info(`Processing reward for user ${userId} with top score ${score}`);
            try {
                await rewardUser(userId);
                logger.info(`SUCCESS: Reward successfully processed for user ${userId}.`);
            } catch (error) {
                logger.error(`FAILED to process reward for user ${userId}. Reason: ${error.message}`);
            }
        }

        logger.info(`Reward processing finished for event: ${EVENT_ID_TO_PROCESS}`);

    } catch (error) {
        logger.error(`A critical error occurred during the reward process: ${error.message}`, { stack: error.stack });
    }
}

// این بخش اجازه می‌دهد تا فایل به صورت مستقیم از ترمینال اجرا شود
if (require.main === module) {
    findAndRewardTopPlayers().then(() => {
        logger.info('Manual execution of reward script finished.');
        process.exit(0);
    }).catch(err => {
        logger.error('Manual execution failed:', err);
        process.exit(1);
    });
}

module.exports = { findAndRewardTopPlayers };