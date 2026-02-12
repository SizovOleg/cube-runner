import { ENTITY_SIZE, COLORS } from '@utils/constants';
import { EnemyType } from '@levels/types';

interface EnemyConfig {
  x: number;
  y: number;
  type: EnemyType;
  patrolRange?: number;
}

/**
 * Враг. Разные типы имеют разное поведение.
 * - basic: стоит на месте, убивается одним ударом
 * - shooter: стреляет в сторону игрока, красная точка-прицел мигает перед выстрелом
 * - flying: летает вверх-вниз, маленькие крылья
 * - armored: требует 2 удара, металлический блеск
 */
export class Enemy {
  x: number;
  y: number;
  width = ENTITY_SIZE;
  height = ENTITY_SIZE;
  type: EnemyType;
  alive = true;
  hp: number;

  // Патрулирование
  private originX: number;
  private originY: number;
  private patrolRange: number;
  private patrolDir = 1;
  private patrolSpeed: number;

  // Стрельба (для shooter)
  shootCooldown = 0;
  shootInterval = 90;

  constructor(config: EnemyConfig) {
    this.x = config.x;
    this.y = config.y;
    this.originX = config.x;
    this.originY = config.y;
    this.type = config.type;
    this.patrolRange = config.patrolRange ?? 0;

    switch (config.type) {
      case 'basic':
        this.hp = 1;
        this.patrolSpeed = 0;
        break;
      case 'shooter':
        this.hp = 1;
        this.patrolSpeed = 0;
        break;
      case 'flying':
        this.hp = 1;
        this.patrolSpeed = 1;
        this.patrolRange = config.patrolRange ?? 60;
        break;
      case 'armored':
        this.hp = 2;
        this.patrolSpeed = 0.5;
        this.patrolRange = config.patrolRange ?? 40;
        break;
    }
  }

  update(_playerX: number): void {
    if (!this.alive) return;

    // Патрулирование
    if (this.patrolRange > 0) {
      if (this.type === 'flying') {
        this.y += this.patrolSpeed * this.patrolDir;
        if (Math.abs(this.y - this.originY) >= this.patrolRange) {
          this.patrolDir *= -1;
        }
      } else {
        this.x += this.patrolSpeed * this.patrolDir;
        if (Math.abs(this.x - this.originX) >= this.patrolRange) {
          this.patrolDir *= -1;
        }
      }
    }

    // Стрельба
    if (this.type === 'shooter') {
      this.shootCooldown--;
    }
  }

  takeDamage(amount = 1): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  shouldShoot(): boolean {
    if (this.type !== 'shooter' || this.shootCooldown > 0) return false;
    this.shootCooldown = this.shootInterval;
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, frame: number): void {
    if (!this.alive) return;

    const color = this.type === 'armored' ? '#aa2222' : COLORS.enemy;

    // === Flying: крылья (рисуются ДО тела) ===
    if (this.type === 'flying') {
      const wingFlap = Math.sin(frame * 0.15) * 5;
      ctx.fillStyle = 'rgba(255,100,100,0.5)';
      // Левое крыло
      ctx.beginPath();
      ctx.moveTo(screenX, this.y + 8);
      ctx.lineTo(screenX - 10, this.y + 12 + wingFlap);
      ctx.lineTo(screenX, this.y + 20);
      ctx.closePath();
      ctx.fill();
      // Правое крыло
      ctx.beginPath();
      ctx.moveTo(screenX + this.width, this.y + 8);
      ctx.lineTo(screenX + this.width + 10, this.y + 12 + wingFlap);
      ctx.lineTo(screenX + this.width, this.y + 20);
      ctx.closePath();
      ctx.fill();
    }

    // Тело
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillRect(screenX, this.y, this.width, this.height);
    ctx.shadowBlur = 0;

    // === Armored: металлический блеск (горизонтальная линия-блик) ===
    if (this.type === 'armored') {
      const shineY = (frame * 2) % (this.height + 20) - 10;
      if (shineY >= 0 && shineY < this.height - 2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(screenX, this.y, this.width, this.height);
        ctx.clip();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX, this.y + shineY, this.width, 3);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Глаза
    ctx.fillStyle = COLORS.enemyEye;
    const blink = Math.sin(frame * 0.1) > 0.85;
    ctx.fillRect(screenX + 6, this.y + 8, 6, blink ? 1 : 5);
    ctx.fillRect(screenX + 18, this.y + 8, 6, blink ? 1 : 5);

    // Злые брови
    ctx.strokeStyle = COLORS.enemyEye;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX + 5, this.y + 5);
    ctx.lineTo(screenX + 13, this.y + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(screenX + 25, this.y + 5);
    ctx.lineTo(screenX + 17, this.y + 7);
    ctx.stroke();

    // === Shooter: красная точка-прицел мигает перед выстрелом ===
    if (this.type === 'shooter' && this.shootCooldown > 0 && this.shootCooldown < 20) {
      const dotRadius = 2 + Math.sin(frame * 0.5) * 1;
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(screenX + this.width / 2, this.y + this.height / 2 + 2, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Индикатор HP для armored
    if (this.type === 'armored' && this.hp > 1) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(screenX + 10, this.y - 6, 10, 3);
    }
  }
}
