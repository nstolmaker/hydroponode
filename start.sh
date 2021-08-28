#!/bin/sh

pm2 start "node -- app.js" --cron "*/5 * * * *" --restart-delay 300000
