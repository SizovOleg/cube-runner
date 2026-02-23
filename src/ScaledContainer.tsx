import { useState, useEffect } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@utils/constants';

/** Читает CSS env() safe-area-inset-* в пикселях через временный DOM-элемент */
function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:0', 'height:0', 'visibility:hidden',
    'padding-top:env(safe-area-inset-top)',
    'padding-bottom:env(safe-area-inset-bottom)',
    'padding-left:env(safe-area-inset-left)',
    'padding-right:env(safe-area-inset-right)',
  ].join(';');
  document.body.appendChild(el);
  const style = getComputedStyle(el);
  const result = {
    top: parseFloat(style.paddingTop) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
    right: parseFloat(style.paddingRight) || 0,
  };
  document.body.removeChild(el);
  return result;
}

export function useScaleFactor(): number {
  const calcScale = () => {
    const insets = getSafeAreaInsets();
    const availW = window.innerWidth - insets.left - insets.right;
    const availH = window.innerHeight - insets.top - insets.bottom;
    return Math.min(availW / CANVAS_WIDTH, availH / CANVAS_HEIGHT);
  };
  const [scale, setScale] = useState(calcScale);
  useEffect(() => {
    const update = () => setScale(calcScale());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return scale;
}

export function requestFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

export function exitFullscreen(): void {
  const doc = document as Document & { webkitExitFullscreen?: () => void };
  if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
}

export function useIsFullscreen(): boolean {
  const isFS = () => !!(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
  const [fullscreen, setFullscreen] = useState(isFS);
  useEffect(() => {
    const update = () => setFullscreen(isFS());
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  }, []);
  return fullscreen;
}

export function ScaledContainer({ children }: { children: React.ReactNode }) {
  const scale = useScaleFactor();
  const isFullscreen = useIsFullscreen();
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    // Плавное появление при монтировании (0 → 1 за 300мс)
    const t = setTimeout(() => setOpacity(1), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      opacity,
      transition: 'opacity 0.3s ease',
      marginTop: 'max(env(safe-area-inset-top), 10px)',
      position: 'relative',
    }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        flexShrink: 0,
        position: 'relative',
      }}>
        {children}
      </div>
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          title="Exit fullscreen"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 6,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: 16,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            fontFamily: 'monospace',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
