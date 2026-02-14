import { SkinId, SKIN_COLORS } from '@utils/constants';

/**
 * Клетка со скином внутри.
 * Игрок прыгает на клетку сверху — клетка разрушается, скин освобождён.
 */
export class Cage {
  x: number;
  y: number;
  width = 40;
  height = 40;
  skinId: SkinId;
  collected = false;

  constructor(x: number, y: number, skinId: SkinId) {
    this.x = x;
    this.y = y;
    this.skinId = skinId;
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, frame: number): void {
    if (this.collected) return;

    const color = SKIN_COLORS[this.skinId];

    // Свечение клетки
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // Прутья клетки (серые линии)
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    // Внешний контур
    ctx.strokeRect(screenX, this.y, this.width, this.height);
    // Вертикальные прутья
    for (let i = 1; i < 4; i++) {
      const barX = screenX + (this.width / 4) * i;
      ctx.beginPath();
      ctx.moveTo(barX, this.y);
      ctx.lineTo(barX, this.y + this.height);
      ctx.stroke();
    }
    // Горизонтальные прутья
    for (let i = 1; i < 4; i++) {
      const barY = this.y + (this.height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(screenX, barY);
      ctx.lineTo(screenX + this.width, barY);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Кубик внутри (покачивается)
    const cubeSize = 18;
    const bobY = Math.sin(frame * 0.08) * 3;
    const cubeX = screenX + (this.width - cubeSize) / 2;
    const cubeY = this.y + (this.height - cubeSize) / 2 + bobY;

    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.fillRect(cubeX, cubeY, cubeSize, cubeSize);
    ctx.shadowBlur = 0;

    // Глаза на кубике
    ctx.fillStyle = '#000';
    ctx.fillRect(cubeX + 4, cubeY + 5, 3, 3);
    ctx.fillRect(cubeX + 11, cubeY + 5, 3, 3);
    ctx.fillRect(cubeX + 5, cubeY + 11, 8, 2);
  }
}
