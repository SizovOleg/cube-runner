import { ENTITY_SIZE, COLORS } from '@utils/constants';
import { EnemyType } from '@levels/types';
import { roundRect } from '@utils/canvasUtils';

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

  draw(ctx: CanvasRenderingContext2D, screenX: number, frame: number): void {
    if (!this.alive) return;

    // === Chomper ===
    if (this.type === 'chomper') {
      this.drawChomper(ctx, screenX, frame);
      return;
    }

    const color = this.type === 'armored' ? '#cc3333' : COLORS.enemy;
    const darkColor = this.type === 'armored' ? '#661111' : '#661122';
    const glowPulse = 10 + Math.sin(frame * 0.08) * 8;
    const s = this.width;
    const x = screenX;
    const y = this.y;

    // === Flying: detailed gradient wings ===
    if (this.type === 'flying') {
      const wingFlap = Math.sin(frame * 0.15) * 6;
      const wingAlpha = 0.5 + Math.sin(frame * 0.15) * 0.15;
      ctx.globalAlpha = wingAlpha;
      // Left wing
      const wingGradL = ctx.createLinearGradient(x - 14, y + 10, x, y + 15);
      wingGradL.addColorStop(0, 'rgba(255,120,120,0.15)');
      wingGradL.addColorStop(0.5, 'rgba(255,80,80,0.5)');
      wingGradL.addColorStop(1, color);
      ctx.fillStyle = wingGradL;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 6);
      ctx.lineTo(x - 14, y + 10 + wingFlap);
      ctx.lineTo(x - 8, y + 18 + wingFlap * 0.5);
      ctx.lineTo(x + 2, y + 22);
      ctx.closePath();
      ctx.fill();
      // Right wing
      const wingGradR = ctx.createLinearGradient(x + s, y + 15, x + s + 14, y + 10);
      wingGradR.addColorStop(0, color);
      wingGradR.addColorStop(0.5, 'rgba(255,80,80,0.5)');
      wingGradR.addColorStop(1, 'rgba(255,120,120,0.15)');
      ctx.fillStyle = wingGradR;
      ctx.beginPath();
      ctx.moveTo(x + s - 2, y + 6);
      ctx.lineTo(x + s + 14, y + 10 + wingFlap);
      ctx.lineTo(x + s + 8, y + 18 + wingFlap * 0.5);
      ctx.lineTo(x + s - 2, y + 22);
      ctx.closePath();
      ctx.fill();
      // Wing bone lines
      ctx.strokeStyle = 'rgba(255,200,200,0.3)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 12);
      ctx.lineTo(x - 10, y + 12 + wingFlap * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s - 2, y + 12);
      ctx.lineTo(x + s + 10, y + 12 + wingFlap * 0.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Layer 1: Ground shadow ──
    if (this.type !== 'flying') {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(x + s / 2, y + s + 2, s / 2 - 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Layer 2: Outer glow ──
    ctx.shadowColor = color;
    ctx.shadowBlur = glowPulse;
    ctx.fillStyle = color + '22';
    roundRect(ctx, x - 3, y - 3, s + 6, s + 6, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── Layer 3: Dark border (depth) ──
    ctx.fillStyle = darkColor;
    roundRect(ctx, x - 1, y - 1, s + 2, s + 2, 5);
    ctx.fill();

    // ── Layer 4: Body with radial gradient ──
    const bodyGrad = ctx.createRadialGradient(x + s * 0.35, y + s * 0.3, 0, x + s / 2, y + s / 2, s * 0.8);
    bodyGrad.addColorStop(0, color);
    bodyGrad.addColorStop(0.5, color);
    bodyGrad.addColorStop(1, darkColor);
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, x, y, s, s, 4);
    ctx.fill();

    // ── Layer 5: Inner edge shadows (3D depth) ──
    ctx.save();
    roundRect(ctx, x, y, s, s, 4);
    ctx.clip();
    const innerV = ctx.createLinearGradient(x, y, x, y + s);
    innerV.addColorStop(0, 'rgba(255,180,180,0.15)');
    innerV.addColorStop(0.15, 'rgba(0,0,0,0)');
    innerV.addColorStop(0.85, 'rgba(0,0,0,0.1)');
    innerV.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = innerV;
    ctx.fillRect(x, y, s, s);

    // ── Layer 6: Diagonal stripe pattern (GD detail) ──
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 6) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + s, y + s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── Inner X mark (danger symbol) ──
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + s - 6, y + s - 6);
    ctx.moveTo(x + s - 6, y + 6);
    ctx.lineTo(x + 6, y + s - 6);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Layer 7: Top highlight ──
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x + 3, y + 2, s - 6, 5, 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Layer 8: Specular shine ──
    ctx.globalAlpha = 0.2;
    const spec = ctx.createRadialGradient(x + 7, y + 7, 0, x + 7, y + 7, s * 0.4);
    spec.addColorStop(0, '#ffffff');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(x, y, s * 0.5, s * 0.5);
    ctx.globalAlpha = 1;

    // ── Armored: double border + metallic sweep ──
    if (this.type === 'armored') {
      // Extra border ring
      ctx.strokeStyle = '#ffaa44';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      roundRect(ctx, x + 2, y + 2, s - 4, s - 4, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Metallic sweep
      const shineY = (frame * 2) % (s + 30) - 15;
      if (shineY >= -5 && shineY < s + 5) {
        ctx.save();
        roundRect(ctx, x, y, s, s, 4);
        ctx.clip();
        ctx.globalAlpha = 0.3;
        const sweepGrad = ctx.createLinearGradient(x, y + shineY - 4, x, y + shineY + 4);
        sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
        sweepGrad.addColorStop(0.5, '#ffffff');
        sweepGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sweepGrad;
        ctx.fillRect(x, y + shineY - 4, s, 8);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // ── Neon border ──
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    roundRect(ctx, x, y, s, s, 4);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ═══ FACE: round eyes with angry expression ═══
    const eyeY = y + 9;
    const eyeSize = 4;

    // Eye whites
    ctx.fillStyle = '#ffffff';
    const blink = Math.sin(frame * 0.1) > 0.88;
    if (!blink) {
      ctx.beginPath();
      ctx.arc(x + 10, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s - 10, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (red-tinted)
      ctx.fillStyle = '#330000';
      ctx.beginPath();
      ctx.arc(x + 10.5, eyeY + 0.5, eyeSize - 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s - 9.5, eyeY + 0.5, eyeSize - 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupil glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 9, eyeY - 1, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s - 11, eyeY - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Blink — thin lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 6, eyeY);
      ctx.lineTo(x + 14, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s - 14, eyeY);
      ctx.lineTo(x + s - 6, eyeY);
      ctx.stroke();
    }

    // Angry eyebrows (thicker)
    ctx.strokeStyle = COLORS.enemyEye;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 5, eyeY - 6);
    ctx.lineTo(x + 14, eyeY - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s - 5, eyeY - 6);
    ctx.lineTo(x + s - 14, eyeY - 3);
    ctx.stroke();

    // Mouth — angry grin
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + s - 9);
    ctx.quadraticCurveTo(x + s / 2, y + s - 5, x + s - 8, y + s - 9);
    ctx.stroke();

    // === Shooter: animated laser sight ===
    if (this.type === 'shooter' && this.shootCooldown > 0 && this.shootCooldown < 25) {
      const chargeProgress = 1 - this.shootCooldown / 25;
      const dotRadius = 2 + chargeProgress * 2;
      const laserAlpha = 0.3 + chargeProgress * 0.5;
      // Laser line
      ctx.globalAlpha = laserAlpha * 0.3;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, y + s / 2 + 2);
      ctx.lineTo(x - 80, y + s / 2 + 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // Charge dot
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 8 + chargeProgress * 8;
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2 + 2, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // HP indicator for armored
    if (this.type === 'armored' && this.hp > 1) {
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 4;
      for (let i = 0; i < this.hp; i++) {
        ctx.beginPath();
        ctx.arc(x + s / 2 - 4 + i * 8, y - 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
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
