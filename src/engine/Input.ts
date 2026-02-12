/**
 * Унифицированный менеджер ввода.
 * Обрабатывает клавиатуру и тач одним интерфейсом.
 */
export interface InputState {
  jump: boolean;
  shoot: boolean;
  usePowerup: number | null; // 0, 1, 2 или null
  pause: boolean;
}

export class Input {
  private state: InputState = {
    jump: false,
    shoot: false,
    usePowerup: null,
    pause: false,
  };

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.keyDownHandler = this.onKeyDown.bind(this);
    this.keyUpHandler = this.onKeyUp.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.reset();
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  // Touch-вход (вызывается из React-компонентов)
  setJump(active: boolean): void {
    this.state.jump = active;
  }

  setShoot(active: boolean): void {
    this.state.shoot = active;
  }

  triggerPowerup(slot: number): void {
    this.state.usePowerup = slot;
  }

  consumePowerup(): number | null {
    const slot = this.state.usePowerup;
    this.state.usePowerup = null;
    return slot;
  }

  consumePause(): boolean {
    const p = this.state.pause;
    this.state.pause = false;
    return p;
  }

  private reset(): void {
    this.state.jump = false;
    this.state.shoot = false;
    this.state.usePowerup = null;
    this.state.pause = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        this.state.jump = true;
        break;
      case 'KeyX':
      case 'KeyZ':
      case 'KeyF':
      case 'ShiftLeft':
      case 'ShiftRight':
        e.preventDefault();
        this.state.shoot = true;
        break;
      case 'Digit1':
        this.state.usePowerup = 0;
        break;
      case 'Digit2':
        this.state.usePowerup = 1;
        break;
      case 'Digit3':
        this.state.usePowerup = 2;
        break;
      case 'Escape':
      case 'KeyP':
        this.state.pause = true;
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.state.jump = false;
        break;
      case 'KeyX':
      case 'KeyZ':
      case 'KeyF':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.shoot = false;
        break;
    }
  }
}
