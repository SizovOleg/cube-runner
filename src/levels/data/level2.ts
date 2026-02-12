import { LevelData } from '../types';
import { GROUND_Y, ENTITY_SIZE } from '@utils/constants';

/**
 * Уровень 2: Кибер-Канализация
 * Новые механики: движущиеся платформы, стреляющие враги.
 * Босс: Crusher — огромный блок, который пытается раздавить.
 */
const level2: LevelData = {
  id: 2,
  name: 'Кибер-Канализация',
  description: 'Глубже в цифровые катакомбы',
  length: 15000,
  backgroundColor: '#0a1a0e',
  groundColor: '#1a2e1a',
  obstacles: [
    // TODO: Заполнить при разработке уровня
    { x: 500, y: GROUND_Y - 20, width: 20, height: 20, type: 'spike' },
    { x: 1200, y: GROUND_Y - 60, width: 100, height: 15, type: 'moving_platform', moveRange: 80, moveSpeed: 1.5, moveAxis: 'y' },
  ],
  enemies: [
    { x: 1000, y: GROUND_Y - ENTITY_SIZE, type: 'basic' },
    { x: 2000, y: GROUND_Y - ENTITY_SIZE, type: 'shooter' },
  ],
  powerups: [
    { x: 800, y: GROUND_Y - 60, type: 'shield' },
  ],
  boss: {
    type: 'crusher',
    name: 'CRUSHER',
    hp: 30,
    phases: 3,
  },
};

export default level2;
