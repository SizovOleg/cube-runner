import { useState, useCallback, useRef, useEffect } from 'react';
import { GameScreen, ObstacleData } from '@levels/types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, COLORS,
  BASE_SPEED, MAX_SPEED_BONUS, ENTITY_SIZE,
} from '@utils/constants';
import { Player } from '@entities/Player';
import { Camera } from '@engine/Camera';
import { Input } from '@engine/Input';
import { applyGravity, clampToGround, landingCollision, aabbCollision } from '@engine/Physics';
import level1 from '@levels/data/level1';

interface Star {
  x: number;
  y: number;
  size: number;
  blink: number;
}

function createStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH * 4,
      y: Math.random() * (GROUND_Y - 20),
      size: Math.random() * 2 + 1,
      blink: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function neonBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '14px 32px',
    fontSize: 18,
    fontWeight: 'bold',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    color: '#fff',
    background: bg,
    boxShadow: '0 0 20px ' + bg + '80',
    margin: 8,
    fontFamily: 'monospace',
    minWidth: 200,
  };
}

interface DeathInfo {
  score: number;
}

function drawObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: readonly ObstacleData[],
  camera: Camera,
): void {
  for (const obs of obstacles) {
    const ox = camera.worldToScreen(obs.x);
    if (ox < -100 || ox > CANVAS_WIDTH + 100) continue;

    if (obs.type === 'spike') {
      ctx.fillStyle = COLORS.spike;
      ctx.shadowColor = COLORS.spike;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(ox, obs.y + obs.height);
      ctx.lineTo(ox + obs.width / 2, obs.y - 5);
      ctx.lineTo(ox + obs.width, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (obs.type === 'platform') {
      ctx.fillStyle = COLORS.platform;
      ctx.shadowColor = COLORS.platform;
      ctx.shadowBlur = 6;
      ctx.fillRect(ox, obs.y, obs.width, obs.height);
      ctx.shadowBlur = 0;
    }
  }
}

function GameCanvas({ onBack, onRestart }: { onBack: () => void; onRestart: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>(createStars(50));
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const inputRef = useRef<Input | null>(null);
  const [death, setDeath] = useState<DeathInfo | null>(null);

  useEffect(() => {
    if (death) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const input = new Input();
    input.attach();
    inputRef.current = input;

    const player = new Player(100, 3);
    const camera = new Camera();
    const obstacles = level1.obstacles;
    const stars = starsRef.current;
    let running = true;

    const loop = () => {
      if (!running) return;
      frameRef.current++;
      const frame = frameRef.current;
      const inp = input.getState();

      // --- UPDATE ---

      const speed = BASE_SPEED + Math.min(camera.x / 6000, MAX_SPEED_BONUS);
      player.x += speed;

      if (inp.jump && player.onGround) {
        player.jump();
      } else if (inp.jump && !player.onGround) {
        player.fly();
      }

      applyGravity(player);

      // Платформы: one-way landing
      for (const obs of obstacles) {
        if (obs.type !== 'platform') continue;
        if (landingCollision(player, obs)) {
          player.y = obs.y - player.height;
          player.vy = 0;
          player.onGround = true;
        }
      }

      if (clampToGround(player)) {
        player.onGround = true;
      }

      if (player.y < 5) player.y = 5;

      // Шипы: коллизия = урон
      for (const obs of obstacles) {
        if (obs.type !== 'spike') continue;
        const spikeHitbox = {
          x: obs.x + 5,
          y: obs.y + 5,
          width: obs.width - 10,
          height: obs.height - 5,
        };
        if (aabbCollision(player, spikeHitbox)) {
          const died = player.takeDamage(1);
          if (died) {
            setDeath({ score: Math.floor(camera.x / 10) });
            return;
          }
        }
      }

      player.rotation += speed * 2;
      player.update();
      camera.update(player.x);

      // --- RENDER ---

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Звёзды
      for (const star of stars) {
        const sx = ((star.x - camera.x * 0.3) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
        ctx.globalAlpha = 0.3 + Math.sin(star.blink + frame * 0.02) * 0.3;
        ctx.fillStyle = COLORS.star;
        ctx.fillRect(sx, star.y, star.size, star.size);
      }
      ctx.globalAlpha = 1;

      // Земля
      ctx.fillStyle = COLORS.ground;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.strokeStyle = COLORS.groundLine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 25; i++) {
        const lx = ((i * 40 - camera.x) % 1000 + 1000) % 1000;
        if (lx < CANVAS_WIDTH) {
          ctx.beginPath();
          ctx.moveTo(lx, GROUND_Y);
          ctx.lineTo(lx, CANVAS_HEIGHT);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Препятствия
      drawObstacles(ctx, obstacles, camera);

      // Игрок (в экранных координатах)
      const screenX = camera.worldToScreen(player.x);
      const savedX = player.x;
      player.x = screenX;
      player.draw(ctx, frame);
      player.x = savedX;

      // Частицы полёта
      if (inp.jump && !player.onGround) {
        const px = screenX + Math.random() * ENTITY_SIZE;
        const py = player.y + ENTITY_SIZE + Math.random() * 5;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = COLORS.neon;
        ctx.fillRect(px, py, 2 + Math.random() * 3, 2 + Math.random() * 3);
        ctx.globalAlpha = 1;
      }

      // HUD
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 18px monospace';
      ctx.fillText('Score: ' + Math.floor(camera.x / 10), 20, 30);

      ctx.fillText('HP:', 20, 55);
      for (let i = 0; i < player.maxHP; i++) {
        ctx.fillStyle = i < player.hp ? COLORS.cube : '#333';
        ctx.shadowColor = i < player.hp ? COLORS.cubeGlow : 'transparent';
        ctx.shadowBlur = i < player.hp ? 8 : 0;
        ctx.fillRect(70 + i * 22, 42, 16, 16);
      }
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      input.detach();
    };
  }, [death]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    inputRef.current?.setJump(true);
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    inputRef.current?.setJump(false);
  }, []);
  const handleMouseDown = useCallback(() => {
    inputRef.current?.setJump(true);
  }, []);
  const handleMouseUp = useCallback(() => {
    inputRef.current?.setJump(false);
  }, []);

  if (death) {
    return (
      <div
        style={{
          width: CANVAS_WIDTH,
          maxWidth: '100%',
          height: CANVAS_HEIGHT,
          background: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          fontFamily: 'monospace',
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 'bold', color: COLORS.spike, marginBottom: 10 }}>
          Crash!
        </div>
        <div style={{ color: '#fff', fontSize: 20, marginBottom: 25 }}>
          Score: {death.score}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={neonBtnStyle('#00aa66')} onClick={onRestart}>
            Restart
          </button>
          <button style={neonBtnStyle('#3355ff')} onClick={onBack}>
            Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ display: 'block', borderRadius: 12, cursor: 'pointer' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 12px',
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid #666',
          borderRadius: 6,
          color: '#888',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        Меню
      </button>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [_currentLevel, setCurrentLevel] = useState(1);
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

  const restartLevel = useCallback(() => {
    setGameKey((k) => k + 1);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
      }}
    >
      {screen === 'menu' && (
        <div
          style={{
            width: 800,
            maxWidth: '100%',
            height: 400,
            background: '#0a0a2e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: 'bold',
              color: '#00ff88',
              textShadow: '0 0 30px rgba(0,255,136,0.4)',
              marginBottom: 8,
            }}
          >
            CUBE RUNNER
          </div>
          <div style={{ fontSize: 18, color: '#00ffcc', marginBottom: 24 }}>
            Battle Dash
          </div>
          <button
            onClick={() => startLevel(1)}
            style={neonBtnStyle('#00aa66')}
          >
            Играть
          </button>
          <button
            onClick={goToLevelSelect}
            style={neonBtnStyle('#3355ff')}
          >
            Выбор уровня
          </button>
          <div
            style={{
              color: '#8888cc',
              marginTop: 16,
              fontSize: 12,
              textAlign: 'center',
              lineHeight: '2.2',
            }}
          >
            Space/Tap = прыжок | X/Z/Shift = стрельба
            <br />
            1,2,3 = использовать powerup
          </div>
        </div>
      )}

      {screen === 'levelSelect' && (
        <div
          style={{
            width: 800,
            maxWidth: '100%',
            height: 400,
            background: '#0a0a2e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 28, color: '#fff', marginBottom: 24 }}>
            Выбор уровня
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[1, 2].map((id) => (
              <button
                key={id}
                onClick={() => startLevel(id)}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  border: '2px solid #00ffcc',
                  background: 'rgba(0,255,204,0.1)',
                  color: '#fff',
                  fontSize: 24,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                {id}
              </button>
            ))}
          </div>
          <button
            onClick={goToMenu}
            style={{
              marginTop: 24,
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid #666',
              borderRadius: 8,
              color: '#888',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Назад
          </button>
        </div>
      )}

      {screen === 'playing' && (
        <GameCanvas key={gameKey} onBack={goToMenu} onRestart={restartLevel} />
      )}
    </div>
  );
}
