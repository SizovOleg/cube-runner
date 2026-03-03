import { PlayerProgress, SkinId } from '@levels/types';
import { SKIN_COLORS, UpgradeType } from '@utils/constants';

const STORAGE_KEY = 'cube-runner-progress';

const DEFAULT_OWNED: Record<UpgradeType, number> = {
  magnet: 0, double_jump: 0, armor: 0, super_bullet: 0,
};

const DEFAULT_PROGRESS: PlayerProgress = {
  unlockedLevels: [1, 2, 3, 4, 5],
  bestScores: {},
  totalKills: 0,
  bossesDefeated: [],
  unlockedSkins: ['green'],
  currentSkin: 'green',
  coins: 0,
  ownedUpgrades: { ...DEFAULT_OWNED },
  activeUpgrades: [],
};

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS, unlockedLevels: [...DEFAULT_PROGRESS.unlockedLevels], unlockedSkins: [...DEFAULT_PROGRESS.unlockedSkins] };
    const parsed = JSON.parse(raw) as PlayerProgress;
    // Гарантируем что уровень 1 всегда доступен
    if (!parsed.unlockedLevels.includes(1)) {
      parsed.unlockedLevels.push(1);
    }
    // Миграция: разблокировать все уровни
    for (const lvl of [1, 2, 3, 4, 5]) {
      if (!parsed.unlockedLevels.includes(lvl)) {
        parsed.unlockedLevels.push(lvl);
      }
    }
    // Миграция: старые сохранения без скинов или новые скины
    if (!parsed.unlockedSkins) parsed.unlockedSkins = [];
    if (!parsed.currentSkin) parsed.currentSkin = 'green';
    const ALL_SKINS: SkinId[] = ['green', 'gold', 'blue', 'pink', 'white', 'orange'];
    for (const skin of ALL_SKINS) {
      if (!parsed.unlockedSkins.includes(skin)) parsed.unlockedSkins.push(skin);
    }
    // Миграция: выдать монеты для тестов
    if (!parsed.coins || parsed.coins < 5000) parsed.coins = 5000;
    if (!parsed.ownedUpgrades) parsed.ownedUpgrades = { ...DEFAULT_OWNED };
    if (!parsed.activeUpgrades) parsed.activeUpgrades = [];

    // Миграция: разблокировать все уровни через побежденных боссов
    if (!parsed.bossesDefeated) parsed.bossesDefeated = [];
    for (const boss of [1, 2, 3, 4]) {
      if (!parsed.bossesDefeated.includes(boss)) {
        parsed.bossesDefeated.push(boss);
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      // ignore
    }

    return parsed;
  } catch {
    const ALL_SKINS: SkinId[] = ['green', 'gold', 'blue', 'pink', 'white', 'orange'];
    const defaultData: PlayerProgress = { ...DEFAULT_PROGRESS, unlockedLevels: [1, 2, 3, 4, 5], unlockedSkins: ALL_SKINS, coins: 5000, bossesDefeated: [1, 2, 3, 4] };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    } catch (e) {
      // ignore
    }
    return defaultData;
  }
}

/**
 * Сохраняет текущий баланс монет немедленно (вызывается при сборе каждой монеты).
 * Это гарантирует что монеты не теряются при смерти игрока.
 */
export function saveCoinsImmediate(amount: number): void {
  const progress = loadProgress();
  progress.coins = (progress.coins || 0) + amount;
  saveProgress(progress);
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

/**
 * Разблокирует скин.
 */
export function unlockSkin(skinId: SkinId): void {
  const progress = loadProgress();
  if (!progress.unlockedSkins.includes(skinId)) {
    progress.unlockedSkins.push(skinId);
    saveProgress(progress);
  }
}

/**
 * Устанавливает текущий скин.
 */
export function setCurrentSkin(skinId: SkinId): void {
  const progress = loadProgress();
  progress.currentSkin = skinId;
  saveProgress(progress);
}

/**
 * Возвращает hex-цвет текущего скина.
 */
export function getCurrentSkinColor(): string {
  const progress = loadProgress();
  return SKIN_COLORS[progress.currentSkin] || SKIN_COLORS.green;
}

/** Добавляет монеты к балансу. */
export function addCoins(amount: number): void {
  const progress = loadProgress();
  progress.coins = (progress.coins || 0) + amount;
  saveProgress(progress);
}

/** Покупает апгрейд. Возвращает true если успешно. */
export function buyUpgrade(id: UpgradeType, cost: number): boolean {
  const progress = loadProgress();
  if ((progress.coins || 0) < cost) return false;
  progress.coins -= cost;
  if (!progress.ownedUpgrades) progress.ownedUpgrades = { magnet: 0, double_jump: 0, armor: 0, super_bullet: 0 };
  progress.ownedUpgrades[id] = (progress.ownedUpgrades[id] || 0) + 1;
  saveProgress(progress);
  return true;
}

/** Активирует апгрейд перед уровнем (тратит 1 из купленных). */
export function activateUpgrade(id: UpgradeType): boolean {
  const progress = loadProgress();
  if (!progress.ownedUpgrades || (progress.ownedUpgrades[id] || 0) <= 0) return false;
  progress.ownedUpgrades[id]--;
  if (!progress.activeUpgrades) progress.activeUpgrades = [];
  progress.activeUpgrades.push(id);
  saveProgress(progress);
  return true;
}

/** Деактивирует апгрейд (возвращает обратно). */
export function deactivateUpgrade(id: UpgradeType): void {
  const progress = loadProgress();
  if (!progress.activeUpgrades) return;
  const idx = progress.activeUpgrades.indexOf(id);
  if (idx === -1) return;
  progress.activeUpgrades.splice(idx, 1);
  if (!progress.ownedUpgrades) progress.ownedUpgrades = { magnet: 0, double_jump: 0, armor: 0, super_bullet: 0 };
  progress.ownedUpgrades[id] = (progress.ownedUpgrades[id] || 0) + 1;
  saveProgress(progress);
}

/** Очищает активные апгрейды после начала уровня. */
export function consumeActiveUpgrades(): UpgradeType[] {
  const progress = loadProgress();
  const active = progress.activeUpgrades || [];
  progress.activeUpgrades = [];
  saveProgress(progress);
  return active;
}
