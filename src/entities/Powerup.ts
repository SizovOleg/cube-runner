import { PowerupType, POWERUP_LABELS, POWERUP_COLORS } from '@utils/constants';

/**
 * Powerup — светящийся круг, парящий над землёй с покачиванием.
 */
export class Powerup {
  x: number;
  y: number;
  baseY: number;
  width = 28;
  height = 28;
  type: PowerupType;
  collected = false;

  constructor(x: number, y: number, type: PowerupType) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.type = type;
  }

  update(frame: number): void {
    if (this.collected) return;
    // Покачивание вверх-вниз (синусоида)
    this.y = this.baseY + Math.sin(frame * 0.06) * 8;
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, frame: number): void {
    if (this.collected) return;

    const cx = screenX + this.width / 2;
    const cy = this.y + this.height / 2;
    const color = POWERUP_COLORS[this.type];
    const label = POWERUP_LABELS[this.type];
    const pulse = Math.sin(frame * 0.08) * 0.15;

    // Лучи света (6 линий, медленно вращаются)
    const rayAngle = frame * 0.015;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rayAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let ri = 0; ri < 6; ri++) {
      const angle = (ri / 6) * Math.PI * 2;
      ctx.globalAlpha = 0.18 + pulse * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
      ctx.lineTo(Math.cos(angle) * 26, Math.sin(angle) * 26);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Внешнее кольцо (кольцевой градиент)
    const ringGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 22);
    ringGrad.addColorStop(0, color + '55');
    ringGrad.addColorStop(1, color + '00');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    // Внешний контур-кольцо
    ctx.globalAlpha = 0.4 + pulse;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Внутренний яркий круг
    ctx.globalAlpha = 0.85 + pulse;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Метка
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
