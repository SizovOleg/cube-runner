import { CANVAS_WIDTH, GROUND_Y, COLORS, LEVEL_BOSS_ARENA_WIDTH } from '@utils/constants';
import { roundRect } from '@utils/canvasUtils';
import { Camera } from '@engine/Camera';
import { ObstacleData } from '@levels/types';
import { MovingObstacle, FallingBlock, Pendulum, Bullet, BombProjectile } from '@game-types/GameTypes';

// ──────────── FRAME COUNTER (for animations) ────────────
let _frameCount = 0;
export function setRendererFrame(f: number) { _frameCount = f; }

/** Platform with gradient, glow edge, and neon border */
export function drawPlatform(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, color: string): void {
  // Drop shadow
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  roundRect(ctx, px + 2, py + 3, pw, ph, 4);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Body gradient
  const grad = ctx.createLinearGradient(px, py, px, py + ph);
  grad.addColorStop(0, color + 'ff');
  grad.addColorStop(1, color + '55');
  ctx.fillStyle = grad;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  roundRect(ctx, px, py, pw, ph, 5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Neon top highlight (animated)
  const pulseAlpha = 0.35 + Math.sin(_frameCount * 0.03 + px * 0.01) * 0.15;
  ctx.strokeStyle = `rgba(255,255,255,${pulseAlpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + 4, py + 1);
  ctx.lineTo(px + pw - 4, py + 1);
  ctx.stroke();

  // Neon side glow lines
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  roundRect(ctx, px, py, pw, ph, 5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Obstacles: spikes with breathing glow, platforms with neon edges */
export function drawObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: readonly ObstacleData[],
  movingPlatforms: MovingObstacle[],
  camera: Camera,
): void {
  for (const obs of obstacles) {
    if (obs.type === 'moving_platform') continue;
    const ox = camera.worldToScreen(obs.x);
    if (ox < -100 || ox > CANVAS_WIDTH + 100) continue;

    if (obs.type === 'spike') {
      const tipX = ox + obs.width / 2;
      const tipY = obs.y - 5;
      const baseY = obs.y + obs.height;

      // Breathing glow (Geometry Dash style)
      const pulseAlpha = 0.5 + Math.sin(_frameCount * 0.07 + obs.x * 0.02) * 0.35;

      // Radial glow under spike
      ctx.globalAlpha = pulseAlpha * 0.5;
      const radGrad = ctx.createRadialGradient(tipX, baseY, 0, tipX, baseY, obs.width * 1.2);
      radGrad.addColorStop(0, COLORS.spike + '88');
      radGrad.addColorStop(1, COLORS.spike + '00');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(tipX, baseY, obs.width * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Spike body with gradient
      ctx.globalAlpha = pulseAlpha * 0.2 + 0.8;
      const spikeGrad = ctx.createLinearGradient(ox, baseY, tipX, tipY);
      spikeGrad.addColorStop(0, '#cc1133');
      spikeGrad.addColorStop(0.5, COLORS.spike);
      spikeGrad.addColorStop(1, '#ff6688');
      ctx.fillStyle = spikeGrad;
      ctx.shadowColor = COLORS.spike;
      ctx.shadowBlur = 14 + pulseAlpha * 8;
      ctx.beginPath();
      ctx.moveTo(ox + 2, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(ox + obs.width - 2, baseY);
      ctx.closePath();
      ctx.fill();

      // Highlight edge
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox + 4, baseY - 2);
      ctx.lineTo(tipX, tipY + 2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

    } else if (obs.type === 'platform') {
      drawPlatform(ctx, ox, obs.y, obs.width, obs.height, COLORS.platform);
    } else if (obs.type === 'breakable_block') {
      // Трескающийся блок
      drawPlatform(ctx, ox, obs.y, obs.width, obs.height, '#666666');
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox + 5, obs.y + 5);
      ctx.lineTo(ox + obs.width / 2, obs.y + obs.height / 2);
      ctx.lineTo(ox + obs.width - 5, obs.y + 8);
      ctx.stroke();
    } else if (obs.type.startsWith('jump_pad')) {
      // Батут
      const t = _frameCount * 0.1;
      const padColor = obs.type.includes('red') ? '#ff0044' : obs.type.includes('pink') ? '#ff00ff' : '#ffff00';
      ctx.fillStyle = padColor;
      ctx.shadowColor = padColor;
      ctx.shadowBlur = 10 + Math.sin(t) * 5;
      roundRect(ctx, ox, obs.y + obs.height - 10, obs.width, 10, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Внутренняя стрелка вверх
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(ox + obs.width / 2 - 4, obs.y + obs.height - 2);
      ctx.lineTo(ox + obs.width / 2, obs.y + obs.height - 8);
      ctx.lineTo(ox + obs.width / 2 + 4, obs.y + obs.height - 2);
      ctx.fill();
    } else if (obs.type.startsWith('jump_ring')) {
      // Сфера (Orb)
      const t = _frameCount * 0.1;
      const ringColor = obs.type.includes('pink') ? '#ff00ff' : '#ffff00';
      const cx = ox + obs.width / 2;
      const cy = obs.y + obs.height / 2;
      const r = obs.width / 2;

      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Внутреннее пульсирующее ядро
      ctx.fillStyle = ringColor;
      ctx.globalAlpha = 0.5 + Math.sin(t * 1.5) * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    } else if (obs.type.startsWith('speed_portal')) {
      // Портал скорости (вертикальный эллипс/рамка)
      const t = _frameCount * 0.1;
      const portalColor = obs.type.includes('slow') ? '#ffaa00' :
        obs.type.includes('fast') ? '#00ffaa' :
          obs.type.includes('superfast') ? '#ff0044' : '#00aaff';
      const cx = ox + obs.width / 2;
      const cy = obs.y + obs.height / 2;

      ctx.strokeStyle = portalColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = portalColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Внутренние линии скорости
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const offset = ((t * 10 + i * 15) % obs.height) - obs.height / 2;
        ctx.beginPath();
        ctx.moveTo(cx - obs.width / 2 + 5, cy + offset);
        ctx.lineTo(cx + obs.width / 2 - 5, cy + offset);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    } else if (obs.type.startsWith('gravity_portal')) {
      // Портал гравитации
      const t = _frameCount * 0.1;
      const tColor = obs.type.includes('up') ? '#ff00aa' : '#00aaff';
      const cx = ox + obs.width / 2;
      const cy = obs.y + obs.height / 2;

      ctx.strokeStyle = tColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = tColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx, cy, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Внутренние линии гравитации
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      const dir = obs.type.includes('up') ? -1 : 1;
      for (let i = 0; i < 4; i++) {
        // Линии двигаются вверх или вниз в зависимости от гравитации
        const offsetOrigin = (t * 20 * dir + i * 15) % obs.height;
        let offset = offsetOrigin;
        if (dir === 1 && offsetOrigin < 0) offset += obs.height;
        if (dir === -1 && offsetOrigin > 0) offset -= obs.height;
        offset -= obs.height / 2;

        ctx.beginPath();
        ctx.moveTo(cx - obs.width / 2 + 8, cy + offset);
        ctx.lineTo(cx + obs.width / 2 - 8, cy + offset);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    } else if (obs.type === 'laser') {
      const isActive = Math.floor(_frameCount / 60) % 4 < 2;
      ctx.fillStyle = '#333';
      // База лазера (излучатель)
      ctx.fillRect(ox + obs.width / 2 - 10, obs.y, 20, 10);
      ctx.fillRect(ox + obs.width / 2 - 10, obs.y + obs.height - 10, 20, 10);

      if (isActive) {
        ctx.fillStyle = '#ff0044';
        ctx.shadowColor = '#ff0044';
        ctx.shadowBlur = 15;
        // Пульсирующий луч
        const beamW = 4 + Math.sin(_frameCount * 0.3) * 2;
        ctx.fillRect(ox + obs.width / 2 - beamW / 2, obs.y + 10, beamW, obs.height - 20);
        ctx.shadowBlur = 0;
      } else {
        // Выключенный луч (предупреждение)
        ctx.fillStyle = 'rgba(255, 0, 68, 0.2)';
        ctx.fillRect(ox + obs.width / 2 - 1, obs.y + 10, 2, obs.height - 20);
      }
    }
  }

  // Moving platforms
  for (const mp of movingPlatforms) {
    const mx = camera.worldToScreen(mp.x);
    if (mx < -100 || mx > CANVAS_WIDTH + 100) continue;
    drawPlatform(ctx, mx, mp.y, mp.width, mp.height, '#44aaff');

    // Direction arrows with glow
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.shadowColor = '#44aaff';
    ctx.shadowBlur = 4;
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
    ctx.shadowBlur = 0;
  }
}

/** Player bullets with enhanced trail */
export function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  for (const b of bullets) {
    // Trail
    for (let ti = 1; ti <= 4; ti++) {
      ctx.globalAlpha = 0.12 / ti;
      ctx.fillStyle = COLORS.bullet;
      const tw = b.width * (1 - ti * 0.12);
      const tx = b.x - ti * 7;
      roundRect(ctx, tx, b.y + (b.height - tw * 0.6) / 2, tw, b.height * 0.6, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bullet body
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 14;
    ctx.fillStyle = COLORS.bullet;
    roundRect(ctx, b.x, b.y, b.width, b.height, Math.min(b.height / 2, 3));
    ctx.fill();

    // Core highlight
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#fff';
    roundRect(ctx, b.x + 1, b.y + 1, b.width - 2, b.height - 2, 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;
}

/** Bombs with pulse */
export function drawBombs(ctx: CanvasRenderingContext2D, bombs: BombProjectile[], camera: Camera): void {
  for (const bomb of bombs) {
    const bx = camera.worldToScreen(bomb.x);
    const pulse = 1 + Math.sin(_frameCount * 0.15) * 0.15;
    const r = 8 * pulse;

    ctx.fillStyle = COLORS.bomb;
    ctx.shadowColor = COLORS.bomb;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(bx + bomb.width / 2, bomb.y + bomb.height / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // BM label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BM', bx + bomb.width / 2, bomb.y + bomb.height / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

/** Falling blocks with enhanced warning */
export function drawFallingBlocks(ctx: CanvasRenderingContext2D, blocks: FallingBlock[], camera: Camera, frame: number): void {
  for (const b of blocks) {
    const sx = camera.worldToScreen(b.x);
    if (sx < -120 || sx > CANVAS_WIDTH + 120) continue;

    if (b.state === 'warning') {
      const blink = Math.sin(frame * 0.4) > 0;
      ctx.globalAlpha = blink ? 1 : 0.4;
      ctx.fillStyle = '#ff3300';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 16;
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

    // Warning indicator (blinking arrow)
    if (b.state === 'warning' && Math.sin(frame * 0.4) > 0) {
      ctx.fillStyle = '#ff3300';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 8;
      ctx.font = 'bold 14px "Rajdhani", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼', sx + b.width / 2, b.y - 6);
      ctx.textAlign = 'left';
      ctx.shadowBlur = 0;
    }
  }
}

/** Pendulums with glow */
export function drawPendulums(ctx: CanvasRenderingContext2D, pendulums: Pendulum[], camera: Camera): void {
  for (const p of pendulums) {
    const px = camera.worldToScreen(p.x);
    const bx = camera.worldToScreen(p.ballX);
    if (bx < -80 || bx > CANVAS_WIDTH + 80) continue;

    // Chain
    ctx.strokeStyle = 'rgba(180,180,180,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(px, p.y);
    ctx.lineTo(bx, p.ballY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pivot
    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath();
    ctx.arc(px, p.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Ball with enhanced glow
    ctx.shadowColor = '#ff6622';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#cc3300';
    ctx.beginPath();
    ctx.arc(bx, p.ballY, p.ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Spines with glow
    ctx.fillStyle = '#ee4411';
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 3;
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
    ctx.shadowBlur = 0;
  }
}

/** Arena walls with animated energy stripes */
export function drawArenaWalls(ctx: CanvasRenderingContext2D, arenaX: number, camera: Camera, wallColor = '#ff0044'): void {
  const leftWall = camera.worldToScreen(arenaX);
  const rightWall = camera.worldToScreen(arenaX + LEVEL_BOSS_ARENA_WIDTH);

  for (const wx of [leftWall, rightWall]) {
    // Animated energy stripes
    for (let i = 0; i < 5; i++) {
      const stripeY = ((_frameCount * 2 + i * 60) % (GROUND_Y + 60)) - 30;
      const stripeAlpha = 0.15 + Math.sin(_frameCount * 0.05 + i) * 0.1;
      ctx.fillStyle = wallColor;
      ctx.globalAlpha = stripeAlpha;
      ctx.fillRect(wx - 4, stripeY, 8, 30);
    }
    ctx.globalAlpha = 1;

    // Main wall line
    ctx.strokeStyle = wallColor;
    ctx.shadowColor = wallColor;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wx, 0);
    ctx.lineTo(wx, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
