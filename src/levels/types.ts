import { PowerupType, SkinId, UpgradeType } from '@utils/constants';

export type { SkinId };

// Монета на уровне
export interface CoinData {
  x: number;
  y: number;
}

// Клетка со скином внутри
export interface CageData {
  x: number;
  y: number;
  skinId: SkinId;
}

// Базовый игровой объект
export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Препятствия
export type ObstacleType = 'spike' | 'platform' | 'moving_platform' | 'crusher';

export interface ObstacleData {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  // Для движущихся объектов
  moveRange?: number;
  moveSpeed?: number;
  moveAxis?: 'x' | 'y';
}

// Враги
export type EnemyType = 'basic' | 'shooter' | 'flying' | 'armored' | 'chomper';

export interface EnemyData {
  x: number;
  y: number;
  type: EnemyType;
  patrolRange?: number; // Дальность патрулирования
}

// Powerup
export interface PowerupData {
  x: number;
  y: number;
  type: PowerupType;
}

// Движущийся шип в коридоре
export interface CorridorMovingSpike {
  offsetX: number;   // смещение от начала коридора
  amplitude: number; // амплитуда движения (px)
  phase: number;     // начальная фаза синусоиды
  speed: number;     // скорость (рад/кадр)
}

// Вращающийся блок в коридоре
export interface CorridorRotatingBlock {
  offsetX: number;   // смещение от начала коридора
  gapOffset: number; // смещение от центра зазора (-1..1)
  size: number;      // размер блока (px)
}

// Монета в коридоре
export interface CorridorCoin {
  offsetX: number;
  gapOffset: number; // смещение от центра зазора (-1..1, 0 = центр)
}

// Ракетный коридор
export interface RocketCorridorData {
  startX: number;
  endX: number;
  // Сужения/расширения: gapSize по умолчанию 120, можно задать переменный
  gapSizeFunc?: 'constant' | 'variable'; // 'variable' = синусоида ±30px
  movingSpikes?: CorridorMovingSpike[];
  rotatingBlocks?: CorridorRotatingBlock[];
  coins?: CorridorCoin[];
}

// Босс
export interface BossData {
  type: string;
  name: string;
  hp: number;
  phases: number; // Количество фаз
}

// Падающий блок
export interface FallingBlockData {
  x: number;
  y: number;       // начальная высота (висит в воздухе)
  width: number;
  height: number;
}

// Маятник
export interface PendulumData {
  x: number;       // точка крепления (мировые координаты)
  y: number;       // точка крепления
  length: number;  // длина цепи (px)
  amplitude: number; // амплитуда качания (радианы)
  phase: number;   // начальная фаза
  speed: number;   // скорость (рад/кадр)
  ballRadius: number;
}

// Данные уровня
export interface LevelData {
  id: number;
  name: string;
  description: string;
  length: number; // Длина уровня в пикселях
  backgroundColor?: string;
  groundColor?: string;
  obstacles: ObstacleData[];
  enemies: EnemyData[];
  powerups: PowerupData[];
  boss: BossData;
  // Монеты
  coins?: CoinData[];
  // Клетки со скинами (опционально)
  cages?: CageData[];
  // Ракетный коридор (опционально)
  rocketCorridor?: RocketCorridorData;
  // Новые динамические препятствия
  fallingBlocks?: FallingBlockData[];
  pendulums?: PendulumData[];
  // Декорации (опционально)
  decorations?: Array<{
    x: number;
    y: number;
    type: string;
  }>;
}

// Прогресс игрока
export interface PlayerProgress {
  unlockedLevels: number[];
  bestScores: Record<number, number>;
  totalKills: number;
  bossesDefeated: number[];
  unlockedSkins: SkinId[];
  currentSkin: SkinId;
  // Монеты и апгрейды
  coins: number;
  ownedUpgrades: Record<UpgradeType, number>; // количество купленных
  activeUpgrades: UpgradeType[]; // активированы перед началом уровня
}

// Состояние игры
export type GameScreen = 'menu' | 'levelSelect' | 'skins' | 'shop' | 'upgrades' | 'playing' | 'bossIntro' | 'bossFight' | 'levelComplete' | 'dead' | 'pause';

export interface GameState {
  screen: GameScreen;
  currentLevel: number;
  score: number;
  kills: number;
  camera: number;
  playerHP: number;
  maxHP: number;
}
