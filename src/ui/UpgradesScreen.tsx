import { useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, UPGRADES, UpgradeType } from '@utils/constants';
import { loadProgress, activateUpgrade, deactivateUpgrade } from '@utils/storage';
import { ghostBtnStyle, buyBtnStyle } from './styles';

export function UpgradesScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());

  const handleActivate = (id: UpgradeType) => {
    activateUpgrade(id);
    setProgress(loadProgress());
  };

  const handleDeactivate = (id: UpgradeType) => {
    deactivateUpgrade(id);
    setProgress(loadProgress());
  };

  const activeUpgrades = progress.activeUpgrades ?? [];

  return (
    <div style={{
      width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT,
      background: COLORS.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', borderRadius: 12,
      fontFamily: 'monospace', position: 'relative',
    }}>
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 6,
        textShadow: '0 0 20px rgba(0,255,204,0.4)',
      }}>
        Усиления
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24, textAlign: 'center' }}>
        Активируй перед началом уровня.<br />
        Активированное усиление будет потрачено.
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
        {UPGRADES.map((upg) => {
          const owned = progress.ownedUpgrades?.[upg.id] ?? 0;
          const isActive = activeUpgrades.includes(upg.id);

          return (
            <div
              key={upg.id}
              style={{
                width: 120, borderRadius: 14, padding: '14px 10px',
                border: `1.5px solid ${isActive ? '#00ffcc' : 'rgba(0,255,204,0.3)'}`,
                background: isActive ? 'rgba(0,255,204,0.1)' : 'rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                boxShadow: isActive ? '0 0 18px rgba(0,255,204,0.2)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 4 }}>{upg.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', marginBottom: 4, textAlign: 'center' }}>
                {upg.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                В запасе: <span style={{ color: '#fff', fontWeight: 'bold' }}>{owned}</span>
              </div>

              {isActive ? (
                <button
                  onClick={() => handleDeactivate(upg.id)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 'bold',
                    border: '1px solid #00ffcc', cursor: 'pointer',
                    background: 'transparent', color: '#00ffcc',
                    fontFamily: 'monospace',
                  }}
                >
                  ✓ Активно
                </button>
              ) : (
                <button
                  onClick={() => handleActivate(upg.id)}
                  disabled={owned === 0}
                  style={buyBtnStyle(owned > 0)}
                >
                  {owned > 0 ? 'Активировать' : 'Нет'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activeUpgrades.length > 0 && (
        <div style={{
          marginTop: 20, padding: '8px 16px', background: 'rgba(0,255,204,0.08)',
          border: '1px solid rgba(0,255,204,0.3)', borderRadius: 10, fontSize: 12, color: '#00ffcc',
        }}>
          Активировано: {activeUpgrades.map((id) => {
            const upg = UPGRADES.find((u) => u.id === id);
            return upg ? `${upg.icon} ${upg.name}` : id;
          }).join(', ')}
        </div>
      )}

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 20 }}>
        Назад к уровням
      </button>
    </div>
  );
}
