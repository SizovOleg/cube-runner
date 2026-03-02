import { 
  GROUND_Y, 
  ENTITY_SIZE, 
  COLORS, 
  LEVEL_WIDTH 
} from '@utils/constants';
import { LevelData } from '../types';

/**
 * Level 4: "Inverted Realm"
 * Focus on Gravity Portals - half level is on the ceiling.
 */
export const level4: LevelData = {
  id: 4,
  name: "Inverted Realm",
  difficulty: 4,
  theme: "void",
  platforms: [
    { x: 0, y: GROUND_Y, width: 800, height: 100, type: 'platform' },
    // Ceiling platforms
    { x: 1000, y: 50, width: 1000, height: 30, type: 'platform' },
    { x: 2200, y: 150, width: 400, height: 20, type: 'platform' },
    // Middle section
    { x: 2800, y: GROUND_Y - 200, width: 400, height: 20, type: 'platform' },
    // Back to floor
    { x: 3500, y: GROUND_Y, width: 1500, height: 100, type: 'platform' }
  ],
  obstacles: [
    // Gravity Portal: Invert (Yellow/Orange)
    { x: 800, y: GROUND_Y - 150, width: 60, height: 120, type: 'gravity-portal', subType: 'invert', colorTheme: '#ffaa00' },
    
    // Spikes on the ceiling (facing down)
    { x: 1200, y: 80, width: 30, height: 30, type: 'obstacle', subType: 'spikes', timer: 180 }, // timer: 180 means it's Upside Down
    { x: 1400, y: 80, width: 30, height: 30, type: 'obstacle', subType: 'spikes', timer: 180 },
    
    // Jump Pad on the ceiling! (Pink - small jump downwards)
    { x: 1600, y: 80, width: 40, height: 20, type: 'jump-pad', subType: 'pink', jumpForce: 10 },
    
    // Gravity Portal: Restore (Blue)
    { x: 2000, y: 100, width: 60, height: 120, type: 'gravity-portal', subType: 'restore', colorTheme: '#00aaff' },
    
    // Spikes on the mid-platform
    { x: 2900, y: GROUND_Y - 230, width: 30, height: 30, type: 'obstacle', subType: 'spikes' },
    
    // Another Invert Portal
    { x: 3300, y: GROUND_Y - 150, width: 60, height: 120, type: 'gravity-portal', subType: 'invert' },
    
    // Ceiling spikes cluster
    { x: 3600, y: 80, width: 30, height: 30, type: 'obstacle', subType: 'spikes', timer: 180 },
    { x: 3630, y: 80, width: 30, height: 30, type: 'obstacle', subType: 'spikes', timer: 180 },
    { x: 3660, y: 80, width: 30, height: 30, type: 'obstacle', subType: 'spikes', timer: 180 },
    
    // Back to normal
    { x: 4000, y: 100, width: 60, height: 120, type: 'gravity-portal', subType: 'restore' },
    
    // Decorations
    { x: 500, y: GROUND_Y - 100, width: 40, height: 40, type: 'decoration', subType: 'crystal' },
    { x: 1500, y: 120, width: 40, height: 40, type: 'decoration', subType: 'crystal' },
  ],
  enemies: [
    { x: 1800, y: 120, width: 45, height: 45, type: 'enemy', subType: 'shredder', hp: 3 },
    { x: 3800, y: 120, width: 45, height: 45, type: 'enemy', subType: 'shredder', hp: 3 }
  ],
  powerups: [
    { x: 1300, y: 150, width: 30, height: 30, type: 'powerup', subType: 'magnet' },
    { x: 2900, y: GROUND_Y - 320, width: 30, height: 30, type: 'powerup', subType: 'superbullet' }
  ],
  coins: [
    { x: 1200, y: 150, width: 25, height: 25, type: 'coin' },
    { x: 1400, y: 150, width: 25, height: 25, type: 'coin' },
    { x: 3600, y: 150, width: 25, height: 25, type: 'coin' },
    { x: 3660, y: 150, width: 25, height: 25, type: 'coin' }
  ],
  boss: {
    x: 4600,
    y: GROUND_Y - 160,
    width: 150,
    height: 150,
    type: 'boss',
    subType: 'inferno',
    hp: 25,
    maxHP: 25
  }
};
