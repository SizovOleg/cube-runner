import { CANVAS_WIDTH } from '@utils/constants';
import { lerp } from '@utils/math';

/**
 * Камера с плавным следованием за игроком.
 * В режиме босс-арены камера фиксируется.
 */
export class Camera {
  x = 0;
  private targetX = 0;
  private locked = false;
  private lockX = 0;

  /**
   * Обновить позицию камеры.
   * @param playerX — мировая координата игрока
   */
  update(playerX: number): void {
    if (this.locked) {
      this.x = lerp(this.x, this.lockX, 0.05);
      return;
    }
    // Игрок всегда на 1/4 ширины экрана от левого края
    this.targetX = playerX - CANVAS_WIDTH * 0.25;
    this.x = lerp(this.x, this.targetX, 0.1);
    if (this.x < 0) this.x = 0;
  }

  /**
   * Зафиксировать камеру (для босс-арены).
   */
  lock(worldX: number): void {
    this.locked = true;
    this.lockX = worldX;
  }

  /**
   * Разблокировать камеру.
   */
  unlock(): void {
    this.locked = false;
  }

  /**
   * Перевести мировую координату в экранную.
   */
  worldToScreen(worldX: number): number {
    return worldX - this.x;
  }
}
