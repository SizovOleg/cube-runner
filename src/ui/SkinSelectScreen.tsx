import { useState, useEffect, useRef } from 'react';
import { SKIN_COLORS, SKIN_NAMES, SkinId } from '@utils/constants';
import { loadProgress, setCurrentSkin } from '@utils/storage';
import { ghostBtnStyle, screenContainerStyle, titleStyle, cardStyle, neonLineStyle, FONT_BODY, NEON_CYAN } from './styles';
import { ScreenBackground } from './ScreenBackground';
import { roundRect } from '@utils/canvasUtils';

const ALL_SKINS: SkinId[] = ['green', 'gold', 'blue', 'pink', 'white', 'orange'];

// ──────────── GD-Quality Animated Cube Preview ────────────
function CubePreview({ color, active }: { color: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    let running = true;
    const size = 42;
    const cx = 50, cy = 50;

    const loop = () => {
      if (!running) return;
      frameRef.current++;
      const f = frameRef.current;

      ctx.clearRect(0, 0, 100, 100);

      // Rotating glow behind (active only)
      if (active) {
        const glowAlpha = 0.12 + Math.sin(f * 0.04) * 0.06;
        ctx.globalAlpha = glowAlpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.save();
      ctx.translate(cx, cy);
      // Slow rotation
      ctx.rotate(Math.sin(f * 0.02) * 0.12);
      // Bob
      ctx.translate(0, Math.sin(f * 0.04) * 2.5);

      const hw = size / 2;

      // ── Dark border ──
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 0.5;
      roundRect(ctx, -hw - 1, -hw - 1, size + 2, size + 2, 5);
      ctx.fill();
      ctx.globalAlpha = 1;

      // ── Body with radial gradient ──
      const bodyGrad = ctx.createRadialGradient(-hw + size * 0.35, -hw + size * 0.3, 0, 0, 0, size * 0.8);
      bodyGrad.addColorStop(0, color);
      bodyGrad.addColorStop(0.6, color);
      bodyGrad.addColorStop(1, color + '88');
      ctx.fillStyle = bodyGrad;
      ctx.shadowColor = color;
      ctx.shadowBlur = active ? 18 : 8;
      roundRect(ctx, -hw, -hw, size, size, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Inner edge shadows ──
      ctx.save();
      roundRect(ctx, -hw, -hw, size, size, 4);
      ctx.clip();
      const innerShadow = ctx.createLinearGradient(-hw, -hw, -hw, -hw + size);
      innerShadow.addColorStop(0, 'rgba(255,255,255,0.15)');
      innerShadow.addColorStop(0.15, 'rgba(255,255,255,0.03)');
      innerShadow.addColorStop(0.85, 'rgba(0,0,0,0.05)');
      innerShadow.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = innerShadow;
      ctx.fillRect(-hw, -hw, size, size);

      // ── Inner chevron pattern ──
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      roundRect(ctx, -hw + 5, -hw + 5, size - 10, size - 10, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-hw + size * 0.2, 0);
      ctx.lineTo(0, -hw + size * 0.2);
      ctx.lineTo(hw - size * 0.2, 0);
      ctx.lineTo(0, hw - size * 0.2);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // ── Specular shine ──
      ctx.globalAlpha = 0.3;
      const specGrad = ctx.createRadialGradient(-hw + 8, -hw + 8, 0, -hw + 8, -hw + 8, size * 0.4);
      specGrad.addColorStop(0, '#ffffff');
      specGrad.addColorStop(0.4, 'rgba(255,255,255,0.1)');
      specGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = specGrad;
      ctx.fillRect(-hw, -hw, size * 0.6, size * 0.6);
      ctx.globalAlpha = 1;

      // ── Top highlight ──
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, -hw + 3, -hw + 2, size - 6, 5, 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // ── Neon border ──
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      roundRect(ctx, -hw, -hw, size, size, 4);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // ── Face: round eyes ──
      const eyeSize = 5;
      const eyeSpacing = 12;
      // Eye whites
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeSpacing / 2, -2, eyeSize / 2 + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpacing / 2, -2, eyeSize / 2 + 1, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      const pupilShift = Math.sin(f * 0.03) * 1;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-eyeSpacing / 2 + pupilShift, -1.5, eyeSize / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpacing / 2 + pupilShift, -1.5, eyeSize / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Pupil glints
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeSpacing / 2 - 1, -3, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpacing / 2 - 1, -3, 1, 0, Math.PI * 2);
      ctx.fill();
      // Smile
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 4, 4, 0.15, Math.PI - 0.15);
      ctx.stroke();

      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [color, active]);

  return <canvas ref={canvasRef} width={100} height={100} style={{ display: 'block' }} />;
}

// ──────────── Component ────────────
export function SkinSelectScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState(() => loadProgress());
  const [fadeIn, setFadeIn] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<SkinId>(progress.currentSkin);

  useEffect(() => { setTimeout(() => setFadeIn(true), 50); }, []);

  const handleSelect = (skinId: SkinId) => {
    if (!progress.unlockedSkins.includes(skinId)) return;
    setSelectedPreview(skinId);
    setCurrentSkin(skinId);
    setProgress(loadProgress());
  };

  return (
    <div style={{ ...screenContainerStyle(), opacity: fadeIn ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      {/* Animated canvas bg */}
      <ScreenBackground width={800} height={400} accentColor="#ff44aa" intensity={0.7} />

      <div style={{ ...neonLineStyle('#ff44aa'), top: 0 }} />
      <div style={{ ...neonLineStyle('#00ffcc'), bottom: 0 }} />

      <div style={{
        ...titleStyle(), fontSize: 30, marginBottom: 16,
        color: '#ff88cc',
        textShadow: '0 0 20px rgba(255,68,170,0.6), 0 0 40px rgba(255,68,170,0.2)',
      }}>
        🎨 Скины
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', zIndex: 1 }}>
        {/* Cube preview — enhanced with GD rendering */}
        <div style={{
          ...cardStyle(true, SKIN_COLORS[selectedPreview]),
          width: 140, height: 160, justifyContent: 'center',
          boxShadow: `0 0 30px ${SKIN_COLORS[selectedPreview]}33, 0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px ${SKIN_COLORS[selectedPreview]}08`,
        }}>
          <CubePreview color={SKIN_COLORS[selectedPreview]} active={true} />
          <div style={{
            fontSize: 14, color: '#fff', fontWeight: 700,
            fontFamily: FONT_BODY, marginTop: 4,
            textShadow: `0 0 10px ${SKIN_COLORS[selectedPreview]}88`,
          }}>
            {SKIN_NAMES[selectedPreview]}
          </div>
        </div>

        {/* Skin grid — enhanced */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 400, justifyContent: 'center' }}>
          {ALL_SKINS.map((skinId) => {
            const unlocked = progress.unlockedSkins.includes(skinId);
            const isActive = progress.currentSkin === skinId;
            const color = SKIN_COLORS[skinId];
            const name = SKIN_NAMES[skinId];

            return (
              <button
                key={skinId}
                onClick={() => handleSelect(skinId)}
                onMouseEnter={() => unlocked && setSelectedPreview(skinId)}
                style={{
                  ...cardStyle(isActive, color),
                  width: 80, height: 105, padding: '8px 6px',
                  cursor: unlocked ? 'pointer' : 'default',
                  opacity: unlocked ? 1 : 0.4,
                  fontFamily: FONT_BODY,
                  boxShadow: isActive
                    ? `0 0 20px ${color}44, 0 4px 16px rgba(0,0,0,0.3), inset 0 0 15px ${color}08`
                    : '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {/* Cube preview (mini) */}
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: unlocked
                    ? `radial-gradient(circle at 35% 30%, ${color}, ${color}88)`
                    : '#333',
                  boxShadow: unlocked ? `0 0 18px ${color}66, inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.15)` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 6, transition: 'box-shadow 0.3s',
                  position: 'relative',
                  border: `1px solid ${unlocked ? color + '44' : '#444'}`,
                }}>
                  {!unlocked && <span style={{ fontSize: 18, color: '#666' }}>🔒</span>}
                  {unlocked && (
                    <div style={{ position: 'relative', width: 22, height: 22 }}>
                      {/* Eyes */}
                      <div style={{ position: 'absolute', left: 2, top: 5, width: 5, height: 5, background: '#fff', borderRadius: '50%' }}>
                        <div style={{ position: 'absolute', left: 1.5, top: 1.5, width: 3, height: 3, background: '#000', borderRadius: '50%' }} />
                      </div>
                      <div style={{ position: 'absolute', right: 2, top: 5, width: 5, height: 5, background: '#fff', borderRadius: '50%' }}>
                        <div style={{ position: 'absolute', left: 1.5, top: 1.5, width: 3, height: 3, background: '#000', borderRadius: '50%' }} />
                      </div>
                      <div style={{ position: 'absolute', left: 5, bottom: 2, width: 12, height: 2, background: '#000', borderRadius: 1 }} />
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: 10, color: unlocked ? '#ddd' : '#555',
                  fontWeight: isActive ? 700 : 400,
                  textShadow: isActive ? `0 0 6px ${color}88` : 'none',
                }}>
                  {name}
                </div>

                {isActive && (
                  <div style={{
                    fontSize: 9, color: NEON_CYAN, marginTop: 2,
                    textShadow: `0 0 8px ${NEON_CYAN}`,
                    fontWeight: 700,
                  }}>✓ active</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={onBack} style={{ ...ghostBtnStyle(), marginTop: 20, zIndex: 1 }}>
        Назад
      </button>
    </div>
  );
}
