#!/bin/sh

pm2 start app.js --cron "*/5 * * * *" --restart-delay 300000
