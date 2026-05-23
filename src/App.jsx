import { useState, useRef, useEffect, useCallback } from 'react';
import { simulate } from './engine.js';
import { EXAMPLES } from './examples.js';
import './App.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const PR   = 28;          // place radius
const TW   = 64;          // transition width
const TH   = 30;          // transition height
const GRID = 24;

let _nid = 1;
const uid   = () => `n${_nid++}`;
const snap  = v  => Math.round(v / GRID) * GRID;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─── Arc geometry ─────────────────────────────────────────────────────────────
function arcPts(f, to, ft, tt) {
  if (!f || !to) return null;
  const dx = to.x - f.x, dy = to.y - f.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len, uy = dy / len;

  let x1, y1, x2, y2;

  if (ft === 'place') {
    x1 = f.x + ux * PR; y1 = f.y + uy * PR;
  } else {
    const sx = Math.abs(dx) > 1e-6 ? TW / 2 / Math.abs(dx) : 1e9;
    const sy = Math.abs(dy) > 1e-6 ? TH / 2 / Math.abs(dy) : 1e9;
    const s  = Math.min(sx, sy) * len;
    x1 = f.x + ux * s; y1 = f.y + uy * s;
  }

  if (tt === 'place') {
    x2 = to.x - ux * (PR + 4); y2 = to.y - uy * (PR + 4);
  } else {
    const sx = Math.abs(dx) > 1e-6 ? (TW / 2 + 4) / Math.abs(dx) : 1e9;
    const sy = Math.abs(dy) > 1e-6 ? (TH / 2 + 4) / Math.abs(dy) : 1e9;
    const s  = Math.min(sx, sy) * len;
    x2 = to.x - ux * s; y2 = to.y - uy * s;
  }

  return { x1, y1, x2, y2 };
}

// ─── Distribution display label ───────────────────────────────────────────────
const DIST_LABEL = { exp:'Exp(λ)', normal:'N(μ,σ)', uniform:'U(a,b)', const:'Cte(v)', erlang:'Erl(k,λ)' };

// ─── Input helpers ────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
  </label>
);

// ─── Main component ───────────────────────────────────────────────────────────
export default function App() {
  const [places,      setPlaces]      = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [arcs,        setArcs]        = useState([]);
  const [mode,        setMode]        = useState('select');
  const [sel,         setSel]         = useState(null);   // { type, id }
  const [arcFrom,     setArcFrom]     = useState(null);   // { type, id, x, y }
  const [drag,        setDrag]        = useState(null);   // { type, id, ox, oy }
  const [pan,         setPan]         = useState({ x: 40, y: 40 });
  const [panOrig,     setPanOrig]     = useState(null);
  const [zoom,        setZoom]        = useState(1);
  const [mw,          setMw]          = useState({ x: 0, y: 0 });  // mouse in world coords
  const [moved,       setMoved]       = useState(false);
  const [result,      setResult]      = useState(null);
  const [running,     setRunning]     = useState(false);
  const [simTime,     setSimTime]     = useState(500);
  const [tab,         setTab]         = useState('props');
  const [toast,       setToast]       = useState('');
  const [showHelp,    setShowHelp]    = useState(false);
  const svgRef   = useRef(null);
  const fileRef  = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  // ── World / screen coordinate helpers ──
  const toW = useCallback((cx, cy) => {
    const r = svgRef.current?.getBoundingClientRect();
    return r ? { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom } : { x: 0, y: 0 };
  }, [pan, zoom]);

  // ── Derived selected element ──
  const selP = sel?.type === 'place'      ? places.find(p => p.id === sel.id)      : null;
  const selT = sel?.type === 'transition' ? transitions.find(t => t.id === sel.id) : null;
  const selA = sel?.type === 'arc'        ? arcs.find(a => a.id === sel.id)        : null;
  const selE = selP || selT || selA;

  const updSel = (obj) => {
    if (selP) setPlaces(ps => ps.map(p => p.id === sel.id ? { ...p, ...obj } : p));
    else if (selT) setTransitions(ts => ts.map(t => t.id === sel.id ? { ...t, ...obj } : t));
    else if (selA) setArcs(as => as.map(a => a.id === sel.id ? { ...a, ...obj } : a));
  };
  const updDist = (obj) => {
    if (!selT) return;
    setTransitions(ts => ts.map(t => t.id === sel.id ? { ...t, dist: { ...(t.dist || {}), ...obj } } : t));
  };

  // ── Load a net ──
  const loadNet = useCallback((data) => {
    _nid = 5000;
    setPlaces(data.places || []);
    setTransitions(data.transitions || []);
    setArcs(data.arcs || []);
    setSel(null); setArcFrom(null); setResult(null);
  }, []);

  const clearAll = useCallback(() => {
    setPlaces([]); setTransitions([]); setArcs([]);
    setSel(null); setArcFrom(null); setResult(null);
    _nid = 1;
  }, []);

  // ── Fit to view ──
  const fitView = useCallback(() => {
    const all = [...places, ...transitions];
    if (!all.length) return;
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const xs = all.map(e => e.x), ys = all.map(e => e.y);
    const minX = Math.min(...xs) - 80, maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 80, maxY = Math.max(...ys) + 80;
    const nz = clamp(Math.min(r.width / (maxX - minX), r.height / (maxY - minY)) * 0.9, 0.15, 4);
    setZoom(nz);
    setPan({ x: (r.width - (maxX - minX) * nz) / 2 - minX * nz, y: (r.height - (maxY - minY) * nz) / 2 - minY * nz });
  }, [places, transitions]);

  // ── Zoom wheel ──
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 0.89;
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      setZoom(z => clamp(z * f, 0.1, 8));
      setPan(p => ({ x: cx - (cx - p.x) * f, y: cy - (cy - p.y) * f }));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (sel) {
          if (sel.type === 'place') {
            setPlaces(ps => ps.filter(p => p.id !== sel.id));
            setArcs(as => as.filter(a => a.from !== sel.id && a.to !== sel.id));
          } else if (sel.type === 'transition') {
            setTransitions(ts => ts.filter(t => t.id !== sel.id));
            setArcs(as => as.filter(a => a.from !== sel.id && a.to !== sel.id));
          } else if (sel.type === 'arc') {
            setArcs(as => as.filter(a => a.id !== sel.id));
          }
          setSel(null);
        }
      }
      if (e.key === 'Escape') { setMode('select'); setArcFrom(null); }
      if (e.key === 's') setMode('select');
      if (e.key === 'p') setMode('addPlace');
      if (e.key === 't') setMode('addTransition');
      if (e.key === 'a') setMode('addArc');
      if (e.key === 'd') setMode('delete');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sel]);

  // ── Canvas event handlers ──
  const onSvgDown = (e) => {
    if (e.target !== svgRef.current && !e.target.dataset.bg) return;
    setMoved(false);
    if (mode === 'select') {
      setPanOrig({ mx: e.clientX - pan.x, my: e.clientY - pan.y });
      setSel(null);
    }
  };

  const onSvgMove = (e) => {
    setMoved(true);
    setMw(toW(e.clientX, e.clientY));
    if (panOrig) setPan({ x: e.clientX - panOrig.mx, y: e.clientY - panOrig.my });
    if (drag) {
      const w = toW(e.clientX, e.clientY);
      const nx = snap(w.x + drag.ox), ny = snap(w.y + drag.oy);
      if (drag.type === 'place')      setPlaces(ps => ps.map(p => p.id === drag.id ? { ...p, x:nx, y:ny } : p));
      else setTransitions(ts => ts.map(t => t.id === drag.id ? { ...t, x:nx, y:ny } : t));
    }
  };

  const onSvgUp = () => { setPanOrig(null); setDrag(null); };

  const onSvgClick = (e) => {
    if (moved) return;
    if (e.target !== svgRef.current && !e.target.dataset.bg) return;
    const w = toW(e.clientX, e.clientY);
    if (mode === 'addPlace') {
      setPlaces(ps => [...ps, { id: uid(), x: snap(w.x), y: snap(w.y), name: `P${ps.length + 1}`, tokens: 0 }]);
    } else if (mode === 'addTransition') {
      setTransitions(ts => [...ts, { id: uid(), x: snap(w.x), y: snap(w.y), name: `T${ts.length + 1}`, type: 'timed', dist: { type: 'exp', lambda: 1 }, weight: 1, priority: 0 }]);
    } else if (mode === 'addArc') {
      setArcFrom(null);
    }
  };

  const onElemDown = (e, type, id) => {
    e.stopPropagation();
    setMoved(false);
    if (mode === 'select') {
      const el = type === 'place' ? places.find(p => p.id === id) : transitions.find(t => t.id === id);
      const w  = toW(e.clientX, e.clientY);
      setDrag({ type, id, ox: el.x - w.x, oy: el.y - w.y });
      setSel({ type, id }); setTab('props');
    }
  };

  const onElemClick = (e, type, id) => {
    e.stopPropagation();
    if (moved) return;
    if (mode === 'select') {
      setSel({ type, id }); setTab('props');
    } else if (mode === 'addArc') {
      if (!arcFrom) {
        const el = type === 'place' ? places.find(p => p.id === id) : transitions.find(t => t.id === id);
        setArcFrom({ type, id, x: el.x, y: el.y });
      } else if (arcFrom.type !== type) {
        const dup = arcs.some(a => a.from === arcFrom.id && a.to === id);
        if (!dup) {
          setArcs(as => [...as, { id: uid(), from: arcFrom.id, fromType: arcFrom.type, to: id, toType: type, weight: 1 }]);
          showToast('Arco creado');
        }
        setArcFrom(null);
      } else {
        setArcFrom(null); // cancel if same type
      }
    } else if (mode === 'delete') {
      if (type === 'place') {
        setPlaces(ps => ps.filter(p => p.id !== id));
        setArcs(as => as.filter(a => a.from !== id && a.to !== id));
      } else {
        setTransitions(ts => ts.filter(t => t.id !== id));
        setArcs(as => as.filter(a => a.from !== id && a.to !== id));
      }
      setSel(null);
    }
  };

  const onArcClick = (e, id) => {
    e.stopPropagation();
    if (moved) return;
    if (mode === 'delete') {
      setArcs(as => as.filter(a => a.id !== id));
    } else if (mode === 'select') {
      setSel({ type: 'arc', id }); setTab('props');
    }
  };

  // ── Simulation ──
  const doSimulate = () => {
    if (!places.length || !transitions.length) return showToast('Red vacía');
    setRunning(true);
    setTimeout(() => {
      try {
        const r = simulate({ places, transitions, arcs }, simTime);
        setResult(r);
        setTab('results');
        showToast(`Simulación completada — ${r.iterations.toLocaleString()} iteraciones`);
      } catch (err) {
        showToast('Error en simulación: ' + err.message);
        console.error(err);
      }
      setRunning(false);
    }, 20);
  };

  // ── Export / Import ──
  const exportJSON = () => {
    const data = JSON.stringify({ places, transitions, arcs }, null, 2);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([data], { type: 'application/json' })), download: 'petri_net.json' });
    a.click(); URL.revokeObjectURL(a.href);
    showToast('Red exportada como JSON');
  };

  const importJSON = (file) => {
    const r = new FileReader();
    r.onload = (e) => {
      try { loadNet(JSON.parse(e.target.result)); showToast('Red importada'); }
      catch { showToast('Error: JSON inválido'); }
    };
    r.readAsText(file);
  };

  // ── Tool definitions ──
  const TOOLS = [
    { id: 'select',        icon: '↖', label: 'Selec.',  key: 'S' },
    { id: 'addPlace',      icon: '○', label: 'Lugar',   key: 'P' },
    { id: 'addTransition', icon: '▬', label: 'Trans.',  key: 'T' },
    { id: 'addArc',        icon: '→', label: 'Arco',    key: 'A' },
    { id: 'delete',        icon: '✕', label: 'Borrar',  key: 'D' },
  ];

  const modeLabel = TOOLS.find(b => b.id === mode)?.label ?? '';

  // ── Render ──
  return (
    <div className="app">
      {/* ── TOOLBAR ── */}
      <header className="toolbar">
        <div className="toolbar-brand">
          <span className="brand-icon">◈</span>
          <span className="brand-name">HPetriSim <span className="brand-web">Web</span></span>
        </div>

        <div className="toolbar-tools">
          {TOOLS.map(b => (
            <button key={b.id} className={`tool-btn ${mode === b.id ? 'active' : ''}`}
              onClick={() => { setMode(b.id); setArcFrom(null); }}
              title={`${b.label} (${b.key})`}>
              <span className="tool-icon">{b.icon}</span>
              <span className="tool-label">{b.label}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-sep" />

        <div className="toolbar-examples">
          {Object.entries(EXAMPLES).map(([key, ex]) => (
            <button key={key} className="example-btn" onClick={() => { loadNet(ex.net); showToast(`Cargado: ${ex.label}`); fitView(); }}
              title={ex.description}>
              {ex.label}
            </button>
          ))}
        </div>

        <div className="toolbar-actions">
          <button className="action-btn" onClick={fitView} title="Ajustar vista (F)">⊡</button>
          <button className="action-btn" onClick={exportJSON} title="Exportar JSON">↓ JSON</button>
          <button className="action-btn" onClick={() => fileRef.current?.click()} title="Importar JSON">↑ JSON</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }}
            onChange={e => e.target.files[0] && importJSON(e.target.files[0])} />
          <button className="action-btn danger" onClick={clearAll} title="Limpiar todo">✕ Limpiar</button>
          <button className="action-btn info" onClick={() => setShowHelp(v => !v)} title="Ayuda">?</button>
        </div>
      </header>

      <div className="main">
        {/* ── CANVAS ── */}
        <svg ref={svgRef} className="canvas"
          style={{ cursor: drag ? 'grabbing' : mode === 'select' ? 'default' : 'crosshair' }}
          onPointerDown={onSvgDown} onPointerMove={onSvgMove}
          onPointerUp={onSvgUp} onPointerLeave={onSvgUp} onClick={onSvgClick}>

          <defs>
            <pattern id="grid" width={GRID * zoom} height={GRID * zoom} patternUnits="userSpaceOnUse"
              x={pan.x % (GRID * zoom)} y={pan.y % (GRID * zoom)}>
              <path d={`M${GRID * zoom} 0L0 0 0 ${GRID * zoom}`} fill="none" stroke="var(--grid-line)" strokeWidth="0.5" />
            </pattern>
            {[['mka','var(--arc)'],['mks','var(--sel)'],['mkr','var(--danger)'],['mkp','var(--accent)']].map(([id, clr]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M1 1.5L8.5 5L1 8.5" fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            ))}
          </defs>

          <rect data-bg="1" width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Arcs */}
            {arcs.map(arc => {
              const fe = arc.fromType === 'place' ? places.find(p => p.id === arc.from) : transitions.find(t => t.id === arc.from);
              const te = arc.toType   === 'place' ? places.find(p => p.id === arc.to)   : transitions.find(t => t.id === arc.to);
              const pts = arcPts(fe, te, arc.fromType, arc.toType);
              if (!pts) return null;
              const isSel = sel?.id === arc.id;
              const isDel = mode === 'delete';
              const isAdj = sel?.id === arc.from || sel?.id === arc.to;
              const mk    = isDel ? 'url(#mkr)' : isSel ? 'url(#mks)' : isAdj ? 'url(#mkp)' : 'url(#mka)';
              const clr   = isDel ? 'var(--danger)' : isSel ? 'var(--sel)' : isAdj ? 'var(--accent)' : 'var(--arc)';
              return (
                <g key={arc.id} onClick={e => onArcClick(e, arc.id)} style={{ cursor: isDel || mode === 'select' ? 'pointer' : 'default' }}>
                  <line x1={pts.x1} y1={pts.y1} x2={pts.x2} y2={pts.y2} stroke="transparent" strokeWidth={16} />
                  <line x1={pts.x1} y1={pts.y1} x2={pts.x2} y2={pts.y2}
                    stroke={clr} strokeWidth={isSel ? 2.2 : 1.6} markerEnd={mk} />
                  {(arc.weight || 1) > 1 && (
                    <text x={(pts.x1 + pts.x2) / 2} y={(pts.y1 + pts.y2) / 2 - 8}
                      textAnchor="middle" className="arc-weight">{arc.weight}</text>
                  )}
                </g>
              );
            })}

            {/* Arc preview */}
            {arcFrom && (
              <line x1={arcFrom.x} y1={arcFrom.y} x2={mw.x} y2={mw.y}
                stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="7 4" markerEnd="url(#mks)" opacity={0.7} />
            )}

            {/* Places */}
            {places.map(p => {
              const isSel  = sel?.id === p.id;
              const isDel  = mode === 'delete';
              const toks   = p.tokens || 0;
              const avg    = result?.avgTokens[p.id];
              return (
                <g key={p.id}
                  onPointerDown={e => onElemDown(e, 'place', p.id)}
                  onClick={e => onElemClick(e, 'place', p.id)}
                  style={{ cursor: mode === 'select' ? 'move' : isDel ? 'pointer' : 'crosshair' }}>
                  <circle cx={p.x} cy={p.y} r={PR + 8} fill="transparent" />
                  <circle cx={p.x} cy={p.y} r={PR}
                    className={`place ${isSel ? 'sel' : ''} ${isDel ? 'del' : ''}`} />
                  {/* Token display */}
                  {toks === 1 && <circle cx={p.x} cy={p.y} r={7} className="token" />}
                  {toks === 2 && <><circle cx={p.x-9} cy={p.y} r={6} className="token" /><circle cx={p.x+9} cy={p.y} r={6} className="token" /></>}
                  {toks === 3 && <><circle cx={p.x-9} cy={p.y+5} r={5} className="token" /><circle cx={p.x+9} cy={p.y+5} r={5} className="token" /><circle cx={p.x} cy={p.y-7} r={5} className="token" /></>}
                  {toks > 3  && <text x={p.x} y={p.y+5} textAnchor="middle" className="token-n">{toks}</text>}
                  <text x={p.x} y={p.y + PR + 16} textAnchor="middle" className="elem-label">{p.name}</text>
                  {avg !== undefined && (
                    <text x={p.x} y={p.y + PR + 28} textAnchor="middle" className="stat-label">ø {avg.toFixed(2)}</text>
                  )}
                </g>
              );
            })}

            {/* Transitions */}
            {transitions.map(t => {
              const isSel = sel?.id === t.id;
              const isDel = mode === 'delete';
              const isImm = t.type === 'immediate';
              const fc    = result?.firingCount[t.id];
              return (
                <g key={t.id}
                  onPointerDown={e => onElemDown(e, 'transition', t.id)}
                  onClick={e => onElemClick(e, 'transition', t.id)}
                  style={{ cursor: mode === 'select' ? 'move' : isDel ? 'pointer' : 'crosshair' }}>
                  <rect x={t.x - TW/2 - 6} y={t.y - TH/2 - 6} width={TW+12} height={TH+12} fill="transparent" />
                  <rect x={t.x - TW/2} y={t.y - TH/2} width={TW} height={TH} rx={3}
                    className={`transition ${isImm ? 'imm' : ''} ${isSel ? 'sel' : ''} ${isDel ? 'del' : ''}`} />
                  <text x={t.x} y={t.y + 4} textAnchor="middle"
                    className={`trans-dist ${isImm ? 'imm-text' : ''}`}>
                    {isImm ? 'imm.' : DIST_LABEL[t.dist?.type] || ''}
                  </text>
                  <text x={t.x} y={t.y + TH/2 + 16} textAnchor="middle" className="elem-label">{t.name}</text>
                  {fc !== undefined && (
                    <text x={t.x} y={t.y + TH/2 + 28} textAnchor="middle" className="stat-label">#{fc.toLocaleString()}</text>
                  )}
                </g>
              );
            })}
          </g>

          {/* HUD */}
          <text x="12" y="20" className="hud-text">
            {arcFrom ? `Arco desde ${arcFrom.type === 'place' ? 'lugar' : 'trans.'} → clic en destino` :
             mode === 'addArc' ? 'Clic en elemento de origen' :
             `Modo: ${modeLabel} · Rueda: zoom · Arrastrar fondo: paneo · Del: borrar · S/P/T/A/D: atajos`}
          </text>
          <text x="12" y="36" className="hud-sub">
            {places.length}P · {transitions.length}T · {arcs.length}A · Zoom {(zoom * 100).toFixed(0)}%
          </text>
        </svg>

        {/* ── RIGHT PANEL ── */}
        <aside className="panel">
          <div className="panel-tabs">
            {[['props','Props'], ['sim','Simular'], ['results','Resultados']].map(([id, l]) => (
              <button key={id} className={`ptab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>

          <div className="panel-body">
            {/* ─── PROPS ─── */}
            {tab === 'props' && (
              <div className="pane">
                {!selE && (
                  <div className="hint">
                    <p><strong>Clic</strong> en un elemento para editar sus propiedades.</p>
                    <hr className="hint-hr" />
                    <p className="legend-row"><span className="leg-place" /> Lugar — contiene tokens</p>
                    <p className="legend-row"><span className="leg-trans-t" /> Trans. temporizada</p>
                    <p className="legend-row"><span className="leg-trans-i" /> Trans. inmediata</p>
                    <p className="legend-row"><span className="leg-arc" />→ Arco (peso ≥ 1)</p>
                  </div>
                )}

                {selA && (
                  <>
                    <div className="pane-title">Arco</div>
                    <Field label="Peso (tokens consumidos/producidos)">
                      <input type="number" min="1" className="inp" value={selA.weight || 1}
                        onChange={e => updSel({ weight: Math.max(1, parseInt(e.target.value) || 1) })} />
                    </Field>
                    <BtnDel onClick={() => { setArcs(as => as.filter(a => a.id !== sel.id)); setSel(null); }}>Eliminar arco</BtnDel>
                  </>
                )}

                {selP && (
                  <>
                    <div className="pane-title">Lugar — <code>{selP.id}</code></div>
                    <Field label="Nombre"><input className="inp" value={selP.name || ''} onChange={e => updSel({ name: e.target.value })} /></Field>
                    <Field label="Tokens iniciales"><input type="number" min="0" className="inp" value={selP.tokens ?? 0} onChange={e => updSel({ tokens: Math.max(0, parseInt(e.target.value) || 0) })} /></Field>
                    {result && <div className="stat-box">
                      <div>Tokens promedio: <strong>{(result.avgTokens[selP.id] || 0).toFixed(4)}</strong></div>
                      <div>Tokens finales: <strong>{result.finalTokens[selP.id] ?? 0}</strong></div>
                    </div>}
                    <BtnDel onClick={() => { setPlaces(ps => ps.filter(p => p.id !== sel.id)); setArcs(as => as.filter(a => a.from !== sel.id && a.to !== sel.id)); setSel(null); }}>Eliminar lugar</BtnDel>
                  </>
                )}

                {selT && (
                  <>
                    <div className="pane-title">Transición — <code>{selT.id}</code></div>
                    <Field label="Nombre"><input className="inp" value={selT.name || ''} onChange={e => updSel({ name: e.target.value })} /></Field>
                    <Field label="Tipo">
                      <select className="inp" value={selT.type || 'timed'} onChange={e => updSel({ type: e.target.value })}>
                        <option value="timed">Temporizada</option>
                        <option value="immediate">Inmediata</option>
                      </select>
                    </Field>

                    {selT.type === 'immediate' && (
                      <>
                        <Field label="Peso (conflicto probabilístico)">
                          <input type="number" min="0.01" step="1" className="inp" value={selT.weight ?? 1} onChange={e => updSel({ weight: parseFloat(e.target.value) || 1 })} />
                        </Field>
                        <Field label="Prioridad (mayor = primero)">
                          <input type="number" min="0" step="1" className="inp" value={selT.priority ?? 0} onChange={e => updSel({ priority: parseInt(e.target.value) || 0 })} />
                        </Field>
                      </>
                    )}

                    {selT.type !== 'immediate' && (
                      <>
                        <Field label="Distribución">
                          <select className="inp" value={selT.dist?.type || 'exp'} onChange={e => updDist({ type: e.target.value })}>
                            <option value="exp">Exponencial — Exp(λ)</option>
                            <option value="normal">Normal — N(μ, σ)</option>
                            <option value="uniform">Uniforme — U(a, b)</option>
                            <option value="const">Constante — Cte(v)</option>
                            <option value="erlang">Erlang — Erl(k, λ)</option>
                          </select>
                        </Field>

                        {selT.dist?.type === 'exp' && (
                          <Field label="λ — tasa (media = 1/λ)">
                            <input type="number" min="0.0001" step="0.1" className="inp" value={selT.dist?.lambda ?? 1} onChange={e => updDist({ lambda: parseFloat(e.target.value) || 1 })} />
                          </Field>
                        )}
                        {selT.dist?.type === 'normal' && <>
                          <Field label="Media μ"><input type="number" step="0.1" className="inp" value={selT.dist?.mean ?? 1} onChange={e => updDist({ mean: parseFloat(e.target.value) || 1 })} /></Field>
                          <Field label="Desv. estándar σ (> 0)"><input type="number" min="0.0001" step="0.1" className="inp" value={selT.dist?.std ?? 0.1} onChange={e => updDist({ std: Math.max(0.0001, parseFloat(e.target.value) || 0.1) })} /></Field>
                        </>}
                        {selT.dist?.type === 'uniform' && <>
                          <Field label="Mínimo (a)"><input type="number" step="0.1" className="inp" value={selT.dist?.min ?? 0} onChange={e => updDist({ min: parseFloat(e.target.value) || 0 })} /></Field>
                          <Field label="Máximo (b)"><input type="number" step="0.1" className="inp" value={selT.dist?.max ?? 1} onChange={e => updDist({ max: parseFloat(e.target.value) || 1 })} /></Field>
                        </>}
                        {selT.dist?.type === 'const' && (
                          <Field label="Valor fijo (v)"><input type="number" min="0.0001" step="0.1" className="inp" value={selT.dist?.value ?? 1} onChange={e => updDist({ value: parseFloat(e.target.value) || 1 })} /></Field>
                        )}
                        {selT.dist?.type === 'erlang' && <>
                          <Field label="k — número de etapas"><input type="number" min="1" step="1" className="inp" value={selT.dist?.k ?? 2} onChange={e => updDist({ k: Math.max(1, parseInt(e.target.value) || 2) })} /></Field>
                          <Field label="λ — tasa por etapa"><input type="number" min="0.0001" step="0.1" className="inp" value={selT.dist?.lambda ?? 1} onChange={e => updDist({ lambda: parseFloat(e.target.value) || 1 })} /></Field>
                        </>}
                      </>
                    )}

                    {result && <div className="stat-box">
                      <div>Disparos: <strong>{(result.firingCount[selT.id] || 0).toLocaleString()}</strong></div>
                      <div>Tasa: <strong>{result.simTime > 0 ? ((result.firingCount[selT.id] || 0) / result.simTime).toFixed(4) : '—'}</strong>/u.t.</div>
                    </div>}
                    <BtnDel onClick={() => { setTransitions(ts => ts.filter(t => t.id !== sel.id)); setArcs(as => as.filter(a => a.from !== sel.id && a.to !== sel.id)); setSel(null); }}>Eliminar transición</BtnDel>
                  </>
                )}
              </div>
            )}

            {/* ─── SIM ─── */}
            {tab === 'sim' && (
              <div className="pane">
                <div className="pane-title">Simulación</div>
                <Field label="Horizonte de tiempo">
                  <input type="number" min="1" className="inp" value={simTime} onChange={e => setSimTime(Math.max(1, parseInt(e.target.value) || 1))} />
                </Field>
                <div className="net-info">
                  <span>{places.length} lugares</span>
                  <span>{transitions.length} transiciones</span>
                  <span>{arcs.length} arcos</span>
                </div>
                <button className="run-btn" onClick={doSimulate} disabled={running}>
                  {running ? '⏳ Simulando...' : '▶  Ejecutar'}
                </button>
                {result && <div className="ok-box">✓ Listo — T = {result.simTime.toFixed(2)}, {result.iterations.toLocaleString()} iter.</div>}

                <details className="dist-ref">
                  <summary>Referencia de distribuciones</summary>
                  <table className="dist-table">
                    <tbody>
                      <tr><td>Exp(λ)</td><td>Media = 1/λ · Memoryless</td></tr>
                      <tr><td>N(μ,σ)</td><td>Normal truncada en 0</td></tr>
                      <tr><td>U(a,b)</td><td>Uniforme en [a, b]</td></tr>
                      <tr><td>Cte(v)</td><td>Tiempo determinístico</td></tr>
                      <tr><td>Erl(k,λ)</td><td>Erlang-k, media = k/λ</td></tr>
                    </tbody>
                  </table>
                </details>
              </div>
            )}

            {/* ─── RESULTS ─── */}
            {tab === 'results' && (
              <div className="pane">
                {!result ? (
                  <div className="hint">Ejecuta la simulación primero.</div>
                ) : (
                  <>
                    <div className="pane-title">T = {result.simTime.toFixed(2)}</div>

                    <div className="res-section-title">Lugares — tokens promedio</div>
                    {places.map(p => (
                      <div key={p.id} className="res-row">
                        <div className="res-name">{p.name}</div>
                        <div className="res-val">{(result.avgTokens[p.id] || 0).toFixed(4)}</div>
                      </div>
                    ))}

                    <div className="res-section-title" style={{ marginTop: 14 }}>Transiciones — disparos</div>
                    {transitions.map(t => {
                      const fc   = result.firingCount[t.id] || 0;
                      const rate = result.simTime > 0 ? fc / result.simTime : 0;
                      return (
                        <div key={t.id} className="res-row">
                          <div className="res-name">
                            {t.name}
                            <span className="res-rate">{rate.toFixed(3)}/u.t.</span>
                          </div>
                          <div className="res-val">{fc.toLocaleString()}</div>
                        </div>
                      );
                    })}

                    <div className="res-section-title" style={{ marginTop: 14 }}>Últimos 30 eventos</div>
                    <div className="log-box">
                      {result.log.slice(-30).reverse().map((e, i) => (
                        <div key={i} className="log-row">
                          <span className="log-t">{e.t}</span>
                          <span className="log-name">{e.name}</span>
                        </div>
                      ))}
                    </div>

                    <button className="clear-btn" onClick={() => setResult(null)}>Limpiar resultados</button>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── TOAST ── */}
      {toast && <div className="toast">{toast}</div>}

      {/* ── HELP MODAL ── */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>HPetriSim Web — Ayuda</h2>
              <button className="modal-close" onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="modal-body">
              <h3>Atajos de teclado</h3>
              <table className="help-table">
                <tbody>
                  <tr><td>S</td><td>Modo selección</td></tr>
                  <tr><td>P</td><td>Añadir lugar</td></tr>
                  <tr><td>T</td><td>Añadir transición</td></tr>
                  <tr><td>A</td><td>Añadir arco</td></tr>
                  <tr><td>D</td><td>Modo borrar</td></tr>
                  <tr><td>Esc</td><td>Cancelar acción</td></tr>
                  <tr><td>Del / ⌫</td><td>Borrar seleccionado</td></tr>
                  <tr><td>Rueda</td><td>Zoom</td></tr>
                </tbody>
              </table>
              <h3>Semántica GSPN</h3>
              <ul>
                <li>Las <strong>transiciones inmediatas</strong> disparan instantáneamente, con resolución de conflictos por peso.</li>
                <li>Las <strong>transiciones temporizadas</strong> muestran una carrera (race condition).</li>
                <li>Un lugar con <strong>n tokens</strong> permite que la transición se dispare n veces en paralelo.</li>
                <li>El <strong>arco release</strong> (T→lugar_recurso) devuelve el recurso al pool.</li>
              </ul>
              <h3>Modelado de colas M/M/c</h3>
              <p>Usa un lugar <em>"Servidores libres"</em> con <em>c</em> tokens iniciales. Una transición <em>inmediata</em> "Ini. servicio" consume un token del lugar cola y uno del lugar servidores, produciendo en "En servicio". Una transición temporizada "Fin servicio" consume de "En servicio" y produce en "Servidores libres" y "Salida".</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BtnDel({ children, onClick }) {
  return <button className="del-btn" onClick={onClick}>{children}</button>;
}
