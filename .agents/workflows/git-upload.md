---
description: Автоматическая публикация изменений игры на GitHub
---

# Автоматический деплой на GitHub

// turbo-all
1. Создаем папку для картинок
```bash
mkdir -Force .github/images
```

2. Копируем картинки
```bash
Copy-Item "C:\Users\User\.gemini\antigravity\brain\345e4ab3-5873-4dbd-8ed4-456dc9a5c93b*\*.png" -Destination ".github/images/" -ErrorAction SilentlyContinue
Copy-Item "C:\Users\User\.gemini\antigravity\brain\345e4ab3-5873-4dbd-8ed4-456dc9a5c93b*\*.webp" -Destination ".github/images/" -ErrorAction SilentlyContinue
```

3. Git add, commit, push
```bash
git add .
git commit -m "feat: complete level 1-5 redesign with new Geometry Dash mechanics"
git push
```
