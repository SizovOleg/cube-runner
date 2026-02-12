#!/bin/bash
# Деплой Cube Runner на сервер
# Использование: ./server/deploy.sh

set -e

SERVER="root@188.120.229.244"
REMOTE_PATH="/var/www/games/cube-runner"

echo "🔨 Сборка проекта..."
npm run build

echo "📦 Загрузка на сервер..."
scp -r dist/* "$SERVER:$REMOTE_PATH/"

echo "✅ Деплой завершён!"
echo "🎮 http://188.120.229.244/games/cube-runner/"
