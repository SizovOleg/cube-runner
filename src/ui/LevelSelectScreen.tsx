import { useRef, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '@utils/constants';
import { loadProgress } from '@utils/storage';
import { LevelData } from '@levels/types';
import { ghostBtnStyle } from './styles';

// Карта уровней передаётся снаружи чтобы не создавать цикличный импорт
interface LevelInfo { id: number; name: string; bossName: string }

function LevelPreview({ levelId, levels }: { levelId: number; levels: Record<number, LevelData> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = levels[levelId];
    if (!data) return;

    const w = 120, h = 50;
    ctx.fillStyle = data.backgroundColor ?? COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    const groundY = 40;
    ctx.fillStyle = data.groundColor ?? COLORS.ground;
    ctx.fillRect(0, groundY, w, h - groundY);

    ctx.fillStyle = COLORS.spike;
    for (let i = 0; i < 4; i++) {
      const sx = 25 + i * 25;
      ctx.beginPath();
      ctx.moveTo(sx, groundY);
      ctx.lineTo(sx + 3, groundY - 6);
      ctx.lineTo(sx + 6, groundY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = COLORS.cube;
    ctx.shadowColor = COLORS.cubeGlow;
    ctx.shadowBlur = 4;
    ctx.fillRect(8, groundY - 8, 7, 7);
    ctx.shadowBlur = 0;

    const bossColors: Record<number, string> = { 1: '#ff0044', 2: '#4a0066', 3: '#00aaff', 4: '#ff6600', 5: '#0066ff' };
    ctx.fillStyle = bossColors[levelId] ?? '#ff0044';
    ctx.shadowColor = bossColors[levelId] ?? '#ff0044';
    ctx.shadowBlur = 4;
    ctx.fillRect(100, groundY - 12, 12, 12);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect((i * 17 + 5) % w, (i * 7 + 3) % (groundY - 5), 1, 1);
    }
  }, [levelId, levels]);

  return <canvas ref={canvasRef} width={120} height={50} style={{ borderRadius: 6, display: 'block', marginBottom: 4 }} />;
}

interface LevelSelectScreenProps {
  levelInfo: LevelInfo[];
  levels: Record<number, LevelData>;
  onStart: (id: number) => void;
  onBack: () => void;
  onUpgrades: () => void;
}

export function LevelSelectScreen({ levelInfo, levels, onStart, onBack, onUpgrades }: LevelSelectScreenProps) {
  const progress = loadProgress();

  return (
    <div style={{
      width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT, background: COLORS.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', borderRadius: 12, position: 'relative',
    }}>
      <div style={{
        fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 28,
        textShadow: '0 0 15px rgba(255,255,255,0.2)',
      }}>
        Выбор уровня
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {levelInfo.map((info) => {
          const bossDefeated = progress.bossesDefeated.includes(info.id);
          const bestScore = progress.bestScores[info.id];
          const isCurrent = !bossDefeated;

          return (
            <button
              key={info.id}
              onClick={() => onStart(info.id)}
              style={{
                width: 160, height: 200, borderRadius: 16, padding: '8px 0 0 0',
                border: '1.5px solid #00ffcc',
                background: 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                transition: 'box-shadow 0.2s',
                boxShadow: isCurrent
                  ? '0 0 20px rgba(0,255,204,0.25)'
                  : '0 0 8px rgba(0,255,204,0.08)',
              }}
            >
              <LevelPreview levelId={info.id} levels={levels} />

              {bossDefeated && (
                <div style={{
                  position: 'absolute', top: 8, right: 10,
                  fontSize: 18, color: '#ffcc00',
                  textShadow: '0 0 8px rgba(255,204,0,0.6)',
                }}>
                  &#9733;
                </div>
              )}

              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 4 }}>
                {info.id}
              </div>
              <div style={{ fontSize: 12, color: '#00ffcc', marginBottom: 2 }}>
                {info.name}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                Boss: {info.bossName}
              </div>

              {bestScore !== undefined && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                  Best: {bestScore}
                </div>
              )}

              {isCurrent && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                  background: '#00ffcc', boxShadow: '0 0 8px #00ffcc',
                }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button
          onClick={onUpgrades}
          style={{
            padding: '10px 24px', background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid #00ffcc', borderRadius: 8, color: '#fff',
            cursor: 'pointer', fontFamily: 'monospace', fontSize: 14,
          }}
        >
          ⚡ Усиления
        </button>
        <button onClick={onBack} style={ghostBtnStyle()}>
          Назад
        </button>
      </div>
    </div>
  );
}
