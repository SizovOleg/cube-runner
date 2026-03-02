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
 * Проверка приземления сверху (one-way platform) или снизу при антигравитации.
 */
export function landingCollision(
  a: GameObject & { vy: number; gravityDir?: number },
  b: GameObject
): boolean {
  const dir = a.gravityDir || 1;
  if (dir === 1) {
    return (
      a.vy >= 0 &&
      a.x + a.width > b.x &&
      a.x < b.x + b.width &&
      a.y + a.height >= b.y &&
      a.y + a.height <= b.y + b.height + 5
    );
  } else {
    // При антигравитации мы падаем ВВЕРХ (vy <= 0) на НИЖНЮЮ грань платформы
    return (
      a.vy <= 0 &&
      a.x + a.width > b.x &&
      a.x < b.x + b.width &&
      a.y <= b.y + b.height &&
      a.y >= b.y + b.height - 5
    );
  }
}

/**
 * Применить гравитацию к объекту.
 */
export function applyGravity(obj: { y: number; vy: number; gravityDir?: number }, gravity = GRAVITY): void {
  const dir = obj.gravityDir || 1;
  obj.vy += gravity * dir;
  obj.y += obj.vy;
}

/**
 * Ограничить объект линией земли (или потолком при антигравитации).
 */
export function clampToGround(obj: { y: number; vy: number; height: number; gravityDir?: number }): boolean {
  const dir = obj.gravityDir || 1;
  if (dir === 1) {
    if (obj.y + obj.height >= GROUND_Y) {
      obj.y = GROUND_Y - obj.height;
      obj.vy = 0;
      return true; // на земле
    }
  } else {
    // Потолок для уровня — например условный 50px от топа экрана
    if (obj.y <= 50) {
      obj.y = 50;
      obj.vy = 0;
      return true; // "на земле" (перевернут)
    }
  }
  return false;
}

/**
 * Проверка убийства врага прыжком сверху.
 * Игрок должен падать и быть выше центра врага.
 */
export function stompCheck(
  player: GameObject & { vy: number; gravityDir?: number },
  enemy: GameObject
): boolean {
  const dir = player.gravityDir || 1;
  if (dir === 1) {
    return (
      player.vy > 0 &&
      player.y + player.height > enemy.y &&
      player.y + player.height < enemy.y + enemy.height / 2 + 10
    );
  } else {
    // Стомп снизу врага
    return (
      player.vy < 0 &&
      player.y < enemy.y + enemy.height &&
      player.y > enemy.y + enemy.height / 2 - 10
    );
  }
}
