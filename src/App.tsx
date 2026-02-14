import { useState, useCallback, useRef, useEffect } from 'react';
import { GameScreen } from '@levels/types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, COLORS,
  BASE_SPEED, MAX_SPEED_BONUS, ENTITY_SIZE,
  BULLET_SPEED, SHOOT_COOLDOWN, JUMP_FORCE,
  POWERUP_COLORS, POWERUP_LABELS, PowerupType,
  LEVEL_BOSS_ARENA_WIDTH, BOSS_INTRO_DURATION,
  SKIN_COLORS, SKIN_NAMES, SkinId,
} from '@utils/constants';
import { Player } from '@entities/Player';
import { Enemy } from '@entities/Enemy';
import { Powerup } from '@entities/Powerup';
import { Cage } from '@entities/Cage';
import { BossGuardian } from '@entities/bosses/Boss1_Guardian';
import { BossCrusher } from '@entities/bosses/Boss2_Crusher';
import { BossFrostKing } from '@entities/bosses/Boss3_FrostKing';
import { Boss } from '@entities/Boss';
import { Camera } from '@engine/Camera';
import { Input } from '@engine/Input';
import { ParticleSystem } from '@engine/ParticleSystem';
import { applyGravity, clampToGround, landingCollision, aabbCollision, stompCheck } from '@engine/Physics';
import level1 from '@levels/data/level1';
import level2 from '@levels/data/level2';
import level3 from '@levels/data/level3';
import { LevelData, ObstacleData, RocketCorridorData } from '@levels/types';
import { loadProgress, saveLevelComplete, getMaxUnlockedLevel, unlockSkin, setCurrentSkin, getCurrentSkinColor } from '@utils/storage';

// --- Конфиг уровней для экрана выбора ---
const LEVEL_INFO: Array<{ id: number; name: string; bossName: string }> = [
  { id: 1, name: 'Neon City', bossName: 'Guardian' },
  { id: 2, name: 'Cyber Sewer', bossName: 'Crusher' },
  { id: 3, name: 'Ice Citadel', bossName: 'Frost King' },
];

// Карта уровней по ID
const LEVELS: Record<number, LevelData> = {
  1: level1,
  2: level2,
  3: level3,
};

const TOTAL_LEVELS = LEVEL_INFO.length;

// --- Types ---

interface Star { x: number; y: number; size: number; blink: number }
interface Bullet { x: number; y: number; width: number; height: number }
interface EnemyBullet { x: number; y: number; vx: number; width: number; height: number }
interface BombProjectile { x: number; y: number; vx: number; vy: number; width: number; height: number }
interface DeathInfo { score: number; kills: number }
interface LevelCompleteInfo { score: number; kills: number }
// Мутабельная копия ObstacleData для движущихся платформ
interface MovingObstacle { x: number; y: number; baseX: number; baseY: number; width: number; height: number; type: string; moveRange: number; moveSpeed: number; moveAxis: 'x' | 'y'; dir: number }

type BossPhase = 'none' | 'intro' | 'fight' | 'defeated' | 'complete';

// --- Helpers ---

function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH * 4,
      y: Math.random() * (GROUND_Y - 20),
      size: Math.random() * 2 + 1,
      blink: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function createEnemies(level: LevelData): Enemy[] {
  return level.enemies.map((data) => new Enemy({ x: data.x, y: data.y, type: data.type, patrolRange: data.patrolRange }));
}

function createPowerups(level: LevelData): Powerup[] {
  return level.powerups.map((data) => new Powerup(data.x, data.y, data.type));
}

function createMovingPlatforms(level: LevelData): MovingObstacle[] {
  return level.obstacles
    .filter((obs) => obs.type === 'moving_platform' && obs.moveRange && obs.moveSpeed)
    .map((obs) => ({
      x: obs.x, y: obs.y, baseX: obs.x, baseY: obs.y,
      width: obs.width, height: obs.height, type: obs.type,
      moveRange: obs.moveRange!, moveSpeed: obs.moveSpeed!,
      moveAxis: obs.moveAxis ?? 'y', dir: 1,
    }));
}

function neonBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '14px 32px', fontSize: 18, fontWeight: 'bold',
    border: 'none', borderRadius: 12, cursor: 'pointer', color: '#fff',
    background: bg, boxShadow: '0 0 20px ' + bg + '80',
    margin: 8, fontFamily: 'monospace', minWidth: 200,
  };
}

// --- Atmosphere & Ground Effects ---

// Nebulae for Level 1 (pre-generated positions)
const NEBULAE = [
  { x: 200, y: 80, r: 90, color: 'rgba(255,0,102,0.07)' },
  { x: 600, y: 150, r: 120, color: 'rgba(0,255,136,0.05)' },
  { x: 1100, y: 60, r: 80, color: 'rgba(51,85,255,0.06)' },
  { x: 1700, y: 180, r: 100, color: 'rgba(255,0,200,0.05)' },
  { x: 2400, y: 100, r: 110, color: 'rgba(0,200,255,0.06)' },
];

interface RainDrop { x: number; y: number; speed: number; len: number }
interface Snowflake { x: number; y: number; size: number; speed: number; drift: number }

function createRainDrops(count: number): RainDrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * GROUND_Y,
    speed: 2 + Math.random() * 3,
    len: 6 + Math.random() * 6,
  }));
}

function createSnowflakes(count: number): Snowflake[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * GROUND_Y,
    size: 1 + Math.random() * 2,
    speed: 0.3 + Math.random() * 0.7,
    drift: Math.random() * Math.PI * 2,
  }));
}

function drawAtmosphere(ctx: CanvasRenderingContext2D, frame: number, camera: Camera, levelId: number, rain: RainDrop[], snow: Snowflake[]): void {
  if (levelId === 1) {
    // Неоновые туманности — полупрозрачные размытые круги с параллаксом
    for (const neb of NEBULAE) {
      const nx = ((neb.x - camera.x * 0.1) % (CANVAS_WIDTH * 1.5) + CANVAS_WIDTH * 1.5) % (CANVAS_WIDTH * 1.5) - 150;
      ctx.fillStyle = neb.color;
      ctx.beginPath();
      ctx.arc(nx, neb.y + Math.sin(frame * 0.005 + neb.x) * 10, neb.r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (levelId === 2) {
    // Матричные капли — зелёные пиксели падают вниз
    ctx.fillStyle = 'rgba(34,255,68,0.4)';
    for (const drop of rain) {
      drop.y += drop.speed;
      if (drop.y > GROUND_Y) {
        drop.y = -10;
        drop.x = Math.random() * CANVAS_WIDTH;
      }
      ctx.fillRect(drop.x, drop.y, 2, drop.len);
    }
  } else if (levelId === 3) {
    // Снежинки — белые точки, медленные, разного размера
    for (const sf of snow) {
      sf.y += sf.speed;
      sf.x += Math.sin(frame * 0.02 + sf.drift) * 0.3;
      if (sf.y > GROUND_Y) {
        sf.y = -5;
        sf.x = Math.random() * CANVAS_WIDTH;
      }
      ctx.globalAlpha = 0.4 + sf.size * 0.1;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawGroundTexture(ctx: CanvasRenderingContext2D, camera: Camera, levelId: number, _groundColor: string): void {
  // Случайные пиксели на земле для текстуры
  const startTile = Math.floor(camera.x / 20) * 20;
  ctx.globalAlpha = 0.15;
  for (let wx = startTile; wx < startTile + CANVAS_WIDTH + 40; wx += 20) {
    const sx = wx - camera.x;
    // Псевдослучайность на основе позиции
    const seed = (wx * 7 + 13) % 100;
    if (seed < 40) {
      const py = GROUND_Y + 8 + (seed % 3) * 12;
      ctx.fillStyle = seed % 2 === 0 ? '#ffffff' : '#000000';
      ctx.fillRect(sx, py, 3, 3);
    }
  }
  ctx.globalAlpha = 1;

  // Декорации по верхнему краю земли
  const decoStart = Math.floor(camera.x / 40) * 40;
  for (let wx = decoStart; wx < decoStart + CANVAS_WIDTH + 80; wx += 40) {
    const sx = wx - camera.x;
    const seed = (wx * 3 + 7) % 100;
    if (seed > 60) continue; // не все позиции заняты

    if (levelId === 1) {
      // Трава — маленькие зелёные треугольники
      ctx.fillStyle = '#33cc44';
      const h = 5 + (seed % 4);
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 3, GROUND_Y - h);
      ctx.lineTo(sx + 6, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    } else if (levelId === 2) {
      // Токсичные капли — перевёрнутые зелёные треугольники
      ctx.fillStyle = '#22aa33';
      const h = 4 + (seed % 3);
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 3, GROUND_Y + h);
      ctx.lineTo(sx + 6, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    } else if (levelId === 3) {
      // Ледяные кристаллы — голубые треугольники вверх
      ctx.fillStyle = '#88ccff';
      const h = 5 + (seed % 5);
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 3, GROUND_Y - h);
      ctx.lineTo(sx + 6, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// --- Drawing ---

function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: readonly ObstacleData[], movingPlatforms: MovingObstacle[], camera: Camera): void {
  // Статические препятствия (кроме moving_platform — они рисуются отдельно)
  for (const obs of obstacles) {
    if (obs.type === 'moving_platform') continue;
    const ox = camera.worldToScreen(obs.x);
    if (ox < -100 || ox > CANVAS_WIDTH + 100) continue;
    if (obs.type === 'spike') {
      ctx.fillStyle = COLORS.spike;
      ctx.shadowColor = COLORS.spike;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(ox, obs.y + obs.height);
      ctx.lineTo(ox + obs.width / 2, obs.y - 5);
      ctx.lineTo(ox + obs.width, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (obs.type === 'platform') {
      ctx.fillStyle = COLORS.platform;
      ctx.shadowColor = COLORS.platform;
      ctx.shadowBlur = 6;
      ctx.fillRect(ox, obs.y, obs.width, obs.height);
      ctx.shadowBlur = 0;
    }
  }
  // Движущиеся платформы
  for (const mp of movingPlatforms) {
    const mx = camera.worldToScreen(mp.x);
    if (mx < -100 || mx > CANVAS_WIDTH + 100) continue;
    ctx.fillStyle = '#44aaff';
    ctx.shadowColor = '#44aaff';
    ctx.shadowBlur = 8;
    ctx.fillRect(mx, mp.y, mp.width, mp.height);
    // Стрелочки-индикаторы направления движения
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    if (mp.moveAxis === 'y') {
      // Стрелка вверх-вниз
      ctx.beginPath();
      ctx.moveTo(mx + mp.width / 2 - 4, mp.y + mp.height / 2);
      ctx.lineTo(mx + mp.width / 2, mp.y + 2);
      ctx.lineTo(mx + mp.width / 2 + 4, mp.y + mp.height / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + mp.width / 2 - 4, mp.y + mp.height / 2);
      ctx.lineTo(mx + mp.width / 2, mp.y + mp.height - 2);
      ctx.lineTo(mx + mp.width / 2 + 4, mp.y + mp.height / 2);
      ctx.fill();
    } else {
      // Стрелка влево-вправо
      ctx.beginPath();
      ctx.moveTo(mx + mp.width / 2, mp.y + mp.height / 2 - 4);
      ctx.lineTo(mx + 2, mp.y + mp.height / 2);
      ctx.lineTo(mx + mp.width / 2, mp.y + mp.height / 2 + 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + mp.width / 2, mp.y + mp.height / 2 - 4);
      ctx.lineTo(mx + mp.width - 2, mp.y + mp.height / 2);
      ctx.lineTo(mx + mp.width / 2, mp.y + mp.height / 2 + 4);
      ctx.fill();
    }
  }
}

function drawCorridor(ctx: CanvasRenderingContext2D, corridor: RocketCorridorData, camera: Camera, frame: number): void {
  const CORRIDOR_GAP = 120;
  const startScreen = camera.worldToScreen(corridor.startX);
  const endScreen = camera.worldToScreen(corridor.endX);

  // Отсечение: если коридор за пределами экрана
  if (endScreen < -200 || startScreen > CANVAS_WIDTH + 200) return;

  // === Предупреждающие полосы (200px перед входом) ===
  const warnStart = camera.worldToScreen(corridor.startX - 200);
  const warnEnd = startScreen;
  if (warnEnd > 0 && warnStart < CANVAS_WIDTH) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(0, warnStart), 0, Math.min(warnEnd, CANVAS_WIDTH) - Math.max(0, warnStart), GROUND_Y);
    ctx.clip();

    const stripeWidth = 30;
    const offset = (frame * 0.5) % (stripeWidth * 2);
    ctx.globalAlpha = 0.3;
    for (let sx = warnStart - stripeWidth * 4 - offset; sx < warnEnd + stripeWidth * 2; sx += stripeWidth * 2) {
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + stripeWidth, 0);
      ctx.lineTo(sx + stripeWidth - GROUND_Y * 0.5, GROUND_Y);
      ctx.lineTo(sx - GROUND_Y * 0.5, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Текст WARNING
    ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    const textX = (warnStart + warnEnd) / 2;
    if (textX > 0 && textX < CANVAS_WIDTH) {
      ctx.fillText('⚠ CORRIDOR ⚠', textX, 60);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // === Стены и шипы коридора ===
  const drawStart = Math.max(0, startScreen);
  const drawEnd = Math.min(CANVAS_WIDTH, endScreen);
  if (drawEnd <= drawStart) return;

  // Рисуем по колонкам шириной 40px
  for (let wx = corridor.startX; wx < corridor.endX; wx += 40) {
    const sx = camera.worldToScreen(wx);
    if (sx > CANVAS_WIDTH + 40 || sx < -40) continue;

    const gapCenter = 170 + Math.sin(wx * 0.004) * 80;
    const ceilingY = gapCenter - CORRIDOR_GAP / 2;
    const floorY = gapCenter + CORRIDOR_GAP / 2;

    // Стена сверху (тёмная)
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(sx, 0, 42, ceilingY);

    // Стена снизу (тёмная)
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(sx, floorY, 42, GROUND_Y - floorY);

    // Шипы с потолка (вниз)
    ctx.fillStyle = COLORS.spike;
    ctx.shadowColor = COLORS.spike;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(sx, ceilingY - 5);
    ctx.lineTo(sx + 20, ceilingY + 15);
    ctx.lineTo(sx + 40, ceilingY - 5);
    ctx.closePath();
    ctx.fill();

    // Шипы с пола (вверх)
    ctx.beginPath();
    ctx.moveTo(sx, floorY + 5);
    ctx.lineTo(sx + 20, floorY - 15);
    ctx.lineTo(sx + 40, floorY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Граница входа (красная линия)
  if (startScreen > -5 && startScreen < CANVAS_WIDTH + 5) {
    ctx.strokeStyle = COLORS.spike;
    ctx.shadowColor = COLORS.spike;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startScreen, 0);
    ctx.lineTo(startScreen, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Граница выхода (зелёная линия)
  if (endScreen > -5 && endScreen < CANVAS_WIDTH + 5) {
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(endScreen, 0);
    ctx.lineTo(endScreen, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  ctx.fillStyle = COLORS.bullet;
  ctx.shadowColor = COLORS.bullet;
  ctx.shadowBlur = 8;
  for (const b of bullets) {
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(b.x - 8, b.y + 1, 8, b.height - 2);
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;
}

function drawBombs(ctx: CanvasRenderingContext2D, bombs: BombProjectile[], camera: Camera): void {
  for (const bomb of bombs) {
    const bx = camera.worldToScreen(bomb.x);
    ctx.fillStyle = COLORS.bomb;
    ctx.shadowColor = COLORS.bomb;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(bx + bomb.width / 2, bomb.y + bomb.height / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BM', bx + bomb.width / 2, bomb.y + bomb.height / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

function drawArenaWalls(ctx: CanvasRenderingContext2D, arenaX: number, camera: Camera, wallColor = '#ff0044'): void {
  const leftWall = camera.worldToScreen(arenaX);
  const rightWall = camera.worldToScreen(arenaX + LEVEL_BOSS_ARENA_WIDTH);
  // Стены арены — светящиеся вертикальные линии
  ctx.strokeStyle = wallColor;
  ctx.shadowColor = wallColor;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(leftWall, 0);
  ctx.lineTo(leftWall, GROUND_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rightWall, 0);
  ctx.lineTo(rightWall, GROUND_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// --- GameCanvas ---

interface GameCanvasProps {
  levelId: number;
  onBack: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
}

function GameCanvas({ levelId, onBack, onRestart, onNextLevel }: GameCanvasProps) {
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
    const player = new Player(100, 3, skinColor);
    const camera = new Camera();
    const particles = new ParticleSystem();
    const obstacles = levelData.obstacles;
    const enemies = createEnemies(levelData);
    const powerups = createPowerups(levelData);
    const movingPlatforms = createMovingPlatforms(levelData);
    const cages = (levelData.cages || []).map(c => new Cage(c.x, c.y, c.skinId));
    const bullets: Bullet[] = [];
    const enemyBullets: EnemyBullet[] = [];
    const bombs: BombProjectile[] = [];
    const stars = starsRef.current;
    const rainDrops = levelId === 2 ? createRainDrops(30) : [];
    const snowflakes = levelId === 3 ? createSnowflakes(40) : [];
    let displayScore = 0; // Анимированный score для HUD

    // Цвета уровня
    const bgColor = levelData.backgroundColor ?? COLORS.bg;
    const groundColor = levelData.groundColor ?? COLORS.ground;
    const groundLineColor = levelId === 3 ? '#4466cc' : levelData.groundColor ? '#33aa44' : COLORS.groundLine;

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
        renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgColor, groundColor, groundLineColor);
        rafRef.current = requestAnimationFrame(loop);
        if (bossDefeatTimer >= 60) {
          const finalScore = Math.floor(camera.x / 10);
          saveLevelComplete(levelId, finalScore, kills);
          setLevelComplete({ score: finalScore, kills });
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
        renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgColor, groundColor, groundLineColor);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // === Проверка входа в босс-арену ===
      if (bossPhase === 'none' && player.x >= arenaX) {
        bossPhase = 'intro';
        bossIntroTimer = 0;
        camera.lock(arenaX - CANVAS_WIDTH * 0.1);
        // Создание босса в зависимости от уровня
        if (levelId === 3) {
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
        }

        if (inp.jump && player.onGround) {
          player.jump();
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
          }
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
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (aabbCollision(b, enemy)) {
            enemy.takeDamage(1);
            kills++;
            const ex = camera.worldToScreen(enemy.x);
            particles.burst(ex + ENTITY_SIZE / 2, enemy.y + ENTITY_SIZE / 2, COLORS.enemy, 12);
            bullets.splice(bi, 1);
            break;
          }
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
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2), boss.y + boss.height / 2);
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2) + 20, boss.y + 10);
              particles.bigBurst(camera.worldToScreen(boss.x + boss.width / 2) - 20, boss.y + 30);
            }
          } else {
            // Боковое столкновение с боссом
            const died = player.takeDamage(1);
            if (died) {
              particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
              setDeath({ score: Math.floor(camera.x / 10), kills });
              return;
            }
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
            particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, skinColor, 15);
            setDeath({ score: Math.floor(camera.x / 10), kills });
            return;
          }
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
        const CORRIDOR_GAP = 120;
        const playerCX = player.x + player.width / 2;
        const gapCenter = 170 + Math.sin(playerCX * 0.004) * 80;
        const ceilingBottom = gapCenter - CORRIDOR_GAP / 2;
        const floorTop = gapCenter + CORRIDOR_GAP / 2;
        if (player.y < ceilingBottom) {
          const died = player.takeDamage(1);
          if (died) {
            particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, COLORS.spike, 15);
            setDeath({ score: Math.floor(camera.x / 10), kills });
            return;
          }
          player.y = ceilingBottom;
          player.vy = 1;
        }
        if (player.y + player.height > floorTop) {
          const died = player.takeDamage(1);
          if (died) {
            particles.burst(camera.worldToScreen(player.x) + ENTITY_SIZE / 2, player.y + ENTITY_SIZE / 2, COLORS.spike, 15);
            setDeath({ score: Math.floor(camera.x / 10), kills });
            return;
          }
          player.y = floorTop - player.height;
          player.vy = -1;
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
      renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgColor, groundColor, groundLineColor);

      rafRef.current = requestAnimationFrame(loop);
    };

    // Вынесенная функция рендера
    function renderFrame(
      ctx: CanvasRenderingContext2D, frame: number, camera: Camera, stars: Star[],
      obstacles: readonly ObstacleData[], movingPlatforms: MovingObstacle[],
      enemies: Enemy[], powerups: Powerup[],
      bullets: Bullet[], enemyBullets: EnemyBullet[], bombs: BombProjectile[], player: Player,
      particles: ParticleSystem, kills: number, muzzleFlash: number,
      boss: Boss | null, bossPhase: BossPhase, bossIntroTimer: number,
      arenaX: number, inp: { jump: boolean },
      bgColor: string, groundColor: string, groundLineColor: string,
    ) {
      // Тряска экрана от боссов (Crusher / FrostKing)
      const shakeVal = boss && 'screenShake' in boss ? (boss as { screenShake: number }).screenShake : 0;
      const shakeX = shakeVal * (Math.random() - 0.5);
      const shakeY = shakeVal * (Math.random() - 0.5);
      if (shakeX || shakeY) {
        ctx.save();
        ctx.translate(shakeX, shakeY);
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Звёзды
      for (const star of stars) {
        const sx = ((star.x - camera.x * 0.3) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
        ctx.globalAlpha = 0.3 + Math.sin(star.blink + frame * 0.02) * 0.3;
        ctx.fillStyle = COLORS.star;
        ctx.fillRect(sx, star.y, star.size, star.size);
      }
      ctx.globalAlpha = 1;

      // Атмосферные эффекты уровня
      drawAtmosphere(ctx, frame, camera, levelId, rainDrops, snowflakes);

      // Земля
      ctx.fillStyle = groundColor;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.strokeStyle = groundLineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 25; i++) {
        const lx = ((i * 40 - camera.x) % 1000 + 1000) % 1000;
        if (lx < CANVAS_WIDTH) {
          ctx.beginPath();
          ctx.moveTo(lx, GROUND_Y);
          ctx.lineTo(lx, CANVAS_HEIGHT);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Текстура земли
      drawGroundTexture(ctx, camera, levelId, groundColor);

      // Препятствия (статические + движущиеся)
      drawObstacles(ctx, obstacles, movingPlatforms, camera);

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

      // Босс-интро: затемнение + молнии + крупное имя
      if (bossPhase === 'intro' && boss) {
        const introAlpha = bossIntroTimer < 30
          ? bossIntroTimer / 30
          : bossIntroTimer > BOSS_INTRO_DURATION - 30
            ? (BOSS_INTRO_DURATION - bossIntroTimer) / 30
            : 1;

        // Затемнение экрана
        const darkAlpha = Math.min(bossIntroTimer / 30, 1) * 0.3;
        ctx.fillStyle = `rgba(0,0,0,${darkAlpha})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Молнии по краям экрана
        const bossIntroColor = levelId === 3 ? '#00aaff' : levelId === 2 ? '#8800cc' : '#ff0044';
        if (bossIntroTimer < 80) {
          ctx.strokeStyle = bossIntroColor;
          ctx.shadowColor = bossIntroColor;
          ctx.shadowBlur = 15;
          ctx.lineWidth = 2;
          ctx.globalAlpha = introAlpha * 0.7;
          // Левая молния
          for (let li = 0; li < 2; li++) {
            ctx.beginPath();
            let lx = 10 + li * 8;
            ctx.moveTo(lx, 0);
            for (let segY = 30; segY < GROUND_Y; segY += 30) {
              lx += (Math.random() - 0.5) * 25;
              ctx.lineTo(Math.max(2, Math.min(lx, 30)), segY);
            }
            ctx.stroke();
          }
          // Правая молния
          for (let li = 0; li < 2; li++) {
            ctx.beginPath();
            let lx = CANVAS_WIDTH - 10 - li * 8;
            ctx.moveTo(lx, 0);
            for (let segY = 30; segY < GROUND_Y; segY += 30) {
              lx += (Math.random() - 0.5) * 25;
              ctx.lineTo(Math.max(CANVAS_WIDTH - 30, Math.min(lx, CANVAS_WIDTH - 2)), segY);
            }
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }

        // Текст имени босса
        ctx.globalAlpha = introAlpha;
        ctx.fillStyle = bossIntroColor;
        ctx.shadowColor = bossIntroColor;
        ctx.shadowBlur = 30;
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(boss.name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.shadowBlur = 0;
        ctx.font = '18px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText('BOSS BATTLE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
        return; // Не рисуем HUD поверх интро
      }

      // Boss defeated overlay
      if (bossPhase === 'defeated') {
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
      }

      // Анимированный Score (плавный подсчёт)
      const actualScore = Math.floor(camera.x / 10);
      displayScore += (actualScore - displayScore) * 0.15;
      if (Math.abs(displayScore - actualScore) < 1) displayScore = actualScore;
      const shownScore = Math.floor(displayScore);

      // Score & Kills (не поверх boss HP)
      if (bossPhase !== 'fight') {
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 18px monospace';
        ctx.fillText('Score: ' + shownScore, 20, 30);
        ctx.fillText('Kills: ' + kills, 160, 30);
      } else {
        // Score/Kills мельче, внизу слева в бою
        ctx.fillStyle = '#aaa';
        ctx.font = '14px monospace';
        ctx.fillText('Score: ' + shownScore + '  Kills: ' + kills, 20, GROUND_Y + 25);
      }

      // HP
      const hpY = bossPhase === 'fight' ? GROUND_Y + 35 : 42;
      const hpLabelY = bossPhase === 'fight' ? GROUND_Y + 48 : 55;
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 18px monospace';
      ctx.fillText('HP:', 20, hpLabelY);
      for (let i = 0; i < player.maxHP; i++) {
        ctx.fillStyle = i < player.hp ? skinColor : '#333';
        ctx.shadowColor = i < player.hp ? player.skinGlow : 'transparent';
        ctx.shadowBlur = i < player.hp ? 8 : 0;
        ctx.fillRect(70 + i * 22, hpY, 16, 16);
      }
      ctx.shadowBlur = 0;

      // Инвентарь powerups
      for (let si = 0; si < 3; si++) {
        const slotX = CANVAS_WIDTH - 110 + si * 34;
        const slotY = 10;
        const slotPw = player.inventory[si];
        ctx.strokeStyle = slotPw ? POWERUP_COLORS[slotPw] : '#444';
        ctx.lineWidth = 2;
        ctx.shadowColor = slotPw ? POWERUP_COLORS[slotPw] : 'transparent';
        ctx.shadowBlur = slotPw ? 8 : 0;
        ctx.strokeRect(slotX, slotY, 28, 28);
        ctx.shadowBlur = 0;
        if (slotPw) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = POWERUP_COLORS[slotPw];
          ctx.fillRect(slotX + 1, slotY + 1, 26, 26);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(POWERUP_LABELS[slotPw], slotX + 14, slotY + 18);
          ctx.textAlign = 'left';
        }
        ctx.fillStyle = '#666';
        ctx.font = '9px monospace';
        ctx.fillText(String(si + 1), slotX + 2, slotY + 26);
      }

      // Таймер-бар Shield / Rocket / Corridor
      if (corridorMode && corridor) {
        const barW = 100;
        const ratio = (player.x - corridor.startX) / (corridor.endX - corridor.startX);
        ctx.fillStyle = '#330011';
        ctx.fillRect(CANVAS_WIDTH / 2 - barW / 2, 8, barW, 8);
        ctx.fillStyle = COLORS.spike;
        ctx.shadowColor = COLORS.spike;
        ctx.shadowBlur = 6;
        ctx.fillRect(CANVAS_WIDTH / 2 - barW / 2, 8, barW * Math.min(ratio, 1), 8);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ CORRIDOR', CANVAS_WIDTH / 2, 6);
        ctx.textAlign = 'left';
      } else if (player.isRocketMode()) {
        const barW = 80;
        const ratio = player.rocketTimer / 180;
        ctx.fillStyle = '#330033';
        ctx.fillRect(CANVAS_WIDTH / 2 - barW / 2, 8, barW, 8);
        ctx.fillStyle = COLORS.rocket;
        ctx.shadowColor = COLORS.rocket;
        ctx.shadowBlur = 6;
        ctx.fillRect(CANVAS_WIDTH / 2 - barW / 2, 8, barW * ratio, 8);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ROCKET', CANVAS_WIDTH / 2, 6);
        ctx.textAlign = 'left';
      } else if (player.isShielded() && bossPhase !== 'fight') {
        const barW = 80;
        const ratio = player.shieldTimer / 300;
        ctx.fillStyle = '#002233';
        ctx.fillRect(CANVAS_WIDTH / 2 - barW / 2, 8, barW, 8);
        ctx.fillStyle = COLORS.shield;
        ctx.shadowColor = COLORS.shield;
        ctx.shadowBlur = 6;
        ctx.fillRect(CANVAS_WIDTH / 2 - barW / 2, 8, barW * ratio, 8);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SHIELD', CANVAS_WIDTH / 2, 6);
        ctx.textAlign = 'left';
      }

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

  // Touch: canvas tap = jump
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
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
          background: COLORS.bg, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', borderRadius: 12,
          fontFamily: 'monospace',
        }}
      >
        {/* Звезда победы */}
        <div style={{ fontSize: 48, marginBottom: 4 }}>&#9733;</div>
        <div style={{ fontSize: 36, fontWeight: 'bold', color: getCurrentSkinColor(), textShadow: '0 0 30px rgba(255,255,255,0.3)', marginBottom: 12 }}>
          LEVEL COMPLETE
        </div>
        <div style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>
          {LEVEL_INFO[levelId - 1]?.name ?? `Level ${levelId}`} &mdash; Boss Defeated!
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
            <button style={neonBtnStyle('#00aa66')} onClick={onNextLevel}>Next Level</button>
          ) : (
            <button
              style={{ ...neonBtnStyle('#555'), cursor: 'default', opacity: 0.6 }}
              disabled
            >
              Coming Soon...
            </button>
          )}
          <button style={neonBtnStyle('#3355ff')} onClick={onBack}>Menu</button>
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
          background: COLORS.bg, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', borderRadius: 12,
          fontFamily: 'monospace',
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 'bold', color: COLORS.spike, marginBottom: 10 }}>
          Crash!
        </div>
        <div style={{ color: '#fff', fontSize: 20, marginBottom: 5 }}>
          Score: {death.score} | Kills: {death.kills}
        </div>
        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={neonBtnStyle('#00aa66')} onClick={onRestart}>Restart</button>
          <button style={neonBtnStyle('#3355ff')} onClick={onBack}>Menu</button>
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
    </div>
  );
}

// --- App ---

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameKey, setGameKey] = useState(0);

  const startLevel = useCallback((levelId: number) => {
    setCurrentLevel(levelId);
    setGameKey((k) => k + 1);
    setScreen('playing');
  }, []);

  const goToMenu = useCallback(() => {
    setScreen('menu');
  }, []);

  const goToLevelSelect = useCallback(() => {
    setScreen('levelSelect');
  }, []);

  const goToSkins = useCallback(() => {
    setScreen('skins');
  }, []);

  const restartLevel = useCallback(() => {
    setGameKey((k) => k + 1);
  }, []);

  const nextLevel = useCallback(() => {
    setCurrentLevel((prev) => {
      const next = prev + 1;
      return next <= TOTAL_LEVELS ? next : prev;
    });
    setGameKey((k) => k + 1);
  }, []);

  // Кнопка "Играть" — запускает последний доступный уровень
  const handlePlay = useCallback(() => {
    const maxLevel = getMaxUnlockedLevel();
    // Не выше максимально существующего
    const targetLevel = Math.min(maxLevel, TOTAL_LEVELS);
    startLevel(targetLevel);
  }, [startLevel]);

  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace',
      }}
    >
      {/* === ГЛАВНОЕ МЕНЮ === */}
      {screen === 'menu' && <MenuScreen onPlay={handlePlay} onLevelSelect={goToLevelSelect} onSkins={goToSkins} />}

      {/* === ВЫБОР УРОВНЯ === */}
      {screen === 'levelSelect' && <LevelSelectScreen onStart={startLevel} onBack={goToMenu} />}

      {/* === СКИНЫ === */}
      {screen === 'skins' && <SkinSelectScreen onBack={goToMenu} />}

      {/* === ИГРА === */}
      {screen === 'playing' && (
        <GameCanvas
          key={gameKey}
          levelId={currentLevel}
          onBack={goToMenu}
          onRestart={restartLevel}
          onNextLevel={currentLevel < TOTAL_LEVELS ? nextLevel : goToMenu}
        />
      )}
    </div>
  );
}

// --- Animated Menu Screen ---

function MenuScreen({ onPlay, onLevelSelect, onSkins }: { onPlay: () => void; onLevelSelect: () => void; onSkins: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const menuStars = createStars(40);
    // Демо-сцена: куб бежит и перепрыгивает шипы
    const spikes = [200, 420, 580]; // X позиции шипов
    let cubeX = -30;
    let cubeY = GROUND_Y - ENTITY_SIZE;
    let cubeVy = 0;
    let cubeOnGround = true;
    let cubeRotation = 0;
    let frame = 0;
    let running = true;

    const loop = () => {
      if (!running) return;
      frame++;
      const demoSpeed = 2.5;

      // Куб движется вправо, зацикливается
      cubeX += demoSpeed;
      if (cubeX > CANVAS_WIDTH + 40) cubeX = -40;
      cubeRotation += demoSpeed * 2;

      // Автоматический прыжок перед шипами
      for (const spikeX of spikes) {
        if (cubeOnGround && cubeX > spikeX - 60 && cubeX < spikeX - 40) {
          cubeVy = JUMP_FORCE;
          cubeOnGround = false;
        }
      }

      // Гравитация
      cubeVy += 0.45;
      cubeY += cubeVy;
      if (cubeY >= GROUND_Y - ENTITY_SIZE) {
        cubeY = GROUND_Y - ENTITY_SIZE;
        cubeVy = 0;
        cubeOnGround = true;
      }

      // Рендер
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Звёзды
      for (const star of menuStars) {
        const sx = (star.x + frame * 0.2) % CANVAS_WIDTH;
        ctx.globalAlpha = 0.3 + Math.sin(star.blink + frame * 0.02) * 0.3;
        ctx.fillStyle = COLORS.star;
        ctx.fillRect(sx, star.y, star.size, star.size);
      }
      ctx.globalAlpha = 1;

      // Земля
      ctx.fillStyle = COLORS.ground;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.strokeStyle = COLORS.groundLine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Шипы
      for (const spikeX of spikes) {
        ctx.fillStyle = COLORS.spike;
        ctx.shadowColor = COLORS.spike;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(spikeX, GROUND_Y);
        ctx.lineTo(spikeX + 10, GROUND_Y - 18);
        ctx.lineTo(spikeX + 20, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Куб-персонаж
      ctx.save();
      ctx.translate(cubeX + ENTITY_SIZE / 2, cubeY + ENTITY_SIZE / 2);
      ctx.rotate((cubeRotation * Math.PI) / 180);
      ctx.shadowColor = COLORS.cubeGlow;
      ctx.shadowBlur = 15;
      ctx.fillStyle = COLORS.cube;
      ctx.fillRect(-ENTITY_SIZE / 2, -ENTITY_SIZE / 2, ENTITY_SIZE, ENTITY_SIZE);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.fillRect(-7, -5, 4, 4);
      ctx.fillRect(3, -5, 4, 4);
      ctx.fillRect(-5, 3, 10, 2);
      ctx.restore();

      // Трейл куба
      for (let ti = 1; ti <= 3; ti++) {
        ctx.globalAlpha = 0.1 / ti;
        ctx.fillStyle = COLORS.cube;
        const trailSize = ENTITY_SIZE * (1 - ti * 0.15);
        ctx.fillRect(
          cubeX - ti * demoSpeed * 3 + (ENTITY_SIZE - trailSize) / 2,
          cubeY + (ENTITY_SIZE - trailSize) / 2,
          trailSize, trailSize,
        );
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ display: 'block', borderRadius: 12 }}
      />
      {/* Оверлей с UI */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'monospace',
      }}>
        {/* Декоративные неоновые линии */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, #00ff88, #00ffcc, #3355ff, transparent)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, #3355ff, #00ffcc, #00ff88, transparent)',
        }} />

        <div style={{
          fontSize: 44, fontWeight: 'bold', color: '#00ff88',
          textShadow: '0 0 30px rgba(0,255,136,0.5), 0 0 60px rgba(0,255,136,0.2)',
          marginBottom: 4, letterSpacing: 4,
        }}>
          CUBE RUNNER
        </div>
        <div style={{
          fontSize: 16, color: '#00ffcc', marginBottom: 32,
          textShadow: '0 0 10px rgba(0,255,204,0.3)',
          letterSpacing: 6,
        }}>
          BATTLE DASH
        </div>

        <button onClick={onPlay} style={neonBtnStyle('#00aa66')}>
          Играть
        </button>
        <button onClick={onLevelSelect} style={neonBtnStyle('#3355ff')}>
          Выбор уровня
        </button>
        <button onClick={onSkins} style={neonBtnStyle('#cc8800')}>
          Скины
        </button>

        <div style={{
          color: '#6666aa', marginTop: 20, fontSize: 11,
          textAlign: 'center', lineHeight: '2',
        }}>
          Space/Tap = прыжок &nbsp;|&nbsp; X/Z/Shift = стрельба<br />
          1, 2, 3 = использовать powerup &nbsp;|&nbsp; Esc = пауза
        </div>
      </div>
    </div>
  );
}

// --- Level Select Screen ---

// Миниатюра-превью уровня
function LevelPreview({ levelId }: { levelId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = LEVELS[levelId];
    if (!data) return;

    const w = 120, h = 50;
    // Фон уровня
    ctx.fillStyle = data.backgroundColor ?? COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // Земля
    const groundY = 40;
    ctx.fillStyle = data.groundColor ?? COLORS.ground;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Маленькие шипы
    const spikeColor = COLORS.spike;
    ctx.fillStyle = spikeColor;
    for (let i = 0; i < 4; i++) {
      const sx = 25 + i * 25;
      ctx.beginPath();
      ctx.moveTo(sx, groundY);
      ctx.lineTo(sx + 3, groundY - 6);
      ctx.lineTo(sx + 6, groundY);
      ctx.closePath();
      ctx.fill();
    }

    // Маленький игрок (зелёный квадрат)
    ctx.fillStyle = COLORS.cube;
    ctx.shadowColor = COLORS.cubeGlow;
    ctx.shadowBlur = 4;
    ctx.fillRect(8, groundY - 8, 7, 7);
    ctx.shadowBlur = 0;

    // Силуэт босса (правый край)
    const bossColors: Record<number, string> = { 1: '#ff0044', 2: '#4a0066', 3: '#00aaff' };
    ctx.fillStyle = bossColors[levelId] ?? '#ff0044';
    ctx.shadowColor = bossColors[levelId] ?? '#ff0044';
    ctx.shadowBlur = 4;
    ctx.fillRect(100, groundY - 12, 12, 12);
    ctx.shadowBlur = 0;

    // Звёзды (несколько точек)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(
        (i * 17 + 5) % w,
        (i * 7 + 3) % (groundY - 5),
        1, 1,
      );
    }
  }, [levelId]);

  return <canvas ref={canvasRef} width={120} height={50} style={{ borderRadius: 6, display: 'block', marginBottom: 4 }} />;
}

function LevelSelectScreen({ onStart, onBack }: { onStart: (id: number) => void; onBack: () => void }) {
  const progress = loadProgress();

  return (
    <div
      style={{
        width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT, background: COLORS.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', borderRadius: 12, position: 'relative',
      }}
    >
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 28,
        textShadow: '0 0 15px rgba(255,255,255,0.2)',
      }}>
        Выбор уровня
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {LEVEL_INFO.map((info) => {
          const bossDefeated = progress.bossesDefeated.includes(info.id);
          const bestScore = progress.bestScores[info.id];
          const isCurrent = !bossDefeated;

          return (
            <button
              key={info.id}
              onClick={() => onStart(info.id)}
              style={{
                width: 160, height: 200, borderRadius: 16, padding: '8px 0 0 0',
                border: isCurrent
                  ? '2px solid #00ffcc'
                  : '2px solid #3355ff',
                background: isCurrent
                  ? 'rgba(0,255,204,0.08)'
                  : 'rgba(51,85,255,0.06)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                transition: 'box-shadow 0.2s, border-color 0.2s',
                boxShadow: isCurrent
                  ? '0 0 20px rgba(0,255,204,0.2)'
                  : '0 0 10px rgba(51,85,255,0.15)',
              }}
            >
              {/* Миниатюра-превью */}
              <LevelPreview levelId={info.id} />

              {/* Звезда за победу над боссом */}
              {bossDefeated && (
                <div style={{
                  position: 'absolute', top: 8, right: 10,
                  fontSize: 18, color: '#ffcc00',
                  textShadow: '0 0 8px rgba(255,204,0,0.6)',
                }}>
                  &#9733;
                </div>
              )}

              {/* Номер уровня */}
              <div style={{
                fontSize: 32, fontWeight: 'bold',
                color: '#fff',
                marginBottom: 4,
              }}>
                {info.id}
              </div>

              {/* Имя уровня */}
              <div style={{
                fontSize: 12, color: '#aaa',
                marginBottom: 2,
              }}>
                {info.name}
              </div>

              {/* Имя босса */}
              <div style={{
                fontSize: 10, color: '#ff4466',
              }}>
                Boss: {info.bossName}
              </div>

              {/* Лучший Score */}
              {bestScore !== undefined && (
                <div style={{
                  fontSize: 10, color: '#00ff88', marginTop: 6,
                }}>
                  Best: {bestScore}
                </div>
              )}

              {/* Текущий (подсветка) */}
              {isCurrent && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                  background: '#00ffcc',
                  boxShadow: '0 0 8px #00ffcc',
                }} />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: 28, padding: '10px 28px', background: 'transparent',
          border: '1px solid #555', borderRadius: 8, color: '#888',
          cursor: 'pointer', fontFamily: 'monospace', fontSize: 14,
        }}
      >
        Назад
      </button>
    </div>
  );
}

// --- Skin Select Screen ---

const ALL_SKINS: SkinId[] = ['green', 'gold', 'blue', 'pink', 'white', 'orange'];

function SkinSelectScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());

  const handleSelect = (skinId: SkinId) => {
    if (!progress.unlockedSkins.includes(skinId)) return;
    setCurrentSkin(skinId);
    setProgress(loadProgress());
  };

  return (
    <div style={{
      width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT,
      background: COLORS.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', borderRadius: 12,
      fontFamily: 'monospace', position: 'relative',
    }}>
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24,
        textShadow: '0 0 15px rgba(255,255,255,0.2)',
      }}>
        Скины
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 500 }}>
        {ALL_SKINS.map((skinId) => {
          const unlocked = progress.unlockedSkins.includes(skinId);
          const isActive = progress.currentSkin === skinId;
          const color = SKIN_COLORS[skinId];
          const name = SKIN_NAMES[skinId];

          return (
            <button
              key={skinId}
              onClick={() => handleSelect(skinId)}
              style={{
                width: 80, height: 100, borderRadius: 12, padding: 0,
                border: isActive
                  ? '2px solid #00ffcc'
                  : unlocked
                    ? '2px solid #555'
                    : '2px solid #333',
                background: isActive
                  ? 'rgba(0,255,204,0.08)'
                  : 'rgba(30,30,30,0.5)',
                cursor: unlocked ? 'pointer' : 'default',
                fontFamily: 'monospace',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 0 15px rgba(0,255,204,0.3)' : 'none',
              }}
            >
              {/* Превью кубика */}
              <div style={{
                width: 36, height: 36, borderRadius: 4,
                background: unlocked ? color : '#444',
                boxShadow: unlocked ? `0 0 12px ${color}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6,
              }}>
                {!unlocked && (
                  <span style={{ fontSize: 16, color: '#666' }}>&#128274;</span>
                )}
                {unlocked && (
                  <div style={{ position: 'relative', width: 20, height: 20 }}>
                    <div style={{
                      position: 'absolute', left: 2, top: 4,
                      width: 4, height: 4, background: '#000', borderRadius: 1,
                    }} />
                    <div style={{
                      position: 'absolute', right: 2, top: 4,
                      width: 4, height: 4, background: '#000', borderRadius: 1,
                    }} />
                    <div style={{
                      position: 'absolute', left: 4, bottom: 3,
                      width: 12, height: 2, background: '#000', borderRadius: 1,
                    }} />
                  </div>
                )}
              </div>

              {/* Имя скина */}
              <div style={{
                fontSize: 10, color: unlocked ? '#ccc' : '#555',
                fontWeight: isActive ? 'bold' : 'normal',
              }}>
                {name}
              </div>

              {/* Метка "активен" */}
              {isActive && (
                <div style={{
                  fontSize: 8, color: '#00ffcc', marginTop: 2,
                }}>
                  &#9679;
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: 24, padding: '10px 28px', background: 'transparent',
          border: '1px solid #555', borderRadius: 8, color: '#888',
          cursor: 'pointer', fontFamily: 'monospace', fontSize: 14,
        }}
      >
        Назад
      </button>
    </div>
  );
}
