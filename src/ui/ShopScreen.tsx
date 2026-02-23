import { useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, UPGRADES, UpgradeType } from '@utils/constants';
import { loadProgress, buyUpgrade } from '@utils/storage';
import { ghostBtnStyle, buyBtnStyle } from './styles';

export function ShopScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());

  const handleBuy = (id: UpgradeType, cost: number) => {
    const ok = buyUpgrade(id, cost);
    if (ok) setProgress(loadProgress());
  };

  return (
    <div style={{
      width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT,
      background: COLORS.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', borderRadius: 12,
      fontFamily: 'monospace', position: 'relative',
    }}>
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8,
        textShadow: '0 0 20px rgba(0,255,204,0.4)',
      }}>
        Магазин
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28,
        background: 'rgba(255,215,0,0.08)', borderRadius: 20, padding: '6px 18px',
        border: '1px solid rgba(255,215,0,0.3)',
      }}>
        <span style={{ fontSize: 18 }}>🪙</span>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#ffd700' }}>{progress.coins}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,215,0,0.6)' }}>монет</span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
        {UPGRADES.map((upg) => {
          const owned = progress.ownedUpgrades?.[upg.id] ?? 0;
          const canBuy = progress.coins >= upg.cost;

          return (
            <div
              key={upg.id}
              style={{
                width: 120, borderRadius: 14, padding: '14px 10px',
                border: '1.5px solid #00ffcc',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 4 }}>{upg.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', marginBottom: 4, textAlign: 'center' }}>
                {upg.name}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 8, lineHeight: '1.4' }}>
                {upg.desc}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                В запасе: <span style={{ color: '#fff', fontWeight: 'bold' }}>{owned}</span>
              </div>
              <button
                onClick={() => handleBuy(upg.id, upg.cost)}
                disabled={!canBuy}
                style={buyBtnStyle(canBuy)}
              >
                <span style={{ color: '#ffd700' }}>🪙</span> {upg.cost}
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 28 }}>
        Назад
      </button>
    </div>
  );
}
