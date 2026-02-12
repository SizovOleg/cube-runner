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

    // Внешнее свечение
    ctx.globalAlpha = 0.15 + pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    // Основной круг
    ctx.globalAlpha = 0.8 + pulse;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Обводка
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Метка
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
