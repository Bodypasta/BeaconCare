/* BeaconCare – MIND & FOCUS: three short cognitive duties (ported from DEEPWATCH) that feed a transparent,
   rule-based read-out of focus and mental state. No AI/ML: every number is a formula shown on screen.
   Games: Moths (vigilance / psychomotor reaction), Charts (2-back working memory), Flags (go / no-go inhibition).
   The reference ("Ghost") and recent history are SIMULATED per scenario; plays made here are LIVE. */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc, clamp, mulberry32, STATUS } = AS.U;
  const { pill, icon } = AS.UI;
  AS.Views = AS.Views || {};

  /* ---------- configuration (kept in one place, readable by a clinician) ---------- */
  const CFG = {
    moths: { trials: 18, minGapMs: 1800, maxGapMs: 5200, windowMs: 1800, lapseMs: 500 },
    charts: { length: 24, stimulusMs: 1100, gapMs: 700, targets: 7 },
    flags: { trials: 24, noGo: 6, stimulusMs: 900, gapMs: 600 },
    ignoreTiming: false, // set true only for automated tests on slow software renderers
  };
  const SYMBOLS = ['◐', '◑', '△', '◇', '○', '□', '✕', '＋'];
  /* Reference "Ghost" per duty. ILLUSTRATIVE demonstration values for a healthy adult on a touch screen. */
  const DUTY = {
    moths: { name: 'Moths', duty: 'Vigilance', unit: 'ms', dec: 0, worse: 'high', ref: { m: 340, sd: 45 }, what: 'Reaction time (median)', how: 'Watch the glass. When a moth lands, tap anywhere as fast as you can. About one minute.' },
    charts: { name: 'Charts', duty: 'Working memory', unit: '', dec: 2, worse: 'low', ref: { m: 2.0, sd: 0.5 }, what: '2-back accuracy (d′)', how: 'Symbols appear one at a time. Press the button when a symbol matches the one shown two steps earlier. About one minute.' },
    flags: { name: 'Flags', duty: 'Holding back', unit: '%', dec: 1, worse: 'high', ref: { m: 15, sd: 8 }, what: 'Wrong-flag errors', how: 'Raise the flag for a pennant (triangle). Hold still for a swallowtail (split end). About one minute.' },
  };
  const IDS = ['moths', 'charts', 'flags'];
  /* How far outside the reference each scenario's simulated recent plays sit, in SD (worse direction). */
  const SIM_Z = { healthy: { moths: 0.1, charts: 0.0, flags: 0.1 }, abnormal: { moths: 1.5, charts: 1.3, flags: 1.2 }, critical: { moths: 3.1, charts: 2.6, flags: 2.4 } };

  /* ---------- small maths (all auditable) ---------- */
  const median = (a) => { const s = a.slice().sort((x, y) => x - y), h = Math.floor(s.length / 2); return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
  function zInv(p) { // inverse standard-normal CDF (Acklam)
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const dPrime = (h, m, fa, cr) => zInv((h + 0.5) / (h + m + 1)) - zInv((fa + 0.5) / (fa + cr + 1));
  const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---------- game forms (fully determined by a seed) ---------- */
  function mothsForm(seed) { const r = mulberry32(seed), c = CFG.moths; return Array.from({ length: c.trials }, () => ({ gapMs: Math.round(c.minGapMs + r() * (c.maxGapMs - c.minGapMs)), x: 12 + r() * 76, y: 14 + r() * 62 })); }
  function scoreMoths(rts) {
    const hits = rts.filter((x) => x !== null && x !== undefined && x >= 100), misses = rts.filter((x) => x === null).length;
    return { value: hits.length ? Math.round(median(hits)) : CFG.moths.windowMs, lapses: hits.filter((x) => x > CFG.moths.lapseMs).length + misses, misses };
  }
  function chartsForm(seed) {
    const r = mulberry32(seed), n = CFG.charts.length, pos = shuffle(Array.from({ length: n - 2 }, (_, i) => i + 2), r).slice(0, CFG.charts.targets), tgt = new Array(n).fill(false);
    pos.forEach((p) => (tgt[p] = true));
    const syms = shuffle(SYMBOLS, r), stream = [];
    for (let i = 0; i < n; i++) { if (i >= 2 && tgt[i]) stream.push(stream[i - 2]); else { let s; do s = syms[Math.floor(r() * syms.length)]; while (i >= 2 && s === stream[i - 2]); stream.push(s); } }
    return { stream, tgt };
  }
  function scoreCharts(form, resp) {
    let h = 0, m = 0, fa = 0, cr = 0;
    for (let i = 2; i < form.stream.length; i++) { if (form.tgt[i]) resp[i] ? h++ : m++; else resp[i] ? fa++ : cr++; }
    return { value: Math.round(dPrime(h, m, fa, cr) * 100) / 100, hits: h, misses: m, falseAlarms: fa };
  }
  function flagsForm(seed) { const r = mulberry32(seed), idx = shuffle(Array.from({ length: CFG.flags.trials }, (_, i) => i), r).slice(0, CFG.flags.noGo), f = new Array(CFG.flags.trials).fill(true); idx.forEach((i) => (f[i] = false)); return f; }
  function scoreFlags(form, pressed) {
    let c = 0, o = 0; form.forEach((go, i) => { if (!go && pressed[i]) c++; if (go && !pressed[i]) o++; });
    return { value: Math.round((c / CFG.flags.noGo) * 1000) / 10, commissions: c, omissions: o };
  }

  /* ---------- scoring: duty values -> z vs reference -> sub-scores -> focus, impulse, cognitive index, mental state ---------- */
  const zWorse = (id, v) => { const d = DUTY[id], z = (v - d.ref.m) / d.ref.sd; return d.worse === 'high' ? z : -z; };
  const subScore = (z) => clamp(Math.round(100 - 20 * z), 0, 100); // 0 SD = 100 · 0.75 SD worse = 85 · 1.5 SD worse = 70
  const userMind = () => { const u = AS.Store.user(); if (!u.mind) u.mind = []; return u.mind; };
  const todayPlays = () => userMind().filter((p) => p.day === AS.Model.N && !p.setAside);

  /* simulated recent plays (5 per duty) for the active scenario, identical every time */
  function simRecent(id) {
    const r = mulberry32(hash(`mind/${AS.Model.id}/${id}`)), d = DUTY[id], z = SIM_Z[AS.Model.id][id], sgn = d.worse === 'high' ? 1 : -1;
    return Array.from({ length: 5 }, () => d.ref.m + sgn * (z + (r() - 0.5) * 0.5) * d.ref.sd);
  }
  /* "Today" per duty = mean of the last five values; kept live plays replace the oldest simulated ones */
  function todayValue(id) {
    const live = userMind().filter((p) => p.game === id && !p.setAside).map((p) => p.value), all = simRecent(id).concat(live), last = all.slice(-5);
    return { value: last.reduce((s, x) => s + x, 0) / last.length, liveN: Math.min(live.length, 5) };
  }
  function readout() {
    const duties = {};
    IDS.forEach((id) => { const t = todayValue(id), z = zWorse(id, t.value); duties[id] = { id, value: t.value, liveN: t.liveN, z, sub: subScore(z), status: z <= 0.75 ? 'ok' : z <= 1.5 ? 'warn' : 'crit' }; });
    const focus = Math.round((duties.moths.sub + duties.charts.sub) / 2), impulse = duties.flags.sub, cog = Math.round((duties.moths.sub + duties.charts.sub + duties.flags.sub) / 3);
    const ms = AS.Model.measures, mood = ms.mood.value, stress = ms.stress.value, sleep = ms.sleepH.value;
    const parts = { cog: 0.5 * cog, mood: 0.2 * clamp(mood * 10, 0, 100), stress: 0.15 * clamp(100 - stress * 10, 0, 100), sleep: 0.15 * clamp((sleep / 7) * 100, 0, 100) };
    const mental = Math.round(parts.cog + parts.mood + parts.stress + parts.sleep);
    const fl = focus >= 80 ? { s: 'ok', t: 'Focused' } : focus >= 60 ? { s: 'warn', t: 'Slipping' } : { s: 'crit', t: 'Not focusing' };
    const ml = mental < 45 || (focus < 60 && (mood < 5 || stress >= 8)) || (focus < 50 && impulse < 60) ? { s: 'crit', t: 'Needs support now' } : mental >= 80 ? { s: 'ok', t: 'Steady' } : mental >= 65 ? { s: 'warn', t: 'Strained' } : { s: 'warn', t: 'Struggling' };
    const il = impulse >= 80 ? { s: 'ok', t: 'Good control' } : impulse >= 60 ? { s: 'warn', t: 'Some slips' } : { s: 'crit', t: 'Impulsive errors' };
    return { duties, focus, impulse, cog, mental, parts, fl, ml, il, mood, stress, sleep };
  }
  AS.Mind = { readout, CFG, DUTY, mothsForm, chartsForm, flagsForm, scoreMoths, scoreCharts, scoreFlags, todayPlays };

  /* ---------- view ---------- */
  let root = null, game = 'moths', last = null, timers = [], raf = 0, keyFn = null;
  const fmtV = (id, v) => Number(v).toFixed(DUTY[id].dec);
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  function stopAll() { clearTimers(); cancelAnimationFrame(raf); if (keyFn) { window.removeEventListener('keydown', keyFn); keyFn = null; } }

  function monitor() { // flags uneven frame timing so a janky device does not look like a tired astronaut
    const st = { n: 0, slow: 0 }; let lastT = performance.now(), on = true;
    const loop = (t) => { if (!on) return; st.n++; if (t - lastT > 50) st.slow++; lastT = t; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { on = false; cancelAnimationFrame(raf); return !CFG.ignoreTiming && st.n > 20 && st.slow / st.n > 0.08 ? 'check' : 'ok'; };
  }
  function bindKey(fn) { if (keyFn) window.removeEventListener('keydown', keyFn); keyFn = (e) => { if (e.code === 'Space' && root && root.querySelector('.mg-live')) { e.preventDefault(); fn(); } }; window.addEventListener('keydown', keyFn); }

  function statusOf() {
    const r = readout();
    return `<div class="mind-top">
      <div class="mind-big s-${r.ml.s}"><small>Mental state</small><b>${esc(r.ml.t)}</b><span>${r.mental}<i>/100</i></span></div>
      <div class="mind-big s-${r.fl.s}"><small>Focus</small><b>${esc(r.fl.t)}</b><span>${r.focus}<i>/100</i></span></div>
      <div class="mind-big s-${r.il.s}"><small>Impulse control</small><b>${esc(r.il.t)}</b><span>${r.impulse}<i>/100</i></span></div>
      <div class="mind-big s-${AS.Model.measures.cog.status}"><small>Cognitive index</small><b>${esc(STATUS[AS.Model.measures.cog.status].word)}</b><span>${Math.round(AS.Model.measures.cog.value)}<i> index</i></span></div>
    </div>`;
  }
  function dutyRows() {
    const r = readout();
    return IDS.map((id) => { const d = DUTY[id], t = r.duties[id], w = clamp(t.sub, 2, 100); return `<div class="mind-row">
      <div class="mr-h"><b>${d.name}</b><span class="muted">${d.duty}</span>${pill(t.status, t.status === 'ok' ? 'Within usual' : t.status === 'warn' ? 'Outside usual' : 'Well outside usual')}</div>
      <div class="mr-bar"><i style="width:${w}%" class="s-${t.status}"></i></div>
      <div class="mr-t">${d.what}: <b>${fmtV(id, t.value)} ${d.unit}</b> · reference ${fmtV(id, d.ref.m)} ${d.unit} · ${t.z <= 0 ? 'better than' : (t.z.toFixed(1) + ' SD worse than')} ${t.z <= 0 ? 'reference' : 'reference'} <span class="muted">(${t.liveN} live Watch${t.liveN === 1 ? '' : 'es'} in the last five)</span></div></div>`; }).join('');
  }
  function reasons() {
    const r = readout(), out = [], m = r.duties.moths, c = r.duties.charts, f = r.duties.flags;
    if (m.status !== 'ok') out.push(`Vigilance: median reaction time is ${fmtV('moths', m.value)} ms against a usual ${DUTY.moths.ref.m} ms – slower reactions and lapses are typical of fatigue and sleep loss.`);
    if (c.status !== 'ok') out.push(`Working memory: 2-back accuracy (d′) is ${fmtV('charts', c.value)} against a usual ${DUTY.charts.ref.m.toFixed(1)} – holding information in mind is harder than usual.`);
    if (f.status !== 'ok') out.push(`Impulse control: ${fmtV('flags', f.value)} % wrong-flag errors against a usual ${DUTY.flags.ref.m} % – more responses are happening before the decision is made.`);
    if (r.mood < 6.5) out.push(`Mood is ${r.mood.toFixed(1)}/10 (usual range from 6.5).`);
    if (r.stress > 4) out.push(`Perceived stress is ${r.stress.toFixed(1)}/10 (usual range up to 4).`);
    if (r.sleep < 7) out.push(`Sleep was ${r.sleep.toFixed(1)} h (target 7 h or more).`);
    return out;
  }
  function advice() {
    const r = readout();
    if (r.ml.s === 'crit') return { tone: 'crit', t: 'Please talk to a person now', p: 'Several indicators are well outside your usual range. This is a screening read-out, not a diagnosis. Contact the Crew Medical Officer or the flight surgeon today, and tell them how you are feeling.' };
    if (r.fl.s !== 'ok' || r.ml.s !== 'ok') return { tone: 'warn', t: 'Worth a conversation and a lighter task load', p: 'Postpone safety-critical or delicate work until focus recovers, protect your sleep window, and consider a short chat with a crewmate or the ground team. Repeat the Watch after rest.' };
    return { tone: 'ok', t: 'Nothing unusual – carry on', p: 'Your focus and mental state are within your usual range. Keep your sleep, exercise and social routines, and repeat the Watch regularly so any change is seen early.' };
  }

  function render() {
    if (!root) return;
    const a = advice(), d = DUTY[game];
    root.innerHTML = `
      <div class="page-h"><h1>Mind &amp; focus</h1><p class="muted">Three one-minute duties measure attention, memory and self-control. BeaconCare turns the results, together with your mood, stress and sleep, into a clear read-out. <span class="sim-tag">SIMULATED reference · live Watches marked LIVE</span></p></div>
      ${statusOf()}
      <div class="glass card mind-adv s-${a.tone}"><h3>${icon('info', 16)} ${esc(a.t)}</h3><p>${esc(a.p)}</p>${a.tone !== 'ok' ? `<div class="btnrow"><button class="btn primary" data-act="goto" data-to="#/investigation">Open medical investigation</button></div>` : ''}</div>
      <div class="mind-grid">
        <div class="glass card"><h3>The Watch</h3>
          <div class="seg mind-tabs" role="group" aria-label="Choose a duty">${IDS.map((id) => `<button class="${game === id ? 'on' : ''}" data-act="mind-game" data-id="${id}" aria-pressed="${game === id}">${DUTY[id].name}<small>${DUTY[id].duty}</small></button>`).join('')}</div>
          <p class="muted sm" style="margin:10px 0">${esc(d.how)}</p>
          <div id="mind-stage"></div><div id="mind-result"></div></div>
        <div class="glass card"><h3>How you compare with your usual</h3>${dutyRows()}
          <p class="muted xs">Today is the average of your last five Watches per duty. Each duty is compared with the reference in standard deviations (SD): up to 0.75 SD worse is within usual, up to 1.5 SD is outside usual, beyond that is well outside.</p></div>
      </div>
      <div class="glass card"><h3>What is driving this read-out</h3>${reasons().length ? `<ul class="bul">${reasons().map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">All inputs are within their usual range.</p>'}</div>
      <details class="glass card"><summary><b>How this is calculated</b> <span class="muted sm">· every step is a rule you can read</span></summary>
        <ol class="steps sm"><li><b>Duty value → z-score.</b> z = (today − reference mean) ÷ reference SD, signed so that positive always means worse.</li>
        <li><b>Sub-score.</b> 100 − 20 × z, limited to 0–100. So 0.75 SD worse is 85 and 1.5 SD worse is 70.</li>
        <li><b>Focus</b> = mean of Moths and Charts sub-scores (sustained attention and working memory). <b>Impulse control</b> = Flags sub-score. <b>Cognitive index</b> = mean of all three (this feeds the Nervous system on the Overview once all three duties have been kept today).</li>
        <li><b>Mental state</b> = 50 % cognitive index + 20 % mood (×10) + 15 % low stress (100 − stress × 10) + 15 % sleep (hours ÷ 7, max 100).</li>
        <li><b>Labels.</b> Focus: 80+ Focused, 60–79 Slipping, below 60 Not focusing. Mental state: 80+ Steady, 65–79 Strained, 45–64 Struggling, below 45 Needs support now – also Needs support now when focus is below 60 together with mood below 5 or stress of 8 or more, or when focus is below 50 together with impulse control below 60.</li></ol>
        <p class="muted xs">“Mental state” is a plain-language wellbeing screen, not a psychiatric assessment. Weights, reference values and thresholds are ILLUSTRATIVE demonstration settings and live in the CONFIG at the top of <code>js/view-mind.js</code>. No machine learning or AI is used.</p></details>`;
    mountGame();
    if (last && last.game === game) showResult();
    AS.UI.glossify && AS.UI.glossify(root);
  }

  /* ---------- games ---------- */
  const seedFor = (id) => hash(`${AS.Model.id}/${AS.Model.N}/${id}/${userMind().filter((p) => p.game === id && p.day === AS.Model.N).length}`);
  function mountGame() {
    const st = root.querySelector('#mind-stage'); if (!st) return;
    stopAll();
    if (game === 'moths') mothsUI(st); else if (game === 'charts') chartsUI(st); else flagsUI(st);
  }
  function finish(id, value, extra, timing) { last = { game: id, value, extra, timing, saved: false }; render(); }

  function mothsUI(st) {
    const form = mothsForm(seedFor('moths')), rts = []; let i = -1, waiting = -1, onset = 0, falseStarts = 0, stopMon = null;
    st.innerHTML = `<div class="mg-glass" id="mg" role="button" tabindex="0" aria-label="Lantern glass: tap when a moth lands"><p class="mg-msg">The glass is dark. Press Start.</p></div><div class="btnrow"><button class="btn primary" id="mg-start">Start Moths</button></div>`;
    const glass = st.querySelector('#mg');
    const next = (n) => {
      glass.querySelectorAll('.mg-moth').forEach((x) => x.remove()); i = n;
      glass.querySelector('.mg-count').textContent = `${Math.min(n + 1, form.length)} / ${form.length}`;
      if (n >= form.length) { const s = scoreMoths(rts), t = stopMon(); stopAll(); finish('moths', s.value, { lapses: s.lapses, misses: s.misses, falseStarts }, t); return; }
      later(() => {
        waiting = n; onset = 0; const m = document.createElement('span'); m.className = 'mg-moth'; m.textContent = '✦'; m.style.left = form[n].x + '%'; m.style.top = form[n].y + '%'; glass.appendChild(m);
        requestAnimationFrame(() => { onset = performance.now(); });
        later(() => { if (waiting === n) { rts[n] = null; waiting = -1; next(n + 1); } }, CFG.moths.windowMs);
      }, form[n].gapMs);
    };
    const tap = () => {
      if (i < 0) return;
      if (waiting >= 0 && onset > 0) { rts[waiting] = performance.now() - onset; const n = waiting; waiting = -1; clearTimers(); next(n + 1); }
      else if (waiting < 0) falseStarts++;
    };
    glass.addEventListener('pointerdown', tap); bindKey(tap);
    st.querySelector('#mg-start').addEventListener('click', (e) => {
      e.currentTarget.parentElement.remove(); last = null; root.querySelector('#mind-result').innerHTML = '';
      glass.classList.add('mg-live'); glass.innerHTML = '<span class="mg-count"></span>'; stopMon = monitor(); next(0);
    });
  }

  function chartsUI(st) {
    const form = chartsForm(seedFor('charts')), resp = new Array(form.stream.length).fill(false); let cur = -1, stopMon = null;
    st.innerHTML = `<div class="mg-glass mg-center" id="mg"><span class="mg-symbol"></span><span class="mg-count"></span><p class="mg-msg">Press Start, then press the button (or Space) when a symbol matches the one two steps back.</p></div><div class="btnrow" id="mg-btns"><button class="btn primary" id="mg-start">Start Charts</button></div>`;
    const glass = st.querySelector('#mg'), sym = glass.querySelector('.mg-symbol'), cnt = glass.querySelector('.mg-count');
    const press = () => { if (cur >= 2) resp[cur] = true; };
    const step = (n) => {
      if (n >= form.stream.length) { cur = -1; const s = scoreCharts(form, resp), t = stopMon(); stopAll(); finish('charts', s.value, { hits: s.hits, misses: s.misses, falseAlarms: s.falseAlarms }, t); return; }
      cur = n; cnt.textContent = `${n + 1} / ${form.stream.length}`; sym.textContent = form.stream[n];
      later(() => { sym.textContent = ''; later(() => step(n + 1), CFG.charts.gapMs); }, CFG.charts.stimulusMs);
    };
    bindKey(press);
    st.querySelector('#mg-start').addEventListener('click', () => {
      last = null; root.querySelector('#mind-result').innerHTML = ''; glass.classList.add('mg-live'); glass.querySelector('.mg-msg').remove();
      st.querySelector('#mg-btns').innerHTML = '<button class="btn primary wide" id="mg-press">Same as two back</button>';
      st.querySelector('#mg-press').addEventListener('pointerdown', press); stopMon = monitor(); step(0);
    });
  }

  const flagSvg = (go) => `<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true"><line x1="30" y1="12" x2="30" y2="112" stroke="currentColor" stroke-width="3" opacity=".7"/>${go ? '<path d="M33 16 L100 40 L33 64 Z" fill="#5aa79a"/>' : '<path d="M33 16 H100 L84 40 L100 64 H33 Z" fill="#d1a85a"/>'}</svg>`;
  function flagsUI(st) {
    const form = flagsForm(seedFor('flags')), pressed = new Array(form.length).fill(false); let cur = -1, stopMon = null;
    st.innerHTML = `<div class="mg-glass mg-center" id="mg"><span class="mg-flag"></span><span class="mg-count"></span><p class="mg-msg">Pennant: raise the flag. Swallowtail: hold still.</p></div><div class="btnrow" id="mg-btns"><button class="btn primary" id="mg-start">Start Flags</button></div>`;
    const glass = st.querySelector('#mg'), fl = glass.querySelector('.mg-flag'), cnt = glass.querySelector('.mg-count');
    const press = () => { if (cur >= 0) pressed[cur] = true; };
    const step = (n) => {
      if (n >= form.length) { cur = -1; const s = scoreFlags(form, pressed), t = stopMon(); stopAll(); finish('flags', s.value, { commissions: s.commissions, omissions: s.omissions }, t); return; }
      cur = n; cnt.textContent = `${n + 1} / ${form.length}`; fl.innerHTML = flagSvg(form[n]);
      later(() => { fl.innerHTML = ''; later(() => step(n + 1), CFG.flags.gapMs); }, CFG.flags.stimulusMs);
    };
    bindKey(press);
    st.querySelector('#mg-start').addEventListener('click', () => {
      last = null; root.querySelector('#mind-result').innerHTML = ''; glass.classList.add('mg-live'); glass.querySelector('.mg-msg').remove();
      st.querySelector('#mg-btns').innerHTML = '<button class="btn primary wide" id="mg-press">Raise the flag</button>';
      st.querySelector('#mg-press').addEventListener('pointerdown', press); stopMon = monitor(); step(0);
    });
  }

  function showResult() {
    const el = root.querySelector('#mind-result'); if (!el || !last) return;
    const d = DUTY[last.game], z = zWorse(last.game, last.value), st = z <= 0.75 ? 'ok' : z <= 1.5 ? 'warn' : 'crit';
    const ex = Object.entries(last.extra).map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${v}`).join(' · ');
    el.innerHTML = `<div class="mind-res"><h4>This Watch ${pill(st, st === 'ok' ? 'Within usual' : st === 'warn' ? 'Outside usual' : 'Well outside usual')} <span class="live-tag">LIVE</span></h4>
      <p class="bignum">${fmtV(last.game, last.value)} <small>${d.unit}</small></p><p class="muted sm">${esc(d.what)} · reference ${fmtV(last.game, d.ref.m)} ${d.unit} · ${esc(ex)}</p>
      ${last.timing === 'check' ? '<p class="note-box warn">The screen timing looked uneven during this Watch, so it will not be kept. Close other tabs and try again.</p>' : ''}
      <div class="btnrow">${last.timing === 'check' ? '' : last.saved ? '<span class="saved">Kept – your read-out has been updated.</span>' : '<button class="btn primary" data-act="mind-keep">Keep this Watch</button>'}<button class="btn" data-act="mind-again">Play again</button></div></div>`;
  }

  /* ---------- actions ---------- */
  AS.act['mind-game'] = (t) => { game = t.dataset.id; last = null; render(); };
  AS.act['mind-again'] = () => { last = null; render(); };
  AS.act['mind-keep'] = () => {
    if (!last || last.saved || last.timing === 'check') return;
    userMind().push({ id: Date.now() + '-' + last.game, day: AS.Model.N, ts: Date.now(), game: last.game, value: last.value, extra: last.extra });
    AS.Store.save(); last.saved = true;
    const done = IDS.every((id) => todayPlays().some((p) => p.game === id));
    if (done) { AS.Engine.addMeasurement('cog', readout().cog); } else { AS.emit('model'); }
    AS.UI.toast({ sev: 'info', title: 'Watch kept', body: done ? 'All three duties are in – your cognitive index now feeds the Nervous system.' : 'Play the other duties to update the cognitive index.' });
  };

  AS.Views.mind = {
    mount(el) { root = el; game = 'moths'; last = null; render(); },
    update() { if (root && !root.querySelector('.mg-live')) { const y = window.scrollY; render(); window.scrollTo(0, y); } },
    destroy() { stopAll(); root = null; },
  };
  AS.on && AS.on('model-reset', () => { last = null; });
})();
