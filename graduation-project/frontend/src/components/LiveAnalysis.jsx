import { useState } from 'react';
import { C } from '../theme.js';
import { SentimentFace } from './ui';

const API = import.meta.env.VITE_API_URL || '';

const SENT_COLOR = {
  positive: C.pos,
  negative: C.red,
  neutral:  C.textMid,
};

// ─── Example headlines to quick-fill ──────────────────────────────────────────
const EXAMPLES = [
  'Apple reports record Q4 earnings, beating analyst expectations by 12%',
  'Federal Reserve signals aggressive rate hikes amid persistent inflation',
  'Tesla recalls 200,000 vehicles over software defect in autopilot system',
  'Nvidia announces breakthrough AI chip, stock surges 8% after-hours',
  'Markets close flat as investors await Fed meeting minutes',
  'Amazon expands same-day delivery to 15 new cities, boosting logistics outlook',
];

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function Dots() {
  return (
    <span style={{ display:'inline-flex', gap:3, marginLeft:6, verticalAlign:'middle' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width:4, height:4, borderRadius:99, background:'currentColor',
          display:'inline-block', animation:`dotPulse 1.2s ease-out ${i*0.18}s infinite` }}/>
      ))}
    </span>
  );
}

function ConfBar({ value, color }) {
  return (
    <div style={{ height:4, background:C.border, borderRadius:2, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.round(value*100)}%`, background:color,
        borderRadius:2, transition:'width .5s ease' }}/>
    </div>
  );
}

// Gauge needle −1 … +1
function SentimentGauge({ score }) {
  // score is -1 to 1, map to 0–180 degrees
  const deg = Math.round(((score + 1) / 2) * 180);
  const rad = (deg * Math.PI) / 180;
  const cx = 80, cy = 80, r = 60;
  const nx = cx + r * Math.cos(Math.PI - rad);
  const ny = cy - r * Math.sin(Math.PI - rad);
  // arc segments
  const negEnd = polarXY(cx, cy, r, 0);
  const neutEnd = polarXY(cx, cy, r, 90);
  const posEnd = polarXY(cx, cy, r, 180);
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" style={{ display:'block', margin:'0 auto' }}>
      {/* Background track */}
      <path d={arcPath(cx,cy,r,0,180)} fill="none" stroke={C.border} strokeWidth="10" strokeLinecap="round"/>
      {/* Colored segments */}
      <path d={arcPath(cx,cy,r,0,60)}   fill="none" stroke={C.red}     strokeWidth="10" strokeLinecap="butt" opacity=".7"/>
      <path d={arcPath(cx,cy,r,60,120)} fill="none" stroke={C.textMid} strokeWidth="10" strokeLinecap="butt" opacity=".5"/>
      <path d={arcPath(cx,cy,r,120,180)}fill="none" stroke={C.pos}     strokeWidth="10" strokeLinecap="butt" opacity=".7"/>
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="5" fill={C.accent}/>
      {/* Labels */}
      <text x="10"  y="88" fontSize="9" fill={C.red}     textAnchor="middle">−1</text>
      <text x="80"  y="18" fontSize="9" fill={C.textMid} textAnchor="middle">0</text>
      <text x="150" y="88" fontSize="9" fill={C.pos}     textAnchor="middle">+1</text>
    </svg>
  );
}

function polarXY(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(Math.PI - rad), cy - r * Math.sin(Math.PI - rad)];
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const [x1,y1] = polarXY(cx, cy, r, startDeg);
  const [x2,y2] = polarXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`;
}

// ─── History item ──────────────────────────────────────────────────────────────
function HistoryItem({ item, onClick }) {
  const color = SENT_COLOR[item.sentiment] || C.textMid;
  return (
    <div onClick={onClick} style={{
      padding: '10px 14px', borderRadius:8,
      border:`1px solid ${color}33`,
      background: `${color}08`,
      cursor:'pointer', transition:'all .15s',
      display:'flex', alignItems:'center', gap:10,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.borderColor = `${color}55`; }}
    onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.borderColor = `${color}33`; }}
    >
      <SentimentFace type={item.sentiment} size={16}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.text}</div>
        <div style={{ fontSize:10, color:C.textDim, marginTop:2 }}>{item.sentiment} · {Math.round(item.confidence*100)}% confidence</div>
      </div>
      <div style={{ fontSize:11, fontWeight:700, color, flexShrink:0 }}>
        {item.score >= 0 ? '+' : ''}{item.score.toFixed(2)}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LiveAnalysis() {
  const [text,    setText]    = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState([]);

  async function analyze(input) {
    const t = input ?? text;
    if (!t.trim()) return;
    if (input) setText(input);
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch(`${API}/api/sentiment/analyze`, {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ text: t }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
      // Score: positive→+1, negative→-1, neutral→0, weighted by confidence
      const scoreMap = { positive: 1, negative: -1, neutral: 0 };
      const score = (scoreMap[data.sentiment] ?? 0) * data.confidence;
      setHistory(h => [{ text: t.slice(0,80), sentiment: data.sentiment, confidence: data.confidence, score }, ...h].slice(0,8));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const sColor = result ? (SENT_COLOR[result.sentiment] || C.textMid) : C.accent;
  const scoreVal = result
    ? ({ positive:1, negative:-1, neutral:0 }[result.sentiment] ?? 0) * result.confidence
    : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Top: input + result side by side ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Left: input panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, letterSpacing:'-0.01em' }}>Analyze headline</div>
            <div style={{ fontSize:12, color:C.textDim, marginTop:3 }}>Type or click an example below · Ctrl+Enter to analyze</div>
          </div>

          {/* Textarea */}
          <div style={{ position:'relative' }}>
            <textarea
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) analyze(); }}
              disabled={loading}
              placeholder="Paste any financial news headline…"
              style={{
                width:'100%', display:'block',
                padding:'13px 14px', paddingBottom:28,
                borderRadius:10, resize:'none',
                border:`1.5px solid ${focused ? C.accent : C.border}`,
                background: C.bg, color: C.text,
                fontSize:13, lineHeight:1.6, outline:'none',
                transition:'border-color .2s, box-shadow .2s',
                fontFamily:'inherit',
                boxShadow: focused ? `0 0 0 3px ${C.accent}18` : 'none',
              }}
            />
            <div style={{ position:'absolute', bottom:9, right:12, fontSize:10, color:C.textDim, pointerEvents:'none' }}>
              {text.length > 0 && `${text.length} chars`}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => analyze()} disabled={loading || !text.trim()} style={{
              flex:1, padding:'10px 0', borderRadius:8, border:'none',
              background: loading || !text.trim()
                ? C.border
                : `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`,
              color: loading || !text.trim() ? C.textDim : '#fff',
              fontSize:13, fontWeight:600,
              cursor: loading || !text.trim() ? 'default' : 'pointer',
              boxShadow: loading || !text.trim() ? 'none' : `0 2px 14px ${C.accent}44`,
              transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {loading ? <>Analyzing <Dots/></> : 'Analyze'}
            </button>
            <button onClick={() => { setText(''); setResult(null); setError(''); }} style={{
              padding:'10px 18px', borderRadius:8,
              border:`1px solid ${C.border}`, background:'transparent',
              color:C.textMid, fontSize:13, cursor:'pointer',
            }}>Clear</button>
          </div>

          {/* Example chips */}
          <div>
            <div style={{ fontSize:10, color:C.textDim, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:8 }}>Try an example</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {EXAMPLES.map((ex,i) => (
                <div key={i} onClick={() => analyze(ex)} style={{
                  padding:'7px 11px', borderRadius:7, border:`1px solid ${C.border}`,
                  fontSize:11, color:C.textMid, cursor:'pointer', lineHeight:1.4,
                  transition:'all .15s', background:'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.textMid; }}
                >
                  {ex}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: result panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Gauge */}
          <div style={{ background:C.surface, borderRadius:12, padding:'18px 16px', border:`1px solid ${C.border}`, textAlign:'center' }}>
            <div style={{ fontSize:10, color:C.textDim, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600, marginBottom:8 }}>Sentiment meter</div>
            <SentimentGauge score={result ? scoreVal : 0}/>
            {result ? (
              <div style={{ marginTop:6 }}>
                <span style={{ fontSize:20, fontWeight:800, color:sColor, letterSpacing:'-0.03em' }}>
                  {scoreVal >= 0 ? '+' : ''}{scoreVal.toFixed(2)}
                </span>
                <span style={{ fontSize:12, color:C.textMid, marginLeft:8, textTransform:'capitalize' }}>{result.sentiment}</span>
              </div>
            ) : (
              <div style={{ fontSize:12, color:C.textDim, marginTop:4 }}>Run analysis to see result</div>
            )}
          </div>

          {/* Result detail */}
          {result && (
            <div style={{
              borderRadius:12,
              border:`1.5px solid ${sColor}55`,
              background:`${sColor}07`,
              padding:'14px 16px',
              animation:'fadeIn .3s ease',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <SentimentFace type={result.sentiment} size={20}/>
                  <span style={{ fontSize:15, fontWeight:700, color:sColor, textTransform:'capitalize' }}>{result.sentiment}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:sColor }}>{Math.round(result.confidence*100)}%</span>
              </div>
              <ConfBar value={result.confidence} color={sColor}/>
              <div style={{ marginTop:12, fontSize:12, color:C.textMid, lineHeight:1.65, fontStyle:'italic' }}>
                "{result.reason}"
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding:'10px 14px', borderRadius:8, background:C.redBg, color:C.red, fontSize:12, border:`1px solid ${C.red}33` }}>
              {error}
            </div>
          )}

          {!result && !error && (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:C.textDim, fontSize:12, textAlign:'center', lineHeight:1.6 }}>
              Analysis result will<br/>appear here
            </div>
          )}
        </div>
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.textMid }}>Recent analyses</div>
            <div onClick={() => setHistory([])} style={{ fontSize:11, color:C.textDim, cursor:'pointer' }}>Clear all</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {history.map((item, i) => (
              <HistoryItem key={i} item={item} onClick={() => setText(item.text)}/>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dotPulse { 0%,80%,100%{opacity:.25} 40%{opacity:1} }
        @keyframes fadeIn    { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        textarea::placeholder { color: ${C.textDim}; }
      `}</style>
    </div>
  );
}
