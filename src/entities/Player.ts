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
  gravityDir = 1; // 1 = normal, -1 = inverted

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
      this.vy = JUMP_FORCE * this.gravityDir;
      this.onGround = false;
      this.doubleJumpAvailable = this.hasDoubleJump;
    }
  }

  /** Второй прыжок в воздухе. Возвращает true если выполнен. */
  doubleJump(): boolean {
    if (this.hasDoubleJump && this.doubleJumpAvailable && !this.onGround) {
      this.vy = JUMP_FORCE * this.gravityDir;
      this.doubleJumpAvailable = false;
      return true;
    }
    return false;
  }

  fly(): void {
    if (!this.onGround) {
      this.vy += FLY_FORCE * this.gravityDir;
      if (this.gravityDir === 1 && this.vy < -5) this.vy = -5;
      if (this.gravityDir === -1 && this.vy > 5) this.vy = 5;
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
      // === Squash-stretch при приземлении + Переворот при антигравитации ===
      const squashProgress = this.squashTimer / 8;
      const scaleX = 1 + squashProgress * 0.25;
      const scaleY = (1 - squashProgress * 0.2) * this.gravityDir;
      ctx.scale(scaleX, scaleY);

      ctx.rotate((this.rotation * Math.PI) / 180);

      const s = this.width; // cube size

      // ── Layer 1: Outer glow (large soft shadow) ──
      ctx.shadowColor = this.skinColor;
      ctx.shadowBlur = 30;
      ctx.fillStyle = this.skinColor + '33';
      roundRect(ctx, -hw - 5, -hh - 5, s + 10, s + 10, 7);
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Layer 2: Dark border (creates depth) ──
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 0.5;
      roundRect(ctx, -hw - 1, -hh - 1, s + 2, s + 2, 5);
      ctx.fill();
      ctx.globalAlpha = 1;

      // ── Layer 3: Main body with radial gradient (3D effect) ──
      const bodyGrad = ctx.createRadialGradient(-hw + s * 0.35, -hh + s * 0.3, 0, 0, 0, s * 0.8);
      bodyGrad.addColorStop(0, this.skinColor);
      bodyGrad.addColorStop(0.6, this.skinColor);
      bodyGrad.addColorStop(1, this.skinColor + '88');
      ctx.fillStyle = bodyGrad;
      roundRect(ctx, -hw, -hh, s, s, 4);
      ctx.fill();

      // ── Layer 4: Inner darker edge ring (depth illusion like GD) ──
      ctx.save();
      roundRect(ctx, -hw, -hh, s, s, 4);
      ctx.clip();
      // Top-left inner shadow
      const innerShadow = ctx.createLinearGradient(-hw, -hh, -hw, -hh + s);
      innerShadow.addColorStop(0, 'rgba(255,255,255,0.15)');
      innerShadow.addColorStop(0.15, 'rgba(255,255,255,0.03)');
      innerShadow.addColorStop(0.85, 'rgba(0,0,0,0.05)');
      innerShadow.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = innerShadow;
      ctx.fillRect(-hw, -hh, s, s);
      // Side shadow (left-right gradient)
      const sideShadow = ctx.createLinearGradient(-hw, 0, -hw + s, 0);
      sideShadow.addColorStop(0, 'rgba(255,255,255,0.08)');
      sideShadow.addColorStop(0.15, 'rgba(0,0,0,0)');
      sideShadow.addColorStop(0.85, 'rgba(0,0,0,0)');
      sideShadow.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = sideShadow;
      ctx.fillRect(-hw, -hh, s, s);

      // ── Layer 5: Inner decorative chevron pattern (GD signature detail) ──
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      // Inner square frame
      roundRect(ctx, -hw + 5, -hh + 5, s - 10, s - 10, 2);
      ctx.stroke();
      // Center cross / chevron
      ctx.beginPath();
      ctx.moveTo(-hw + s * 0.2, 0);
      ctx.lineTo(0, -hh + s * 0.2);
      ctx.lineTo(hw - s * 0.2, 0);
      ctx.lineTo(0, hh - s * 0.2);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.restore();

      // ── Layer 6: Specular shine (top-left hotspot) ──
      ctx.globalAlpha = 0.35;
      const specGrad = ctx.createRadialGradient(-hw + 8, -hh + 8, 0, -hw + 8, -hh + 8, s * 0.45);
      specGrad.addColorStop(0, '#ffffff');
      specGrad.addColorStop(0.4, 'rgba(255,255,255,0.15)');
      specGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = specGrad;
      ctx.fillRect(-hw, -hh, s * 0.65, s * 0.65);
      ctx.globalAlpha = 1;

      // ── Layer 7: Top highlight bar ──
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, -hw + 3, -hh + 2, s - 6, 5, 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // ── Layer 8: Neon border outline ──
      ctx.strokeStyle = this.skinColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      ctx.shadowColor = this.skinColor;
      ctx.shadowBlur = 8;
      roundRect(ctx, -hw, -hh, s, s, 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // ═══ FACE: GD-style with round eyes & tracking pupils ═══
      const eyeSize = 6;
      const eyeSpacing = 12;
      // Eye positions shift based on velocity
      let eyeShiftY = 0;
      let eyeShiftX = 0;
      if (this.vy < -3) eyeShiftY = -2;
      else if (this.vy > 3) eyeShiftY = 2;
      // Pupils slightly move with rotation
      eyeShiftX = Math.sin(this.rotation * Math.PI / 180) * 1.5;

      // Left eye white
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeSpacing / 2, -2 + eyeShiftY, eyeSize / 2 + 1, 0, Math.PI * 2);
      ctx.fill();
      // Right eye white
      ctx.beginPath();
      ctx.arc(eyeSpacing / 2, -2 + eyeShiftY, eyeSize / 2 + 1, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (black)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-eyeSpacing / 2 + eyeShiftX, -2 + eyeShiftY + 0.5, eyeSize / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpacing / 2 + eyeShiftX, -2 + eyeShiftY + 0.5, eyeSize / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupil highlights (white dots)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeSpacing / 2 - 1, -3 + eyeShiftY, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpacing / 2 - 1, -3 + eyeShiftY, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Mouth: changes expression based on state
      ctx.fillStyle = '#000000';
      if (this.vy < -2) {
        // Jumping — open mouth (excited)
        ctx.beginPath();
        ctx.arc(0, 5, 3, 0, Math.PI);
        ctx.fill();
      } else if (this.vy > 4) {
        // Falling fast — scared 'O'
        ctx.beginPath();
        ctx.arc(0, 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal — slight smile
        ctx.beginPath();
        ctx.arc(0, 4, 4, 0.1, Math.PI - 0.1);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      }
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
