import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from '@utils/constants';
import { Camera } from '@engine/Camera';

// Nebulae for Level 1 (pre-generated positions)
const NEBULAE = [
  { x: 200, y: 80, r: 90, color: 'rgba(255,0,102,0.07)' },
  { x: 600, y: 150, r: 120, color: 'rgba(0,255,136,0.05)' },
  { x: 1100, y: 60, r: 80, color: 'rgba(51,85,255,0.06)' },
  { x: 1700, y: 180, r: 100, color: 'rgba(255,0,200,0.05)' },
  { x: 2400, y: 100, r: 110, color: 'rgba(0,200,255,0.06)' },
];

export interface RainDrop { x: number; y: number; speed: number; len: number }
export interface Snowflake { x: number; y: number; size: number; speed: number; drift: number }
export interface Spark { x: number; y: number; speed: number; size: number; drift: number; color: string }
export interface BinaryDrop { x: number; y: number; speed: number; char: string; alpha: number }

export function createRainDrops(count: number): RainDrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * GROUND_Y,
    speed: 2 + Math.random() * 3,
    len: 6 + Math.random() * 6,
  }));
}

export function createSnowflakes(count: number): Snowflake[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * GROUND_Y,
    size: 1 + Math.random() * 2,
    speed: 0.3 + Math.random() * 0.7,
    drift: Math.random() * Math.PI * 2,
  }));
}

export function createSparks(count: number): Spark[] {
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

export function createBinaryDrops(count: number): BinaryDrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * GROUND_Y,
    speed: 1 + Math.random() * 2,
    char: Math.random() > 0.5 ? '1' : '0',
    alpha: 0.15 + Math.random() * 0.35,
  }));
}

/** Параллакс-слой: плавные холмы (дальний, 0.1x) */
export function drawFarHills(ctx: CanvasRenderingContext2D, camera: Camera, levelId: number): void {
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
export function drawMidDiamonds(ctx: CanvasRenderingContext2D, camera: Camera, frame: number, levelId: number): void {
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

export function drawAtmosphere(ctx: CanvasRenderingContext2D, frame: number, camera: Camera, levelId: number, rain: RainDrop[], snow: Snowflake[], sparks: Spark[], binaryDrops: BinaryDrop[]): void {
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

export function drawGroundTexture(ctx: CanvasRenderingContext2D, camera: Camera, levelId: number, groundLineColor: string): void {
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
