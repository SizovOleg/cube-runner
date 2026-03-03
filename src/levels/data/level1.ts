import { LevelData } from '../types';
import { GROUND_Y, ENTITY_SIZE } from '@utils/constants';

/**
 * Уровень 1: Неоновые Пустоши
 * Вводный уровень — знакомство с механиками.
 * Босс: Guardian — большой красный куб с щитом.
 */
const level1: LevelData = {
  id: 1,
  name: 'Неоновые Пустоши',
  description: 'Первые шаги в цифровом мире',
  length: 12000,
  obstacles: [
    // === Секция 1: Знакомство (Обычные прыжки и блоки) ===
    { x: 600, y: GROUND_Y - 30, width: 30, height: 30, type: 'breakable_block' },
    { x: 900, y: GROUND_Y - 30, width: 30, height: 30, type: 'breakable_block' },
    { x: 1200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1260, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 2: Желтые батуты (Jump Pads) ===
    // Первый батут (откидывает высоко)
    { x: 1600, y: GROUND_Y - 10, width: 40, height: 10, type: 'jump_pad_yellow' },
    { x: 1650, y: GROUND_Y - 120, width: 100, height: 20, type: 'platform' }, // Платформа куда закидывает
    { x: 1800, y: GROUND_Y - 80, width: 80, height: 20, type: 'platform' },

    // === Секция 3: Розовые батуты (Слабый прыжок) ===
    // Короткий батут для перескока через яму с шипами
    { x: 2100, y: GROUND_Y - 10, width: 40, height: 10, type: 'jump_pad_pink' },
    { x: 2150, y: GROUND_Y - 20, width: 100, height: 20, type: 'spike' },

    // Ступеньки из блоков
    { x: 2400, y: GROUND_Y - 30, width: 30, height: 30, type: 'breakable_block' },
    { x: 2430, y: GROUND_Y - 60, width: 30, height: 30, type: 'breakable_block' },
    { x: 2460, y: GROUND_Y - 90, width: 30, height: 30, type: 'breakable_block' },
    // Красный батут на вершине лесенки (супер-прыжок!)
    { x: 2490, y: GROUND_Y - 90 - 10, width: 40, height: 10, type: 'jump_pad_red' },

    // === Секция 4: Сферы в воздухе (Jump Rings) ===
    { x: 3000, y: GROUND_Y - 30, width: 30, height: 30, type: 'breakable_block' },
    { x: 3200, y: GROUND_Y - 100, width: 30, height: 30, type: 'jump_ring_yellow' }, // Сфера между пропастью
    { x: 3400, y: GROUND_Y - 30, width: 30, height: 30, type: 'breakable_block' },
    { x: 3600, y: GROUND_Y - 150, width: 30, height: 30, type: 'jump_ring_pink' }, // Розовая сфера повыше
    { x: 3800, y: GROUND_Y - 60, width: 80, height: 20, type: 'platform' },

    // === Секция 5: Портал Скорости ===
    { x: 4200, y: GROUND_Y - 80, width: 40, height: 80, type: 'speed_portal_fast' }, // Ускоряемся!
    { x: 4500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5200, y: GROUND_Y - 80, width: 40, height: 80, type: 'speed_portal_normal' }, // Возврат к норме

    // === Секция 6: Комбо ===
    { x: 5500, y: GROUND_Y - 10, width: 40, height: 10, type: 'jump_pad_yellow' },
    { x: 5650, y: GROUND_Y - 150, width: 30, height: 30, type: 'jump_ring_yellow' },
    { x: 5850, y: GROUND_Y - 150, width: 30, height: 30, type: 'jump_ring_pink' },
    { x: 6100, y: GROUND_Y - 60, width: 100, height: 20, type: 'platform' },
    { x: 6300, y: GROUND_Y - 10, width: 40, height: 10, type: 'jump_pad_red' },

    // (Ракетный коридор: 7000-9500)

    // === Секция 7: Лазеры и финальный забег ===
    { x: 9600, y: GROUND_Y - 150, width: 20, height: 150, type: 'laser' },
    { x: 9800, y: GROUND_Y - 150, width: 20, height: 150, type: 'laser' },
    { x: 10000, y: GROUND_Y - 10, width: 40, height: 10, type: 'jump_pad_yellow' },
    { x: 10200, y: GROUND_Y - 10, width: 40, height: 10, type: 'jump_pad_yellow' },
  ],

  enemies: [
    // Первый враг — после обучающих шипов
    { x: 1800, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },

    // На платформе
    { x: 2020, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'basic' },

    // Группа
    { x: 3500, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 3700, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },

    // Платформенные враги
    { x: 4030, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'basic' },
    { x: 4220, y: GROUND_Y - 110 - ENTITY_SIZE, type: 'basic' },

    // Перед боссом
    { x: 5400, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 5920, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'basic' },

    // Chomper-ы (агрессивные, бросаются на игрока)
    { x: 2700, y: GROUND_Y - ENTITY_SIZE, type: 'chomper' },
    { x: 4150, y: GROUND_Y - ENTITY_SIZE, type: 'chomper' },
    { x: 6300, y: GROUND_Y - ENTITY_SIZE, type: 'chomper' },
  ],

  powerups: [
    { x: 1400, y: GROUND_Y - 60, type: 'shield' },
    { x: 3000, y: GROUND_Y - 80, type: 'bomb' },
    { x: 4600, y: GROUND_Y - 50, type: 'rocket' },
    { x: 5800, y: GROUND_Y - 60, type: 'shield' },
  ],

  cages: [
    { x: 2510, y: GROUND_Y - 130, skinId: 'gold' },
    { x: 4960, y: GROUND_Y - 130, skinId: 'blue' },
  ],

  coins: [
    // Группа 1: обучающая (в линию над землёй)
    { x: 400, y: GROUND_Y - 50 },
    { x: 460, y: GROUND_Y - 50 },
    { x: 520, y: GROUND_Y - 50 },
    // Группа 2: дуга через платформу
    { x: 1300, y: GROUND_Y - 90 },
    { x: 1360, y: GROUND_Y - 110 },
    { x: 1420, y: GROUND_Y - 90 },
    // Группа 3: над шипами (нужен прыжок)
    { x: 2200, y: GROUND_Y - 80 },
    { x: 2260, y: GROUND_Y - 100 },
    { x: 2320, y: GROUND_Y - 80 },
    // Группа 4: на платформе
    { x: 3150, y: GROUND_Y - 100 },
    { x: 3210, y: GROUND_Y - 100 },
    { x: 3270, y: GROUND_Y - 100 },
    // Группа 5: в воздухе (прыжок)
    { x: 4700, y: GROUND_Y - 120 },
    { x: 4760, y: GROUND_Y - 140 },
    { x: 4820, y: GROUND_Y - 120 },
    // Группа 6: перед коридором
    { x: 6600, y: GROUND_Y - 60 },
    { x: 6660, y: GROUND_Y - 60 },
    { x: 6720, y: GROUND_Y - 60 },
    // Группа 7: после коридора
    { x: 9750, y: GROUND_Y - 60 },
    { x: 9810, y: GROUND_Y - 60 },
  ],

  rocketCorridor: {
    startX: 6000,
    endX: 9500,
    gapSizeFunc: 'constant',
    movingSpikes: [
      { offsetX: 400, amplitude: 55, phase: 0, speed: 0.04 },
      { offsetX: 900, amplitude: 40, phase: 1.5, speed: 0.05 },
      { offsetX: 1400, amplitude: 65, phase: 0.8, speed: 0.035 },
      { offsetX: 2000, amplitude: 50, phase: 2.1, speed: 0.045 },
      { offsetX: 2600, amplitude: 45, phase: 0.3, speed: 0.06 },
      { offsetX: 3100, amplitude: 50, phase: 1.0, speed: 0.05 },
    ],
    coins: [
      { offsetX: 650, gapOffset: 0 },
      { offsetX: 1200, gapOffset: -0.3 },
      { offsetX: 1800, gapOffset: 0.3 },
      { offsetX: 2400, gapOffset: 0 },
      { offsetX: 3000, gapOffset: -0.2 },
    ],
  },

  // Уровень 1: 3 chomper, 2 падающих блока, 0 маятников
  fallingBlocks: [
    // Над секцией 3 (двойные шипы)
    { x: 3100, y: GROUND_Y - 120, width: 60, height: 16 },
    // Перед боссом
    { x: 5800, y: GROUND_Y - 140, width: 70, height: 16 },
  ],

  boss: {
    type: 'guardian',
    name: 'GUARDIAN',
    hp: 20,
    phases: 2,
  },
};

export default level1;
