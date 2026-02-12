import { Boss, BossConfig } from '../Boss';
import { GROUND_Y } from '@utils/constants';

interface Projectile {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  damage: number;
}

/**
 * Босс 1: Guardian
 * Большой красный куб с щитом.
 * 
 * Фаза 1: Прыгает и создаёт ударные волны при приземлении.
 * Фаза 2: Быстрее прыгает, стреляет снарядами в прыжке.
 */
export class BossGuardian extends Boss {
  private vy = 0;
  private onGround = true;
  private jumpTimer = 0;
  private jumpInterval = 90; // кадров между прыжками
  private projectiles: Projectile[] = [];
  private shockwaves: Array<{ x: number; radius: number; maxRadius: number }> = [];

  constructor(arenaX: number) {
    const config: BossConfig = {
      name: 'GUARDIAN',
      maxHP: 20,
      phases: 2,
      x: arenaX + 400,
      y: GROUND_Y - 60,
      width: 60,
      height: 60,
    };
    super(config);
  }

  updateBehavior(playerX: number, _playerY: number): void {
    // Гравитация
    this.vy += 0.4;
    this.y += this.vy;

    if (this.y + this.height >= GROUND_Y) {
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      if (!this.onGround) {
        // Приземление → ударная волна
        this.shockwaves.push({
          x: this.x + this.width / 2,
          radius: 0,
          maxRadius: this.phase >= 2 ? 150 : 100,
        });
      }
      this.onGround = true;
    }

    // Прыжок по таймеру
    this.jumpTimer++;
    const interval = this.phase >= 2 ? 60 : this.jumpInterval;
    if (this.jumpTimer >= interval && this.onGround) {
      this.vy = this.phase >= 2 ? -12 : -10;
      this.onGround = false;
      this.jumpTimer = 0;

      // Фаза 2: стрельба в прыжке
      if (this.phase >= 2) {
        const dx = playerX - this.x;
        const speed = 4;
        this.projectiles.push({
          x: this.x + this.width / 2,
          y: this.y + this.height / 2,
          width: 12,
          height: 12,
          vx: dx > 0 ? -speed : speed,
          vy: 0,
          damage: 1,
        });
      }
    }

    // Движение к игроку (медленно)
    const targetX = playerX;
    if (Math.abs(this.x - targetX) > 80) {
      this.x += (targetX > this.x ? 1 : -1) * (this.phase >= 2 ? 1.5 : 0.8);
    }

    // Обновление снарядов
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -50 || p.x > 900) {
        this.projectiles.splice(i, 1);
      }
    }

    // Обновление ударных волн
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i].radius += 4;
      if (this.shockwaves[i].radius >= this.shockwaves[i].maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: number): void {
    if (!this.alive && this.defeated) return;

    // Мерцание при неуязвимости
    if (this.invincible && frame % 4 < 2) return;

    // Тело босса
    ctx.fillStyle = '#cc0022';
    ctx.shadowColor = '#ff0044';
    ctx.shadowBlur = 20;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.shadowBlur = 0;

    // Глаза (злые)
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x + 12, this.y + 15, 12, 10);
    ctx.fillRect(this.x + 36, this.y + 15, 12, 10);
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x + 16, this.y + 18, 6, 6);
    ctx.fillRect(this.x + 40, this.y + 18, 6, 6);

    // Злые брови
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x + 8, this.y + 10);
    ctx.lineTo(this.x + 26, this.y + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x + 52, this.y + 10);
    ctx.lineTo(this.x + 34, this.y + 14);
    ctx.stroke();

    // Снаряды
    ctx.fillStyle = '#ff4400';
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 10;
    for (const p of this.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Ударные волны
    for (const sw of this.shockwaves) {
      const alpha = 1 - sw.radius / sw.maxRadius;
      ctx.strokeStyle = `rgba(255, 0, 68, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sw.x, GROUND_Y, sw.radius, Math.PI, 0);
      ctx.stroke();
    }

    // HP бар
    this.drawHealthBar(ctx);
  }

  onPhaseChange(newPhase: number): void {
    // Визуальный эффект при смене фазы
    this.shockwaves.push({
      x: this.x + this.width / 2,
      radius: 0,
      maxRadius: 200,
    });
    console.log(`Guardian enters phase ${newPhase}!`);
  }

  onDefeat(): void {
    console.log('Guardian defeated!');
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }
}
