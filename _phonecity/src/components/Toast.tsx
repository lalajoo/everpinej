export function Toast({ text }: { text: string | null }) {
  return <div className={`toast${text ? ' show' : ''}`} role="status" aria-live="polite">{text}</div>;
}
