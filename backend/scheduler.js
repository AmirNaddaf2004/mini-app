// backend/scheduler.js

const cron = require('node-cron');
const logger = require('./logger');
const { findAndRewardTopPlayers } = require('./reward-top-players');

logger.info('Scheduler initialized. Waiting for scheduled tasks.');

// مثال: اجرای اسکریپت در ساعت ۲۳:۵۹ روز ۱۸ جولای ۲۰۲۵
// برای تنظیم زمان رویداد خودتان، این رشته را تغییر دهید
// فرمت: 'دقیقه ساعت روز ماه روز-هفته'
const EVENT_END_TIME = '59 23 18 7 *'; // 23:59 on July 18th. The star means any day of the week.

cron.schedule(EVENT_END_TIME, () => {
    logger.info(`Scheduled task triggered at ${new Date()}. Running findAndRewardTopPlayers...`);
    findAndRewardTopPlayers();
}, {
    scheduled: true,
    timezone: "Asia/Tehran" // منطقه زمانی خود را تنظیم کنید
});

logger.info(`Task scheduled to run at: ${EVENT_END_TIME} (Timezone: Asia/Tehran)`);