import { useState, useEffect, useCallback } from 'react';
import { lockEnabled, verifyPin } from '../applock.js';

// Wraps the app; when the lock is enabled it shows a PIN pad and blocks access.
// Re-locks whenever the app goes to the background (privacy lock).
export default function AppLock({ children }) {
  const [locked, setLocked] = useState(() => lockEnabled());
  const [entry, setEntry]   = useState('');
  const [shake, setShake]   = useState(false);

  // React to enable/disable from settings
  useEffect(() => {
    const onChange = () => { if (!lockEnabled()) setLocked(false); };
    window.addEventListener('applock:changed', onChange);
    return () => window.removeEventListener('applock:changed', onChange);
  }, []);

  // Re-lock when returning to the foreground
  useEffect(() => {
    const onHide = () => { if (document.hidden && lockEnabled()) setLocked(true); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  const press = useCallback(async (d) => {
    if (entry.length >= 4) return;
    const next = entry + d;
    setEntry(next);
    if (next.length === 4) {
      if (await verifyPin(next)) {
        setEntry('');
        setLocked(false);
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setEntry(''); }, 450);
      }
    }
  }, [entry]);

  if (!locked) return children;

  const dot = (filled) => (
    <div style={{ width:14, height:14, borderRadius:'50%', background: filled ? '#fbbf24' : 'transparent', border:`2px solid ${filled ? '#fbbf24' : '#444'}`, transition:'all .15s' }} />
  );
  const Key = ({ d, sub }) => (
    <button onClick={() => press(d)} style={{ width:74, height:74, borderRadius:'50%', background:'#161616', border:'1px solid #222', color:'#fff', fontSize:26, fontWeight:600, cursor:'pointer', fontFamily:"'Sora',sans-serif", display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      {d}{sub && <span style={{ fontSize:8, letterSpacing:'.15em', color:'#666' }}>{sub}</span>}
    </button>
  );

  return (
    <div style={{ position:'fixed', inset:0, zIndex:99999, background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:'env(safe-area-inset-top)', paddingBottom:'env(safe-area-inset-bottom)', fontFamily:"'Sora',sans-serif" }}>
      <div style={{ fontSize:40, marginBottom:10 }}>🔒</div>
      <div style={{ color:'#fbbf24', fontSize:13, letterSpacing:'.15em', fontWeight:700, marginBottom:6 }}>WASLNEY</div>
      <div style={{ color:'#888', fontSize:14, marginBottom:26 }}>Enter your PIN</div>
      <div style={{ display:'flex', gap:16, marginBottom:34, animation: shake ? 'lockShake .4s' : 'none' }}>
        {[0,1,2,3].map(i => <span key={i}>{dot(i < entry.length)}</span>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,74px)', gap:18, justifyContent:'center' }}>
        <Key d="1" /><Key d="2" sub="ABC" /><Key d="3" sub="DEF" />
        <Key d="4" sub="GHI" /><Key d="5" sub="JKL" /><Key d="6" sub="MNO" />
        <Key d="7" sub="PQRS" /><Key d="8" sub="TUV" /><Key d="9" sub="WXYZ" />
        <div /><Key d="0" />
        <button onClick={() => setEntry(e => e.slice(0, -1))} style={{ width:74, height:74, borderRadius:'50%', background:'transparent', border:'none', color:'#888', fontSize:22, cursor:'pointer' }}>⌫</button>
      </div>
      <style>{`@keyframes lockShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-9px)}40%,80%{transform:translateX(9px)}}`}</style>
    </div>
  );
}
