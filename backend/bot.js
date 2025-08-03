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
// Find and replace this function in backend/bot.js

async function sendWinnerMessage(telegramId, userName, score, rewardLink) {
    const message = 
`🏆 *Congratulations, ${userName}!* 🏆

You are the top player in the last tournament!

*Your final score:* *${score}*

You have earned a special reward. Click the button below to claim your prize.

---
*Please note: The tournament has officially ended. New scores will not affect the final results.*`;

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

// Find and replace this function in backend/bot.js

async function sendConsolationMessage(telegramId, userName, topScore) {
    const message = 
`👋 Hello, *${userName}*!

Thank you for participating in our latest tournament. This time you didn't make it to be the top player

*Your highest score:* *${topScore}*

The tournament has now officially ended. Keep practicing for the next event!`;

    const options = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: '🚀 Play in Free mode and practice!', web_app: { url: 'https://math-battle.momis.studio' } }]]
        }
    };
    try {
        await bot.sendMessage(telegramId, message, options);
        logger.info(`Consolation message sent to user ${telegramId}`);
    } catch (error) {
        logger.error(`Failed to send consolation message to ${telegramId}. Reason: ${error.message}`);
    }
}

// --- Channel Membership Check ---
async function isUserInChannel(userId) {
    const CHANNEL_ID = '@MOMIS_studio';
    const GROUP_ID = '@MOMIS_community';
    try {
        const member1 = await bot.getChatMember(CHANNEL_ID, userId);
        const member2 = await bot.getChatMember(GROUP_ID, userId);
        return ['member', 'administrator', 'creator'].includes(member1.status) &&
            ['member', 'administrator', 'creator'].includes(member2.status) ;
    } catch (error) {
        logger.error(`Failed to check channel membership for ${userId}: ${error.message}`);
        return false;
    }
}

// --- Bot Listening Function ---
// This function will ONLY be called by our long-running bot process.

function startListening() {
    bot.onText(/\/start/, async(msg) => {
        try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const firstName = msg.from.first_name;

        // بررسی عضویت در کانال
        const isMember = await isUserInChannel(userId);
        
        if (!isMember) {
            // ارسال پیام عضویت در کانال
            const channelLink = 'https://t.me/MOMIS_studio'; 
            const groupLink = 'https://t.me/MOMIS_community'; 
            const message = `👋 Hello, *${firstName}*!\n\nTo play Math Battle, please join our community group and channel first then start again.`;
            
            const options = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📢 Join Community Group', url: groupLink }],
                        [{ text: '📢 Join Channel', url: channelLink }]
                        // , [{ text: '✅ I Joined', url: `https://t.me/Momis_game_bot?start` }]
                        // ,[{ text: '✅ I Joined', callback_data: 'check_membership' }]
                    ]
                }
            };
            
            return await bot.sendMessage(chatId, message, options);
        }

        const welcomeText = `🎉 Welcome, *${msg.from.first_name}*!\n\nClick the button below to play **Math Battle**!`;
        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '🚀 Play Game!', web_app: { url: 'https://math-battle.momis.studio' } }]]
            }
        };
        await bot.sendMessage(msg.chat.id, welcomeText, options);}
        catch (error) {
            logger.error(`Error in /start handler: ${error.message}`);
            await bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
        }
    });

    // هندلر برای بررسی مجدد عضویت
    bot.on('callback_query', async (callbackQuery) => {
        logger.info("callback recieved");

        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;
        const queryId = callbackQuery.id;


        // Acknowledge the callback query to remove the loading indicator on the client side
        await bot.answerCallbackQuery(queryId, { text: 'Processing...' }); 

        if (data === 'check_membership') {
            try {
                const isMember = await isUserInChannel(userId);
                
                if (isMember) {
                    // اگر عضو شد، نمایش دکمه بازی
                    const welcomeText = `✅ Thanks for joining!\n\nClick below to play **Math Battle**:`;
                    const gameOptions = {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '🚀 Play Game!', web_app: { url: 'https://math-battle.momis.studio' } }
                            ]]
                        }
                    };
                    
                    await bot.sendMessage(chatId, welcomeText, gameOptions);
                    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Membership verified!' });
                } else {
                    // اگر هنوز عضو نشده
                    await bot.answerCallbackQuery(callbackQuery.id, { 
                        text: 'Please join the channel first!', 
                        show_alert: true 
                    });
                }
            } catch (error) {
                logger.error(`Membership check failed: ${error.message}`);
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'Error verifying membership. Please try again.',
                    show_alert: true
                });
            }
        }
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