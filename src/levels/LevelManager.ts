import { LevelData, PlayerProgress } from './types';
import level1 from './data/level1';
import level2 from './data/level2';
import { loadProgress, saveProgress } from '@utils/storage';

/**
 * Управляет загрузкой уровней и прогрессом.
 */

const ALL_LEVELS: LevelData[] = [level1, level2];

export class LevelManager {
  private progress: PlayerProgress;

  constructor() {
    this.progress = loadProgress();
  }

  getLevelCount(): number {
    return ALL_LEVELS.length;
  }

  getLevel(id: number): LevelData | null {
    return ALL_LEVELS.find((l) => l.id === id) ?? null;
  }

  isUnlocked(id: number): boolean {
    return this.progress.unlockedLevels.includes(id);
  }

  getProgress(): Readonly<PlayerProgress> {
    return this.progress;
  }

  completeLevel(levelId: number, score: number, kills: number): void {
    // Обновить лучший результат
    if (!this.progress.bestScores[levelId] || score > this.progress.bestScores[levelId]) {
      this.progress.bestScores[levelId] = score;
    }

    // Разблокировать следующий уровень
    const nextId = levelId + 1;
    if (nextId <= ALL_LEVELS.length && !this.progress.unlockedLevels.includes(nextId)) {
      this.progress.unlockedLevels.push(nextId);
    }

    // Обновить статистику
    this.progress.totalKills += kills;
    if (!this.progress.bossesDefeated.includes(levelId)) {
      this.progress.bossesDefeated.push(levelId);
    }

    saveProgress(this.progress);
  }

  resetProgress(): void {
    this.progress = {
      unlockedLevels: [1],
      bestScores: {},
      totalKills: 0,
      bossesDefeated: [],
      unlockedSkins: ['green'],
      currentSkin: 'green',
    };
    saveProgress(this.progress);
  }
}
