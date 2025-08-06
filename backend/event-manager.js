// backend/event-manager.js

require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('./logger'); // We use the existing logger

// --- CONFIGURATION ---
// Set the exact time for the task to run. '30 23 * * *' means 23:30 every day.
const SCHEDULE_TIME = '30 23 6 8 *'; 
// The name of your main API process in PM2 that needs to be restarted.
const PM2_PROCESS_TO_RESTART = 'math-game-api'; 
// The name of the log file for the reward script output.
const REWARD_LOG_FILE = 'rewards.log';

// --- HELPER FUNCTIONS ---

/**
 * Executes a shell command and logs its output.
 * @param {string} command The command to execute.
 * @returns {Promise<string>} A promise that resolves with the command's stdout.
 */
function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger.error(`Exec error for command "${command}": ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                logger.warn(`Exec stderr for command "${command}": ${stderr}`);
            }
            logger.info(`Exec stdout for command "${command}":\n${stdout}`);
            resolve(stdout);
        });
    });
}

/**
 * Finds and comments out the ONTON_EVENT_UUID in the .env file.
 */
function disableEventInEnv() {
    const envPath = path.resolve(__dirname, '.env');
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        const regex = /^(ONTON_EVENT_UUID=.*)/m; // Finds the line that starts with ONTON_EVENT_UUID

        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, '# $1'); // Adds a '#' to the beginning of the line
            fs.writeFileSync(envPath, envContent, 'utf8');
            logger.info('Successfully commented out ONTON_EVENT_UUID in .env file.');
        } else {
            logger.warn('ONTON_EVENT_UUID line not found or already commented out in .env file.');
        }
    } catch (error) {
        logger.error(`Failed to read or write .env file: ${error.message}`);
    }
}


// --- MAIN TASK ---

/**
 * The main function that orchestrates the end-of-event process.
 */
async function runEndOfEventTask() {
    logger.info('--- EOE TASK TRIGGERED --- Starting End of Event sequence.');

    const eventId = process.env.ONTON_EVENT_UUID;

    if (!eventId) {
        logger.info('EOE TASK: No active ONTON_EVENT_UUID found. Nothing to process. Exiting.');
        return;
    }

    try {
        // 1. Run the reward script and log its output
        logger.info(`EOE TASK 1/3: Running reward script for event ${eventId}...`);
        const rewardCommand = `node reward-top-players.js ${eventId} >> ${REWARD_LOG_FILE} 2>&1`;
        await runCommand(rewardCommand);
        logger.info(`EOE TASK 1/3: Reward script finished. Output saved to ${REWARD_LOG_FILE}.`);

        // 2. Comment out the UUID in the .env file
        logger.info('EOE TASK 2/3: Disabling event in .env file...');
        disableEventInEnv();
        logger.info('EOE TASK 2/3: Event disabled.');

        // 3. Restart the main PM2 process
        logger.info(`EOE TASK 3/3: Restarting PM2 process "${PM2_PROCESS_TO_RESTART}"...`);
        await runCommand(`pm2 restart ${PM2_PROCESS_TO_RESTART}`);
        logger.info(`EOE TASK 3/3: PM2 process restarted.`);

    } catch (error) {
        logger.error(`An error occurred during the End of Event task: ${error.message}`);
    }

    logger.info('--- EOE TASK FINISHED ---');
}


// --- SCHEDULER SETUP ---
// This schedules the task but only runs it if an event is active.
cron.schedule(SCHEDULE_TIME, () => {
    // We need to reload .env variables in case they changed
    require('dotenv').config({ override: true }); 
    
    if (process.env.ONTON_EVENT_UUID) {
        runEndOfEventTask();
    } else {
        logger.info(`Scheduler checked at ${new Date().toLocaleTimeString()}: No active event found.`);
    }
}, {
    scheduled: true,
    timezone: "Asia/Tehran" // Set your timezone
});

logger.info(`Event Manager started. Task is scheduled to run daily at ${SCHEDULE_TIME}.`);