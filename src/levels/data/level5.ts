import { 
  GROUND_Y, 
  ENTITY_SIZE, 
  COLORS, 
  LEVEL_WIDTH 
} from '@utils/constants';
import { LevelData } from '../types';

/**
 * Level 5: "Digital Core"
 * Final level - Mix of all mechanics + Lasers and Breakable blocks.
 */
export const level5: LevelData = {
  id: 5,
  name: "Digital Core",
  difficulty: 5,
  theme: "digital",
  platforms: [
    { x: 0, y: GROUND_Y, width: 600, height: 100, type: 'platform' },
    // Breakable section
    { x: 800, y: GROUND_Y - 120, width: 100, height: 20, type: 'breakable-block' },
    { x: 1000, y: GROUND_Y - 120, width: 100, height: 20, type: 'breakable-block' },
    { x: 1200, y: GROUND_Y - 120, width: 100, height: 20, type: 'breakable-block' },
    // Mix
    { x: 1500, y: GROUND_Y - 200, width: 300, height: 20, type: 'platform' },
    { x: 2000, y: 50, width: 800, height: 30, type: 'platform' }, // Ceiling
    { x: 3000, y: GROUND_Y - 150, width: 400, height: 20, type: 'platform' },
    { x: 3800, y: GROUND_Y, width: 1200, height: 100, type: 'platform' }
  ],
  obstacles: [
    // Intro Laser
    { x: 400, y: GROUND_Y - 100, width: 20, height: 100, type: 'laser-turret', active: true },
    
    // Precision Jump Rings over breakable blocks
    { x: 900, y: GROUND_Y - 220, width: 40, height: 40, type: 'jump-ring', subType: 'yellow' },
    { x: 1100, y: GROUND_Y - 220, width: 40, height: 40, type: 'jump-ring', subType: 'pink' },
    
    // Speed Portal: Fast
    { x: 1400, y: GROUND_Y - 100, width: 50, height: 100, type: 'speed-portal', speedType: 'fast' },
    
    // Laser Gauntlet
    { x: 1600, y: GROUND_Y - 300, width: 20, height: 100, type: 'laser-turret', active: true },
    { x: 1750, y: GROUND_Y - 300, width: 20, height: 100, type: 'laser-turret', active: true },
    
    // Gravity Portal: Invert
    { x: 1900, y: GROUND_Y - 150, width: 60, height: 120, type: 'gravity-portal', subType: 'invert' },
    
    // Ceiling Lasers
    { x: 2200, y: 80, width: 20, height: 80, type: 'laser-turret', active: true, timer: 180 },
    { x: 2500, y: 80, width: 20, height: 80, type: 'laser-turret', active: true, timer: 180 },
    
    // Restore Gravity Portal
    { x: 2900, y: 100, width: 60, height: 120, type: 'gravity-portal', subType: 'restore' },
    
    // Jump Pad: Red
    { x: 3400, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump-pad', subType: 'red', jumpForce: -20 },
    
    // Spikes mess at the end
    { x: 4000, y: GROUND_Y - 30, width: 120, height: 30, type: 'obstacle', subType: 'spikes' },
    
    // Decorations
    { x: 100, y: GROUND_Y - 40, width: 30, height: 40, type: 'decoration', subType: 'circuit' },
    { x: 4200, y: GROUND_Y - 40, width: 30, height: 40, type: 'decoration', subType: 'circuit' },
  ],
  enemies: [
    { x: 1800, y: GROUND_Y - 50, width: 50, height: 50, type: 'enemy', subType: 'guardian', hp: 5 },
    { x: 3200, y: GROUND_Y - 200, width: 50, height: 50, type: 'enemy', subType: 'guardian', hp: 5 }
  ],
  powerups: [
    { x: 1100, y: GROUND_Y - 300, width: 30, height: 30, type: 'powerup', subType: 'shield' },
    { x: 2400, y: 150, width: 30, height: 30, type: 'powerup', subType: 'rocket' }
  ],
  coins: [
    { x: 100, y: GROUND_Y - 150, width: 25, height: 25, type: 'coin' },
    { x: 900, y: GROUND_Y - 280, width: 25, height: 25, type: 'coin' },
    { x: 1100, y: GROUND_Y - 280, width: 25, height: 25, type: 'coin' },
    { x: 2400, y: 200, width: 25, height: 25, type: 'coin' },
    { x: 4100, y: GROUND_Y - 80, width: 25, height: 25, type: 'coin' }
  ],
  boss: {
    x: 4600,
    y: GROUND_Y - 200,
    width: 200,
    height: 200,
    type: 'boss',
    subType: 'core',
    hp: 40,
    maxHP: 40
  }
};
