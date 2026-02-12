import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, COLORS } from '@utils/constants';
import { Camera } from './Camera';

/**
 * Canvas-рендерер. Отрисовка слоями:
 * 1. Фон (звёзды, параллакс)
 * 2. Земля + сетка
 * 3. Объекты уровня (платформы, шипы)
 * 4. Враги
 * 5. Пули
 * 6. Игрок
 * 7. Частицы
 * 8. UI (HUD)
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.camera = camera;
  }

  clear(): void {
    this.ctx.fillStyle = COLORS.bg;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawGround(): void {
    this.ctx.fillStyle = COLORS.ground;
    this.ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    this.ctx.strokeStyle = COLORS.groundLine;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, GROUND_Y);
    this.ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    this.ctx.stroke();
  }

  drawStars(stars: Array<{ x: number; y: number; size: number; blink: number }>, frame: number): void {
    for (const s of stars) {
      const sx = ((s.x - this.camera.x * 0.3) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      this.ctx.globalAlpha = 0.3 + Math.sin(s.blink + frame * 0.02) * 0.3;
      this.ctx.fillStyle = COLORS.star;
      this.ctx.fillRect(sx, s.y, s.size, s.size);
    }
    this.ctx.globalAlpha = 1;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCamera(): Camera {
    return this.camera;
  }
}
