// src/hooks/useTelegram.js
import { useState, useEffect } from 'react';

export function useTelegram() {
    const [tg, setTg] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // اطمینان حاصل می‌کنیم که شیء تلگرام در window موجود است
        if (window.Telegram && window.Telegram.WebApp) {
            setTg(window.Telegram.WebApp);
            setIsReady(true);
        }
    }, []);

    const platform = tg ? tg.platform : 'unknown';
    const isMobile = platform === 'android' || platform === 'ios';

    return {
        tg,        // آبجکت کامل WebApp برای دسترسی به سایر امکانات
        platform,  // نام پلتفرم (ios, android, tdesktop, و غیره)
        isMobile,  // یک مقدار boolean که مشخص می‌کند موبایل است یا نه
        isReady    // برای اینکه بدانیم API تلگرام آماده استفاده است
    };
}