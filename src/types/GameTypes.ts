/** Общие игровые типы, используемые в GameCanvas, Renderer, HUDRenderer */

export interface Star { x: number; y: number; size: number; blink: number }
export interface Bullet { x: number; y: number; width: number; height: number }
export interface EnemyBullet { x: number; y: number; vx: number; width: number; height: number }
export interface BombProjectile { x: number; y: number; vx: number; vy: number; width: number; height: number }
export interface DeathInfo { score: number; kills: number }
export interface LevelCompleteInfo { score: number; kills: number; coinsCollected: number }
export interface LiveCoin { x: number; y: number; collected: boolean }

/** Мутабельная копия ObstacleData для движущихся платформ */
export interface MovingObstacle {
  x: number; y: number; baseX: number; baseY: number;
  width: number; height: number; type: string;
  moveRange: number; moveSpeed: number; moveAxis: 'x' | 'y'; dir: number;
}

export type FallingBlockState = 'idle' | 'warning' | 'falling' | 'landed';
export interface FallingBlock {
  x: number; y: number; baseY: number;
  width: number; height: number;
  state: FallingBlockState;
  warningTimer: number;
  vy: number;
}

/** Маятник (runtime) */
export interface Pendulum {
  x: number; y: number;
  length: number;
  amplitude: number;
  phase: number;
  speed: number;
  ballRadius: number;
  ballX: number; ballY: number;
}

export type BossPhase = 'none' | 'intro' | 'fight' | 'defeated' | 'complete';
