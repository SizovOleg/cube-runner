import { LevelData } from '@levels/types';
import { Enemy } from '@entities/Enemy';
import { Powerup } from '@entities/Powerup';
import { Cage } from '@entities/Cage';
import {
  Star, MovingObstacle, FallingBlock, FallingBlockState, Pendulum, LiveCoin,
} from '@game-types/GameTypes';
import { CANVAS_WIDTH, GROUND_Y } from '@utils/constants';

export function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH * 4,
      y: Math.random() * (GROUND_Y - 20),
      size: Math.random() * 2 + 1,
      blink: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function createEnemies(level: LevelData): Enemy[] {
  return level.enemies.map((data) => new Enemy({ x: data.x, y: data.y, type: data.type, patrolRange: data.patrolRange }));
}

export function createPowerups(level: LevelData): Powerup[] {
  return level.powerups.map((data) => new Powerup(data.x, data.y, data.type));
}

export function createCages(level: LevelData): Cage[] {
  return (level.cages || []).map(c => new Cage(c.x, c.y, c.skinId));
}

export function createMovingPlatforms(level: LevelData): MovingObstacle[] {
  return level.obstacles
    .filter((obs) => obs.type === 'moving_platform' && obs.moveRange && obs.moveSpeed)
    .map((obs) => ({
      x: obs.x, y: obs.y, baseX: obs.x, baseY: obs.y,
      width: obs.width, height: obs.height, type: obs.type,
      moveRange: obs.moveRange!, moveSpeed: obs.moveSpeed!,
      moveAxis: obs.moveAxis ?? 'y', dir: 1,
    }));
}

export function createFallingBlocks(level: LevelData): FallingBlock[] {
  return (level.fallingBlocks ?? []).map((d) => ({
    x: d.x, y: d.y, baseY: d.y,
    width: d.width, height: d.height,
    state: 'idle' as FallingBlockState,
    warningTimer: 0, vy: 0,
  }));
}

export function createPendulums(level: LevelData): Pendulum[] {
  return (level.pendulums ?? []).map((d) => ({
    x: d.x, y: d.y,
    length: d.length, amplitude: d.amplitude,
    phase: d.phase, speed: d.speed,
    ballRadius: d.ballRadius,
    ballX: d.x, ballY: d.y + d.length,
  }));
}

export function createLiveCoins(level: LevelData): LiveCoin[] {
  return (level.coins || []).map(c => ({ x: c.x, y: c.y, collected: false }));
}
