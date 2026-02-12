// Размеры canvas
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

// Физика
export const GRAVITY = 0.45;
export const JUMP_FORCE = -8;
export const FLY_FORCE = -0.55;
export const GROUND_Y = CANVAS_HEIGHT - 60;
export const ENTITY_SIZE = 30;
export const BASE_SPEED = 3.2;
export const MAX_SPEED_BONUS = 1.8;
export const BULLET_SPEED = 9;
export const SHOOT_COOLDOWN = 20;

// Цветовая палитра (неоновый стиль)
export const COLORS = {
  bg: '#0a0a2e',
  ground: '#1a1a4e',
  groundLine: '#4444ff',
  cube: '#00ff88',
  cubeGlow: 'rgba(0,255,136,0.4)',
  spike: '#ff4466',
  enemy: '#ff3333',
  enemyEye: '#fff',
  platform: '#3355ff',
  star: 'rgba(255,255,255,0.6)',
  text: '#fff',
  neon: '#00ffcc',
  bullet: '#ffff00',
  shield: '#44ddff',
  bomb: '#ff8800',
  rocket: '#ff44ff',
  bossHealth: '#ff0044',
  bossHealthBg: '#330011',
} as const;

// Powerup конфиг
export const POWERUP_TYPES = ['shield', 'bomb', 'rocket'] as const;
export type PowerupType = (typeof POWERUP_TYPES)[number];

export const POWERUP_LABELS: Record<PowerupType, string> = {
  shield: 'SH',
  bomb: 'BM',
  rocket: 'RK',
};

export const POWERUP_COLORS: Record<PowerupType, string> = {
  shield: COLORS.shield,
  bomb: COLORS.bomb,
  rocket: COLORS.rocket,
};

export const POWERUP_DURATION: Partial<Record<PowerupType, number>> = {
  shield: 300,
  rocket: 180,
};

// Уровни
export const LEVEL_BOSS_ARENA_WIDTH = 600;
export const BOSS_INTRO_DURATION = 120; // frames
