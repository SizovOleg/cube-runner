import { useState, useEffect } from 'react';
import { UPGRADES, UpgradeType } from '@utils/constants';
import { loadProgress, buyUpgrade } from '@utils/storage';
import { ghostBtnStyle, buyBtnStyle, screenContainerStyle, titleStyle, cardStyle, neonLineStyle, statBadgeStyle, FONT_TITLE, FONT_BODY, NEON_GOLD } from './styles';
import { ScreenBackground } from './ScreenBackground';

export function ShopScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());
  const [buyFlash, setBuyFlash] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => { setTimeout(() => setFadeIn(true), 50); }, []);

  const handleBuy = (id: UpgradeType, cost: number) => {
    if (progress.coins < cost) return;
    const ok = buyUpgrade(id, cost);
    if (ok) {
      setBuyFlash(id);
      setTimeout(() => setBuyFlash(null), 600);
      setProgress(loadProgress());
    }
  };

  return (
    <div style={{ ...screenContainerStyle(), opacity: fadeIn ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      {/* Animated canvas bg */}
      <ScreenBackground width={800} height={400} accentColor={NEON_GOLD} intensity={0.8} />

      <div style={{ ...neonLineStyle('#ffd700'), top: 0 }} />
      <div style={{ ...neonLineStyle('#ff8800'), bottom: 0 }} />

      {/* Title with gold theme */}
      <div style={{
        ...titleStyle(), fontSize: 30, marginBottom: 8,
        color: NEON_GOLD,
        textShadow: `0 0 20px ${NEON_GOLD}88, 0 0 40px ${NEON_GOLD}33`,
      }}>
        🏪 Магазин
      </div>

      {/* Coin counter — enhanced */}
      <div style={{
        ...statBadgeStyle(NEON_GOLD), marginBottom: 20,
        background: `${NEON_GOLD}12`,
        boxShadow: `0 0 20px ${NEON_GOLD}22, inset 0 0 15px ${NEON_GOLD}08`,
      }}>
        <span style={{ fontSize: 22 }}>🪙</span>
        <span style={{
          fontSize: 24, fontWeight: 900, color: NEON_GOLD,
          fontFamily: FONT_TITLE,
          textShadow: `0 0 15px ${NEON_GOLD}88`,
          animation: buyFlash ? 'countUp 0.4s ease-out' : 'none',
        }}>
          {progress.coins}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,215,0,0.5)', fontFamily: FONT_BODY }}>монет</span>
      </div>

      {/* Upgrade cards — enhanced with glow */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 580, zIndex: 1 }}>
        {UPGRADES.map((upg) => {
          const owned = progress.ownedUpgrades?.[upg.id] ?? 0;
          const canBuy = progress.coins >= upg.cost;
          const isFlashing = buyFlash === upg.id;

          return (
            <div
              key={upg.id}
              style={{
                ...cardStyle(isFlashing, upg.color),
                width: 125, padding: '14px 10px',
                transition: 'all 0.3s ease',
                transform: isFlashing ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
                boxShadow: isFlashing
                  ? `0 0 30px ${upg.color}66, 0 0 60px ${upg.color}22, 0 8px 25px rgba(0,0,0,0.4)`
                  : `0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)`,
              }}
            >
              <div style={{
                fontSize: 36, marginBottom: 6,
                filter: isFlashing ? 'brightness(1.5) drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none',
                transition: 'filter 0.3s',
              }}>
                {upg.icon}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4,
                textAlign: 'center', fontFamily: FONT_BODY,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}>
                {upg.name}
              </div>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center',
                marginBottom: 8, lineHeight: '1.5', fontFamily: FONT_BODY,
              }}>
                {upg.desc}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontFamily: FONT_BODY }}>
                В запасе: <span style={{ color: '#fff', fontWeight: 700, textShadow: '0 0 5px rgba(255,255,255,0.3)' }}>{owned}</span>
              </div>
              <button
                onClick={() => handleBuy(upg.id, upg.cost)}
                disabled={!canBuy}
                style={{
                  ...buyBtnStyle(canBuy),
                  boxShadow: canBuy
                    ? `0 0 15px rgba(0,204,136,0.6), 0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)`
                    : 'none',
                }}
              >
                <span style={{ color: NEON_GOLD, filter: 'drop-shadow(0 0 3px rgba(255,215,0,0.5))' }}>🪙</span> {upg.cost}
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 24, zIndex: 1 }}>
        Назад
      </button>
    </div>
  );
}
