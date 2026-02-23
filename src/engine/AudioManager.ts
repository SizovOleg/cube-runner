/**
 * AudioManager — процедурные звуки через Web Audio API.
 * Не требует файлов. Все звуки генерируются синтетически.
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  /** Лениво инициализируем AudioContext (нужен жест пользователя) */
  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Короткий тон: частота, длительность, форма */
  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainVal = 0.15,
    freqEnd?: number,
  ): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  /** Шум: белый шум заданной длительности */
  private noise(duration: number, gainVal = 0.08): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.start(ctx.currentTime);
  }

  // === Игровые звуки ===

  /** Прыжок: восходящий пип */
  jump(): void {
    this.tone(220, 0.12, 'square', 0.12, 440);
  }

  /** Двойной прыжок: более высокий */
  doubleJump(): void {
    this.tone(330, 0.1, 'square', 0.1, 660);
  }

  /** Выстрел: короткий щелчок */
  shoot(): void {
    this.tone(800, 0.06, 'sawtooth', 0.08, 200);
  }

  /** Смерть врага: нисходящий звук */
  enemyDie(): void {
    this.tone(400, 0.15, 'square', 0.1, 80);
  }

  /** Урон игроку: резкий удар */
  playerHit(): void {
    this.noise(0.15, 0.12);
    this.tone(150, 0.1, 'sawtooth', 0.08, 50);
  }

  /** Сбор монеты: высокий звонкий пип */
  coin(): void {
    this.tone(880, 0.08, 'sine', 0.1, 1320);
  }

  /** Сбор powerup: восходящий аккорд */
  powerup(): void {
    this.tone(440, 0.15, 'sine', 0.1);
    setTimeout(() => this.tone(660, 0.15, 'sine', 0.08), 60);
    setTimeout(() => this.tone(880, 0.2, 'sine', 0.06), 120);
  }

  /** Взрыв бомбы: шум + низкий бас */
  explosion(): void {
    this.noise(0.4, 0.15);
    this.tone(60, 0.3, 'sine', 0.2, 20);
  }

  /** Босс-интро: нарастающий гул */
  bossIntro(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 2.0);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.0);
  }

  /** Победа над боссом: фанфара */
  bossDefeated(): void {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.25, 'sine', 0.12), i * 120);
    });
  }

  /** Смерть игрока: нисходящий звук */
  playerDie(): void {
    this.tone(400, 0.1, 'square', 0.15, 100);
    setTimeout(() => this.noise(0.5, 0.1), 100);
  }

  /** Прохождение уровня: позитивная мелодия */
  levelComplete(): void {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.2, 'sine', 0.1), i * 100);
    });
  }

  /** Вход в коридор-ракету: низкий гул */
  corridorEnter(): void {
    this.tone(80, 0.3, 'sawtooth', 0.12, 160);
  }

  /** Ракетный режим: тихий непрерывный гул (вызывать редко) */
  rocketLoop(): void {
    this.tone(120, 0.05, 'sawtooth', 0.04);
  }
}

/** Синглтон */
export const audio = new AudioManager();
