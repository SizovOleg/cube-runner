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
    if (!raw) return { ...DEFAULT_PROGRESS, unlockedLevels: [...DEFAULT_PROGRESS.unlockedLevels] };
    const parsed = JSON.parse(raw) as PlayerProgress;
    // Гарантируем что уровень 1 всегда доступен
    if (!parsed.unlockedLevels.includes(1)) {
      parsed.unlockedLevels.push(1);
    }
    return parsed;
  } catch {
    return { ...DEFAULT_PROGRESS, unlockedLevels: [...DEFAULT_PROGRESS.unlockedLevels] };
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

/**
 * Сохраняет результат прохождения уровня.
 * Разблокирует следующий уровень, обновляет лучший Score, добавляет босса в побеждённых.
 */
export function saveLevelComplete(levelId: number, score: number, kills: number): void {
  const progress = loadProgress();

  // Разблокировать следующий уровень
  const nextLevel = levelId + 1;
  if (!progress.unlockedLevels.includes(nextLevel)) {
    progress.unlockedLevels.push(nextLevel);
  }

  // Лучший Score
  if (!progress.bestScores[levelId] || score > progress.bestScores[levelId]) {
    progress.bestScores[levelId] = score;
  }

  // Общие kills
  progress.totalKills += kills;

  // Босс побеждён
  if (!progress.bossesDefeated.includes(levelId)) {
    progress.bossesDefeated.push(levelId);
  }

  saveProgress(progress);
}

/**
 * Возвращает максимальный доступный уровень.
 */
export function getMaxUnlockedLevel(): number {
  const progress = loadProgress();
  return Math.max(...progress.unlockedLevels);
}
