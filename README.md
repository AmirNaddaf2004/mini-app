<!-- RUN ON SERVER FROM GITHUB -->
<!-- ورود به هاست -->
root@DESKTOP-AGHA-MOSTAFA:~# ssh mostafa@65.109.186.25
<!-- دریافت اپدیت ها از گیتهاب -->
mostafa@ubuntu-4gb-hel1-4:~$ cd ../../var/www/mini-app/
mostafa@ubuntu-4gb-hel1-4:/var/www/mini-app$ git fetch origin
mostafa@ubuntu-4gb-hel1-4:/var/www/mini-app$ git pull
<!-- ساخت بیلد جدید فرانت -->
mostafa@ubuntu-4gb-hel1-4:/var/www/mini-app$ cd frontend && npm run build && cd ..
<!-- ریست کردن ران خودکار بک اند -->
mostafa@ubuntu-4gb-hel1-4:/var/www/mini-app$ pm2 restart mini-backend


<!-- LOCAL RUN -->
0: dont forget this:
D:\GitHub\mini-app\backend\.env :
PORT=10000
BOT_TOKEN= "SALAM"

T0:
PS D:\GitHub\mini-app\backend> npm install
PS D:\GitHub\mini-app\frontend> npm install
passwoed : https://whatismyipaddress.com/

T1:
PS D:\GitHub\mini-app\backend> node Server.js

T2:
PS D:\GitHub\mini-app> lt --port 10000 --subdomain math-backend --local-https false

T3:
PS D:\GitHub\mini-app\frontend>npm start

T4:
PS D:\GitHub\mini-app> lt --port 3000 --subdomain my-frontend --local-https false

BOT father:
Domain:
https://math-backend.loca.lt

Webapp URL:
https://my-frontend.loca.lt