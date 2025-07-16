// backend/ontonApi.js

const fetch = require('node-fetch');
const logger = require('./logger');

// آدرس پایه جدیدی که مسئول ONTON به شما داده است
const ONTON_API_BASE = 'https://staging-app.toncloud.observer/api/v1'; 
const API_KEY = process.env.ONTON_API_KEY ? process.env.ONTON_API_KEY.trim() : null;
const EVENT_UUID = process.env.ONTON_EVENT_UUID;

async function rewardUser(userTelegramId) {
    // لاگ‌های تشخیصی (می‌توانند باقی بمانند)
    logger.info(`DIAGNOSTIC: API Key value check. Key length: ${API_KEY ? API_KEY.length : '0'}`);
    logger.info(`DIAGNOSTIC: Key first 10 chars: ${API_KEY ? API_KEY.substring(0, 10) : 'N/A'}`);

    if (!API_KEY || !EVENT_UUID) {
        logger.error('ONTON_API_KEY or ONTON_EVENT_UUID is not set in .env file.');
        throw new Error('Server configuration error for ONTON API.');
    }

    // ▼▼▼ ساخت صحیح URL ▼▼▼
    const endpoint = `${ONTON_API_BASE}/reward`;
    // ▲▲▲ پایان ساخت صحیح URL ▲▲▲

    const body = {
        event_uuid: EVENT_UUID,
        reward_user_id: parseInt(userTelegramId, 10),
    };

    logger.info(`Sending reward request to ONTON. URL: ${endpoint}`);
    logger.info(`Sending reward request to ONTON. URL: ${endpoint}`);
    logger.info('Sending request with these exact headers:', headers);
    
    // ▼▼▼ این خط جدید را اضافه کرده‌ام ▼▼▼
    logger.info('Sending request with this exact body:', body);
    // ▲▲▲ این خط جدید است ▲▲▲

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'api-key': API_KEY, // نام هدر را به حالت استاندارد داکیومنت برگرداندم
            },
            body: JSON.stringify(body),
        });

        const responseData = await response.json(); // تلاش برای خواندن پاسخ به صورت JSON

        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || 'Unknown ONTON API error';
            logger.error(`ONTON API Error (Status: ${response.status}): ${errorMessage}`, { body });
            throw new Error(errorMessage);
        }

        logger.info(`Successfully received response from ONTON for user ${userTelegramId}.`);
        return responseData;

    } catch (error) {
        logger.error(`Failed to communicate with ONTON API: ${error.toString()}`);
        throw error;
    }
}

module.exports = {
    rewardUser,
};