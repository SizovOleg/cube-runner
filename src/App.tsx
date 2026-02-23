import { useState, useCallback } from 'react';
import { GameScreen, LevelData } from '@levels/types';
import { MenuScreen } from '@ui/MenuScreen';
import { LevelSelectScreen } from '@ui/LevelSelectScreen';
import { ShopScreen } from '@ui/ShopScreen';
import { SkinSelectScreen } from '@ui/SkinSelectScreen';
import { UpgradesScreen } from '@ui/UpgradesScreen';
import level1 from '@levels/data/level1';
import level2 from '@levels/data/level2';
import level3 from '@levels/data/level3';
import level4 from '@levels/data/level4';
import level5 from '@levels/data/level5';
import { getMaxUnlockedLevel } from '@utils/storage';
import { GameCanvas } from './GameCanvas';
import { ScaledContainer } from './ScaledContainer';

// --- Конфиг уровней для экрана выбора ---
const LEVEL_INFO: Array<{ id: number; name: string; bossName: string }> = [
  { id: 1, name: 'Neon City',      bossName: 'Guardian'  },
  { id: 2, name: 'Cyber Sewer',    bossName: 'Crusher'   },
  { id: 3, name: 'Ice Citadel',    bossName: 'Frost King'},
  { id: 4, name: 'Volcanic Forge', bossName: 'Inferno'   },
  { id: 5, name: 'Digital Core',   bossName: 'Core'      },
];

// Карта уровней по ID
const LEVELS: Record<number, LevelData> = {
  1: level1,
  2: level2,
  3: level3,
  4: level4,
  5: level5,
};

const TOTAL_LEVELS = LEVEL_INFO.length;


// --- App ---

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameKey, setGameKey] = useState(0);

  const startLevel = useCallback((levelId: number) => {
    setCurrentLevel(levelId);
    setGameKey((k) => k + 1);
    setScreen('playing');
  }, []);

  const goToMenu = useCallback(() => {
    setScreen('menu');
  }, []);

  const goToLevelSelect = useCallback(() => {
    setScreen('levelSelect');
  }, []);

  const goToSkins = useCallback(() => {
    setScreen('skins');
  }, []);

  const goToShop = useCallback(() => {
    setScreen('shop');
  }, []);

  const goToUpgrades = useCallback(() => {
    setScreen('upgrades');
  }, []);

  const restartLevel = useCallback(() => {
    setGameKey((k) => k + 1);
  }, []);

  const nextLevel = useCallback(() => {
    setCurrentLevel((prev) => {
      const next = prev + 1;
      return next <= TOTAL_LEVELS ? next : prev;
    });
    setGameKey((k) => k + 1);
  }, []);

  // Кнопка "Играть" — запускает последний доступный уровень
  const handlePlay = useCallback(() => {
    const maxLevel = getMaxUnlockedLevel();
    // Не выше максимально существующего
    const targetLevel = Math.min(maxLevel, TOTAL_LEVELS);
    startLevel(targetLevel);
  }, [startLevel]);

  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace',
      }}
    >
      {/* === ГЛАВНОЕ МЕНЮ === */}
      {screen === 'menu' && <ScaledContainer><MenuScreen onPlay={handlePlay} onLevelSelect={goToLevelSelect} onSkins={goToSkins} onShop={goToShop} /></ScaledContainer>}

      {/* === ВЫБОР УРОВНЯ === */}
      {screen === 'levelSelect' && <ScaledContainer><LevelSelectScreen levelInfo={LEVEL_INFO} levels={LEVELS} onStart={startLevel} onBack={goToMenu} onUpgrades={goToUpgrades} /></ScaledContainer>}

      {/* === СКИНЫ === */}
      {screen === 'skins' && <ScaledContainer><SkinSelectScreen onBack={goToMenu} /></ScaledContainer>}

      {/* === МАГАЗИН === */}
      {screen === 'shop' && <ScaledContainer><ShopScreen onBack={goToMenu} /></ScaledContainer>}

      {/* === АПГРЕЙДЫ === */}
      {screen === 'upgrades' && <ScaledContainer><UpgradesScreen onBack={goToLevelSelect} /></ScaledContainer>}

      {/* === ИГРА === */}
      {screen === 'playing' && (
        <ScaledContainer>
          <GameCanvas
            key={gameKey}
            levelId={currentLevel}
            onBack={goToMenu}
            onRestart={restartLevel}
            onNextLevel={currentLevel < TOTAL_LEVELS ? nextLevel : goToMenu}
          />
        </ScaledContainer>
      )}
    </div>
  );
}

