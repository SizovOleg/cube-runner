import { PlayerProgress } from '@levels/types';

const STORAGE_KEY = 'cube-runner-progress';

const DEFAULT_PROGRESS: PlayerProgress = {
  unlockedLevels: [1],
  bestScores: {},
  totalKills: 0,
  bossesDefeated: [],
};

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    return JSON.parse(raw) as PlayerProgress;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage может быть недоступен
  }
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
