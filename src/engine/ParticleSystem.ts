/**
 * Система частиц для визуальных эффектов.
 * Взрывы при убийстве врагов, эффекты powerup, следы полёта.
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
}

export class ParticleSystem {
  private particles: Particle[] = [];

  /**
   * Создать взрыв частиц.
   */
  burst(x: number, y: number, color: string, count = 8): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  /**
   * Лёгкий одиночный след (для трейла игрока и атмосферных эффектов).
   */
  trail(x: number, y: number, color: string, size = 4, life = 15): void {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life, maxLife: life,
      color, size,
    });
  }

  /**
   * Большой взрыв (для бомб и боссов).
   */
  bigBurst(x: number, y: number): void {
    const colors = ['#ff8800', '#ffcc00', '#ff4400', '#ffff00'];
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 6,
      });
    }
  }

  /**
   * Обновить все частицы.
   */
  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Гравитация на частицы
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Отрисовать все частицы.
   */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Очистить все частицы.
   */
  clear(): void {
    this.particles.length = 0;
  }

  get count(): number {
    return this.particles.length;
  }
}
