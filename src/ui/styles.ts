import React from 'react';

/** Главная яркая кнопка (только «Играть» и «Next Level») */
export function primaryBtnStyle(): React.CSSProperties {
  return {
    padding: '14px 32px', fontSize: 18, fontWeight: 'bold',
    border: 'none', borderRadius: 12, cursor: 'pointer', color: '#fff',
    background: 'linear-gradient(135deg, #00cc88, #00aa66)',
    boxShadow: '0 0 20px rgba(0,204,136,0.4)',
    margin: 8, fontFamily: 'monospace', minWidth: 200,
  };
}

/** Второстепенная кнопка меню — прозрачная с обводкой #00ffcc */
export function neonBtnStyle(_bg?: string): React.CSSProperties {
  return {
    padding: '14px 32px', fontSize: 18, fontWeight: 'bold',
    border: '1.5px solid #00ffcc', borderRadius: 12, cursor: 'pointer', color: '#fff',
    background: 'rgba(255,255,255,0.08)',
    boxShadow: 'none',
    margin: 8, fontFamily: 'monospace', minWidth: 200,
  };
}

/** Маленькая второстепенная кнопка (Назад, навигация) */
export function ghostBtnStyle(): React.CSSProperties {
  return {
    padding: '10px 24px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: 14,
  };
}

/** Маленькая зелёная кнопка (Купить, Активировать) */
export function buyBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 'bold',
    border: 'none', cursor: enabled ? 'pointer' : 'default',
    background: enabled ? 'linear-gradient(135deg, #00cc88, #00aa66)' : '#333',
    color: enabled ? '#fff' : '#555',
    boxShadow: enabled ? '0 0 8px rgba(0,204,136,0.4)' : 'none',
    fontFamily: 'monospace',
  };
}
