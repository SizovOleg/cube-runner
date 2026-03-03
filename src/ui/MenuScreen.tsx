import { useRef, useEffect, useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, COLORS, ENTITY_SIZE, JUMP_FORCE } from '@utils/constants';
import { primaryBtnStyle, neonBtnStyle, screenContainerStyle, neonLineStyle, FONT_TITLE, FONT_BODY, NEON_CYAN } from './styles';
import { loadProgress } from '@utils/storage';

// ═══════════════════════════════════════════
//  Enhanced Menu — Concept-quality visuals
// ═══════════════════════════════════════════

// ──────────── Types ────────────
interface Star { x: number; y: number; size: number; blink: number; speed: number; color: string }
interface BigShape {
  x: number; y: number; size: number; rotation: number; rotSpeed: number;
  driftX: number; driftY: number; sides: number; color: string;
  glowColor: string; alpha: number; depth: number; bobPhase: number;
}
interface Sparkle { x: number; y: number; life: number; maxLife: number; size: number; color: string }
interface Crystal { x: number; y: number; w: number; h: number; color: string; glowColor: string; alpha: number }

// ──────────── Factories ────────────
function createStars(count: number): Star[] {
  const colors = ['#00ffcc', '#ffffff', '#ff44aa', '#44aaff', '#ffdd44', '#aa88ff'];
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * (GROUND_Y + 20),
    size: 0.5 + Math.random() * 2.5,
    blink: Math.random() * Math.PI * 2,
    speed: 0.1 + Math.random() * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

function createBigShapes(): BigShape[] {
  const shapes: BigShape[] = [
    // Large prominent triangles (like concept art)
    { x: 680, y: 160, size: 80, rotation: 0.3, rotSpeed: 0.003, driftX: -0.15, driftY: 0.08, sides: 3, color: 'rgba(255,68,170,0.35)', glowColor: '#ff44aa', alpha: 0.35, depth: 0.7, bobPhase: 0 },
    { x: 120, y: 220, size: 55, rotation: 1.5, rotSpeed: -0.004, driftX: 0.1, driftY: -0.06, sides: 3, color: 'rgba(170,68,255,0.3)', glowColor: '#aa44ff', alpha: 0.3, depth: 0.5, bobPhase: 1.5 },
    { x: 750, y: 290, size: 45, rotation: 0.8, rotSpeed: 0.005, driftX: -0.08, driftY: 0.05, sides: 3, color: 'rgba(255,100,50,0.25)', glowColor: '#ff6644', alpha: 0.25, depth: 0.4, bobPhase: 3 },
    // Hexagons
    { x: 60, y: 100, size: 35, rotation: 0, rotSpeed: 0.004, driftX: 0.12, driftY: 0.04, sides: 6, color: 'rgba(0,180,255,0.3)', glowColor: '#00bbff', alpha: 0.3, depth: 0.6, bobPhase: 0.8 },
    { x: 530, y: 60, size: 25, rotation: 0.5, rotSpeed: -0.006, driftX: -0.05, driftY: 0.07, sides: 6, color: 'rgba(0,255,204,0.25)', glowColor: '#00ffcc', alpha: 0.25, depth: 0.3, bobPhase: 2.5 },
    { x: 380, y: 300, size: 20, rotation: 1.2, rotSpeed: 0.007, driftX: 0.08, driftY: -0.03, sides: 6, color: 'rgba(0,200,255,0.2)', glowColor: '#00ccff', alpha: 0.2, depth: 0.3, bobPhase: 4 },
    // Pentagons
    { x: 280, y: 80, size: 30, rotation: 2.1, rotSpeed: -0.003, driftX: -0.06, driftY: 0.05, sides: 5, color: 'rgba(255,215,0,0.2)', glowColor: '#ffdd00', alpha: 0.2, depth: 0.4, bobPhase: 1 },
    // Diamonds (4-sided)
    { x: 700, y: 80, size: 28, rotation: 0.785, rotSpeed: 0.005, driftX: -0.1, driftY: 0.03, sides: 4, color: 'rgba(136,100,255,0.25)', glowColor: '#8866ff', alpha: 0.25, depth: 0.5, bobPhase: 2 },
    { x: 170, y: 320, size: 22, rotation: 0.4, rotSpeed: -0.008, driftX: 0.07, driftY: -0.04, sides: 4, color: 'rgba(255,100,200,0.2)', glowColor: '#ff66cc', alpha: 0.2, depth: 0.3, bobPhase: 3.5 },
    // Small accent shapes
    { x: 450, y: 35, size: 14, rotation: 0, rotSpeed: 0.01, driftX: -0.04, driftY: 0.02, sides: 3, color: 'rgba(0,255,150,0.2)', glowColor: '#00ff99', alpha: 0.2, depth: 0.2, bobPhase: 4.5 },
    { x: 620, y: 240, size: 16, rotation: 1, rotSpeed: -0.009, driftX: 0.05, driftY: -0.06, sides: 5, color: 'rgba(255,180,0,0.18)', glowColor: '#ffbb00', alpha: 0.18, depth: 0.25, bobPhase: 5 },
  ];
  return shapes;
}

function createCrystals(): Crystal[] {
  return [
    // Bottom-left crystals
    { x: 10, y: GROUND_Y - 50, w: 25, h: 55, color: 'rgba(100,50,200,0.5)', glowColor: '#6644cc', alpha: 0.5 },
    { x: 30, y: GROUND_Y - 35, w: 18, h: 40, color: 'rgba(140,80,220,0.4)', glowColor: '#8855dd', alpha: 0.4 },
    { x: 55, y: GROUND_Y - 25, w: 14, h: 30, color: 'rgba(80,40,180,0.35)', glowColor: '#5533bb', alpha: 0.35 },
    // Bottom-right crystals
    { x: CANVAS_WIDTH - 50, y: GROUND_Y - 45, w: 22, h: 50, color: 'rgba(50,100,200,0.45)', glowColor: '#3366cc', alpha: 0.45 },
    { x: CANVAS_WIDTH - 30, y: GROUND_Y - 30, w: 16, h: 35, color: 'rgba(80,130,220,0.4)', glowColor: '#5588dd', alpha: 0.4 },
    { x: CANVAS_WIDTH - 70, y: GROUND_Y - 20, w: 12, h: 25, color: 'rgba(60,80,180,0.3)', glowColor: '#4455bb', alpha: 0.3 },
  ];
}

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rotation: number) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Draw perspective grid
function drawPerspectiveGrid(ctx: CanvasRenderingContext2D, frame: number) {
  const vanishX = CANVAS_WIDTH / 2;
  const vanishY = GROUND_Y - 80;
  const gridBottom = CANVAS_HEIGHT;
  const lineCount = 16;
  const hLineCount = 8;
  const animOffset = (frame * 1.5) % 30;

  // Converging vertical lines
  for (let i = -lineCount; i <= lineCount; i++) {
    const bottomX = vanishX + i * 55;
    const t = Math.abs(i) / lineCount;
    const alpha = 0.12 - t * 0.06;
    if (alpha <= 0) continue;

    const pulse = 0.7 + Math.sin(frame * 0.02 + i * 0.5) * 0.3;
    ctx.strokeStyle = `rgba(170,100,255,${alpha * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vanishX, vanishY + 30);
    ctx.lineTo(bottomX, gridBottom);
    ctx.stroke();
  }

  // Horizontal lines with perspective spacing
  for (let i = 0; i < hLineCount; i++) {
    const raw = i + animOffset / 30;
    const t = raw / hLineCount;
    const y = vanishY + 30 + (gridBottom - vanishY - 30) * t * t;
    const alpha = 0.06 + t * 0.08;
    const pulse = 0.8 + Math.sin(frame * 0.015 + i) * 0.2;

    ctx.strokeStyle = `rgba(170,100,255,${alpha * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Center glow on floor
  const floorGlow = ctx.createRadialGradient(vanishX, GROUND_Y + 20, 0, vanishX, GROUND_Y + 20, 250);
  floorGlow.addColorStop(0, 'rgba(170,80,255,0.08)');
  floorGlow.addColorStop(0.5, 'rgba(100,40,200,0.03)');
  floorGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, GROUND_Y - 20, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y + 40);
}

function requestFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
    (el as HTMLElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
  }
}

// ──────────── Component ────────────
interface MenuScreenProps {
  onPlay: () => void;
  onLevelSelect: () => void;
  onSkins: () => void;
  onShop: () => void;
}

export function MenuScreen({ onPlay, onLevelSelect, onSkins, onShop }: MenuScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [fadeIn, setFadeIn] = useState(false);

  const progress = loadProgress();
  const levelsCleared = progress.bossesDefeated?.length ?? 0;
  const totalKills = progress.totalKills ?? 0;

  useEffect(() => { setTimeout(() => setFadeIn(true), 50); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    const stars = createStars(100);
    const bigShapes = createBigShapes();
    const crystals = createCrystals();
    const sparkles: Sparkle[] = [];
    const spikes = [200, 420, 580];
    let cubeX = -30;
    let cubeY = GROUND_Y - ENTITY_SIZE;
    let cubeVy = 0;
    let cubeOnGround = true;
    let frame = 0;
    let running = true;

    // Rainbow trail
    const trail: Array<{ x: number; y: number; hue: number }> = [];

    // Cache background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0a0020');
    bgGrad.addColorStop(0.3, '#120030');
    bgGrad.addColorStop(0.5, '#1a0044');
    bgGrad.addColorStop(0.7, '#0d0028');
    bgGrad.addColorStop(1, '#080015');

    const loop = () => {
      if (!running) return;
      frame++;
      const demoSpeed = 2.2;

      // --- Update ---
      cubeX += demoSpeed;
      if (cubeX > CANVAS_WIDTH + 40) cubeX = -40;

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

      // Rainbow trail
      trail.push({ x: cubeX, y: cubeY, hue: (frame * 3) % 360 });
      if (trail.length > 20) trail.shift();

      // Spawn sparkles periodically
      if (frame % 3 === 0) {
        sparkles.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * GROUND_Y,
          life: 0,
          maxLife: 40 + Math.random() * 40,
          size: 1 + Math.random() * 2.5,
          color: ['#00ffcc', '#ff44aa', '#ffdd44', '#44aaff', '#aa88ff'][Math.floor(Math.random() * 5)],
        });
      }
      // Update sparkles
      for (let i = sparkles.length - 1; i >= 0; i--) {
        sparkles[i].life++;
        if (sparkles[i].life >= sparkles[i].maxLife) sparkles.splice(i, 1);
      }

      // ──── RENDER ────

      // Rich gradient background
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Nebula glows (big colorful blobs)
      const nebulae = [
        { x: 150, y: 120, r: 180, color: 'rgba(255,0,120,0.06)', phase: 0 },
        { x: 650, y: 180, r: 200, color: 'rgba(100,0,255,0.05)', phase: 1.5 },
        { x: 400, y: 80, r: 150, color: 'rgba(0,100,255,0.04)', phase: 3 },
        { x: 750, y: 100, r: 120, color: 'rgba(0,255,200,0.03)', phase: 4.5 },
      ];
      for (const neb of nebulae) {
        const pulseR = neb.r + Math.sin(frame * 0.008 + neb.phase) * 30;
        const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, pulseR);
        grad.addColorStop(0, neb.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(neb.x, neb.y, pulseR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle background grid (upper area)
      ctx.strokeStyle = 'rgba(100,60,200,0.04)';
      ctx.lineWidth = 1;
      const gridOff = (frame * 0.3) % 60;
      for (let gx = -gridOff; gx < CANVAS_WIDTH; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, GROUND_Y - 50); ctx.stroke();
      }
      for (let gy = 0; gy < GROUND_Y - 50; gy += 60) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CANVAS_WIDTH, gy); ctx.stroke();
      }

      // Big floating geometric shapes (concept-style)
      for (const shape of bigShapes) {
        shape.rotation += shape.rotSpeed;
        const bobY = Math.sin(frame * 0.012 + shape.bobPhase) * 12;
        const sx = shape.x + Math.sin(frame * 0.005 + shape.bobPhase) * 8;
        const sy = shape.y + bobY;

        // Outer glow
        ctx.save();
        ctx.shadowColor = shape.glowColor;
        ctx.shadowBlur = 25 + Math.sin(frame * 0.02 + shape.bobPhase) * 8;

        // Fill with semi-transparent color
        ctx.globalAlpha = shape.alpha + Math.sin(frame * 0.015 + shape.bobPhase) * 0.08;
        ctx.fillStyle = shape.color;
        drawPolygon(ctx, sx, sy, shape.size, shape.sides, shape.rotation);
        ctx.fill();

        // Bright edge
        ctx.strokeStyle = shape.glowColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + Math.sin(frame * 0.02 + shape.bobPhase) * 0.15;
        drawPolygon(ctx, sx, sy, shape.size, shape.sides, shape.rotation);
        ctx.stroke();

        // Inner lighter shape
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = shape.glowColor;
        drawPolygon(ctx, sx, sy, shape.size * 0.5, shape.sides, shape.rotation + 0.2);
        ctx.fill();

        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Stars with twinkle and color
      for (const star of stars) {
        const sx = ((star.x - frame * star.speed * 0.5) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
        const alpha = 0.3 + Math.sin(star.blink + frame * 0.03) * 0.4;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(sx, star.y, star.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Glow halo for bigger stars
        if (star.size > 1.5) {
          ctx.globalAlpha = alpha * 0.25;
          ctx.beginPath();
          ctx.arc(sx, star.y, star.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Sparkles (bright twinkling dots)
      for (const sp of sparkles) {
        const lifeRatio = sp.life / sp.maxLife;
        const fadeAlpha = lifeRatio < 0.2 ? lifeRatio / 0.2 : lifeRatio > 0.7 ? (1 - lifeRatio) / 0.3 : 1;
        const pulseSize = sp.size * (0.7 + Math.sin(sp.life * 0.3) * 0.3);

        ctx.globalAlpha = fadeAlpha * 0.8;
        ctx.fillStyle = sp.color;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 6;

        // Cross sparkle shape
        ctx.fillRect(sp.x - pulseSize * 2, sp.y - 0.5, pulseSize * 4, 1);
        ctx.fillRect(sp.x - 0.5, sp.y - pulseSize * 2, 1, pulseSize * 4);
        // Center dot
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, pulseSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Crystal formations at bottom edges
      for (const cr of crystals) {
        const shimmer = 0.8 + Math.sin(frame * 0.03 + cr.x * 0.1) * 0.2;
        ctx.globalAlpha = cr.alpha * shimmer;
        ctx.fillStyle = cr.color;
        ctx.shadowColor = cr.glowColor;
        ctx.shadowBlur = 12;
        // Diamond/crystal shape
        ctx.beginPath();
        ctx.moveTo(cr.x + cr.w / 2, cr.y - cr.h);
        ctx.lineTo(cr.x + cr.w, cr.y);
        ctx.lineTo(cr.x + cr.w / 2, cr.y + 5);
        ctx.lineTo(cr.x, cr.y);
        ctx.closePath();
        ctx.fill();
        // Highlight edge
        ctx.globalAlpha = 0.3 * shimmer;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cr.x + cr.w / 2, cr.y - cr.h);
        ctx.lineTo(cr.x + cr.w, cr.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Ground with rich gradient
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, '#1a0844');
      groundGrad.addColorStop(0.5, '#0d0428');
      groundGrad.addColorStop(1, '#060215');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Perspective grid on floor
      drawPerspectiveGrid(ctx, frame);

      // Multi-layer ground glow line
      const glowColorsArr = ['rgba(0,255,204,', 'rgba(255,68,170,', 'rgba(100,80,255,'];
      for (let layer = 0; layer < 3; layer++) {
        void (frame * 2 + layer * CANVAS_WIDTH / 3); // timing reference
        const grd = ctx.createLinearGradient(0, GROUND_Y, CANVAS_WIDTH, GROUND_Y);
        grd.addColorStop(0, glowColorsArr[layer] + '0.1)');
        grd.addColorStop(0.3, glowColorsArr[(layer + 1) % 3] + '0.5)');
        grd.addColorStop(0.6, glowColorsArr[(layer + 2) % 3] + '0.5)');
        grd.addColorStop(1, glowColorsArr[layer] + '0.1)');
        ctx.strokeStyle = grd;
        ctx.lineWidth = 2.5 - layer * 0.5;
        ctx.globalAlpha = 0.6;
        ctx.shadowColor = glowColorsArr[layer] + '0.6)';
        ctx.shadowBlur = 10 - layer * 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y + layer);
        ctx.lineTo(CANVAS_WIDTH, GROUND_Y + layer);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Spikes with rich glow
      for (const spikeX of spikes) {
        const pulseAlpha = 0.7 + Math.sin(frame * 0.08 + spikeX * 0.01) * 0.3;
        // Glow underneath
        ctx.globalAlpha = pulseAlpha * 0.5;
        const radGlow = ctx.createRadialGradient(spikeX + 10, GROUND_Y, 0, spikeX + 10, GROUND_Y, 30);
        radGlow.addColorStop(0, COLORS.spike + '88');
        radGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGlow;
        ctx.fillRect(spikeX - 20, GROUND_Y - 30, 60, 40);

        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = COLORS.spike;
        ctx.shadowColor = COLORS.spike;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(spikeX, GROUND_Y);
        ctx.lineTo(spikeX + 10, GROUND_Y - 22);
        ctx.lineTo(spikeX + 20, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // Rainbow neon trail behind cube
      for (let i = 0; i < trail.length - 1; i++) {
        const t = trail[i];
        const progress = (i + 1) / trail.length;
        const size = ENTITY_SIZE * (0.15 + progress * 0.5);
        ctx.globalAlpha = progress * progress * 0.4;
        const trailColor = `hsl(${t.hue}, 100%, 60%)`;
        ctx.fillStyle = trailColor;
        ctx.shadowColor = trailColor;
        ctx.shadowBlur = 12;
        ctx.fillRect(
          t.x + (ENTITY_SIZE - size) / 2,
          t.y + (ENTITY_SIZE - size) / 2,
          size, size,
        );
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Cube character (bigger glow)
      const hw = ENTITY_SIZE / 2;
      const hh = ENTITY_SIZE / 2;
      ctx.save();
      ctx.translate(cubeX + hw, cubeY + hh);

      // Strong outer glow
      ctx.shadowColor = COLORS.cube;
      ctx.shadowBlur = 40;
      ctx.fillStyle = COLORS.cube + '55';
      ctx.fillRect(-hw - 6, -hh - 6, ENTITY_SIZE + 12, ENTITY_SIZE + 12);

      // Body
      ctx.shadowBlur = 20;
      ctx.fillStyle = COLORS.cube;
      ctx.fillRect(-hw, -hh, ENTITY_SIZE, ENTITY_SIZE);
      ctx.shadowBlur = 0;

      // Highlight
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-hw + 2, -hh + 2, ENTITY_SIZE - 4, 8);
      ctx.globalAlpha = 1;

      // Face
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, -5, 5, 5);
      ctx.fillRect(3, -5, 5, 5);
      ctx.fillRect(-5, 3, 10, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-7, -5, 2, 2);
      ctx.fillRect(4, -5, 2, 2);
      ctx.restore();

      // Overall atmospheric pulse
      const pulse = Math.sin(frame * (Math.PI / 90)) * 0.5 + 0.5;
      ctx.globalAlpha = pulse * 0.02;
      ctx.fillStyle = '#ff44aa';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2);
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div style={{ ...screenContainerStyle(), opacity: fadeIn ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ position: 'absolute', top: 0, left: 0, borderRadius: 16 }}
      />
      {/* Neon lines */}
      <div style={{ ...neonLineStyle('#ff44aa'), top: 0 }} />
      <div style={{ ...neonLineStyle('#00ffcc'), bottom: 0 }} />

      {/* Content overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', zIndex: 2,
      }}>
        {/* Fullscreen */}
        <button
          onClick={requestFullscreen}
          title="Fullscreen"
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            padding: '5px 10px', fontSize: 18, fontFamily: 'monospace',
            lineHeight: 1, backdropFilter: 'blur(4px)',
          }}
        >
          ⛶
        </button>

        {/* Title */}
        <div style={{
          fontSize: 52, fontWeight: 900, color: '#ffffff',
          fontFamily: FONT_TITLE, letterSpacing: 8,
          textShadow: '0 0 30px rgba(0,255,204,0.6), 0 0 60px rgba(0,255,204,0.3), 0 0 100px rgba(0,255,204,0.1)',
          animation: 'neonPulse 3s ease-in-out infinite',
          marginBottom: 4,
        }}>
          CUBE RUNNER
        </div>
        <div style={{
          fontSize: 18, color: NEON_CYAN,
          fontFamily: FONT_BODY, fontWeight: 700,
          letterSpacing: 8,
          textShadow: '0 0 20px rgba(0,255,204,0.6), 0 0 40px rgba(0,255,204,0.2)',
          marginBottom: 32,
        }}>
          BATTLE DASH
        </div>

        {/* Buttons */}
        <button onClick={onPlay} style={primaryBtnStyle()}>▶ Играть</button>
        <button onClick={onLevelSelect} style={neonBtnStyle()}>Выбор уровня</button>
        <div style={{ display: 'flex', gap: 0 }}>
          <button onClick={onShop} style={{ ...neonBtnStyle(), minWidth: 140, padding: '12px 20px', fontSize: 15 }}>🪙 Магазин</button>
          <button onClick={onSkins} style={{ ...neonBtnStyle(), minWidth: 140, padding: '12px 20px', fontSize: 15 }}>🎨 Скины</button>
        </div>

        {/* Controls + stats */}
        <div style={{
          position: 'absolute', bottom: 12, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          padding: '0 18px',
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.25)', fontSize: 10,
            fontFamily: FONT_BODY, lineHeight: '1.8',
          }}>
            Space/Tap = прыжок &nbsp;|&nbsp; X/Z = стрельба<br />
            1, 2, 3 = powerup &nbsp;|&nbsp; Esc = пауза
          </div>
          {(levelsCleared > 0 || totalKills > 0) && (
            <div style={{
              color: 'rgba(255,255,255,0.2)', fontSize: 10,
              fontFamily: FONT_BODY, textAlign: 'right',
            }}>
              Уровней: {levelsCleared}/5 &nbsp;|&nbsp; Убийств: {totalKills}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
