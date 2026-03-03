import level1 from '@levels/data/level1';
import level2 from '@levels/data/level2';
import level3 from '@levels/data/level3';
import level4 from '@levels/data/level4';
import level5 from '@levels/data/level5';
import { LevelData } from '@levels/types';

/** Info about each level for UI screens */
export const LEVEL_INFO: Array<{ id: number; name: string; bossName: string; difficulty: number }> = [
    { id: 1, name: 'Neon City', bossName: 'Guardian', difficulty: 1 },
    { id: 2, name: 'Cyber Sewer', bossName: 'Crusher', difficulty: 2 },
    { id: 3, name: 'Ice Citadel', bossName: 'Frost King', difficulty: 3 },
    { id: 4, name: 'Volcanic Forge', bossName: 'Inferno', difficulty: 4 },
    { id: 5, name: 'Digital Core', bossName: 'Core', difficulty: 5 },
];

/** All levels data */
export const LEVELS: Record<number, LevelData> = {
    1: level1, 2: level2, 3: level3, 4: level4, 5: level5,
};

export const TOTAL_LEVELS = LEVEL_INFO.length;
