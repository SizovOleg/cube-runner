import { Boss, BossConfig } from '../Boss';
import { GROUND_Y, LEVEL_BOSS_ARENA_WIDTH } from '@utils/constants';

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
 * Большой красный куб со злым лицом (60x60).
 *
 * Фаза 1: Прыгает и создаёт ударные волны при приземлении.
 * Фаза 2 (<50% HP): Быстрее прыгает, стреляет огненным снарядом.
 */
export class BossGuardian extends Boss {
  vy = 0;
  private onGround = true;
  private jumpTimer = 0;
  private jumpInterval = 90; // кадров между прыжками
  private projectiles: Projectile[] = [];
  private shockwaves: Array<{ x: number; radius: number; maxRadius: number }> = [];
  private arenaLeft: number;
  private arenaRight: number;

  constructor(arenaX: number) {
    const config: BossConfig = {
      name: 'GUARDIAN',
      maxHP: 20,
      phases: 2,
      x: arenaX + LEVEL_BOSS_ARENA_WIDTH * 0.6,
      y: GROUND_Y - 60,
      width: 60,
      height: 60,
    };
    super(config);
    this.arenaLeft = arenaX;
    this.arenaRight = arenaX + LEVEL_BOSS_ARENA_WIDTH;
  }

  updateBehavior(playerX: number, _playerY: number): void {
    // Гравитация
    this.vy += 0.4;
    this.y += this.vy;

    if (this.y + this.height >= GROUND_Y) {
      if (!this.onGround) {
        // Приземление → ударная волна
        this.shockwaves.push({
          x: this.x + this.width / 2,
          radius: 0,
          maxRadius: this.phase >= 2 ? 180 : 120,
        });
      }
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      this.onGround = true;
    }

    // Прыжок по таймеру
    this.jumpTimer++;
    const interval = this.phase >= 2 ? 55 : this.jumpInterval;
    if (this.jumpTimer >= interval && this.onGround) {
      this.vy = this.phase >= 2 ? -12 : -10;
      this.onGround = false;
      this.jumpTimer = 0;

      // Фаза 2: стрельба огненным снарядом в сторону игрока
      if (this.phase >= 2) {
        const dx = playerX - this.x;
        const speed = 4;
        this.projectiles.push({
          x: this.x + this.width / 2,
          y: this.y + this.height / 2,
          width: 14,
          height: 14,
          vx: dx > 0 ? -speed : speed,
          vy: 0,
          damage: 1,
        });
      }
    }

    // Медленное движение к игроку
    const targetX = playerX;
    if (Math.abs(this.x + this.width / 2 - targetX) > 80) {
      this.x += (targetX > this.x + this.width / 2 ? 1 : -1) * (this.phase >= 2 ? 1.5 : 0.8);
    }

    // Ограничение босса в арене
    if (this.x < this.arenaLeft + 10) this.x = this.arenaLeft + 10;
    if (this.x + this.width > this.arenaRight - 10) this.x = this.arenaRight - 10 - this.width;

    // Обновление снарядов
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      // Удалить снаряд за пределами арены
      if (p.x < this.arenaLeft - 50 || p.x > this.arenaRight + 50) {
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

  /**
   * Отрисовка босса в screen-space.
   * @param cameraX — позиция камеры для конвертации world→screen
   */
  draw(ctx: CanvasRenderingContext2D, frame: number, cameraX = 0): void {
    if (!this.alive && this.defeated) return;

    const sx = this.x - cameraX; // screen X
    const sy = this.y;

    // Мерцание при неуязвимости
    if (this.invincible && frame % 4 < 2) return;

    // Тело босса — красный куб 60x60 с glow
    ctx.fillStyle = '#cc0022';
    ctx.shadowColor = '#ff0044';
    ctx.shadowBlur = 25;
    ctx.fillRect(sx, sy, this.width, this.height);
    ctx.shadowBlur = 0;

    // Красная обводка
    ctx.strokeStyle = '#ff2244';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, this.width, this.height);

    // Глаза (злые, белые с чёрным зрачком)
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx + 12, sy + 15, 12, 10);
    ctx.fillRect(sx + 36, sy + 15, 12, 10);
    ctx.fillStyle = '#000';
    ctx.fillRect(sx + 16, sy + 18, 6, 6);
    ctx.fillRect(sx + 40, sy + 18, 6, 6);

    // Злые брови
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy + 10);
    ctx.lineTo(sx + 26, sy + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 52, sy + 10);
    ctx.lineTo(sx + 34, sy + 14);
    ctx.stroke();

    // Рот (злой)
    ctx.fillStyle = '#440000';
    ctx.fillRect(sx + 18, sy + 38, 24, 8);
    ctx.fillStyle = '#fff';
    // Зубы
    ctx.fillRect(sx + 20, sy + 38, 4, 4);
    ctx.fillRect(sx + 26, sy + 38, 4, 4);
    ctx.fillRect(sx + 32, sy + 38, 4, 4);
    ctx.fillRect(sx + 38, sy + 38, 4, 4);

    // Снаряды босса
    ctx.fillStyle = '#ff4400';
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 12;
    for (const p of this.projectiles) {
      const px = p.x - cameraX;
      ctx.beginPath();
      ctx.arc(px, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Ударные волны (полукруг по земле)
    for (const sw of this.shockwaves) {
      const swx = sw.x - cameraX;
      const alpha = 1 - sw.radius / sw.maxRadius;
      ctx.strokeStyle = `rgba(255, 0, 68, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = `rgba(255, 0, 68, ${alpha * 0.5})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(swx, GROUND_Y, sw.radius, Math.PI, 0);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // HP бар
    this.drawHealthBar(ctx);
  }

  onPhaseChange(newPhase: number): void {
    // Большая ударная волна при смене фазы
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

  getShockwaves(): Array<{ x: number; radius: number; maxRadius: number }> {
    return this.shockwaves;
  }
}
