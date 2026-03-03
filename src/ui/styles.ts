import React from 'react';

// ═══════════════════════════════════════════
//  CUBE RUNNER — Design System v2.0
//  Geometry Dash-quality UI styles
// ═══════════════════════════════════════════

// ──────────── COLOR TOKENS ────────────
const NEON_CYAN = '#00ffcc';
const NEON_GREEN = '#00ff88';
const NEON_PINK = '#ff44aa';
const NEON_GOLD = '#ffd700';
const GLASS_BG = 'rgba(255,255,255,0.06)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';
const DARK_BG = '#050520';

// ──────────── BASE FONT ────────────
const FONT_TITLE = "'Orbitron', monospace";
const FONT_BODY = "'Rajdhani', 'Orbitron', monospace";

// ─────────────────────────────────────────
// PRIMARY BUTTON — главная яркая кнопка (Играть, Next Level)
// ─────────────────────────────────────────
export function primaryBtnStyle(): React.CSSProperties {
  return {
    padding: '16px 40px',
    fontSize: 20,
    fontWeight: 700,
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    color: '#fff',
    background: 'linear-gradient(135deg, #00cc88 0%, #00ff88 50%, #00cc66 100%)',
    boxShadow: '0 0 25px rgba(0,255,136,0.5), 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    margin: 8,
    fontFamily: FONT_TITLE,
    minWidth: 220,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    textShadow: '0 0 10px rgba(0,255,136,0.5)',
    animation: 'glowPulse 2s ease-in-out infinite',
    position: 'relative' as const,
  };
}

// ─────────────────────────────────────────
// NEON BUTTON — вторичная кнопка с обводкой
// ─────────────────────────────────────────
export function neonBtnStyle(color = NEON_CYAN): React.CSSProperties {
  return {
    padding: '14px 36px',
    fontSize: 17,
    fontWeight: 700,
    border: `2px solid ${color}`,
    borderRadius: 14,
    cursor: 'pointer',
    color: '#fff',
    background: GLASS_BG,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: `0 0 15px ${color}33, inset 0 0 15px ${color}11`,
    margin: 8,
    fontFamily: FONT_TITLE,
    minWidth: 220,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    textShadow: `0 0 8px ${color}66`,
  };
}

// ─────────────────────────────────────────
// GHOST BUTTON — минималистичная кнопка (Назад)
// ─────────────────────────────────────────
export function ghostBtnStyle(): React.CSSProperties {
  return {
    padding: '10px 28px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 1,
    backdropFilter: 'blur(4px)',
  };
}

// ─────────────────────────────────────────
// BUY BUTTON — кнопка покупки
// ─────────────────────────────────────────
export function buyBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    border: 'none',
    cursor: enabled ? 'pointer' : 'default',
    background: enabled ? 'linear-gradient(135deg, #00cc88, #00aa66)' : 'rgba(255,255,255,0.05)',
    color: enabled ? '#fff' : '#555',
    boxShadow: enabled ? '0 0 12px rgba(0,204,136,0.5), 0 2px 8px rgba(0,0,0,0.2)' : 'none',
    fontFamily: FONT_TITLE,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  };
}

// ─────────────────────────────────────────
// GLASSMORPHISM CARD
// ─────────────────────────────────────────
export function cardStyle(active = false, accentColor = NEON_CYAN): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: '16px 14px',
    border: `1.5px solid ${active ? accentColor : GLASS_BORDER}`,
    background: active ? `${accentColor}0d` : GLASS_BG,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: active
      ? `0 0 25px ${accentColor}33, 0 8px 32px rgba(0,0,0,0.3), inset 0 0 20px ${accentColor}08`
      : '0 4px 16px rgba(0,0,0,0.2)',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    transition: 'all 0.25s ease',
  };
}

// ─────────────────────────────────────────
// TITLE STYLE — заголовки экранов
// ─────────────────────────────────────────
export function titleStyle(): React.CSSProperties {
  return {
    fontSize: 36,
    fontWeight: 900,
    color: '#ffffff',
    fontFamily: FONT_TITLE,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
    animation: 'neonPulse 3s ease-in-out infinite',
    marginBottom: 8,
  };
}

// ─────────────────────────────────────────
// SUBTITLE STYLE
// ─────────────────────────────────────────
export function subtitleStyle(color = NEON_CYAN): React.CSSProperties {
  return {
    fontSize: 15,
    color,
    fontFamily: FONT_BODY,
    fontWeight: 600,
    letterSpacing: 3,
    textShadow: `0 0 10px ${color}66`,
    marginBottom: 28,
  };
}

// ─────────────────────────────────────────
// SCREEN CONTAINER — базовый контейнер экрана
// ─────────────────────────────────────────
export function screenContainerStyle(): React.CSSProperties {
  return {
    width: 800,
    maxWidth: '100%',
    height: 400,
    background: DARK_BG,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 16,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    fontFamily: FONT_BODY,
  };
}

// ─────────────────────────────────────────
// STAT BADGE — маленький бейдж со значением
// ─────────────────────────────────────────
export function statBadgeStyle(color = NEON_GOLD): React.CSSProperties {
  return {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    background: `${color}0d`,
    borderRadius: 24,
    padding: '6px 20px',
    border: `1px solid ${color}44`,
  };
}

// ─────────────────────────────────────────
// NEon LINE — горизонтальная неоновая линия
// ─────────────────────────────────────────
export function neonLineStyle(color = NEON_CYAN): React.CSSProperties {
  return {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: 2,
    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
    boxShadow: `0 0 10px ${color}66`,
  };
}

// Re-export tokens for use in components
export { NEON_CYAN, NEON_GREEN, NEON_PINK, NEON_GOLD, GLASS_BG, GLASS_BORDER, DARK_BG, FONT_TITLE, FONT_BODY };
