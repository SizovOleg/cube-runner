import { LevelData } from '../types';
import { GROUND_Y, ENTITY_SIZE } from '@utils/constants';

/**
 * Уровень 2: Кибер-Канализация
 * Сложнее уровня 1: больше врагов, движущиеся платформы, шутеры, двойные/тройные шипы.
 * Босс: Crusher — огромный фиолетовый куб 80x80.
 */
const level2: LevelData = {
  id: 2,
  name: 'Кибер-Канализация',
  description: 'Тёмные тоннели под неоновым городом',
  length: 15000,
  backgroundColor: '#0a1a0e',
  groundColor: '#1a2e1a',

  obstacles: [
    // === Секция 1 (0-2000): Вход — двойные шипы, первая движущаяся платформа ===
    { x: 500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 750, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 900, y: GROUND_Y - 80, width: 80, height: 15, type: 'platform' },
    { x: 1050, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1260, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1500, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.2, moveAxis: 'y' },
    { x: 1800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1950, y: GROUND_Y - 60, width: 70, height: 15, type: 'platform' },

    // === Секция 2 (2000-4000): Каньон с шутерами ===
    { x: 2100, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },
    { x: 2400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2520, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2700, y: GROUND_Y - 110, width: 80, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.0, moveAxis: 'y' },
    { x: 2900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3000, y: GROUND_Y - 60, width: 100, height: 15, type: 'platform' },
    { x: 3300, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3360, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3450, y: GROUND_Y - 100, width: 70, height: 15, type: 'platform' },
    { x: 3600, y: GROUND_Y - 90, width: 70, height: 15, type: 'platform' },
    { x: 3800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3950, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 3 (4000-6500): Лабиринт платформ ===
    { x: 4100, y: GROUND_Y - 50, width: 80, height: 15, type: 'platform' },
    { x: 4300, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 40, moveSpeed: 1.5, moveAxis: 'y' },
    { x: 4500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4800, y: GROUND_Y - 130, width: 90, height: 15, type: 'platform' },
    { x: 4950, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5100, y: GROUND_Y - 70, width: 70, height: 15, type: 'moving_platform', moveRange: 70, moveSpeed: 0.8, moveAxis: 'y' },
    { x: 5250, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5700, y: GROUND_Y - 90, width: 80, height: 15, type: 'platform' },
    { x: 5700, y: GROUND_Y - 90 - 15 - 20, width: 20, height: 20, type: 'spike' },
    { x: 6000, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6200, y: GROUND_Y - 60, width: 80, height: 15, type: 'platform' },
    { x: 6400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 4 (6500-9000): Зона стрелков ===
    { x: 6600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6660, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6900, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 55, moveSpeed: 1.3, moveAxis: 'y' },
    { x: 7050, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7200, y: GROUND_Y - 60, width: 90, height: 15, type: 'platform' },
    { x: 7500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7750, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7900, y: GROUND_Y - 120, width: 80, height: 15, type: 'platform' },
    { x: 8050, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8200, y: GROUND_Y - 80, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.1, moveAxis: 'y' },
    { x: 8350, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8800, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },

    // === Секция 5 (9000-10500): Ракетный коридор — препятствия убраны ===
    { x: 10620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10800, y: GROUND_Y - 80, width: 70, height: 15, type: 'moving_platform', moveRange: 45, moveSpeed: 1.4, moveAxis: 'y' },
    { x: 10950, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 6 (11000-13500): Финальная полоса перед боссом ===
    { x: 11100, y: GROUND_Y - 60, width: 90, height: 15, type: 'platform' },
    { x: 11250, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11520, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11800, y: GROUND_Y - 100, width: 80, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.2, moveAxis: 'y' },
    { x: 11950, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 12100, y: GROUND_Y - 70, width: 80, height: 15, type: 'platform' },
    { x: 12250, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 12400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 12460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 12700, y: GROUND_Y - 120, width: 70, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.5, moveAxis: 'y' },
    { x: 12900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 13000, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 13060, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 13300, y: GROUND_Y - 80, width: 100, height: 15, type: 'platform' },
  ],

  enemies: [
    // Секция 1
    { x: 700, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 920, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'basic' },
    { x: 1700, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },

    // Секция 2: первые шутеры
    { x: 2120, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },
    { x: 2900, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 3020, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'shooter' },
    { x: 3620, y: GROUND_Y - 90 - ENTITY_SIZE, type: 'basic' },

    // Секция 3
    { x: 4120, y: GROUND_Y - 50 - ENTITY_SIZE, type: 'basic' },
    { x: 4820, y: GROUND_Y - 130 - ENTITY_SIZE, type: 'shooter' },
    { x: 5600, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 5720, y: GROUND_Y - 90 - ENTITY_SIZE, type: 'shooter' },
    { x: 6220, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'basic' },

    // Секция 4: плотная зона
    { x: 6800, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 7220, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'shooter' },
    { x: 7800, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 7920, y: GROUND_Y - 120 - ENTITY_SIZE, type: 'shooter' },
    { x: 8400, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 8820, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },

    // Секция 5: ракетный коридор — враги убраны

    // Секция 6: финал
    { x: 11120, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'shooter' },
    { x: 11900, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 12120, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },
    { x: 12600, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 13000, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 13320, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'shooter' },
  ],

  powerups: [
    { x: 1000, y: GROUND_Y - 60, type: 'shield' },
    { x: 2800, y: GROUND_Y - 80, type: 'bomb' },
    { x: 4700, y: GROUND_Y - 50, type: 'rocket' },
    { x: 6400, y: GROUND_Y - 70, type: 'shield' },
    { x: 8600, y: GROUND_Y - 60, type: 'bomb' },
    { x: 12300, y: GROUND_Y - 50, type: 'rocket' },
  ],

  cages: [
    { x: 3460, y: GROUND_Y - 140, skinId: 'pink' },
    { x: 7920, y: GROUND_Y - 150, skinId: 'white' },
  ],

  rocketCorridor: { startX: 9000, endX: 10500 },

  boss: {
    type: 'crusher',
    name: 'CRUSHER',
    hp: 30,
    phases: 2,
  },
};

export default level2;
