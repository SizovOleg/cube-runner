import { ENTITY_SIZE, COLORS } from '@utils/constants';
import { EnemyType } from '@levels/types';

const CHOMPER_SIZE = 35;
const CHOMPER_AGGRO_RANGE = 200;
const CHOMPER_SPEED = 3;

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
 * - chomper: фиолетовый зубастый монстр, бросается на игрока в радиусе 200px, требует 2 удара
 */
export class Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
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

  // Chomper: агрессия
  private chomperAggroed = false;

  constructor(config: EnemyConfig) {
    this.x = config.x;
    this.y = config.y;
    this.originX = config.x;
    this.originY = config.y;
    this.type = config.type;
    this.patrolRange = config.patrolRange ?? 0;

    if (config.type === 'chomper') {
      this.width = CHOMPER_SIZE;
      this.height = CHOMPER_SIZE;
    } else {
      this.width = ENTITY_SIZE;
      this.height = ENTITY_SIZE;
    }

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
      case 'chomper':
        this.hp = 2;
        this.patrolSpeed = 0;
        break;
    }
  }

  update(playerX: number): void {
    if (!this.alive) return;

    // === Chomper: бросок на игрока ===
    if (this.type === 'chomper') {
      const dx = playerX - this.x;
      if (Math.abs(dx) < CHOMPER_AGGRO_RANGE) {
        this.chomperAggroed = true;
      }
      if (this.chomperAggroed) {
        this.x += Math.sign(dx) * CHOMPER_SPEED;
      }
      return;
    }

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

  private static roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void };
    if (rr.roundRect) { rr.roundRect(x, y, w, h, r); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, frame: number): void {
    if (!this.alive) return;

    // === Chomper ===
    if (this.type === 'chomper') {
      this.drawChomper(ctx, screenX, frame);
      return;
    }

    const color = this.type === 'armored' ? '#aa2222' : COLORS.enemy;
    // Пульсирующее свечение (shadowBlur 8-15px по синусоиде)
    const glowPulse = 8 + Math.sin(frame * 0.08) * 7;

    // === Flying: крылья ===
    if (this.type === 'flying') {
      const wingFlap = Math.sin(frame * 0.15) * 5;
      ctx.fillStyle = 'rgba(255,100,100,0.4)';
      ctx.beginPath();
      ctx.moveTo(screenX, this.y + 8);
      ctx.lineTo(screenX - 10, this.y + 12 + wingFlap);
      ctx.lineTo(screenX, this.y + 20);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(screenX + this.width, this.y + 8);
      ctx.lineTo(screenX + this.width + 10, this.y + 12 + wingFlap);
      ctx.lineTo(screenX + this.width, this.y + 20);
      ctx.closePath();
      ctx.fill();
    }

    // Тело: градиент (светлее к центру сверху, темнее внизу) + скруглённые углы
    const bodyGrad = ctx.createLinearGradient(screenX, this.y, screenX, this.y + this.height);
    bodyGrad.addColorStop(0, color + 'ff');
    bodyGrad.addColorStop(0.4, color + 'cc');
    bodyGrad.addColorStop(1, color + '55');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = color;
    ctx.shadowBlur = glowPulse;
    Enemy.roundRect(ctx, screenX, this.y, this.width, this.height, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Highlight (светлый верх)
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#fff';
    Enemy.roundRect(ctx, screenX + 2, this.y + 2, this.width - 4, 6, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // === Armored: металлический блеск ===
    if (this.type === 'armored') {
      const shineY = (frame * 2) % (this.height + 20) - 10;
      if (shineY >= 0 && shineY < this.height - 2) {
        ctx.save();
        Enemy.roundRect(ctx, screenX, this.y, this.width, this.height, 4);
        ctx.clip();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX, this.y + shineY, this.width, 3);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Глаза с бликами
    ctx.fillStyle = COLORS.enemyEye;
    const blink = Math.sin(frame * 0.1) > 0.85;
    ctx.fillRect(screenX + 6, this.y + 8, 6, blink ? 1 : 5);
    ctx.fillRect(screenX + 18, this.y + 8, 6, blink ? 1 : 5);
    // Блики
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    if (!blink) {
      ctx.fillRect(screenX + 6, this.y + 8, 2, 2);
      ctx.fillRect(screenX + 18, this.y + 8, 2, 2);
    }

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

  private drawChomper(ctx: CanvasRenderingContext2D, screenX: number, frame: number): void {
    const cx = screenX + this.width / 2;
    const cy = this.y + this.height / 2;
    const r = this.width / 2;

    // Анимация пасти: открывается/закрывается
    const mouthOpen = (Math.sin(frame * 0.18) + 1) / 2; // 0..1
    const mouthAngle = mouthOpen * 0.55; // до ~31°

    // Свечение
    const glow = 10 + Math.sin(frame * 0.1) * 5;
    ctx.shadowColor = '#aa44ff';
    ctx.shadowBlur = glow;

    // Тело: фиолетовый круг с градиентом
    const bodyGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    bodyGrad.addColorStop(0, '#cc66ff');
    bodyGrad.addColorStop(0.6, '#8822cc');
    bodyGrad.addColorStop(1, '#440088');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, mouthAngle, Math.PI * 2 - mouthAngle);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Зубы нижнего ряда (треугольники вдоль нижней дуги пасти)
    const toothCount = 4;
    const toothSize = 5;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < toothCount; i++) {
      const t = (i + 0.5) / toothCount;
      // угол вдоль нижней половины дуги
      const a = mouthAngle + t * (Math.PI * 2 - mouthAngle * 2);
      // верхний зуб (верхняя губа)
      const ax = cx + Math.cos(mouthAngle + t * (Math.PI - mouthAngle * 2)) * (r - 2);
      const ay = cy + Math.sin(mouthAngle + t * (Math.PI - mouthAngle * 2)) * (r - 2);
      // Простые треугольные зубы, направленные к центру
      const tx = cx + Math.cos(a) * r;
      const ty = cy + Math.sin(a) * r;
      const inX = cx + Math.cos(a) * (r - toothSize);
      const inY = cy + Math.sin(a) * (r - toothSize);
      const perpA = a + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(perpA) * 3, ty + Math.sin(perpA) * 3);
      ctx.lineTo(inX, inY);
      ctx.lineTo(tx - Math.cos(perpA) * 3, ty - Math.sin(perpA) * 3);
      ctx.closePath();
      ctx.fill();
      // Верхние зубы (зеркально)
      void ax; void ay; // неиспользуемые переменные
    }
    // Верхний ряд зубов
    for (let i = 0; i < toothCount; i++) {
      const t = (i + 0.5) / toothCount;
      const a = -mouthAngle - t * (Math.PI - mouthAngle * 2);
      const tx = cx + Math.cos(a) * r;
      const ty = cy + Math.sin(a) * r;
      const inX = cx + Math.cos(a) * (r - toothSize);
      const inY = cy + Math.sin(a) * (r - toothSize);
      const perpA = a + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(perpA) * 3, ty + Math.sin(perpA) * 3);
      ctx.lineTo(inX, inY);
      ctx.lineTo(tx - Math.cos(perpA) * 3, ty - Math.sin(perpA) * 3);
      ctx.closePath();
      ctx.fill();
    }

    // Жёлтые злые глаза
    const eyeOffsetX = r * 0.3;
    const eyeOffsetY = -r * 0.25;
    const eyeR = r * 0.22;
    ctx.shadowColor = '#ffee00';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffee00';
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX, cy + eyeOffsetY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Зрачки
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX + 1, cy + eyeOffsetY + 1, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeOffsetX + 1, cy + eyeOffsetY + 1, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Злые брови (диагональные линии)
    ctx.strokeStyle = '#ffee00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - eyeOffsetX - eyeR, cy + eyeOffsetY - eyeR - 1);
    ctx.lineTo(cx - eyeOffsetX + eyeR, cy + eyeOffsetY - eyeR + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + eyeOffsetX - eyeR, cy + eyeOffsetY - eyeR + 3);
    ctx.lineTo(cx + eyeOffsetX + eyeR, cy + eyeOffsetY - eyeR - 1);
    ctx.stroke();

    // HP-метка (если 2 жизни ещё есть — показываем точку)
    if (this.hp > 1) {
      ctx.fillStyle = '#cc66ff';
      ctx.shadowColor = '#aa44ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx, this.y - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
