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

// Скины
export type SkinId = 'green' | 'gold' | 'blue' | 'pink' | 'white' | 'orange' | 'red' | 'lava' | 'ember' | 'chrome' | 'neon' | 'void';

export const SKIN_COLORS: Record<SkinId, string> = {
  green: '#00ff88',
  gold: '#ffd700',
  blue: '#0088ff',
  pink: '#ff69b4',
  white: '#ffffff',
  orange: '#ff6600',
  red: '#ff2200',
  lava: '#ff6600',
  ember: '#ff4400',
  chrome: '#cccccc',
  neon: '#00ffff',
  void: '#220033',
};

export const SKIN_NAMES: Record<SkinId, string> = {
  green: 'Неон',
  gold: 'Золото',
  blue: 'Сапфир',
  pink: 'Розовый',
  white: 'Алмаз',
  orange: 'Огонь',
  red: 'Красный',
  lava: 'Лава',
  ember: 'Жар',
  chrome: 'Хром',
  neon: 'Неон+',
  void: 'Пустота',
};

// Уровни
export const LEVEL_BOSS_ARENA_WIDTH = 600;
export const BOSS_INTRO_DURATION = 120; // frames

// Монеты
export const COIN_RADIUS = 8;
export const COIN_COLOR = '#ffdd00';
export const COIN_GLOW = '#ffcc00';

// Апгрейды (магазин)
export type UpgradeType = 'magnet' | 'double_jump' | 'armor' | 'super_bullet';

export interface UpgradeDef {
  id: UpgradeType;
  name: string;
  desc: string;
  cost: number;
  color: string;
  icon: string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'magnet',
    name: 'Магнит',
    desc: 'Притягивает монеты и powerups\nс расстояния 150px. 30 сек.',
    cost: 50,
    color: '#44ddff',
    icon: '🧲',
  },
  {
    id: 'double_jump',
    name: 'Двойной прыжок',
    desc: 'Второй прыжок в воздухе.\nВесь уровень.',
    cost: 80,
    color: '#00ff88',
    icon: '⬆️',
  },
  {
    id: 'armor',
    name: 'Броня',
    desc: '+2 HP на уровень.',
    cost: 100,
    color: '#ff8800',
    icon: '🛡',
  },
  {
    id: 'super_bullet',
    name: 'Суперпуля',
    desc: 'Пули пробивают врагов насквозь.\n20 сек.',
    cost: 60,
    color: '#ff44ff',
    icon: '⚡',
  },
];
