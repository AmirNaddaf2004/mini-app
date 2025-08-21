// src/components/DeviceDetector.js
import React from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram'; // هوک خود را ایمپورت کنید

// کامپوننت برای نمایش پیام هشدار
const DesktopWarning = () => (
    <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md mx-auto bg-gray-800 bg-opacity-90 rounded-xl shadow-lg p-8 text-white text-center"
    >
        <div className="text-5xl mb-4">🖥️ → 📱</div>
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">
            Mobile Device Required
        </h1>
        <p className="text-gray-300">
            For a fair and secure gaming experience, this app can only be played on a mobile device.
        </p>
        <p className="text-gray-400 text-sm mt-4">
            Please open the bot on your phone to play.
        </p>
    </motion.div>
);

export default function DeviceDetector({ children }) {
    const { isMobile, isReady } = useTelegram();

    // تا زمانی که API تلگرام آماده نشده، چیزی نمایش نده (یا یک لودر نشان بده)
    // این کار از نمایش ناگهانی پیام خطا جلوگیری می‌کند
    if (!isReady) {
        return null; // یا <LoadingSpinner />;
    }

    // اگر پلتفرم موبایل بود، محتوای اصلی برنامه را نمایش بده
    if (isMobile) {
        return <>{children}</>;
    }

    // در غیر این صورت، پیام هشدار را نمایش بده
    return <DesktopWarning />;
}