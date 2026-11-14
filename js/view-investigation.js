/* BeaconCare – MEDICAL INVESTIGATION: sections 5.1–5.6, connected to the anatomy */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc, STATUS, worst, fmt } = AS.U;
  const { icon, pill, sim, Illus } = AS.UI;
  const { M, SYSTEMS, evalMetric } = AS.D, C = AS.C;
  AS.Views = AS.Views || {};

  const ALL_CLEAR = 'All systems operating within their current assessment ranges.';
  let root = null, sys = null, mini = null, pending = null, picked = false;
  const VK = { hr: ['hr'], bp: ['sbp', 'dbp'], spo2: ['spo2'], temp: ['temp'], rr: ['rr'], weight: ['weight'] };
  const LBL = { hr: ['Heart rate', 'bpm'], bp: ['Blood pressure (systolic / diastolic)', 'mmHg'], spo2: ['Oxygen saturation', '%'], temp: ['Body temperature', '°C'], rr: ['Respiratory rate', '/min'], weight: ['Body mass', 'kg'] };

  const abnormal = () => AS.Model.detected.filter((d) => d.status !== 'ok');
  const sysList = () => SYSTEMS.filter((s) => AS.Model.systems[s.id].status !== 'ok');

  function choose(p) {
    const ab = sysList();
    if (p && p.sys && AS.Model.systems[p.sys]) return p.sys;
    if (sys && AS.Model.systems[sys] && AS.Model.systems[sys].status !== 'ok') return sys;
    if (ab.length) return ab.sort((a, b) => STATUS[AS.Model.systems[b.id].status].rank - STATUS[AS.Model.systems[a.id].status].rank)[0].id;
    return null;
  }

  function nav() {
    const ab = sysList();
    return `<div class="invnav"><span class="muted xs">Systems needing attention</span><div class="chips">${ab.map((s) => `<button class="chip sysc s-${AS.Model.systems[s.id].status} ${sys === s.id ? 'on' : ''}" data-act="inv-pick" data-id="${s.id}">${icon(s.id, 14)} ${esc(s.name)}</button>`).join('')}</div>
      <details class="allsys"><summary>Investigate any system anyway</summary><div class="chips">${SYSTEMS.map((s) => `<button class="chip sysc s-${AS.Model.systems[s.id].status} ${sys === s.id ? 'on' : ''}" data-act="inv-pick" data-id="${s.id}">${icon(s.id, 14)} ${esc(s.name)}</button>`).join('')}</div></details></div>`;
  }

  function healthy() {
    return `<div class="hz-top"><div><h2>Medical investigation</h2><p class="muted sm">Connected to the anatomy model. ${sim()}</p></div></div>
      <div class="allclear glass s-ok"><div class="ac-body"><div class="ac-ico">${icon('immune', 34)}</div><h3>All systems healthy</h3>
      <p class="ac-lead">${ALL_CLEAR}</p>
      <p class="muted">Your current health indicators are within their configured assessment ranges. No unusual medical investigations are currently required. BeaconCare keeps comparing your readings with reference ranges and with your own baseline.</p>
      <div class="chips"><button class="btn primary" data-act="start-checkup">Start full body checkup</button><button class="btn" data-act="goto" data-to="#/overview">Back to anatomy</button></div></div>
      <div class="ac-fig"><canvas id="invcv" aria-label="Healthy anatomy – all systems within range"></canvas></div></div>
      <details class="glass card"><summary><b>Want to look at a specific system anyway?</b></summary><p class="muted sm">This opens an optional review of that system. It does not imply a problem.</p><div class="chips">${SYSTEMS.map((s) => `<button class="chip sysc s-ok" data-act="inv-pick" data-id="${s.id}">${icon(s.id, 14)} ${esc(s.name)}</button>`).join('')}</div></details>`;
  }

  function sec(n, title, body, cls) { return `<section class="card glass invsec ${cls || ''}"><h4><b class="num">${n}</b>${title}</h4>${body}</section>`; }

  function render() {
    if (!root) return;
    cleanup();
    const m = AS.Model;
    if (!picked) sys = choose(pending);
    if (!sys) {
      root.innerHTML = healthy(); pending = null;
      const hc = root.querySelector('#invcv');
      if (hc) { mini = AS.Anatomy.create(hc, { auto: true, zoom: 1.05 }); const st = {}; SYSTEMS.forEach((x) => { st[x.id] = m.systems[x.id].status; }); mini.setStatuses(st); }
      return;
    }
    pending = null;
    const S = m.systems[sys], t = C.INV[sys], E = C.EFFECTS[sys];
    const user = AS.Store.user(); user.sympSel = user.sympSel || {};
    const sel = user.sympSel[sys] || [];
    const vit = {}; // vitals typed in measurement fields are read on assess
    const a = AS.Engine.assess(sys, { severity: 0, symptoms: sel, vitals: currentVitals() });
    const det = m.detected.filter((d) => d.sys === sys);
    const em = a.level === 'emergency' || S.status === 'crit';
    const level = em && a.level !== 'emergency' ? 'emergency' : a.level;
    const quiet = S.status === 'ok' && !sel.length;

    root.innerHTML = `<div class="hz-top"><div><h2>Medical investigation</h2><p class="muted sm">Decision-support only – not a diagnosis. ${sim()}</p></div></div>${nav()}
    <div class="invhead glass s-${S.status}"><div class="ih-ico">${icon(sys, 34)}</div><div><h3>${esc(S.def.name.toUpperCase())}</h3><p class="muted sm">${esc(S.def.blurb)}</p></div>${pill(S.status)}<button class="btn sm" data-act="goto" data-to="#/overview" data-sel="${sys}">View on anatomy</button></div>
    ${quiet ? `<div class="lvl lvl-monitor"><b>Within range</b><span>${esc(S.def.name)}: all monitored measurements are inside their assessment ranges. Nothing to investigate. You can still note symptoms or record a measurement below.</span></div>` : level === 'emergency' ? `<div class="lvl lvl-emergency big"><b>EMERGENCY</b><span>${esc(a.advice)} BeaconCare cannot treat this. Do not attempt self-treatment of a potentially life-threatening condition.</span><button class="btn danger" data-act="open-emergency">Open emergency protocol</button></div>` : AS.UI.helpers.levelBanner(level, a.advice)}
    <div class="inv-grid">
      ${quiet ? '' : sec('5.1', 'Detected condition', det.length ? det.map(detHtml).join('') : `<p class="muted sm">No automatic detection for this system. ${S.measures.filter((x) => x.status !== 'ok').length ? '' : 'All its monitored measurements are inside their assessment ranges.'}</p>`)}
      ${quiet ? '' : sec('5.2', 'Possible explanations', AS.UI.helpers.explHtml(a.explanations) + `<details><summary class="sm">Why this assessment?</summary>${AS.UI.helpers.list(a.reasons)}</details>`)}
      ${quiet ? '' : sec('5.3', 'Effects on the body', effectsHtml(sys, E, S), 'span2')}
      ${sec('5.4', 'Symptoms – tick anything you notice', symptomsHtml(t, sel))}
      ${sec('5.5', 'Required measurements', measHtml(t, S))}
      ${quiet ? '' : sec('5.6', 'Recommended actions', AS.UI.helpers.actionsHtml(a.actions, level) + '<p class="muted xs">No medication or dosage is suggested by BeaconCare. Any treatment must come from the onboard medical officer / flight surgeon.</p>', 'span2')}
    </div>`;
    const mc = root.querySelector('#invcv');
    if (mc) { mini = AS.Anatomy.create(mc, { auto: true, zoom: 1.05 }); const st = {}; SYSTEMS.forEach((x) => { st[x.id] = m.systems[x.id].status; }); mini.setStatuses(st); mini.setVisible([sys]); mini.setHighlight(E ? E.highlight : null); }
  }

  function currentVitals() {
    const v = {};
    if (!root) return v;
    const g = (id) => { const e = root.querySelector('#iv_' + id); if (!e || e.value === '') return null; const x = parseFloat(e.value); return isNaN(x) ? null : x; };
    ['hr', 'sbp', 'dbp', 'spo2', 'temp', 'rr', 'weight'].forEach((k) => { const x = g(k); if (x != null) v[k] = x; });
    return v;
  }

  function detHtml(d) {
    const extra = d.kind === 'measure' ? `<small>${d.m.value.toFixed(d.m.dec)} ${esc(d.m.unit)} · reference: ${esc(d.m.ref.split('.')[0])}.</small>`
      : d.f ? `<ul class="bul sm">${(d.f.evidence || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="sm">${esc(d.f.why || '')}</p>` : d.p ? `<small>Self-reported ${esc(C.INV[d.p.topic].title.toLowerCase())}, severity ${d.p.severity}/10.</small>` : '';
    return `<div class="alrt s-${d.status}"><i></i><div><b>${esc(d.title)}</b><small class="muted">Since day ${d.since}${d.time ? ' · ' + esc(d.time) + ' mission time' : ''}</small>${extra}</div>${pill(d.status)}</div>`;
  }

  function effectsHtml(id, E, S) {
    if (!E) return '<p class="muted">No additional information.</p>';
    const il = { cardiovascular: () => Illus.ecg(AS.Model.cur.hr), muscular: () => Illus.muscle(AS.Model.cur.muscle), skeletal: () => Illus.bone(AS.Model.cur.bmd) }[id];
    const flow = Illus.flow([{ t: S.def.name }, { t: 'Affects', c: '#7fb6d4' }].concat(E.others.slice(0, 2).map((o) => ({ t: (SYSTEMS.find((x) => x.id === o) || {}).name || o, c: '#e3b34f' }))));
    return `<div class="effgrid"><div><p>${esc(E.why)}</p><h5>What happens inside the body</h5><ul class="bul">${E.proc.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><h5>Possible consequences if unaddressed</h5><ul class="bul">${E.risks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><h5>Other systems that may be affected</h5><div class="chips">${E.others.map((o) => `<button class="chip sysc s-${AS.Model.systems[o].status}" data-act="inv-pick" data-id="${o}">${icon(o, 14)} ${esc(AS.Model.systems[o].def.name)}</button>`).join('')}</div></div>
      <div><div class="minibox tall"><canvas id="invcv" aria-label="Anatomical illustration with the affected structures highlighted"></canvas></div><p class="muted xs">Highlighted structures are the ones most involved. Drag to rotate.</p>${il ? il() : ''}${flow}</div></div>`;
  }

  function symptomsHtml(t, sel) {
    return `<p class="muted sm">Select what you are experiencing. Symptoms do not identify a disease; they change how urgently BeaconCare recommends you seek medical review.</p><div class="sxlist">${t.symptoms.map((s) => `<label class="sx ${s.flag || ''}"><input type="checkbox" data-act="inv-sx" data-id="${s.id}" ${sel.includes(s.id) ? 'checked' : ''}><span>${esc(s.label)}</span>${s.flag === 'red' ? '<em>urgent feature</em>' : ''}</label>`).join('')}</div>`;
  }

  function measHtml(t, S) {
    const keys = t.measures.slice();
    return `<p class="muted sm">Measure, then type the values to refine the assessment. “Record” stores a value in your history.</p>${keys.map((k) => {
      const h = C.HOWTO[k] || C.HOWTO.lab, l = LBL[k];
      const fields = k === 'bp' ? ['sbp', 'dbp'] : (VK[k] || [k]);
      const cur = fields.map((f) => AS.Model.cur[f]).filter((x) => x != null);
      return `<div class="meas"><div class="meas-h"><b>${esc(l ? l[0] : h.title)}</b><small class="muted">Latest: ${cur.length ? cur.map((x, i) => Number(x).toFixed(i === 0 && k === 'temp' ? 1 : k === 'spo2' || k === 'temp' ? 1 : 0)).join(' / ') + ' ' + (l ? l[1] : '') : '—'}</small></div>
      <div class="chips">${fields.map((f) => `<label class="fld inl"><input type="number" step="any" inputmode="decimal" id="iv_${f}" placeholder="${f === 'sbp' ? 'systolic' : f === 'dbp' ? 'diastolic' : (M[f] ? M[f].short : f)}" data-act="inv-vit"></label>`).join('')}<button class="btn sm" data-act="inv-rec" data-k="${k}">Record</button></div>
      <details><summary class="sm">How to measure</summary>${AS.UI.helpers.list(h.steps)}</details></div>`;
    }).join('')}`;
  }

  function cleanup() { if (mini) mini.destroy(); mini = null; }

  AS.act['inv-pick'] = (t) => { sys = t.dataset.id; picked = true; history.replaceState(null, '', '#/investigation?sys=' + sys); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  AS.act['inv-sx'] = (t) => {
    const u = AS.Store.user(); u.sympSel = u.sympSel || {}; const s = new Set(u.sympSel[sys] || []);
    if (t.checked) s.add(t.dataset.id); else s.delete(t.dataset.id);
    u.sympSel[sys] = [...s]; AS.Store.save(); const y = window.scrollY; render(); window.scrollTo(0, y);
  };
  AS.act['inv-vit'] = () => {};
  AS.act['inv-rec'] = (t) => {
    const k = t.dataset.k, fields = k === 'bp' ? ['sbp', 'dbp'] : (VK[k] || [k]); let n = 0;
    fields.forEach((f) => { const e = root.querySelector('#iv_' + f); if (e && e.value !== '' && !isNaN(parseFloat(e.value))) { AS.Engine.addMeasurement(f, parseFloat(e.value)); n++; } });
    if (!n) { AS.UI.toast({ sev: 'warn', title: 'Nothing to record', body: 'Enter a value first.' }); return; }
    AS.UI.toast({ sev: 'info', title: 'Measurement recorded', body: 'Saved to Health History and the assessment was updated.' });
  };
  // typing in a measurement field refines the assessment live (no re-render of inputs)
  document.addEventListener('change', (e) => {
    if (!root || !e.target.matches || !e.target.matches('[data-act="inv-vit"]')) return;
    const keep = {}; root.querySelectorAll('[id^="iv_"]').forEach((i) => { keep[i.id] = i.value; });
    const y = window.scrollY; render(); Object.keys(keep).forEach((id) => { const el = root.querySelector('#' + id); if (el) el.value = keep[id]; }); window.scrollTo(0, y);
  });

  AS.Views.investigation = {
    mount(el, params) { root = el; sys = null; picked = !!(params && params.sys && AS.Model.systems[params.sys] && AS.Model.systems[params.sys].status !== 'ok'); if (picked) sys = params.sys; else if (params && params.sys) history.replaceState(null, '', '#/investigation'); pending = params || null; render(); },
    update() { if (root) { const keep = {}; root.querySelectorAll('[id^="iv_"]').forEach((i) => { keep[i.id] = i.value; }); const y = window.scrollY; render(); Object.keys(keep).forEach((id) => { const e = root.querySelector('#' + id); if (e) e.value = keep[id]; }); window.scrollTo(0, y); } },
    destroy() { cleanup(); root = null; },
  };
})();
