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
}

/** Заставка перед боссом: затемнение + молнии + имя.
 *  Возвращает true если рисует интро (тогда дальнейший HUD не нужен). */
export function drawBossIntro(ctx: CanvasRenderingContext2D, state: HUDState): boolean {
  const { bossPhase, boss, bossIntroTimer, levelId } = state;
  if (bossPhase !== 'intro' || !boss) return false;

  const introAlpha = bossIntroTimer < 30
    ? bossIntroTimer / 30
    : bossIntroTimer > BOSS_INTRO_DURATION - 30
      ? (BOSS_INTRO_DURATION - bossIntroTimer) / 30
      : 1;

  const darkAlpha = Math.min(bossIntroTimer / 30, 1) * 0.3;
  ctx.fillStyle = `rgba(0,0,0,${darkAlpha})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const bossIntroColor = levelId === 3 ? '#00aaff' : levelId === 2 ? '#8800cc' : '#ff0044';
  if (bossIntroTimer < 80) {
    ctx.strokeStyle = bossIntroColor;
    ctx.shadowColor = bossIntroColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.globalAlpha = introAlpha * 0.7;
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
  return true;
}

/** Оверлей "VICTORY!" когда босс повержен */
export function drawBossDefeated(ctx: CanvasRenderingContext2D, bossPhase: BossPhase): void {
  if (bossPhase !== 'defeated') return;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('VICTORY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
}

/** Полный HUD: score, kills, coins, HP, апгрейды, инвентарь, таймер-бар */
export function drawHUD(ctx: CanvasRenderingContext2D, state: HUDState, displayScore: number): number {
  const { player, kills, sessionCoins, score, bossPhase, corridorMode, corridor, skinColor } = state;

  // Анимированный Score (подсчёт передаётся извне, обновляем и возвращаем)
  let ds = displayScore;
  ds += (score - ds) * 0.15;
  if (Math.abs(ds - score) < 1) ds = score;
  const shownScore = Math.floor(ds);

  // HUD фон
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

  // Инвентарь powerups
  for (let si = 0; si < 3; si++) {
    const slotX = CANVAS_WIDTH - 110 + si * 34;
    const slotY = 10;
    const slotPw = player.inventory[si] as PowerupType | null;
    const slotColor = slotPw ? POWERUP_COLORS[slotPw] : '#333';
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    roundRect(ctx, slotX, slotY, 28, 28, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
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

  // Таймер-бар: Corridor / Rocket / Shield
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

  return ds;
}
