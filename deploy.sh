#!/bin/bash

VERSION=$(date +%Y%m%d%H%M)
TODAY=$(date +%Y-%m-%d)

# Обновляем version.js
sed -i "s/window.APP_VERSION = .*/window.APP_VERSION = '$VERSION';/" /var/www/rospechat/version.js
sed -i "s/window.LAST_UPDATE = .*/window.LAST_UPDATE = '$TODAY';/" /var/www/rospechat/version.js

# Обновляем ?v=... во всех HTML файлах (корень + blocks/ и все подпапки)
find /var/www/rospechat -name "*.html" | xargs sed -i "s/?v=[0-9A-Za-z.]*/?v=$VERSION/g"

# Обновляем версию кэша Service Worker
sed -i "s/vkachalke-v[0-9A-Za-z]*/vkachalke-$VERSION/g" /var/www/rospechat/sw.js

# Перезапускаем сервер
pm2 restart rospechat

echo "✅ Готово! Версия: $VERSION"