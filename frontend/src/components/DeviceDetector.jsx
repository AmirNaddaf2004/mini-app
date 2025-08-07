import React from 'react';
import { motion } from 'framer-motion';

// This function now uses a more robust method to check for mobile devices.
// It prioritizes checking for touch capabilities, which are very difficult to fake.
const isMobileDevice = () => {
    const hasTouchEvents = 'ontouchstart' in window;
    const hasTouchPoints = navigator.maxTouchPoints > 0;
    
    // The User-Agent check is kept as a fallback.
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return hasTouchEvents || hasTouchPoints || isMobileUserAgent;
};

// This component acts as a "guard".
export default function DeviceDetector({ children }) {

    if (isMobileDevice()) {
        // If the check passes, render the actual game.
        return <>{children}</>;
    }

    // If the check fails, render this warning screen.
    return (
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
}