// Shared UI primitives — import from here in all components
import { C } from '../theme.js';

function FaceHappy({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={C.pos} strokeWidth="1.5"/>
      <circle cx="8.5"  cy="10" r="1.2" fill={C.pos}/>
      <circle cx="15.5" cy="10" r="1.2" fill={C.pos}/>
      <path d="M8 15c1.5 2 6.5 2 8 0" stroke={C.pos} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function FaceSad({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={C.red} strokeWidth="1.5"/>
      <circle cx="8.5"  cy="10" r="1.2" fill={C.red}/>
      <circle cx="15.5" cy="10" r="1.2" fill={C.red}/>
      <path d="M8 17c1.5-2 6.5-2 8 0" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function FaceNeutral({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={C.textMid} strokeWidth="1.5"/>
      <circle cx="8.5"  cy="10" r="1.2" fill={C.textMid}/>
      <circle cx="15.5" cy="10" r="1.2" fill={C.textMid}/>
      <line x1="8" y1="15.5" x2="16" y2="15.5" stroke={C.textMid} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function SentimentFace({ type, size = 16 }) {
  if (type === 'positive') return <FaceHappy size={size}/>;
  if (type === 'negative') return <FaceSad   size={size}/>;
  return <FaceNeutral size={size}/>;
}

export function Pill({ type, children }) {
  const m = {
    positive: { bg: C.posBg, color: C.pos },
    negative: { bg: C.redBg, color: C.red },
    neutral:  { bg: 'rgba(217,119,6,0.10)', color: C.textMid },
  };
  const s = m[type] || m.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      <SentimentFace type={type} size={12}/>
      {children}
    </span>
  );
}

export function Badge({ children, color = C.accent }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${color}20`, color, letterSpacing: '0.04em' }}>
      {children}
    </span>
  );
}

export function ChartCard({ title, badge, children }) {
  return (
    <div className="chart-card-wrap" style={{ background: C.surface, borderRadius: 16, padding: '16px 18px', border: `1px solid ${C.border}`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
      {title && (
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          {badge && <div style={{ display: 'flex', gap: 5 }}>{badge}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
