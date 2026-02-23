/**
 * Общие утилиты для Canvas 2D рендеринга.
 * Используются в Player, Enemy, Renderer, HUDRenderer и GameCanvas.
 */

/** Скруглённый rect с fallback для браузеров без нативного roundRect */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
): void {
  const rr = ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void };
  if (rr.roundRect) { rr.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Установить glow-эффект (shadowColor + shadowBlur) */
export function setGlow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

/** Сбросить glow-эффект */
export function clearGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}
