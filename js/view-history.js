/* BeaconCare – HEALTH HISTORY: timeline, graphs, transparent early-risk detection, improvement tracking */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc, STATUS, mean, fmt } = AS.U;
  const { icon, pill, sim } = AS.UI;
  const { M } = AS.D, Ch = AS.Charts;
  AS.Views = AS.Views || {};

  let root = null, range = 'all', gtab = 'vitals', selDay = null, filt = 'all';

  const RANGES = [['day', 'DAILY', 1], ['week', 'WEEKLY', 7], ['month', 'MONTHLY', 30], ['all', 'Entire mission', 9999]];
  const GTABS = {
    vitals: { label: 'Vitals', keys: [['hr', '#e0646f'], ['sbp', '#e3b34f'], ['spo2', '#7fb6d4'], ['temp', '#e0956a']], note: 'Daily resting values.' },
    sleep: { label: 'Sleep', keys: [['sleepH', '#7f98d6'], ['sleepQ', '#a999d6']], note: 'Duration (h) and quality index.' },
    activity: { label: 'Activity', keys: [['exMin', '#7fb6d4'], ['resMin', '#4fbf8e'], ['steps', '#a9c96e']], note: 'Exercise minutes, resistance minutes and steps.' },
    nutrition: { label: 'Nutrition', keys: [['kcal', '#a9c96e'], ['protein', '#e0956a'], ['hydration', '#7fb6d4'], ['weight', '#cfd9ea']], note: 'Intake and body mass.' },
    mind: { label: 'Mood & stress', keys: [['mood', '#78c4b0'], ['stress', '#e0956a'], ['cog', '#a999d6'], ['social', '#7fb6d4']], note: 'Behavioral indicators.' },
    radiation: { label: 'Radiation', keys: [['rad', '#b58bc9']], note: 'Daily dose equivalent (simulated).' },
  };
  const LABELS = { hr: 'Resting HR', sbp: 'Systolic BP', spo2: 'SpO₂', temp: 'Temp', sleepH: 'Sleep h', sleepQ: 'Sleep quality', exMin: 'Exercise', resMin: 'Resistance', steps: 'Steps', kcal: 'Energy', protein: 'Protein', hydration: 'Hydration', weight: 'Body mass', mood: 'Mood', stress: 'Stress', cog: 'Cognition', social: 'Social', rad: 'Dose mSv' };

  /* aggregate daily records into the chosen range */
  function windowed(recs) {
    const n = RANGES.find((r) => r[0] === range)[2];
    if (range === 'day') return { recs: recs.slice(-1), bucket: 1, note: 'Today (daily values are single points – use the Weekly view for a trend)' };
    const sl = n >= 9999 ? recs : recs.slice(-n);
    return { recs: sl, bucket: 1 };
  }
  function aggregate(sl, key) {
    return sl.map((r) => ({ x: r.d, y: r[key] })).filter((p) => p.y != null);
  }

  const evSev = (e) => (e.t === 'crit' || e.t === 'alert' ? 'crit' : e.t === 'warn' || e.t === 'sleep' ? 'warn' : e.t === 'good' || e.t === 'act' ? 'ok' : 'info');
  function dayDetail(d) {
    const m = AS.Model, r = m.recs[d - 1]; if (!r) return '';
    const ev = m.sc.events.filter((e) => e.d === d);
    const pains = m.pains.filter((p) => p.day === d);
    const row = (k) => `<div class="kv"><span>${LABELS[k] || k}</span><b>${r[k] == null ? '—' : Number(r[k]).toFixed(M[k] ? M[k].dec : 1)}</b></div>`;
    return `<div class="daybox glass"><h4>MISSION DAY ${String(d).padStart(2, '0')}${d === m.N ? ' · TODAY' : ''}</h4><div class="dgrid">${['hr', 'sbp', 'spo2', 'temp', 'sleepH', 'exMin', 'resMin', 'kcal', 'protein', 'mood', 'stress', 'rad'].map(row).join('')}</div>
      <div class="kv"><span>Checkups</span><b>${r.chkM ? '☀ morning ✓' : '☀ morning ✗'} · ${r.chkE ? '☾ evening ✓' : '☾ evening ✗'}</b></div>
      ${ev.map((e) => `<div class="alrt s-${evSev(e)}"><i></i><div><b>${esc(e.text)}</b></div></div>`).join('')}
      ${pains.map((p) => `<div class="alrt s-warn"><i></i><div><b>Reported: ${esc(AS.C.INV[p.topic] ? AS.C.INV[p.topic].title : p.topic)} (${p.severity}/10)</b><small>Self-reported symptom record – not a diagnosis.</small></div></div>`).join('')}
      ${r.lab ? `<div class="kv"><span>Laboratory panel</span><b>WBC ${r.lab.wbc.toFixed(1)} · Hb ${r.lab.hb.toFixed(1)} · vit D ${r.lab.vitD.toFixed(0)}</b></div>` : ''}</div>`;
  }

  function timeline() {
    const m = AS.Model, N = m.N, ev = m.sc.events || [];
    const marks = [];
    ev.forEach((e) => marks.push({ d: e.d, t: e.text.length > 60 ? e.text.slice(0, 58) + '…' : e.text, sev: evSev(e) }));
    m.findings.forEach((f) => marks.push({ d: f.since, t: f.title + ' (detected)', sev: f.sev }));
    if (m.sc.intervention) marks.push({ d: m.sc.intervention, t: 'Early intervention', sev: 'ok' });
    m.pains.forEach((p) => marks.push({ d: p.day, t: 'Reported symptom', sev: 'warn' }));
    return `<div class="tl glass"><div class="tl-head"><b>Mission timeline</b><small class="muted">Day 01 → Day ${String(N).padStart(2, '0')} · click a day</small></div>
      <div class="tl-track" id="tltrack">${m.recs.map((r) => { const st = r.chkM && r.chkE ? 'ok' : (r.chkM || r.chkE) ? 'warn' : 'crit'; return `<button class="tl-d s-${st} ${selDay === r.d ? 'on' : ''}" data-act="hist-day" data-d="${r.d}" title="Day ${r.d}" aria-label="Day ${r.d}"><i></i></button>`; }).join('')}</div>
      <div class="tl-events">${marks.sort((a, b) => a.d - b.d).map((e) => `<button class="tl-e s-${e.sev}" data-act="hist-day" data-d="${e.d}"><b>D${String(e.d).padStart(2, '0')}</b> ${esc(e.t)}</button>`).join('') || '<span class="muted sm">No notable events recorded.</span>'}</div>
      <p class="muted xs">Track colour: both checkups done / one done / none done. ${sim()}</p>${selDay ? dayDetail(selDay) : ''}</div>`;
  }

  function graphs() {
    const m = AS.Model, w = windowed(m.recs), t = GTABS[gtab];
    const iv = m.sc.intervention ? [{ x: m.sc.intervention, label: 'Intervention', color: '#78c4b0' }] : [];
    const charts = t.keys.map(([k, c]) => {
      const mm = M[k];
      const bands = mm && mm.ok ? [{ lo: mm.ok[0], hi: mm.ok[1], color: '#4fbf8e' }] : [];
      return `<div class="gcard"><h5>${LABELS[k] || k} <small class="muted">${mm ? esc(mm.unit) : 'mSv'}</small></h5>${Ch.line({ series: [{ name: LABELS[k], color: c, area: true, pts: aggregate(w.recs, k) }], bands: range === 'day' ? [] : bands, marks: iv, height: 150, unit: mm ? mm.unit : 'mSv', dec: mm ? mm.dec : 2, title: LABELS[k] })}</div>`;
    }).join('');
    return `<div class="card glass"><div class="card-h"><h3>Health graphs</h3><div class="seg" role="tablist">${RANGES.map((r) => `<button class="${range === r[0] ? 'on' : ''}" data-act="hist-range" data-r="${r[0]}">${r[1]}</button>`).join('')}</div></div>
      <div class="tabs3">${Object.keys(GTABS).map((k) => `<button class="${gtab === k ? 'on' : ''}" data-act="hist-gtab" data-g="${k}">${GTABS[k].label}</button>`).join('')}</div>
      <p class="muted xs">${t.note} Green band = terrestrial reference range where one exists (shown for orientation, not an astronaut-specific threshold). ${w.note ? esc(w.note) + '.' : ''} ${sim()}</p><div class="gwrap">${charts}</div></div>`;
  }

  function risk() {
    const m = AS.Model, r = m.risk, cat = r.cat;
    const catName = cat, catCol = { LOW: '#4fbf8e', MODERATE: '#e3b34f', ELEVATED: '#e0956a', HIGH: '#e0646f' }[cat] || '#7fb6d4';
    const delta = r.prevScore != null ? r.score - r.prevScore : null;
    const rows = AS.IND.map((ind) => {
      const e = r.comps.find((c) => c.id === ind.id), lv = e ? e.lv : 0, th = ind.abs || ind.rel.map((x) => x * 100);
      const u = ind.abs ? ind.unit : '%';
      return `<tr class="${lv ? 'hot' : ''}"><td>${esc(ind.label)}</td><td class="muted xs">${ind.dir > 0 ? '↑ rises' : '↓ falls'} by ≥ ${th.map((x) => +x.toFixed(2)).join(' / ')} ${esc(u)}</td><td>${e && e.v ? `${Number(e.v.cur).toFixed(ind.dec || 0)} <small class="muted">vs ${Number(e.v.base).toFixed(ind.dec || 0)}</small>` : '—'}</td><td><b>${lv ? '+' + (lv * ind.w) : '0'}</b></td></tr>`;
    }).join('');
    return `<div class="card glass"><div class="card-h"><h3>Early-risk detection</h3><span class="chipx">Transparent rules · not a diagnosis</span></div>
      <div class="riskgrid"><div class="riskg">${Ch.gauge(r.score, catCol, catName)}<div class="rcat" style="color:${catCol}">${esc(catName)} Risk-indicator level</div><small class="muted">${delta == null ? '' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} ${Math.abs(delta)} vs one week ago`}</small></div>
      <div><h5>Early-warning score over the mission</h5>${Ch.line({ series: [{ name: 'Score', color: catCol, area: true, pts: r.series.map((p) => ({ x: p.d, y: p.v })) }], bands: [{ lo: 0, hi: 20, color: '#4fbf8e' }, { lo: 20, hi: 45, color: '#e3b34f' }, { lo: 45, hi: 70, color: '#e0956a' }, { lo: 70, hi: 100, color: '#e0646f' }], yMin: 0, yMax: 100, height: 160, unit: '', dec: 0, title: 'Early-warning score' })}</div></div>
      <p class="sm">This score summarises how far your <b>last 7 days</b> have moved from <b>your own Day 1–7 baseline</b>. It measures <b>change that deserves attention</b>; it does <b>not</b> predict or diagnose any disease and carries uncertainty: single-day noise, simulated data and short baselines limit it.</p>
      <h5>Why was this raised?</h5>
      ${m.findings.length ? m.findings.map((f) => `<div class="alrt s-${f.sev}"><i></i><div><b>${esc(f.title)}</b><small>Since Day ${f.since}</small><ul class="bul sm">${(f.evidence || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="sm">${esc(f.why || '')}</p>${f.rec ? `<ul class="bul sm">${f.rec.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>`).join('') : '<p class="ok-note">No unusual pattern. Indicators are close to your personal baseline.</p>'}
      <details class="rules"><summary>Show all ${AS.IND.length} indicator rules and how the score is calculated</summary>
      <table class="tbl"><thead><tr><th>Indicator</th><th>Rule (points at 1 / 2 / 3 levels)</th><th>Now vs baseline</th><th>Points</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="muted xs">Score = round(100 × (indicator points + 3 for a recognised pattern + 10 per critical body system) ÷ 30), capped at 100. Levels: LOW &lt; 20 · MODERATE 20–44 · ELEVATED 45–69 · HIGH ≥ 70. Thresholds are BeaconCare demonstration settings chosen for transparency – <b>not NASA-validated criteria</b>. Current total: ${r.pts.toFixed(1)} indicator points${r.bonus ? ` + ${r.bonus} pattern bonus` : ''}${r.acute ? ` + ${r.acute} acute` : ''}.</p></details></div>`;
  }

  function improve() {
    const m = AS.Model, acts = m.actions;
    const cnt = (s) => acts.filter((a) => a.status === s).length;
    const verdict = (() => {
      const e = acts.filter((a) => a.effect);
      if (!e.length) return m.risk.prevScore != null && m.risk.score < m.risk.prevScore - 3 ? ['ok', 'IMPROVING'] : m.risk.prevScore != null && m.risk.score > m.risk.prevScore + 3 ? ['crit', 'DETERIORATING'] : ['warn', 'STABLE'];
      const imp = e.filter((a) => a.effect.improved).length;
      return imp > e.length / 2 ? ['ok', 'IMPROVING'] : imp === 0 && m.risk.score >= 20 ? ['crit', 'DETERIORATING'] : ['warn', 'STABLE'];
    })();
    const clsC = { PREVENTIVE: '#7fb6d4', IMMEDIATE: '#e3b34f', 'FOLLOW-UP': '#7f98d6', 'MEDICAL ESCALATION': '#e0646f' };
    const actRow = (a) => `<div class="act s-${a.status === 'done' ? 'ok' : a.status === 'missed' ? 'crit' : 'warn'}"><div class="act-main"><span class="chipx" style="--c:${clsC[a.cls] || '#7fb6d4'}">${esc(a.cls || 'PREVENTIVE')}</span><b>${esc(a.title)}</b><small>${esc(a.detail || '')}</small><small class="muted">Recommended day ${a.recDay || '—'}${a.status === 'done' ? ' · completed' + (a.doneDay ? ' day ' + a.doneDay : '') : a.status === 'missed' ? ' · missed' : ''}</small>
      ${a.effect ? `<div class="ba"><span>Before</span><b>${a.effect.before.toFixed(M[a.metric] ? M[a.metric].dec : 1)}</b><i>→</i><span>After</span><b>${a.effect.after.toFixed(M[a.metric] ? M[a.metric].dec : 1)}</b><em class="${a.effect.improved ? 's-ok' : 's-warn'}">${a.effect.improved ? '▲ improved' : '■ no improvement yet'} (${LABELS[a.metric] || a.metric})</em></div>` : ''}</div>
      <div class="act-btn">${a.status !== 'done' ? `<button class="btn sm primary" data-act="act-set" data-id="${a.id}" data-s="done">Done</button>` : `<button class="btn sm" data-act="act-set" data-id="${a.id}" data-s="pending">Undo</button>`}${a.status !== 'missed' && a.status !== 'done' ? `<button class="btn sm" data-act="act-set" data-id="${a.id}" data-s="missed">Missed</button>` : ''}</div></div>`;
    return `<div class="card glass"><div class="card-h"><h3>Personalized improvement tracking</h3><span class="pillx s-${verdict[0]}">${verdict[1]}</span></div>
      <div class="tilegrid"><div class="mtile"><span>Completed</span><b>${cnt('done')}</b></div><div class="mtile"><span>Pending</span><b>${cnt('pending')}</b></div><div class="mtile"><span>Missed</span><b>${cnt('missed')}</b></div><div class="mtile"><span>Recommended</span><b>${acts.length}</b></div></div>
      <p class="muted sm">BeaconCare compares the 7 days before an action started with the days since, to show whether the related measurement moved in the right direction. A change over a few days is a hint, not proof that the action caused it.</p>
      ${m.insights.length ? `<h5>Suggested from your history</h5>${m.insights.map((i) => `<div class="alrt s-warn"><i></i><div><b>${esc(i.title)}</b><small>${esc(i.detail)}</small></div><button class="btn sm" data-act="ins-add" data-id="${i.id}">Add as action</button></div>`).join('')}` : ''}
      <h5>Action tracker</h5>${acts.length ? acts.map(actRow).join('') : '<p class="muted sm">No recommended actions at the moment.</p>'}</div>`;
  }

  function records() {
    const m = AS.Model, rows = [];
    m.recs.slice().reverse().slice(0, 60).forEach((r) => {
      rows.push({ k: 'vitals', d: r.d, t: `HR ${r.hr.toFixed(0)} · BP ${r.sbp.toFixed(0)}/${r.dbp.toFixed(0)} · SpO₂ ${r.spo2.toFixed(1)} · ${r.temp.toFixed(1)} °C` });
      rows.push({ k: 'sleep', d: r.d, t: `Sleep ${r.sleepH.toFixed(1)} h · quality ${r.sleepQ.toFixed(0)}` });
      rows.push({ k: 'activity', d: r.d, t: `Exercise ${r.exMin.toFixed(0)} min (resistance ${r.resMin.toFixed(0)}) · ${r.steps.toFixed(0)} steps` });
      rows.push({ k: 'mood', d: r.d, t: `Mood ${r.mood.toFixed(1)} · stress ${r.stress.toFixed(1)} · cognition ${r.cog.toFixed(0)}` });
    });
    const sel = rows.filter((x) => filt === 'all' || x.k === filt).slice(0, 80);
    return `<div class="card glass"><div class="card-h"><h3>Records log</h3><div class="seg">${['all', 'vitals', 'sleep', 'activity', 'mood'].map((f) => `<button class="${filt === f ? 'on' : ''}" data-act="hist-filt" data-f="${f}">${f.toUpperCase()}</button>`).join('')}<button data-act="hist-csv">⬇ export CSV</button></div></div>
      <div class="rlog">${sel.map((x) => `<div class="rrow"><b>D${String(x.d).padStart(2, '0')}</b><span class="chipx">${x.k}</span><span>${esc(x.t)}</span></div>`).join('')}</div></div>`;
  }

  function render() {
    root.innerHTML = `<div class="hz-top"><div><h2>Health history</h2><p class="muted sm">${esc(AS.Model.sc.crew)} · ${esc(AS.Model.sc.mission)} · ${AS.Model.N} mission days recorded. ${sim()}</p></div></div>
      ${timeline()}<div class="hist-cols">${graphs()}<div class="hist-side">${risk()}${improve()}</div></div>${records()}`;
  }

  function csv() {
    const m = AS.Model, keys = ['hr', 'sbp', 'dbp', 'spo2', 'temp', 'rr', 'hrv', 'sleepH', 'sleepQ', 'exMin', 'resMin', 'steps', 'weight', 'kcal', 'protein', 'hydration', 'mood', 'stress', 'cog', 'social', 'rad'];
    const out = ['day,' + keys.join(',')].concat(m.recs.map((r) => r.d + ',' + keys.map((k) => (r[k] == null ? '' : Number(r[k]).toFixed(2))).join(',')));
    const b = new Blob([out.join('\n')], { type: 'text/csv' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = `astra-${m.id}-simulated-history.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  AS.act['hist-day'] = (t) => { selDay = selDay === +t.dataset.d ? null : +t.dataset.d; render(); const b = root.querySelector('.daybox'); if (b) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  AS.act['hist-range'] = (t) => { range = t.dataset.r; render(); };
  AS.act['hist-gtab'] = (t) => { gtab = t.dataset.g; render(); };
  AS.act['hist-filt'] = (t) => { filt = t.dataset.f; render(); };
  AS.act['hist-csv'] = csv;
  AS.act['act-set'] = (t) => { AS.Engine.setAction(t.dataset.id, t.dataset.s); };
  AS.act['ins-add'] = (t) => { const i = AS.Model.insights.find((x) => x.id === t.dataset.id); if (!i) return; AS.Engine.addAction(Object.assign({ detail: i.detail, startDay: AS.Model.N }, i.action)); AS.UI.toast({ sev: 'info', title: 'Action added', body: i.action.title }); };

  AS.Views.history = {
    mount(el) { root = el; selDay = null; render(); },
    update() { if (root) { const y = window.scrollY; render(); window.scrollTo(0, y); } },
    destroy() { root = null; },
  };
})();
