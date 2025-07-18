// backend/bot.js
require('dotenv').config(); // <-- This line is the definitive fix

const TelegramBot = require('node-telegram-bot-api');
const logger = require('./logger');

// Ensure you have BOT_TOKEN in your .env file
const token = process.env.BOT_TOKEN;

if (!token) {
    logger.error('Telegram BOT_TOKEN is not configured in .env file. Bot will not start.');
    // Export empty functions if bot cannot start
    module.exports = {
        sendWinnerMessage: async () => {},
        sendConsolationMessage: async () => {},
    };
    return;
}

// Initialize the bot
const bot = new TelegramBot(token, { polling: true });

logger.info('Telegram Bot initialized and listening for commands...');

// --- /start Command Handler ---
// This makes your bot look professional
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'Player';

    const welcomeText = `🎉 Welcome, *${userName}*!\n\nThis is the official bot for the **Math Battle** game.\n\nClick the button below to open the game and start challenging your mind!`;

    // Inline keyboard with a button that opens your mini-app
    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🚀 Play Game!',
                        // This URL must match the one you registered with BotFather
                        web_app: { url: 'https://momis.studio' } 
                    }
                ]
            ]
        }
    };

    // You can also send a welcome image
    // const photoUrl = 'https://your-server.com/welcome-image.png';
    // bot.sendPhoto(chatId, photoUrl, { caption: welcomeText, ...options });
    
    bot.sendMessage(chatId, welcomeText, options);
});

// --- Helper function to send messages to winners ---
async function sendWinnerMessage(telegramId, userName, score, rewardLink) {
    const message = 
`🏆 *Congratulations, ${userName}!* 🏆

You are one of the top players in the last tournament!

*Your final score:* *${score}*

You have earned a special reward. Click the button below to claim your SBT prize in the ONTON app.

Thank you for playing!`;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '🎁 Claim Your Reward', url: rewardLink }]]
        }
    };

    try {
        await bot.sendMessage(telegramId, message, options);
        logger.info(`Winner message sent to user ${telegramId}`);
    } catch (error) {
        // This usually happens if the user has blocked the bot
        logger.error(`Failed to send winner message to ${telegramId}. Reason: ${error.message}`);
    }
}

// --- Helper function to send messages to other participants ---
async function sendConsolationMessage(telegramId, userName, topScore) {
    const message = 
`👋 Hello, *${userName}*!

Thank you for participating in our latest tournament. This time you didn't make it to the top 10, but we hope you had fun!

*Your highest score:* *${topScore}*

Keep practicing for the next event. We look forward to seeing you again!`;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '🚀 Play Again!', web_app: { url: 'https://momis.studio' } }]]
        }
    };

    try {
        await bot.sendMessage(telegramId, message, options);
        logger.info(`Consolation message sent to user ${telegramId}`);
    } catch (error) {
        logger.error(`Failed to send consolation message to ${telegramId}. Reason: ${error.message}`);
    }
}

module.exports = {
    sendWinnerMessage,
    sendConsolationMessage,
};