export default function validateTelegramData(rawInitData, botToken) {
  try {
    // اعتبارسنجی داده‌ها
    validate(rawInitData, botToken);

    // استخراج پارامترها
    const initData = new URLSearchParams(rawInitData);
    
    // 1. استخراج رشته JSON کاربر
    const userJson = initData.get('user');
    if (!userJson) {
      throw new Error('User data not found in initData');
    }

    // 2. تبدیل به شیء
    const userData = JSON.parse(userJson);

    // 3. استخراج photo_url از شیء کاربر
    const photo_url = userData.photo_url;
    
    // 4. استخراج سایر فیلدها
    const {
      id,
      first_name,
      last_name = '',
      username = '',
      language_code = '',
      allows_write_to_pm: allows_write_to_pm
    } = userData;

    // 5. بازگرداندن تمام اطلاعات لازم
    return {
      id,
      first_name,
      last_name,
      username,
      language_code,
      allows_write_to_pm,
      photo_url // اینجا اضافه شد
    };
    
  } catch (error) {
    console.error('Telegram data validation failed:', error);
    throw new Error('Authentication failed: Invalid Telegram data');
  }
}