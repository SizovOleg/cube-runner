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
import { Cage } from '@entities/Cage';
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

const LEVELS: Record<number, LevelData> = { 1: level1, 2: level2, 3: level3, 4: level4, 5: level5 };
const TOTAL_LEVELS = 5;
const LEVEL_INFO = [
  { id: 1, name: 'Neon City' },
  { id: 2, name: 'Cyber Sewer' },
  { id: 3, name: 'Ice Citadel' },
  { id: 4, name: 'Volcanic Forge' },
  { id: 5, name: 'Digital Core' },
];

// --- Types ---

interface Star { x: number; y: number; size: number; blink: number }
interface Bullet { x: number; y: number; width: number; height: number }
interface EnemyBullet { x: number; y: number; vx: number; width: number; height: number }
interface BombProjectile { x: number; y: number; vx: number; vy: number; width: number; height: number }
interface DeathInfo { score: number; kills: number }
interface LevelCompleteInfo { score: number; kills: number; coinsCollected: number }
interface LiveCoin { x: number; y: number; collected: boolean }
// Мутабельная копия ObstacleData для движущихся платформ
interface MovingObstacle { x: number; y: number; baseX: number; baseY: number; width: number; height: number; type: string; moveRange: number; moveSpeed: number; moveAxis: 'x' | 'y'; dir: number }

// Падающий блок (runtime)
type FallingBlockState = 'idle' | 'warning' | 'falling' | 'landed';
interface FallingBlock {
  x: number; y: number; baseY: number;
  width: number; height: number;
  state: FallingBlockState;
  warningTimer: number;   // отсчёт до падения (30 кадров = 0.5 сек)
  vy: number;
}

// Маятник (runtime)
interface Pendulum {
  x: number; y: number;       // точка крепления
  length: number;
  amplitude: number;
  phase: number;
  speed: number;
  ballRadius: number;
  // Вычисляемые (позиция шара)
  ballX: number; ballY: number;
}

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

function createFallingBlocks(level: LevelData): FallingBlock[] {
  return (level.fallingBlocks ?? []).map((d) => ({
    x: d.x, y: d.y, baseY: d.y,
    width: d.width, height: d.height,
    state: 'idle' as FallingBlockState,
    warningTimer: 0, vy: 0,
  }));
}

function createPendulums(level: LevelData): Pendulum[] {
  return (level.pendulums ?? []).map((d) => ({
    x: d.x, y: d.y,
    length: d.length, amplitude: d.amplitude,
    phase: d.phase, speed: d.speed,
    ballRadius: d.ballRadius,
    ballX: d.x, ballY: d.y + d.length,
  }));
}

// --- Drawing ---

/** Скруглённый rect (fallback) */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void };
  if (rr.roundRect) { rr.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawPlatform(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, color: string): void {
  // Тень под платформой
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  roundRect(ctx, px + 2, py + 3, pw, ph, 4);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Градиентная заливка (светлый → тёмный сверху вниз)
  const grad = ctx.createLinearGradient(px, py, px, py + ph);
  grad.addColorStop(0, color + 'ff');
  grad.addColorStop(1, color + '55');
  ctx.fillStyle = grad;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  roundRect(ctx, px, py, pw, ph, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Светлая линия по верхнему краю (highlight)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + 4, py + 1);
  ctx.lineTo(px + pw - 4, py + 1);
  ctx.stroke();
}

function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: readonly ObstacleData[], movingPlatforms: MovingObstacle[], camera: Camera): void {
  for (const obs of obstacles) {
    if (obs.type === 'moving_platform') continue;
    const ox = camera.worldToScreen(obs.x);
    if (ox < -100 || ox > CANVAS_WIDTH + 100) continue;

    if (obs.type === 'spike') {
      const tipX = ox + obs.width / 2;
      const tipY = obs.y - 5;
      const baseY = obs.y + obs.height;

      // Мягкое красное свечение у основания
      const radGrad = ctx.createRadialGradient(tipX, baseY, 0, tipX, baseY, obs.width);
      radGrad.addColorStop(0, COLORS.spike + '55');
      radGrad.addColorStop(1, COLORS.spike + '00');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(tipX, baseY, obs.width, 0, Math.PI * 2);
      ctx.fill();

      // Градиентный шип
      const spikeGrad = ctx.createLinearGradient(ox, baseY, tipX, tipY);
      spikeGrad.addColorStop(0, '#cc1133');
      spikeGrad.addColorStop(1, COLORS.spike);
      ctx.fillStyle = spikeGrad;
      ctx.shadowColor = COLORS.spike;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(ox + 2, baseY);                // чуть скруглённое основание
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(ox + obs.width - 2, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (obs.type === 'platform') {
      drawPlatform(ctx, ox, obs.y, obs.width, obs.height, COLORS.platform);
    }
  }

  // Движущиеся платформы
  for (const mp of movingPlatforms) {
    const mx = camera.worldToScreen(mp.x);
    if (mx < -100 || mx > CANVAS_WIDTH + 100) continue;
    drawPlatform(ctx, mx, mp.y, mp.width, mp.height, '#44aaff');

    // Стрелочки-индикаторы
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    if (mp.moveAxis === 'y') {
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


function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  for (const b of bullets) {
    // Хвост пули (3 затухающих копии)
    for (let ti = 1; ti <= 3; ti++) {
      ctx.globalAlpha = 0.15 / ti;
      ctx.fillStyle = COLORS.bullet;
      const tw = b.width * (1 - ti * 0.15);
      const tx = b.x - ti * 6;
      roundRect(ctx, tx, b.y + (b.height - tw * 0.6) / 2, tw, b.height * 0.6, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Основная пуля со скруглёнными углами + glow
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.bullet;
    roundRect(ctx, b.x, b.y, b.width, b.height, Math.min(b.height / 2, 3));
    ctx.fill();

    // Яркий блик в центре
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    roundRect(ctx, b.x + 1, b.y + 1, b.width - 2, b.height - 2, 2);
    ctx.fill();
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

function drawFallingBlocks(ctx: CanvasRenderingContext2D, blocks: FallingBlock[], camera: Camera, frame: number): void {
  for (const b of blocks) {
    const sx = camera.worldToScreen(b.x);
    if (sx < -120 || sx > CANVAS_WIDTH + 120) continue;

    // Мерцание-предупреждение
    if (b.state === 'warning') {
      const blink = Math.sin(frame * 0.4) > 0;
      ctx.globalAlpha = blink ? 1 : 0.4;
      ctx.fillStyle = '#ff3300';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 12;
    } else if (b.state === 'idle') {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#886644';
      ctx.shadowColor = '#aa7744';
      ctx.shadowBlur = 6;
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.state === 'falling' ? '#cc4422' : '#665533';
      ctx.shadowColor = '#884422';
      ctx.shadowBlur = 4;
    }

    drawPlatform(ctx, sx, b.y, b.width, b.height, ctx.fillStyle as string);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Стрелки вниз в состоянии warning
    if (b.state === 'warning' && Math.sin(frame * 0.4) > 0) {
      ctx.fillStyle = '#ff3300';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼', sx + b.width / 2, b.y - 4);
      ctx.textAlign = 'left';
    }
  }
}

function drawPendulums(ctx: CanvasRenderingContext2D, pendulums: Pendulum[], camera: Camera): void {
  for (const p of pendulums) {
    const px = camera.worldToScreen(p.x);
    const bx = camera.worldToScreen(p.ballX);
    if (bx < -80 || bx > CANVAS_WIDTH + 80) continue;

    // Цепь — пунктирная линия (сегменты)
    const segments = 8;
    ctx.strokeStyle = 'rgba(180,180,180,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(px, p.y);
    ctx.lineTo(bx, p.ballY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Точка крепления
    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath();
    ctx.arc(px, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    void segments;

    // Шар с шипами
    ctx.shadowColor = '#ff6622';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#cc3300';
    ctx.beginPath();
    ctx.arc(bx, p.ballY, p.ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Шипы (8 штук по кругу)
    ctx.fillStyle = '#ee4411';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sx2 = bx + Math.cos(a) * p.ballRadius;
      const sy2 = p.ballY + Math.sin(a) * p.ballRadius;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * (p.ballRadius - 2), p.ballY + Math.sin(a) * (p.ballRadius - 2));
      ctx.lineTo(sx2 + Math.cos(a) * 6, sy2 + Math.sin(a) * 6);
      ctx.lineTo(bx + Math.cos(a + 0.3) * (p.ballRadius - 2), p.ballY + Math.sin(a + 0.3) * (p.ballRadius - 2));
      ctx.closePath();
      ctx.fill();
    }
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
    const cages = (levelData.cages || []).map(c => new Cage(c.x, c.y, c.skinId));
    // Монеты уровня
    const levelCoins: LiveCoin[] = (levelData.coins || []).map(c => ({ x: c.x, y: c.y, collected: false }));
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
        renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, fallingBlocks, pendulums, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgColor, groundColor, groundLineColor, levelCoins, coinsCollected, sparks, binaryDrops);
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
        renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, fallingBlocks, pendulums, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgColor, groundColor, groundLineColor, levelCoins, coinsCollected, sparks, binaryDrops);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // === Проверка входа в босс-арену ===
      if (bossPhase === 'none' && player.x >= arenaX) {
        bossPhase = 'intro';
        bossIntroTimer = 0;
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
        } else if (inp.jump && !player.onGround && player.hasDoubleJump && player.doubleJumpAvailable) {
          player.doubleJump();
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
      renderFrame(ctx, frame, camera, stars, obstacles, movingPlatforms, fallingBlocks, pendulums, enemies, powerups, bullets, enemyBullets, bombs, player, particles, kills, muzzleFlash, boss, bossPhase, bossIntroTimer, arenaX, inp, bgColor, groundColor, groundLineColor, levelCoins, coinsCollected, sparks, binaryDrops);

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
      bgColor: string, groundColor: string, groundLineColor: string,
      liveCoins: LiveCoin[], sessionCoins: number,
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

      // === Фон: вертикальный градиент ===
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      // Чуть светлее вверху, тёмный внизу
      bgGrad.addColorStop(0, bgColor + 'cc');
      bgGrad.addColorStop(0.6, bgColor);
      bgGrad.addColorStop(1, '#000000');
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

      // === Земля: градиентная заливка ===
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, groundColor + 'ff');
      groundGrad.addColorStop(1, '#000000');
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

      // === HUD фон (полупрозрачный) ===
      if (bossPhase !== 'fight') {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        roundRect(ctx, 10, 8, 330, 52, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Score & Kills
      if (bossPhase !== 'fight') {
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 16px monospace';
        ctx.fillText('Score: ' + shownScore, 20, 28);
        ctx.fillText('Kills: ' + kills, 155, 28);
        // Монеты в HUD
        ctx.fillStyle = COIN_COLOR;
        ctx.shadowColor = COIN_GLOW;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(280, 22, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(String(sessionCoins), 292, 28);
        ctx.shadowBlur = 0;
      } else {
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 3;
        ctx.fillStyle = '#aaa';
        ctx.font = '13px monospace';
        ctx.fillText('Score: ' + shownScore + '  Kills: ' + kills, 20, GROUND_Y + 25);
        ctx.shadowBlur = 0;
      }

      // Иконки активных апгрейдов
      let upgradeIconX = CANVAS_WIDTH - 115;
      if (player.isMagnetActive()) {
        ctx.font = '14px monospace';
        ctx.fillStyle = '#44ddff';
        ctx.fillText('🧲', upgradeIconX, 70);
        upgradeIconX -= 22;
      }
      if (player.isSuperBullet()) {
        ctx.font = '14px monospace';
        ctx.fillStyle = '#ff44ff';
        ctx.fillText('⚡', upgradeIconX, 70);
        upgradeIconX -= 22;
      }
      if (player.hasDoubleJump) {
        ctx.font = '14px monospace';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('⬆', upgradeIconX, 70);
      }

      // HP: кружки с glow
      const hpY = bossPhase === 'fight' ? GROUND_Y + 35 : 42;
      const hpLabelY = bossPhase === 'fight' ? GROUND_Y + 48 : 53;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('HP:', 20, hpLabelY);
      ctx.shadowBlur = 0;
      for (let i = 0; i < player.maxHP; i++) {
        const alive = i < player.hp;
        ctx.fillStyle = alive ? skinColor : '#222';
        ctx.shadowColor = alive ? player.skinColor : 'transparent';
        ctx.shadowBlur = alive ? 10 : 0;
        ctx.beginPath();
        ctx.arc(66 + i * 22, hpY + 7, 7, 0, Math.PI * 2);
        ctx.fill();
        if (alive) {
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(63 + i * 22, hpY + 4, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      ctx.shadowBlur = 0;

      // Инвентарь powerups — скруглённые слоты
      for (let si = 0; si < 3; si++) {
        const slotX = CANVAS_WIDTH - 110 + si * 34;
        const slotY = 10;
        const slotPw = player.inventory[si];
        const slotColor = slotPw ? POWERUP_COLORS[slotPw] : '#333';
        // Фон слота
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#000';
        roundRect(ctx, slotX, slotY, 28, 28, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Обводка
        ctx.strokeStyle = slotColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = slotPw ? slotColor : 'transparent';
        ctx.shadowBlur = slotPw ? 8 : 0;
        roundRect(ctx, slotX, slotY, 28, 28, 5);
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (slotPw) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = POWERUP_COLORS[slotPw];
          roundRect(ctx, slotX + 1, slotY + 1, 26, 26, 4);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(POWERUP_LABELS[slotPw], slotX + 14, slotY + 18);
          ctx.textAlign = 'left';
        }
        ctx.fillStyle = '#777';
        ctx.font = '9px monospace';
        ctx.fillText(String(si + 1), slotX + 3, slotY + 26);
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
