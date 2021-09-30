#!/bin/sh

pm2 start "node -- app.js" --cron "1,6,11,16,21,26,31,36,41,46,51,56 * * * *" --restart-delay 300000
