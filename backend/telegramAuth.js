import { validate } from "@tma.js/init-data-node";

export default function validateTelegramData(rawInitData, bot_token) {
  const initData = new URLSearchParams(rawInitData);
  // const hash = parsedData.get('hash');
  // const authDate = parsedData.get('auth_date');
  const userJson = initData.get('user');

  try {
    validate(initData, bot_token);
    console.log(userJson);
    return userJson;
  } catch (error) {
    console.error(error);

    return {
      valid: false,
      userJson,
    };
  }
};
