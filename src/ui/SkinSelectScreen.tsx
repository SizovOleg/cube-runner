import { useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, SKIN_COLORS, SKIN_NAMES, SkinId } from '@utils/constants';
import { loadProgress, setCurrentSkin } from '@utils/storage';
import { ghostBtnStyle } from './styles';

const ALL_SKINS: SkinId[] = ['green', 'gold', 'blue', 'pink', 'white', 'orange'];

export function SkinSelectScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());

  const handleSelect = (skinId: SkinId) => {
    if (!progress.unlockedSkins.includes(skinId)) return;
    setCurrentSkin(skinId);
    setProgress(loadProgress());
  };

  return (
    <div style={{
      width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT,
      background: COLORS.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', borderRadius: 12,
      fontFamily: 'monospace', position: 'relative',
    }}>
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24,
        textShadow: '0 0 15px rgba(255,255,255,0.2)',
      }}>
        Скины
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 500 }}>
        {ALL_SKINS.map((skinId) => {
          const unlocked = progress.unlockedSkins.includes(skinId);
          const isActive = progress.currentSkin === skinId;
          const color = SKIN_COLORS[skinId];
          const name = SKIN_NAMES[skinId];

          return (
            <button
              key={skinId}
              onClick={() => handleSelect(skinId)}
              style={{
                width: 80, height: 100, borderRadius: 12, padding: 0,
                border: isActive ? '2px solid #00ffcc' : unlocked ? '2px solid #555' : '2px solid #333',
                background: isActive ? 'rgba(0,255,204,0.08)' : 'rgba(30,30,30,0.5)',
                cursor: unlocked ? 'pointer' : 'default',
                fontFamily: 'monospace',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 0 15px rgba(0,255,204,0.3)' : 'none',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 4,
                background: unlocked ? color : '#444',
                boxShadow: unlocked ? `0 0 12px ${color}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6,
              }}>
                {!unlocked && <span style={{ fontSize: 16, color: '#666' }}>&#128274;</span>}
                {unlocked && (
                  <div style={{ position: 'relative', width: 20, height: 20 }}>
                    <div style={{ position: 'absolute', left: 2, top: 4, width: 4, height: 4, background: '#000', borderRadius: 1 }} />
                    <div style={{ position: 'absolute', right: 2, top: 4, width: 4, height: 4, background: '#000', borderRadius: 1 }} />
                    <div style={{ position: 'absolute', left: 4, bottom: 3, width: 12, height: 2, background: '#000', borderRadius: 1 }} />
                  </div>
                )}
              </div>

              <div style={{ fontSize: 10, color: unlocked ? '#ccc' : '#555', fontWeight: isActive ? 'bold' : 'normal' }}>
                {name}
              </div>

              {isActive && (
                <div style={{ fontSize: 8, color: '#00ffcc', marginTop: 2 }}>&#9679;</div>
              )}
            </button>
          );
        })}
      </div>

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 24 }}>
        Назад
      </button>
    </div>
  );
}
