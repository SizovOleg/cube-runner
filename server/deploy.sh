#!/bin/bash
# Деплой Cube Runner на сервер
# Использование: ./server/deploy.sh

set -e

SERVER="root@152.53.138.158"
REMOTE_PATH="/var/www/games/cube-runner"

echo "🔨 Сборка проекта..."
npm run build

echo "📦 Загрузка на сервер..."
scp -r dist/* "$SERVER:$REMOTE_PATH/"

echo "✅ Деплой завершён!"
echo "🎮 https://earthfrom.space/games/cube-runner/"
