import { 
  GROUND_Y, 
  ENTITY_SIZE, 
  COLORS, 
  LEVEL_WIDTH 
} from '@utils/constants';
import { LevelData } from '../types';

/**
 * Level 2: "Orbital Heights"
 * Focus on Jump Rings / Orbs (Geometry Dash style).
 */
export const level2: LevelData = {
  id: 2,
  name: "Orbital Heights",
  difficulty: 2,
  theme: "sky",
  platforms: [
    { x: 0, y: GROUND_Y, width: 1000, height: 100, type: 'platform' },
    { x: 1200, y: GROUND_Y - 140, width: 200, height: 20, type: 'platform' },
    { x: 1600, y: GROUND_Y - 250, width: 250, height: 20, type: 'platform' },
    // Gap section
    { x: 2500, y: GROUND_Y - 100, width: 300, height: 20, type: 'platform' },
    { x: 3000, y: GROUND_Y - 200, width: 300, height: 20, type: 'platform' },
    { x: 3500, y: GROUND_Y, width: 1500, height: 100, type: 'platform' }
  ],
  obstacles: [
    { x: 400, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 600, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    
    // Jump Ring intro (Yellow - normal jump)
    { x: 1100, y: GROUND_Y - 180, width: 40, height: 40, type: 'jump-ring', subType: 'yellow' },
    
    // Tiny platforms with Jump Rings
    { x: 1450, y: GROUND_Y - 100, width: 40, height: 40, type: 'jump-ring', subType: 'yellow' },
    { x: 1900, y: GROUND_Y - 200, width: 40, height: 40, type: 'jump-ring', subType: 'pink' }, // Pink - small jump
    
    // Complex ring section over a gap
    { x: 2200, y: GROUND_Y - 150, width: 40, height: 40, type: 'jump-ring', subType: 'yellow' },
    { x: 2350, y: GROUND_Y - 250, width: 40, height: 40, type: 'jump-ring', subType: 'yellow' },
    
    // Spikes on platforms in the middle
    { x: 2600, y: GROUND_Y - 125, width: 25, height: 25, type: 'obstacle', subType: 'spikes' },
    { x: 2750, y: GROUND_Y - 125, width: 25, height: 25, type: 'obstacle', subType: 'spikes' },
    
    // Red Jump Pad for a big boost
    { x: 3400, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump-pad', subType: 'red', jumpForce: -20 },
    
    // Triple spikes at the end
    { x: 3800, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 3830, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 3860, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },

    // Decorations
    { x: 150, y: GROUND_Y - 80, width: 40, height: 80, type: 'decoration', subType: 'cloud' },
    { x: 800, y: GROUND_Y - 150, width: 60, height: 40, type: 'decoration', subType: 'cloud' },
  ],
  enemies: [
    { x: 2100, y: GROUND_Y - 50, width: 40, height: 40, type: 'enemy', subType: 'flyer', hp: 1 },
    { x: 3200, y: GROUND_Y - 240, width: 40, height: 40, type: 'enemy', subType: 'flyer', hp: 1 }
  ],
  powerups: [
    { x: 1700, y: GROUND_Y - 320, width: 30, height: 30, type: 'powerup', subType: 'slowmo' },
    { x: 3100, y: GROUND_Y - 280, width: 30, height: 30, type: 'powerup', subType: 'shield' }
  ],
  coins: [
    { x: 1100, y: GROUND_Y - 250, width: 25, height: 25, type: 'coin' },
    { x: 1450, y: GROUND_Y - 180, width: 25, height: 25, type: 'coin' },
    { x: 1900, y: GROUND_Y - 280, width: 25, height: 25, type: 'coin' },
    { x: 2200, y: GROUND_Y - 220, width: 25, height: 25, type: 'coin' },
    { x: 2350, y: GROUND_Y - 320, width: 25, height: 25, type: 'coin' },
    { x: 3600, y: GROUND_Y - 80, width: 25, height: 25, type: 'coin' }
  ],
  boss: {
    x: 4500,
    y: GROUND_Y - 150,
    width: 140,
    height: 90,
    type: 'boss',
    subType: 'serpent',
    hp: 15,
    maxHP: 15
  }
};
