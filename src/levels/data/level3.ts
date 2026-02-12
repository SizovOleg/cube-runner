import { LevelData } from '../types';
import { GROUND_Y, ENTITY_SIZE } from '@utils/constants';

/**
 * Уровень 3: Ледяная Цитадель — финальный уровень.
 * Максимальная сложность: все типы врагов, горизонтальные движущиеся платформы,
 * тройные шипы, armored враги, flying враги.
 * Босс: Frost King — ледяной король с 3 фазами.
 */
const level3: LevelData = {
  id: 3,
  name: 'Ледяная Цитадель',
  description: 'Финальное испытание в ледяной крепости',
  length: 18000,
  backgroundColor: '#0a0a1e',
  groundColor: '#1a1a3e',

  obstacles: [
    // === Секция 1 (0-2500): Врата цитадели ===
    { x: 500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 900, y: GROUND_Y - 80, width: 90, height: 15, type: 'platform' },
    { x: 1200, y: GROUND_Y - 60, width: 80, height: 15, type: 'moving_platform', moveRange: 100, moveSpeed: 1.5, moveAxis: 'x' },
    { x: 1600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1660, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1720, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2000, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.2, moveAxis: 'y' },
    { x: 2300, y: GROUND_Y - 70, width: 80, height: 15, type: 'platform' },

    // === Секция 2 (2500-5000): Ледяной мост ===
    { x: 2600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2660, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2900, y: GROUND_Y - 90, width: 80, height: 15, type: 'moving_platform', moveRange: 80, moveSpeed: 1.8, moveAxis: 'x' },
    { x: 3200, y: GROUND_Y - 60, width: 100, height: 15, type: 'platform' },
    { x: 3500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3800, y: GROUND_Y - 110, width: 70, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.3, moveAxis: 'y' },
    { x: 4100, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },
    { x: 4400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4700, y: GROUND_Y - 130, width: 80, height: 15, type: 'platform' },

    // === Секция 3 (5000-7500): Зал стражей ===
    { x: 5000, y: GROUND_Y - 50, width: 70, height: 15, type: 'moving_platform', moveRange: 90, moveSpeed: 2.0, moveAxis: 'x' },
    { x: 5300, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5360, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5420, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5600, y: GROUND_Y - 100, width: 80, height: 15, type: 'platform' },
    { x: 5900, y: GROUND_Y - 80, width: 70, height: 15, type: 'moving_platform', moveRange: 55, moveSpeed: 1.4, moveAxis: 'y' },
    { x: 6200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6260, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6500, y: GROUND_Y - 60, width: 80, height: 15, type: 'moving_platform', moveRange: 70, moveSpeed: 1.6, moveAxis: 'x' },
    { x: 6800, y: GROUND_Y - 110, width: 90, height: 15, type: 'platform' },
    { x: 7100, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7160, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7220, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7400, y: GROUND_Y - 70, width: 80, height: 15, type: 'platform' },

    // === Секция 4 (7500-10000): Ледяная пропасть ===
    { x: 7600, y: GROUND_Y - 90, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.7, moveAxis: 'y' },
    { x: 7900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7960, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8020, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8200, y: GROUND_Y - 50, width: 80, height: 15, type: 'moving_platform', moveRange: 100, moveSpeed: 2.0, moveAxis: 'x' },
    { x: 8500, y: GROUND_Y - 120, width: 80, height: 15, type: 'platform' },
    { x: 8800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8860, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9100, y: GROUND_Y - 80, width: 70, height: 15, type: 'moving_platform', moveRange: 45, moveSpeed: 1.5, moveAxis: 'y' },
    { x: 9400, y: GROUND_Y - 60, width: 90, height: 15, type: 'platform' },
    { x: 9700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9760, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9820, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 5 (10000-12500): Тронный коридор ===
    { x: 10000, y: GROUND_Y - 100, width: 80, height: 15, type: 'moving_platform', moveRange: 80, moveSpeed: 1.8, moveAxis: 'x' },
    { x: 10300, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },
    { x: 10500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10800, y: GROUND_Y - 130, width: 70, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.3, moveAxis: 'y' },
    { x: 11100, y: GROUND_Y - 60, width: 80, height: 15, type: 'platform' },
    { x: 11400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11700, y: GROUND_Y - 90, width: 70, height: 15, type: 'moving_platform', moveRange: 70, moveSpeed: 1.9, moveAxis: 'x' },
    { x: 12000, y: GROUND_Y - 110, width: 90, height: 15, type: 'platform' },
    { x: 12300, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 12360, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 12420, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 6 (12500-15000): Зал испытаний ===
    { x: 12600, y: GROUND_Y - 80, width: 80, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.6, moveAxis: 'y' },
    { x: 12900, y: GROUND_Y - 50, width: 70, height: 15, type: 'moving_platform', moveRange: 90, moveSpeed: 2.2, moveAxis: 'x' },
    { x: 13200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 13260, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 13320, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 13500, y: GROUND_Y - 110, width: 90, height: 15, type: 'platform' },
    { x: 13800, y: GROUND_Y - 70, width: 70, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.5, moveAxis: 'y' },
    { x: 14100, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 14160, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 14400, y: GROUND_Y - 90, width: 80, height: 15, type: 'platform' },
    { x: 14700, y: GROUND_Y - 60, width: 70, height: 15, type: 'moving_platform', moveRange: 80, moveSpeed: 2.0, moveAxis: 'x' },

    // === Секция 7 (15000-16500): Финальная полоса ===
    { x: 15000, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 15060, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 15120, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 15300, y: GROUND_Y - 100, width: 80, height: 15, type: 'moving_platform', moveRange: 55, moveSpeed: 1.7, moveAxis: 'y' },
    { x: 15600, y: GROUND_Y - 70, width: 100, height: 15, type: 'platform' },
    { x: 15900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 15960, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 16020, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 16200, y: GROUND_Y - 120, width: 80, height: 15, type: 'platform' },
    { x: 16500, y: GROUND_Y - 80, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.4, moveAxis: 'y' },
  ],

  enemies: [
    // Секция 1: basic + первый flying
    { x: 700, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 920, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'basic' },
    { x: 1500, y: GROUND_Y - 100, type: 'flying', patrolRange: 50 },
    { x: 2000, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 2320, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },

    // Секция 2: шутеры + armored
    { x: 2800, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 40 },
    { x: 3220, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'shooter' },
    { x: 3700, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 4120, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },
    { x: 4500, y: GROUND_Y - 80, type: 'flying', patrolRange: 60 },
    { x: 4720, y: GROUND_Y - 130 - ENTITY_SIZE, type: 'basic' },

    // Секция 3: плотная зона
    { x: 5200, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 50 },
    { x: 5620, y: GROUND_Y - 100 - ENTITY_SIZE, type: 'shooter' },
    { x: 5900, y: GROUND_Y - 60, type: 'flying', patrolRange: 70 },
    { x: 6400, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 6820, y: GROUND_Y - 110 - ENTITY_SIZE, type: 'shooter' },
    { x: 7100, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 40 },
    { x: 7420, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'basic' },

    // Секция 4: ледяная пропасть
    { x: 7800, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 8100, y: GROUND_Y - 80, type: 'flying', patrolRange: 50 },
    { x: 8520, y: GROUND_Y - 120 - ENTITY_SIZE, type: 'shooter' },
    { x: 8900, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 50 },
    { x: 9420, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'shooter' },
    { x: 9600, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },

    // Секция 5: тронный коридор
    { x: 10100, y: GROUND_Y - 90, type: 'flying', patrolRange: 60 },
    { x: 10320, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },
    { x: 10700, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 40 },
    { x: 11120, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'shooter' },
    { x: 11500, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 12020, y: GROUND_Y - 110 - ENTITY_SIZE, type: 'shooter' },

    // Секция 6: зал испытаний
    { x: 12500, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 50 },
    { x: 12800, y: GROUND_Y - 70, type: 'flying', patrolRange: 60 },
    { x: 13520, y: GROUND_Y - 110 - ENTITY_SIZE, type: 'shooter' },
    { x: 13900, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 14420, y: GROUND_Y - 90 - ENTITY_SIZE, type: 'shooter' },

    // Секция 7: финальная полоса
    { x: 15200, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 40 },
    { x: 15620, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },
    { x: 15800, y: GROUND_Y - 100, type: 'flying', patrolRange: 50 },
    { x: 16220, y: GROUND_Y - 120 - ENTITY_SIZE, type: 'shooter' },
    { x: 16400, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 50 },
  ],

  powerups: [
    { x: 1000, y: GROUND_Y - 60, type: 'shield' },
    { x: 2500, y: GROUND_Y - 80, type: 'bomb' },
    { x: 4200, y: GROUND_Y - 50, type: 'rocket' },
    { x: 6000, y: GROUND_Y - 70, type: 'shield' },
    { x: 8000, y: GROUND_Y - 60, type: 'bomb' },
    { x: 10500, y: GROUND_Y - 80, type: 'rocket' },
    { x: 13000, y: GROUND_Y - 50, type: 'shield' },
    { x: 15500, y: GROUND_Y - 70, type: 'bomb' },
  ],

  boss: {
    type: 'frost_king',
    name: 'FROST KING',
    hp: 40,
    phases: 3,
  },
};

export default level3;
