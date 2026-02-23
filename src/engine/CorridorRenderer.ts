import { CANVAS_WIDTH, GROUND_Y, COLORS } from '@utils/constants';
import { RocketCorridorData } from '@levels/types';
import { Camera } from '@engine/Camera';

/**
 * Возвращает, должны ли шипы в данном сегменте быть сверху (true) или снизу (false).
 * Сегмент = 300px. Используем детерминированный hash по мировой X.
 */
export function corridorSpikesOnTop(wx: number): boolean {
  const seg = Math.floor(wx / 300);
  // Простой числовой hash
  const h = (seg * 2654435761) >>> 0;
  return (h & 1) === 0;
}

/** Вычисляет центр зазора и его размер для заданной мировой координаты */
export function getCorridorGap(wx: number, frame: number, corridor: RocketCorridorData): { center: number; size: number } {
  const center = 170 + Math.sin(wx * 0.004) * 80;
  const size = corridor.gapSizeFunc === 'variable'
    ? 120 + Math.sin(wx * 0.0025 + frame * 0.01) * 30
    : 120;
  return { center, size };
}

export function drawCorridor(ctx: CanvasRenderingContext2D, corridor: RocketCorridorData, camera: Camera, frame: number): void {
  const startScreen = camera.worldToScreen(corridor.startX);
  const endScreen = camera.worldToScreen(corridor.endX);

  // Отсечение: если коридор за пределами экрана
  if (endScreen < -200 || startScreen > CANVAS_WIDTH + 200) return;

  // === Предупреждающие полосы (200px перед входом) ===
  const warnStart = camera.worldToScreen(corridor.startX - 200);
  const warnEnd = startScreen;
  if (warnEnd > 0 && warnStart < CANVAS_WIDTH) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(0, warnStart), 0, Math.min(warnEnd, CANVAS_WIDTH) - Math.max(0, warnStart), GROUND_Y);
    ctx.clip();

    const stripeWidth = 30;
    const offset = (frame * 0.5) % (stripeWidth * 2);
    ctx.globalAlpha = 0.3;
    for (let sx = warnStart - stripeWidth * 4 - offset; sx < warnEnd + stripeWidth * 2; sx += stripeWidth * 2) {
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + stripeWidth, 0);
      ctx.lineTo(sx + stripeWidth - GROUND_Y * 0.5, GROUND_Y);
      ctx.lineTo(sx - GROUND_Y * 0.5, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Текст WARNING
    ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    const textX = (warnStart + warnEnd) / 2;
    if (textX > 0 && textX < CANVAS_WIDTH) {
      ctx.fillText('⚠ CORRIDOR ⚠', textX, 60);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // === Стены и шипы коридора ===
  const drawStart = Math.max(0, startScreen);
  const drawEnd = Math.min(CANVAS_WIDTH, endScreen);
  if (drawEnd <= drawStart) return;

  // Рисуем по колонкам шириной 40px
  for (let wx = corridor.startX; wx < corridor.endX; wx += 40) {
    const sx = camera.worldToScreen(wx);
    if (sx > CANVAS_WIDTH + 40 || sx < -40) continue;

    const { center: gapCenter, size: gapSize } = getCorridorGap(wx, frame, corridor);
    const ceilingY = gapCenter - gapSize / 2;
    const floorY = gapCenter + gapSize / 2;

    // Стена сверху (тёмная)
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(sx, 0, 42, ceilingY);

    // Стена снизу (тёмная)
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(sx, floorY, 42, GROUND_Y - floorY);

    // Шипы только с одной стороны (детерминированно по сегменту 300px)
    ctx.fillStyle = COLORS.spike;
    ctx.shadowColor = COLORS.spike;
    ctx.shadowBlur = 6;
    if (corridorSpikesOnTop(wx)) {
      // Шипы с потолка (вниз)
      ctx.beginPath();
      ctx.moveTo(sx, ceilingY - 5);
      ctx.lineTo(sx + 20, ceilingY + 15);
      ctx.lineTo(sx + 40, ceilingY - 5);
      ctx.closePath();
      ctx.fill();
    } else {
      // Шипы с пола (вверх)
      ctx.beginPath();
      ctx.moveTo(sx, floorY + 5);
      ctx.lineTo(sx + 20, floorY - 15);
      ctx.lineTo(sx + 40, floorY + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // === Движущиеся шипы (уровень 1) ===
  if (corridor.movingSpikes) {
    for (const ms of corridor.movingSpikes) {
      const wx = corridor.startX + ms.offsetX;
      const sx = camera.worldToScreen(wx);
      if (sx < -30 || sx > CANVAS_WIDTH + 30) continue;

      const { center: gapCenter, size: gapSize } = getCorridorGap(wx, frame, corridor);
      // Шип двигается синусоидой внутри зазора
      const spikeY = gapCenter + Math.sin(frame * ms.speed + ms.phase) * ms.amplitude;
      const spikeSize = 18;

      ctx.fillStyle = '#ff6600';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(sx - spikeSize, spikeY);
      ctx.lineTo(sx, spikeY - spikeSize);
      ctx.lineTo(sx + spikeSize, spikeY);
      ctx.lineTo(sx, spikeY + spikeSize);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Проверка: если шип у края — не выходит за стены
      const halfGap = gapSize / 2;
      const ceilingY = gapCenter - halfGap;
      const floorY = gapCenter + halfGap;
      if (spikeY - spikeSize < ceilingY || spikeY + spikeSize > floorY) {
        // Визуальный клип не нужен — шипы стен перекрывают
      }
    }
  }

  // === Вращающиеся блоки (уровень 3) ===
  if (corridor.rotatingBlocks) {
    for (const rb of corridor.rotatingBlocks) {
      const wx = corridor.startX + rb.offsetX;
      const sx = camera.worldToScreen(wx);
      if (sx < -40 || sx > CANVAS_WIDTH + 40) continue;

      const { center: gapCenter, size: gapSize } = getCorridorGap(wx, frame, corridor);
      const blockY = gapCenter + rb.gapOffset * (gapSize / 2 - rb.size);
      const angle = frame * 0.05;
      const half = rb.size / 2;

      ctx.save();
      ctx.translate(sx, blockY);
      ctx.rotate(angle);
      ctx.fillStyle = '#aa44ff';
      ctx.shadowColor = '#aa44ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(-half, -half, rb.size, rb.size);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#cc88ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-half, -half, rb.size, rb.size);
      ctx.restore();
    }
  }

  // === Монеты в коридоре ===
  if (corridor.coins) {
    for (const coin of corridor.coins) {
      const wx = corridor.startX + coin.offsetX;
      const sx = camera.worldToScreen(wx);
      if (sx < -20 || sx > CANVAS_WIDTH + 20) continue;

      const { center: gapCenter, size: gapSize } = getCorridorGap(wx, frame, corridor);
      const coinY = gapCenter + coin.gapOffset * (gapSize / 2 - 12);

      ctx.fillStyle = '#ffdd00';
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sx, coinY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', sx, coinY + 3);
      ctx.textAlign = 'left';
    }
  }

  // Граница входа (красная линия)
  if (startScreen > -5 && startScreen < CANVAS_WIDTH + 5) {
    ctx.strokeStyle = COLORS.spike;
    ctx.shadowColor = COLORS.spike;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startScreen, 0);
    ctx.lineTo(startScreen, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Граница выхода (зелёная линия)
  if (endScreen > -5 && endScreen < CANVAS_WIDTH + 5) {
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(endScreen, 0);
    ctx.lineTo(endScreen, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
