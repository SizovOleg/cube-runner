import { Boss, BossConfig } from '../Boss';
import { GROUND_Y, LEVEL_BOSS_ARENA_WIDTH } from '@utils/constants';

interface ElectricBeam {
  x: number;        // мировая позиция X
  warningTimer: number; // 60 кадров предупреждения
  active: boolean;
  activeTimer: number;
  damage: number;
  width: number;
  height: number;
}

interface ElectricOrb {
  angle: number;   // текущий угол вокруг босса
  speed: number;   // рад/кадр
  radius: number;  // радиус орбиты
  x: number;       // мировые координаты
  y: number;
  size: number;
  damage: number;
}

/**
 * Босс 5: Core — Цифровой куб 90x90, электрический.
 *
 * Фаза 1: Телепортируется каждые 3 сек, стреляет электрическими лучами
 *         (вертикальные линии, предупреждение мерцанием 1 сек).
 * Фаза 2: Электрическое поле вокруг себя (круг урона R=100px, вкл/выкл каждые 2 сек).
 * Фаза 3: Всё вместе + 3 электрических шара по кругу вокруг босса.
 */
export class BossCore extends Boss {
  private teleportTimer = 0;
  private beamTimer = 0;
  private fieldTimer = 0;
  private fieldActive = false;
  private fieldRadius = 100;
  private arenaLeft: number;
  private arenaRight: number;
  private beams: ElectricBeam[] = [];
  private orbs: ElectricOrb[] = [];

  constructor(arenaX: number) {
    const config: BossConfig = {
      name: 'CORE',
      maxHP: 60,
      phases: 3,
      x: arenaX + LEVEL_BOSS_ARENA_WIDTH * 0.5,
      y: GROUND_Y - 90,
      width: 90,
      height: 90,
    };
    super(config);
    this.arenaLeft = arenaX;
    this.arenaRight = arenaX + LEVEL_BOSS_ARENA_WIDTH;
  }

  updateBehavior(playerX: number, _playerY: number): void {
    // === Фаза 1: телепортация (каждые 180 кадров = 3 сек) ===
    this.teleportTimer++;
    if (this.teleportTimer >= 180) {
      this.teleportTimer = 0;
      this.teleport();
    }

    // === Фаза 1: электрические лучи ===
    this.beamTimer++;
    const beamInterval = this.phase >= 3 ? 90 : 120;
    if (this.beamTimer >= beamInterval) {
      this.beamTimer = 0;
      this.spawnBeam(playerX);
    }

    // Обновление лучей
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const beam = this.beams[i];
      if (!beam.active) {
        beam.warningTimer--;
        if (beam.warningTimer <= 0) beam.active = true;
      } else {
        beam.activeTimer--;
        if (beam.activeTimer <= 0) this.beams.splice(i, 1);
      }
    }

    // === Фаза 2: электрическое поле (вкл/выкл каждые 120 кадров = 2 сек) ===
    if (this.phase >= 2) {
      this.fieldTimer++;
      if (this.fieldTimer >= 120) {
        this.fieldTimer = 0;
        this.fieldActive = !this.fieldActive;
      }
    } else {
      this.fieldActive = false;
    }

    // === Фаза 3: орбитальные шары ===
    if (this.phase >= 3 && this.orbs.length === 0) {
      this.spawnOrbs();
    }
    for (const orb of this.orbs) {
      orb.angle += orb.speed;
      orb.x = this.x + this.width / 2 + Math.cos(orb.angle) * orb.radius;
      orb.y = this.y + this.height / 2 + Math.sin(orb.angle) * orb.radius;
    }
  }

  private teleport(): void {
    // Телепортируется в случайную точку арены
    const margin = 60;
    this.x = this.arenaLeft + margin + Math.random() * (this.arenaRight - this.arenaLeft - this.width - margin * 2);
    this.y = GROUND_Y - this.height;
  }

  private spawnBeam(playerX: number): void {
    // Луч на позиции игрока или случайно
    const beamX = playerX + (Math.random() - 0.5) * 60;
    this.beams.push({
      x: beamX,
      warningTimer: 60, // 1 сек предупреждение
      active: false,
      activeTimer: 40,  // 0.67 сек активен
      damage: 1,
      width: 20,
      height: GROUND_Y,
    });
  }

  private spawnOrbs(): void {
    for (let i = 0; i < 3; i++) {
      this.orbs.push({
        angle: (i / 3) * Math.PI * 2,
        speed: 0.04,
        radius: 80,
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
        size: 12,
        damage: 1,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: number, cameraX = 0): void {
    if (!this.alive && this.defeated) return;
    if (this.invincible && frame % 4 < 2) return;

    const sx = this.x - cameraX;
    const sy = this.y;

    // === Электрические лучи ===
    for (const beam of this.beams) {
      const bx = beam.x - cameraX;
      if (!beam.active) {
        // Предупреждение: мерцающая линия
        const warnAlpha = 0.3 + Math.sin(frame * 0.5) * 0.3;
        ctx.globalAlpha = warnAlpha;
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(bx + beam.width / 2, 0);
        ctx.lineTo(bx + beam.width / 2, GROUND_Y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else {
        // Активный луч
        const activeAlpha = 0.7 + Math.sin(frame * 1.5) * 0.3;
        ctx.globalAlpha = activeAlpha;
        ctx.fillStyle = '#00eeff';
        ctx.shadowColor = '#0066ff';
        ctx.shadowBlur = 20;
        ctx.fillRect(bx - beam.width / 2, 0, beam.width, GROUND_Y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    // === Электрическое поле (фаза 2) ===
    if (this.fieldActive) {
      const fieldAlpha = 0.3 + Math.sin(frame * 0.15) * 0.2;
      ctx.globalAlpha = fieldAlpha;
      ctx.fillStyle = '#0044ff';
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(sx + this.width / 2, sy + this.height / 2, this.fieldRadius, 0, Math.PI * 2);
      ctx.fill();
      // Кольцо
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // === Орбитальные шары (фаза 3) ===
    for (const orb of this.orbs) {
      const ox = orb.x - cameraX;
      const oy = orb.y;
      const orbGlow = 8 + Math.sin(frame * 0.2) * 4;
      ctx.shadowColor = '#00eeff';
      ctx.shadowBlur = orbGlow;
      const orbGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.size);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.4, '#00ccff');
      orbGrad.addColorStop(1, '#0022ff');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(ox, oy, orb.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // === Тело: цифровой куб с молниями по граням ===
    const glowPulse = 18 + Math.sin(frame * 0.06) * 10;
    ctx.shadowColor = '#0066ff';
    ctx.shadowBlur = glowPulse;

    const bodyGrad = ctx.createLinearGradient(sx, sy, sx + this.width, sy + this.height);
    bodyGrad.addColorStop(0, '#0044cc');
    bodyGrad.addColorStop(0.4, '#0066ff');
    bodyGrad.addColorStop(1, '#0022aa');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(sx, sy, this.width, this.height);
    ctx.shadowBlur = 0;

    // Обводка
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, this.width, this.height);

    // Молнии по граням (анимированные зигзаги)
    ctx.strokeStyle = '#00eeff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 6;
    const lightning = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const mid = (x1 + x2) / 2;
      const offset = Math.sin(frame * 0.2) * 8;
      ctx.lineTo(mid + offset, (y1 + y2) / 2);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    // Верхняя грань
    lightning(sx + 5, sy + 2, sx + this.width - 5, sy + 2);
    // Нижняя грань
    lightning(sx + 5, sy + this.height - 2, sx + this.width - 5, sy + this.height - 2);
    // Левая грань
    lightning(sx + 2, sy + 5, sx + 2, sy + this.height - 5);
    // Правая грань
    lightning(sx + this.width - 2, sy + 5, sx + this.width - 2, sy + this.height - 5);
    ctx.shadowBlur = 0;

    // === Лицо ===
    // Глаза — электрические (синие квадраты с glow)
    ctx.fillStyle = '#00eeff';
    ctx.shadowColor = '#0088ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(sx + 16, sy + 22, 18, 14);
    ctx.fillRect(sx + 55, sy + 22, 18, 14);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000011';
    ctx.fillRect(sx + 20, sy + 25, 10, 8);
    ctx.fillRect(sx + 59, sy + 25, 10, 8);
    // Блики
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + 20, sy + 25, 3, 3);
    ctx.fillRect(sx + 59, sy + 25, 3, 3);

    // Злые брови (диагональные линии)
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx + 12, sy + 17);
    ctx.lineTo(sx + 36, sy + 21);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 78, sy + 17);
    ctx.lineTo(sx + 53, sy + 21);
    ctx.stroke();

    // Рот (зигзаг — электрическая улыбка)
    ctx.strokeStyle = '#00ddff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#0066ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(sx + 18, sy + 55);
    for (let zi = 0; zi < 7; zi++) {
      ctx.lineTo(sx + 18 + zi * 8, sy + 55 + (zi % 2 === 0 ? 8 : 0));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Индикатор поля (мигающий значок при фазе 2)
    if (this.phase >= 2 && !this.fieldActive && this.fieldTimer > 100) {
      const warnA = (this.fieldTimer - 100) / 20;
      ctx.globalAlpha = warnA * (0.5 + Math.sin(frame * 0.5) * 0.5);
      ctx.fillStyle = '#00aaff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', sx + this.width / 2, sy - 10);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // HP бар
    this.drawHealthBar(ctx);
  }

  onPhaseChange(newPhase: number): void {
    if (newPhase === 3) this.spawnOrbs();
    console.log(`Core enters phase ${newPhase}!`);
  }

  onDefeat(): void {
    console.log('Core defeated!');
  }

  getProjectiles(): Array<{ x: number; y: number; width: number; height: number; damage: number }> {
    const all: Array<{ x: number; y: number; width: number; height: number; damage: number }> = [];

    // Активные лучи (hitbox центрирован вокруг beam.x)
    for (const beam of this.beams) {
      if (beam.active) {
        all.push({ x: beam.x - beam.width / 2, y: 0, width: beam.width, height: GROUND_Y, damage: beam.damage });
      }
    }

    // Электрическое поле (вписанный квадрат в круг: r * √2/2 ≈ 0.707)
    if (this.fieldActive) {
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2;
      const hr = this.fieldRadius * 0.707; // половина стороны вписанного квадрата
      all.push({ x: cx - hr, y: cy - hr, width: hr * 2, height: hr * 2, damage: 1 });
    }

    // Орбитальные шары
    for (const orb of this.orbs) {
      all.push({ x: orb.x - orb.size, y: orb.y - orb.size, width: orb.size * 2, height: orb.size * 2, damage: orb.damage });
    }

    return all;
  }

  getShockwaves(): Array<{ x: number; radius: number; maxRadius: number }> {
    return [];
  }

  getFieldActive(): boolean {
    return this.fieldActive;
  }

  getFieldRadius(): number {
    return this.fieldRadius;
  }

  getBeams(): ElectricBeam[] {
    return this.beams;
  }
}

