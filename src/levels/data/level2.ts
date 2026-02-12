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
    { x: 900, y: GROUND_Y - 80, width: 80, height: 15, type: 'platform' },
    { x: 1200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1260, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1500, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.2, moveAxis: 'y' },
    { x: 1800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 2 (2000-4000): Каньон с шутерами ===
    { x: 2100, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },
    { x: 2400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2520, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2700, y: GROUND_Y - 110, width: 80, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.0, moveAxis: 'y' },
    { x: 3000, y: GROUND_Y - 60, width: 100, height: 15, type: 'platform' },
    { x: 3300, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3360, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3600, y: GROUND_Y - 90, width: 70, height: 15, type: 'platform' },
    { x: 3800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 3 (4000-6500): Лабиринт платформ ===
    { x: 4100, y: GROUND_Y - 50, width: 80, height: 15, type: 'platform' },
    { x: 4300, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 40, moveSpeed: 1.5, moveAxis: 'y' },
    { x: 4500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4800, y: GROUND_Y - 130, width: 90, height: 15, type: 'platform' },
    { x: 5100, y: GROUND_Y - 70, width: 70, height: 15, type: 'moving_platform', moveRange: 70, moveSpeed: 0.8, moveAxis: 'y' },
    { x: 5400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5700, y: GROUND_Y - 90, width: 80, height: 15, type: 'platform' },
    { x: 6000, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6200, y: GROUND_Y - 60, width: 80, height: 15, type: 'platform' },

    // === Секция 4 (6500-9000): Зона стрелков ===
    { x: 6600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6660, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6900, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 55, moveSpeed: 1.3, moveAxis: 'y' },
    { x: 7200, y: GROUND_Y - 60, width: 90, height: 15, type: 'platform' },
    { x: 7500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7900, y: GROUND_Y - 120, width: 80, height: 15, type: 'platform' },
    { x: 8200, y: GROUND_Y - 80, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.1, moveAxis: 'y' },
    { x: 8500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8800, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },

    // === Секция 5 (9000-11000): Смертельный коридор ===
    { x: 9100, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9160, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9220, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9400, y: GROUND_Y - 90, width: 70, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.6, moveAxis: 'y' },
    { x: 9700, y: GROUND_Y - 50, width: 80, height: 15, type: 'platform' },
    { x: 9900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9960, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10200, y: GROUND_Y - 110, width: 80, height: 15, type: 'platform' },
    { x: 10500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10800, y: GROUND_Y - 80, width: 70, height: 15, type: 'moving_platform', moveRange: 45, moveSpeed: 1.4, moveAxis: 'y' },

    // === Секция 6 (11000-13500): Финальная полоса перед боссом ===
    { x: 11100, y: GROUND_Y - 60, width: 90, height: 15, type: 'platform' },
    { x: 11400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11520, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11580, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11800, y: GROUND_Y - 100, width: 80, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.2, moveAxis: 'y' },
    { x: 12100, y: GROUND_Y - 70, width: 80, height: 15, type: 'platform' },
    { x: 12400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 12460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 12700, y: GROUND_Y - 120, width: 70, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.5, moveAxis: 'y' },
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

    // Секция 5
    { x: 9300, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 9720, y: GROUND_Y - 50 - ENTITY_SIZE, type: 'shooter' },
    { x: 10000, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 10220, y: GROUND_Y - 110 - ENTITY_SIZE, type: 'shooter' },

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
    { x: 10400, y: GROUND_Y - 80, type: 'shield' },
    { x: 12300, y: GROUND_Y - 50, type: 'rocket' },
  ],

  boss: {
    type: 'crusher',
    name: 'CRUSHER',
    hp: 30,
    phases: 2,
  },
};

export default level2;
