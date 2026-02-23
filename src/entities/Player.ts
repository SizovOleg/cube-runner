import { ENTITY_SIZE, GROUND_Y, JUMP_FORCE, FLY_FORCE, COLORS, PowerupType, POWERUP_DURATION } from '@utils/constants';
import { roundRect } from '@utils/canvasUtils';

/**
 * Игрок — зелёный куб.
 */
export class Player {
  x: number;
  y: number;
  width = ENTITY_SIZE;
  height = ENTITY_SIZE;
  vy = 0;
  onGround = true;
  rotation = 0;

  // Боевая система
  hp: number;
  maxHP: number;
  shootCooldown = 0;

  // Powerups
  inventory: (PowerupType | null)[] = [null, null, null];
  shieldTimer = 0;
  rocketTimer = 0;

  // Состояние
  alive = true;
  invincibleTimer = 0;
  corridorMode = false;

  // Апгрейды
  hasDoubleJump = false;
  doubleJumpAvailable = false; // сброс при приземлении
  magnetTimer = 0;          // кадры магнита
  superBulletTimer = 0;     // кадры суперпули

  // Визуальные эффекты
  squashTimer = 0;
  private trail: Array<{ x: number; y: number }> = [];

  // Скин
  skinColor: string;
  skinGlow: string;

  constructor(x = 100, hp = 3, skinColor?: string) {
    this.x = x;
    this.y = GROUND_Y - ENTITY_SIZE;
    this.hp = hp;
    this.maxHP = hp;
    this.skinColor = skinColor || COLORS.cube;
    this.skinGlow = Player.hexToGlow(this.skinColor);
  }

  /** Конвертирует hex-цвет в rgba для glow-эффекта */
  static hexToGlow(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.4)`;
  }

  jump(): void {
    if (this.onGround) {
      this.vy = JUMP_FORCE;
      this.onGround = false;
      this.doubleJumpAvailable = this.hasDoubleJump;
    }
  }

  /** Второй прыжок в воздухе. Возвращает true если выполнен. */
  doubleJump(): boolean {
    if (this.hasDoubleJump && this.doubleJumpAvailable && !this.onGround) {
      this.vy = JUMP_FORCE;
      this.doubleJumpAvailable = false;
      return true;
    }
    return false;
  }

  fly(): void {
    if (!this.onGround) {
      this.vy += FLY_FORCE;
      if (this.vy < -5) this.vy = -5;
    }
  }

  isMagnetActive(): boolean { return this.magnetTimer > 0; }
  isSuperBullet(): boolean { return this.superBulletTimer > 0; }

  takeDamage(amount = 1): boolean {
    if (this.invincibleTimer > 0 || this.shieldTimer > 0) {
      if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - 30);
      return false;
    }
    this.hp -= amount;
    this.invincibleTimer = 60; // Неуязвимость после удара
    if (this.hp <= 0) {
      this.alive = false;
      return true; // Мёртв
    }
    return false;
  }

  usePowerup(slot: number): PowerupType | null {
    if (slot < 0 || slot > 2) return null;
    const pw = this.inventory[slot];
    if (!pw) return null;
    this.inventory[slot] = null;

    switch (pw) {
      case 'shield':
        this.shieldTimer = POWERUP_DURATION.shield!;
        break;
      case 'rocket':
        this.rocketTimer = POWERUP_DURATION.rocket!;
        break;
      case 'bomb':
        // Бомба обрабатывается внешне (создаёт снаряд)
        break;
    }
    return pw;
  }

  collectPowerup(type: PowerupType): boolean {
    const emptySlot = this.inventory.indexOf(null);
    if (emptySlot === -1) return false;
    this.inventory[emptySlot] = type;
    return true;
  }

  isRocketMode(): boolean {
    return this.rocketTimer > 0;
  }

  isShielded(): boolean {
    return this.shieldTimer > 0;
  }

  /** Вызвать при приземлении для эффекта squash-stretch. */
  triggerLanding(): void {
    this.squashTimer = 8;
  }

  update(): void {
    if (this.shieldTimer > 0) this.shieldTimer--;
    if (this.rocketTimer > 0) this.rocketTimer--;
    if (this.invincibleTimer > 0) this.invincibleTimer--;
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.squashTimer > 0) this.squashTimer--;
    if (this.magnetTimer > 0) this.magnetTimer--;
    if (this.superBulletTimer > 0) this.superBulletTimer--;
    if (this.onGround) this.doubleJumpAvailable = this.hasDoubleJump;

    // Обновление трейла (запоминаем последние 5 позиций)
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
  }

  draw(ctx: CanvasRenderingContext2D, frame: number): void {
    if (!this.alive) return;
    if (this.invincibleTimer > 0 && frame % 4 < 2) return; // Мерцание

    const hw = this.width / 2;
    const hh = this.height / 2;

    // === Трейл: плавно затухающая полоса (7 прямоугольников) ===
    if (!this.isRocketMode() && !this.corridorMode) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const trailPos = this.trail[i];
        const t = (i + 1) / this.trail.length; // 0..1
        const alpha = t * t * 0.25;
        const size = this.width * (0.3 + t * 0.55);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.skinColor;
        const tx = trailPos.x + (this.width - size) / 2;
        const ty = trailPos.y + (this.height - size) / 2;
        roundRect(ctx, tx, ty, size, size, 3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(this.x + hw, this.y + hh);

    if (this.isRocketMode() || this.corridorMode) {
      // Режим ракеты / коридора
      ctx.rotate(frame * 0.3);
      // Внешнее свечение
      ctx.shadowColor = COLORS.rocket;
      ctx.shadowBlur = 25;
      ctx.fillStyle = COLORS.rocket;
      ctx.beginPath();
      ctx.moveTo(hw + 8, 0);
      ctx.lineTo(-hw, -hh - 2);
      ctx.lineTo(-hw, hh + 2);
      ctx.closePath();
      ctx.fill();
      // Внутренний яркий блик
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(hw + 2, 0);
      ctx.lineTo(-hw + 4, -hh + 4);
      ctx.lineTo(-hw + 4, hh - 4);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    } else {
      // === Squash-stretch при приземлении ===
      const squashProgress = this.squashTimer / 8;
      const scaleX = 1 + squashProgress * 0.25;
      const scaleY = 1 - squashProgress * 0.2;
      ctx.scale(scaleX, scaleY);

      ctx.rotate((this.rotation * Math.PI) / 180);

      // Внешнее мягкое свечение (25px)
      ctx.shadowColor = this.skinColor;
      ctx.shadowBlur = 25;
      ctx.fillStyle = this.skinColor + '44';
      roundRect(ctx, -hw - 3, -hh - 3, this.width + 6, this.height + 6, 6);
      ctx.fill();

      // Внутренний яркий glow (10px) + тело
      ctx.shadowBlur = 10;
      ctx.fillStyle = this.skinColor;
      roundRect(ctx, -hw, -hh, this.width, this.height, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Блик (highlight) — верхний светлый край
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, -hw + 2, -hh + 2, this.width - 4, 6, 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Лицо — глаза с бликами
      let eyeOffsetY = -5;
      if (this.vy < -3) eyeOffsetY = -7;
      else if (this.vy > 3) eyeOffsetY = -3;

      // Глаза (чуть крупнее)
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, eyeOffsetY, 5, 5);
      ctx.fillRect(3, eyeOffsetY, 5, 5);
      // Рот
      ctx.fillRect(-5, 3, 10, 2);
      // Блики на глазах (2x2 белый пиксель)
      ctx.fillStyle = '#fff';
      ctx.fillRect(-7, eyeOffsetY, 2, 2);
      ctx.fillRect(4, eyeOffsetY, 2, 2);
    }

    ctx.restore();

    // Щит
    if (this.isShielded()) {
      ctx.globalAlpha = 0.2 + Math.sin(frame * 0.15) * 0.1;
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 3;
      ctx.shadowColor = COLORS.shield;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width + 6 + Math.sin(frame * 0.1) * 2,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }
}
