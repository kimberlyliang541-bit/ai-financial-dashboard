// Design tokens — plain JS, no JSX
export const C = {
  bg:        '#F4F2EF',
  surface:   'rgba(255,253,249,0.88)',
  surfaceHi: '#FFFDF9',
  border:    'rgba(0,0,0,0.07)',
  borderHi:  'rgba(0,0,0,0.13)',

  accent:    '#D97706',        // amber-600 — bright golden brown, primary interactive
  accentDim: '#B45309',
  accentBg:  'rgba(217,119,6,0.09)',

  sky:       '#F59E8B',        // warm orange — secondary highlight / MA5
  red:       '#FB7185',        // danger / negative sentiment
  redBg:     'rgba(251,113,133,0.10)',
  amber:     '#FBBF24',        // MA20 line

  pos:       '#22C55E',        // positive sentiment / success
  posBg:     'rgba(34,197,94,0.10)',

  text:      '#1C1209',
  textMid:   '#57534E',
  textDim:   '#A8A29E',

  // Chart data viz — line colors for price/MA series
  chartClose: '#FB923C',  // vivid orange — primary price / close line
  chartMA20:  '#34D399',  // emerald  — MA20 long-term structural signal
};
