// ─── HPetriSim Engine ─────────────────────────────────────────────────────────
// Generalized Stochastic Petri Net (GSPN) discrete-event simulation engine

/** Sample a random delay from a distribution descriptor */
export function sample(dist = {}) {
  const u = () => Math.max(1e-10, Math.random());
  switch (dist.type) {
    case 'exp':     return -Math.log(u()) / (dist.lambda || 1);
    case 'normal':  return Math.max(0, (dist.mean || 1) + (dist.std || 0.1) *
                      Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u()));
    case 'uniform': return (dist.min || 0) + u() * ((dist.max || 1) - (dist.min || 0));
    case 'const':   return dist.value || 1;
    case 'erlang': {
      let s = 0;
      for (let i = 0; i < Math.max(1, Math.round(dist.k || 2)); i++) s -= Math.log(u());
      return s / (dist.lambda || 1);
    }
    default: return 1;
  }
}

/** How many times can a transition fire given current tokens */
function maxFirings(trans, tokens, arcs) {
  const inputs = arcs.filter(a => a.to === trans.id);
  if (!inputs.length) return 0;
  let min = Infinity;
  for (const arc of inputs) {
    const have = tokens[arc.from] || 0;
    const need = arc.weight || 1;
    min = Math.min(min, Math.floor(have / need));
  }
  return Math.max(0, isFinite(min) ? min : 0);
}

function isEnabled(trans, tokens, arcs) {
  return maxFirings(trans, tokens, arcs) > 0;
}

function fireOnce(trans, tokens, arcs) {
  const t = { ...tokens };
  arcs.filter(a => a.to === trans.id).forEach(a => { t[a.from] = (t[a.from] || 0) - (a.weight || 1); });
  arcs.filter(a => a.from === trans.id).forEach(a => { t[a.to]   = (t[a.to]   || 0) + (a.weight || 1); });
  return t;
}

/** Fire all enabled immediate transitions until quiescence */
function fireImmediates(tokens, transitions, arcs, firingCount, log, simTime) {
  let cur = { ...tokens };
  let guard = 0;
  while (guard++ < 100000) {
    const enabled = transitions.filter(t => t.type === 'immediate' && isEnabled(t, cur, arcs));
    if (!enabled.length) break;
    const maxP = Math.max(...enabled.map(t => t.priority || 0));
    const pool = enabled.filter(t => (t.priority || 0) === maxP);
    const total = pool.reduce((s, t) => s + (t.weight || 1), 0);
    let r = Math.random() * total;
    let sel = pool[pool.length - 1];
    for (const t of pool) { r -= (t.weight || 1); if (r <= 0) { sel = t; break; } }
    cur = fireOnce(sel, cur, arcs);
    firingCount[sel.id] = (firingCount[sel.id] || 0) + 1;
    if (log.length < 600) log.push({ t: +simTime.toFixed(4), name: sel.name, id: sel.id });
  }
  return cur;
}

/**
 * Run a GSPN simulation.
 * @param {object} net     - { places, transitions, arcs }
 * @param {number} maxTime - simulation time horizon
 * @returns SimResult
 */
export function simulate(net, maxTime, maxIter = 1_000_000) {
  const { places, transitions, arcs } = net;

  let tokens = {};
  places.forEach(p => { tokens[p.id] = Math.max(0, p.tokens || 0); });

  let simTime   = 0;
  let lastAccT  = 0;
  let queue     = []; // { fireTime, transId, eid }
  let eidCtr    = 0;
  let iteration = 0;

  const firingCount = {};
  const tokenArea   = {};
  const log         = [];
  transitions.forEach(t => { firingCount[t.id] = 0; });
  places.forEach(p  => { tokenArea[p.id] = 0; });

  const accArea = (newTime) => {
    const dt = newTime - lastAccT;
    if (dt > 0) places.forEach(p => { tokenArea[p.id] += (tokens[p.id] || 0) * dt; });
    lastAccT = newTime;
  };

  const scheduleAll = () => {
    transitions.filter(t => t.type !== 'immediate').forEach(trans => {
      const needed = maxFirings(trans, tokens, arcs);
      const current = queue.filter(e => e.transId === trans.id).length;
      for (let i = current; i < needed; i++) {
        queue.push({ fireTime: simTime + sample(trans.dist || { type: 'exp', lambda: 1 }), transId: trans.id, eid: eidCtr++ });
      }
    });
  };

  const pruneQueue = () => {
    // Group by transition, remove excess (restart policy: drop farthest-future)
    const byTrans = {};
    queue.forEach(e => (byTrans[e.transId] = byTrans[e.transId] || []).push(e));
    const drop = new Set();
    Object.entries(byTrans).forEach(([tid, evts]) => {
      const trans = transitions.find(t => t.id === tid);
      const allowed = trans ? maxFirings(trans, tokens, arcs) : 0;
      if (evts.length > allowed) {
        evts.sort((a, b) => b.fireTime - a.fireTime).slice(0, evts.length - allowed).forEach(e => drop.add(e.eid));
      }
    });
    if (drop.size) queue = queue.filter(e => !drop.has(e.eid));
  };

  // Bootstrap
  tokens = fireImmediates(tokens, transitions, arcs, firingCount, log, simTime);
  scheduleAll();

  while (iteration++ < maxIter) {
    if (!queue.length) break;
    queue.sort((a, b) => a.fireTime - b.fireTime);
    const evt = queue.shift();
    if (evt.fireTime > maxTime) break;

    const trans = transitions.find(t => t.id === evt.transId);
    if (!trans || !isEnabled(trans, tokens, arcs)) continue;

    accArea(evt.fireTime);
    simTime = evt.fireTime;

    tokens = fireOnce(trans, tokens, arcs);
    firingCount[trans.id]++;
    if (log.length < 600) log.push({ t: +simTime.toFixed(4), name: trans.name, id: trans.id });

    tokens = fireImmediates(tokens, transitions, arcs, firingCount, log, simTime);
    pruneQueue();
    scheduleAll();
  }

  const ft = Math.min(simTime, maxTime);
  accArea(ft);

  const avgTokens = {};
  places.forEach(p => { avgTokens[p.id] = ft > 0 ? tokenArea[p.id] / ft : (tokens[p.id] || 0); });

  return { firingCount, avgTokens, finalTokens: { ...tokens }, simTime: ft, iterations: iteration, log };
}
