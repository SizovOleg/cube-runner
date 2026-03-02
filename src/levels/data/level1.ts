import { 
  GROUND_Y, 
  ENTITY_SIZE, 
  COLORS, 
  LEVEL_WIDTH 
} from '@utils/constants';
import { LevelData } from '../types';

/**
 * Level 1: "Training Grounds"
 * Intro level - focus on basics + Jump Pads.
 */
export const level1: LevelData = {
  id: 1,
  name: "Training Grounds",
  difficulty: 1,
  theme: "forest",
  platforms: [
    // Standard platforms
    { x: 0, y: GROUND_Y, width: LEVEL_WIDTH * 2, height: 100, type: 'platform' },
    { x: 400, y: GROUND_Y - 80, width: 200, height: 20, type: 'platform' },
    { x: 750, y: GROUND_Y - 160, width: 180, height: 20, type: 'platform' },
    
    // Jump Pad section
    { x: 1200, y: GROUND_Y - 60, width: 150, height: 20, type: 'platform' },
    { x: 1600, y: GROUND_Y - 140, width: 150, height: 20, type: 'platform' },
    { x: 2000, y: GROUND_Y - 220, width: 150, height: 20, type: 'platform' },

    // Bridge / Stairs
    { x: 2500, y: GROUND_Y - 100, width: 100, height: 20, type: 'platform' },
    { x: 2650, y: GROUND_Y - 180, width: 100, height: 20, type: 'platform' },
    { x: 2800, y: GROUND_Y - 260, width: 100, height: 20, type: 'platform' },
    
    // Final stretch platforms
    { x: 3400, y: GROUND_Y - 150, width: 300, height: 20, type: 'platform' },
    { x: 4000, y: GROUND_Y, width: 1000, height: 100, type: 'platform' }
  ],
  obstacles: [
    // Spikes intro
    { x: 600, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 1000, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 1030, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },

    // Jump pad intro (Pink - small jump)
    { x: 1100, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump-pad', subType: 'pink', jumpForce: -10 },
    
    // Spikes on platforms
    { x: 1300, y: GROUND_Y - 85, width: 25, height: 25, type: 'obstacle', subType: 'spikes' },
    
    // Yellow Jump Pad (Standard jump)
    { x: 1550, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump-pad', subType: 'yellow', jumpForce: -14 },
    
    // Double spikes
    { x: 1800, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 1830, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    
    // Red Jump Pad (Super jump)
    { x: 2400, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump-pad', subType: 'red', jumpForce: -19 },
    
    // Spike clusters
    { x: 3000, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 3030, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 3060, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    
    // Decorations (Plants)
    { x: 200, y: GROUND_Y - 40, width: 30, height: 40, type: 'decoration', subType: 'plant' },
    { x: 1400, y: GROUND_Y - 40, width: 30, height: 40, type: 'decoration', subType: 'plant' },
    { x: 3800, y: GROUND_Y - 40, width: 30, height: 40, type: 'decoration', subType: 'plant' },
  ],
  enemies: [
    { x: 1500, y: GROUND_Y - 50, width: 40, height: 40, type: 'enemy', subType: 'slime', hp: 1 },
    { x: 2800, y: GROUND_Y - 50, width: 40, height: 40, type: 'enemy', subType: 'slime', hp: 1 },
    { x: 3600, y: GROUND_Y - 50, width: 45, height: 45, type: 'enemy', subType: 'shredder', hp: 2 }
  ],
  powerups: [
    { x: 800, y: GROUND_Y - 220, width: 30, height: 30, type: 'powerup', subType: 'shield' },
    { x: 2000, y: GROUND_Y - 280, width: 30, height: 30, type: 'powerup', subType: 'magnet' },
    { x: 3200, y: GROUND_Y - 80, width: 30, height: 30, type: 'powerup', subType: 'rocket' }
  ],
  coins: [
    { x: 450, y: GROUND_Y - 120, width: 25, height: 25, type: 'coin' },
    { x: 850, y: GROUND_Y - 200, width: 25, height: 25, type: 'coin' },
    { x: 1250, y: GROUND_Y - 100, width: 25, height: 25, type: 'coin' },
    { x: 1650, y: GROUND_Y - 180, width: 25, height: 25, type: 'coin' },
    { x: 2050, y: GROUND_Y - 260, width: 25, height: 25, type: 'coin' },
    { x: 2600, y: GROUND_Y - 300, width: 25, height: 25, type: 'coin' },
    { x: 2800, y: GROUND_Y - 340, width: 25, height: 25, type: 'coin' },
    { x: 4100, y: GROUND_Y - 50, width: 25, height: 25, type: 'coin' },
    { x: 4150, y: GROUND_Y - 50, width: 25, height: 25, type: 'coin' },
    { x: 4200, y: GROUND_Y - 50, width: 25, height: 25, type: 'coin' }
  ],
  boss: {
    x: 4600,
    y: GROUND_Y - 120,
    width: 120,
    height: 120,
    type: 'boss',
    subType: 'mech',
    hp: 10,
    maxHP: 10
  }
};
