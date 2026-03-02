import { 
  GROUND_Y, 
  ENTITY_SIZE, 
  COLORS, 
  LEVEL_WIDTH 
} from '@utils/constants';
import { LevelData } from '../types';

/**
 * Level 3: "Cyber Rush"
 * Focus on speed changes (Speed Portals) and timing.
 */
export const level3: LevelData = {
  id: 3,
  name: "Cyber Rush",
  difficulty: 3,
  theme: "cyber",
  platforms: [
    { x: 0, y: GROUND_Y, width: 800, height: 100, type: 'platform' },
    { x: 1000, y: GROUND_Y, width: 500, height: 100, type: 'platform' },
    { x: 1700, y: GROUND_Y, width: 600, height: 100, type: 'platform' },
    { x: 2500, y: GROUND_Y, width: 2000, height: 100, type: 'platform' },
    // High platforms for speed sections
    { x: 3000, y: GROUND_Y - 180, width: 400, height: 20, type: 'platform' },
    { x: 3600, y: GROUND_Y - 180, width: 400, height: 20, type: 'platform' }
  ],
  obstacles: [
    // Speed Portal: Fast (Green)
    { x: 400, y: GROUND_Y - 100, width: 50, height: 100, type: 'speed-portal', speedType: 'fast', colorTheme: '#00ff00' },
    
    // Fast section spikes
    { x: 900, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 1100, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 1300, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    
    // Speed Portal: Superfast (Purple)
    { x: 1600, y: GROUND_Y - 100, width: 50, height: 100, type: 'speed-portal', speedType: 'superfast', colorTheme: '#ff00ff' },
    
    // Tight timing with Superfast speed
    { x: 1900, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    { x: 2000, y: GROUND_Y - 30, width: 60, height: 30, type: 'obstacle', subType: 'spikes' }, // Long spike block
    { x: 2200, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    
    // Speed Portal: Slow (Orange)
    { x: 2450, y: GROUND_Y - 100, width: 50, height: 100, type: 'speed-portal', speedType: 'slow', colorTheme: '#ffaa00' },
    
    // Precision jumps in slow mode
    { x: 2700, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump-pad', subType: 'yellow', jumpForce: -14 },
    { x: 2900, y: GROUND_Y - 20, width: 40, height: 20, type: 'jump-pad', subType: 'yellow', jumpForce: -14 },
    
    // Jump Rings during slow section
    { x: 3100, y: GROUND_Y - 250, width: 40, height: 40, type: 'jump-ring', subType: 'yellow' },
    { x: 3300, y: GROUND_Y - 250, width: 40, height: 40, type: 'jump-ring', subType: 'yellow' },
    
    // Speed Portal: Normal (Blue)
    { x: 4000, y: GROUND_Y - 100, width: 50, height: 100, type: 'speed-portal', speedType: 'normal', colorTheme: '#00aaff' },
    
    // Final spikes
    { x: 4300, y: GROUND_Y - 30, width: 30, height: 30, type: 'obstacle', subType: 'spikes' }
  ],
  enemies: [
    { x: 1200, y: GROUND_Y - 50, width: 40, height: 40, type: 'enemy', subType: 'drone', hp: 2 },
    { x: 2100, y: GROUND_Y - 50, width: 40, height: 40, type: 'enemy', subType: 'drone', hp: 2 }
  ],
  powerups: [
    { x: 1400, y: GROUND_Y - 180, width: 30, height: 30, type: 'powerup', subType: 'rocket' },
    { x: 3200, y: GROUND_Y - 300, width: 30, height: 30, type: 'powerup', subType: 'doublejump' }
  ],
  coins: [
    { x: 950, y: GROUND_Y - 150, width: 25, height: 25, type: 'coin' },
    { x: 1650, y: GROUND_Y - 150, width: 25, height: 25, type: 'coin' },
    { x: 3100, y: GROUND_Y - 320, width: 25, height: 25, type: 'coin' },
    { x: 3300, y: GROUND_Y - 320, width: 25, height: 25, type: 'coin' }
  ],
  boss: {
    x: 4600,
    y: GROUND_Y - 150,
    width: 130,
    height: 130,
    type: 'boss',
    subType: 'sentinel',
    hp: 20,
    maxHP: 20
  }
};
