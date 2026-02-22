import { Boss, BossConfig } from '../Boss';
import { GROUND_Y, LEVEL_BOSS_ARENA_WIDTH } from '@utils/constants';

interface FireBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
}

interface LavaPool {
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  timer: number; // исчезает через 300 кадров (5 сек)
}

interface Minion {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  vx: number;
  damage: number;
  alive: boolean;
}

/**
 * Босс 4: Inferno — Огненный монстр 75x75.
 *
 * Фаза 1: Стреляет 3 огненными шарами с разбросом.
 *         Шары оставляют лужи лавы (урон при наступании, 5 сек).
 * Фаза 2: Призывает 2 маленьких огненных миньона (15 HP), бегут к игроку.
 * Фаза 3: Дыхание огнём — горизонтальный луч 2 сек, нужно перепрыгнуть.
 */
export class BossInferno extends Boss {
  private vy = 0;
  private onGround = true;
  private jumpTimer = 0;
  private shootTimer = 0;
  private minionTimer = 0;
  private breathTimer = 0;       // таймер дыхания
  private breathActive = false;  // луч активен
  private breathDir = 1;         // направление дыхания (1 = вправо, -1 = влево)
  private arenaLeft: number;
  private arenaRight: number;
  private fireBalls: FireBall[] = [];
  private lavaPools: LavaPool[] = [];
  private minions: Minion[] = [];

  constructor(arenaX: number) {
    const config: BossConfig = {
      name: 'INFERNO',
      maxHP: 50,
      phases: 3,
      x: arenaX + LEVEL_BOSS_ARENA_WIDTH * 0.6,
      y: GROUND_Y - 75,
      width: 75,
      height: 75,
    };
    super(config);
    this.arenaLeft = arenaX;
    this.arenaRight = arenaX + LEVEL_BOSS_ARENA_WIDTH;
  }

  updateBehavior(playerX: number, playerY: number): void {
    // Гравитация
    this.vy += 0.45;
    this.y += this.vy;
    if (this.y + this.height >= GROUND_Y) {
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      this.onGround = true;
    }

    // Прыжок
    this.jumpTimer++;
    const jumpInterval = this.phase >= 3 ? 45 : this.phase >= 2 ? 60 : 80;
    if (this.jumpTimer >= jumpInterval && this.onGround) {
      this.vy = this.phase >= 2 ? -13 : -11;
      this.onGround = false;
      this.jumpTimer = 0;
    }

    // Движение к игроку
    const speed = this.phase >= 3 ? 2.5 : this.phase >= 2 ? 1.8 : 1.2;
    if (Math.abs(this.x + this.width / 2 - playerX) > 100) {
      this.x += (playerX > this.x + this.width / 2 ? 1 : -1) * speed;
    }
    this.x = Math.max(this.arenaLeft + 10, Math.min(this.arenaRight - 10 - this.width, this.x));

    // === Фаза 1: огненные шары ===
    this.shootTimer++;
    const shootInterval = this.phase >= 3 ? 60 : 90;
    if (this.shootTimer >= shootInterval) {
      this.shootTimer = 0;
      this.spawnFireBalls(playerX, playerY);
    }

    // Обновление огненных шаров
    for (let i = this.fireBalls.length - 1; i >= 0; i--) {
      const fb = this.fireBalls[i];
      fb.x += fb.vx;
      fb.y += fb.vy;
      fb.vy += 0.3; // гравитация на шар

      // Приземление: оставить лужу
      if (fb.y >= GROUND_Y - 10) {
        this.lavaPools.push({
          x: fb.x - 20, y: GROUND_Y - 8,
          width: 40, height: 8,
          damage: 1, timer: 300,
        });
        this.fireBalls.splice(i, 1);
      } else if (fb.x < this.arenaLeft - 50 || fb.x > this.arenaRight + 50) {
        this.fireBalls.splice(i, 1);
      }
    }

    // Обновление луж лавы
    for (let i = this.lavaPools.length - 1; i >= 0; i--) {
      this.lavaPools[i].timer--;
      if (this.lavaPools[i].timer <= 0) this.lavaPools.splice(i, 1);
    }

    // === Фаза 2: миньоны ===
    if (this.phase >= 2) {
      this.minionTimer++;
      if (this.minionTimer >= 300) { // каждые 5 сек
        this.minionTimer = 0;
        this.spawnMinions();
      }
      for (const m of this.minions) {
        if (!m.alive) continue;
        const dir = playerX > m.x ? 1 : -1;
        m.x += dir * 2.5;
        m.vx = dir;
        // Удержать в арене
        m.x = Math.max(this.arenaLeft, Math.min(this.arenaRight - m.width, m.x));
      }
    }

    // === Фаза 3: дыхание огнём ===
    if (this.phase >= 3) {
      this.breathTimer++;
      if (this.breathTimer >= 180 && !this.breathActive) { // каждые 3 сек
        this.breathActive = true;
        this.breathDir = playerX > this.x + this.width / 2 ? 1 : -1;
      }
      if (this.breathActive && this.breathTimer >= 180 + 120) { // 2 сек активен
        this.breathActive = false;
        this.breathTimer = 0;
      }
    }
  }

  private spawnFireBalls(playerX: number, _playerY: number): void {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dx = playerX - cx;
    const dy = GROUND_Y - 50 - cy; // цель — немного выше земли
    const speed = 5;
    const baseAngle = Math.atan2(dy, dx); // угол к игроку

    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + i * 0.3; // разброс ±0.3 рад (~17°)
      this.fireBalls.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // небольшой бросок вверх
        width: 16, height: 16, damage: 1,
      });
    }
  }

  private spawnMinions(): void {
    // Максимум 2 живых миньона
    const alive = this.minions.filter(m => m.alive).length;
    if (alive >= 2) return;
    for (let i = alive; i < 2; i++) {
      this.minions.push({
        x: this.arenaLeft + 20 + i * 80,
        y: GROUND_Y - 25,
        width: 25, height: 25,
        hp: 15, vx: 1, damage: 1, alive: true,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: number, cameraX = 0): void {
    if (!this.alive && this.defeated) return;
    if (this.invincible && frame % 4 < 2) return;

    const sx = this.x - cameraX;
    const sy = this.y;

    // === Лужи лавы ===
    for (const pool of this.lavaPools) {
      const px = pool.x - cameraX;
      const alpha = Math.min(1, pool.timer / 60);
      const pulse = 0.7 + Math.sin(frame * 0.15) * 0.3;
      ctx.globalAlpha = alpha * pulse;
      ctx.fillStyle = '#ff4400';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 12;
      ctx.fillRect(px, pool.y, pool.width, pool.height);
      // Блик
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(px + 4, pool.y, pool.width - 8, 3);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // === Миньоны ===
    for (const m of this.minions) {
      if (!m.alive) continue;
      const mx = m.x - cameraX;
      const mPulse = 8 + Math.sin(frame * 0.1) * 4;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = mPulse;
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(mx, m.y, m.width, m.height);
      // Глаза миньона
      ctx.fillStyle = '#ffee00';
      ctx.fillRect(mx + 4, m.y + 5, 6, 5);
      ctx.fillRect(mx + 15, m.y + 5, 6, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(mx + 6, m.y + 7, 3, 3);
      ctx.fillRect(mx + 17, m.y + 7, 3, 3);
      // HP мини-бар
      ctx.fillStyle = '#330000';
      ctx.fillRect(mx, m.y - 6, m.width, 3);
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(mx, m.y - 6, m.width * (m.hp / 15), 3);
      ctx.shadowBlur = 0;
    }

    // === Дыхание огнём ===
    if (this.breathActive) {
      const bAlpha = 0.5 + Math.sin(frame * 0.3) * 0.3;
      ctx.globalAlpha = bAlpha;
      ctx.fillStyle = '#ff6600';
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 20;
      const bDir = this.breathDir;
      const bX = bDir > 0 ? sx + this.width : sx - 200;
      ctx.fillRect(bX, sy + this.height / 2 - 8, 200, 16);
      // Предупредительные языки пламени
      for (let fi = 0; fi < 5; fi++) {
        const fx = bX + fi * 40 + Math.sin(frame * 0.2 + fi) * 8;
        const fh = 20 + Math.sin(frame * 0.25 + fi * 1.5) * 10;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(fx, sy + this.height / 2 - 8);
        ctx.lineTo(fx + 10, sy + this.height / 2 - 8 - fh);
        ctx.lineTo(fx + 20, sy + this.height / 2 - 8);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // === Тело босса: оранжевый куб 75x75 с огненным glow ===
    const glowPulse = 20 + Math.sin(frame * 0.07) * 10;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = glowPulse;

    const bodyGrad = ctx.createLinearGradient(sx, sy, sx, sy + this.height);
    bodyGrad.addColorStop(0, '#ff8800');
    bodyGrad.addColorStop(0.5, '#ff4400');
    bodyGrad.addColorStop(1, '#cc2200');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(sx, sy, this.width, this.height);
    ctx.shadowBlur = 0;

    // Обводка
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, this.width, this.height);

    // === Рога (треугольники сверху) ===
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 10;
    // Левый рог
    ctx.beginPath();
    ctx.moveTo(sx + 10, sy);
    ctx.lineTo(sx + 5, sy - 20);
    ctx.lineTo(sx + 20, sy - 5);
    ctx.closePath();
    ctx.fill();
    // Правый рог
    ctx.beginPath();
    ctx.moveTo(sx + this.width - 10, sy);
    ctx.lineTo(sx + this.width - 5, sy - 20);
    ctx.lineTo(sx + this.width - 20, sy - 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // === Злое лицо ===
    // Глаза — белые с чёрным зрачком
    ctx.fillStyle = '#ffee00';
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 8;
    ctx.fillRect(sx + 14, sy + 18, 16, 14);
    ctx.fillRect(sx + 44, sy + 18, 16, 14);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(sx + 18, sy + 21, 8, 8);
    ctx.fillRect(sx + 48, sy + 21, 8, 8);
    // Блики
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx + 18, sy + 21, 3, 3);
    ctx.fillRect(sx + 48, sy + 21, 3, 3);

    // Злые брови
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx + 10, sy + 14);
    ctx.lineTo(sx + 32, sy + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 65, sy + 14);
    ctx.lineTo(sx + 42, sy + 18);
    ctx.stroke();

    // Рот (злой — зигзаг из треугольников)
    ctx.fillStyle = '#440000';
    ctx.fillRect(sx + 16, sy + 45, 43, 12);
    ctx.fillStyle = '#ffaa00';
    for (let ti = 0; ti < 5; ti++) {
      ctx.beginPath();
      ctx.moveTo(sx + 16 + ti * 9, sy + 45);
      ctx.lineTo(sx + 20 + ti * 9, sy + 52);
      ctx.lineTo(sx + 24 + ti * 9, sy + 45);
      ctx.closePath();
      ctx.fill();
    }

    // === Огненные шары ===
    for (const fb of this.fireBalls) {
      const fbx = fb.x - cameraX;
      const fireGlow = 8 + Math.sin(frame * 0.2) * 4;
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = fireGlow;
      const fbGrad = ctx.createRadialGradient(fbx, fb.y, 0, fbx, fb.y, 10);
      fbGrad.addColorStop(0, '#ffee00');
      fbGrad.addColorStop(0.5, '#ff6600');
      fbGrad.addColorStop(1, '#cc2200');
      ctx.fillStyle = fbGrad;
      ctx.beginPath();
      ctx.arc(fbx, fb.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // === Предупреждение перед дыханием ===
    if (!this.breathActive && this.phase >= 3 && this.breathTimer > 150) {
      const warnAlpha = (this.breathTimer - 150) / 30;
      ctx.globalAlpha = warnAlpha * (0.5 + Math.sin(frame * 0.5) * 0.5);
      ctx.fillStyle = '#ff6600';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔥 FIRE!', sx + this.width / 2, sy - 30);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // HP бар
    this.drawHealthBar(ctx);
  }

  onPhaseChange(newPhase: number): void {
    // Взрыв частиц при смене фазы (визуальный эффект через shadowBlur)
    console.log(`Inferno enters phase ${newPhase}!`);
    // Мгновенно спавним миньонов при входе в фазу 2
    if (newPhase === 2) this.spawnMinions();
  }

  onDefeat(): void {
    console.log('Inferno defeated!');
  }

  getProjectiles(): Array<{ x: number; y: number; width: number; height: number; damage: number }> {
    const all: Array<{ x: number; y: number; width: number; height: number; damage: number }> = [];
    for (const fb of this.fireBalls) {
      all.push({ x: fb.x - 10, y: fb.y - 10, width: 20, height: 20, damage: fb.damage });
    }
    for (const pool of this.lavaPools) {
      all.push({ x: pool.x, y: pool.y, width: pool.width, height: pool.height, damage: pool.damage });
    }
    for (const m of this.minions) {
      if (m.alive) all.push({ x: m.x, y: m.y, width: m.width, height: m.height, damage: m.damage });
    }
    if (this.breathActive) {
      const bx = this.breathDir > 0 ? this.x + this.width : this.x - 200;
      all.push({ x: bx, y: this.y + this.height / 2 - 8, width: 200, height: 16, damage: 1 });
    }
    return all;
  }

  getShockwaves(): Array<{ x: number; radius: number; maxRadius: number }> {
    return [];
  }

  /** Наносит урон миньону в точке столкновения */
  hurtMinion(worldX: number, worldY: number): boolean {
    for (const m of this.minions) {
      if (!m.alive) continue;
      if (worldX >= m.x && worldX <= m.x + m.width &&
          worldY >= m.y && worldY <= m.y + m.height) {
        m.hp--;
        if (m.hp <= 0) m.alive = false;
        return true;
      }
    }
    return false;
  }

  /** Ширина экрана для позиционирования дыхания */
  getBreathActive(): boolean {
    return this.breathActive;
  }

  getLavaPools(): LavaPool[] {
    return this.lavaPools;
  }

  getMinions(): Minion[] {
    return this.minions;
  }
}

// Экспортируем типы для App.tsx
export type { LavaPool, Minion };

