import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { input } from './inputState';
import { useT } from '../i18n';
import { createJoystickControl, JOYSTICK_RADIUS } from './joystickControl';

/** A captured finger controls movement independently of camera gestures. */
export function Joystick() {
  const t = useT();
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const control = useRef(createJoystickControl());

  useEffect(() => {
    const current = control.current;
    const reset = () => { current.clear(); setKnob({ x: 0, y: 0 }); input.setJoystick(0, 0); };
    const vis = () => { if (document.hidden) reset(); };
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', vis);
      current.clear(); input.setJoystick(0, 0);
    };
  }, []);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!base.current) return;
    const r = base.current.getBoundingClientRect();
    const v = control.current.move(e.pointerId, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    if (!v) return;
    e.preventDefault();
    setKnob({ x: v.x * JOYSTICK_RADIUS, y: -v.y * JOYSTICK_RADIUS });
    input.setJoystick(v.x, v.y);
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (!control.current.end(e.pointerId)) return;
    setKnob({ x: 0, y: 0 }); input.setJoystick(0, 0);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div ref={base} className="joystick" role="application" aria-label={t.joystickLabel}
      onPointerDown={(e) => {
        if (e.button !== 0 || !control.current.begin(e.pointerId)) return;
        e.currentTarget.setPointerCapture(e.pointerId); move(e);
      }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <span className="joystick-arrow up" aria-hidden="true">↑</span>
      <span className="joystick-arrow down" aria-hidden="true">↓</span>
      <span className="joystick-arrow left" aria-hidden="true">‹</span>
      <span className="joystick-arrow right" aria-hidden="true">›</span>
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
