const fetch = require("node-fetch");
const logger = require("./logger"); // Use the existing logger for consistency

const ONTON_API_BASE = "https://app.onton.live/api/v1";
const API_KEY = process.env.ONTON_API_KEY;
const EVENT_UUID = process.env.ONTON_EVENT_UUID;

async function rewardUser(userTelegramId) {
    // Check if the required environment variables are set
    if (!API_KEY || !EVENT_UUID) {
        logger.error(
            "ONTON_API_KEY or ONTON_EVENT_UUID is not set in .env file."
        );
        throw new Error("Server configuration error for ONTON API.");
    }

    logger.info(`DIAGNOSTIC: API Key value check.`);
    logger.info(`DIAGNOSTIC: Key length: ${API_KEY ? API_KEY.length : "0"}`);
    logger.info(
        `DIAGNOSTIC: Key first 3 chars: ${
            API_KEY ? API_KEY.substring(0, 3) : "N/A"
        }`
    );
    
    const endpoint = `${ONTON_API_BASE}/reward`;
    const body = {
        event_uuid: EVENT_UUID,
        reward_user_id: parseInt(userTelegramId, 10), // Ensure it's an integer
    };

    logger.info(
        `Sending reward request to ONTON for user ${userTelegramId}...`
    );

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                "api-key": API_KEY,
            },
            body: JSON.stringify(body),
        });

        const responseData = await response.json();

        if (!response.ok) {
            // Handle non-successful responses (4xx, 5xx)
            const errorMessage =
                responseData.error ||
                responseData.message ||
                "Unknown ONTON API error";
            logger.error(
                `ONTON API Error (Status: ${response.status}): ${errorMessage}`,
                { body }
            );
            throw new Error(errorMessage);
        }

        logger.info(
            `Successfully received reward link from ONTON for user ${userTelegramId}.`
        );
        return responseData; // This will be { status: 'success', data: { reward_link: '...' } }
    } catch (error) {
        logger.error("Failed to communicate with ONTON API:", error);
        // Re-throw the error to be caught by the calling function
        throw error;
    }
}

module.exports = {
    rewardUser,
};
