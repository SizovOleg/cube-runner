import { useState, useCallback, useRef, useEffect } from 'react';
import { GameScreen } from '@levels/types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, COLORS,
  BASE_SPEED, MAX_SPEED_BONUS, ENTITY_SIZE,
  BULLET_SPEED, SHOOT_COOLDOWN, JUMP_FORCE,
  POWERUP_COLORS, POWERUP_LABELS, PowerupType,
  LEVEL_BOSS_ARENA_WIDTH, BOSS_INTRO_DURATION,
  SKIN_COLORS, SKIN_NAMES, SkinId,
  COIN_RADIUS, COIN_COLOR, COIN_GLOW,
  UpgradeType, UPGRADES,
} from '@utils/constants';
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
import { LevelData, ObstacleData, RocketCorridorData } from '@levels/types';
import { loadProgress, saveLevelComplete, getMaxUnlockedLevel, unlockSkin, setCurrentSkin, getCurrentSkinColor, saveCoinsImmediate, buyUpgrade, activateUpgrade, deactivateUpgrade, consumeActiveUpgrades } from '@utils/storage';

// --- Конфиг уровней для экрана выбора ---
const LEVEL_INFO: Array<{ id: number; name: string; bossName: string }> = [
  { id: 1, name: 'Neon City',      bossName: 'Guardian'  },
  { id: 2, name: 'Cyber Sewer',    bossName: 'Crusher'   },
  { id: 3, name: 'Ice Citadel',    bossName: 'Frost King'},
  { id: 4, name: 'Volcanic Forge', bossName: 'Inferno'   },
  { id: 5, name: 'Digital Core',   bossName: 'Core'      },
];

// Карта уровней по ID
const LEVELS: Record<number, LevelData> = {
  1: level1,
  2: level2,
  3: level3,
  4: level4,
  5: level5,
};

const TOTAL_LEVELS = LEVEL_INFO.length;

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

/** Главная яркая кнопка (только «Играть» и «Next Level») */
function primaryBtnStyle(): React.CSSProperties {
  return {
    padding: '14px 32px', fontSize: 18, fontWeight: 'bold',
    border: 'none', borderRadius: 12, cursor: 'pointer', color: '#fff',
    background: 'linear-gradient(135deg, #00cc88, #00aa66)',
    boxShadow: '0 0 20px rgba(0,204,136,0.4)',
    margin: 8, fontFamily: 'monospace', minWidth: 200,
  };
}

/** Второстепенная кнопка меню — прозрачная с обводкой #00ffcc */
function neonBtnStyle(_bg?: string): React.CSSProperties {
  return {
    padding: '14px 32px', fontSize: 18, fontWeight: 'bold',
    border: '1.5px solid #00ffcc', borderRadius: 12, cursor: 'pointer', color: '#fff',
    background: 'rgba(255,255,255,0.08)',
    boxShadow: 'none',
    margin: 8, fontFamily: 'monospace', minWidth: 200,
  };
}

/** Маленькая второстепенная кнопка (Назад, навигация) */
function ghostBtnStyle(): React.CSSProperties {
  return {
    padding: '10px 24px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 14,
  };
}

/** Маленькая зелёная кнопка (Купить, Активировать) */
function buyBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 'bold',
    border: 'none', cursor: enabled ? 'pointer' : 'default',
    background: enabled ? 'linear-gradient(135deg, #00cc88, #00aa66)' : '#333',
    color: enabled ? '#fff' : '#555',
    boxShadow: enabled ? '0 0 8px rgba(0,204,136,0.4)' : 'none',
    fontFamily: 'monospace',
  };
}

// --- Fullscreen & Scale ---

/** Читает CSS env() safe-area-inset-* в пикселях через временный DOM-элемент */
function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:0', 'height:0', 'visibility:hidden',
    'padding-top:env(safe-area-inset-top)',
    'padding-bottom:env(safe-area-inset-bottom)',
    'padding-left:env(safe-area-inset-left)',
    'padding-right:env(safe-area-inset-right)',
  ].join(';');
  document.body.appendChild(el);
  const style = getComputedStyle(el);
  const result = {
    top: parseFloat(style.paddingTop) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
    right: parseFloat(style.paddingRight) || 0,
  };
  document.body.removeChild(el);
  return result;
}

function useScaleFactor(): number {
  const calcScale = () => {
    const insets = getSafeAreaInsets();
    const availW = window.innerWidth - insets.left - insets.right;
    const availH = window.innerHeight - insets.top - insets.bottom;
    return Math.min(availW / CANVAS_WIDTH, availH / CANVAS_HEIGHT);
  };
  const [scale, setScale] = useState(calcScale);
  useEffect(() => {
    const update = () => setScale(calcScale());
    window.addEventListener('resize', update);
    // Пересчёт при изменении ориентации (iOS)
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return scale;
}

function requestFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

function exitFullscreen(): void {
  const doc = document as Document & { webkitExitFullscreen?: () => void };
  if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
}

function useIsFullscreen(): boolean {
  const isFS = () => !!(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
  const [fullscreen, setFullscreen] = useState(isFS);
  useEffect(() => {
    const update = () => setFullscreen(isFS());
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  }, []);
  return fullscreen;
}

function ScaledContainer({ children }: { children: React.ReactNode }) {
  const scale = useScaleFactor();
  const isFullscreen = useIsFullscreen();
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    // Плавное появление при монтировании (0 → 1 за 300мс)
    const t = setTimeout(() => setOpacity(1), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      opacity,
      transition: 'opacity 0.3s ease',
      // Отступ сверху: safe-area notch, минимум 10px
      marginTop: 'max(env(safe-area-inset-top), 10px)',
      position: 'relative',
    }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        flexShrink: 0,
        position: 'relative',
      }}>
        {children}
      </div>
      {/* Кнопка выхода из полноэкранного режима — видна только в fullscreen */}
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          title="Exit fullscreen"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 6,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: 16,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            fontFamily: 'monospace',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
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
interface Spark { x: number; y: number; speed: number; size: number; drift: number; color: string }
interface BinaryDrop { x: number; y: number; speed: number; char: string; alpha: number }

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

function createSparks(count: number): Spark[] {
  const colors = ['#ff6600', '#ff8800', '#ffaa00', '#ff4400'];
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: GROUND_Y - Math.random() * GROUND_Y,
    speed: 0.4 + Math.random() * 1.2,
    size: 1 + Math.random() * 2,
    drift: Math.random() * Math.PI * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

function createBinaryDrops(count: number): BinaryDrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * GROUND_Y,
    speed: 1 + Math.random() * 2,
    char: Math.random() > 0.5 ? '1' : '0',
    alpha: 0.15 + Math.random() * 0.35,
  }));
}

/** Параллакс-слой: плавные холмы (дальний, 0.1x) */
function drawFarHills(ctx: CanvasRenderingContext2D, camera: Camera, levelId: number): void {
  const hillColor = levelId === 5 ? 'rgba(0,30,80,0.18)' : levelId === 4 ? 'rgba(80,20,0,0.20)' : levelId === 3 ? 'rgba(40,80,160,0.18)' : levelId === 2 ? 'rgba(20,80,30,0.18)' : 'rgba(30,20,100,0.18)';
  const offsetX = camera.x * 0.1;
  ctx.fillStyle = hillColor;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let sx = 0; sx <= CANVAS_WIDTH; sx += 4) {
    const wx = sx + offsetX;
    const hy = GROUND_Y - 60 - Math.sin(wx * 0.003) * 50 - Math.sin(wx * 0.007 + 1.2) * 30;
    if (sx === 0) ctx.moveTo(sx, hy);
    else ctx.lineTo(sx, hy);
  }
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

/** Параллакс-слой: плывущие ромбы (средний, 0.3x) */
function drawMidDiamonds(ctx: CanvasRenderingContext2D, camera: Camera, frame: number, levelId: number): void {
  const color = levelId === 5 ? 'rgba(0,80,255,0.06)' : levelId === 4 ? 'rgba(255,80,0,0.07)' : levelId === 3 ? 'rgba(80,160,255,0.06)' : levelId === 2 ? 'rgba(50,200,80,0.06)' : 'rgba(80,60,220,0.07)';
  const offsetX = camera.x * 0.3;
  const diamonds = [
    { bx: 100, by: 80,  s: 55 },
    { bx: 320, by: 140, s: 40 },
    { bx: 550, by: 60,  s: 70 },
    { bx: 750, by: 120, s: 45 },
    { bx: 950, by: 90,  s: 60 },
  ];
  ctx.fillStyle = color;
  for (const d of diamonds) {
    const dx = ((d.bx - offsetX % 1100 + 1100) % 1100);
    const dy = d.by + Math.sin(frame * 0.008 + d.bx) * 10;
    ctx.beginPath();
    ctx.moveTo(dx, dy - d.s);
    ctx.lineTo(dx + d.s * 0.6, dy);
    ctx.lineTo(dx, dy + d.s);
    ctx.lineTo(dx - d.s * 0.6, dy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawAtmosphere(ctx: CanvasRenderingContext2D, frame: number, camera: Camera, levelId: number, rain: RainDrop[], snow: Snowflake[], sparks: Spark[], binaryDrops: BinaryDrop[]): void {
  // Дальний слой: холмы
  drawFarHills(ctx, camera, levelId);
  // Средний слой: ромбы
  drawMidDiamonds(ctx, camera, frame, levelId);

  if (levelId === 1) {
    // Неоновые туманности — полупрозрачные размытые круги с параллаксом 0.1x
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
      if (drop.y > GROUND_Y) { drop.y = -10; drop.x = Math.random() * CANVAS_WIDTH; }
      ctx.fillRect(drop.x, drop.y, 2, drop.len);
    }
  } else if (levelId === 3) {
    // Снежинки
    for (const sf of snow) {
      sf.y += sf.speed;
      sf.x += Math.sin(frame * 0.02 + sf.drift) * 0.3;
      if (sf.y > GROUND_Y) { sf.y = -5; sf.x = Math.random() * CANVAS_WIDTH; }
      ctx.globalAlpha = 0.4 + sf.size * 0.1;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (levelId === 4) {
    // Поднимающиеся искры — оранжевые точки летят вверх
    for (const spark of sparks) {
      spark.y -= spark.speed;
      spark.x += Math.sin(frame * 0.03 + spark.drift) * 0.4;
      if (spark.y < 0) { spark.y = GROUND_Y; spark.x = Math.random() * CANVAS_WIDTH; }
      ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1 + spark.drift) * 0.3;
      ctx.fillStyle = spark.color;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  } else if (levelId === 5) {
    // Падающий бинарный код — голубые 0 и 1
    ctx.font = '10px monospace';
    for (const drop of binaryDrops) {
      drop.y += drop.speed;
      if (drop.y > GROUND_Y) {
        drop.y = -10;
        drop.x = Math.random() * CANVAS_WIDTH;
        drop.char = Math.random() > 0.5 ? '1' : '0';
      }
      ctx.globalAlpha = drop.alpha;
      ctx.fillStyle = '#00aaff';
      ctx.fillText(drop.char, drop.x, drop.y);
    }
    ctx.globalAlpha = 1;
  }

  // Пульсация фона каждые ~2 сек (120 кадров)
  const pulse = Math.sin(frame * (Math.PI / 120)) * 0.5 + 0.5; // 0..1 каждые 120 кадров
  ctx.globalAlpha = pulse * 0.025;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);
  ctx.globalAlpha = 1;
}

function drawGroundTexture(ctx: CanvasRenderingContext2D, camera: Camera, levelId: number, groundLineColor: string): void {
  // Вертикальные полосы-сетка с градиентной прозрачностью (яркие вверху, исчезают внизу)
  const gridStart = Math.floor(camera.x / 40) * 40;
  ctx.strokeStyle = groundLineColor;
  ctx.lineWidth = 1;
  for (let wx = gridStart; wx < gridStart + CANVAS_WIDTH + 80; wx += 40) {
    const sx = wx - camera.x;
    const grad = ctx.createLinearGradient(sx, GROUND_Y, sx, CANVAS_HEIGHT);
    grad.addColorStop(0, groundLineColor + '55');
    grad.addColorStop(1, groundLineColor + '00');
    ctx.strokeStyle = grad as unknown as string;
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y);
    ctx.lineTo(sx, CANVAS_HEIGHT);
    ctx.stroke();
  }

  // Декорации по верхнему краю земли
  const decoStart = Math.floor(camera.x / 40) * 40;
  for (let wx = decoStart; wx < decoStart + CANVAS_WIDTH + 80; wx += 40) {
    const sx = wx - camera.x;
    const seed = (wx * 3 + 7) % 100;
    if (seed > 60) continue;

    if (levelId === 1) {
      ctx.fillStyle = '#33cc44';
      const h = 5 + (seed % 4);
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 3, GROUND_Y - h);
      ctx.lineTo(sx + 6, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    } else if (levelId === 2) {
      ctx.fillStyle = '#22aa33';
      const h = 4 + (seed % 3);
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 3, GROUND_Y + h);
      ctx.lineTo(sx + 6, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    } else if (levelId === 3) {
      ctx.fillStyle = '#88ccff';
      const h = 5 + (seed % 5);
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 3, GROUND_Y - h);
      ctx.lineTo(sx + 6, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    } else if (levelId === 4) {
      // Языки пламени — оранжевые треугольники
      const h = 6 + (seed % 7);
      ctx.fillStyle = seed % 3 === 0 ? '#ff8800' : seed % 3 === 1 ? '#ff4400' : '#ffaa00';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 4, GROUND_Y - h);
      ctx.lineTo(sx + 8, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (levelId === 5) {
      // Цифровые пиксели
      ctx.fillStyle = 'rgba(0,150,255,0.3)';
      const h = 3 + (seed % 4);
      ctx.fillRect(sx, GROUND_Y - h, 4, h);
    }
  }
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

/**
 * Возвращает, должны ли шипы в данном сегменте быть сверху (true) или снизу (false).
 * Сегмент = 300px. Используем детерминированный hash по мировой X.
 */
function corridorSpikesOnTop(wx: number): boolean {
  const seg = Math.floor(wx / 300);
  // Простой числовой hash
  const h = (seg * 2654435761) >>> 0;
  return (h & 1) === 0;
}

/** Вычисляет центр зазора и его размер для заданной мировой координаты */
function getCorridorGap(wx: number, frame: number, corridor: RocketCorridorData): { center: number; size: number } {
  const center = 170 + Math.sin(wx * 0.004) * 80;
  const size = corridor.gapSizeFunc === 'variable'
    ? 120 + Math.sin(wx * 0.0025 + frame * 0.01) * 30
    : 120;
  return { center, size };
}

function drawCorridor(ctx: CanvasRenderingContext2D, corridor: RocketCorridorData, camera: Camera, frame: number): void {
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

    const { center: gapCenter, size: gapSize } = getCorridorGap(wx, frame, corridor);
    const ceilingY = gapCenter - gapSize / 2;
    const floorY = gapCenter + gapSize / 2;

    // Стена сверху (тёмная)
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(sx, 0, 42, ceilingY);

    // Стена снизу (тёмная)
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(sx, floorY, 42, GROUND_Y - floorY);

    // Шипы только с одной стороны (детерминированно по сегменту 300px)
    ctx.fillStyle = COLORS.spike;
    ctx.shadowColor = COLORS.spike;
    ctx.shadowBlur = 6;
    if (corridorSpikesOnTop(wx)) {
      // Шипы с потолка (вниз)
      ctx.beginPath();
      ctx.moveTo(sx, ceilingY - 5);
      ctx.lineTo(sx + 20, ceilingY + 15);
      ctx.lineTo(sx + 40, ceilingY - 5);
      ctx.closePath();
      ctx.fill();
    } else {
      // Шипы с пола (вверх)
      ctx.beginPath();
      ctx.moveTo(sx, floorY + 5);
      ctx.lineTo(sx + 20, floorY - 15);
      ctx.lineTo(sx + 40, floorY + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // === Движущиеся шипы (уровень 1) ===
  if (corridor.movingSpikes) {
    for (const ms of corridor.movingSpikes) {
      const wx = corridor.startX + ms.offsetX;
      const sx = camera.worldToScreen(wx);
      if (sx < -30 || sx > CANVAS_WIDTH + 30) continue;

      const { center: gapCenter, size: gapSize } = getCorridorGap(wx, frame, corridor);
      // Шип двигается синусоидой внутри зазора
      const spikeY = gapCenter + Math.sin(frame * ms.speed + ms.phase) * ms.amplitude;
      const spikeSize = 18;

      ctx.fillStyle = '#ff6600';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(sx - spikeSize, spikeY);
      ctx.lineTo(sx, spikeY - spikeSize);
      ctx.lineTo(sx + spikeSize, spikeY);
      ctx.lineTo(sx, spikeY + spikeSize);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Проверка: если шип у края — не выходит за стены
      const halfGap = gapSize / 2;
      const ceilingY = gapCenter - halfGap;
      const floorY = gapCenter + halfGap;
      if (spikeY - spikeSize < ceilingY || spikeY + spikeSize > floorY) {
        // Визуальный клип не нужен — шипы стен перекрывают
      }
    }
  }

  // === Вращающиеся блоки (уровень 3) ===
  if (corridor.rotatingBlocks) {
    for (const rb of corridor.rotatingBlocks) {
      const wx = corridor.startX + rb.offsetX;
      const sx = camera.worldToScreen(wx);
      if (sx < -40 || sx > CANVAS_WIDTH + 40) continue;

      const { center: gapCenter, size: gapSize } = getCorridorGap(wx, frame, corridor);
      const blockY = gapCenter + rb.gapOffset * (gapSize / 2 - rb.size);
      const angle = frame * 0.05;
      const half = rb.size / 2;

      ctx.save();
      ctx.translate(sx, blockY);
      ctx.rotate(angle);
      ctx.fillStyle = '#aa44ff';
      ctx.shadowColor = '#aa44ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(-half, -half, rb.size, rb.size);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#cc88ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-half, -half, rb.size, rb.size);
      ctx.restore();
    }
  }

  // === Монеты в коридоре ===
  if (corridor.coins) {
    for (const coin of corridor.coins) {
      const wx = corridor.startX + coin.offsetX;
      const sx = camera.worldToScreen(wx);
      if (sx < -20 || sx > CANVAS_WIDTH + 20) continue;

      const { center: gapCenter, size: gapSize } = getCorridorGap(wx, frame, corridor);
      const coinY = gapCenter + coin.gapOffset * (gapSize / 2 - 12);

      ctx.fillStyle = '#ffdd00';
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sx, coinY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', sx, coinY + 3);
      ctx.textAlign = 'left';
    }
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

  const goToShop = useCallback(() => {
    setScreen('shop');
  }, []);

  const goToUpgrades = useCallback(() => {
    setScreen('upgrades');
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
      {screen === 'menu' && <ScaledContainer><MenuScreen onPlay={handlePlay} onLevelSelect={goToLevelSelect} onSkins={goToSkins} onShop={goToShop} /></ScaledContainer>}

      {/* === ВЫБОР УРОВНЯ === */}
      {screen === 'levelSelect' && <ScaledContainer><LevelSelectScreen onStart={startLevel} onBack={goToMenu} onUpgrades={goToUpgrades} /></ScaledContainer>}

      {/* === СКИНЫ === */}
      {screen === 'skins' && <ScaledContainer><SkinSelectScreen onBack={goToMenu} /></ScaledContainer>}

      {/* === МАГАЗИН === */}
      {screen === 'shop' && <ScaledContainer><ShopScreen onBack={goToMenu} /></ScaledContainer>}

      {/* === АПГРЕЙДЫ === */}
      {screen === 'upgrades' && <ScaledContainer><UpgradesScreen onBack={goToLevelSelect} /></ScaledContainer>}

      {/* === ИГРА === */}
      {screen === 'playing' && (
        <ScaledContainer>
          <GameCanvas
            key={gameKey}
            levelId={currentLevel}
            onBack={goToMenu}
            onRestart={restartLevel}
            onNextLevel={currentLevel < TOTAL_LEVELS ? nextLevel : goToMenu}
          />
        </ScaledContainer>
      )}
    </div>
  );
}

// --- Animated Menu Screen ---

function MenuScreen({ onPlay, onLevelSelect, onSkins, onShop }: { onPlay: () => void; onLevelSelect: () => void; onSkins: () => void; onShop: () => void }) {
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

      // --- Рендер ---

      // Фон: вертикальный градиент
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#0a1a14');
      bgGrad.addColorStop(0.6, COLORS.bg);
      bgGrad.addColorStop(1, '#000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Параллакс-холмы (0.05x)
      const hillOffset = frame * 0.3;
      ctx.beginPath();
      for (let sx = 0; sx <= CANVAS_WIDTH + 80; sx += 4) {
        const wx = sx + hillOffset;
        const hy = GROUND_Y - 40 - Math.sin(wx * 0.008) * 35 - Math.sin(wx * 0.019 + 1) * 20;
        if (sx === 0) ctx.moveTo(sx, hy); else ctx.lineTo(sx, hy);
      }
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.lineTo(0, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,255,136,0.06)';
      ctx.fill();

      // Звёзды с параллаксом
      for (const star of menuStars) {
        const sx = ((star.x - frame * 0.4) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
        ctx.globalAlpha = 0.25 + Math.sin(star.blink + frame * 0.02) * 0.25;
        ctx.fillStyle = COLORS.star;
        ctx.beginPath();
        ctx.arc(sx, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Земля с градиентом
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, COLORS.ground);
      groundGrad.addColorStop(1, '#050a08');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Линия земли — 3 слоя свечения
      const glowLayers = [
        { w: 5, alpha: 0.12 }, { w: 2, alpha: 0.4 }, { w: 1, alpha: 0.9 },
      ];
      for (const gl of glowLayers) {
        ctx.strokeStyle = COLORS.groundLine;
        ctx.lineWidth = gl.w;
        ctx.globalAlpha = gl.alpha;
        ctx.shadowColor = COLORS.groundLine;
        ctx.shadowBlur = gl.w === 1 ? 6 : 0;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Шипы с градиентом и glow
      for (const spikeX of spikes) {
        const sGrad = ctx.createLinearGradient(spikeX, GROUND_Y, spikeX + 10, GROUND_Y - 18);
        sGrad.addColorStop(0, COLORS.spike + '99');
        sGrad.addColorStop(1, COLORS.spike);
        ctx.fillStyle = sGrad;
        ctx.shadowColor = COLORS.spike;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(spikeX, GROUND_Y);
        ctx.lineTo(spikeX + 10, GROUND_Y - 18);
        ctx.lineTo(spikeX + 20, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Трейл куба
      for (let ti = 3; ti >= 1; ti--) {
        const t = (4 - ti) / 4;
        ctx.globalAlpha = t * t * 0.18;
        const trailSize = ENTITY_SIZE * (0.4 + t * 0.5);
        const tx = cubeX - ti * demoSpeed * 2.5 + (ENTITY_SIZE - trailSize) / 2;
        const ty = cubeY + (ENTITY_SIZE - trailSize) / 2;
        ctx.fillStyle = COLORS.cube;
        ctx.beginPath();
        if ((ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void }).roundRect) {
          (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(tx, ty, trailSize, trailSize, 3);
        } else {
          ctx.rect(tx, ty, trailSize, trailSize);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Куб-персонаж с rounded corners и двойным glow
      const hw = ENTITY_SIZE / 2;
      const hh = ENTITY_SIZE / 2;
      ctx.save();
      ctx.translate(cubeX + hw, cubeY + hh);
      ctx.rotate((cubeRotation * Math.PI) / 180);
      // Внешнее свечение
      ctx.shadowColor = COLORS.cube;
      ctx.shadowBlur = 25;
      ctx.fillStyle = COLORS.cube + '44';
      if ((ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void }).roundRect) {
        (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(-hw - 3, -hh - 3, ENTITY_SIZE + 6, ENTITY_SIZE + 6, 6);
      } else { ctx.rect(-hw - 3, -hh - 3, ENTITY_SIZE + 6, ENTITY_SIZE + 6); }
      ctx.fill();
      // Тело
      ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS.cube;
      if ((ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void }).roundRect) {
        (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(-hw, -hh, ENTITY_SIZE, ENTITY_SIZE, 4);
      } else { ctx.rect(-hw, -hh, ENTITY_SIZE, ENTITY_SIZE); }
      ctx.fill();
      ctx.shadowBlur = 0;
      // Блик
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#fff';
      if ((ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void }).roundRect) {
        (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(-hw + 2, -hh + 2, ENTITY_SIZE - 4, 6, 3);
      } else { ctx.rect(-hw + 2, -hh + 2, ENTITY_SIZE - 4, 6); }
      ctx.fill();
      ctx.globalAlpha = 1;
      // Глаза
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, -5, 5, 5);
      ctx.fillRect(3, -5, 5, 5);
      ctx.fillRect(-5, 3, 10, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-7, -5, 2, 2);
      ctx.fillRect(4, -5, 2, 2);
      ctx.restore();

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
        {/* Кнопка полноэкранного режима */}
        <button
          onClick={requestFullscreen}
          title="Fullscreen"
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.4)', border: '1px solid #555',
            borderRadius: 6, color: '#888', cursor: 'pointer',
            padding: '4px 8px', fontSize: 18, fontFamily: 'monospace',
            lineHeight: 1,
          }}
        >
          ⛶
        </button>

        {/* Декоративные неоновые линии */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #00ffcc, transparent)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #00ffcc, transparent)',
        }} />

        <div style={{
          fontSize: 44, fontWeight: 'bold', color: '#ffffff',
          textShadow: '0 0 30px rgba(0,255,204,0.6), 0 0 60px rgba(0,255,204,0.2)',
          marginBottom: 4, letterSpacing: 4,
        }}>
          CUBE RUNNER
        </div>
        <div style={{
          fontSize: 15, color: '#00ffcc', marginBottom: 32,
          textShadow: '0 0 10px rgba(0,255,204,0.4)',
          letterSpacing: 4,
        }}>
          BATTLE DASH
        </div>

        <button onClick={onPlay} style={primaryBtnStyle()}>
          Играть
        </button>
        <button onClick={onLevelSelect} style={neonBtnStyle()}>
          Выбор уровня
        </button>
        <button onClick={onShop} style={neonBtnStyle()}>
          Магазин
        </button>
        <button onClick={onSkins} style={neonBtnStyle()}>
          Скины
        </button>

        <div style={{
          color: 'rgba(255,255,255,0.3)', marginTop: 20, fontSize: 11,
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

function LevelSelectScreen({ onStart, onBack, onUpgrades }: { onStart: (id: number) => void; onBack: () => void; onUpgrades: () => void }) {
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
                border: '1.5px solid #00ffcc',
                background: 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                transition: 'box-shadow 0.2s',
                boxShadow: isCurrent
                  ? '0 0 20px rgba(0,255,204,0.25)'
                  : '0 0 8px rgba(0,255,204,0.08)',
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
                fontSize: 12, color: '#00ffcc',
                marginBottom: 2,
              }}>
                {info.name}
              </div>

              {/* Имя босса */}
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.4)',
              }}>
                Boss: {info.bossName}
              </div>

              {/* Лучший Score */}
              {bestScore !== undefined && (
                <div style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6,
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

      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button
          onClick={onUpgrades}
          style={{
            padding: '10px 24px', background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid #00ffcc', borderRadius: 8, color: '#fff',
            cursor: 'pointer', fontFamily: 'monospace', fontSize: 14,
          }}
        >
          ⚡ Усиления
        </button>
        <button onClick={onBack} style={ghostBtnStyle()}>
          Назад
        </button>
      </div>
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

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 24 }}>
        Назад
      </button>
    </div>
  );
}

// --- Shop Screen ---

function ShopScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());

  const handleBuy = (id: UpgradeType, cost: number) => {
    const ok = buyUpgrade(id, cost);
    if (ok) setProgress(loadProgress());
  };

  return (
    <div style={{
      width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT,
      background: COLORS.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', borderRadius: 12,
      fontFamily: 'monospace', position: 'relative',
    }}>
      {/* Заголовок */}
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8,
        textShadow: '0 0 20px rgba(0,255,204,0.4)',
      }}>
        Магазин
      </div>

      {/* Баланс монет */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28,
        background: 'rgba(255,215,0,0.08)', borderRadius: 20, padding: '6px 18px',
        border: '1px solid rgba(255,215,0,0.3)',
      }}>
        <span style={{ fontSize: 18 }}>🪙</span>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#ffd700' }}>
          {progress.coins}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,215,0,0.6)' }}>монет</span>
      </div>

      {/* Карточки апгрейдов */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
        {UPGRADES.map((upg) => {
          const owned = progress.ownedUpgrades?.[upg.id] ?? 0;
          const canBuy = progress.coins >= upg.cost;

          return (
            <div
              key={upg.id}
              style={{
                width: 120, borderRadius: 14, padding: '14px 10px',
                border: '1.5px solid #00ffcc',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 4 }}>{upg.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', marginBottom: 4, textAlign: 'center' }}>
                {upg.name}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 8, lineHeight: '1.4' }}>
                {upg.desc}
              </div>
              {/* Количество в инвентаре */}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                В запасе: <span style={{ color: '#fff', fontWeight: 'bold' }}>{owned}</span>
              </div>
              {/* Кнопка купить */}
              <button
                onClick={() => handleBuy(upg.id, upg.cost)}
                disabled={!canBuy}
                style={buyBtnStyle(canBuy)}
              >
                <span style={{ color: '#ffd700' }}>🪙</span> {upg.cost}
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 28 }}>
        Назад
      </button>
    </div>
  );
}

// --- Upgrades Screen ---

function UpgradesScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());

  const handleActivate = (id: UpgradeType) => {
    activateUpgrade(id);
    setProgress(loadProgress());
  };

  const handleDeactivate = (id: UpgradeType) => {
    deactivateUpgrade(id);
    setProgress(loadProgress());
  };

  const activeUpgrades = progress.activeUpgrades ?? [];

  return (
    <div style={{
      width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT,
      background: COLORS.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', borderRadius: 12,
      fontFamily: 'monospace', position: 'relative',
    }}>
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 6,
        textShadow: '0 0 20px rgba(0,255,204,0.4)',
      }}>
        Усиления
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24, textAlign: 'center' }}>
        Активируй перед началом уровня.<br />
        Активированное усиление будет потрачено.
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
        {UPGRADES.map((upg) => {
          const owned = progress.ownedUpgrades?.[upg.id] ?? 0;
          const isActive = activeUpgrades.includes(upg.id);

          return (
            <div
              key={upg.id}
              style={{
                width: 120, borderRadius: 14, padding: '14px 10px',
                border: `1.5px solid ${isActive ? '#00ffcc' : 'rgba(0,255,204,0.3)'}`,
                background: isActive ? 'rgba(0,255,204,0.1)' : 'rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                boxShadow: isActive ? '0 0 18px rgba(0,255,204,0.2)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 4 }}>{upg.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', marginBottom: 4, textAlign: 'center' }}>
                {upg.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                В запасе: <span style={{ color: '#fff', fontWeight: 'bold' }}>{owned}</span>
              </div>

              {/* Активировать / Деактивировать */}
              {isActive ? (
                <button
                  onClick={() => handleDeactivate(upg.id)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 'bold',
                    border: '1px solid #00ffcc', cursor: 'pointer',
                    background: 'transparent', color: '#00ffcc',
                    fontFamily: 'monospace',
                  }}
                >
                  ✓ Активно
                </button>
              ) : (
                <button
                  onClick={() => handleActivate(upg.id)}
                  disabled={owned === 0}
                  style={buyBtnStyle(owned > 0)}
                >
                  {owned > 0 ? 'Активировать' : 'Нет'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activeUpgrades.length > 0 && (
        <div style={{
          marginTop: 20, padding: '8px 16px', background: 'rgba(0,255,204,0.08)',
          border: '1px solid rgba(0,255,204,0.3)', borderRadius: 10, fontSize: 12, color: '#00ffcc',
        }}>
          Активировано: {activeUpgrades.map((id) => {
            const upg = UPGRADES.find((u) => u.id === id);
            return upg ? `${upg.icon} ${upg.name}` : id;
          }).join(', ')}
        </div>
      )}

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 20 }}>
        Назад к уровням
      </button>
    </div>
  );
}

