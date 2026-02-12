import { GRAVITY, GROUND_Y } from '@utils/constants';
import { GameObject } from '@levels/types';

/**
 * AABB коллизия двух прямоугольников.
 */
export function aabbCollision(a: GameObject, b: GameObject): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Проверка приземления сверху (one-way platform collision).
 * Возвращает true если объект A приземляется на объект B сверху.
 */
export function landingCollision(
  a: GameObject & { vy: number },
  b: GameObject
): boolean {
  return (
    a.vy >= 0 &&
    a.x + a.width > b.x &&
    a.x < b.x + b.width &&
    a.y + a.height >= b.y &&
    a.y + a.height <= b.y + b.height + 5
  );
}

/**
 * Применить гравитацию к объекту.
 */
export function applyGravity(obj: { y: number; vy: number }, gravity = GRAVITY): void {
  obj.vy += gravity;
  obj.y += obj.vy;
}

/**
 * Ограничить объект линией земли.
 */
export function clampToGround(obj: { y: number; vy: number; height: number }): boolean {
  if (obj.y + obj.height >= GROUND_Y) {
    obj.y = GROUND_Y - obj.height;
    obj.vy = 0;
    return true; // на земле
  }
  return false;
}

/**
 * Проверка убийства врага прыжком сверху.
 * Игрок должен падать и быть выше центра врага.
 */
export function stompCheck(
  player: GameObject & { vy: number },
  enemy: GameObject
): boolean {
  return (
    player.vy > 0 &&
    player.y + player.height > enemy.y &&
    player.y + player.height < enemy.y + enemy.height / 2 + 10
  );
}
