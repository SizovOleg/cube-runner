import { LevelData } from '../types';
import { GROUND_Y } from '@utils/constants';

/**
 * Уровень 5: Цифровое Ядро
 * Финальный уровень — микс всех механик с гравитационными порталами, лазерами и разрушаемыми блоками.
 * Босс: Core — интерактивное ядро с нескончаемыми атаками.
 */
const level5: LevelData = {
  id: 5,
  name: 'Digital Core',
  description: 'Финальное испытание. Гравитационные порталы, лазеры, разрушаемые блоки и самый мощный босс.',
  length: 7000,
  backgroundColor: '#050512',
  groundColor: '#0a0a2a',

  obstacles: [
    // === Секция 1: Знакомство с новыми механиками ===
    // Разрушаемые блоки
    { x: 400, y: GROUND_Y - 80, width: 80, height: 20, type: 'breakable_block' },
    { x: 600, y: GROUND_Y - 80, width: 80, height: 20, type: 'breakable_block' },

    // Шипы
    { x: 300, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },
    { x: 800, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },
    { x: 830, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },

    // === Секция 2: Батуты и сферы ===
    { x: 1100, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump_pad_red' },
    { x: 1400, y: GROUND_Y - 200, width: 40, height: 40, type: 'jump_ring_yellow' },
    { x: 1600, y: GROUND_Y - 280, width: 40, height: 40, type: 'jump_ring_pink' },

    // Платформа с шипами
    { x: 1800, y: GROUND_Y - 100, width: 200, height: 20, type: 'platform' },
    { x: 1850, y: GROUND_Y - 130, width: 30, height: 30, type: 'spike' },
    { x: 1950, y: GROUND_Y - 130, width: 30, height: 30, type: 'spike' },

    // === Секция 3: Смена скорости ===
    { x: 2200, y: GROUND_Y - 120, width: 50, height: 120, type: 'speed_portal_fast' },

    // Быстрая секция с шипами
    { x: 2500, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },
    { x: 2600, y: GROUND_Y - 30, width: 60, height: 30, type: 'spike' },
    { x: 2750, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },

    // Возврат нормальной скорости
    { x: 2900, y: GROUND_Y - 120, width: 50, height: 120, type: 'speed_portal_normal' },

    // === Секция 4: Инверсия гравитации ===
    { x: 3200, y: GROUND_Y - 150, width: 50, height: 120, type: 'gravity_portal_up' },

    // Потолочные шипы (когда гравитация перевернута)
    { x: 3400, y: 50, width: 30, height: 30, type: 'spike' },
    { x: 3500, y: 50, width: 30, height: 30, type: 'spike' },
    { x: 3600, y: 80, width: 80, height: 20, type: 'platform' },

    // Возврат нормальной гравитации
    { x: 3900, y: 80, width: 50, height: 120, type: 'gravity_portal_down' },

    // === Секция 5: Лазеры ===
    { x: 4200, y: GROUND_Y - 200, width: 20, height: 200, type: 'laser' },
    { x: 4400, y: GROUND_Y - 200, width: 20, height: 200, type: 'laser' },
    { x: 4600, y: GROUND_Y - 200, width: 20, height: 200, type: 'laser' },

    // Маленький батут перед лазерами
    { x: 4100, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump_pad_yellow' },

    // === Финальный рывок ===
    // Разрушаемые блоки + шипы
    { x: 4900, y: GROUND_Y - 80, width: 80, height: 20, type: 'breakable_block' },
    { x: 5100, y: GROUND_Y - 80, width: 80, height: 20, type: 'breakable_block' },
    { x: 5000, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },
    { x: 5300, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },
    { x: 5330, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },
    { x: 5360, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },

    // Суперфаст финал
    { x: 5500, y: GROUND_Y - 120, width: 50, height: 120, type: 'speed_portal_superfast' },
    { x: 5700, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },
    { x: 5800, y: GROUND_Y - 30, width: 30, height: 30, type: 'spike' },
    { x: 5900, y: GROUND_Y - 120, width: 50, height: 120, type: 'speed_portal_normal' },
  ],

  enemies: [
    { x: 700, y: GROUND_Y - 50, type: 'basic', patrolRange: 100 },
    { x: 1300, y: GROUND_Y - 50, type: 'shooter', patrolRange: 80 },
    { x: 2000, y: GROUND_Y - 250, type: 'flying', patrolRange: 150 },
    { x: 3000, y: GROUND_Y - 50, type: 'armored', patrolRange: 60 },
    { x: 4000, y: GROUND_Y - 50, type: 'chomper', patrolRange: 180 },
    { x: 4800, y: GROUND_Y - 250, type: 'flying', patrolRange: 200 },
    { x: 5400, y: GROUND_Y - 50, type: 'armored', patrolRange: 100 },
  ],

  powerups: [
    { x: 500, y: GROUND_Y - 150, type: 'shield' },
    { x: 1500, y: GROUND_Y - 350, type: 'bomb' },
    { x: 2700, y: GROUND_Y - 120, type: 'rocket' },
    { x: 4300, y: GROUND_Y - 120, type: 'shield' },
    { x: 5200, y: GROUND_Y - 180, type: 'bomb' },
  ],

  coins: [
    { x: 400, y: GROUND_Y - 150 },
    { x: 700, y: GROUND_Y - 130 },
    { x: 1100, y: GROUND_Y - 250 },
    { x: 1400, y: GROUND_Y - 280 },
    { x: 1700, y: GROUND_Y - 180 },
    { x: 2000, y: GROUND_Y - 320 },
    { x: 2600, y: GROUND_Y - 150 },
    { x: 3300, y: 150 },
    { x: 3600, y: 130 },
    { x: 4200, y: GROUND_Y - 120 },
    { x: 4700, y: GROUND_Y - 150 },
    { x: 5100, y: GROUND_Y - 200 },
    { x: 5600, y: GROUND_Y - 120 },
  ],

  boss: {
    type: 'core',
    name: 'Digital Core',
    hp: 200,
    phases: 4,
  },
};

export default level5;
