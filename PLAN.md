# План: Рефакторинг монолита → модульная архитектура

## Что уже готово (модули-скелеты)
- `engine/Input.ts` — полный, рабочий
- `engine/Physics.ts` — AABB, landing, gravity, stomp — полные
- `engine/Camera.ts` — следование + lock для босс-арены — полный
- `engine/GameLoop.ts` — requestAnimationFrame с fixed timestep — полный
- `engine/ParticleSystem.ts` — burst/bigBurst/update/draw — полный
- `engine/Renderer.ts` — базовый (clear, ground, stars) — нужно расширить
- `entities/Player.ts` — полный (HP, powerups, draw) — нужен мелкий фикс
- `entities/Enemy.ts` — полный (типы, патруль, draw)
- `entities/Boss.ts` — абстрактный базовый класс — полный
- `entities/bosses/Boss1_Guardian.ts` — полный (2 фазы, прыжки, шоковые волны)
- `levels/types.ts` — все типы — полный
- `levels/data/level1.ts` — данные уровня 1 — полный
- `levels/LevelManager.ts` — загрузка + прогресс — полный

## Что нужно создать

### 1. `src/entities/Bullet.ts` — Пули
- Интерфейс пули (x, y, vx, vy, width, height)
- Класс BulletManager: create, update, draw, removeOffscreen
- Пули игрока + пули врагов (отдельно)

### 2. `src/entities/Obstacle.ts` — Отрисовка препятствий
- drawSpike(), drawPlatform()
- Позже: движущиеся платформы (для level2)

### 3. `src/entities/Powerup.ts` — Powerup-объекты в мире
- Рисование на карте (bob-анимация, glow)
- Подбор при коллизии

### 4. `src/engine/GameWorld.ts` — Главный класс игрового мира (ЯДРО)
Связывает все модули вместе:
- Содержит: player, enemies[], camera, particles, bullets, obstacles, powerups, boss
- `init(levelData)` — создаёт все объекты из данных уровня
- `update(input)` — основной тик:
  - Движение игрока (физика, прыжок, стрельба)
  - Движение камеры
  - Обновление врагов
  - Коллизии (пули-враги, игрок-враги, игрок-шипы, игрок-платформы, игрок-powerups)
  - Проверка входа в босс-арену (levelLength)
  - Обновление босса + коллизии
  - Частицы
- `draw(renderer)` — отрисовка всех слоёв

### 5. `src/ui/GameCanvas.tsx` — React-компонент игры
- Монтирует <canvas>, создаёт GameWorld, запускает GameLoop
- Передаёт Input в GameWorld
- Touch-кнопки (GUN, powerup слоты)
- HUD (score, kills, HP)
- Обработка смерти, победы, паузы → callback в App

### 6. Обновить `src/App.tsx`
- Убрать заглушку "В разработке"
- Подключить GameCanvas для screen==='playing'
- Добавить экраны: bossIntro, levelComplete, dead
- Навигация: меню → выбор уровня → игра → босс → победа → меню

### 7. `src/ui/HUD.ts` — Отрисовка интерфейса на canvas
- Score, Kills, HP-бар игрока
- Powerup-слоты (визуально на canvas)
- Boss HP бар (уже в Boss.ts)

## Порядок реализации (файлы)
1. `src/entities/Bullet.ts`
2. `src/entities/Obstacle.ts`
3. `src/entities/Powerup.ts`
4. `src/ui/HUD.ts`
5. `src/engine/GameWorld.ts` (основная логика)
6. `src/ui/GameCanvas.tsx` (React-обёртка)
7. Обновить `src/App.tsx`

## Ключевые решения
- Авто-скролл камеры (как в монолите) — игрок бежит вправо автоматически
- Скорость растёт по мере прохождения
- При camera.x >= level.length → вход в босс-арену → camera.lock()
- 3 HP у игрока, мерцание при invincible
- Бомба создаёт снаряд (вперёд + вверх), ракетный режим (полёт)
- Неоновый стиль: shadowBlur для всех объектов
- Touch: тап по canvas = прыжок, кнопка GUN = стрельба
