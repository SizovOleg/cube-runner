import { LevelData } from '../types';
import { GROUND_Y, ENTITY_SIZE } from '@utils/constants';

/**
 * Уровень 4: Вулканическая Кузня
 * Огненная тема. Движущиеся платформы над лавой, падающие блоки, маятники.
 * Босс: Inferno — огненный монстр 75x75.
 */
const level4: LevelData = {
  id: 4,
  name: 'Volcanic Forge',
  description: 'Раскалённые глубины вулкана',
  length: 20000,
  backgroundColor: '#1a0a00',
  groundColor: '#2e1a0a',

  obstacles: [
    // === Секция 1 (0-2500): Лавовый вход ===
    { x: 400,  y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 460,  y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 700,  y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 900,  y: GROUND_Y - 80, width: 80, height: 15, type: 'platform' },
    { x: 1100, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1160, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1400, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.3, moveAxis: 'y' },
    { x: 1700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1760, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1820, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2000, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },
    { x: 2200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2350, y: GROUND_Y - 110, width: 70, height: 15, type: 'moving_platform', moveRange: 50, moveSpeed: 1.5, moveAxis: 'y' },

    // === Секция 2 (2500-5000): Огненные горы ===
    { x: 2600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2660, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2720, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 2900, y: GROUND_Y - 90, width: 80, height: 15, type: 'platform' },
    { x: 3100, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3300, y: GROUND_Y - 120, width: 70, height: 15, type: 'moving_platform', moveRange: 70, moveSpeed: 1.2, moveAxis: 'y' },
    { x: 3500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 3750, y: GROUND_Y - 80, width: 80, height: 15, type: 'platform' },
    { x: 4000, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4060, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4120, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4300, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 55, moveSpeed: 1.4, moveAxis: 'x' },
    { x: 4600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 4800, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },

    // === Секция 3 (5000-7500): Кузница ===
    { x: 5000, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5200, y: GROUND_Y - 120, width: 80, height: 15, type: 'moving_platform', moveRange: 80, moveSpeed: 1.6, moveAxis: 'y' },
    { x: 5400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5600, y: GROUND_Y - 90, width: 80, height: 15, type: 'platform' },
    { x: 5800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5860, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 5920, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6100, y: GROUND_Y - 110, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.3, moveAxis: 'y' },
    { x: 6350, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6500, y: GROUND_Y - 80, width: 90, height: 15, type: 'platform' },
    { x: 6700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 6760, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7000, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 65, moveSpeed: 1.5, moveAxis: 'x' },
    { x: 7200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7350, y: GROUND_Y - 60, width: 80, height: 15, type: 'platform' },

    // === Секция 4 (7500-9500): Поле огня ===
    { x: 7500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7560, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7620, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 7700, y: GROUND_Y - 130, width: 80, height: 15, type: 'moving_platform', moveRange: 70, moveSpeed: 1.7, moveAxis: 'y' },
    { x: 7900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8100, y: GROUND_Y - 90, width: 80, height: 15, type: 'platform' },
    { x: 8300, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8360, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8420, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 8600, y: GROUND_Y - 110, width: 70, height: 15, type: 'moving_platform', moveRange: 55, moveSpeed: 1.4, moveAxis: 'y' },
    { x: 8800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9000, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },
    { x: 9200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9260, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 5 (9500-12000): Ракетный коридор убран ===
    { x: 9600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 9800, y: GROUND_Y - 80, width: 80, height: 15, type: 'platform' },
    { x: 10000, y: GROUND_Y - 120, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.3, moveAxis: 'y' },
    { x: 10200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10260, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10500, y: GROUND_Y - 90, width: 80, height: 15, type: 'platform' },
    { x: 10700, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10760, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 10820, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11000, y: GROUND_Y - 100, width: 70, height: 15, type: 'moving_platform', moveRange: 70, moveSpeed: 1.6, moveAxis: 'y' },
    { x: 11200, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11400, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },
    { x: 11600, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 11660, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 6: после ракетного коридора (14000-16000) ===
    { x: 14100, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 14200, y: GROUND_Y - 80, width: 80, height: 15, type: 'platform' },
    { x: 14400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 14460, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 14700, y: GROUND_Y - 110, width: 70, height: 15, type: 'moving_platform', moveRange: 55, moveSpeed: 1.4, moveAxis: 'y' },
    { x: 14900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 15100, y: GROUND_Y - 90, width: 80, height: 15, type: 'platform' },
    { x: 15300, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 15360, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 15360, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },

    // === Секция 7: финальная полоса (16000-18000) ===
    { x: 16000, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 16060, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 16300, y: GROUND_Y - 100, width: 80, height: 15, type: 'moving_platform', moveRange: 65, moveSpeed: 1.5, moveAxis: 'y' },
    { x: 16500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 16700, y: GROUND_Y - 80, width: 90, height: 15, type: 'platform' },
    { x: 16900, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 16960, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 17000, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 17200, y: GROUND_Y - 110, width: 70, height: 15, type: 'moving_platform', moveRange: 60, moveSpeed: 1.6, moveAxis: 'y' },
    { x: 17400, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 17600, y: GROUND_Y - 70, width: 90, height: 15, type: 'platform' },
    { x: 17800, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 17860, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 17920, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
  ],

  enemies: [
    // Секция 1
    { x: 600,  y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 920,  y: GROUND_Y - 80 - ENTITY_SIZE, type: 'basic' },
    { x: 1600, y: GROUND_Y - ENTITY_SIZE, type: 'shooter' },
    { x: 2020, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'basic' },

    // Секция 2
    { x: 2800, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 2920, y: GROUND_Y - 90 - ENTITY_SIZE, type: 'shooter' },
    { x: 3200, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 40 },
    { x: 3770, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'basic' },
    { x: 4000, y: GROUND_Y - ENTITY_SIZE, type: 'shooter' },
    { x: 4400, y: GROUND_Y - 100, type: 'flying', patrolRange: 60 },
    { x: 4820, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'basic' },

    // Секция 3
    { x: 5200, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 50 },
    { x: 5620, y: GROUND_Y - 90 - ENTITY_SIZE, type: 'shooter' },
    { x: 5900, y: GROUND_Y - 70, type: 'flying', patrolRange: 70 },
    { x: 6200, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 6520, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'shooter' },
    { x: 6750, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 40 },
    { x: 7000, y: GROUND_Y - 100, type: 'flying', patrolRange: 60 },
    { x: 7370, y: GROUND_Y - 60 - ENTITY_SIZE, type: 'basic' },

    // Секция 4
    { x: 7700, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 50 },
    { x: 8120, y: GROUND_Y - 90 - ENTITY_SIZE, type: 'shooter' },
    { x: 8400, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 8700, y: GROUND_Y - 80, type: 'flying', patrolRange: 55 },
    { x: 9020, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },

    // Секция 5
    { x: 9820, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'basic' },
    { x: 10020, y: GROUND_Y - 120, type: 'flying', patrolRange: 60 },
    { x: 10520, y: GROUND_Y - 90 - ENTITY_SIZE, type: 'shooter' },
    { x: 10800, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 45 },
    { x: 11120, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },
    { x: 11420, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'basic' },

    // Секция 6
    { x: 14220, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'shooter' },
    { x: 14500, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 50 },
    { x: 14720, y: GROUND_Y - 110, type: 'flying', patrolRange: 55 },
    { x: 15120, y: GROUND_Y - 90 - ENTITY_SIZE, type: 'shooter' },

    // Секция 7: финал
    { x: 16200, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 40 },
    { x: 16720, y: GROUND_Y - 80 - ENTITY_SIZE, type: 'shooter' },
    { x: 17000, y: GROUND_Y - 80, type: 'flying', patrolRange: 60 },
    { x: 17220, y: GROUND_Y - 110, type: 'flying', patrolRange: 50 },
    { x: 17620, y: GROUND_Y - 70 - ENTITY_SIZE, type: 'shooter' },
    { x: 17820, y: GROUND_Y - ENTITY_SIZE, type: 'armored', patrolRange: 45 },

    // Chomper-ы (5 штук)
    { x: 1300, y: GROUND_Y - ENTITY_SIZE, type: 'chomper' },
    { x: 3700, y: GROUND_Y - ENTITY_SIZE, type: 'chomper' },
    { x: 6050, y: GROUND_Y - ENTITY_SIZE, type: 'chomper' },
    { x: 10300, y: GROUND_Y - ENTITY_SIZE, type: 'chomper' },
    { x: 16800, y: GROUND_Y - ENTITY_SIZE, type: 'chomper' },
  ],

  powerups: [
    { x: 800,   y: GROUND_Y - 60, type: 'shield' },
    { x: 2200,  y: GROUND_Y - 80, type: 'bomb' },
    { x: 3900,  y: GROUND_Y - 50, type: 'rocket' },
    { x: 5700,  y: GROUND_Y - 70, type: 'shield' },
    { x: 7500,  y: GROUND_Y - 60, type: 'bomb' },
    { x: 9100,  y: GROUND_Y - 50, type: 'rocket' },
    { x: 10900, y: GROUND_Y - 60, type: 'shield' },
    { x: 14800, y: GROUND_Y - 70, type: 'bomb' },
    { x: 16400, y: GROUND_Y - 50, type: 'rocket' },
  ],

  cages: [
    { x: 2910,  y: GROUND_Y - 130, skinId: 'red' },
    { x: 6510,  y: GROUND_Y - 140, skinId: 'lava' },
    { x: 11410, y: GROUND_Y - 130, skinId: 'ember' },
  ],

  coins: [
    { x: 300,   y: GROUND_Y - 60 },
    { x: 360,   y: GROUND_Y - 60 },
    { x: 420,   y: GROUND_Y - 60 },
    { x: 1200,  y: GROUND_Y - 80 },
    { x: 1260,  y: GROUND_Y - 100 },
    { x: 1320,  y: GROUND_Y - 80 },
    { x: 2400,  y: GROUND_Y - 60 },
    { x: 2460,  y: GROUND_Y - 60 },
    { x: 3000,  y: GROUND_Y - 110 },
    { x: 3060,  y: GROUND_Y - 110 },
    { x: 4500,  y: GROUND_Y - 80 },
    { x: 4560,  y: GROUND_Y - 100 },
    { x: 5500,  y: GROUND_Y - 60 },
    { x: 5560,  y: GROUND_Y - 60 },
    { x: 6600,  y: GROUND_Y - 100 },
    { x: 7600,  y: GROUND_Y - 60 },
    { x: 7660,  y: GROUND_Y - 60 },
    { x: 8900,  y: GROUND_Y - 80 },
    { x: 9900,  y: GROUND_Y - 60 },
    { x: 9960,  y: GROUND_Y - 60 },
    { x: 10600, y: GROUND_Y - 100 },
    { x: 11300, y: GROUND_Y - 60 },
    { x: 14500, y: GROUND_Y - 60 },
    { x: 16500, y: GROUND_Y - 80 },
    { x: 17700, y: GROUND_Y - 60 },
  ],

  fallingBlocks: [
    { x: 2000, y: GROUND_Y - 130, width: 65, height: 16 },
    { x: 5700, y: GROUND_Y - 145, width: 70, height: 16 },
    { x: 9200, y: GROUND_Y - 135, width: 60, height: 16 },
  ],

  pendulums: [
    { x: 3800, y: GROUND_Y - 230, length: 140, amplitude: 1.0, phase: 0,   speed: 0.033, ballRadius: 15 },
    { x: 7800, y: GROUND_Y - 220, length: 130, amplitude: 1.1, phase: 1.2, speed: 0.038, ballRadius: 15 },
  ],

  rocketCorridor: {
    startX: 12000,
    endX: 14000,
    gapSizeFunc: 'variable',
    movingSpikes: [
      { offsetX: 350,  amplitude: 50, phase: 0,   speed: 0.04 },
      { offsetX: 750,  amplitude: 45, phase: 1.0, speed: 0.05 },
      { offsetX: 1150, amplitude: 60, phase: 0.5, speed: 0.035 },
      { offsetX: 1550, amplitude: 50, phase: 2.0, speed: 0.045 },
    ],
    coins: [
      { offsetX: 550,  gapOffset: 0 },
      { offsetX: 950,  gapOffset: -0.3 },
      { offsetX: 1350, gapOffset: 0.3 },
    ],
  },

  boss: {
    type: 'inferno',
    name: 'INFERNO',
    hp: 50,
    phases: 3,
  },
};

export default level4;
