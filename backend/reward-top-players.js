// backend/reward-top-players.js

require('dotenv').config();
const { Score, sequelize } = require('./DataBase/models');
const { rewardUser } = require('./ontonApi');
const logger = require('./logger');

const TOP_N_PLAYERS = 10;

async function findAndRewardTopPlayers(eventId) {
    if (!eventId) {
        logger.error('CRITICAL: No eventId provided to the reward script. Aborting.');
        return;
    }

    logger.info(`Starting reward process for event: ${eventId}`);

    try {
        const topScores = await Score.findAll({
            where: { eventId: eventId }, // Find scores for the specific event
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
            logger.info(`No scores found for event ${eventId}. No rewards will be sent.`);
            return;
        }

        logger.info(`Found ${topScores.length} top players in event ${eventId}. Starting to send rewards...`);

        for (const entry of topScores) {
            const userId = entry.userTelegramId;
            logger.info(`Processing reward for user ${userId} with top score ${entry.max_score}`);
            try {
                // We need to set the correct event_uuid for the API call
                // Temporarily set the environment variable for rewardUser to use
                process.env.ONTON_EVENT_UUID = eventId;
                await rewardUser(userId);
                logger.info(`SUCCESS: Reward successfully processed for user ${userId} for event ${eventId}.`);
            } catch (error) {
                logger.error(`FAILED to process reward for user ${userId} in event ${eventId}. Reason: ${error.message}`);
            }
        }

        logger.info(`Reward processing finished for event: ${eventId}`);

    } catch (error) {
        logger.error(`A critical error occurred during the reward process for event ${eventId}: ${error.message}`, { stack: error.stack });
    }
}

// This allows the script to be run from the command line with an argument
if (require.main === module) {
    const eventIdFromArgs = process.argv[2]; // Get the event ID from the command line
    if (!eventIdFromArgs) {
        console.error("Please provide an event ID to process.");
        console.log("Usage: node reward-top-players.js <event-id>");
        process.exit(1);
    }
    findAndRewardTopPlayers(eventIdFromArgs);
}

module.exports = { findAndRewardTopPlayers };