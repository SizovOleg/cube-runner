import { COLORS, CANVAS_WIDTH } from '@utils/constants';

/**
 * Базовый класс босса.
 * Каждый конкретный босс наследует и реализует свои паттерны атак.
 */
export interface BossConfig {
  name: string;
  maxHP: number;
  phases: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export abstract class Boss {
  name: string;
  hp: number;
  maxHP: number;
  x: number;
  y: number;
  width: number;
  height: number;
  phase: number;
  totalPhases: number;
  alive: boolean;
  invincible: boolean;
  invincibleTimer: number;
  introPlaying: boolean;
  defeated: boolean;

  constructor(config: BossConfig) {
    this.name = config.name;
    this.maxHP = config.maxHP;
    this.hp = config.maxHP;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.phase = 1;
    this.totalPhases = config.phases;
    this.alive = true;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.introPlaying = true;
    this.defeated = false;
  }

  /**
   * Получение урона. Возвращает true если босс убит.
   */
  takeDamage(amount: number): boolean {
    if (this.invincible || !this.alive) return false;

    this.hp -= amount;
    this.invincible = true;
    this.invincibleTimer = 30; // Неуязвимость после удара

    // Проверка смены фазы
    const phaseThreshold = this.maxHP / this.totalPhases;
    const newPhase = Math.ceil(this.hp / phaseThreshold);
    if (newPhase < this.phase && this.hp > 0) {
      this.phase = Math.max(1, this.totalPhases - newPhase + 1);
      this.onPhaseChange(this.phase);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.defeated = true;
      this.onDefeat();
      return true;
    }
    return false;
  }

  /**
   * Обновление состояния босса (каждый кадр).
   */
  update(playerX: number, playerY: number): void {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }
    if (this.alive && !this.introPlaying) {
      this.updateBehavior(playerX, playerY);
    }
  }

  /**
   * Отрисовка HP-бара босса.
   */
  drawHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = 200;
    const barHeight = 16;
    const barX = (CANVAS_WIDTH - barWidth) / 2;
    const barY = 20;

    // Фон
    ctx.fillStyle = COLORS.bossHealthBg;
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // HP
    const hpRatio = this.hp / this.maxHP;
    ctx.fillStyle = COLORS.bossHealth;
    ctx.shadowColor = COLORS.bossHealth;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    ctx.shadowBlur = 0;

    // Имя босса
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, CANVAS_WIDTH / 2, barY - 6);
    ctx.textAlign = 'left';
  }

  // Абстрактные методы — реализуются в конкретных боссах
  abstract updateBehavior(playerX: number, playerY: number): void;
  abstract draw(ctx: CanvasRenderingContext2D, frame: number): void;
  abstract onPhaseChange(newPhase: number): void;
  abstract onDefeat(): void;

  /**
   * Получить снаряды босса (для проверки коллизий с игроком).
   */
  abstract getProjectiles(): Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    damage: number;
  }>;
}
