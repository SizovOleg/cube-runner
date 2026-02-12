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
 * Босс 2: Crusher
 * Огромный тёмно-фиолетовый куб 80x80 со злым лицом.
 *
 * Фаза 1: Прыгает высоко и падает на позицию игрока. При приземлении — тряска экрана.
 * Фаза 2 (<50% HP): Быстрее, при приземлении разлетаются каменные снаряды в стороны.
 */
export class BossCrusher extends Boss {
  vy = 0;
  private onGround = true;
  private jumpTimer = 0;
  private jumpInterval = 100; // кадров между прыжками
  private projectiles: Projectile[] = [];
  private arenaLeft: number;
  private arenaRight: number;
  private targetX = 0; // Позиция игрока при взлёте — цель приземления
  private isAirborne = false;
  screenShake = 0; // Публичное — читается из App.tsx для тряски canvas

  constructor(arenaX: number) {
    const config: BossConfig = {
      name: 'CRUSHER',
      maxHP: 30,
      phases: 2,
      x: arenaX + LEVEL_BOSS_ARENA_WIDTH * 0.6,
      y: GROUND_Y - 80,
      width: 80,
      height: 80,
    };
    super(config);
    this.arenaLeft = arenaX;
    this.arenaRight = arenaX + LEVEL_BOSS_ARENA_WIDTH;
  }

  updateBehavior(playerX: number, _playerY: number): void {
    // Тряска экрана уменьшается
    if (this.screenShake > 0) this.screenShake -= 0.5;

    // Гравитация (ускоренная при падении для ощущения тяжести)
    if (this.vy > 0) {
      this.vy += 0.7; // Быстрое падение
    } else {
      this.vy += 0.35;
    }
    this.y += this.vy;

    // Приземление
    if (this.y + this.height >= GROUND_Y) {
      if (this.isAirborne) {
        // Тряска экрана при приземлении
        this.screenShake = 8;
        this.isAirborne = false;

        // Фаза 2: каменные снаряды при приземлении
        if (this.phase >= 2) {
          this.spawnDebris();
        }
      }
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      this.onGround = true;
    }

    // Прыжок по таймеру
    this.jumpTimer++;
    const interval = this.phase >= 2 ? 65 : this.jumpInterval;
    if (this.jumpTimer >= interval && this.onGround) {
      // Запомнить позицию игрока как цель
      this.targetX = playerX;
      // Высокий прыжок
      this.vy = this.phase >= 2 ? -16 : -14;
      this.onGround = false;
      this.isAirborne = true;
      this.jumpTimer = 0;
    }

    // В воздухе: двигаемся к целевой позиции
    if (this.isAirborne) {
      const targetCenterX = this.targetX - this.width / 2;
      const diff = targetCenterX - this.x;
      const moveSpeed = this.phase >= 2 ? 5 : 3.5;
      if (Math.abs(diff) > moveSpeed) {
        this.x += diff > 0 ? moveSpeed : -moveSpeed;
      } else {
        this.x = targetCenterX;
      }
    } else {
      // На земле: медленное преследование
      const chaseSpeed = this.phase >= 2 ? 0.6 : 0.3;
      if (Math.abs(this.x + this.width / 2 - playerX) > 60) {
        this.x += (playerX > this.x + this.width / 2 ? 1 : -1) * chaseSpeed;
      }
    }

    // Ограничение в арене
    if (this.x < this.arenaLeft + 10) this.x = this.arenaLeft + 10;
    if (this.x + this.width > this.arenaRight - 10) this.x = this.arenaRight - 10 - this.width;

    // Обновление снарядов
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // Гравитация на осколки
      // Удалить за пределами арены или ниже земли
      if (p.x < this.arenaLeft - 50 || p.x > this.arenaRight + 50 || p.y > GROUND_Y + 20) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * Создаёт каменные осколки при приземлении (фаза 2).
   */
  private spawnDebris(): void {
    const centerX = this.x + this.width / 2;
    const baseY = GROUND_Y - 10;
    // 4 осколка: 2 влево, 2 вправо
    const speeds = [-5, -3, 3, 5];
    for (const vx of speeds) {
      this.projectiles.push({
        x: centerX,
        y: baseY,
        width: 12,
        height: 12,
        vx,
        vy: -6 - Math.random() * 3,
        damage: 1,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: number, cameraX = 0): void {
    if (!this.alive && this.defeated) return;

    const sx = this.x - cameraX;
    const sy = this.y;

    // Мерцание при неуязвимости
    if (this.invincible && frame % 4 < 2) return;

    // Тень на земле (когда в воздухе)
    if (this.isAirborne) {
      const shadowWidth = this.width * 0.8;
      const targetSx = this.targetX - shadowWidth / 2 - cameraX;
      ctx.fillStyle = 'rgba(100, 0, 150, 0.3)';
      ctx.beginPath();
      ctx.ellipse(targetSx + shadowWidth / 2, GROUND_Y - 2, shadowWidth / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Тело — тёмно-фиолетовый куб 80x80 с мощным glow
    ctx.fillStyle = '#4a0066';
    ctx.shadowColor = '#8800cc';
    ctx.shadowBlur = 30;
    ctx.fillRect(sx, sy, this.width, this.height);
    ctx.shadowBlur = 0;

    // Фиолетовая обводка
    ctx.strokeStyle = '#aa44ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, this.width, this.height);

    // "Трещины" на теле — декоративные линии
    ctx.strokeStyle = '#6622aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 15, sy + 5);
    ctx.lineTo(sx + 30, sy + 35);
    ctx.lineTo(sx + 20, sy + 60);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 55, sy + 10);
    ctx.lineTo(sx + 50, sy + 45);
    ctx.lineTo(sx + 65, sy + 75);
    ctx.stroke();

    // Глаза — злые, большие, жёлтые
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 6;
    ctx.fillRect(sx + 14, sy + 22, 16, 12);
    ctx.fillRect(sx + 50, sy + 22, 16, 12);
    ctx.shadowBlur = 0;

    // Зрачки — чёрные
    ctx.fillStyle = '#000';
    ctx.fillRect(sx + 20, sy + 26, 8, 6);
    ctx.fillRect(sx + 56, sy + 26, 8, 6);

    // Злые брови — толстые
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx + 10, sy + 16);
    ctx.lineTo(sx + 32, sy + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 70, sy + 16);
    ctx.lineTo(sx + 48, sy + 22);
    ctx.stroke();

    // Рот — широкий, злой
    ctx.fillStyle = '#220033';
    ctx.fillRect(sx + 20, sy + 52, 40, 12);
    // Зубы — неровные
    ctx.fillStyle = '#ddd';
    ctx.fillRect(sx + 22, sy + 52, 6, 5);
    ctx.fillRect(sx + 30, sy + 52, 5, 6);
    ctx.fillRect(sx + 38, sy + 52, 6, 5);
    ctx.fillRect(sx + 46, sy + 52, 5, 6);
    ctx.fillRect(sx + 54, sy + 52, 4, 5);

    // Снаряды (каменные осколки)
    for (const p of this.projectiles) {
      const px = p.x - cameraX;
      ctx.fillStyle = '#886644';
      ctx.shadowColor = '#aa8866';
      ctx.shadowBlur = 6;
      // Квадратный осколок с поворотом
      ctx.save();
      ctx.translate(px + p.width / 2, p.y + p.height / 2);
      ctx.rotate(frame * 0.15);
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // HP бар
    this.drawHealthBar(ctx);
  }

  onPhaseChange(newPhase: number): void {
    // Большая тряска при смене фазы
    this.screenShake = 15;
    // Взрыв осколков
    this.spawnDebris();
    this.spawnDebris(); // Двойная порция
    console.log(`Crusher enters phase ${newPhase}!`);
  }

  onDefeat(): void {
    this.screenShake = 20;
    console.log('Crusher defeated!');
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  /**
   * Crusher не использует shockwaves как Guardian,
   * но интерфейс унифицирован для App.tsx.
   */
  getShockwaves(): Array<{ x: number; radius: number; maxRadius: number }> {
    return [];
  }
}
