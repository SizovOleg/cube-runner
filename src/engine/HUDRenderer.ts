import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y,
  COLORS, COIN_COLOR, COIN_GLOW,
  POWERUP_COLORS, POWERUP_LABELS, PowerupType,
  BOSS_INTRO_DURATION,
} from '@utils/constants';
import { roundRect } from '@utils/canvasUtils';
import { Boss } from '@entities/Boss';
import { Player } from '@entities/Player';
import { BossPhase } from '@game-types/GameTypes';
import { RocketCorridorData } from '@levels/types';

export interface HUDState {
  player: Player;
  kills: number;
  sessionCoins: number;
  score: number;
  bossPhase: BossPhase;
  boss: Boss | null;
  bossIntroTimer: number;
  corridorMode: boolean;
  corridor: RocketCorridorData | null;
  levelId: number;
  skinColor: string;
  levelLength?: number;  // for progress bar
}

// ──────────── LEVEL PROGRESS BAR ────────────
export function drawProgressBar(ctx: CanvasRenderingContext2D, playerX: number, levelLength: number, bossPhase: BossPhase): void {
  if (bossPhase === 'fight' || bossPhase === 'intro' || bossPhase === 'defeated') return;

  const barW = 200;
  const barH = 5;
  const barX = (CANVAS_WIDTH - barW) / 2;
  const barY = CANVAS_HEIGHT - 14;
  const ratio = Math.min(playerX / levelLength, 1);

  // Background
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  roundRect(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 4);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Track
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, barX, barY, barW, barH, 3);
  ctx.fill();

  // Fill with gradient
  const grad = ctx.createLinearGradient(barX, 0, barX + barW * ratio, 0);
  grad.addColorStop(0, '#00cc88');
  grad.addColorStop(0.5, '#00ffcc');
  grad.addColorStop(1, '#00ff88');
  ctx.fillStyle = grad;
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 6;
  roundRect(ctx, barX, barY, barW * ratio, barH, 3);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Percentage text
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 9px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(Math.floor(ratio * 100) + '%', CANVAS_WIDTH / 2, barY - 3);
  ctx.textAlign = 'left';

  // Boss marker at end
  ctx.fillStyle = '#ff0044';
  ctx.shadowColor = '#ff0044';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(barX + barW, barY + barH / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('B', barX + barW, barY + barH / 2 + 2);
  ctx.textAlign = 'left';
}

// ──────────── BOSS INTRO ────────────
export function drawBossIntro(ctx: CanvasRenderingContext2D, state: HUDState): boolean {
  const { bossPhase, boss, bossIntroTimer, levelId } = state;
  if (bossPhase !== 'intro' || !boss) return false;

  const introAlpha = bossIntroTimer < 30
    ? bossIntroTimer / 30
    : bossIntroTimer > BOSS_INTRO_DURATION - 30
      ? (BOSS_INTRO_DURATION - bossIntroTimer) / 30
      : 1;

  // Dark overlay
  const darkAlpha = Math.min(bossIntroTimer / 30, 1) * 0.4;
  ctx.fillStyle = `rgba(0,0,0,${darkAlpha})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const bossIntroColor = levelId === 5 ? '#0066ff' : levelId === 4 ? '#ff6600' : levelId === 3 ? '#00aaff' : levelId === 2 ? '#8800cc' : '#ff0044';

  // Electric lightning on sides
  if (bossIntroTimer < 80) {
    ctx.strokeStyle = bossIntroColor;
    ctx.shadowColor = bossIntroColor;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = introAlpha * 0.8;
    for (let side = 0; side < 2; side++) {
      for (let li = 0; li < 3; li++) {
        ctx.beginPath();
        let lx = side === 0 ? 10 + li * 8 : CANVAS_WIDTH - 10 - li * 8;
        ctx.moveTo(lx, 0);
        for (let segY = 30; segY < GROUND_Y; segY += 25) {
          lx += (Math.random() - 0.5) * 30;
          const minX = side === 0 ? 2 : CANVAS_WIDTH - 35;
          const maxX = side === 0 ? 35 : CANVAS_WIDTH - 2;
          ctx.lineTo(Math.max(minX, Math.min(lx, maxX)), segY);
        }
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }

  // Screen shake effect
  const shake = bossIntroTimer < 20 ? (Math.random() - 0.5) * 4 : 0;

  // Boss name with dramatic reveal
  ctx.globalAlpha = introAlpha;
  ctx.fillStyle = bossIntroColor;
  ctx.shadowColor = bossIntroColor;
  ctx.shadowBlur = 40;
  ctx.font = 'bold 54px "Orbitron", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(boss.name, CANVAS_WIDTH / 2 + shake, CANVAS_HEIGHT / 2 - 20 + shake);

  // Sub-label
  ctx.shadowBlur = 15;
  ctx.font = 'bold 20px "Rajdhani", monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('⚔ BOSS BATTLE ⚔', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);

  // Horizontal neon lines
  ctx.strokeStyle = bossIntroColor;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  const lineY1 = CANVAS_HEIGHT / 2 - 50;
  const lineY2 = CANVAS_HEIGHT / 2 + 40;
  const lineExpand = Math.min(bossIntroTimer / 20, 1) * (CANVAS_WIDTH * 0.35);
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2 - lineExpand, lineY1);
  ctx.lineTo(CANVAS_WIDTH / 2 + lineExpand, lineY1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2 - lineExpand, lineY2);
  ctx.lineTo(CANVAS_WIDTH / 2 + lineExpand, lineY2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  return true;
}

// ──────────── BOSS DEFEATED ────────────
export function drawBossDefeated(ctx: CanvasRenderingContext2D, bossPhase: BossPhase): void {
  if (bossPhase !== 'defeated') return;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 35;
  ctx.font = 'bold 44px "Orbitron", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('VICTORY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
  ctx.shadowBlur = 10;
  ctx.font = 'bold 16px "Rajdhani", monospace';
  ctx.fillStyle = '#00ffcc';
  ctx.fillText('Boss defeated!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

// ──────────── MAIN HUD ────────────
export function drawHUD(ctx: CanvasRenderingContext2D, state: HUDState, displayScore: number): number {
  const { player, kills, sessionCoins, score, bossPhase, corridorMode, corridor, skinColor } = state;

  // Animated score
  let ds = displayScore;
  ds += (score - ds) * 0.15;
  if (Math.abs(ds - score) < 1) ds = score;
  const shownScore = Math.floor(ds);

  // HUD background
  if (bossPhase !== 'fight') {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    roundRect(ctx, 10, 8, 340, 52, 10);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Top border glow
    ctx.strokeStyle = 'rgba(0,255,204,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, 10, 8, 340, 52, 10);
    ctx.stroke();
  }

  // Score & Kills
  if (bossPhase !== 'fight') {
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px "Rajdhani", monospace';
    ctx.fillText('Score: ' + shownScore, 20, 28);

    // Kill counter with blood icon
    ctx.fillStyle = '#ff4466';
    ctx.fillText('⚔', 155, 28);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(String(kills), 172, 28);

    // Coins with glow
    ctx.fillStyle = COIN_COLOR;
    ctx.shadowColor = COIN_GLOW;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(215, 22, 7, 0, Math.PI * 2);
    ctx.fill();
    // Coin highlight
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(213, 20, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Rajdhani", monospace';
    ctx.fillText(String(sessionCoins), 227, 28);
    ctx.shadowBlur = 0;
  } else {
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#aaa';
    ctx.font = '13px "Rajdhani", monospace';
    ctx.fillText('Score: ' + shownScore + '  ⚔ ' + kills, 20, GROUND_Y + 25);
    ctx.shadowBlur = 0;
  }

  // Active upgrade icons
  let upgradeIconX = CANVAS_WIDTH - 115;
  if (player.isMagnetActive()) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#44ddff';
    ctx.shadowColor = '#44ddff';
    ctx.shadowBlur = 6;
    ctx.fillText('🧲', upgradeIconX, 70);
    ctx.shadowBlur = 0;
    upgradeIconX -= 22;
  }
  if (player.isSuperBullet()) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ff44ff';
    ctx.shadowColor = '#ff44ff';
    ctx.shadowBlur = 6;
    ctx.fillText('⚡', upgradeIconX, 70);
    ctx.shadowBlur = 0;
    upgradeIconX -= 22;
  }
  if (player.hasDoubleJump) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 6;
    ctx.fillText('⬆', upgradeIconX, 70);
    ctx.shadowBlur = 0;
  }

  // HP bar (new style — gradient bar instead of circles)
  const hpY = bossPhase === 'fight' ? GROUND_Y + 30 : 42;
  const hpBarX = 20;
  const hpBarW = 130;
  const hpBarH = 8;

  if (bossPhase !== 'fight') {
    // HP label
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 10px "Rajdhani", monospace';
    ctx.fillText('HP', hpBarX, hpY + 1);
  }

  const barStartX = hpBarX + (bossPhase === 'fight' ? 0 : 22);

  // Background
  ctx.fillStyle = 'rgba(255,0,0,0.15)';
  roundRect(ctx, barStartX, hpY - 1, hpBarW, hpBarH, 4);
  ctx.fill();

  // Fill
  const hpRatio = player.hp / player.maxHP;
  const hpFillW = hpBarW * hpRatio;
  if (hpFillW > 0) {
    const hpColor = hpRatio > 0.6 ? '#00ff88' : hpRatio > 0.3 ? '#ffaa00' : '#ff3344';
    const hpGrad = ctx.createLinearGradient(barStartX, 0, barStartX + hpFillW, 0);
    hpGrad.addColorStop(0, skinColor);
    hpGrad.addColorStop(1, hpColor);
    ctx.fillStyle = hpGrad;
    ctx.shadowColor = hpColor;
    ctx.shadowBlur = 8;
    roundRect(ctx, barStartX, hpY - 1, hpFillW, hpBarH, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // HP text inside bar
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.hp + '/' + player.maxHP, barStartX + hpBarW / 2, hpY + hpBarH - 2);
    ctx.textAlign = 'left';
  }

  // Powerup inventory slots
  for (let si = 0; si < 3; si++) {
    const slotX = CANVAS_WIDTH - 110 + si * 34;
    const slotY = 10;
    const slotPw = player.inventory[si] as PowerupType | null;
    const slotColor = slotPw ? POWERUP_COLORS[slotPw] : '#333';

    // Slot background
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    roundRect(ctx, slotX, slotY, 28, 28, 6);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border with glow
    ctx.strokeStyle = slotColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = slotPw ? slotColor : 'transparent';
    ctx.shadowBlur = slotPw ? 10 : 0;
    roundRect(ctx, slotX, slotY, 28, 28, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (slotPw) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = POWERUP_COLORS[slotPw];
      roundRect(ctx, slotX + 1, slotY + 1, 26, 26, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px "Rajdhani", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(POWERUP_LABELS[slotPw], slotX + 14, slotY + 18);
      ctx.textAlign = 'left';
    }
    // Key number
    ctx.fillStyle = '#666';
    ctx.font = '8px "Rajdhani", monospace';
    ctx.fillText(String(si + 1), slotX + 3, slotY + 26);
  }

  // Timer bars (corridor / rocket / shield)
  if (corridorMode && corridor) {
    const barW = 120;
    const ratio = (player.x - corridor.startX) / (corridor.endX - corridor.startX);
    const tbY = 8;
    ctx.fillStyle = 'rgba(50,0,20,0.6)';
    roundRect(ctx, CANVAS_WIDTH / 2 - barW / 2, tbY, barW, 10, 5);
    ctx.fill();
    const cGrad = ctx.createLinearGradient(CANVAS_WIDTH / 2 - barW / 2, 0, CANVAS_WIDTH / 2 + barW / 2, 0);
    cGrad.addColorStop(0, '#ff0044');
    cGrad.addColorStop(1, '#ff4400');
    ctx.fillStyle = cGrad;
    ctx.shadowColor = COLORS.spike;
    ctx.shadowBlur = 8;
    roundRect(ctx, CANVAS_WIDTH / 2 - barW / 2, tbY, barW * Math.min(ratio, 1), 10, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ CORRIDOR', CANVAS_WIDTH / 2, tbY - 1);
    ctx.textAlign = 'left';
  } else if (player.isRocketMode()) {
    const barW = 100;
    const ratio = player.rocketTimer / 180;
    const tbY = 8;
    ctx.fillStyle = 'rgba(50,0,50,0.6)';
    roundRect(ctx, CANVAS_WIDTH / 2 - barW / 2, tbY, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = COLORS.rocket;
    ctx.shadowColor = COLORS.rocket;
    ctx.shadowBlur = 8;
    roundRect(ctx, CANVAS_WIDTH / 2 - barW / 2, tbY, barW * ratio, 10, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 ROCKET', CANVAS_WIDTH / 2, tbY - 1);
    ctx.textAlign = 'left';
  } else if (player.isShielded() && bossPhase !== 'fight') {
    const barW = 100;
    const ratio = player.shieldTimer / 300;
    const tbY = 8;
    ctx.fillStyle = 'rgba(0,30,50,0.6)';
    roundRect(ctx, CANVAS_WIDTH / 2 - barW / 2, tbY, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = COLORS.shield;
    ctx.shadowColor = COLORS.shield;
    ctx.shadowBlur = 8;
    roundRect(ctx, CANVAS_WIDTH / 2 - barW / 2, tbY, barW * ratio, 10, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🛡 SHIELD', CANVAS_WIDTH / 2, tbY - 1);
    ctx.textAlign = 'left';
  }

  // Level progress bar
  if (state.levelLength && state.levelLength > 0) {
    drawProgressBar(ctx, player.x, state.levelLength, bossPhase);
  }

  return ds;
}
