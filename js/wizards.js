/* BeaconCare – guided flows: investigation wizard, full-body checkup, emergency protocol, schedule */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc, STATUS, worst, fmt, clamp } = AS.U;
  const { icon, pill, modal } = AS.UI;
  const C = AS.C, { M, SYSTEMS, evalMetric } = AS.D;

  const VKEYS = { hr: ['hr'], bp: ['sbp', 'dbp'], spo2: ['spo2'], temp: ['temp'], rr: ['rr'], weight: ['weight'] };
  const bandVal = (k) => { const r = AS.Band.readings[k]; return r ? (k === 'spo2' || k === 'temp' ? +r.v.toFixed(1) : Math.round(r.v)) : ''; };
  const numIn = (id, label, unit, val, step) => `<label class="fld"><span>${esc(label)}</span><div class="inw"><input type="number" inputmode="decimal" step="${step || 1}" id="${id}" value="${val == null ? '' : val}"><em>${esc(unit)}</em></div></label>`;
  const read = (root, id) => { const e = root.querySelector('#' + id); if (!e || e.value === '') return null; const v = parseFloat(e.value); return isNaN(v) ? null : v; };
  const levelBanner = (lv, txt) => `<div class="lvl lvl-${lv}"><b>${{ emergency: 'EMERGENCY', escalate: 'ESCALATE', monitor: 'MONITOR' }[lv]}</b><span>${esc(txt)}</span></div>`;
  const list = (a) => `<ol class="steps">${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;

  function actionsHtml(a, lvl) {
    const blocks = [['IMMEDIATE', a.immediate, 'immediate'], ['MEDICAL ESCALATION', a.escalation, 'escal'], ['FOLLOW-UP', a.followUp, 'follow'], ['PREVENTIVE', a.preventive, 'prev']];
    const ord = lvl === 'emergency' ? blocks : [blocks[0], blocks[1], blocks[2], blocks[3]];
    return ord.filter((b) => b[1] && b[1].length).map((b) => `<div class="actblk ab-${b[2]}"><h5>${b[0]}</h5>${list(b[1])}</div>`).join('');
  }
  function explHtml(ex) {
    return `<div class="note-box">${icon('info', 15)} <span>These are <b>possible explanations to discuss with medical personnel – not diagnoses</b>. BeaconCare cannot confirm any condition.</span></div>${ex.map((e) => `<div class="expl"><b>${esc(e.t)}</b><p>${esc(e.d)}</p></div>`).join('')}`;
  }
  AS.UI.helpers = { actionsHtml, explHtml, levelBanner, list };

  /* ---------- Investigation wizard ---------- */
  AS.act.openInvestigationWizard = function (o) {
    const t = C.INV[o.topic]; if (!t) return;
    const prevSel = AS.Store.user().sympSel[o.topic] || [];
    const st = { step: 0, severity: t.kind === 'pain' ? 4 : 0, onset: 'gradual', symptoms: new Set(prevSel), vitals: {}, saved: false, res: null };
    const m = modal({ title: `${t.title}${o.region ? ' · ' + o.region : ''} – guided investigation`, wide: true });
    const steps = ['Describe', 'Measure', 'Assessment'];
    function head() { return `<div class="stepper">${steps.map((s, i) => `<span class="${i === st.step ? 'on' : i < st.step ? 'done' : ''}"><b>${i + 1}</b>${s}</span>`).join('')}</div>`; }
    function draw() {
      if (st.step === 0) {
        m.set(`${head()}<div class="note-box">${icon('info', 15)} <span>BeaconCare does <b>not</b> assume what ${t.kind === 'pain' ? 'pain' : 'a reading'} means. It first collects symptoms and measurements, then suggests <b>possible</b> explanations.</span></div>
        ${t.kind === 'pain' ? `<label class="fld"><span>Pain severity: <b id="sevv">${st.severity}</b>/10</span><input type="range" min="0" max="10" value="${st.severity}" id="sev"></label><div class="seg2" role="group" aria-label="Onset"><button class="${st.onset === 'sudden' ? 'on' : ''}" data-w="onset" data-v="sudden">Started suddenly</button><button class="${st.onset === 'gradual' ? 'on' : ''}" data-w="onset" data-v="gradual">Came on gradually</button></div>` : ''}
        <h5 class="mt">Which of these are you experiencing?</h5><div class="chips big">${t.symptoms.map((s) => `<button class="chip ${st.symptoms.has(s.id) ? 'on' : ''}" data-w="sym" data-v="${s.id}" aria-pressed="${st.symptoms.has(s.id)}">${esc(s.label)}</button>`).join('')}</div>
        <div class="m-foot"><span class="muted xs">If you think this is life-threatening, do not continue here – use the emergency protocol.</span><button class="btn danger sm" data-act="open-emergency">Emergency protocol</button><button class="btn primary" data-w="next">Next: measurements</button></div>`);
      } else if (st.step === 1) {
        const meas = t.measures.map((k) => {
          const base = k.startsWith('lab_') ? 'lab' : k, h = C.HOWTO[base] || C.HOWTO.lab;
          let inputs = '';
          if (k === 'bp') inputs = numIn('v_sbp', 'Systolic', 'mmHg', bandVal('sbp')) + numIn('v_dbp', 'Diastolic', 'mmHg', bandVal('dbp'));
          else if (k === 'hr') inputs = numIn('v_hr', 'Heart rate', 'bpm', bandVal('hr'));
          else if (k === 'spo2') inputs = numIn('v_spo2', 'SpO₂', '%', bandVal('spo2'), 0.1);
          else if (k === 'temp') inputs = numIn('v_temp', 'Temperature', '°C', bandVal('temp'), 0.1);
          else if (k === 'rr') inputs = numIn('v_rr', 'Respiratory rate', '/min', bandVal('rr'));
          else if (k === 'weight') inputs = numIn('v_weight', 'Body mass', 'kg', '', 0.1);
          else inputs = numIn('v_' + k, M[k.slice(4)].label + ' (lab)', M[k.slice(4)].unit, '', 0.1);
          return `<div class="measblk"><div class="mrow">${inputs}</div><details><summary>How to measure: ${esc(h.title)}</summary>${list(h.steps)}</details></div>`;
        }).join('');
        m.set(`${head()}<p class="muted">Values are pre-filled from the smart band where available (${AS.Band.device ? 'HR live, others simulated' : 'simulated'}). Re-measure manually if something feels wrong. Leave blank what you cannot measure.</p>${meas}<div class="m-foot"><button class="btn" data-w="back">Back</button><button class="btn" data-w="useband">Use band values</button><button class="btn primary" data-w="next">Get assessment</button></div>`);
      } else {
        const vit = st.vitals; st.res = st.res || AS.Engine.assess(o.topic, { severity: st.severity, symptoms: [...st.symptoms], vitals: vit });
        const r = st.res;
        if (!st.saved) { st.saved = true; AS.Store.user().sympSel[o.topic] = [...st.symptoms]; AS.Engine.addPain({ topic: o.topic, severity: st.severity, symptoms: [...st.symptoms], vitals: vit, level: r.level, note: `${t.title}${o.region ? ' (' + o.region + ')' : ''} ${st.severity}/10${st.onset === 'sudden' ? ', sudden onset' : ''}`, region: o.region }); }
        m.set(`${head()}${levelBanner(r.level, r.advice)}<h5 class="mt">Why BeaconCare reached this assessment</h5><ul class="why">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h5 class="mt">Possible explanations</h5>${explHtml(r.explanations)}<h5 class="mt">Recommended actions</h5>${actionsHtml(r.actions, r.level)}
        <div class="note-box warn">${icon('hazards', 15)} <span>BeaconCare is a decision-support and self-assessment tool, not a doctor. It never recommends independent treatment of a potentially life-threatening condition and does not provide medication or dosing.</span></div>
        <div class="m-foot"><span class="muted xs">Saved to Health History.</span>${r.level !== 'monitor' ? `<button class="btn danger" data-act="open-emergency">${icon('phone', 15)} ${r.level === 'emergency' ? 'Emergency protocol' : 'Contact medical officer'}</button>` : ''}<button class="btn" data-w="open">Open medical investigation</button><button class="btn primary" data-close>Done</button></div>`);
      }
    }
    m.body.addEventListener('input', (e) => { if (e.target.id === 'sev') { st.severity = +e.target.value; m.body.querySelector('#sevv').textContent = st.severity; } });
    m.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-w]'); if (!b) return; const w = b.dataset.w;
      if (w === 'onset') { st.onset = b.dataset.v; draw(); } else if (w === 'sym') { const id = b.dataset.v; st.symptoms.has(id) ? st.symptoms.delete(id) : st.symptoms.add(id); b.classList.toggle('on'); b.setAttribute('aria-pressed', st.symptoms.has(id)); }
      else if (w === 'next') { if (st.step === 1) { st.vitals = {}; t.measures.forEach((k) => { if (k === 'bp') { st.vitals.sbp = read(m.body, 'v_sbp'); st.vitals.dbp = read(m.body, 'v_dbp'); } else if (k.startsWith('lab_')) { const v = read(m.body, 'v_' + k); if (v != null) AS.Engine.addMeasurement(k.slice(4), v); } else st.vitals[k] = read(m.body, 'v_' + k); }); } st.step++; draw(); }
      else if (w === 'back') { st.step--; draw(); } else if (w === 'useband') { ['hr', 'sbp', 'dbp', 'spo2', 'temp', 'rr'].forEach((k) => { const e2 = m.body.querySelector('#v_' + k); if (e2) e2.value = bandVal(k); }); }
      else if (w === 'open') { m.close(); location.hash = `#/investigation?sys=${t.systems[0]}`; }
    });
    draw();
  };

  /* ---------- Full body checkup ---------- */
  const GEN = [['fatigue', 'Unusual fatigue', null], ['dizzy', 'Dizziness / feeling faint', ['cardiovascular', 'dizzy']], ['nausea', 'Nausea', ['digestive', 'nausea']], ['headache', 'Headache', ['head', 'pressure']], ['face', 'Facial puffiness / head fullness', null], ['vision', 'Blurred or changed vision', ['nervous', 'vision']], ['dyspnea', 'Shortness of breath', ['respiratory', 'dyspnea']], ['palp', 'Palpitations / irregular heartbeat', ['cardiovascular', 'palp']], ['fever', 'Fever or chills', ['immune', 'fever']], ['rash', 'Rash / skin reaction', ['immune', 'rash']], ['weak', 'New muscle weakness', ['muscular', 'weak']], ['cough', 'New cough', ['respiratory', 'cough']]];

  AS.act['start-checkup'] = function () {
    const ck = AS.Engine.checkups();
    let type = ck.morning.status !== 'done' && ck.evening.status !== 'open' && ck.evening.status !== 'missed' ? 'morning' : ck.evening.status !== 'done' ? 'evening' : 'extra';
    const st = { step: 0, type, wellbeing: 4, gen: new Set(), painOn: false, pain: {}, vitals: {}, extra: {}, phq: [0, 0], gad: [0, 0], sq: [0, 0, 0, 0], mood: 7, res: null };
    const m = modal({ title: 'Full body checkup', wide: true });
    const names = ['Overview', 'Physical', 'Pain', 'Measure', 'Mind', 'Summary'];
    const head = () => `<div class="stepper small">${names.map((s, i) => `<span class="${i === st.step ? 'on' : i < st.step ? 'done' : ''}"><b>${i + 1}</b>${s}</span>`).join('')}</div>`;
    const foot = (nextLabel, back) => `<div class="m-foot">${back !== false && st.step > 0 ? '<button class="btn" data-w="back">Back</button>' : ''}<span class="muted xs">All entries are stored locally on this device.</span><button class="btn primary" data-w="next">${nextLabel || 'NEXT'}</button></div>`;
    const sel3 = (id, arr, val) => `<select id="${id}">${arr.map((x, i) => `<option value="${i}" ${i === val ? 'selected' : ''}>${i} – ${esc(x)}</option>`).join('')}</select>`;

    function draw() {
      const mod = AS.Model, N = mod.N, rec = mod.recs[N - 1];
      if (st.step === 0) {
        m.set(`${head()}<div class="seg2"><button class="${st.type === 'morning' ? 'on' : ''}" data-w="type" data-v="morning">Morning checkup</button><button class="${st.type === 'evening' ? 'on' : ''}" data-w="type" data-v="evening">Evening checkup</button><button class="${st.type === 'extra' ? 'on' : ''}" data-w="type" data-v="extra">Extra / ad-hoc</button></div>
        <p class="muted">${st.type === 'morning' ? 'Identify changes that happened during sleep: review overnight band data, check for new pain or symptoms and assess sleep quality.' : st.type === 'evening' ? 'Review the day: activity, nutrition and hydration, mood and stress, new symptoms, and complete missing measurements.' : 'An additional checkup outside the scheduled windows.'}</p>
        <div class="grid3"><div class="kv"><span>Mission time</span><b>DAY ${String(N).padStart(2, '0')} · ${AS.Clock.hhmm()} GMT</b></div><div class="kv"><span>Last night’s sleep ${AS.UI.sim()}</span><b>${rec.sleepH.toFixed(1)} h · quality ${Math.round(rec.sleepQ)}/100</b></div><div class="kv"><span>Resting heart rate ${AS.UI.sim()}</span><b>${fmt(mod.measures.hr.value)} bpm</b></div></div>
        <p class="muted sm">Steps: physical condition → pain → symptoms &amp; measurements → mental wellbeing → visual summary. Takes about 3 minutes.</p>${foot('BEGIN', false)}`);
      } else if (st.step === 1) {
        m.set(`${head()}<h4>How do you feel physically overall?</h4><div class="seg2 five">${['Very poor', 'Poor', 'Fair', 'Good', 'Excellent'].map((l, i) => `<button class="${st.wellbeing === i + 1 ? 'on' : ''}" data-w="wb" data-v="${i + 1}">${i + 1}<small>${l}</small></button>`).join('')}</div>
        <h4 class="mt">Are you experiencing any of these?</h4><div class="chips big">${GEN.map((g) => `<button class="chip ${st.gen.has(g[0]) ? 'on' : ''}" data-w="gen" data-v="${g[0]}">${esc(g[1])}</button>`).join('')}</div>${foot()}`);
      } else if (st.step === 2) {
        m.set(`${head()}<h4>Any unusual pain?</h4><div class="seg2"><button class="${!st.painOn ? 'on' : ''}" data-w="pain" data-v="0">No pain</button><button class="${st.painOn ? 'on' : ''}" data-w="pain" data-v="1">Yes – report pain</button></div>
        ${st.painOn ? `<p class="muted sm">Select each affected area and rate it. Details are assessed rule-by-rule – BeaconCare does not assume the cause.</p><div class="chips">${C.PAIN_CHIPS.map((c) => `<button class="chip ${st.pain[c[0]] ? 'on' : ''}" data-w="ptopic" data-v="${c[0]}">${esc(c[1])}</button>`).join('')}</div>${Object.keys(st.pain).map((k) => { const t = C.INV[k], p = st.pain[k]; return `<div class="pbox"><b>${esc(t.title)}</b><label class="fld"><span>Severity <b id="ps_${k}">${p.sev}</b>/10</span><input type="range" min="0" max="10" value="${p.sev}" data-ps="${k}"></label><div class="chips">${t.symptoms.map((s) => `<button class="chip sm ${p.sx.has(s.id) ? 'on' : ''}" data-w="psx" data-t="${k}" data-v="${s.id}">${esc(s.label)}</button>`).join('')}</div></div>`; }).join('')}` : ''}${foot()}`);
      } else if (st.step === 3) {
        const eve = st.type !== 'morning';
        m.set(`${head()}<p class="muted">Pre-filled from the smart band (${AS.Band.device ? 'HR live · others simulated' : 'simulated'}). Replace with a manual measurement when you can – manual values take precedence.</p><div class="mrow">${numIn('v_hr', 'Heart rate', 'bpm', bandVal('hr'))}${numIn('v_sbp', 'Systolic BP', 'mmHg', bandVal('sbp'))}${numIn('v_dbp', 'Diastolic BP', 'mmHg', bandVal('dbp'))}</div><div class="mrow">${numIn('v_spo2', 'SpO₂', '%', bandVal('spo2'), 0.1)}${numIn('v_temp', 'Temperature', '°C', bandVal('temp'), 0.1)}${numIn('v_rr', 'Resp. rate', '/min', bandVal('rr'))}</div>
        <h4 class="mt">Entries the band cannot collect</h4><div class="mrow">${numIn('v_weight', 'Body mass', 'kg', rec.weight.toFixed(1), 0.1)}${!eve ? numIn('v_sleepH', 'Sleep last night', 'h', rec.sleepH.toFixed(1), 0.1) : ''}${eve ? numIn('v_hydration', 'Fluids today', 'L', rec.hydration.toFixed(1), 0.1) : ''}</div>${eve ? `<div class="mrow">${numIn('v_kcal', 'Energy intake', 'kcal', Math.round(rec.kcal), 10)}${numIn('v_protein', 'Protein', 'g', Math.round(rec.protein))}${numIn('v_exMin', 'Exercise', 'min', Math.round(rec.exMin))}${numIn('v_resMin', 'Resistance', 'min', Math.round(rec.resMin))}</div>` : ''}
        <details><summary>How to take these measurements</summary>${['hr', 'bp', 'spo2', 'temp', 'rr'].map((k) => `<h5>${esc(C.HOWTO[k].title)}</h5>${list(C.HOWTO[k].steps)}`).join('')}</details><div class="m-foot"><button class="btn" data-w="back">Back</button><button class="btn" data-w="useband">Use band values</button><button class="btn primary" data-w="next">Next</button></div>`);
      } else if (st.step === 4) {
        m.set(`${head()}<div class="note-box">${icon('info', 15)} <span>These short questionnaires are <b>screening aids only</b>. BeaconCare does not diagnose depression, anxiety or any psychiatric condition from scores. Persistent concerns should be discussed with the psychological-support team.</span></div>
        <h4>Over the last 2 weeks, how often have you been bothered by…</h4>${[...C.PHQ2.map((q, i) => ['phq', i, q]), ...C.GAD2.map((q, i) => ['gad', i, q])].map((x) => `<label class="fld"><span>${esc(x[2])}</span>${sel3(`${x[0]}${x[1]}`, C.FREQ, st[x[0]][x[1]])}</label>`).join('')}
        <h4 class="mt">Today’s stress (brief BeaconCare check)</h4>${C.STRESSQ.map((q, i) => `<label class="fld"><span>${esc(q[0])}</span><select id="sq${i}">${['Not at all', 'A little', 'Somewhat', 'Quite a bit', 'Very much'].map((l, v) => `<option value="${v}" ${v === st.sq[i] ? 'selected' : ''}>${v} – ${l}</option>`).join('')}</select></label>`).join('')}
        <label class="fld"><span>Mood today: <b id="moodv">${st.mood}</b>/10</span><input type="range" min="1" max="10" value="${st.mood}" id="mood"></label>${foot('Finish & save')}`);
      } else { summary(); }
    }

    function collect() {
      const b = m.body, num = (id) => read(b, id);
      if (st.step === 3) { ['hr', 'sbp', 'dbp', 'spo2', 'temp', 'rr'].forEach((k) => { st.vitals[k] = num('v_' + k); }); ['weight', 'sleepH', 'hydration', 'kcal', 'protein', 'exMin', 'resMin'].forEach((k) => { const v = num('v_' + k); if (v != null) st.extra[k] = v; }); }
      if (st.step === 4) { st.phq = [0, 1].map((i) => +b.querySelector('#phq' + i).value); st.gad = [0, 1].map((i) => +b.querySelector('#gad' + i).value); st.sq = [0, 1, 2, 3].map((i) => +b.querySelector('#sq' + i).value); st.mood = +b.querySelector('#mood').value; }
    }

    function save() {
      const vit = {}; Object.keys(st.vitals).forEach((k) => { if (st.vitals[k] != null) vit[k] = st.vitals[k]; });
      const edits = Object.assign({}, vit, st.extra);
      const stressScore = st.sq.reduce((s, v, i) => s + (C.STRESSQ[i][1] ? 4 - v : v), 0), phq = st.phq[0] + st.phq[1], gad = st.gad[0] + st.gad[1];
      edits.stress = +((stressScore / 16) * 10).toFixed(1); edits.mood = st.mood; edits.phq = phq; edits.anx = gad;
      if (st.type === 'morning') edits.chkM = true; if (st.type === 'evening') edits.chkE = true;
      // symptoms -> assessed records (grouped per topic)
      const pains = []; const byTopic = {};
      GEN.forEach((g) => { if (st.gen.has(g[0]) && g[1]) { const [t, s] = g[2] || []; if (t) (byTopic[t] = byTopic[t] || { sev: 0, sx: new Set() }).sx.add(s); } });
      Object.keys(st.pain).forEach((k) => { const o = byTopic[k] = byTopic[k] || { sev: 0, sx: new Set() }; o.sev = st.pain[k].sev; st.pain[k].sx.forEach((x) => o.sx.add(x)); });
      Object.keys(byTopic).forEach((k) => { const o = byTopic[k], r = AS.Engine.assess(k, { severity: o.sev, symptoms: [...o.sx], vitals: vit }); pains.push({ topic: k, severity: o.sev, symptoms: [...o.sx], vitals: vit, level: r.level, note: `Reported during ${st.type} checkup: ${C.INV[k].title}`, res: r }); });
      pains.forEach((p) => { delete p.res; });
      const c = AS.Engine.addCheckup({ type: st.type, vitals: vit, gen: [...st.gen], wellbeing: st.wellbeing, edits, pain: pains, mental: { phq, gad, stress: edits.stress, mood: st.mood } });
      st.saved = c; st.levels = pains.map((p) => p.level);
    }

    function summary() {
      if (!st.saved) save();
      const mod = AS.Model, ok = [], warn = [], crit = [];
      SYSTEMS.forEach((d) => { const s = mod.systems[d.id]; (s.status === 'ok' ? ok : s.status === 'warn' ? warn : crit).push(d); });
      const lvl = st.levels.includes('emergency') || crit.length ? 'emergency' : st.levels.includes('escalate') || warn.length ? 'escalate' : 'monitor';
      const critInd = mod.detected.filter((d) => d.status === 'crit').map((d) => d.title);
      const phq = st.phq[0] + st.phq[1], gad = st.gad[0] + st.gad[1];
      const next = [];
      if (lvl === 'emergency') next.push('Follow the mission emergency medical protocol and contact the onboard medical officer and flight surgeon now.');
      else if (lvl === 'escalate') next.push('Share this checkup with the onboard medical officer / flight surgeon at the next communication opportunity (earlier if symptoms worsen).');
      mod.findings.filter((f) => f.kind !== 'acute').slice(0, 2).forEach((f) => next.push(f.rec[0]));
      if (phq >= 3 || gad >= 3) next.push('Your screening score is positive – arrange a conversation with the psychological-support team (a screen is not a diagnosis).');
      if (!next.length) next.push('Keep your routine: exercise, hydration, sleep window and crew contact. Complete the next scheduled checkup on time.');
      m.title.textContent = 'Checkup summary';
      m.set(`<div class="stepper small">${names.map((s, i) => `<span class="${i <= 5 ? 'done' : ''}"><b>${i + 1}</b>${s}</span>`).join('')}</div>${levelBanner(lvl, lvl === 'emergency' ? 'Critical indicators present – escalate immediately.' : lvl === 'escalate' ? 'Some systems need attention – review the actions below.' : 'All systems are within their current assessment ranges.')}
      <div class="sumgrid">${SYSTEMS.map((d) => { const s = mod.systems[d.id]; return `<div class="sumtile s-${s.status}"><span>${icon(d.id, 20)}</span><b>${esc(d.name)}</b><em>${STATUS[s.status].label}</em></div>`; }).join('')}</div>
      <div class="grid3 mt"><div class="kv s-ok"><span>Healthy systems</span><b>${ok.length}${ok.length ? ' – ' + ok.map((d) => d.name).join(', ') : ''}</b></div><div class="kv s-warn"><span>Systems requiring attention</span><b>${warn.length ? warn.map((d) => d.name).join(', ') : 'None'}</b></div><div class="kv s-crit"><span>Critical</span><b>${crit.length ? crit.map((d) => d.name).join(', ') : 'None'}</b></div></div>
      ${critInd.length ? `<h5 class="mt">Critical indicators</h5><ul class="why">${critInd.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <h5 class="mt">MENTAL WELLBEING (screening only)</h5><p class="muted sm">Low-mood screen (PHQ-2): <b>${phq}/6</b> · Anxiety screen (GAD-2): <b>${gad}/6</b> · Stress ${fmt(mod.recs[mod.N - 1].stress, 1)}/10 · Mood ${st.mood}/10. ${phq >= 3 || gad >= 3 ? 'A score of 3 or more is a positive screen that suggests follow-up – it is not a diagnosis.' : 'Below the follow-up threshold.'}</p>
      <h5 class="mt">Recommended next steps</h5>${list(next)}
      <div class="m-foot"><span class="muted xs">Saved to Health History · ${st.type.toUpperCase()} checkup · DAY ${mod.N}</span>${lvl !== 'monitor' ? `<button class="btn danger" data-act="open-emergency">${icon('phone', 15)} Medical escalation</button>` : ''}<button class="btn" data-w="invest">Medical investigation</button><button class="btn primary" data-close>Done</button></div>`);
    }

    m.body.addEventListener('input', (e) => {
      if (e.target.id === 'mood') m.body.querySelector('#moodv').textContent = e.target.value;
      if (e.target.dataset.ps) { const k = e.target.dataset.ps; st.pain[k].sev = +e.target.value; m.body.querySelector('#ps_' + k).textContent = e.target.value; }
    });
    m.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-w]'); if (!b) return; const w = b.dataset.w, v = b.dataset.v;
      if (w === 'type') { st.type = v; draw(); } else if (w === 'wb') { st.wellbeing = +v; draw(); } else if (w === 'gen') { st.gen.has(v) ? st.gen.delete(v) : st.gen.add(v); b.classList.toggle('on'); }
      else if (w === 'pain') { st.painOn = v === '1'; if (!st.painOn) st.pain = {}; draw(); } else if (w === 'ptopic') { if (st.pain[v]) delete st.pain[v]; else st.pain[v] = { sev: 4, sx: new Set() }; draw(); }
      else if (w === 'psx') { const p = st.pain[b.dataset.t]; p.sx.has(v) ? p.sx.delete(v) : p.sx.add(v); b.classList.toggle('on'); }
      else if (w === 'next') { collect(); st.step++; draw(); } else if (w === 'back') { collect(); st.step--; draw(); }
      else if (w === 'useband') { ['hr', 'sbp', 'dbp', 'spo2', 'temp', 'rr'].forEach((k) => { const e2 = m.body.querySelector('#v_' + k); if (e2) e2.value = bandVal(k); }); }
      else if (w === 'invest') { m.close(); location.hash = '#/investigation'; }
    });
    draw();
  };

  /* ---------- Emergency protocol ---------- */
  function handover() {
    const m = AS.Model, mt = (k) => m.measures[k], L = [`BeaconCare HANDOVER REPORT – SIMULATED DEMONSTRATION DATA`, `Crew: ${m.sc.crew} · Mission DAY ${m.N} · ${AS.Clock.hhmm()} GMT`, `Vitals: HR ${fmt(mt('hr').value)} bpm; BP ${fmt(mt('sbp').value)}/${fmt(mt('dbp').value)} mmHg; SpO2 ${fmt(mt('spo2').value, 1)} %; Temp ${fmt(mt('temp').value, 1)} C; RR ${fmt(mt('rr').value)}/min`];
    m.pains.forEach((p) => L.push(`Reported: ${p.note || C.INV[p.topic].title} (severity ${p.severity}/10; features: ${(p.symptoms || []).join(', ') || 'n/a'})`));
    L.push('System status: ' + SYSTEMS.map((d) => `${d.name}=${STATUS[m.systems[d.id].status].label}`).join('; '));
    m.findings.forEach((f) => L.push(`Finding: ${f.title}`)); L.push('BeaconCare is decision support only – not a diagnosis.'); return L.join('\n');
  }
  AS.act['open-emergency'] = function () {
    const mod = AS.Model;
    const md = modal({ title: 'EMERGENCY MEDICAL PROTOCOL', danger: true, wide: true });
    md.set(`<div class="lvl lvl-emergency"><b>Do not delay</b><span>BeaconCare cannot diagnose or treat. Follow your mission’s emergency medical protocol. The steps below are a generic reminder – your mission checklists take precedence.</span></div>${AS.UI.helpers.list(C.EMERGENCY_STEPS)}
    <h5 class="mt">HANDOVER REPORT (what you can read to the flight surgeon)</h5><textarea class="handover" readonly rows="8">${esc(handover())}</textarea>
    <div class="m-foot"><button class="btn" data-w="copy">Copy report</button><button class="btn danger" data-w="alert">${icon('phone', 15)} ALERT CREW MEDICAL OFFICER (simulated)</button><button class="btn primary" data-close>Close</button></div><p class="muted xs" id="em-msg"></p>`);
    md.body.addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (!b) return; const msg = md.body.querySelector('#em-msg');
      if (b.dataset.w === 'copy') { const t = md.body.querySelector('.handover'); t.select(); try { navigator.clipboard.writeText(t.value); msg.textContent = 'Copied to clipboard.'; } catch (x) { document.execCommand('copy'); msg.textContent = 'Copied.'; } }
      if (b.dataset.w === 'alert') { msg.innerHTML = `<b>SIMULATION:</b> in a real deployment this button would sound the onboard medical alarm and open the priority medical channel to the flight surgeon (one-way signal delay ≈ ${mod.sc.commDelayMin} min – act on onboard medical officer guidance first). No real alert was sent.`; } });
  };

  /* ---------- schedule & mission clock ---------- */
  AS.act['open-sched'] = function () {
    const S = AS.Store.get(), md = modal({ title: 'Checkup schedule & mission clock' });
    const draw = () => { const ck = AS.Engine.checkups(); md.set(`<p class="muted sm">Reminders follow <b>spacecraft mission time (GMT)</b>, not Earth local time. Mission time now: <b>${AS.Clock.hhmm()} GMT</b> · Your device local time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>
      <div class="mrow"><label class="fld"><span>Wake-up time (mission GMT)</span><input type="time" id="s_wake" value="${S.settings.wake}"></label><label class="fld"><span>Sleep time (mission GMT)</span><input type="time" id="s_sleep" value="${S.settings.sleep}"></label></div>
      <div class="grid3"><div class="kv"><span>Morning checkup window</span><b>${ck.morning.start}–${ck.morning.end} · ${ck.morning.status.toUpperCase()}</b></div><div class="kv"><span>Evening checkup window</span><b>${ck.evening.start}–${ck.evening.end} · ${ck.evening.status.toUpperCase()}</b></div></div>
      <h5 class="mt">Demo: mission clock control</h5><p class="muted xs">Jump the simulated mission clock to see reminders and missed-checkup alerts without waiting.</p><div class="chips"><button class="chip" data-w="jm">Morning window opens</button><button class="chip" data-w="je">Evening window opens</button><button class="chip" data-w="jx">After evening window</button><button class="chip" data-w="jr">Resume real time</button></div>
      <div class="m-foot"><button class="btn primary" data-w="save">Save schedule</button></div>`); };
    draw();
    md.body.addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (!b) return; const w = b.dataset.w;
      const pad = (n) => String(Math.floor(((n % 1440) + 1440) % 1440 / 60)).padStart(2, '0') + ':' + String(((n % 1440) + 1440) % 60).padStart(2, '0');
      const wake = AS.Clock.parse(S.settings.wake), sl = AS.Clock.parse(S.settings.sleep), eStart = Math.max(wake + 240, sl - 120);
      if (w === 'save') { S.settings.wake = md.body.querySelector('#s_wake').value || '06:30'; S.settings.sleep = md.body.querySelector('#s_sleep').value || '22:30'; AS.Store.saveNow(); AS.Engine.rebuild(); AS.emit('model'); md.close(); AS.UI.toast({ sev: 'info', title: 'Schedule saved', body: `Wake ${S.settings.wake} · sleep ${S.settings.sleep} (mission GMT).` }); return; }
      if (w === 'jm') AS.Clock.jumpTo(pad(wake + 15)); if (w === 'je') AS.Clock.jumpTo(pad(eStart + 10)); if (w === 'jx') AS.Clock.jumpTo(pad(sl + 20)); if (w === 'jr') AS.Clock.reset();
      AS.Engine.rebuild(); AS.emit('model'); AS.emit('remind'); draw(); });
  };
})();
