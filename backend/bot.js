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

// --- Game Short Name ---
// نام کوتاهی که در BotFather ثبت کرده‌اید
const MATH_BATTLE_SHORT_NAME = 'math_battle';

// --- Message Sending Functions ---
async function sendWinnerMessage(telegramId, userName, score, rewardLink) {
    // This function remains unchanged
    const message = `🏆 *Congratulations, ${userName}!* 🏆...`;
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
        logger.error(`Failed to send winner message to ${telegramId}. Reason: ${error.message}`);
    }
}

async function sendConsolationMessage(telegramId, userName, topScore) {
    const message =
`👋 Hello, *${userName}*!

Thank you for participating in our latest tournament. This time you didn't make it to the top 10.

*Your highest score:* *${topScore}*

The tournament has now officially ended. Keep practicing for the next event!`;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{
                text: '🚀 Play Math Battle!',
                // این دکمه حالا یک دکمه بازی است
                callback_game: {}
            }]]
        }
    };
    try {
        await bot.sendMessage(telegramId, message, options);
        logger.info(`Consolation message sent to user ${telegramId}`);
    } catch (error) {
        logger.error(`Failed to send consolation message to ${telegramId}. Reason: ${error.message}`);
    }
}

// --- Bot Listening Function ---
function startListening() {
    bot.onText(/\/start/, (msg) => {
        const welcomeText = `🎉 Welcome, *${msg.from.first_name}*!\n\nClick the button below to play **Math Battle**!`;
        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{
                    text: '🚀 Play Game!',
                    // این دکمه حالا یک دکمه بازی است
                    // نکته: دکمه بازی همیشه باید اولین دکمه در ردیف اول باشد
                    callback_game: {}
                }]]
            }
        };
        bot.sendMessage(msg.chat.id, welcomeText, options);
    });

    // *** بخش جدید: مدیریت کلیک روی دکمه بازی ***
    bot.on('callback_query', (query) => {
        // اگر کلیک مربوط به یک بازی بود
        if (query.game_short_name) {
            // بررسی می‌کنیم که نام بازی با بازی ما مطابقت دارد
            if (query.game_short_name !== MATH_BATTLE_SHORT_NAME) {
                bot.answerCallbackQuery(query.id, { text: 'Sorry, this game is not available.', show_alert: true });
                return;
            }

            const userId = query.from.id;
            const gameUrl = `https://momis.studio/math-battle?user_id=${userId}`;

            // با این دستور، URL بازی را برای تلگرام ارسال می‌کنیم تا باز شود
            bot.answerCallbackQuery(query.id, { url: gameUrl })
                .catch(err => logger.error(`Failed to answer callback query: ${err.message}`));
        }
    });

    // Activate polling to listen for messages
    bot.startPolling();

    bot.on('polling_error', (error) => {
        logger.error(`Telegram Polling Error: ${error.message}`);
    });

    logger.info('Telegram Bot initialized and is now listening for commands...');
}

module.exports = {
    sendWinnerMessage,
    sendConsolationMessage,
    startListening,
};