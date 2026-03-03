import { useState, useEffect } from 'react';
import { UPGRADES, UpgradeType } from '@utils/constants';
import { loadProgress, activateUpgrade, deactivateUpgrade } from '@utils/storage';
import { ghostBtnStyle, buyBtnStyle, screenContainerStyle, titleStyle, cardStyle, neonLineStyle, FONT_TITLE, FONT_BODY, NEON_CYAN } from './styles';
import { ScreenBackground } from './ScreenBackground';

export function UpgradesScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());
  const [activateFlash, setActivateFlash] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => { setTimeout(() => setFadeIn(true), 50); }, []);

  const handleActivate = (id: UpgradeType) => {
    activateUpgrade(id);
    setActivateFlash(id);
    setTimeout(() => setActivateFlash(null), 600);
    setProgress(loadProgress());
  };

  const handleDeactivate = (id: UpgradeType) => {
    deactivateUpgrade(id);
    setProgress(loadProgress());
  };

  const activeUpgrades = progress.activeUpgrades ?? [];

  return (
    <div style={{ ...screenContainerStyle(), opacity: fadeIn ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      {/* Animated canvas bg */}
      <ScreenBackground width={800} height={400} accentColor="#aa44ff" intensity={0.7} />

      <div style={{ ...neonLineStyle('#aa44ff'), top: 0 }} />
      <div style={{ ...neonLineStyle('#6644ff'), bottom: 0 }} />

      <div style={{
        ...titleStyle(), fontSize: 28, marginBottom: 6,
        color: '#cc88ff',
        textShadow: '0 0 20px rgba(170,68,255,0.6), 0 0 40px rgba(170,68,255,0.2)',
      }}>
        ⚡ Усиления
      </div>
      <div style={{
        fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 22,
        textAlign: 'center', fontFamily: FONT_BODY, lineHeight: '1.8', zIndex: 1,
      }}>
        Активируй перед началом уровня.<br />
        Активированное усиление будет потрачено.
      </div>

      {/* Upgrade cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 580, zIndex: 1 }}>
        {UPGRADES.map((upg) => {
          const owned = progress.ownedUpgrades?.[upg.id] ?? 0;
          const isActive = activeUpgrades.includes(upg.id);
          const isFlashing = activateFlash === upg.id;

          return (
            <div
              key={upg.id}
              style={{
                ...cardStyle(isActive, upg.color),
                width: 125, padding: '14px 10px',
                transition: 'all 0.3s ease',
                transform: isFlashing ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
                boxShadow: isFlashing
                  ? `0 0 30px ${upg.color}66, 0 0 60px ${upg.color}22`
                  : isActive
                    ? `0 0 20px ${upg.color}33, 0 4px 20px rgba(0,0,0,0.3), inset 0 0 20px ${upg.color}08`
                    : '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div style={{
                fontSize: 36, marginBottom: 6,
                filter: isFlashing ? 'brightness(1.8) drop-shadow(0 0 10px rgba(255,255,255,0.5))' : isActive ? 'brightness(1.2)' : 'none',
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
                fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8,
                fontFamily: FONT_BODY,
              }}>
                В запасе: <span style={{ color: '#fff', fontWeight: 700, textShadow: '0 0 5px rgba(255,255,255,0.3)' }}>{owned}</span>
              </div>

              {isActive ? (
                <button
                  onClick={() => handleDeactivate(upg.id)}
                  style={{
                    padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${NEON_CYAN}`, cursor: 'pointer',
                    background: `${NEON_CYAN}18`, color: NEON_CYAN,
                    fontFamily: FONT_TITLE, letterSpacing: 1,
                    textShadow: `0 0 8px ${NEON_CYAN}66`,
                    boxShadow: `0 0 12px ${NEON_CYAN}33, inset 0 0 10px ${NEON_CYAN}11`,
                  }}
                >
                  ✓ Активно
                </button>
              ) : (
                <button
                  onClick={() => handleActivate(upg.id)}
                  disabled={owned === 0}
                  style={{
                    ...buyBtnStyle(owned > 0),
                    boxShadow: owned > 0
                      ? '0 0 15px rgba(0,204,136,0.5), 0 3px 10px rgba(0,0,0,0.3)'
                      : 'none',
                  }}
                >
                  {owned > 0 ? 'Активировать' : 'Нет'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Active upgrades summary — enhanced glow */}
      {activeUpgrades.length > 0 && (
        <div style={{
          marginTop: 18, padding: '10px 22px',
          background: `${NEON_CYAN}0d`,
          border: `1px solid ${NEON_CYAN}44`, borderRadius: 12,
          fontSize: 12, color: NEON_CYAN, fontFamily: FONT_BODY,
          fontWeight: 600, zIndex: 1,
          boxShadow: `0 0 15px ${NEON_CYAN}22, inset 0 0 10px ${NEON_CYAN}08`,
          textShadow: `0 0 6px ${NEON_CYAN}44`,
        }}>
          Активировано: {activeUpgrades.map((id) => {
            const upg = UPGRADES.find((u) => u.id === id);
            return upg ? `${upg.icon} ${upg.name}` : id;
          }).join(', ')}
        </div>
      )}

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 18, zIndex: 1 }}>
        Назад к уровням
      </button>
    </div>
  );
}
