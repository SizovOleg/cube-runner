import { CANVAS_WIDTH, GROUND_Y, COLORS, LEVEL_BOSS_ARENA_WIDTH } from '@utils/constants';
import { roundRect } from '@utils/canvasUtils';
import { Camera } from '@engine/Camera';
import { ObstacleData } from '@levels/types';
import { MovingObstacle, FallingBlock, Pendulum, Bullet, BombProjectile } from '@game-types/GameTypes';

/** Платформа с градиентом и highlight-линией */
export function drawPlatform(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, color: string): void {
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  roundRect(ctx, px + 2, py + 3, pw, ph, 4);
  ctx.fill();
  ctx.globalAlpha = 1;

  const grad = ctx.createLinearGradient(px, py, px, py + ph);
  grad.addColorStop(0, color + 'ff');
  grad.addColorStop(1, color + '55');
  ctx.fillStyle = grad;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  roundRect(ctx, px, py, pw, ph, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + 4, py + 1);
  ctx.lineTo(px + pw - 4, py + 1);
  ctx.stroke();
}

/** Шипы и платформы (статические + движущиеся) */
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

      const radGrad = ctx.createRadialGradient(tipX, baseY, 0, tipX, baseY, obs.width);
      radGrad.addColorStop(0, COLORS.spike + '55');
      radGrad.addColorStop(1, COLORS.spike + '00');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(tipX, baseY, obs.width, 0, Math.PI * 2);
      ctx.fill();

      const spikeGrad = ctx.createLinearGradient(ox, baseY, tipX, tipY);
      spikeGrad.addColorStop(0, '#cc1133');
      spikeGrad.addColorStop(1, COLORS.spike);
      ctx.fillStyle = spikeGrad;
      ctx.shadowColor = COLORS.spike;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(ox + 2, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(ox + obs.width - 2, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (obs.type === 'platform') {
      drawPlatform(ctx, ox, obs.y, obs.width, obs.height, COLORS.platform);
    }
  }

  for (const mp of movingPlatforms) {
    const mx = camera.worldToScreen(mp.x);
    if (mx < -100 || mx > CANVAS_WIDTH + 100) continue;
    drawPlatform(ctx, mx, mp.y, mp.width, mp.height, '#44aaff');

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

/** Пули игрока (screen-space coords) */
export function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  for (const b of bullets) {
    for (let ti = 1; ti <= 3; ti++) {
      ctx.globalAlpha = 0.15 / ti;
      ctx.fillStyle = COLORS.bullet;
      const tw = b.width * (1 - ti * 0.15);
      const tx = b.x - ti * 6;
      roundRect(ctx, tx, b.y + (b.height - tw * 0.6) / 2, tw, b.height * 0.6, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.bullet;
    roundRect(ctx, b.x, b.y, b.width, b.height, Math.min(b.height / 2, 3));
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    roundRect(ctx, b.x + 1, b.y + 1, b.width - 2, b.height - 2, 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;
}

/** Бомбы */
export function drawBombs(ctx: CanvasRenderingContext2D, bombs: BombProjectile[], camera: Camera): void {
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

/** Падающие блоки */
export function drawFallingBlocks(ctx: CanvasRenderingContext2D, blocks: FallingBlock[], camera: Camera, frame: number): void {
  for (const b of blocks) {
    const sx = camera.worldToScreen(b.x);
    if (sx < -120 || sx > CANVAS_WIDTH + 120) continue;

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

    if (b.state === 'warning' && Math.sin(frame * 0.4) > 0) {
      ctx.fillStyle = '#ff3300';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼', sx + b.width / 2, b.y - 4);
      ctx.textAlign = 'left';
    }
  }
}

/** Маятники */
export function drawPendulums(ctx: CanvasRenderingContext2D, pendulums: Pendulum[], camera: Camera): void {
  for (const p of pendulums) {
    const px = camera.worldToScreen(p.x);
    const bx = camera.worldToScreen(p.ballX);
    if (bx < -80 || bx > CANVAS_WIDTH + 80) continue;

    ctx.strokeStyle = 'rgba(180,180,180,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(px, p.y);
    ctx.lineTo(bx, p.ballY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath();
    ctx.arc(px, p.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#ff6622';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#cc3300';
    ctx.beginPath();
    ctx.arc(bx, p.ballY, p.ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

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

/** Стены арены босса */
export function drawArenaWalls(ctx: CanvasRenderingContext2D, arenaX: number, camera: Camera, wallColor = '#ff0044'): void {
  const leftWall = camera.worldToScreen(arenaX);
  const rightWall = camera.worldToScreen(arenaX + LEVEL_BOSS_ARENA_WIDTH);
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
