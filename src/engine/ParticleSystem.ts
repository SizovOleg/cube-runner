/**
 * Enhanced Particle System v2.0
 * Взрывы, трейлы, confetti, shockwave, sparkle, screen flash
 */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type?: 'square' | 'circle' | 'star' | 'confetti';
  rotation?: number;
  rotSpeed?: number;
  gravity?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private _screenFlashAlpha = 0;
  private _screenFlashColor = '#fff';

  /** Standard explosion burst */
  burst(x: number, y: number, color: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2.5 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        color,
        size: 3 + Math.random() * 4,
        type: Math.random() > 0.5 ? 'circle' : 'square',
      });
    }
  }

  /** Trail particle (for player movement) */
  trail(x: number, y: number, color: string, size = 4, life = 15): void {
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life, maxLife: life,
      color, size,
      type: 'circle',
    });
  }

  /** Big explosion (bombs, boss hits) */
  bigBurst(x: number, y: number): void {
    const colors = ['#ff8800', '#ffcc00', '#ff4400', '#ffff00', '#ff6600'];
    for (let i = 0; i < 25; i++) {
      const angle = (Math.random()) * Math.PI * 2;
      const speed = 3 + Math.random() * 10;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 25,
        maxLife: 55,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 7,
        type: Math.random() > 0.3 ? 'circle' : 'star',
      });
    }
    this.screenFlash('#ff880044', 8);
  }

  /** Jump dust particles */
  jumpDust(x: number, y: number, color = 'rgba(255,255,255,0.5)'): void {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + Math.random() * 20 - 10,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2.5,
        life: 12 + Math.random() * 8,
        maxLife: 20,
        color,
        size: 2 + Math.random() * 3,
        type: 'circle',
        gravity: 0.05,
      });
    }
  }

  /** Confetti burst (level complete) */
  confetti(x: number, y: number, count = 40): void {
    const colors = ['#ff0066', '#00ffcc', '#ffd700', '#ff44aa', '#00ff88', '#44aaff', '#ff8800', '#aa44ff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 100,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 4,
        type: 'confetti',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.08,
      });
    }
  }

  /** Shockwave ring (bomb explosion visual) */
  shockwave(x: number, y: number, color = '#ff880066'): void {
    // Сreate ring of particles moving outward
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const speed = 6;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 12,
        maxLife: 12,
        color,
        size: 2.5,
        type: 'circle',
        gravity: 0,
      });
    }
  }

  /** Sparkle around collectibles */
  sparkle(x: number, y: number, color: string): void {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 1,
      vy: -0.5 - Math.random() * 1,
      life: 10 + Math.random() * 10,
      maxLife: 20,
      color,
      size: 1.5 + Math.random() * 2,
      type: 'star',
      gravity: -0.02,
    });
  }

  /** Score popup — floating number going up */
  scorePopup(x: number, y: number, color = '#ffd700'): void {
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 2,
      vy: -2,
      life: 30,
      maxLife: 30,
      color,
      size: 6,
      type: 'circle',
      gravity: 0,
    });
  }

  /** Screen flash effect */
  screenFlash(color = '#ffffff', duration = 6): void {
    this._screenFlashAlpha = duration;
    this._screenFlashColor = color;
  }

  /** Update all particles */
  update(): void {
    // Screen flash decay
    if (this._screenFlashAlpha > 0) {
      this._screenFlashAlpha -= 0.8;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += (p.gravity ?? 0.1); // gravity
      if (p.rotation !== undefined && p.rotSpeed !== undefined) {
        p.rotation += p.rotSpeed;
      }
      // Friction for confetti
      if (p.type === 'confetti') {
        p.vx *= 0.98;
      }
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /** Draw all particles with glow */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;

      if (p.type === 'circle') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        // Draw small 4-point star
        const r = p.size * alpha;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r);
        ctx.lineTo(p.x + r * 0.3, p.y - r * 0.3);
        ctx.lineTo(p.x + r, p.y);
        ctx.lineTo(p.x + r * 0.3, p.y + r * 0.3);
        ctx.lineTo(p.x, p.y + r);
        ctx.lineTo(p.x - r * 0.3, p.y + r * 0.3);
        ctx.lineTo(p.x - r, p.y);
        ctx.lineTo(p.x - r * 0.3, p.y - r * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation ?? 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        ctx.restore();
      } else {
        // Square (default)
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * alpha, p.size * alpha);
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Screen flash overlay
    if (this._screenFlashAlpha > 0) {
      ctx.globalAlpha = Math.min(this._screenFlashAlpha / 6, 0.3);
      ctx.fillStyle = this._screenFlashColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  /** Clear all particles */
  clear(): void {
    this.particles.length = 0;
    this._screenFlashAlpha = 0;
  }

  get count(): number {
    return this.particles.length;
  }
}
