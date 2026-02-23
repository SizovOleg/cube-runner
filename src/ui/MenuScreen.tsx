import { useRef, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, COLORS, ENTITY_SIZE, JUMP_FORCE } from '@utils/constants';
import { primaryBtnStyle, neonBtnStyle } from './styles';

interface Star { x: number; y: number; size: number; blink: number }

function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * (GROUND_Y - 10),
      size: 0.5 + Math.random() * 1.5,
      blink: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function requestFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
    (el as HTMLElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
  }
}

interface MenuScreenProps {
  onPlay: () => void;
  onLevelSelect: () => void;
  onSkins: () => void;
  onShop: () => void;
}

export function MenuScreen({ onPlay, onLevelSelect, onSkins, onShop }: MenuScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const menuStars = createStars(40);
    const spikes = [200, 420, 580];
    let cubeX = -30;
    let cubeY = GROUND_Y - ENTITY_SIZE;
    let cubeVy = 0;
    let cubeOnGround = true;
    let cubeRotation = 0;
    let frame = 0;
    let running = true;

    const loop = () => {
      if (!running) return;
      frame++;
      const demoSpeed = 2.5;

      cubeX += demoSpeed;
      if (cubeX > CANVAS_WIDTH + 40) cubeX = -40;
      cubeRotation += demoSpeed * 2;

      for (const spikeX of spikes) {
        if (cubeOnGround && cubeX > spikeX - 60 && cubeX < spikeX - 40) {
          cubeVy = JUMP_FORCE;
          cubeOnGround = false;
        }
      }

      cubeVy += 0.45;
      cubeY += cubeVy;
      if (cubeY >= GROUND_Y - ENTITY_SIZE) {
        cubeY = GROUND_Y - ENTITY_SIZE;
        cubeVy = 0;
        cubeOnGround = true;
      }

      // Фон
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#0a1a14');
      bgGrad.addColorStop(0.6, COLORS.bg);
      bgGrad.addColorStop(1, '#000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Параллакс-холмы
      const hillOffset = frame * 0.3;
      ctx.beginPath();
      for (let sx = 0; sx <= CANVAS_WIDTH + 80; sx += 4) {
        const wx = sx + hillOffset;
        const hy = GROUND_Y - 40 - Math.sin(wx * 0.008) * 35 - Math.sin(wx * 0.019 + 1) * 20;
        if (sx === 0) ctx.moveTo(sx, hy); else ctx.lineTo(sx, hy);
      }
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.lineTo(0, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,255,136,0.06)';
      ctx.fill();

      // Звёзды
      for (const star of menuStars) {
        const sx = ((star.x - frame * 0.4) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
        ctx.globalAlpha = 0.25 + Math.sin(star.blink + frame * 0.02) * 0.25;
        ctx.fillStyle = COLORS.star;
        ctx.beginPath();
        ctx.arc(sx, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Земля
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, COLORS.ground);
      groundGrad.addColorStop(1, '#050a08');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Линия земли
      const glowLayers = [
        { w: 5, alpha: 0.12 }, { w: 2, alpha: 0.4 }, { w: 1, alpha: 0.9 },
      ];
      for (const gl of glowLayers) {
        ctx.strokeStyle = COLORS.groundLine;
        ctx.lineWidth = gl.w;
        ctx.globalAlpha = gl.alpha;
        ctx.shadowColor = COLORS.groundLine;
        ctx.shadowBlur = gl.w === 1 ? 6 : 0;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Шипы
      for (const spikeX of spikes) {
        const sGrad = ctx.createLinearGradient(spikeX, GROUND_Y, spikeX + 10, GROUND_Y - 18);
        sGrad.addColorStop(0, COLORS.spike + '99');
        sGrad.addColorStop(1, COLORS.spike);
        ctx.fillStyle = sGrad;
        ctx.shadowColor = COLORS.spike;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(spikeX, GROUND_Y);
        ctx.lineTo(spikeX + 10, GROUND_Y - 18);
        ctx.lineTo(spikeX + 20, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Трейл куба
      for (let ti = 3; ti >= 1; ti--) {
        const t = (4 - ti) / 4;
        ctx.globalAlpha = t * t * 0.18;
        const trailSize = ENTITY_SIZE * (0.4 + t * 0.5);
        const tx = cubeX - ti * demoSpeed * 2.5 + (ENTITY_SIZE - trailSize) / 2;
        const ty = cubeY + (ENTITY_SIZE - trailSize) / 2;
        ctx.fillStyle = COLORS.cube;
        ctx.beginPath();
        type Ctx2D = CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void };
        if ((ctx as Ctx2D).roundRect) {
          (ctx as Ctx2D & { roundRect: (...a: unknown[]) => void }).roundRect(tx, ty, trailSize, trailSize, 3);
        } else {
          ctx.rect(tx, ty, trailSize, trailSize);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Куб-персонаж
      const hw = ENTITY_SIZE / 2;
      const hh = ENTITY_SIZE / 2;
      ctx.save();
      ctx.translate(cubeX + hw, cubeY + hh);
      ctx.rotate((cubeRotation * Math.PI) / 180);
      type Ctx2D = CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void };
      ctx.shadowColor = COLORS.cube;
      ctx.shadowBlur = 25;
      ctx.fillStyle = COLORS.cube + '44';
      if ((ctx as Ctx2D).roundRect) {
        (ctx as Ctx2D & { roundRect: (...a: unknown[]) => void }).roundRect(-hw - 3, -hh - 3, ENTITY_SIZE + 6, ENTITY_SIZE + 6, 6);
      } else { ctx.rect(-hw - 3, -hh - 3, ENTITY_SIZE + 6, ENTITY_SIZE + 6); }
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS.cube;
      if ((ctx as Ctx2D).roundRect) {
        (ctx as Ctx2D & { roundRect: (...a: unknown[]) => void }).roundRect(-hw, -hh, ENTITY_SIZE, ENTITY_SIZE, 4);
      } else { ctx.rect(-hw, -hh, ENTITY_SIZE, ENTITY_SIZE); }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#fff';
      if ((ctx as Ctx2D).roundRect) {
        (ctx as Ctx2D & { roundRect: (...a: unknown[]) => void }).roundRect(-hw + 2, -hh + 2, ENTITY_SIZE - 4, 6, 3);
      } else { ctx.rect(-hw + 2, -hh + 2, ENTITY_SIZE - 4, 6); }
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, -5, 5, 5);
      ctx.fillRect(3, -5, 5, 5);
      ctx.fillRect(-5, 3, 10, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-7, -5, 2, 2);
      ctx.fillRect(4, -5, 2, 2);
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: CANVAS_WIDTH, maxWidth: '100%', height: CANVAS_HEIGHT }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ display: 'block', borderRadius: 12 }}
      />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'monospace',
      }}>
        <button
          onClick={requestFullscreen}
          title="Fullscreen"
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.4)', border: '1px solid #555',
            borderRadius: 6, color: '#888', cursor: 'pointer',
            padding: '4px 8px', fontSize: 18, fontFamily: 'monospace',
            lineHeight: 1,
          }}
        >
          ⛶
        </button>

        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #00ffcc, transparent)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #00ffcc, transparent)',
        }} />

        <div style={{
          fontSize: 44, fontWeight: 'bold', color: '#ffffff',
          textShadow: '0 0 30px rgba(0,255,204,0.6), 0 0 60px rgba(0,255,204,0.2)',
          marginBottom: 4, letterSpacing: 4,
        }}>
          CUBE RUNNER
        </div>
        <div style={{
          fontSize: 15, color: '#00ffcc', marginBottom: 32,
          textShadow: '0 0 10px rgba(0,255,204,0.4)',
          letterSpacing: 4,
        }}>
          BATTLE DASH
        </div>

        <button onClick={onPlay} style={primaryBtnStyle()}>Играть</button>
        <button onClick={onLevelSelect} style={neonBtnStyle()}>Выбор уровня</button>
        <button onClick={onShop} style={neonBtnStyle()}>Магазин</button>
        <button onClick={onSkins} style={neonBtnStyle()}>Скины</button>

        <div style={{
          color: 'rgba(255,255,255,0.3)', marginTop: 20, fontSize: 11,
          textAlign: 'center', lineHeight: '2',
        }}>
          Space/Tap = прыжок &nbsp;|&nbsp; X/Z/Shift = стрельба<br />
          1, 2, 3 = использовать powerup &nbsp;|&nbsp; Esc = пауза
        </div>
      </div>
    </div>
  );
}
