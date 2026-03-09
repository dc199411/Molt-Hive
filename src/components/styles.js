/**
 * Molt-Hive Design System
 * Colors, fonts, animations, and shared style utilities.
 * All styles inline per component — this file exports constants and helpers.
 */

// ─── Color Palette ───
export const C = {
    bg: '#05070f',
    surface: '#090d18',
    card: '#0d1220',
    border: 'rgba(56,189,248,0.1)',
    borderB: 'rgba(56,189,248,0.22)',
    sky: '#38bdf8',
    skyD: 'rgba(56,189,248,0.35)',
    text: '#e0eaf8',
    textD: 'rgba(224,234,248,0.58)',
    textF: 'rgba(224,234,248,0.22)',
    green: '#34d399',
    red: '#f87171',
    amber: '#fbbf24',
    purple: '#a78bfa',
    teal: '#2dd4bf',
    rose: '#fb7185',
    indigo: '#818cf8',
}

// ─── Font Stacks ───
export const FM = "'JetBrains Mono','Fira Code','Courier New',monospace"
export const FS = "'Georgia','Times New Roman',serif"

// ─── CSS Animations (injected via <style> tag) ───
export const ANIMATIONS_CSS = `
@keyframes mh-pulse  { 0%,100%{opacity:.35} 50%{opacity:1} }
@keyframes mh-blink  { 0%,100%{opacity:1}   50%{opacity:0} }
@keyframes mh-fadein { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
@keyframes mh-scan   { 0%{left:-30%} 100%{left:110%} }
@keyframes mh-orbit  {
  0%   { transform: rotate(0deg) translateX(28px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
}
@keyframes mh-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(56,189,248,0.3); }
  50% { box-shadow: 0 0 20px rgba(56,189,248,0.6); }
}
@keyframes mh-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`

// ─── Shared Style Helpers ───
export const baseButton = {
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: FM,
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease',
}

export const primaryButton = {
    ...baseButton,
    background: `linear-gradient(135deg, ${C.sky}, ${C.teal})`,
    color: '#000',
    padding: '10px 20px',
}

export const secondaryButton = {
    ...baseButton,
    background: C.card,
    color: C.text,
    border: `1px solid ${C.border}`,
    padding: '8px 16px',
}

export const inputStyle = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    color: C.text,
    fontFamily: FM,
    fontSize: '14px',
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
}

export const cardStyle = {
    background: C.card,
    borderRadius: '12px',
    border: `1px solid ${C.border}`,
    padding: '16px',
}

export const labelStyle = {
    fontFamily: FM,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: C.textD,
}

export const chipStyle = {
    fontFamily: FM,
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    padding: '2px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
}
