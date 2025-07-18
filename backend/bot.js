// backend/bot.js

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const logger = require('./logger');

const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error('Telegram BOT_TOKEN is not configured in .env file.');
}

// Create the bot instance WITHOUT starting it
const bot = new TelegramBot(token);

// --- Message Sending Functions ---
// These functions can be safely imported and used by any script.

async function sendWinnerMessage(telegramId, userName, score, rewardLink) {
    const message = `🏆 *Congratulations, ${userName}!* 🏆\n\nYou are one of the top players!\n\n*Your score:* *${score}*\n\nClick the button below to claim your prize.`;
    const options = {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🎁 Claim Your Reward', url: rewardLink }]] }
    };
    try {
        await bot.sendMessage(telegramId, message, options);
        logger.info(`Winner message sent to user ${telegramId}`);
    } catch (error) {
        logger.error(`Failed to send winner message to ${telegramId}. Reason: ${error.message}`);
    }
}

async function sendConsolationMessage(telegramId, userName, topScore) {
    const message = `👋 Hello, *${userName}*!\n\nThank you for participating. This time you didn't make it to the top 10.\n\n*Your highest score:* *${topScore}*\n\nKeep practicing for the next event!`;
    const options = {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🚀 Play Again!', web_app: { url: 'https://momis.studio' } }]] }
    };
    try {
        await bot.sendMessage(telegramId, message, options);
        logger.info(`Consolation message sent to user ${telegramId}`);
    } catch (error) {
        logger.error(`Failed to send consolation message to ${telegramId}. Reason: ${error.message}`);
    }
}

// --- Bot Listening Function ---
// This function will ONLY be called by our long-running bot process.

function startListening() {
    bot.onText(/\/start/, (msg) => {
        const welcomeText = `🎉 Welcome, *${msg.from.first_name}*!\n\nClick the button below to play **Math Battle**!`;
        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '🚀 Play Game!', web_app: { url: 'https://momis.studio' } }]]
            }
        };
        bot.sendMessage(msg.chat.id, welcomeText, options);
    });

    // Activate polling to listen for messages
    bot.startPolling();

    bot.on('polling_error', (error) => {
        // This prevents the bot from crashing on minor polling errors
        logger.error(`Telegram Polling Error: ${error.message}`);
    });

    logger.info('Telegram Bot initialized and is now listening for commands...');
}

module.exports = {
    sendWinnerMessage,
    sendConsolationMessage,
    startListening, // Export the new function
};