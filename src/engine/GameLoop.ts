/**
 * Игровой цикл на requestAnimationFrame.
 * Вызывает update и render с фиксированным шагом времени.
 */
export type UpdateFn = (dt: number) => void;
export type RenderFn = () => void;

export class GameLoop {
  private running = false;
  private rafId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedStep = 1000 / 60; // 60 FPS target

  constructor(
    private onUpdate: UpdateFn,
    private onRender: RenderFn
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    let delta = now - this.lastTime;
    this.lastTime = now;

    // Защита от больших скачков (вкладка была неактивна)
    if (delta > 200) delta = this.fixedStep;

    this.accumulator += delta;

    while (this.accumulator >= this.fixedStep) {
      this.onUpdate(this.fixedStep / 1000);
      this.accumulator -= this.fixedStep;
    }

    this.onRender();
  };
}
