#!/bin/sh

pm2 start "node -- app.js" --name reporter --cron "1,11,21,31,41,51 * * * *" --no-autorestart
