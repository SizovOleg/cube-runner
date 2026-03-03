import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from '@utils/constants';
import { Camera } from '@engine/Camera';

// ──────────── Types ────────────
export interface RainDrop { x: number; y: number; speed: number; len: number }
export interface Snowflake { x: number; y: number; size: number; speed: number; drift: number }
export interface Spark { x: number; y: number; speed: number; size: number; drift: number; color: string }
export interface BinaryDrop { x: number; y: number; speed: number; char: string; alpha: number }

// ──────────── Pre-generated Nebulae ────────────
const NEBULAE = [
  { x: 200, y: 80, r: 100, color: 'rgba(255,0,102,0.07)' },
  { x: 600, y: 150, r: 130, color: 'rgba(0,255,136,0.05)' },
  { x: 1100, y: 60, r: 90, color: 'rgba(51,85,255,0.06)' },
  { x: 1700, y: 180, r: 110, color: 'rgba(255,0,200,0.05)' },
  { x: 2400, y: 100, r: 120, color: 'rgba(0,200,255,0.06)' },
  { x: 3200, y: 70, r: 80, color: 'rgba(255,68,170,0.04)' },
];

// ──────────── Floating Geometry (background shapes) ────────────
interface BgShape {
  x: number; y: number; size: number; rotation: number;
  rotSpeed: number; parallax: number; sides: number; color: string; alpha: number;
}

const BG_SHAPES: BgShape[] = Array.from({ length: 14 }, (_, i) => {
  const colors = ['0,255,204', '255,68,170', '0,136,255', '255,215,0', '170,80,255', '255,100,50'];
  return {
    x: i * 280 + Math.random() * 200,
    y: 15 + Math.random() * (GROUND_Y - 60),
    size: 30 + Math.random() * 90,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.01,
    parallax: 0.05 + Math.random() * 0.2,
    sides: [3, 4, 5, 6][Math.floor(Math.random() * 4)],
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 0.06 + Math.random() * 0.08,
  };
});

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rotation: number) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ──────────── Factories ────────────
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
    size: 1 + Math.random() * 2.5,
    speed: 0.3 + Math.random() * 0.7,
    drift: Math.random() * Math.PI * 2,
  }));
}

export function createSparks(count: number): Spark[] {
  const colors = ['#ff6600', '#ff8800', '#ffaa00', '#ff4400', '#ffcc00'];
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: GROUND_Y - Math.random() * GROUND_Y,
    speed: 0.4 + Math.random() * 1.2,
    size: 1 + Math.random() * 2.5,
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

// ──────────── Far Hills (parallax 0.1x) ────────────
export function drawFarHills(ctx: CanvasRenderingContext2D, camera: Camera, levelId: number): void {
  const hillColor = levelId === 5 ? 'rgba(0,30,80,0.20)' : levelId === 4 ? 'rgba(80,20,0,0.22)' : levelId === 3 ? 'rgba(40,80,160,0.20)' : levelId === 2 ? 'rgba(20,80,30,0.20)' : 'rgba(30,20,100,0.20)';
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

// ──────────── Mid Diamonds (parallax 0.3x) ────────────
export function drawMidDiamonds(ctx: CanvasRenderingContext2D, camera: Camera, frame: number, levelId: number): void {
  const color = levelId === 5 ? 'rgba(0,80,255,0.06)' : levelId === 4 ? 'rgba(255,80,0,0.07)' : levelId === 3 ? 'rgba(80,160,255,0.06)' : levelId === 2 ? 'rgba(50,200,80,0.06)' : 'rgba(80,60,220,0.07)';
  const offsetX = camera.x * 0.3;
  const diamonds = [
    { bx: 100, by: 80, s: 55 }, { bx: 320, by: 140, s: 40 },
    { bx: 550, by: 60, s: 70 }, { bx: 750, by: 120, s: 45 },
    { bx: 950, by: 90, s: 60 },
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

// ──────────── Draw Floating Geometry ────────────
function drawFloatingGeometry(ctx: CanvasRenderingContext2D, camera: Camera, frame: number): void {
  for (const shape of BG_SHAPES) {
    shape.rotation += shape.rotSpeed;
    const sx = ((shape.x - camera.x * shape.parallax) % (CANVAS_WIDTH * 2) + CANVAS_WIDTH * 2) % (CANVAS_WIDTH * 2);
    if (sx > CANVAS_WIDTH + 100) continue;
    const bobY = Math.sin(frame * 0.006 + shape.x * 0.01) * 12;
    const sy = shape.y + bobY;

    // Filled body (semi-transparent)
    ctx.globalAlpha = shape.alpha + Math.sin(frame * 0.01 + shape.x * 0.005) * 0.02;
    ctx.fillStyle = `rgba(${shape.color},${shape.alpha * 2})`;
    ctx.shadowColor = `rgba(${shape.color},0.3)`;
    ctx.shadowBlur = 15;
    drawPolygon(ctx, sx, sy, shape.size, shape.sides, shape.rotation);
    ctx.fill();

    // Bright edge outline
    ctx.strokeStyle = `rgba(${shape.color},0.15)`;
    ctx.lineWidth = 1.5;
    drawPolygon(ctx, sx, sy, shape.size, shape.sides, shape.rotation);
    ctx.stroke();

    // Inner smaller shape (GD detail)
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = `rgba(${shape.color},0.1)`;
    drawPolygon(ctx, sx, sy, shape.size * 0.5, shape.sides, shape.rotation + 0.3);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

// ──────────── Draw Neon Grid Background ────────────
function drawNeonGrid(ctx: CanvasRenderingContext2D, camera: Camera, frame: number, levelId: number): void {
  const gridColor = levelId === 5 ? 'rgba(0,100,255,' : levelId === 4 ? 'rgba(255,80,0,' : levelId === 3 ? 'rgba(80,180,255,' : levelId === 2 ? 'rgba(0,255,100,' : 'rgba(0,255,204,';
  const gridSpacing = 80;
  const offsetX = (camera.x * 0.15) % gridSpacing;

  // Subtle vertical lines
  ctx.lineWidth = 1;
  for (let x = -offsetX; x < CANVAS_WIDTH + gridSpacing; x += gridSpacing) {
    const alpha = 0.015 + Math.sin(frame * 0.01 + x * 0.01) * 0.008;
    ctx.strokeStyle = gridColor + alpha + ')';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }

  // Subtle horizontal lines
  for (let y = 0; y < GROUND_Y; y += gridSpacing) {
    const alpha = 0.012 + Math.sin(frame * 0.008 + y * 0.01) * 0.006;
    ctx.strokeStyle = gridColor + alpha + ')';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

// ──────────── Speed Lines ────────────
export function drawSpeedLines(ctx: CanvasRenderingContext2D, speed: number, frame: number): void {
  const intensity = Math.max(0, (speed - 4) / 2); // starts showing at speed > 4
  if (intensity <= 0) return;

  const count = Math.floor(intensity * 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;

  for (let i = 0; i < count; i++) {
    const seed = (frame * 7 + i * 31) % 1000;
    const y = (seed * 0.34) % GROUND_Y;
    const x = CANVAS_WIDTH - (seed * 0.8) % CANVAS_WIDTH;
    const len = 20 + intensity * 30;

    ctx.globalAlpha = (0.05 + intensity * 0.1) * (0.5 + Math.random() * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ──────────── Main Atmosphere ────────────
export function drawAtmosphere(ctx: CanvasRenderingContext2D, frame: number, camera: Camera, levelId: number, rain: RainDrop[], snow: Snowflake[], sparks: Spark[], binaryDrops: BinaryDrop[]): void {
  // Far hills
  drawFarHills(ctx, camera, levelId);
  // Neon grid
  drawNeonGrid(ctx, camera, frame, levelId);
  // Floating geometry
  drawFloatingGeometry(ctx, camera, frame);
  // Mid diamonds
  drawMidDiamonds(ctx, camera, frame, levelId);

  if (levelId === 1) {
    // Nebulae with pulse
    for (const neb of NEBULAE) {
      const nx = ((neb.x - camera.x * 0.1) % (CANVAS_WIDTH * 1.5) + CANVAS_WIDTH * 1.5) % (CANVAS_WIDTH * 1.5) - 150;
      const pulseR = neb.r + Math.sin(frame * 0.003 + neb.x) * 10;
      ctx.fillStyle = neb.color;
      ctx.beginPath();
      ctx.arc(nx, neb.y + Math.sin(frame * 0.005 + neb.x) * 10, pulseR, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (levelId === 2) {
    // Matrix rain  
    ctx.fillStyle = 'rgba(34,255,68,0.4)';
    for (const drop of rain) {
      drop.y += drop.speed;
      if (drop.y > GROUND_Y) { drop.y = -10; drop.x = Math.random() * CANVAS_WIDTH; }
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      ctx.fillRect(drop.x, drop.y, 2, drop.len);
    }
    ctx.globalAlpha = 1;
  } else if (levelId === 3) {
    // Snowflakes with shimmer
    for (const sf of snow) {
      sf.y += sf.speed;
      sf.x += Math.sin(frame * 0.02 + sf.drift) * 0.3;
      if (sf.y > GROUND_Y) { sf.y = -5; sf.x = Math.random() * CANVAS_WIDTH; }
      ctx.globalAlpha = 0.4 + sf.size * 0.12 + Math.sin(frame * 0.05 + sf.drift) * 0.1;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#88ccff';
      ctx.shadowBlur = sf.size * 2;
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  } else if (levelId === 4) {
    // Rising sparks with glow
    for (const spark of sparks) {
      spark.y -= spark.speed;
      spark.x += Math.sin(frame * 0.03 + spark.drift) * 0.5;
      if (spark.y < 0) { spark.y = GROUND_Y; spark.x = Math.random() * CANVAS_WIDTH; }
      ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1 + spark.drift) * 0.3;
      ctx.fillStyle = spark.color;
      ctx.shadowColor = spark.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  } else if (levelId === 5) {
    // Binary rain
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
      ctx.shadowColor = '#0066ff';
      ctx.shadowBlur = 3;
      ctx.fillText(drop.char, drop.x, drop.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Background pulse (subtle)
  const pulse = Math.sin(frame * (Math.PI / 120)) * 0.5 + 0.5;
  ctx.globalAlpha = pulse * 0.02;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);
  ctx.globalAlpha = 1;
}

// ──────────── Ground Texture ────────────
export function drawGroundTexture(ctx: CanvasRenderingContext2D, camera: Camera, levelId: number, groundLineColor: string): void {
  // Animated neon grid (vertical lines moving)
  const gridStart = Math.floor(camera.x / 40) * 40;
  ctx.lineWidth = 1;
  for (let wx = gridStart; wx < gridStart + CANVAS_WIDTH + 80; wx += 40) {
    const sx = wx - camera.x;
    const grad = ctx.createLinearGradient(sx, GROUND_Y, sx, CANVAS_HEIGHT);
    grad.addColorStop(0, groundLineColor + '55');
    grad.addColorStop(0.5, groundLineColor + '22');
    grad.addColorStop(1, groundLineColor + '00');
    ctx.strokeStyle = grad as unknown as string;
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y);
    ctx.lineTo(sx, CANVAS_HEIGHT);
    ctx.stroke();
  }

  // Horizontal lines on ground (perspective-like)
  for (let i = 0; i < 3; i++) {
    const y = GROUND_Y + 15 + i * 15;
    const alpha = 0.15 - i * 0.04;
    ctx.strokeStyle = groundLineColor;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // === GD-style decorative teeth/spikes along ground edge ===
  const decoStart = Math.floor(camera.x / 20) * 20;
  for (let wx = decoStart; wx < decoStart + CANVAS_WIDTH + 40; wx += 20) {
    const sx = wx - camera.x;
    const seed = (wx * 3 + 7) % 100;

    if (levelId === 1) {
      // Neon teeth decoration (like GD bottom teeth)
      const h = 4 + (seed % 5);
      const toothAlpha = 0.3 + (seed % 30) * 0.01;
      ctx.globalAlpha = toothAlpha;
      ctx.fillStyle = '#33ff66';
      ctx.shadowColor = '#33ff66';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 5, GROUND_Y - h);
      ctx.lineTo(sx + 10, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      // Secondary small tooth
      if (seed % 3 === 0) {
        ctx.globalAlpha = toothAlpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx + 10, GROUND_Y);
        ctx.lineTo(sx + 14, GROUND_Y - h * 0.6);
        ctx.lineTo(sx + 18, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (levelId === 2) {
      // Toxic drip teeth
      const h = 3 + (seed % 4);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#44ff44';
      ctx.shadowColor = '#22ff22';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 4, GROUND_Y - h);
      ctx.lineTo(sx + 8, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (levelId === 3) {
      // Ice crystal teeth
      const h = 5 + (seed % 6);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#88ddff';
      ctx.shadowColor = '#88ddff';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 3, GROUND_Y - h);
      ctx.lineTo(sx + 6, GROUND_Y - h * 0.4);
      ctx.lineTo(sx + 9, GROUND_Y - h * 0.7);
      ctx.lineTo(sx + 12, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (levelId === 4) {
      // Flame teeth
      const h = 5 + (seed % 8);
      const flicker = Math.sin(seed + wx * 0.1) * 2;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = seed % 3 === 0 ? '#ff8800' : seed % 3 === 1 ? '#ff4400' : '#ffaa00';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y);
      ctx.lineTo(sx + 4, GROUND_Y - h + flicker);
      ctx.lineTo(sx + 8, GROUND_Y - h * 0.3);
      ctx.lineTo(sx + 12, GROUND_Y - h * 0.8 + flicker);
      ctx.lineTo(sx + 16, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (levelId === 5) {
      // Digital teeth / pixel steps
      const h = 3 + (seed % 5);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#0088ff';
      ctx.shadowColor = '#0088ff';
      ctx.shadowBlur = 4;
      ctx.fillRect(sx, GROUND_Y - h, 6, h);
      if (seed % 2 === 0) ctx.fillRect(sx + 6, GROUND_Y - h * 0.5, 4, h * 0.5);
      ctx.shadowBlur = 0;
    }
  }
  ctx.globalAlpha = 1;
}
