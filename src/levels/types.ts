import { PowerupType } from '@utils/constants';

export type GameObjectType = 
  | 'obstacle' 
  | 'enemy' 
  | 'platform' 
  | 'powerup' 
  | 'coin' 
  | 'boss' 
  | 'bullet' 
  | 'jump-pad'
  | 'jump-ring'
  | 'speed-portal'
  | 'gravity-portal'
  | 'breakable-block'
  | 'laser-turret'
  | 'decoration';

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: GameObjectType;
  color?: string;
  hp?: number;
  maxHP?: number;
  // Specific properties
  subType?: string;      // e.g. 'spikes', 'plant'
  speedType?: 'slow' | 'normal' | 'fast' | 'superfast';
  jumpForce?: number;    // For jump pads
  colorTheme?: string;   // For portals
  active?: boolean;      // For lasers
  timer?: number;        // For animations/durations
}

export interface LevelData {
  id: number;
  name: string;
  difficulty: number;
  platforms: GameObject[];
  obstacles: GameObject[];
  enemies: GameObject[];
  powerups: GameObject[];
  coins: GameObject[];
  boss: GameObject | null;
  decorations?: GameObject[];
  theme?: string;
}

export type LevelInfo = {
  id: number;
  name: string;
  difficulty: number;
  status: 'locked' | 'unlocked' | 'completed';
  stars: number;
  highScore: number;
  bestTime: string;
  description: string;
};
