import { useRef, useEffect, useState } from 'react';
import { COLORS } from '@utils/constants';
import { loadProgress } from '@utils/storage';
import { LevelData } from '@levels/types';
import { ghostBtnStyle, neonBtnStyle, screenContainerStyle, titleStyle, cardStyle, neonLineStyle, FONT_TITLE, FONT_BODY, NEON_CYAN, NEON_GOLD } from './styles';
import { ScreenBackground } from './ScreenBackground';

interface LevelInfo { id: number; name: string; bossName: string; difficulty?: number }

// ──────────── Animated Level Preview ────────────
function LevelPreview({ levelId, levels }: { levelId: number; levels: Record<number, LevelData> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;
    const data = levels[levelId];
    if (!data) return;

    const w = 140, h = 56;
    let running = true;

    const loop = () => {
      if (!running) return;
      frameRef.current++;
      const frame = frameRef.current;

      // Background
      ctx.fillStyle = data.backgroundColor ?? COLORS.bg;
      ctx.fillRect(0, 0, w, h);

      // Animated stars
      for (let i = 0; i < 6; i++) {
        const sx = (i * 23 + frame * 0.3) % w;
        const sy = (i * 9 + 3) % 35;
        ctx.globalAlpha = 0.3 + Math.sin(frame * 0.03 + i) * 0.2;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Ground
      const groundY = 44;
      ctx.fillStyle = data.groundColor ?? COLORS.ground;
      ctx.fillRect(0, groundY, w, h - groundY);

      // Ground line glow
      ctx.strokeStyle = COLORS.groundLine;
      ctx.shadowColor = COLORS.groundLine;
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Animated spikes
      for (let i = 0; i < 4; i++) {
        const sx = 25 + i * 28;
        const pulse = 0.7 + Math.sin(frame * 0.06 + i) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = COLORS.spike;
        ctx.shadowColor = COLORS.spike;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(sx, groundY);
        ctx.lineTo(sx + 3, groundY - 7);
        ctx.lineTo(sx + 6, groundY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Animated cube running
      const cubeX = (frame * 1.5) % (w + 20) - 10;
      ctx.fillStyle = COLORS.cube;
      ctx.shadowColor = COLORS.cube;
      ctx.shadowBlur = 6;
      ctx.fillRect(cubeX, groundY - 8, 7, 7);
      ctx.shadowBlur = 0;

      // Boss
      const bossColors: Record<number, string> = { 1: '#ff0044', 2: '#4a0066', 3: '#00aaff', 4: '#ff6600', 5: '#0066ff' };
      const bossCol = bossColors[levelId] ?? '#ff0044';
      const bossBreath = 1 + Math.sin(frame * 0.04) * 0.1;
      ctx.fillStyle = bossCol;
      ctx.shadowColor = bossCol;
      ctx.shadowBlur = 6;
      const bossSize = 12 * bossBreath;
      ctx.fillRect(w - 20 - (bossSize - 12) / 2, groundY - bossSize, bossSize, bossSize);
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [levelId, levels]);

  return <canvas ref={canvasRef} width={140} height={56} style={{ borderRadius: 10, display: 'block', marginBottom: 6 }} />;
}

// ──────────── Difficulty Stars ────────────
function DifficultyStars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{
          fontSize: 10, color: i < count ? NEON_GOLD : 'rgba(255,255,255,0.15)',
          textShadow: i < count ? '0 0 4px rgba(255,215,0,0.5)' : 'none',
        }}>★</span>
      ))}
    </div>
  );
}

// ──────────── Component ────────────
interface LevelSelectScreenProps {
  levelInfo: LevelInfo[];
  levels: Record<number, LevelData>;
  onStart: (id: number) => void;
  onBack: () => void;
  onUpgrades: () => void;
}

export function LevelSelectScreen({ levelInfo, levels, onStart, onBack, onUpgrades }: LevelSelectScreenProps) {
  const progress = loadProgress();
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => { setTimeout(() => setFadeIn(true), 50); }, []);

  return (
    <div style={{ ...screenContainerStyle(), opacity: fadeIn ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      {/* Animated canvas bg */}
      <ScreenBackground width={800} height={400} accentColor={NEON_CYAN} intensity={0.6} />

      {/* Neon lines */}
      <div style={{ ...neonLineStyle('#00ffcc'), top: 0 }} />
      <div style={{ ...neonLineStyle('#0088ff'), bottom: 0 }} />

      {/* Title */}
      <div style={{
        ...titleStyle(), fontSize: 30, marginBottom: 24,
        color: NEON_CYAN,
        textShadow: `0 0 20px ${NEON_CYAN}88, 0 0 40px ${NEON_CYAN}33`,
      }}>
        🗺️ Выбор уровня
      </div>

      {/* Level cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {levelInfo.map((info) => {
          const bossDefeated = progress.bossesDefeated.includes(info.id);
          const bestScore = progress.bestScores[info.id];
          const isCurrent = !bossDefeated;
          const maxUnlocked = Math.max(...progress.bossesDefeated.map(Number), 0) + 1;
          const isLocked = info.id > maxUnlocked;

          return (
            <button
              key={info.id}
              onClick={() => !isLocked && onStart(info.id)}
              style={{
                ...cardStyle(isCurrent && !isLocked, NEON_CYAN),
                width: 140, height: 210, padding: '8px 8px 12px',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked ? 0.4 : 1,
                position: 'relative',
                fontFamily: FONT_BODY,
                boxShadow: isCurrent && !isLocked
                  ? `0 0 25px ${NEON_CYAN}33, 0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px ${NEON_CYAN}08`
                  : '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <LevelPreview levelId={info.id} levels={levels} />

              {/* Completed star */}
              {bossDefeated && (
                <div style={{
                  position: 'absolute', top: 6, right: 8,
                  fontSize: 18, color: NEON_GOLD,
                  textShadow: '0 0 10px rgba(255,204,0,0.7)',
                  animation: 'starSpin 0.5s ease-out',
                }}>
                  ★
                </div>
              )}

              {/* Level number */}
              <div style={{
                fontSize: 28, fontWeight: 900, color: '#fff',
                fontFamily: FONT_TITLE, marginBottom: 2,
                textShadow: isCurrent ? '0 0 10px rgba(0,255,204,0.5)' : 'none',
              }}>
                {info.id}
              </div>

              {/* Level name */}
              <div style={{
                fontSize: 11, color: NEON_CYAN, marginBottom: 2,
                fontWeight: 700, letterSpacing: 1,
              }}>
                {info.name}
              </div>

              {/* Difficulty */}
              <DifficultyStars count={info.difficulty ?? info.id} />

              {/* Boss name */}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                Boss: {info.bossName}
              </div>

              {/* Best score */}
              {bestScore !== undefined && (
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  Best: {bestScore}
                </div>
              )}

              {/* Lock overlay */}
              {isLocked && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 18,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, color: 'rgba(255,255,255,0.3)',
                }}>
                  🔒
                </div>
              )}

              {/* Active level indicator */}
              {isCurrent && !isLocked && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                  borderRadius: '0 0 18px 18px',
                  background: `linear-gradient(90deg, transparent, ${NEON_CYAN}, transparent)`,
                  boxShadow: `0 0 10px ${NEON_CYAN}`,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
        <button onClick={onUpgrades} style={{
          ...neonBtnStyle(), minWidth: 0, padding: '10px 24px', fontSize: 14, zIndex: 1,
        }}>
          ⚡ Усиления
        </button>
        <button onClick={onBack} style={{ ...ghostBtnStyle(), zIndex: 1 }}>
          Назад
        </button>
      </div>
    </div>
  );
}
