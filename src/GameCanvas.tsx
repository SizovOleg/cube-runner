import { useState, useRef, useEffect, useCallback } from 'react';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, COLORS,
  BASE_SPEED, MAX_SPEED_BONUS, ENTITY_SIZE,
  BULLET_SPEED, SHOOT_COOLDOWN, JUMP_FORCE,
  POWERUP_COLORS, POWERUP_LABELS, PowerupType,
  LEVEL_BOSS_ARENA_WIDTH, BOSS_INTRO_DURATION,
  COIN_RADIUS, COIN_COLOR, COIN_GLOW,
  SKIN_COLORS,
} from '@utils/constants';
import { primaryBtnStyle, neonBtnStyle } from '@ui/styles';
import { Player } from '@entities/Player';
import { Enemy } from '@entities/Enemy';
import { Powerup } from '@entities/Powerup';
import { BossGuardian } from '@entities/bosses/Boss1_Guardian';
import { BossCrusher } from '@entities/bosses/Boss2_Crusher';
import { BossFrostKing } from '@entities/bosses/Boss3_FrostKing';
import { BossInferno } from '@entities/bosses/Boss4_Inferno';
import { BossCore } from '@entities/bosses/Boss5_Core';
import { Boss } from '@entities/Boss';
import { Camera } from '@engine/Camera';
import { Input } from '@engine/Input';
import { ParticleSystem } from '@engine/ParticleSystem';
import { applyGravity, clampToGround, landingCollision, aabbCollision, stompCheck } from '@engine/Physics';
import { drawObstacles, drawBullets, drawBombs, drawFallingBlocks, drawPendulums, drawArenaWalls } from '@engine/Renderer';
import { drawHUD, drawBossIntro, drawBossDefeated } from '@engine/HUDRenderer';
import { audio } from '@engine/AudioManager';
import level1 from '@levels/data/level1';
import level2 from '@levels/data/level2';
import level3 from '@levels/data/level3';
import level4 from '@levels/data/level4';
import level5 from '@levels/data/level5';
import { LevelData, ObstacleData } from '@levels/types';
import { saveLevelComplete, unlockSkin, getCurrentSkinColor, saveCoinsImmediate, consumeActiveUpgrades } from '@utils/storage';
import { corridorSpikesOnTop, getCorridorGap, drawCorridor } from '@engine/CorridorRenderer';
import { Spark, BinaryDrop, createRainDrops, createSnowflakes, createSparks, createBinaryDrops, drawAtmosphere, drawGroundTexture } from '@engine/BackgroundRenderer';
import { requestFullscreen } from './ScaledContainer';
import {
  Star, Bullet, EnemyBullet, BombProjectile,
  DeathInfo, LevelCompleteInfo, LiveCoin,
  MovingObstacle, FallingBlock, Pendulum, BossPhase,
} from '@game-types/GameTypes';
import {
  createStars, createEnemies, createPowerups, createCages,
  createMovingPlatforms, createFallingBlocks, createPendulums, createLiveCoins,
} from '@game/LevelFactory';

const LEVELS: Record<number, LevelData> = { 1: level1, 2: level2, 3: level3, 4: level4, 5: level5 };
const TOTAL_LEVELS = 5;
const LEVEL_INFO = [
  { id: 1, name: 'Neon City' },
  { id: 2, name: 'Cyber Sewer' },
  { id: 3, name: 'Ice Citadel' },
  { id: 4, name: 'Volcanic Forge' },
  { id: 5, name: 'Digital Core' },
];

// --- GameCanvas ---

interface GameCanvasProps {
  levelId: number;
  onBack: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
}

export function GameCanvas({ levelId, onBack, onRestart, onNextLevel }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>(createStars(50));
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const inputRef = useRef<Input | null>(null);
  const [death, setDeath] = useState<DeathInfo | null>(null);
  const [levelComplete, setLevelComplete] = useState<LevelCompleteInfo | null>(null);
  const [inventoryDisplay, setInventoryDisplay] = useState<(PowerupType | null)[]>([null, null, null]);

  useEffect(() => {
    if (death || levelComplete) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const input = new Input();
    input.attach();
    inputRef.current = input;

    const levelData = LEVELS[levelId] ?? level1;
    const skinColor = getCurrentSkinColor();
    // Применяем активные апгрейды
    const activeUpgrades = consumeActiveUpgrades();
    const hasArmor = activeUpgrades.includes('armor');
    const baseHP = 3 + (hasArmor ? 2 : 0);
    const player = new Player(100, baseHP, skinColor);
    if (activeUpgrades.includes('double_jump')) player.hasDoubleJump = true;
    if (activeUpgrades.includes('magnet')) player.magnetTimer = 30 * 60; // 30 сек
    if (activeUpgrades.includes('super_bullet')) player.superBulletTimer = 20 * 60; // 20 сек
    const camera = new Camera();
    const particles = new ParticleSystem();
    const obstacles = levelData.obstacles;
    const enemies = createEnemies(levelData);
    const powerups = createPowerups(levelData);
    const movingPlatforms = createMovingPlatforms(levelData);
    const fallingBlocks = createFallingBlocks(levelData);
    const pendulums = createPendulums(levelData);
    const cages = createCages(levelData);
    // Монеты уровня
    const levelCoins = createLiveCoins(levelData);
    let coinsCollected = 0;
    const bullets: Bullet[] = [];
    const enemyBullets: EnemyBullet[] = [];
    const bombs: BombProjectile[] = [];
    const stars = starsRef.current;
    const rainDrops = levelId === 2 ? createRainDrops(30) : [];
    const snowflakes = levelId === 3 ? createSnowflakes(40) : [];
    const sparks = levelId === 4 ? createSparks(35) : [];
    const binaryDrops = levelId === 5 ? createBinaryDrops(40) : [];
    let displayScore = 0; // Анимированный score для HUD

    // Цвета уровня
    const bgColor = levelData.backgroundColor ?? COLORS.bg;
    const groundColor = levelData.groundColor ?? COLORS.ground;
    const groundLineColor = levelId === 5 ? '#0044ff' : levelId === 4 ? '#ff4400' : levelId === 3 ? '#4466cc' : levelData.groundColor ? '#33aa44' : COLORS.groundLine;

    // Кешированные градиенты (создаются один раз)
    const bgGradCache = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradCache.addColorStop(0, bgColor + 'cc');
    bgGradCache.addColorStop(0.6, bgColor);
    bgGradCache.addColorStop(1, '#000000');
    const groundGradCache = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    groundGradCache.addColorStop(0, groundColor + 'ff');
    groundGradCache.addColorStop(1, '#000000');

    // Босс
    const arenaX = levelData.length;
    let boss: Boss | null = null;
    let bossPhase: BossPhase = 'none';
    let bossIntroTimer = 0;
    let bossDefeatTimer = 0;

    let kills = 0;
    let muzzleFlash = 0;
    let running = true;
    let invUpdateTick = 0;

    // Ракетный коридор
    const corridor = levelData.rocketCorridor;
    let corridorMode = false;

    const loop = () => {
      if (!running) return;
      frameRef.current++;
      const frame = frameRef.current;
      const inp = input.getState();

      // --- UPDATE ---

      const speed = BASE_SPEED + Math.min(camera.x / 6000, MAX_SPEED_BONUS);

      // === BOSS PHASE: defeated (пауза 1 сек перед Level Complete) ===
      if (bossPhase === 'defeated') {
        bossDefeatTimer++;
        particles.update();
        camera.update(player.x);
        // Render и return
        renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, fallingBlocks, pendulums, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgGradCache, groundGradCache, groundLineColor, levelCoins, coinsCollected, sparks, binaryDrops);
        rafRef.current = requestAnimationFrame(loop);
        if (bossDefeatTimer >= 60) {
          const finalScore = Math.floor(camera.x / 10);
          saveLevelComplete(levelId, finalScore, kills);
          // монеты уже сохранены через saveCoinsImmediate при сборе каждой монеты
          setLevelComplete({ score: finalScore, kills, coinsCollected });
        }
        return;
      }

      // === BOSS PHASE: intro (заставка 2 сек) ===
      if (bossPhase === 'intro') {
        bossIntroTimer++;
        particles.update();
        if (bossIntroTimer >= BOSS_INTRO_DURATION) {
          bossPhase = 'fight';
          if (boss) boss.introPlaying = false;
        }
        renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, fallingBlocks, pendulums, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgGradCache, groundGradCache, groundLineColor, levelCoins, coinsCollected, sparks, binaryDrops);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // === Проверка входа в босс-арену ===
      if (bossPhase === 'none' && player.x >= arenaX) {
        bossPhase = 'intro';
        bossIntroTimer = 0;
        audio.bossIntro();
        camera.lock(arenaX - CANVAS_WIDTH * 0.1);
        // Создание босса в зависимости от уровня
        if (levelId === 5) {
          boss = new BossCore(arenaX);
        } else if (levelId === 4) {
          boss = new BossInferno(arenaX);
        } else if (levelId === 3) {
          boss = new BossFrostKing(arenaX);
        } else if (levelId === 2) {
          boss = new BossCrusher(arenaX);
        } else {
          boss = new BossGuardian(arenaX);
        }
        // Остановить авто-движение, поставить игрока в начало арены
        player.x = arenaX + 50;
      }

      // === Определение ракетного коридора ===
      if (corridor && bossPhase === 'none') {
        const wasInCorridor = corridorMode;
        corridorMode = player.x >= corridor.startX && player.x < corridor.endX;
        player.corridorMode = corridorMode;
        if (!wasInCorridor && corridorMode) {
          // Вход в коридор — подъём
          player.vy = -2;
          player.onGround = false;
          audio.corridorEnter();
        }
        if (wasInCorridor && !corridorMode && player.x >= corridor.endX) {
          // Выход из коридора — приземление
          player.y = GROUND_Y - player.height;
          player.vy = 0;
          player.onGround = true;
          player.corridorMode = false;
        }
      }

      // === Режим ракеты / коридора ===
      if (player.isRocketMode() || corridorMode) {
        player.x += speed * 1.5;
        if (inp.jump) {
          player.vy = -4;
        } else {
          player.vy += 0.2;
        }
        player.y += player.vy;
        if (player.y < 5) player.y = 5;
        if (player.y > GROUND_Y - player.height) {
          player.y = GROUND_Y - player.height;
          player.vy = 0;
        }
        // Стрельба отключена в коридоре
        if (!corridorMode && inp.shoot) {
          bullets.push({
            x: player.x + ENTITY_SIZE + 5,
            y: player.y + ENTITY_SIZE / 2 - 3,
            width: 12,
            height: 6,
          });
          muzzleFlash = 4;
        }
      } else {
        // Авто-движение (только если не в босс-бою)
        if (bossPhase !== 'fight') {
          player.x += speed;
        } else {
          // В арене: ручное управление влево/вправо
          const ARENA_SPEED = 4;
          if (inp.moveLeft) player.x -= ARENA_SPEED;
          if (inp.moveRight) player.x += ARENA_SPEED;
        }

        if (inp.jump && player.onGround) {
          player.jump();
          audio.jump();
        } else if (inp.jump && !player.onGround && player.hasDoubleJump && player.doubleJumpAvailable) {
          player.doubleJump();
          audio.doubleJump();
        } else if (inp.jump && !player.onGround) {
          player.fly();
        }

        applyGravity(player);
        const wasInAir = !player.onGround;

        // Платформы (статические)
        for (const obs of obstacles) {
          if (obs.type !== 'platform') continue;
          if (landingCollision(player, obs)) {
            player.y = obs.y - player.height;
            player.vy = 0;
            player.onGround = true;
          }
        }

        // Движущиеся платформы: обновление позиции и коллизия
        for (const mp of movingPlatforms) {
          if (mp.moveAxis === 'y') {
            mp.y += mp.moveSpeed * mp.dir;
            if (Math.abs(mp.y - mp.baseY) >= mp.moveRange) mp.dir *= -1;
          } else {
            mp.x += mp.moveSpeed * mp.dir;
            if (Math.abs(mp.x - mp.baseX) >= mp.moveRange) mp.dir *= -1;
          }
          if (landingCollision(player, mp)) {
            player.y = mp.y - player.height;
            player.vy = 0;
            player.onGround = true;
          }
        }

        if (clampToGround(player)) {
          player.onGround = true;
        }
        // Squash-stretch при приземлении
        if (wasInAir && player.onGround) {
          player.triggerLanding();
        }
        if (player.y < 5) player.y = 5;

        if (inp.shoot && player.shootCooldown <= 0) {
          bullets.push({
            x: player.x + ENTITY_SIZE + 5,
            y: player.y + ENTITY_SIZE / 2 - 3,
            width: 12,
            height: 6,
          });
          player.shootCooldown = SHOOT_COOLDOWN;
          muzzleFlash = 6;
          audio.shoot();
        }
      }

      // Арена: ограничение игрока стенами
      if (bossPhase === 'fight') {
        if (player.x < arenaX + 5) player.x = arenaX + 5;
        if (player.x + player.width > arenaX + LEVEL_BOSS_ARENA_WIDTH - 5) {
          player.x = arenaX + LEVEL_BOSS_ARENA_WIDTH - 5 - player.width;
        }
      }

      // Обновление пуль
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x += BULLET_SPEED;
        if (bullets[i].x > camera.x + CANVAS_WIDTH + 100) {
          bullets.splice(i, 1);
        }
      }

      if (muzzleFlash > 0) muzzleFlash--;

      // Обновление бомб
      for (let bi = bombs.length - 1; bi >= 0; bi--) {
        const bomb = bombs[bi];
        bomb.x += bomb.vx;
        bomb.y += bomb.vy;
        bomb.vy += 0.3;
        if (bomb.y + bomb.height >= GROUND_Y) {
          const bombScreenX = camera.worldToScreen(bomb.x);
          particles.bigBurst(bombScreenX + bomb.width / 2, GROUND_Y - 10);
          audio.explosion();
          for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dist = Math.abs((enemy.x + ENTITY_SIZE / 2) - (bomb.x + bomb.width / 2));
            if (dist < 120) {
              enemy.takeDamage(10);
              kills++;
              const ex = camera.worldToScreen(enemy.x);
              particles.burst(ex + ENTITY_SIZE / 2, enemy.y + ENTITY_SIZE / 2, COLORS.enemy, 12);
            }
          }
          // Бомба урон боссу
          if (boss && boss.alive) {
            const dist = Math.abs((boss.x + boss.width / 2) - (bomb.x + bomb.width / 2));
            if (dist < 120) {
              boss.takeDamage(3);
              particles.burst(camera.worldToScreen(boss.x + boss.width / 2), boss.y + boss.height / 2, '#ff4400', 15);
            }
          }
          bombs.splice(bi, 1);
        }
      }

      // Активация powerup
      const pwSlot = input.consumePowerup();
      if (pwSlot !== null) {
        const activated = player.usePowerup(pwSlot);
        if (activated === 'bomb') {
          bombs.push({
            x: player.x + ENTITY_SIZE,
            y: player.y,
            vx: 6,
            vy: -7,
            width: 16,
            height: 16,
          });
        }
      }

      // Сбор powerups
      for (const pw of powerups) {
        if (pw.collected) continue;
        pw.update(frame);
        const pwHitbox = { x: pw.x, y: pw.y, width: pw.width, height: pw.height };
        if (aabbCollision(player, pwHitbox)) {
          if (player.collectPowerup(pw.type)) {
            pw.collected = true;
            const sx = camera.worldToScreen(pw.x);
            particles.burst(sx + pw.width / 2, pw.y + pw.height / 2, POWERUP_COLORS[pw.type], 10);
            audio.powerup();
          }
        }
      }

      // Магнит: притягивает монеты и powerups
      if (player.isMagnetActive()) {
        const MAGNET_RANGE = 150;
        for (const coin of levelCoins) {
          if (coin.collected) continue;
          const dx = coin.x - (player.x + player.width / 2);
          const dy = coin.y - (player.y + player.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAGNET_RANGE && dist > 1) {
            coin.x -= (dx / dist) * 5;
            coin.y -= (dy / dist) * 5;
          }
        }
        for (const pw of powerups) {
          if (pw.collected) continue;
          const dx = pw.x - (player.x + player.width / 2);
          const dy = pw.y - (player.y + player.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAGNET_RANGE && dist > 1) {
            pw.x -= (dx / dist) * 4;
            pw.y -= (dy / dist) * 4;
          }
        }
      }

      // Сбор монет уровня
      for (const coin of levelCoins) {
        if (coin.collected) continue;
        const cx = player.x, cy = player.y;
        const coinCx = coin.x, coinCy = coin.y;
        if (Math.abs(cx + player.width / 2 - coinCx) < player.width / 2 + COIN_RADIUS &&
            Math.abs(cy + player.height / 2 - coinCy) < player.height / 2 + COIN_RADIUS) {
          coin.collected = true;
          coinsCollected++;
          saveCoinsImmediate(3);
          const sx = camera.worldToScreen(coin.x);
          particles.burst(sx, coin.y, COIN_COLOR, 8);
          audio.coin();
        }
      }

      // Клетки со скинами
      for (const cage of cages) {
        if (cage.collected) continue;
        const cageHitbox = { x: cage.x, y: cage.y, width: cage.width, height: cage.height };
        // Разбить клетку: прыжок сверху (как stomp)
        if (aabbCollision(player, cageHitbox) && player.vy > 0 && player.y + player.height - player.vy <= cage.y + 10) {
          cage.collected = true;
          unlockSkin(cage.skinId);
          player.vy = JUMP_FORCE * 0.6; // Отскок
          const sx = camera.worldToScreen(cage.x);
          particles.burst(sx + cage.width / 2, cage.y + cage.height / 2, SKIN_COLORS[cage.skinId], 20);
        }
      }

      // === Падающие блоки: обновление ===
      for (const fb of fallingBlocks) {
        if (fb.state === 'idle') {
          // Игрок под блоком?
          const playerCenterX = player.x + player.width / 2;
          if (playerCenterX >= fb.x && playerCenterX <= fb.x + fb.width &&
              player.y + player.height <= fb.y + fb.height &&
              player.y + player.height >= fb.y - 150) {
            fb.state = 'warning';
            fb.warningTimer = 30; // 0.5 сек при 60fps
          }
        } else if (fb.state === 'warning') {
          fb.warningTimer--;
          if (fb.warningTimer <= 0) {
            fb.state = 'falling';
            fb.vy = 0;
          }
        } else if (fb.state === 'falling') {
          fb.vy += 0.6; // гравитация
          fb.y += fb.vy;
          if (fb.y + fb.height >= GROUND_Y) {
            fb.y = GROUND_Y - fb.height;
            fb.state = 'landed';
            fb.vy = 0;
            // Частицы пыли — пока просто состояние
          }
          // Игрок под падающим блоком
          if (aabbCollision(player, fb) && !player.isRocketMode() && !corridorMode) {
            const died = player.takeDamage(1);
            if (died) {
              particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
              setDeath({ score: Math.floor(camera.x / 10), kills });
              return;
            }
          }
        } else if (fb.state === 'landed') {
          // Блок лежит как платформа — обрабатываем коллизию как platformlike
          const playerBottom = player.y + player.height;
          const prevBottom = playerBottom - player.vy;
          if (
            player.x + player.width > fb.x &&
            player.x < fb.x + fb.width &&
            prevBottom <= fb.y + 4 &&
            playerBottom >= fb.y
          ) {
            player.y = fb.y - player.height;
            player.vy = 0;
            if (!player.onGround) player.triggerLanding();
            player.onGround = true;
          }
        }
      }

      // === Маятники: обновление и коллизия ===
      for (const p of pendulums) {
        const angle = Math.sin(frame * p.speed + p.phase) * p.amplitude;
        p.ballX = p.x + Math.sin(angle) * p.length;
        p.ballY = p.y + Math.cos(angle) * p.length;
        // Коллизия: шар задел игрока?
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;
        const distToBall = Math.sqrt((pCenterX - p.ballX) ** 2 + (pCenterY - p.ballY) ** 2);
        if (distToBall < p.ballRadius + player.width / 2 && !player.isRocketMode() && !corridorMode) {
          const died = player.takeDamage(1);
          if (died) {
            particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
            setDeath({ score: Math.floor(camera.x / 10), kills });
            return;
          }
        }
      }

      // Враги
      for (const enemy of enemies) {
        enemy.update(player.x);
        // Шутеры: создание вражеских пуль
        if (enemy.alive && enemy.shouldShoot()) {
          const dx = player.x - enemy.x;
          enemyBullets.push({
            x: enemy.x + (dx > 0 ? ENTITY_SIZE : -8),
            y: enemy.y + ENTITY_SIZE / 2 - 3,
            vx: dx > 0 ? 4 : -4,
            width: 10,
            height: 6,
          });
        }
      }

      // Обновление вражеских пуль
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].x += enemyBullets[i].vx;
        if (enemyBullets[i].x < camera.x - 100 || enemyBullets[i].x > camera.x + CANVAS_WIDTH + 100) {
          enemyBullets.splice(i, 1);
          continue;
        }
        // Попадание вражеской пули в игрока
        if (aabbCollision(player, enemyBullets[i])) {
          enemyBullets.splice(i, 1);
          if (!player.isRocketMode() && !corridorMode) {
            const died = player.takeDamage(1);
            if (died) {
              particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
              setDeath({ score: Math.floor(camera.x / 10), kills });
              return;
            }
          }
        }
      }

      // Пули → враги
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        let hitAny = false;
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (aabbCollision(b, enemy)) {
            enemy.takeDamage(1);
            kills++;
            const ex = camera.worldToScreen(enemy.x);
            particles.burst(ex + ENTITY_SIZE / 2, enemy.y + ENTITY_SIZE / 2, COLORS.enemy, 12);
            audio.enemyDie();
            hitAny = true;
            if (!player.isSuperBullet()) break; // обычная пуля: стоп после 1 врага
          }
        }
        if (hitAny && !player.isSuperBullet()) {
          bullets.splice(bi, 1);
        }
      }

      // Пули → босс
      if (boss && boss.alive && bossPhase === 'fight') {
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
          const b = bullets[bi];
          if (aabbCollision(b, boss)) {
            const killed = boss.takeDamage(1);
            particles.burst(camera.worldToScreen(boss.x + boss.width / 2), boss.y + boss.height / 2, '#ff4400', 8);
            bullets.splice(bi, 1);
            if (killed) {
              bossPhase = 'defeated';
              bossDefeatTimer = 0;
              audio.bossDefeated();
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2), boss.y + boss.height / 2);
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2) + 20, boss.y + 10);
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2) - 20, boss.y + 30);
            }
            break;
          }
        }
      }

      // Стомп на босса
      if (boss && boss.alive && bossPhase === 'fight') {
        if (aabbCollision(player, boss)) {
          if (stompCheck(player, boss)) {
            const killed = boss.takeDamage(2);
            player.vy = JUMP_FORCE * 0.7;
            player.onGround = false;
            particles.burst(camera.worldToScreen(boss.x + boss.width / 2), boss.y, '#ff4400', 10);
            if (killed) {
              bossPhase = 'defeated';
              bossDefeatTimer = 0;
              audio.bossDefeated();
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2), boss.y + boss.height / 2);
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2) + 20, boss.y + 10);
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2) - 20, boss.y + 30);
            }
          } else {
            // Боковое столкновение с боссом
            const died = player.takeDamage(1);
            if (died) {
              audio.playerDie();
              particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
              setDeath({ score: Math.floor(camera.x / 10), kills });
              return;
            }
            audio.playerHit();
          }
        }
      }

      // Снаряды и ударные волны босса → игрок
      if (boss && boss.alive && bossPhase === 'fight') {
        // Снаряды босса
        for (const proj of boss.getProjectiles()) {
          if (aabbCollision(player, proj)) {
            const died = player.takeDamage(proj.damage);
            if (died) {
              particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
              setDeath({ score: Math.floor(camera.x / 10), kills });
              return;
            }
          }
        }
        // Ударные волны босса
        for (const sw of boss.getShockwaves()) {
          const playerCenterX = player.x + player.width / 2;
          const distToCenter = Math.abs(playerCenterX - sw.x);
          // Волна на уровне земли: проверяем если игрок стоит на земле и в радиусе волны
          if (player.y + player.height >= GROUND_Y - 5 && distToCenter <= sw.radius + 15 && distToCenter >= sw.radius - 15) {
            const died = player.takeDamage(1);
            if (died) {
              particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
              setDeath({ score: Math.floor(camera.x / 10), kills });
              return;
            }
          }
        }
        // Ледяные столбы Frost King
        if ('getIcePillars' in boss) {
          for (const pillar of (boss as BossFrostKing).getIcePillars()) {
            if (aabbCollision(player, pillar)) {
              const died = player.takeDamage(pillar.damage);
              if (died) {
                particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, '#88ddff', 15);
                setDeath({ score: Math.floor(camera.x / 10), kills });
                return;
              }
            }
          }
        }
      }

      // Босс обновление
      if (boss && boss.alive && bossPhase === 'fight') {
        boss.update(player.x, player.y);
      }

      // Игрок → враги
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (!aabbCollision(player, enemy)) continue;
        const ex = camera.worldToScreen(enemy.x);
        if (player.isRocketMode() || corridorMode) {
          enemy.takeDamage(10);
          kills++;
          particles.burst(ex + ENTITY_SIZE / 2, enemy.y + ENTITY_SIZE / 2, COLORS.rocket, 15);
        } else if (stompCheck(player, enemy)) {
          enemy.takeDamage(1);
          kills++;
          player.vy = JUMP_FORCE * 0.7;
          player.onGround = false;
          particles.burst(ex + ENTITY_SIZE / 2, enemy.y + ENTITY_SIZE / 2, COLORS.enemy, 12);
        } else {
          const died = player.takeDamage(1);
          if (died) {
            audio.playerDie();
            particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
            setDeath({ score: Math.floor(camera.x / 10), kills });
            return;
          }
          audio.playerHit();
        }
      }

      // Шипы (пропускаются в режиме ракеты и коридора)
      if (!player.isRocketMode() && !corridorMode) {
        for (const obs of obstacles) {
          if (obs.type !== 'spike') continue;
          const spikeHitbox = { x: obs.x + 5, y: obs.y + 5, width: obs.width - 10, height: obs.height - 5 };
          if (aabbCollision(player, spikeHitbox)) {
            const died = player.takeDamage(1);
            if (died) {
              particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, COLORS.spike, 15);
              setDeath({ score: Math.floor(camera.x / 10), kills });
              return;
            }
          }
        }
      }

      // Коллизия с шипами коридора (процедурные)
      if (corridorMode && corridor) {
        const playerCX = player.x + player.width / 2;
        const { center: gapCenter, size: gapSize } = getCorridorGap(playerCX, frame, corridor);
        const ceilingBottom = gapCenter - gapSize / 2;
        const floorTop = gapCenter + gapSize / 2;

        const dieInCorridor = () => {
          particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, COLORS.spike, 15);
          setDeath({ score: Math.floor(camera.x / 10), kills });
        };

        // Шипы только с одной стороны сегмента — урон только от той стены где шипы
        const spikesOnTop = corridorSpikesOnTop(playerCX);
        if (player.y < ceilingBottom) {
          if (spikesOnTop) {
            if (player.takeDamage(1)) { dieInCorridor(); return; }
          }
          player.y = ceilingBottom;
          player.vy = 1;
        }
        if (player.y + player.height > floorTop) {
          if (!spikesOnTop) {
            if (player.takeDamage(1)) { dieInCorridor(); return; }
          }
          player.y = floorTop - player.height;
          player.vy = -1;
        }

        // Коллизия с движущимися шипами
        if (corridor.movingSpikes) {
          for (const ms of corridor.movingSpikes) {
            const spikeWX = corridor.startX + ms.offsetX;
            if (Math.abs(playerCX - spikeWX) > 40) continue;
            const spikeY = gapCenter + Math.sin(frame * ms.speed + ms.phase) * ms.amplitude;
            const SPIKE_R = 18;
            const px = player.x, py = player.y, pw = player.width, ph = player.height;
            if (px < spikeWX + SPIKE_R && px + pw > spikeWX - SPIKE_R &&
                py < spikeY + SPIKE_R && py + ph > spikeY - SPIKE_R) {
              if (player.takeDamage(1)) { dieInCorridor(); return; }
            }
          }
        }

        // Коллизия с вращающимися блоками
        if (corridor.rotatingBlocks) {
          for (const rb of corridor.rotatingBlocks) {
            const blockWX = corridor.startX + rb.offsetX;
            if (Math.abs(playerCX - blockWX) > rb.size + player.width) continue;
            const { center: bGapCenter, size: bGapSize } = getCorridorGap(blockWX, frame, corridor);
            const blockY = bGapCenter + rb.gapOffset * (bGapSize / 2 - rb.size);
            const half = rb.size / 2 + 4; // небольшой буфер
            const px = player.x, py = player.y, pw = player.width, ph = player.height;
            if (px < blockWX + half && px + pw > blockWX - half &&
                py < blockY + half && py + ph > blockY - half) {
              if (player.takeDamage(1)) { dieInCorridor(); return; }
            }
          }
        }

        // Сбор монет в коридоре
        if (corridor.coins) {
          for (let ci = corridor.coins.length - 1; ci >= 0; ci--) {
            const coin = corridor.coins[ci];
            const coinWX = corridor.startX + coin.offsetX;
            if (Math.abs(playerCX - coinWX) > 30) continue;
            const { center: cGapCenter, size: cGapSize } = getCorridorGap(coinWX, frame, corridor);
            const coinY = cGapCenter + coin.gapOffset * (cGapSize / 2 - 12);
            const py = player.y + player.height / 2;
            if (Math.abs(py - coinY) < 20) {
              corridor.coins.splice(ci, 1);
              coinsCollected++;
              saveCoinsImmediate(3);
              particles.burst(camera.worldToScreen(coinWX), coinY, COIN_COLOR, 8);
            }
          }
        }
      }

      player.rotation += speed * 2;
      player.update();
      // Заморозить rocketTimer в коридоре
      if (corridorMode && player.rocketTimer > 0) player.rocketTimer++;
      camera.update(player.x);
      particles.update();

      invUpdateTick++;
      if (invUpdateTick >= 10) {
        invUpdateTick = 0;
        setInventoryDisplay([...player.inventory]);
      }

      // --- RENDER ---
      renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, fallingBlocks, pendulums, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgGradCache, groundGradCache, groundLineColor, levelCoins, coinsCollected, sparks, binaryDrops);

      rafRef.current = requestAnimationFrame(loop);
    };

    // Вынесенная функция рендера
    function renderFrame(
      ctx: CanvasRenderingContext2D, frame: number, camera: Camera, stars: Star[],
      obstacles: readonly ObstacleData[], movingPlatforms: MovingObstacle[],
      fallingBlocksArg: FallingBlock[], pendulumsArg: Pendulum[],
      enemies: Enemy[], powerups: Powerup[],
      bullets: Bullet[], enemyBullets: EnemyBullet[], bombs: BombProjectile[], player: Player,
      particles: ParticleSystem, kills: number, muzzleFlash: number,
      boss: Boss | null, bossPhase: BossPhase, bossIntroTimer: number,
      arenaX: number, inp: { jump: boolean },
      bgGrad: CanvasGradient, groundGrad: CanvasGradient, groundLineColor: string,
      liveCoins: LiveCoin[], _sessionCoins: number,
      sparksArg: Spark[], binaryDropsArg: BinaryDrop[],
    ) {
      // Тряска экрана от боссов (Crusher / FrostKing)
      const shakeVal = boss && 'screenShake' in boss ? (boss as { screenShake: number }).screenShake : 0;
      const shakeX = shakeVal * (Math.random() - 0.5);
      const shakeY = shakeVal * (Math.random() - 0.5);
      if (shakeX || shakeY) {
        ctx.save();
        ctx.translate(shakeX, shakeY);
      }

      // === Фон: вертикальный градиент (кешированный) ===
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // === Звёзды (ближний слой 0.5x параллакс) ===
      for (const star of stars) {
        const sx = ((star.x - camera.x * 0.5) % (CANVAS_WIDTH * 2) + CANVAS_WIDTH * 2) % (CANVAS_WIDTH * 2);
        if (sx > CANVAS_WIDTH) continue;
        const alpha = 0.35 + Math.sin(star.blink + frame * 0.02) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS.star;
        ctx.beginPath();
        ctx.arc(sx, star.y, star.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // === Атмосферные эффекты уровня (холмы + ромбы + rain/snow/sparks/binary + пульсация) ===
      drawAtmosphere(ctx, frame, camera, levelId, rainDrops, snowflakes, sparksArg, binaryDropsArg);

      // === Земля: градиентная заливка (кешированный градиент) ===
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Мягкое свечение линии земли (3 слоя)
      const glowLayers = [
        { w: 6, alpha: 0.12 },
        { w: 2, alpha: 0.35 },
        { w: 1, alpha: 0.9  },
      ];
      for (const layer of glowLayers) {
        ctx.strokeStyle = groundLineColor;
        ctx.shadowColor = groundLineColor;
        ctx.shadowBlur = 8;
        ctx.lineWidth = layer.w;
        ctx.globalAlpha = layer.alpha;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // === Текстура земли (сетка + декорации) ===
      drawGroundTexture(ctx, camera, levelId, groundLineColor);

      // Препятствия (статические + движущиеся)
      drawObstacles(ctx, obstacles, movingPlatforms, camera);

      // Падающие блоки
      drawFallingBlocks(ctx, fallingBlocksArg, camera, frame);

      // Маятники (рисуем до игрока, чтобы шар был позади)
      drawPendulums(ctx, pendulumsArg, camera);

      // Монеты уровня
      for (const coin of liveCoins) {
        if (coin.collected) continue;
        const sx = camera.worldToScreen(coin.x);
        if (sx < -20 || sx > CANVAS_WIDTH + 20) continue;
        // Анимация: монета "мерцает" изменяя ширину (эффект вращения)
        const scaleX = Math.abs(Math.cos(frame * 0.06 + coin.x * 0.01));
        ctx.save();
        ctx.translate(sx, coin.y);
        ctx.scale(scaleX < 0.15 ? 0.15 : scaleX, 1);
        ctx.beginPath();
        ctx.arc(0, 0, COIN_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = COIN_COLOR;
        ctx.shadowColor = COIN_GLOW;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Блеск
        ctx.fillStyle = 'rgba(255,255,200,0.7)';
        ctx.beginPath();
        ctx.arc(-2, -3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Ракетный коридор
      if (corridor) {
        drawCorridor(ctx, corridor, camera, frame);
      }

      // Стены арены (если в босс-зоне)
      if (bossPhase !== 'none') {
        const arenaWallColor = levelId === 3 ? '#00aaff' : levelId === 2 ? '#8800cc' : '#ff0044';
        drawArenaWalls(ctx, arenaX, camera, arenaWallColor);
      }

      // Powerups (culling)
      for (const pw of powerups) {
        if (pw.collected) continue;
        const sx = camera.worldToScreen(pw.x);
        if (sx < -100 || sx > CANVAS_WIDTH + 100) continue;
        pw.draw(ctx, sx, frame);
      }

      // Клетки со скинами (culling)
      for (const cage of cages) {
        if (cage.collected) continue;
        const cx = camera.worldToScreen(cage.x);
        if (cx < -100 || cx > CANVAS_WIDTH + 100) continue;
        cage.draw(ctx, cx, frame);
      }

      // Враги (culling)
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const ex = camera.worldToScreen(enemy.x);
        if (ex < -100 || ex > CANVAS_WIDTH + 100) continue;
        enemy.draw(ctx, ex, frame);
      }

      // Босс
      if (boss && bossPhase !== 'none' && !(bossPhase === 'defeated' && !boss.alive)) {
        boss.draw(ctx, frame, camera.x);
      }

      // Пули (screen space)
      const screenBullets = bullets.map((b) => ({
        ...b,
        x: camera.worldToScreen(b.x),
      }));
      drawBullets(ctx, screenBullets);

      // Бомбы
      drawBombs(ctx, bombs, camera);

      // Вражеские пули (красные)
      ctx.fillStyle = '#ff2222';
      ctx.shadowColor = '#ff2222';
      ctx.shadowBlur = 6;
      for (const eb of enemyBullets) {
        const ebx = camera.worldToScreen(eb.x);
        ctx.fillRect(ebx, eb.y, eb.width, eb.height);
      }
      ctx.shadowBlur = 0;

      // Игрок
      const screenX = camera.worldToScreen(player.x);
      const savedX = player.x;
      player.x = screenX;
      player.draw(ctx, frame);
      player.x = savedX;

      // Вспышка при выстреле
      if (muzzleFlash > 0) {
        ctx.globalAlpha = muzzleFlash / 6;
        ctx.fillStyle = '#ffff88';
        ctx.beginPath();
        ctx.arc(screenX + ENTITY_SIZE + 8, player.y + ENTITY_SIZE / 2, 6 + muzzleFlash, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Огненный след ракеты (обычный режим + коридор)
      if (player.isRocketMode() || corridorMode) {
        for (let ti = 0; ti < 3; ti++) {
          const trailX = screenX - 5 - Math.random() * 15;
          const trailY = player.y + ENTITY_SIZE / 2 + (Math.random() - 0.5) * 12;
          const trailSize = 3 + Math.random() * 5;
          ctx.globalAlpha = 0.5 + Math.random() * 0.3;
          ctx.fillStyle = ['#ff4400', '#ffcc00', '#ff8800', '#ff44ff'][Math.floor(Math.random() * 4)];
          ctx.fillRect(trailX, trailY, trailSize, trailSize);
        }
        ctx.globalAlpha = 1;
        particles.burst(screenX - 5, player.y + ENTITY_SIZE / 2, '#ff8800', 1);
      }

      // Частицы полёта (обычный режим)
      if (!player.isRocketMode() && !corridorMode && inp.jump && !player.onGround) {
        const px = screenX + Math.random() * ENTITY_SIZE;
        const py = player.y + ENTITY_SIZE + Math.random() * 5;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = COLORS.neon;
        ctx.fillRect(px, py, 2 + Math.random() * 3, 2 + Math.random() * 3);
        ctx.globalAlpha = 1;
      }

      // Взрывы
      particles.draw(ctx);

      // --- HUD ---

      const hudState = {
        player,
        kills,
        sessionCoins: coinsCollected,
        score: Math.floor(camera.x / 10),
        bossPhase,
        boss,
        bossIntroTimer,
        corridorMode,
        corridor: corridor ?? null,
        levelId,
        skinColor,
      };

      if (drawBossIntro(ctx, hudState)) {
        if (shakeX || shakeY) ctx.restore();
        return;
      }
      drawBossDefeated(ctx, bossPhase);
      displayScore = drawHUD(ctx, hudState, displayScore);

      // Восстановление после тряски
      if (shakeX || shakeY) {
        ctx.restore();
      }
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      input.detach();
    };
  }, [death, levelComplete]);

  // Touch: canvas tap = jump + fullscreen
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    requestFullscreen();
    inputRef.current?.setJump(true);
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    inputRef.current?.setJump(false);
  }, []);
  const handleMouseDown = useCallback(() => {
    inputRef.current?.setJump(true);
  }, []);
  const handleMouseUp = useCallback(() => {
    inputRef.current?.setJump(false);
  }, []);

  // Кнопки влево/вправо (арена босса)
  const handleLeftDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    inputRef.current?.setMoveLeft(true);
  }, []);
  const handleLeftUp = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    inputRef.current?.setMoveLeft(false);
  }, []);
  const handleRightDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    inputRef.current?.setMoveRight(true);
  }, []);
  const handleRightUp = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    inputRef.current?.setMoveRight(false);
  }, []);

  // GUN button
  const handleGunDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.setShoot(true);
  }, []);
  const handleGunUp = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.setShoot(false);
  }, []);

  // Powerup touch buttons
  const handlePwSlot0 = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    inputRef.current?.triggerPowerup(0);
  }, []);
  const handlePwSlot1 = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    inputRef.current?.triggerPowerup(1);
  }, []);
  const handlePwSlot2 = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    inputRef.current?.triggerPowerup(2);
  }, []);
  const pwHandlers = [handlePwSlot0, handlePwSlot1, handlePwSlot2];

  // === Level Complete screen ===
  if (levelComplete) {
    const hasNextLevel = levelId < TOTAL_LEVELS;
    return (
      <div
        style={{
          width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT,
          background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', borderRadius: 12,
          fontFamily: 'monospace',
        }}
      >
        {/* Звезда победы */}
        <div style={{ fontSize: 48, marginBottom: 4, filter: 'drop-shadow(0 0 12px #ffd700)' }}>&#9733;</div>
        <div style={{ fontSize: 36, fontWeight: 'bold', color: '#fff', textShadow: '0 0 20px rgba(0,255,204,0.5)', marginBottom: 12 }}>
          LEVEL COMPLETE
        </div>
        <div style={{ color: '#00ffcc', fontSize: 14, marginBottom: 8 }}>
          {LEVEL_INFO[levelId - 1]?.name ?? `Level ${levelId}`} — Boss Defeated!
        </div>
        <div style={{ color: '#fff', fontSize: 20, marginBottom: 5 }}>
          Score: {levelComplete.score}
        </div>
        <div style={{ color: '#fff', fontSize: 20, marginBottom: 5 }}>
          Kills: {levelComplete.kills}
        </div>
        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {hasNextLevel ? (
            <button style={primaryBtnStyle()} onClick={onNextLevel}>Next Level</button>
          ) : (
            <button
              style={{ ...neonBtnStyle(), cursor: 'default', opacity: 0.4 }}
              disabled
            >
              Coming Soon...
            </button>
          )}
          <button style={neonBtnStyle()} onClick={onBack}>Menu</button>
        </div>
      </div>
    );
  }

  // === Death screen ===
  if (death) {
    return (
      <div
        style={{
          width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT,
          background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', borderRadius: 12,
          fontFamily: 'monospace',
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 'bold', color: '#fff', textShadow: '0 0 20px rgba(255,80,80,0.6)', marginBottom: 10 }}>
          Crash!
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20, marginBottom: 5 }}>
          Score: {death.score} | Kills: {death.kills}
        </div>
        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={primaryBtnStyle()} onClick={onRestart}>Restart</button>
          <button style={neonBtnStyle()} onClick={onBack}>Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ display: 'block', borderRadius: 12, cursor: 'pointer' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 8, left: 8, padding: '4px 12px',
          background: 'rgba(0,0,0,0.5)', border: '1px solid #666',
          borderRadius: 6, color: '#888', cursor: 'pointer',
          fontFamily: 'monospace', fontSize: 12,
        }}
      >
        Меню
      </button>
      <button
        onMouseDown={handleGunDown}
        onMouseUp={handleGunUp}
        onTouchStart={handleGunDown}
        onTouchEnd={handleGunUp}
        style={{
          position: 'absolute', bottom: 12, right: 12,
          width: 54, height: 54, borderRadius: 27,
          border: '3px solid #ffaa00', background: 'rgba(255,255,0,0.15)',
          color: '#ffaa00', fontSize: 14, fontWeight: 'bold',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'monospace',
          touchAction: 'none',
        }}
      >
        GUN
      </button>
      {[0, 1, 2].map((slot) => {
        const pw = inventoryDisplay[slot];
        const color = pw ? POWERUP_COLORS[pw] : '#555';
        const label = pw ? POWERUP_LABELS[pw] : String(slot + 1);
        return (
          <button
            key={slot}
            onMouseDown={pwHandlers[slot]}
            onTouchStart={pwHandlers[slot]}
            style={{
              position: 'absolute', bottom: 12, left: 12 + slot * 50,
              width: 44, height: 44, borderRadius: 22,
              border: `2px solid ${color}`,
              background: pw ? color + '30' : 'rgba(50,50,50,0.3)',
              color: pw ? '#fff' : '#666',
              fontSize: 12, fontWeight: 'bold',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: 'monospace',
              touchAction: 'none',
              boxShadow: pw ? `0 0 10px ${color}60` : 'none',
            }}
          >
            {label}
          </button>
        );
      })}
      {/* Кнопки ← → для арены босса */}
      <button
        onMouseDown={handleLeftDown} onMouseUp={handleLeftUp}
        onTouchStart={handleLeftDown} onTouchEnd={handleLeftUp}
        style={{
          position: 'absolute', bottom: 62, left: 12,
          width: 44, height: 44, borderRadius: 22,
          border: '2px solid #3355ff', background: 'rgba(51,85,255,0.15)',
          color: '#3355ff', fontSize: 20, fontWeight: 'bold',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', touchAction: 'none',
        }}
      >
        ←
      </button>
      <button
        onMouseDown={handleRightDown} onMouseUp={handleRightUp}
        onTouchStart={handleRightDown} onTouchEnd={handleRightUp}
        style={{
          position: 'absolute', bottom: 62, left: 62,
          width: 44, height: 44, borderRadius: 22,
          border: '2px solid #3355ff', background: 'rgba(51,85,255,0.15)',
          color: '#3355ff', fontSize: 20, fontWeight: 'bold',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', touchAction: 'none',
        }}
      >
        →
      </button>
    </div>
  );
}
