import { useRef, useEffect } from 'react';

// ═══ Animated GD-style canvas background for UI screens ═══
// Renders floating shapes, sparkles, and neon grid behind screen content

interface ScreenBgProps {
    width: number;
    height: number;
    accentColor?: string; // e.g. '#00ffcc', '#ffd700', '#ff44aa'
    intensity?: number; // 0.5 = subtle, 1 = normal, 2 = intense
}

// Pre-generated shapes for each screen instance
function generateShapes(accent: string) {
    const colors = [accent, '#ff44aa', '#00aaff', '#ffd700', '#aa44ff', '#00ff88'];
    return Array.from({ length: 8 }, (_, i) => ({
        x: (i * 110 + Math.random() * 80) % 800,
        y: 15 + Math.random() * 360,
        size: 15 + Math.random() * 50,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,
        sides: [3, 4, 5, 6][Math.floor(Math.random() * 4)],
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.03 + Math.random() * 0.05,
        bobSpeed: 0.003 + Math.random() * 0.005,
        bobPhase: Math.random() * Math.PI * 2,
    }));
}

function generateSparkles() {
    return Array.from({ length: 20 }, () => ({
        x: Math.random() * 800,
        y: Math.random() * 400,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.005 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
    }));
}

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rotation: number) {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
        const a = rotation + (i / sides) * Math.PI * 2;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
}

export function ScreenBackground({ width, height, accentColor = '#00ffcc', intensity = 1 }: ScreenBgProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const shapesRef = useRef(generateShapes(accentColor));
    const sparklesRef = useRef(generateSparkles());
    const frameRef = useRef(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        if (!ctx) return;

        let running = true;

        const render = () => {
            if (!running) return;
            frameRef.current++;
            const f = frameRef.current;

            // Clear
            ctx.clearRect(0, 0, width, height);

            // ── Subtle radial vignette ──
            const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
            vignette.addColorStop(0, 'rgba(10,5,40,0)');
            vignette.addColorStop(0.7, 'rgba(5,5,20,0.3)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);

            // ── Neon grid (very subtle) ──
            const gridSpacing = 60;
            const gridShift = (f * 0.2) % gridSpacing;
            ctx.lineWidth = 0.5;
            for (let x = -gridShift; x < width + gridSpacing; x += gridSpacing) {
                const a = 0.02 + Math.sin(f * 0.01 + x * 0.01) * 0.01;
                ctx.globalAlpha = a * intensity;
                ctx.strokeStyle = accentColor;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSpacing) {
                const a = 0.015 + Math.sin(f * 0.008 + y * 0.015) * 0.008;
                ctx.globalAlpha = a * intensity;
                ctx.strokeStyle = accentColor;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // ── Floating shapes ──
            const shapes = shapesRef.current;
            for (const s of shapes) {
                s.rotation += s.rotSpeed;
                const bobY = Math.sin(f * s.bobSpeed + s.bobPhase) * 10;
                const sy = s.y + bobY;

                ctx.globalAlpha = (s.alpha + Math.sin(f * 0.008 + s.x * 0.01) * 0.015) * intensity;
                ctx.fillStyle = s.color + '22';
                ctx.shadowColor = s.color;
                ctx.shadowBlur = 8;
                drawPolygon(ctx, s.x, sy, s.size, s.sides, s.rotation);
                ctx.fill();

                // Edge glow
                ctx.strokeStyle = s.color + '33';
                ctx.lineWidth = 1;
                drawPolygon(ctx, s.x, sy, s.size, s.sides, s.rotation);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;

            // ── Sparkles ──
            const sparkles = sparklesRef.current;
            for (const sp of sparkles) {
                const brightness = 0.3 + Math.sin(f * sp.speed * 10 + sp.phase) * 0.3;
                if (brightness < 0.1) continue;
                ctx.globalAlpha = brightness * intensity;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // ── Accent color nebula blobs ──
            const nebulaAlpha = 0.03 * intensity;
            ctx.globalAlpha = nebulaAlpha + Math.sin(f * 0.003) * 0.01;
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(width * 0.2, height * 0.3, 80 + Math.sin(f * 0.004) * 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(width * 0.8, height * 0.6, 60 + Math.cos(f * 0.005) * 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);
        return () => { running = false; cancelAnimationFrame(rafRef.current); };
    }, [width, height, accentColor, intensity]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
            }}
        />
    );
}
