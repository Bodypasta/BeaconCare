/* BeaconCare – state, mission clock, health model, transparent risk engine.
   Everything here is rule-based and explainable. No AI/ML. */
(function () {
  const AS = (window.AS = window.AS || {});
  const { clamp, mean, worst, pad2 } = AS.U;
  const { M, SYSTEMS, SCENARIOS, evalMetric } = AS.D;
  const C = AS.C;
  const RAD_BUDGET = 120; // illustrative mission dose budget (mSv) – NOT a NASA limit

  /* ---------- tiny event bus ---------- */
  const bus = {};
  AS.on = (e, f) => { (bus[e] = bus[e] || []).push(f); };
  AS.emit = (e, a) => (bus[e] || []).forEach((f) => { try { f(a); } catch (err) { console.error(err); } });

  /* ---------- persistent store (localStorage; swap for IndexedDB / backend later) ---------- */
  const KEY = 'astra.v1';
  let S = { scenario: 'healthy', clockOffset: 0, settings: { wake: '06:30', sleep: '22:30' }, per: {}, firstRun: true };
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
  // v2 migration: discard user-entered state saved by earlier builds so no stale symptom reports resurface as alerts
  if (S.rev !== 2 && !S.firstRun) { S.per = {}; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  S.rev = 2;
  const blankUser = () => ({ checkups: [], pain: [], dayEdits: {}, actions: {}, extraActions: [], exLog: {}, measLog: [], sympSel: {}, read: {}, delivered: {}, moodLog: [], wear: [], mind: [] });
  const Store = {
    get: () => S,
    user(id) { id = id || S.scenario; if (!S.per[id]) S.per[id] = blankUser(); return S.per[id]; },
    save: AS.U.debounce(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }, 250),
    saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } },
    resetScenario(id) { delete S.per[id]; this.saveNow(); },
    resetAll() { S = { scenario: 'healthy', clockOffset: 0, settings: { wake: '06:30', sleep: '22:30' }, per: {}, firstRun: false, rev: 2 }; this.saveNow(); },
  };

  /* ---------- mission clock (spacecraft time = GMT; independent of Earth local time) ---------- */
  const Clock = {
    now() { return new Date(Date.now() + (S.clockOffset || 0)); },
    minutes() { const n = this.now(); return n.getUTCHours() * 60 + n.getUTCMinutes(); },
    hhmm(d) { d = d || this.now(); return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()); },
    hhmmss(d) { d = d || this.now(); return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds()); },
    jumpTo(hhmm) { const [h, m] = hhmm.split(':').map(Number); const n = new Date(); const cur = n.getUTCHours() * 3600e3 + n.getUTCMinutes() * 60e3 + n.getUTCSeconds() * 1e3; S.clockOffset = (h * 3600e3 + m * 60e3) - cur; Store.saveNow(); AS.emit('clock'); },
    reset() { S.clockOffset = 0; Store.saveNow(); AS.emit('clock'); },
    parse: (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
  };

  /* ---------- scenario records ---------- */
  const baseCache = {};
  function baseRecords(id) { if (!baseCache[id]) { baseCache[id] = SCENARIOS[id].gen(); SCENARIOS[id].N = baseCache[id].length; } return baseCache[id]; }

  function mergedRecords(id) {
    const user = Store.user(id), N = baseRecords(id).length;
    return baseRecords(id).map((r) => {
      const c = Object.assign({}, r, { micro: Object.assign({}, r.micro), lab: r.lab ? Object.assign({}, r.lab) : undefined });
      const e = user.dayEdits[c.d];
      if (e) { for (const k in e) { if (k === 'lab') c.lab = Object.assign({}, c.lab, e.lab); else c[k] = e[k]; } c.edited = true; }
      if (c.d === N && user.exLog[N]) {
        user.exLog[N].forEach((eid) => { const ex = C.EXERCISES.find((x) => x.id === eid); if (!ex) return; c.exMin += ex.min; if (ex.cls !== 'aerobic') c.resMin += ex.min; });
      }
      return c;
    });
  }

  const VITALS = ['hr', 'sbp', 'dbp', 'spo2', 'temp', 'rr', 'hrv'];
  const AVG7 = ['sleepH', 'sleepQ', 'wake', 'stress', 'mood', 'cog', 'exMin', 'resMin', 'kcal', 'protein', 'carbs', 'fat', 'hydration', 'social', 'steps'];
  const LABS = ['wbc', 'hb', 'vitD', 'glucose', 'uCa', 'bmd', 'muscle', 'strength'];
  const wmean = (recs, key, end, len) => { const a = []; for (let i = Math.max(1, end - len + 1); i <= end; i++) { const v = recs[i - 1][key]; if (v != null) a.push(v); } return mean(a); };
  const latestLab = (recs, d) => { for (let i = d; i >= 1; i--) if (recs[i - 1].lab) return recs[i - 1].lab; return {}; };
  const radCum = (recs, d) => { let s = 0; for (let i = 0; i < d; i++) s += recs[i].rad; return s; };

  function valueAt(key, d, recs, base, live) {
    if (VITALS.includes(key)) return live && live[key] != null ? live[key] : recs[d - 1][key];
    if (AVG7.includes(key)) return wmean(recs, key, d, 7);
    if (key === 'anx' || key === 'phq') return Math.round(wmean(recs, key, d, 7));
    if (LABS.includes(key)) return latestLab(recs, d)[key];
    if (key === 'weight') return wmean(recs, 'weight', d, 3);
    if (key === 'wtChg') return ((wmean(recs, 'weight', d, 3) - base.weight) / base.weight) * 100;
    if (key === 'rad') return recs[d - 1].rad;
    if (key === 'radPct') return (radCum(recs, d) / RAD_BUDGET) * 100;
    return recs[d - 1][key];
  }
  function baselineOf(recs) {
    const k = Math.min(7, recs.length), b = {};
    ['hr', 'sbp', 'dbp', 'spo2', 'temp', 'rr', 'hrv', 'sleepH', 'sleepQ', 'exMin', 'resMin', 'weight', 'kcal', 'protein', 'hydration', 'stress', 'mood', 'cog', 'social', 'steps'].forEach((key) => { b[key] = mean(recs.slice(0, k).map((r) => r[key])); });
    return b;
  }

  /* ---------- risk indicators (transparent) ---------- */
  const IND = [
    { id: 'hr', key: 'hr', dir: 1, abs: [8, 15, 25], label: 'Resting heart rate', unit: 'bpm', sys: ['cardiovascular'], w: 1 },
    { id: 'sbp', key: 'sbp', dir: 1, abs: [8, 15, 30], label: 'Systolic blood pressure', unit: 'mmHg', sys: ['cardiovascular'], w: 1 },
    { id: 'sleep', key: 'sleepH', dir: -1, abs: [0.75, 1.5, 2.5], label: 'Sleep duration', unit: 'h', sys: ['nervous', 'immune'], w: 1, dec: 1 },
    { id: 'act', key: 'exMin', dir: -1, rel: [0.25, 0.5, 0.75], label: 'Exercise time', unit: 'min', sys: ['muscular', 'cardiovascular'], w: 1 },
    { id: 'res', key: 'resMin', dir: -1, rel: [0.3, 0.6, 0.85], label: 'Resistance training', unit: 'min', sys: ['muscular', 'skeletal'], w: 1 },
    { id: 'mood', key: 'mood', dir: -1, abs: [1.2, 2.5, 4], label: 'Mood', unit: '/10', sys: ['nervous'], w: 1, dec: 1 },
    { id: 'stress', key: 'stress', dir: 1, abs: [1.5, 3, 5], label: 'Perceived stress', unit: '/10', sys: ['nervous'], w: 1, dec: 1 },
    { id: 'cog', key: 'cog', dir: -1, abs: [5, 10, 20], label: 'Cognitive performance', unit: 'idx', sys: ['nervous'], w: 1 },
    { id: 'wt', key: 'weight', dir: -1, rel: [0.02, 0.04, 0.07], label: 'Body mass', unit: 'kg', sys: ['digestive', 'muscular', 'endocrine'], w: 1, dec: 1 },
    { id: 'prot', key: 'protein', dir: -1, rel: [0.15, 0.3, 0.5], label: 'Protein intake', unit: 'g', sys: ['digestive', 'muscular'], w: 0.5 },
    { id: 'kcal', key: 'kcal', dir: -1, rel: [0.1, 0.2, 0.35], label: 'Energy intake', unit: 'kcal', sys: ['digestive'], w: 0.5 },
    { id: 'water', key: 'hydration', dir: -1, rel: [0.15, 0.3, 0.5], label: 'Hydration', unit: 'L', sys: ['urinary'], w: 0.5, dec: 1 },
    { id: 'social', key: 'social', dir: -1, rel: [0.3, 0.55, 0.8], label: 'Social interaction', unit: 'min', sys: ['nervous'], w: 0.5 },
    { id: 'rr', key: 'rr', dir: 1, abs: [2, 5, 9], label: 'Respiratory rate', unit: '/min', sys: ['respiratory'], w: 1 },
    { id: 'spo2', key: 'spo2', dir: -1, abs: [1.5, 3, 6], label: 'Blood oxygen', unit: '%', sys: ['respiratory'], w: 1, dec: 1 },
    { id: 'hrv', key: 'hrv', dir: -1, rel: [0.15, 0.3, 0.5], label: 'Heart-rate variability', unit: 'ms', sys: ['cardiovascular', 'nervous'], w: 0.5 },
  ];
  AS.IND = IND;
  const WIN = 7;

  function evalAt(recs, base, d) {
    const out = { d, lv: {}, val: {}, pts: 0 };
    IND.forEach((ind) => {
      const cur = wmean(recs, ind.key, d, WIN), b = base[ind.key];
      if (cur == null || b == null) { out.lv[ind.id] = 0; return; }
      const th = ind.abs || ind.rel;
      const delta = ind.rel ? (ind.dir * (cur - b)) / b : ind.dir * (cur - b);
      let lv = 0; th.forEach((t) => { if (delta >= t) lv++; });
      out.lv[ind.id] = lv; out.val[ind.id] = { cur, base: b, delta: cur - b, rel: (cur - b) / b, mag: delta };
      out.pts += lv * ind.w;
    });
    return out;
  }

  const fv = (ind, v) => (v == null ? '—' : v.toFixed(ind.dec || 0));
  function evidence(ev, ids) {
    return ids.filter((id) => ev.lv[id] >= 1).map((id) => {
      const ind = IND.find((i) => i.id === id), v = ev.val[id], arrow = v.cur > v.base ? '↑' : '↓';
      const pct = Math.abs(v.rel * 100).toFixed(0);
      return `${ind.label}: ${fv(ind, v.cur)} ${ind.unit} (7-day mean) vs baseline ${fv(ind, v.base)} ${arrow} ${pct}%`;
    });
  }
  const cnt = (ev, ids) => ids.filter((i) => ev.lv[i] >= 1).length;

  const PATTERNS = [
    { id: 'strain', title: 'Combined physiological & behavioural strain pattern', sys: ['cardiovascular', 'nervous', 'muscular'],
      test: (ev) => cnt(ev, ['hr', 'sleep', 'act']) + (ev.lv.mood >= 1 || ev.lv.stress >= 1 ? 1 : 0) >= 3, ids: ['hr', 'sleep', 'act', 'mood', 'stress', 'sbp', 'hrv'],
      why: 'Several independent indicators moved in a concerning direction at the same time (sleep, resting heart rate, activity, mood/stress). Each change alone may fall inside a normal range, but together they form a recognised early-warning pattern of accumulating strain.',
      rec: ['Review the sleep schedule and workload with the flight surgeon / onboard medical officer.', 'Repeat resting HR and BP at each checkup for the next 7 days.', 'Protect sleep (consistent window) and keep scheduled exercise.', 'Increase deliberate crew contact and relaxation time.'] },
    { id: 'decond', title: 'Musculoskeletal deconditioning pattern', sys: ['muscular', 'skeletal'],
      test: (ev, c) => ev.lv.res >= 1 && (c.muscle < 97 || c.strength < 95 || c.bmd < 98), ids: ['res', 'act', 'prot'],
      why: 'Resistance training has fallen below your own baseline while the muscle, strength or bone indices are drifting down. Without mechanical loading, muscle and bone are lost faster in microgravity.',
      rec: ['Review the resistance programme with the exercise physiologist / flight surgeon.', 'Prioritise ARED squat, deadlift and heel raises.', 'Check protein and vitamin D / calcium intake.'] },
    { id: 'nutrition', title: 'Inadequate nutrition pattern', sys: ['digestive', 'endocrine', 'muscular'],
      test: (ev, c) => (ev.lv.prot >= 1 || ev.lv.kcal >= 1) && (ev.lv.wt >= 1 || c.vitD < 30), ids: ['prot', 'kcal', 'wt', 'water'],
      why: 'Protein and/or energy intake is repeatedly below your baseline together with body-mass loss or a low vitamin D level. Nutrition underpins muscle, bone and immune health.',
      rec: ['Request a nutritional assessment by the crew dietitian.', 'Record every meal in the evening checkup.', 'Raise protein-rich food choices; review menu variety and appetite.'] },
    { id: 'immune', title: 'Immune stress pattern', sys: ['immune', 'nervous'],
      test: (ev, c) => ev.lv.sleep >= 1 && ev.lv.stress >= 1 && (c.wbcRel >= 0.3 || c.temp > 37.2), ids: ['sleep', 'stress'],
      why: 'Sleep loss and stress are present together with a rising white-cell count (or temperature). Both sleep and stress modulate immune function, and viral reactivation is documented in spaceflight.',
      rec: ['Prioritise sleep recovery and stress reduction.', 'Watch for fever, rash, sore throat; report early to the onboard medical officer.', 'Repeat the blood count at the next scheduled panel.'] },
    { id: 'behav', title: 'Behavioural-health follow-up indicated', sys: ['nervous'],
      test: (ev, c) => ev.lv.mood >= 1 && ev.lv.social >= 1 && (c.anx >= 3 || c.phq >= 3), ids: ['mood', 'social', 'stress', 'sleep'],
      why: 'Mood and social contact have fallen from your baseline and a brief screening questionnaire is positive. Screening scores are NOT a diagnosis – they indicate that a conversation with the psychological-support team is advisable.',
      rec: ['Schedule a private conference with the behavioural-health support team.', 'Plan daily crew meals and a recreational activity.', 'Use the breathing exercise and keep a structured daily routine.'] },
  ];

  /* ---------- the model ---------- */
  function compute(id, live) {
    const sc = SCENARIOS[id], user = Store.user(id), recs = mergedRecords(id), N = recs.length, base = baselineOf(recs);
    const liveV = live || null;
    const cur = {};
    const keys = Object.keys(M);
    keys.forEach((k) => { cur[k] = valueAt(k, N, recs, base, liveV); });
    cur.radCum = radCum(recs, N);
    const lab = latestLab(recs, N);
    const labPrev = (() => { for (let i = Math.max(1, N - 14); i >= 1; i--) if (recs[i - 1].lab) return recs[i - 1].lab; return recs.find((r) => r.lab).lab; })();
    cur.wbcRel = labPrev.wbc ? (lab.wbc - recs.find((r) => r.lab).lab.wbc) / recs.find((r) => r.lab).lab.wbc : 0;
    const ctx = { muscle: cur.muscle, strength: cur.strength, bmd: cur.bmd, vitD: cur.vitD, wbcRel: cur.wbcRel, temp: cur.temp, anx: cur.anx, phq: cur.phq };

    // measures
    const measures = {};
    keys.forEach((k) => { const e = evalMetric(k, cur[k]); measures[k] = Object.assign({ key: k, value: cur[k] }, M[k], e); });

    // risk series & pattern findings
    const evNow = evalAt(recs, base, N);
    const riskSeries = [];
    for (let d = 8; d <= N; d++) riskSeries.push({ d, pts: evalAt(recs, base, d).pts });
    const findings = [];
    PATTERNS.forEach((p) => {
      const ctxAt = (d) => ({ muscle: valueAt('muscle', d, recs, base), strength: valueAt('strength', d, recs, base), bmd: valueAt('bmd', d, recs, base), vitD: valueAt('vitD', d, recs, base), wbcRel: (() => { const l = latestLab(recs, d), f = recs.find((r) => r.lab).lab; return (l.wbc - f.wbc) / f.wbc; })(), temp: recs[d - 1].temp, anx: valueAt('anx', d, recs, base), phq: valueAt('phq', d, recs, base) });
      if (N >= 8 && p.test(evNow, ctx)) {
        let since = N; for (let d = N - 1; d >= 8; d--) { if (p.test(evalAt(recs, base, d), ctxAt(d))) since = d; else break; }
        findings.push({ id: p.id, title: p.title, sev: 'warn', systems: p.sys, since, evidence: evidence(evNow, p.ids), why: p.why, rec: p.rec, kind: 'pattern' });
      }
    });
    // radiation budget
    const radPct = cur.radPct;
    if (radPct >= 50) findings.push({ id: 'radiation', title: radPct >= 80 ? 'Radiation budget – caution level reached' : 'Radiation budget – advisory level reached', sev: radPct >= 80 ? 'crit' : 'warn', systems: ['immune', 'nervous', 'cardiovascular', 'skeletal'], since: (() => { let s = N; for (let d = N; d >= 1; d--) { if (radCum(recs, d) / RAD_BUDGET * 100 >= 50) s = d; else break; } return s; })(), kind: 'radiation',
      evidence: [`Cumulative dose ${cur.radCum.toFixed(1)} mSv = ${radPct.toFixed(0)} % of the illustrative ${RAD_BUDGET} mSv mission budget`, 'Advisory ≥50 %, caution ≥80 % (BeaconCare demonstration levels – set by mission planners, not NASA limits)'],
      why: 'Radiation dose accumulates through the mission. Crossing the advisory level means remaining mission dose should be planned more carefully (storm-shelter discipline, shielding, schedule).', rec: ['Review the dose plan with mission radiation operations.', 'Follow storm-shelter protocol during solar particle events.', 'Prefer better-shielded areas for sleep and rest where possible.'] });
    // missed checkups in last 7 days
    const missed7 = recs.slice(-7).reduce((s, r) => s + (r.chkM ? 0 : 1) + (r.chkE ? 0 : 1), 0);
    if (missed7 >= 4) findings.push({ id: 'missedchk', title: 'Frequent missed checkups', sev: 'warn', systems: ['nervous'], since: N, kind: 'adherence', evidence: [`${missed7} of the last 14 scheduled checkups were missed`], why: 'Skipped checkups reduce monitoring confidence, so BeaconCare may detect problems later.', rec: ['Re-anchor checkups to fixed daily events (after wake-up, before sleep).', 'Adjust the wake/sleep schedule in settings if the windows do not fit the timeline.'] });

    // systems
    const sysState = {};
    SYSTEMS.forEach((def) => {
      const ms = def.metrics.map((k) => measures[k]);
      let status = 'ok'; ms.forEach((m) => { status = worst(status, m.status); });
      sysState[def.id] = { id: def.id, def, measures: ms, status, findings: [], pain: [] };
    });
    findings.forEach((f) => f.systems.forEach((s) => { const st = sysState[s]; if (st) { st.findings.push(f); st.status = worst(st.status, f.sev === 'crit' ? 'crit' : 'warn'); } }));
    // reported pain / symptoms for today
    const pains = [].concat(sc.painRecords.map((p) => Object.assign({ id: p.id, ts: null }, p)), user.pain).filter((p) => p.day === N);
    pains.forEach((p) => {
      const t = C.INV[p.topic]; if (!t) return;
      t.systems.forEach((s, i) => {
        const st = sysState[s]; if (!st) return;
        const lvl = p.level === 'emergency' ? (i < 2 ? 'crit' : 'warn') : 'warn';
        if (p.level === 'emergency' || p.severity >= 4 || i === 0) { st.pain.push(p); st.status = worst(st.status, lvl); }
      });
    });

    // acute vitals findings (live)
    const critSys = SYSTEMS.filter((s) => sysState[s.id].measures.some((m) => m.status === 'crit' && VITALS.includes(m.key)));
    critSys.forEach((s) => {
      const bad = sysState[s.id].measures.filter((m) => m.status !== 'ok').map((m) => `${m.label}: ${m.value.toFixed(m.dec)} ${m.unit} (reference ${m.ref.split('.')[0]})`);
      findings.unshift({ id: 'acute_' + s.id, title: `Critically abnormal ${s.name.toLowerCase()} readings`, sev: 'crit', systems: [s.id], since: N, emergency: true, kind: 'acute', evidence: bad.concat(pains.filter((p) => p.level === 'emergency').map((p) => `Reported: ${p.note || C.INV[p.topic].title} (${p.severity}/10)`)),
        why: 'One or more live vital signs are outside the BeaconCare critical band for this system. Together with reported symptoms this is a potentially life-threatening situation. BeaconCare does not diagnose – it escalates.', rec: ['Follow the mission emergency medical protocol now.', 'Contact the onboard Crew Medical Officer and the flight surgeon immediately.'] });
    });

    // risk score (transparent): sum of indicator points + acute + pattern bonus
    let pts = evNow.pts;
    const comps = IND.map((ind) => ({ id: ind.id, label: ind.label, lv: evNow.lv[ind.id], pts: evNow.lv[ind.id] * ind.w, v: evNow.val[ind.id], ind })).filter((c) => c.lv > 0);
    const bonus = findings.some((f) => f.id === 'strain') ? 3 : 0;
    const acute = critSys.length * 10;
    pts += bonus + acute;
    const score = clamp(Math.round((pts / 30) * 100), 0, 100);
    const cat = score >= 70 ? 'HIGH' : score >= 45 ? 'ELEVATED' : score >= 20 ? 'MODERATE' : 'LOW';
    const prevScore = riskSeries.length > 7 ? clamp(Math.round((riskSeries[riskSeries.length - 8].pts / 30) * 100), 0, 100) : null;
    const risk = { score, cat, pts, bonus, acute, comps, prevScore, series: riskSeries.map((r) => ({ d: r.d, v: clamp(Math.round((r.pts / 30) * 100), 0, 100) })) };
    const trend = sc.emergency || critSys.length ? 'acute' : prevScore == null ? 'stable' : score - prevScore <= -5 ? 'improving' : score - prevScore >= 5 ? 'deteriorating' : 'stable';

    // overall
    let overall = 'ok'; Object.values(sysState).forEach((s) => { overall = worst(overall, s.status); });
    const emergency = overall === 'crit' && (critSys.length > 0 || pains.some((p) => p.level === 'emergency'));

    // detected items for the Medical Investigation tab
    const detected = [], seen = new Set();
    const sinceOf = (key) => { let s = N + 1; for (let d = N; d >= 1; d--) { if (evalMetric(key, valueAt(key, d, recs, base)).status !== 'ok') s = d; else break; } return s; };
    const wake = Clock.parse(S.settings.wake);
    SYSTEMS.forEach((def) => {
      sysState[def.id].measures.forEach((m) => {
        if (m.status === 'ok' || seen.has(m.key)) return; seen.add(m.key);
        const since = Math.min(N, sinceOf(m.key));
        let tm = pad2(Math.floor((wake + 30) / 60) % 24) + ':' + pad2((wake + 30) % 60);
        if (since === N && VITALS.includes(m.key)) { const t = new Date(Clock.now().getTime() - (sc.onsetMinAgo || 0) * 60e3); tm = Clock.hhmm(t); }
        detected.push({ id: 'm:' + m.key, kind: 'measure', sys: def.id, status: m.status, title: `${m.label} ${m.dir === 'high' ? 'above' : 'below'} reference`, key: m.key, m, since, time: tm });
      });
    });
    findings.forEach((f) => { detected.push({ id: 'f:' + f.id, kind: f.kind, sys: f.systems[0], status: f.sev, title: f.title, f, since: f.since, time: Clock.hhmm(new Date(Date.UTC(2000, 0, 1, Math.floor((wake + 30) / 60) % 24, (wake + 30) % 60))) }); });
    pains.forEach((p) => { const t = C.INV[p.topic]; if (t) detected.push({ id: 'p:' + p.id, kind: 'symptom', sys: t.systems[0], status: p.level === 'emergency' ? 'crit' : 'warn', title: `Reported ${t.title.toLowerCase()} (${p.severity}/10)`, p, since: p.day, time: p.hh != null ? pad2(Math.floor(p.hh)) + ':' + pad2(Math.round((p.hh % 1) * 60)) : Clock.hhmm(new Date(Clock.now().getTime() - (sc.onsetMinAgo || 0) * 60e3)) }); });
    detected.sort((a, b) => AS.U.STATUS[b.status].rank - AS.U.STATUS[a.status].rank);

    // actions
    const acts = sc.actions.map((a) => Object.assign({}, a, user.actions[a.id] || {})).concat(user.extraActions.map((a) => Object.assign({}, a, user.actions[a.id] || {})));
    acts.forEach((a) => {
      if (a.status === 'pending' && a.dueDay && a.dueDay < N) a.status = 'missed';
      if (a.metric && a.startDay && N - a.startDay >= 2) {
        const before = wmean(recs, a.metric, a.startDay - 1, 7), after = wmean(recs, a.metric, N, Math.min(7, N - a.startDay + 1));
        const good = M[a.metric] && M[a.metric].ok ? (M[a.metric].ok[0] > 0 && ['hr', 'sbp', 'dbp', 'stress'].indexOf(a.metric) < 0) : true;
        const dir = ['stress', 'hr', 'sbp', 'dbp'].includes(a.metric) ? -1 : 1;
        a.effect = { before, after, delta: after - before, improved: dir * (after - before) > 0, metric: a.metric };
      }
    });

    // insights from history ("learning" by simple, visible rules)
    const insights = buildInsights(recs, N, base, acts);

    const model = { id, sc, N, user, recs, base, cur, measures, systems: sysState, findings, risk, trend, overall, emergency, detected, actions: acts, insights, pains, radCum: cur.radCum, radPct, RAD_BUDGET, lab };
    model.sig = SYSTEMS.map((s) => sysState[s.id].status).join('') + findings.map((f) => f.id).join(',') + overall + detected.map((d) => d.id).join('|');
    return model;
  }

  function buildInsights(recs, N, base, acts) {
    const out = [], last7 = recs.slice(-7), last14 = recs.slice(-14);
    const protLow = last7.filter((r) => r.protein < 90).length;
    if (protLow >= 4) out.push({ id: 'i_prot', sys: 'digestive', title: `Protein intake below target on ${protLow} of the last 7 days`, detail: 'Repeated shortfalls limit muscle protein synthesis. BeaconCare recommends a nutritional assessment.', action: { title: 'Request nutritional assessment (protein)', cls: 'FOLLOW-UP', sys: 'digestive', metric: 'protein' } });
    const resDays = last14.filter((r) => r.resMin >= 30).length;
    if (resDays < 6) out.push({ id: 'i_res', sys: 'muscular', title: `Only ${resDays} resistance sessions in the last 14 days`, detail: 'Insufficient resistance training – recommend reviewing the exercise schedule (target ≥ 4 sessions/week).', action: { title: 'Review and rebuild the resistance schedule', cls: 'PREVENTIVE', sys: 'muscular', metric: 'resMin' } });
    const slLow = last7.filter((r) => r.sleepH < 6.5).length;
    if (slLow >= 4) out.push({ id: 'i_sleep', sys: 'nervous', title: `Sleep under 6.5 h on ${slLow} of the last 7 nights`, detail: 'Chronic short sleep affects cognition, mood and immunity. Review schedule, light, noise and evening routine.', action: { title: 'Sleep-schedule and environment review', cls: 'PREVENTIVE', sys: 'nervous', metric: 'sleepH' } });
    const wLow = last7.filter((r) => r.hydration < 1.8).length;
    if (wLow >= 3) out.push({ id: 'i_water', sys: 'urinary', title: `Hydration below 1.8 L on ${wLow} of the last 7 days`, detail: 'Low fluid intake plus bone-calcium loss raises renal-stone risk.', action: { title: 'Increase fluid intake and log it', cls: 'PREVENTIVE', sys: 'urinary', metric: 'hydration' } });
    const socLow = last7.filter((r) => r.social < 50).length;
    if (socLow >= 4) out.push({ id: 'i_social', sys: 'nervous', title: `Limited crew interaction on ${socLow} of the last 7 days`, detail: 'Social contact is a key countermeasure for isolation and confinement.', action: { title: 'Daily shared meal and recreation time', cls: 'PREVENTIVE', sys: 'nervous', metric: 'social' } });
    const chkMiss = last7.reduce((s, r) => s + (r.chkM ? 0 : 1) + (r.chkE ? 0 : 1), 0);
    if (chkMiss >= 3) out.push({ id: 'i_chk', sys: 'nervous', title: `${chkMiss} checkups missed in the last 7 days`, detail: 'Consistent checkups improve early detection.', action: { title: 'Complete both daily checkups for 7 days', cls: 'PREVENTIVE', sys: 'nervous' } });
    const existing = new Set(acts.map((a) => a.title));
    return out.filter((i) => !existing.has(i.action.title));
  }

  /* ---------- checkup windows (mission time) ---------- */
  function checkups() {
    const st = S.settings, N = AS.Model.N, user = AS.Model.user, sc = AS.Model.sc;
    const wake = Clock.parse(st.wake), sleep = Clock.parse(st.sleep), now = Clock.minutes();
    const mEnd = wake + 180, eStart = Math.max(mEnd + 60, sleep - 120);
    const doneM = !!user.checkups.find((c) => c.day === N && c.type === 'morning') || (sc.todayMorningDone && !user.checkups.some((c) => c.day === N && c.type === 'morning' && c.undone));
    const doneE = !!user.checkups.find((c) => c.day === N && c.type === 'evening');
    const stat = (done, start, end) => (done ? 'done' : now >= start && now <= end ? 'open' : now < start ? 'upcoming' : 'missed');
    const fm = (m) => pad2(Math.floor(m / 60) % 24) + ':' + pad2(m % 60);
    return { morning: { status: stat(doneM, wake, mEnd), start: fm(wake), end: fm(mEnd) }, evening: { status: stat(doneE, eStart, sleep), start: fm(eStart), end: fm(sleep) }, done: (doneM ? 1 : 0) + (doneE ? 1 : 0), now: fm(now) };
  }

  /* ---------- investigation engine (rule-based) ---------- */
  const PREVENT = {
    cardiovascular: ['Keep the scheduled aerobic exercise (cycle / treadmill) to maintain cardiovascular conditioning.', 'Maintain fluid intake and a consistent sleep window.', 'Limit very high-sodium food choices when BP is trending up.'],
    respiratory: ['Check cabin CO₂ / O₂ monitors and ventilation.', 'Practise slow diaphragmatic breathing.', 'Report any new cough or breathlessness early.'],
    nervous: ['Fixed sleep window; wind-down routine 60 min before sleep.', 'Daily crew contact and a structured schedule.', 'Use the breathing / relaxation exercises in BeaconCare.'],
    skeletal: ['Complete ARED squat / deadlift sessions (bone loading).', 'Review vitamin D and calcium intake with the dietitian.', 'Keep hydration ≥ 2 L/day to limit renal-stone risk.'],
    muscular: ['Complete resistance sessions targeting quadriceps, calves, back and core.', 'Meet protein and energy targets.', 'Progress load gradually to avoid strain.'],
    digestive: ['Record meals in the evening checkup.', 'Plan protein-rich choices; vary the menu.', 'Hydrate regularly.'],
    immune: ['Protect sleep and manage stress.', 'Keep habitation surfaces and hygiene routines.', 'Report fever or rash early.'],
    endocrine: ['Maintain regular meals and sleep.', 'Review vitamin D intake.', 'Track body mass weekly.'],
    urinary: ['Drink ≥ 2 L/day and log fluids.', 'Keep up bone-loading exercise (reduces urinary calcium).', 'Report flank pain or blood in urine.'],
  };

  function assess(topicId, ans) {
    const t = C.INV[topicId], reasons = [];
    const sev = ans.severity || 0, sx = ans.symptoms || [], vit = ans.vitals || {};
    const red = t.symptoms.filter((s) => s.flag === 'red' && sx.includes(s.id)), amber = t.symptoms.filter((s) => s.flag === 'amber' && sx.includes(s.id));
    const vitCrit = [], vitWarn = [];
    Object.keys(vit).forEach((k) => { if (vit[k] == null || isNaN(vit[k])) return; const e = evalMetric(k, vit[k]); if (e.status === 'crit') vitCrit.push(`${M[k].label} ${vit[k]} ${M[k].unit}`); else if (e.status === 'warn') vitWarn.push(`${M[k].label} ${vit[k]} ${M[k].unit}`); });
    let level = 'monitor';
    if (red.length) { level = 'emergency'; reasons.push('Red-flag feature(s) reported: ' + red.map((r) => r.label.toLowerCase()).join('; ')); }
    if (vitCrit.length) { level = 'emergency'; reasons.push('Critically abnormal measurement(s): ' + vitCrit.join('; ')); }
    if (t.kind === 'pain' && sev >= t.sevEmerg) { level = 'emergency'; reasons.push(`Pain severity ${sev}/10 is at or above the emergency-review level for this region`); }
    if (level !== 'emergency') {
      if (vitWarn.length) reasons.push('Abnormal measurement(s): ' + vitWarn.join('; '));
      if (amber.length) reasons.push('Concerning feature(s): ' + amber.map((r) => r.label.toLowerCase()).join('; '));
      if (t.kind === 'pain' && sev >= t.sevEsc) reasons.push(`Pain severity ${sev}/10`);
      const sysWorst = t.systems.reduce((s, id) => worst(s, AS.Model.systems[id] ? AS.Model.systems[id].status : 'ok'), 'ok');
      if (sysWorst === 'crit') { level = 'emergency'; reasons.push('The related body system is currently CRITICAL on BeaconCare’s monitoring'); }
      else if (vitWarn.length || amber.length >= 2 || (t.kind === 'pain' && sev >= t.sevEsc) || (sysWorst === 'warn' && (amber.length || sx.length >= 2))) level = 'escalate';
      else if (sysWorst === 'warn') reasons.push('The related body system is currently flagged for attention');
    }
    if (!reasons.length) reasons.push('No red-flag features or critically abnormal measurements were reported.');
    // explanations
    let ex = (t.expl || []).map((e) => ({ t: e[0], d: e[1], hit: e[2].filter((w) => sx.includes(w)).length }));
    const sysMeasures = t.kind === 'system' ? AS.Model.systems[topicId].measures.filter((m) => m.status !== 'ok') : [];
    sysMeasures.forEach((m) => { const e = C.EXPLAIN[m.key]; if (e && e[m.dir]) e[m.dir].slice(0, 2).forEach((x) => ex.push({ t: x[0], d: x[1] || '', hit: 0.5, from: m.label })); });
    ex.sort((a, b) => b.hit - a.hit);
    const matched = ex.filter((e) => e.hit > 0);
    ex = (matched.length ? matched : ex).slice(0, 5);
    const actions = { immediate: [], preventive: [], followUp: [], escalation: [] };
    if (level === 'emergency') {
      actions.immediate = C.EMERGENCY_STEPS.slice(0, 3);
      actions.escalation = C.EMERGENCY_STEPS.slice(3);
      actions.followUp = ['Repeat and report vitals only as directed by the CMO / flight surgeon.', 'Record the time of onset and every change (time log).'];
    } else if (level === 'escalate') {
      actions.immediate = ['Stop strenuous activity and rest in a comfortable, secured position.', 'Re-measure the relevant vital signs (see instructions) and write the values down.'];
      actions.escalation = ['Contact the onboard Crew Medical Officer / flight surgeon for evaluation per mission protocol and report these BeaconCare results.', 'Do not start new exercise or take any medication unless cleared by medical personnel.'];
      actions.followUp = ['Repeat the measurements in 30–60 minutes and at the next checkup.', 'Re-rate symptoms; escalate to emergency steps if any red-flag feature appears.'];
    } else {
      actions.immediate = ['Rest and avoid movements that aggravate the symptom.', 'Record the symptom, severity and time in BeaconCare.'];
      actions.followUp = ['Repeat the measurements at the next scheduled checkup.', 'Re-rate severity in 2–4 hours and tomorrow morning.'];
      actions.escalation = ['Contact the onboard medical officer if symptoms worsen, new red-flag features appear, or there is no improvement.'];
    }
    const sysId = t.systems[0];
    actions.preventive = (PREVENT[sysId] || []).slice();
    const advice = { emergency: 'EMERGENCY – follow the mission emergency medical protocol and contact the onboard medical officer and flight surgeon NOW.', escalate: 'Escalate – contact the onboard medical officer / flight surgeon for evaluation.', monitor: 'Monitor – self-assessment and preventive actions; escalate if anything worsens.' }[level];
    return { level, reasons, explanations: ex, actions, advice };
  }

  /* ---------- notifications ---------- */
  function collectNotifications(model) {
    const out = [], id = model.id, N = model.N, ck = checkups();
    if (model.emergency) out.push({ id: `${id}:emergency`, sev: 'crit', title: 'EMERGENCY ALERT', body: 'Critically abnormal readings with severe symptoms. Follow the emergency medical protocol and contact medical personnel now.', route: '#/investigation' });
    model.findings.filter((f) => f.kind !== 'acute').forEach((f) => out.push({ id: `${id}:find:${f.id}`, sev: f.sev, title: f.title, body: f.evidence[0] || f.why, route: '#/history' }));
    Object.values(model.systems).forEach((s) => { if (s.status === 'crit' && !model.emergency) out.push({ id: `${id}:sys:${s.id}`, sev: 'crit', title: `${s.def.name} – critical`, body: 'Immediate assessment required.', route: `#/investigation?sys=${s.id}` }); });
    if (model.radPct >= 50) out.push({ id: `${id}:rad:50`, sev: model.radPct >= 80 ? 'crit' : 'warn', title: 'Radiation advisory level reached', body: `${model.radPct.toFixed(0)} % of the illustrative mission dose budget used.`, route: '#/hazards?s=radiation' });
    if (ck.morning.status === 'open') out.push({ id: `${id}:${N}:chkM:due`, sev: 'info', title: 'MORNING CHECKUP DUE', body: `Window ${ck.morning.start}–${ck.morning.end} GMT. Review overnight data and report new pain or symptoms.`, act: 'checkup' });
    if (ck.morning.status === 'missed') out.push({ id: `${id}:${N}:chkM:missed`, sev: 'warn', title: 'MORNING CHECKUP MISSED', body: 'The morning window has closed. Complete a late checkup so overnight changes are recorded.', act: 'checkup' });
    if (ck.evening.status === 'open') out.push({ id: `${id}:${N}:chkE:due`, sev: 'info', title: 'EVENING CHECKUP DUE', body: `Window ${ck.evening.start}–${ck.evening.end} GMT. Review the day, nutrition, hydration and mood.`, act: 'checkup' });
    if (ck.evening.status === 'missed') out.push({ id: `${id}:${N}:chkE:missed`, sev: 'warn', title: 'EVENING CHECKUP MISSED', body: 'Complete a late checkup before sleep.', act: 'checkup' });
    model.insights.slice(0, 2).forEach((i) => out.push({ id: `${id}:ins:${i.id}`, sev: 'info', title: i.title, body: i.detail, route: '#/history' }));
    return out;
  }

  /* ---------- mutators ---------- */
  let lastLive = null, current = null;
  function rebuild() { AS.Model = current = compute(S.scenario, lastLive); return current; }
  function load(id) { S.scenario = id; Store.user().sympSel = {}; Store.saveNow(); lastLive = null; return rebuild(); }
  function update(live) { lastLive = live; const old = current && current.sig; rebuild(); return old !== AS.Model.sig; }
  const uid = () => Math.random().toString(36).slice(2, 9);

  function addPain(rec) { const u = Store.user(); rec.id = rec.id || uid(); rec.day = AS.Model.N; rec.ts = Date.now(); rec.hh = Clock.now().getUTCHours() + Clock.now().getUTCMinutes() / 60; rec.source = 'user'; u.pain.push(rec); Store.save(); rebuild(); AS.emit('model'); return rec; }
  function addCheckup(c) {
    const u = Store.user(), N = AS.Model.N; c.id = uid(); c.ts = Date.now(); c.day = N; c.hh = Clock.now().getUTCHours() + Clock.now().getUTCMinutes() / 60;
    if (c.edits) u.dayEdits[N] = Object.assign({}, u.dayEdits[N], c.edits);
    (c.pain || []).forEach((p) => { u.pain.push(Object.assign({ id: uid(), day: N, ts: c.ts, hh: c.hh, source: 'checkup' }, p)); });
    u.checkups.push(c); Store.save(); rebuild(); AS.emit('model'); return c;
  }
  function setAction(id, status) { const u = Store.user(); u.actions[id] = { status, day: AS.Model.N }; Store.save(); rebuild(); AS.emit('model'); }
  function addAction(a) { const u = Store.user(); a.id = uid(); a.status = 'pending'; a.recDay = AS.Model.N; u.extraActions.push(a); Store.save(); rebuild(); AS.emit('model'); }
  function logExercise(exId) { const u = Store.user(), N = AS.Model.N; (u.exLog[N] = u.exLog[N] || []).push(exId); Store.save(); rebuild(); AS.emit('model'); }
  function addMeasurement(key, value) { const u = Store.user(), N = AS.Model.N; u.measLog.push({ ts: Date.now(), day: N, key, value }); u.dayEdits[N] = Object.assign({}, u.dayEdits[N]); if (LABS.includes(key)) u.dayEdits[N].lab = Object.assign({}, u.dayEdits[N].lab, { [key]: value }); else u.dayEdits[N][key] = value; Store.save(); rebuild(); AS.emit('model'); }

  AS.Store = Store; AS.Clock = Clock;
  AS.Engine = { load, update, rebuild, checkups, assess, collectNotifications, addPain, addCheckup, setAction, addAction, logExercise, addMeasurement, valueAt, RAD_BUDGET, PREVENT, LABS, VITALS };
})();
