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
    // Секция 1: Простые шипы (обучение прыжку)
    { x: 600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 850, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1100, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1300, y: GROUND_Y - 60, width: 70, height: 15, type: 'platform' },
    { x: 1500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1750, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // Секция 2: Платформы + шипы
    { x: 2000, y: GROUND_Y - 70, width: 80, height: 15, type: 'platform' },
    { x: 2300, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2500, y: GROUND_Y - 90, width: 70, height: 15, type: 'platform' },
    { x: 2750, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2950, y: GROUND_Y - 60, width: 70, height: 15, type: 'platform' },

    // Секция 3: Двойные шипы
    { x: 3200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3260, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3700, y: GROUND_Y - 70, width: 80, height: 15, type: 'platform' },
    { x: 3900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // Секция 4: Платформенный лабиринт
    { x: 4000, y: GROUND_Y - 60, width: 100, height: 15, type: 'platform' },
    { x: 4200, y: GROUND_Y - 110, width: 80, height: 15, type: 'platform' },
    { x: 4500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4700, y: GROUND_Y - 70, width: 80, height: 15, type: 'platform' },
    { x: 4950, y: GROUND_Y - 90, width: 70, height: 15, type: 'platform' },
    { x: 5150, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // Секция 5: Финальная полоса перед боссом
    { x: 5500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5900, y: GROUND_Y - 80, width: 90, height: 15, type: 'platform' },
    { x: 6200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6450, y: GROUND_Y - 60, width: 80, height: 15, type: 'platform' },
    { x: 6700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6750, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    // (Ракетный коридор: 7000-9500 — препятствия убраны)
    { x: 9600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9950, y: GROUND_Y - 60, width: 70, height: 15, type: 'platform' },
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

  rocketCorridor: {
    startX: 7000,
    endX: 9500,
    gapSizeFunc: 'constant',
    movingSpikes: [
      { offsetX: 400,  amplitude: 55, phase: 0,    speed: 0.04 },
      { offsetX: 900,  amplitude: 40, phase: 1.5,  speed: 0.05 },
      { offsetX: 1400, amplitude: 65, phase: 0.8,  speed: 0.035 },
      { offsetX: 1900, amplitude: 50, phase: 2.1,  speed: 0.045 },
      { offsetX: 2300, amplitude: 45, phase: 0.3,  speed: 0.06 },
    ],
    coins: [
      { offsetX: 650,  gapOffset: 0 },
      { offsetX: 1150, gapOffset: -0.3 },
      { offsetX: 1650, gapOffset: 0.3 },
    ],
  },

  boss: {
    type: 'guardian',
    name: 'GUARDIAN',
    hp: 20,
    phases: 2,
  },
};

export default level1;
