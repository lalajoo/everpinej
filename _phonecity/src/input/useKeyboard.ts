import { useEffect, useRef } from 'react';
import { MOVE_CODES, input } from './inputState';

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return false;
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable || !!t.closest('dialog[open]');
}

/** 산책 모드에서만 키 입력을 받는다. 탭 전환·포커스 이탈 시 눌림 상태를 비워 고착을 막는다. */
export function useKeyboard(enabled: boolean, onAction?: (code: string) => void) {
  const action = useRef(onAction);
  useEffect(() => { action.current = onAction; }, [onAction]);
  useEffect(() => {
    if (!enabled) { input.clear(); return; }
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (MOVE_CODES.has(e.code)) { e.preventDefault(); input.press(e.code); }
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.press(e.code);
      else if (!e.repeat) action.current?.(e.code);
    };
    const up = (e: KeyboardEvent) => input.release(e.code);
    const clear = () => input.clear();
    const vis = () => { if (document.hidden) input.clear(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', vis);
      input.clear();
    };
  }, [enabled]);
}
