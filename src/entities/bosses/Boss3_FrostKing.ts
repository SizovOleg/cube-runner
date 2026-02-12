import { Boss, BossConfig } from '../Boss';
import { GROUND_Y, LEVEL_BOSS_ARENA_WIDTH } from '@utils/constants';

interface IceProjectile {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  damage: number;
}

interface IcePillar {
  x: number;
  y: number;
  width: number;
  height: number;
  targetHeight: number;
  damage: number;
  warningTimer: number; // >0 = предупреждение мерцанием, 0 = активен
  active: boolean;
  lifeTimer: number;
}

/**
 * Босс 3: Frost King
 * Ледяной голубой куб 70x70 с белым glow и ледяной короной.
 *
 * Фаза 1: Веер из 3 ледяных снарядов каждые 2 сек.
 * Фаза 2 (<66% HP): + ледяные столбы из земли (предупреждение мерцанием 1 сек).
 * Фаза 3 (<33% HP): Комбо — веер + столбы + телепортация.
 */
export class BossFrostKing extends Boss {
  private projectiles: IceProjectile[] = [];
  private pillars: IcePillar[] = [];
  private arenaLeft: number;
  private arenaRight: number;
  private shootTimer = 0;
  private pillarTimer = 0;
  private teleportTimer = 0;
  private teleportFlash = 0; // Визуальный эффект при телепортации
  private moveDir = 1;
  screenShake = 0; // Публичное — читается из App.tsx для тряски canvas

  constructor(arenaX: number) {
    const config: BossConfig = {
      name: 'FROST KING',
      maxHP: 40,
      phases: 3,
      x: arenaX + LEVEL_BOSS_ARENA_WIDTH * 0.6,
      y: GROUND_Y - 70,
      width: 70,
      height: 70,
    };
    super(config);
    this.arenaLeft = arenaX;
    this.arenaRight = arenaX + LEVEL_BOSS_ARENA_WIDTH;
  }

  updateBehavior(playerX: number, _playerY: number): void {
    // Тряска экрана уменьшается
    if (this.screenShake > 0) this.screenShake -= 0.5;

    // Телепортационная вспышка
    if (this.teleportFlash > 0) this.teleportFlash--;

    // === Гравитация (мягкая, для возврата после телепортации в воздух) ===
    if (this.y + this.height < GROUND_Y) {
      this.y += 1.5; // Плавное опускание
      if (this.y + this.height > GROUND_Y) {
        this.y = GROUND_Y - this.height;
      }
    }

    // === Движение: неторопливое покачивание ===
    const moveSpeed = this.phase >= 3 ? 1.5 : this.phase >= 2 ? 1.0 : 0.6;
    this.x += moveSpeed * this.moveDir;
    // Разворот у стен арены
    if (this.x < this.arenaLeft + 20) {
      this.x = this.arenaLeft + 20;
      this.moveDir = 1;
    }
    if (this.x + this.width > this.arenaRight - 20) {
      this.x = this.arenaRight - 20 - this.width;
      this.moveDir = -1;
    }

    // === Фаза 1+: Веер ледяных снарядов ===
    this.shootTimer++;
    const shootInterval = this.phase >= 3 ? 90 : this.phase >= 2 ? 110 : 120; // ~2 сек при 60fps
    if (this.shootTimer >= shootInterval) {
      this.shootTimer = 0;
      this.spawnIceFan(playerX);
    }

    // === Фаза 2+: Ледяные столбы ===
    if (this.phase >= 2) {
      this.pillarTimer++;
      const pillarInterval = this.phase >= 3 ? 100 : 150;
      if (this.pillarTimer >= pillarInterval) {
        this.pillarTimer = 0;
        this.spawnIcePillar(playerX);
      }
    }

    // === Фаза 3: Телепортация ===
    if (this.phase >= 3) {
      this.teleportTimer++;
      if (this.teleportTimer >= 180) { // каждые 3 сек
        this.teleportTimer = 0;
        this.teleport();
      }
    }

    // === Обновление снарядов ===
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;
      // Удалить за пределами арены
      if (
        proj.x < this.arenaLeft - 50 ||
        proj.x > this.arenaRight + 50 ||
        proj.y > GROUND_Y + 20 ||
        proj.y < -50
      ) {
        this.projectiles.splice(i, 1);
      }
    }

    // === Обновление ледяных столбов ===
    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const pillar = this.pillars[i];
      if (pillar.warningTimer > 0) {
        // Фаза предупреждения
        pillar.warningTimer--;
        if (pillar.warningTimer <= 0) {
          // Столб вырастает!
          pillar.active = true;
          this.screenShake = 4;
        }
      } else if (pillar.active) {
        // Рост столба
        if (pillar.height < pillar.targetHeight) {
          pillar.height += 8;
          pillar.y = GROUND_Y - pillar.height;
        }
        pillar.lifeTimer--;
        if (pillar.lifeTimer <= 0) {
          this.pillars.splice(i, 1);
        }
      }
    }
  }

  /**
   * Веер из 3 ледяных снарядов в направлении игрока.
   */
  private spawnIceFan(playerX: number): void {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const dx = playerX - centerX;
    const baseAngle = Math.atan2(0, dx); // Горизонтально к игроку
    const speed = 4.5;
    const spreadAngles = [-0.3, 0, 0.3]; // ~17 градусов разброс

    for (const offset of spreadAngles) {
      const angle = baseAngle + offset;
      this.projectiles.push({
        x: centerX - 6,
        y: centerY - 6,
        width: 12,
        height: 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: 1,
      });
    }
  }

  /**
   * Создаёт ледяной столб из земли под игроком.
   * Предупреждение мерцанием за ~1 сек (60 кадров).
   */
  private spawnIcePillar(playerX: number): void {
    // Столб появляется под позицией игрока
    const pillarWidth = 40;
    const pillarX = playerX - pillarWidth / 2;
    // Ограничить в арене
    const clampedX = Math.max(this.arenaLeft + 10, Math.min(pillarX, this.arenaRight - 10 - pillarWidth));

    this.pillars.push({
      x: clampedX,
      y: GROUND_Y,
      width: pillarWidth,
      height: 0,
      targetHeight: 80 + Math.random() * 30,
      damage: 1,
      warningTimer: 60, // 1 секунда предупреждения
      active: false,
      lifeTimer: 90, // Столб стоит ~1.5 сек после появления
    });
  }

  /**
   * Телепортация в случайное место арены (фаза 3).
   */
  private teleport(): void {
    this.teleportFlash = 15;
    this.screenShake = 3;
    // Случайная позиция в арене
    const margin = 50;
    const range = (this.arenaRight - margin) - (this.arenaLeft + margin) - this.width;
    this.x = this.arenaLeft + margin + Math.random() * range;
    // Иногда появляется в воздухе
    if (Math.random() < 0.3) {
      this.y = GROUND_Y - 70 - Math.random() * 80;
    } else {
      this.y = GROUND_Y - this.height;
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: number, cameraX = 0): void {
    if (!this.alive && this.defeated) return;

    const sx = this.x - cameraX;
    const sy = this.y;

    // Мерцание при неуязвимости
    if (this.invincible && frame % 4 < 2) return;

    // === Ледяные столбы (рисуются ДО босса) ===
    for (const pillar of this.pillars) {
      const px = pillar.x - cameraX;
      if (pillar.warningTimer > 0) {
        // Предупреждение: мерцающий контур
        if (frame % 6 < 3) {
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(px, GROUND_Y - 80, pillar.width, 80);
          ctx.setLineDash([]);
        }
        // Пульсирующая точка на земле
        const pulseSize = 3 + Math.sin(frame * 0.3) * 2;
        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(px + pillar.width / 2, GROUND_Y - 2, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (pillar.active && pillar.height > 0) {
        // Активный ледяной столб
        ctx.fillStyle = 'rgba(150, 220, 255, 0.8)';
        ctx.shadowColor = '#88ddff';
        ctx.shadowBlur = 12;
        ctx.fillRect(px, pillar.y, pillar.width, pillar.height);
        ctx.shadowBlur = 0;
        // Ледяной блеск
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(px + 5, pillar.y + 5, 6, pillar.height - 10);
        // Острый верх
        ctx.fillStyle = 'rgba(200, 240, 255, 0.9)';
        ctx.beginPath();
        ctx.moveTo(px, pillar.y);
        ctx.lineTo(px + pillar.width / 2, pillar.y - 12);
        ctx.lineTo(px + pillar.width, pillar.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // === Телепортационная вспышка ===
    if (this.teleportFlash > 0) {
      ctx.fillStyle = `rgba(100, 200, 255, ${this.teleportFlash / 15 * 0.5})`;
      ctx.beginPath();
      ctx.arc(sx + this.width / 2, sy + this.height / 2, 50 + (15 - this.teleportFlash) * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // === Тело — ледяной голубой куб 70x70 с белым glow ===
    ctx.fillStyle = '#00aaff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 25;
    ctx.fillRect(sx, sy, this.width, this.height);
    ctx.shadowBlur = 0;

    // Ледяная обводка
    ctx.strokeStyle = '#88eeff';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, this.width, this.height);

    // Ледяные «трещины» на теле
    ctx.strokeStyle = 'rgba(200, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 10, sy + 8);
    ctx.lineTo(sx + 25, sy + 30);
    ctx.lineTo(sx + 15, sy + 55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 50, sy + 5);
    ctx.lineTo(sx + 45, sy + 40);
    ctx.lineTo(sx + 60, sy + 65);
    ctx.stroke();

    // === Корона из ледяных кристаллов ===
    ctx.fillStyle = '#88eeff';
    ctx.shadowColor = '#aaeeff';
    ctx.shadowBlur = 8;
    // 5 кристаллов
    const crownBaseY = sy - 2;
    const crownPositions = [
      { cx: sx + 10, h: 14 },
      { cx: sx + 22, h: 20 },
      { cx: sx + 35, h: 24 }, // Центральный — самый высокий
      { cx: sx + 48, h: 20 },
      { cx: sx + 60, h: 14 },
    ];
    for (const cp of crownPositions) {
      ctx.beginPath();
      ctx.moveTo(cp.cx - 4, crownBaseY);
      ctx.lineTo(cp.cx, crownBaseY - cp.h);
      ctx.lineTo(cp.cx + 4, crownBaseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Блеск на центральном кристалле
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(sx + 35, crownBaseY - 18, 2, 0, Math.PI * 2);
    ctx.fill();

    // === Глаза — холодные, белые с голубым зрачком ===
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#aaddff';
    ctx.shadowBlur = 6;
    ctx.fillRect(sx + 14, sy + 22, 14, 12);
    ctx.fillRect(sx + 42, sy + 22, 14, 12);
    ctx.shadowBlur = 0;

    // Зрачки — ледяные голубые
    ctx.fillStyle = '#0066cc';
    ctx.fillRect(sx + 18, sy + 25, 7, 7);
    ctx.fillRect(sx + 46, sy + 25, 7, 7);

    // Блики в глазах
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx + 19, sy + 26, 2, 2);
    ctx.fillRect(sx + 47, sy + 26, 2, 2);

    // === Рот — холодная ухмылка ===
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 22, sy + 48);
    ctx.quadraticCurveTo(sx + 35, sy + 56, sx + 48, sy + 48);
    ctx.stroke();

    // Снаряды (ледяные кристаллы)
    for (const proj of this.projectiles) {
      const projX = proj.x - cameraX;
      ctx.fillStyle = '#88ddff';
      ctx.shadowColor = '#aaeeff';
      ctx.shadowBlur = 8;
      // Кристаллическая форма (ромб)
      ctx.save();
      ctx.translate(projX + proj.width / 2, proj.y + proj.height / 2);
      ctx.rotate(frame * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, -proj.height / 2 - 2);
      ctx.lineTo(proj.width / 2 + 2, 0);
      ctx.lineTo(0, proj.height / 2 + 2);
      ctx.lineTo(-proj.width / 2 - 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // Ледяная аура (пульсирующая)
    const auraAlpha = 0.08 + Math.sin(frame * 0.05) * 0.04;
    ctx.fillStyle = `rgba(100, 200, 255, ${auraAlpha})`;
    ctx.beginPath();
    ctx.arc(sx + this.width / 2, sy + this.height / 2, 55 + Math.sin(frame * 0.03) * 5, 0, Math.PI * 2);
    ctx.fill();

    // HP бар
    this.drawHealthBar(ctx);
  }

  onPhaseChange(newPhase: number): void {
    this.screenShake = 12;
    this.teleportFlash = 20;
    // Взрывная волна ледяных снарядов при смене фазы
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const numProjectiles = 8;
    for (let i = 0; i < numProjectiles; i++) {
      const angle = (Math.PI * 2 * i) / numProjectiles;
      this.projectiles.push({
        x: centerX - 6,
        y: centerY - 6,
        width: 12,
        height: 12,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        damage: 1,
      });
    }
    console.log(`Frost King enters phase ${newPhase}!`);
  }

  onDefeat(): void {
    this.screenShake = 20;
    console.log('Frost King defeated!');
  }

  getProjectiles(): Array<{ x: number; y: number; width: number; height: number; damage: number }> {
    return this.projectiles;
  }

  /**
   * Возвращает активные ледяные столбы как хитбоксы для коллизий.
   */
  getIcePillars(): IcePillar[] {
    return this.pillars.filter((p) => p.active && p.height > 10);
  }

  getShockwaves(): Array<{ x: number; radius: number; maxRadius: number }> {
    return [];
  }
}
