/* BeaconCare – SPACEFLIGHT HAZARDS: 5 NASA hazards organised into 4 monitoring sections */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc, STATUS, worst, fmt, mean, clamp } = AS.U;
  const { icon, pill, sim, Illus } = AS.UI;
  const { M, SYSTEMS, evalMetric } = AS.D;
  const C = AS.C, Ch = AS.Charts;
  AS.Views = AS.Views || {};

  let root = null, section = 'radiation', mini = null, rad = null, breathT = null, exSel = null, exView = null;

  const SECTIONS = [
    { id: 'radiation', label: 'Space radiation', n: '1', ico: 'radiation' },
    { id: 'gravity', label: 'Altered gravity', n: '4', ico: 'muscular' },
    { id: 'behavioral', label: 'Behavioral health', n: '2 · 3', ico: 'nervous' },
    { id: 'environment', label: 'Hostile environment & body regulation', n: '5', ico: 'immune' },
  ];
  const KEYS = { radiation: ['radPct'], gravity: ['bmd', 'uCa', 'muscle', 'strength', 'resMin'], behavioral: ['stress', 'mood', 'cog', 'anx', 'phq', 'social'], environment: ['sleepH', 'sleepQ', 'kcal', 'protein', 'hydration', 'vitD', 'wbc', 'wtChg'] };
  const SYS = { radiation: ['skeletal', 'digestive', 'respiratory', 'nervous', 'cardiovascular', 'immune', 'endocrine'], gravity: ['skeletal', 'muscular', 'cardiovascular', 'urinary'], behavioral: ['nervous', 'endocrine', 'cardiovascular'], environment: ['nervous', 'immune', 'digestive', 'endocrine', 'urinary'] };
  const FIND = { radiation: ['radiation'], gravity: ['decond'], behavioral: ['behav', 'strain'], environment: ['nutrition', 'immune', 'strain'] };
  const secStatus = (id) => KEYS[id].reduce((s, k) => worst(s, AS.Model.measures[k].status), 'ok');

  const ser = (key, name, color, o) => ({ name, color, area: o && o.area, dash: o && o.dash, pts: AS.Model.recs.map((r) => ({ x: r.d, y: o && o.lab ? (r.lab ? r.lab[key] : null) : r[key] })).filter((p) => p.y != null) });
  const card = (n, title, body, cls) => `<div class="card glass hzc ${cls || ''}"><h4><b class="num">${n}</b>${title}</h4>${body}</div>`;
  const tile = (k, label) => { const m = AS.Model.measures[k]; return `<div class="mtile s-${m.status}" title="${esc(m.ref)}"><span>${esc(label || m.label)}</span><b>${m.value == null ? '—' : Number(m.value).toFixed(m.dec)}<small>${esc(m.unit)}</small></b>${pill(m.status)}</div>`; };
  const bullet = (a) => `<ul class="bul">${a.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const marks = () => { const o = AS.Model.sc.intervention; return o ? [{ x: o, label: 'Intervention', color: '#78c4b0' }] : []; };

  function alertsFor(id) {
    const m = AS.Model, out = [];
    m.findings.filter((f) => FIND[id].includes(f.id)).forEach((f) => out.push({ sev: f.sev, t: f.title, d: f.evidence[0] || '', why: f.why, sys: f.systems[0] }));
    KEYS[id].forEach((k) => { const x = m.measures[k]; if (x.status !== 'ok') out.push({ sev: x.status, t: `${x.label}: ${Number(x.value).toFixed(x.dec)} ${x.unit}`, d: `${x.dir === 'high' ? 'Above' : 'Below'} the reference/assessment range. ${x.ref.split('.')[0]}.`, sys: SYSTEMS.find((s) => s.metrics.includes(k)) ? SYSTEMS.find((s) => s.metrics.includes(k)).id : 'nervous' }); });
    return out;
  }
  const alertsHtml = (id) => { const a = alertsFor(id); return a.length ? a.map((x) => `<div class="alrt s-${x.sev}"><i></i><div><b>${esc(x.t)}</b><small>${esc(x.d)}</small>${x.why ? `<details><summary>Why was this flagged?</summary><p class="sm">${esc(x.why)}</p></details>` : ''}<a class="lnk" href="#/investigation?sys=${x.sys}">Open in Medical Investigation →</a></div></div>`).join('') : '<p class="ok-note">No concerning changes detected in this section.</p>'; };
  const sysChips = (id) => `<div class="chips">${SYS[id].map((s) => { const st = AS.Model.systems[s]; return `<button class="chip sysc s-${st.status}" data-act="hz-sys" data-id="${s}">${icon(s, 14)} ${esc(st.def.name)} <i class="sdot s-${st.status}"></i></button>`; }).join('')}</div>`;

  /* ----- section builders ----- */
  function radiation() {
    const m = AS.Model, st = secStatus('radiation'), r = m.recs, today = r[m.N - 1].rad, avg = mean(r.map((x) => x.rad));
    let cum = 0; const cumS = r.map((x) => { cum += x.rad; return { x: x.d, y: +cum.toFixed(2) }; });
    const spe = r.filter((x) => x.rad > 3).map((x) => ({ x: x.d, label: 'SPE', color: '#b58bc9' }));
    const B = m.RAD_BUDGET;
    return `
    ${card(1, 'Current status', `<div class="stat-big s-${st}">${pill(st)} <b>${st === 'ok' ? 'Radiation exposure is below the advisory level.' : st === 'warn' ? 'Advisory level reached – plan the remaining dose.' : 'Caution level reached – review with radiation operations.'}</b></div><p class="muted sm">${m.radCum.toFixed(1)} mSv accumulated over ${m.N} days = <b>${m.radPct.toFixed(0)} %</b> of the illustrative ${B} mSv mission dose budget. Daily dose today ${today.toFixed(2)} mSv (mission mean ${avg.toFixed(2)}). ${r.some((x) => x.rad > 3) ? 'A solar particle event (SPE) is recorded in the history.' : 'No solar particle events recorded.'}</p><div class="note-box">${icon('info', 15)} <span>Budget and alert levels are <b>illustrative demonstration values</b> set by mission planners – not NASA limits. NASA’s career effective-dose limit is 600 mSv (NASA-STD-3001, 2022 update). Dose values here are simulated.</span></div>`, 'span2')}
    ${card(2, 'Relevant measurements', `<div class="tilegrid">${tile('rad', 'Dose today')}<div class="mtile"><span>Cumulative dose</span><b>${m.radCum.toFixed(1)}<small>mSv</small></b>${sim()}</div>${tile('radPct', 'Budget used')}<div class="mtile"><span>Mission mean</span><b>${avg.toFixed(2)}<small>mSv/day</small></b>${sim()}</div></div>${Ch.hbars([{ label: 'Mission dose budget used', value: m.radPct, max: 100, text: m.radPct.toFixed(0) + ' %', color: STATUS[st].color, target: 50 }])}<p class="muted xs">White marker = advisory 50 %. Caution at 80 %.</p>`)}
    ${card(3, 'Historical graphs', `<h5>Daily dose equivalent (mSv/day)</h5>${Ch.line({ series: [ser('rad', 'Daily dose', '#b58bc9', { area: true })], marks: spe, height: 170, yMin: 0, unit: 'mSv', dec: 2, title: 'Daily radiation dose' })}<h5 class="mt">Cumulative dose vs illustrative budget (mSv)</h5>${Ch.line({ series: [{ name: 'Cumulative', color: '#7fb6d4', area: true, pts: cumS }], lines: [{ y: B * 0.5, label: 'Advisory 50 %', color: '#e3b34f' }, { y: B * 0.8, label: 'Caution 80 %', color: '#e0646f' }], height: 190, yMin: 0, yMax: B, unit: 'mSv', title: 'Cumulative dose' })}`, 'span2')}
    ${card('▶', 'Interactive: radiation meeting the body', `<div class="radbox"><div class="radcv-wrap"><canvas id="radcv" aria-label="Radiation particles passing through the body"></canvas><div class="rad-ctrl"><button class="btn sm" id="shbtn" data-act="rad-shield">${icon('radiation', 14)} Shield: off</button><button class="btn sm danger" data-act="rad-spe">Simulate solar particle event</button></div></div><div><div class="note-box">${icon('info', 15)} <span>Educational simulation: streaks are galactic cosmic-ray ions, dots are solar protons. Organ glow reflects relative radiosensitivity and your cumulative dose. Click an organ for its effects.</span></div><div id="radorg" class="radorg"></div><div id="radinfo" class="radinfo"></div></div></div>`, 'span2')}
    ${card(4, 'Effects on the human body', `${Illus.dna()}${bullet(['<b>DNA &amp; cells:</b> high-energy ions create clustered DNA double-strand breaks that are harder to repair than damage from terrestrial radiation, and cause oxidative stress.', '<b>Long-term cancer risk:</b> risk rises with cumulative dose; NASA limits the lifetime risk of exposure-induced cancer death to 3 % (95 % confidence). Individual risk cannot be predicted by BeaconCare.', '<b>Cardiovascular effects:</b> emerging evidence links space-radiation exposure to vascular inflammation and degenerative changes – uncertainty remains large.', '<b>Central nervous system:</b> heavy ions may affect neural tissue; consequences for cognition are still being studied.', '<b>Acute effects:</b> only very large solar particle events could cause acute radiation sickness – hence storm-shelter protocols.'])}`)}
    ${card(5, 'Affected anatomical systems', `${sysChips('radiation')}<div class="minibox"><canvas id="minicv"></canvas></div>`)}
    ${card(6, 'Recommended preventive actions', bullet(['Follow the storm-shelter protocol immediately when a solar particle event is announced.', 'Use the best-shielded areas (e.g. water- or supply-lined volumes) for sleep and rest where possible.', 'Review the dose budget with mission radiation operations before planning extra-vehicular activity.', 'Keep nutrition rich in antioxidant-containing foods and maintain sleep – supportive but no substitute for shielding.', 'Report any acute symptoms (nausea, vomiting, fatigue) after an event to the medical officer.']))}
    ${card(7, 'ALERTS', alertsHtml('radiation'))}`;
  }

  function gravity() {
    const m = AS.Model, st = secStatus('gravity'), c = m.cur, r = m.recs;
    const last28 = r.slice(-28), week = r.slice(-7), res7 = week.filter((x) => x.resMin >= 30).length;
    const cal = last28.map((x) => `<i class="cal ${x.resMin >= 40 ? 'g' : x.resMin >= 20 ? 'y' : x.resMin > 0 ? 'r' : 'n'}" title="Day ${x.d}: resistance ${Math.round(x.resMin)} min / exercise ${Math.round(x.exMin)} min"></i>`).join('');
    const maintaining = c.muscle >= 97 && c.strength >= 95 && c.bmd >= 98;
    const verdict = maintaining ? 'Physical condition is being maintained.' : st === 'crit' ? 'Physical condition is declining significantly.' : 'Some decline from baseline – countermeasures need attention.';
    return `
    ${card(1, 'Current status', `<div class="stat-big s-${st}">${pill(st)} <b>${verdict}</b></div><p class="muted sm">Microgravity removes mechanical loading: bone is resorbed (calcium is lost in urine) and antigravity muscles atrophy. BeaconCare tracks bone and muscle indices against your pre-flight baseline plus the exercise countermeasures that protect them. Indices are demonstration estimates.</p>`, 'span2')}
    ${card(2, 'Relevant measurements', `<div class="tilegrid">${tile('bmd')}${tile('uCa')}${tile('muscle')}${tile('strength')}${tile('resMin', 'Resistance (7-day mean)')}${tile('exMin', 'Exercise (7-day mean)')}</div><p class="muted xs">Fracture susceptibility rises as bone index falls (no clinical fracture threshold is implied here). Unmitigated loss is typically about 1–1.5 % per month in weight-bearing bone.</p>`)}
    ${card(3, 'Historical graphs', `<h5>Bone density index (% of pre-flight baseline)</h5>${Ch.line({ series: [ser('bmd', 'Bone index', '#cfd9ea', { lab: true, area: true })], bands: [{ lo: 98, hi: 110, color: '#4fbf8e' }, { lo: 95, hi: 98, color: '#e3b34f', op: 0.1 }], height: 160, yMin: 92, yMax: 101, unit: '%', title: 'Bone density' })}<h5 class="mt">Bone resorption: urinary calcium (mg/24 h)</h5>${Ch.line({ series: [ser('uCa', 'Urinary Ca', '#7f98d6', { lab: true })], bands: [{ lo: 100, hi: 300, color: '#4fbf8e' }], height: 150, unit: 'mg', dec: 0, title: 'Urinary calcium' })}<h5 class="mt">Muscle mass &amp; strength index (% of baseline)</h5>${Ch.line({ series: [ser('muscle', 'Muscle mass', '#e0956a', { lab: true }), ser('strength', 'Strength', '#e3c077', { lab: true })], bands: [{ lo: 95, hi: 110, color: '#4fbf8e' }], height: 170, yMin: 84, yMax: 101, unit: '%', title: 'Muscle indices' })}<h5 class="mt">Exercise minutes per day</h5>${Ch.line({ series: [ser('exMin', 'Total exercise', '#7fb6d4'), ser('resMin', 'Resistance', '#4fbf8e')], marks: marks(), height: 170, unit: 'min', dec: 0, title: 'Exercise' })}`, 'span2')}
    ${card('▶', 'Exercise countermeasures – interactive', `<div class="exwrap"><div class="exlist">${C.EXERCISES.map((e) => `<div class="exrow ${exSel === e.id ? 'on' : ''}" data-act="ex-sel" data-id="${e.id}" tabindex="0" role="button"><div><b>${esc(e.name)}</b><small>${esc(e.device)} · ${esc(e.rx)}</small><div class="chips mini">${e.groups.map((g) => `<span class="chip sm">${esc(C.GROUPS[g])}</span>`).join('')}</div></div><div class="exbtns"><button class="btn sm primary" data-act="ex-demo" data-id="${e.id}">Watch demo</button><button class="btn sm" data-act="ex-log" data-id="${e.id}">Log session</button></div></div>`).join('')}</div><div class="exview"><canvas id="excv" aria-label="Muscle groups targeted by the selected exercise"></canvas><div id="exinfo" class="exinfo muted sm">Select an exercise to see which muscles it targets and why.</div></div></div>
      <div class="adh"><div><h5>Resistance adherence – last 28 days</h5><div class="calgrid">${cal}</div><div class="legend-mini"><span style="--c:#4fbf8e">≥ 40 min</span><span style="--c:#e3b34f">20–40</span><span style="--c:#e0646f">&lt; 20</span><span style="--c:#394b66">none</span></div></div><div class="kv"><span>This week</span><b>${res7} / 7 days with a resistance session (target ≥ 4)</b><span>Tracking</span><b class="s-${res7 >= 4 ? 'ok' : res7 >= 2 ? 'warn' : 'crit'}">${res7 >= 4 ? 'On target' : res7 >= 2 ? 'Below target' : 'Insufficient – review schedule'}</b></div></div>`, 'span2')}
    ${card(4, 'Effects on the human body', `<h5>Healthy versus weakened muscle</h5>${Illus.muscle(c.muscle)}<h5 class="mt">Bone microarchitecture</h5>${Illus.bone(c.bmd)}${bullet(['<b>Skeletal:</b> reduced loading increases bone resorption and calcium loss, lowering bone mineral density and raising fracture susceptibility; extra urinary calcium raises kidney-stone risk.', '<b>Muscular:</b> unloaded antigravity muscles (calves, quadriceps, back, core) lose mass and strength – performance suffers for emergency egress and surface tasks.', '<b>Fluid shift:</b> body fluids move headward, altering cardiovascular conditioning and contributing to puffy face, congestion and headaches.'])}`)}
    ${card(5, 'Affected anatomical systems', `${sysChips('gravity')}<div class="minibox"><canvas id="minicv"></canvas></div>`)}
    ${card(6, 'Recommended preventive actions', bullet(['Complete scheduled ARED resistance sessions (squat, deadlift, heel raise) – the main bone and muscle countermeasure.', 'Add core and back work to protect the spine from microgravity elongation.', 'Keep protein, energy, calcium and vitamin D intake on target.', 'Drink ≥ 2 L of fluid daily to limit renal-stone risk while calcium excretion is high.', 'Log every session so BeaconCare can track whether your condition is maintained.']))}
    ${card(7, 'ALERTS', alertsHtml('gravity'))}`;
  }

  function behavioral() {
    const m = AS.Model, st = secStatus('behavioral'), c = m.cur, d = m.sc.commDelayMin;
    const moodNow = Math.round(m.recs[m.N - 1].mood);
    return `
    ${card(1, 'Current status', `<div class="stat-big s-${st}">${pill(st)} <b>${st === 'ok' ? 'Behavioral-health indicators are stable.' : 'Some behavioral-health indicators have changed from baseline.'}</b></div><p class="muted sm">Covers the NASA hazards <b>Isolation &amp; Confinement</b> and <b>Distance from Earth</b>. BeaconCare monitors stress, mood, cognition and social contact, and flags changes over time. <b>It never diagnoses depression, anxiety or any psychiatric condition</b> – questionnaire scores are screening aids that point to a conversation with the support team.</p>`, 'span2')}
    ${card(2, 'Relevant measurements', `<div class="tilegrid">${tile('stress')}${tile('mood')}${tile('anx')}${tile('phq')}${tile('social')}${tile('cog')}</div><div class="grid2"><div class="kv"><span>Distance from Earth – one-way signal delay</span><b>≈ ${d.toFixed(1)} min <small>(round trip ≈ ${(d * 2).toFixed(1)} min)</small></b></div><div class="kv"><span>Emotional stability</span><b>${st === 'ok' ? 'Stable' : 'Fluctuating – see trends'}</b></div></div>`)}
    ${card(3, 'Historical graphs', `<h5>Mood &amp; stress (0–10)</h5>${Ch.line({ series: [ser('mood', 'Mood', '#78c4b0'), ser('stress', 'Stress', '#e0956a')], marks: marks(), height: 180, yMin: 0, yMax: 10, unit: '/10', title: 'Mood and stress' })}<h5 class="mt">Cognitive performance &amp; social interaction</h5>${Ch.line({ series: [ser('cog', 'Cognition index', '#a999d6')], bands: [{ lo: 85, hi: 110, color: '#4fbf8e' }], height: 150, unit: '', title: 'Cognition' })}${Ch.line({ series: [ser('social', 'Crew contact (min/day)', '#7fb6d4', { area: true })], bands: [{ lo: 60, hi: 200, color: '#4fbf8e' }], height: 140, unit: 'min', dec: 0, title: 'Social interaction' })}<h5 class="mt">Screening scores (7-day mean, 0–6)</h5>${Ch.line({ series: [ser('anx', 'GAD-2', '#e3b34f'), ser('phq', 'PHQ-2', '#7f98d6')], lines: [{ y: 3, label: 'Follow-up threshold (3)', color: '#e0956a' }], yMin: 0, yMax: 6, height: 140, unit: '', dec: 0, title: 'Screening scores' })}`, 'span2')}
    ${card('▶', 'DAILY MOOD CHECK-IN &amp; QUESTIONNAIRES', `<p class="muted sm">How is your mood right now?</p><div class="mood-row">${[['😞', 2, 'Low'], ['😕', 4, 'Down'], ['😐', 6, 'Okay'], ['🙂', 8, 'Good'], ['😄', 10, 'Great']].map((x) => `<button class="mood ${Math.abs(moodNow - x[1]) <= 1 ? 'on' : ''}" data-act="mood-set" data-v="${x[1]}"><span>${x[0]}</span><small>${x[2]}</small></button>`).join('')}</div><div class="chips"><button class="btn sm" data-act="stress-q">Stress questionnaire</button><button class="btn sm" data-act="screen-q">PHQ-2 / GAD-2 weekly screen</button></div><h5 class="mt">Guided breathing</h5><div class="breath"><div class="bcircle" id="bcircle"><span id="btxt">Ready</span></div><div><p class="muted sm">4 s in · 4 s hold · 6 s out. Slow breathing activates the parasympathetic system and reduces perceived stress.</p><button class="btn sm primary" data-act="breath">Start</button></div></div>`, 'span2')}
    ${card(4, 'Effects on the human body', `${Illus.flow([{ t: 'Isolation' }, { t: 'Stress ↑', c: '#e0956a' }, { t: 'Sleep ↓', c: '#e3b34f' }, { t: 'Mood & cognition ↓', c: '#e0646f' }])}${bullet(['<b>Isolation &amp; confinement:</b> limited privacy, monotony and small-crew dynamics raise stress and can erode mood and cohesion.', '<b>Distance from Earth:</b> a ${d.toFixed(1)}-minute one-way communication delay means real-time ground support is not possible; autonomy and self-monitoring become essential.'.replace('${d.toFixed(1)}', d.toFixed(1)), '<b>Body effects:</b> chronic stress raises heart rate and blood pressure, fragments sleep and alters immune and hormonal regulation.', '<b>Performance:</b> attention, memory and decision quality fall when sleep, mood and social contact decline.'])}`)}
    ${card(5, 'Affected anatomical systems', `${sysChips('behavioral')}<div class="minibox"><canvas id="minicv"></canvas></div>`)}
    ${card(6, 'Recommended preventive actions', bullet(['<b>Relaxation &amp; breathing exercises</b> – use the guided breathing above once or twice daily.', '<b>Maintain communication with the crew</b> – shared meals and a recreational activity every day.', '<b>Structured daily routine</b> – consistent wake/sleep window, scheduled exercise and leisure.', '<b>Psychological support</b> – schedule private conferences with the behavioral-health team, especially if screening scores stay elevated.', 'Keep contact with family and friends through the scheduled communication windows.']))}
    ${card(7, 'ALERTS', alertsHtml('behavioral'))}`;
  }

  function environment() {
    const m = AS.Model, st = secStatus('environment'), c = m.cur, r = m.recs, w7 = r.slice(-7);
    const mic = ['vitD', 'ca', 'fe', 'vitC', 'mg'], micN = { vitD: 'Vitamin D', ca: 'Calcium', fe: 'Iron', vitC: 'Vitamin C', mg: 'Magnesium' };
    const labs = [['wbc', 'White blood cells'], ['hb', 'Haemoglobin'], ['vitD', '25-OH vitamin D'], ['glucose', 'Fasting glucose']];
    const base = r.find((x) => x.lab).lab;
    const immFlags = [];
    if (c.wbc > 11 || c.wbc < 4.5) immFlags.push('White-cell count outside 4.5–11 ×10⁹/L');
    if (c.wbcRel >= 0.3) immFlags.push(`White-cell count ${(c.wbcRel * 100).toFixed(0)} % above your first value`);
    if (c.temp > 37.2) immFlags.push('Body temperature above the usual range');
    if (m.findings.some((f) => f.id === 'immune')) immFlags.push('Sleep loss + stress + rising WBC pattern present');
    return `
    ${card(1, 'Current status', `<div class="stat-big s-${st}">${pill(st)} <b>${st === 'ok' ? 'Sleep, nutrition and immune markers are in range.' : 'Sleep, nutrition or immune markers need attention.'}</b></div><p class="muted sm">Covers the NASA hazard <b>Hostile / Closed Environments</b>: the habitat itself affects circadian rhythm, appetite and immune regulation. BeaconCare tracks sleep, nutrition and immune markers together because they influence each other.</p>`, 'span2')}
    ${card(2, 'Relevant measurements', `<h5>Sleep</h5><div class="tilegrid">${tile('sleepH', 'Sleep duration (7-d)')}${tile('sleepQ', 'Sleep quality')}<div class="mtile"><span>Consistency (SD)</span><b>${(Math.sqrt(mean(w7.map((x) => Math.pow(x.sleepH - mean(w7.map((y) => y.sleepH)), 2)))) || 0).toFixed(2)}<small>h</small></b>${sim()}</div><div class="mtile"><span>Interruptions</span><b>${fmt(c.wake, 1)}<small>/night</small></b>${sim()}</div></div><h5 class="mt">Nutrition (7-day mean)</h5><div class="tilegrid">${tile('kcal')}${tile('protein')}${tile('carbs', 'Carbohydrate')}${tile('fat', 'Fat')}${tile('hydration')}${tile('wtChg')}</div><h5 class="mt">Immune &amp; labs (latest panel)</h5><div class="tilegrid">${tile('wbc')}${tile('hb')}${tile('vitD')}${tile('glucose')}</div>`)}
    ${card(3, 'Historical graphs', `<h5>Sleep duration (h) with 7–9 h recommended band</h5>${Ch.line({ series: [ser('sleepH', 'Sleep', '#7f98d6', { area: true })], bands: [{ lo: 7, hi: 9, color: '#4fbf8e' }], marks: marks(), height: 170, unit: 'h', title: 'Sleep duration' })}${Ch.line({ series: [ser('sleepQ', 'Quality index', '#a999d6'), ser('wake', 'Interruptions ×10', '#e3b34f')].map((s, i) => (i === 1 ? Object.assign(s, { pts: s.pts.map((p) => ({ x: p.x, y: p.y * 10 })) }) : s)), height: 140, unit: '', dec: 0, title: 'Sleep quality' })}<h5 class="mt">Energy &amp; protein intake</h5>${Ch.line({ series: [ser('kcal', 'kcal', '#a9c96e')], lines: [{ y: 2800, label: 'Target 2800', color: '#fff' }], height: 150, unit: 'kcal', dec: 0, title: 'Energy intake' })}${Ch.line({ series: [ser('protein', 'Protein g', '#e0956a')], lines: [{ y: 90, label: 'Target ≥ 90 g', color: '#fff' }], height: 140, unit: 'g', dec: 0, title: 'Protein intake' })}<h5 class="mt">Hydration (L/day) &amp; body mass (kg)</h5>${Ch.line({ series: [ser('hydration', 'Fluids', '#7fb6d4')], bands: [{ lo: 2, hi: 5, color: '#4fbf8e' }], height: 130, unit: 'L', title: 'Hydration' })}${Ch.line({ series: [ser('weight', 'Body mass', '#cfd9ea')], height: 130, unit: 'kg', title: 'Body mass' })}<h5 class="mt">White blood cell count (×10⁹/L)</h5>${Ch.line({ series: [ser('wbc', 'WBC', '#78c4b0', { lab: true })], bands: [{ lo: 4.5, hi: 11, color: '#4fbf8e' }], height: 150, yMin: 3, yMax: 13, unit: '', title: 'White blood cells' })}`, 'span2')}
    ${card('▶', 'NUTRITION &amp; IMMUNE DETAIL', `<div class="grid2"><div><h5>Macronutrients (7-day mean vs target)</h5>${Ch.bars({ items: [{ label: 'Protein g', value: c.protein, target: 105, color: '#e0956a' }, { label: 'Carbs g', value: c.carbs, target: 385, color: '#a9c96e' }, { label: 'Fat g', value: c.fat, target: 100, color: '#e3c077' }], height: 170, title: 'Macronutrients', max: 450 })}</div><div><h5>Micronutrient intake (% of target)</h5>${Ch.hbars(mic.map((k) => { const v = mean(w7.map((x) => x.micro[k])); return { label: micN[k], value: v, max: 120, text: v.toFixed(0) + ' %', color: v >= 85 ? '#4fbf8e' : v >= 65 ? '#e3b34f' : '#e0646f', target: 100 }; }), {})}<p class="muted xs">Intake shortfalls are confirmed only by blood tests: latest 25-OH vitamin D ${fmt(c.vitD)} ng/mL (${AS.Model.measures.vitD.status === 'ok' ? 'sufficient' : 'below the sufficient range'}).</p></div></div>
      <h5 class="mt">Latest laboratory panel (Day ${[...r].reverse().find((x) => x.lab).d})</h5><table class="tbl"><thead><tr><th>Test</th><th>First value</th><th>Latest</th><th>Reference</th><th>Status</th></tr></thead><tbody>${labs.map((l) => { const mm = M[l[0]], v = c[l[0]], s = evalMetric(l[0], v).status; return `<tr><td>${l[1]}</td><td>${base[l[0]].toFixed(mm.dec)}</td><td><b>${Number(v).toFixed(mm.dec)}</b> ${esc(mm.unit)}</td><td class="muted xs">${esc(mm.ref.split('.')[0])}</td><td>${pill(s)}</td></tr>`; }).join('')}</tbody></table>
      <h5 class="mt">Potential indicators of immune dysfunction</h5>${immFlags.length ? bullet(immFlags.map(esc)) : '<p class="ok-note">None detected.</p>'}`, 'span2')}
    ${card(4, 'Effects on the human body', `${Illus.flow([{ t: 'Sleep loss', c: '#7f98d6' }, { t: 'Stress hormones ↑', c: '#e3b34f' }, { t: 'Poor nutrition', c: '#e0956a' }, { t: 'Immune ↓', c: '#e0646f' }])}${bullet(['<b>Sleep → immunity:</b> short or fragmented sleep reduces immune-cell activity and raises inflammatory signalling, making infection or viral reactivation more likely.', '<b>Nutrition → immunity:</b> energy, protein, vitamin D, iron and other micronutrient shortfalls limit immune-cell production and wound healing.', '<b>Closed habitat:</b> altered circadian cues, air quality and microbial environment add load; documented latent-virus reactivation in flight shows immune regulation shifts.', '<b>Body regulation:</b> chronic sleep loss plus under-eating also disturb glucose control, appetite hormones and muscle/bone maintenance.'])}`)}
    ${card(5, 'Affected anatomical systems', `${sysChips('environment')}<div class="minibox"><canvas id="minicv"></canvas></div>`)}
    ${card(6, 'Recommended preventive actions', bullet(['Keep a fixed sleep window; dim lights and avoid exercise in the last hour before sleep.', 'Log meals daily; aim for protein at every meal and meet the energy target; request a dietitian review if intake lags.', 'Maintain vitamin D / calcium intake as prescribed by the flight surgeon (BeaconCare does not set doses).', 'Hydrate steadily; keep habitation surfaces and hygiene routines.', 'Report fever, rash, sore throat or slow-healing wounds early.']))}
    ${card(7, 'ALERTS', alertsHtml('environment'))}`;
  }

  const BUILD = { radiation, gravity, behavioral, environment };

  function head() {
    const m = AS.Model;
    return `<div class="hz-top"><div><h2>Spaceflight hazards</h2><p class="muted sm">NASA identifies five major hazards of human spaceflight. BeaconCare monitors them through four sections. ${sim()}</p></div></div>
    <div class="haz5">${C.HAZARDS5.map((h) => { const s = secStatus(h.section); return `<button class="hz5 s-${s} ${h.section === section ? 'on' : ''}" data-act="hz-sec" data-s="${h.section}"><span class="hn">${h.n}</span><b>${esc(h.name)}</b><small>${esc(h.blurb)}</small>${pill(s)}</button>`; }).join('')}</div>
    <div class="tabs2" role="tablist">${SECTIONS.map((s) => `<button role="tab" aria-selected="${s.id === section}" class="${s.id === section ? 'on' : ''} s-${secStatus(s.id)}" data-act="hz-sec" data-s="${s.id}">${icon(s.ico, 16)}<span><small>SECTION ${SECTIONS.indexOf(s) + 1}</small>${s.label}</span><i class="sdot s-${secStatus(s.id)}"></i></button>`).join('')}</div>`;
  }

  function render() {
    cleanup(); root.innerHTML = head() + `<div class="hz-grid" id="hzbody">${BUILD[section]()}</div><p class="srcs muted xs">Scientific basis: ${C.SOURCES.map((s) => `<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(' · ')}. Reference ranges are terrestrial unless stated; BeaconCare demonstration alert bands are not NASA-approved operational thresholds.</p>`;
    after();
  }

  function cleanup() { if (mini) mini.destroy(); if (rad) rad.destroy(); if (exView) exView.destroy(); mini = rad = exView = null; if (breathT) clearInterval(breathT); breathT = null; }

  function after() {
    const mc = root.querySelector('#minicv');
    if (mc) { mini = AS.Anatomy.create(mc, { auto: true, zoom: 1 }); const st = {}; SYSTEMS.forEach((s) => { st[s.id] = AS.Model.systems[s.id].status; }); mini.setStatuses(st); mini.setVisible(SYS[section]); mini.setHighlight(null); }
    if (section === 'radiation') initRad();
    if (section === 'gravity') { const ec = root.querySelector('#excv'); if (ec) { exView = AS.Anatomy.create(ec, { auto: true, yaw: 0.3 }); const st = {}; SYSTEMS.forEach((s) => { st[s.id] = AS.Model.systems[s.id].status; }); exView.setStatuses(st); exView.setVisible(['muscular']); exView.setMode('system'); if (exSel) pickEx(exSel); } }
  }

  /* ----- radiation simulation ----- */
  function initRad() {
    const cv = root.querySelector('#radcv'); if (!cv) return; rad = AS.Anatomy.create(cv, { auto: false, yaw: 0.25, zoom: 1 });
    const m = AS.Model, base = clamp(m.radPct / 100 * 1.1, 0, 0.5), dyn = {}, hits = {}; const parts = C.RAD_ORGANS; let shielded = false, spe = 0, particles = [], rings = [], lastT = 0, selOrg = null, acc = 0, lastUi = 0;
    rad.setMode('system'); rad.setDim(false);
    const render = () => { const el = root.querySelector('#radorg'); if (!el) return; el.innerHTML = parts.map((o) => `<button class="orow ${selOrg === o.id ? 'on' : ''}" data-act="rad-org" data-id="${o.id}"><span>${esc(o.name)}</span><div class="hbt"><div class="hbf" style="width:${Math.round(clamp((base * o.sens + (dyn[o.id] || 0)) * 100 / 0.9, 4, 100))}%;background:linear-gradient(90deg,#7fb6d4,#b58bc9)"></div></div><em>${hits[o.id] || 0} hits</em></button>`).join(''); };
    const info = () => { const el = root.querySelector('#radinfo'); if (!el) return; const o = parts.find((x) => x.id === selOrg); el.innerHTML = o ? `<b>${esc(o.name)}</b><p class="sm">${esc(o.mech)}</p><p class="muted xs">Relative radiosensitivity ${(o.sens * 100).toFixed(0)} %. Estimated cumulative dose context: ${m.radCum.toFixed(1)} mSv (${m.radPct.toFixed(0)} % of illustrative budget).</p>` : '<p class="muted sm">Click an organ system to read how radiation affects it.</p>'; };
    rad._ctl = { shield: () => { shielded = !shielded; const b = root.querySelector('#shbtn'); if (b) b.innerHTML = `${icon('radiation', 14)} SHIELD: ${shielded ? 'ON (storm shelter)' : 'OFF'}`; }, spe: () => { spe = 4; AS.UI.toast({ sev: 'warn', title: 'Solar particle event (simulation)', body: shielded ? 'Storm shelter active – most protons are stopped.' : 'Unshielded: protons are reaching tissue. In a real event, move to the storm shelter immediately.' }); }, org: (id) => { selOrg = id; rad.setSelected(id); rad.setDim(true); render(); info(); } };
    render(); info();
    rad.setOverlay((ctx, api, t, W, H) => {
      const dt = clamp(t - lastT, 0, 0.05); lastT = t; const sc = api.scale(), cx = W / 2, cy = H / 2, R = H * 0.46;
      // heat map
      const heat = {}; parts.forEach((o) => { dyn[o.id] = (dyn[o.id] || 0) * 0.995; heat[o.id] = clamp(base * o.sens + dyn[o.id], 0, 1); }); rad.setHeat(heat);
      acc += dt * (spe > 0 ? 70 : 5); while (acc >= 1) { acc -= 1; const ang = (Math.random() * 0.9 + 0.25) * Math.PI * (Math.random() < 0.5 ? 1 : -1) / 1.6 + Math.PI / 2; const side = Math.random(); const px = side < 0.5 ? Math.random() * W : (side < 0.75 ? -10 : W + 10), py = side < 0.5 ? -10 : Math.random() * H * 0.5; const dir = Math.atan2(cy - py + (Math.random() - 0.5) * H * 0.5, cx - px + (Math.random() - 0.5) * W * 0.4); const sp = spe > 0 ? 330 : 520; particles.push({ x: px, y: py, vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, type: spe > 0 ? 'p' : 'g', in: false, dead: false }); }
      if (spe > 0) { spe -= dt; ctx.fillStyle = 'rgba(224,100,111,.9)'; ctx.font = '700 12px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Solar particle event – simulated', W / 2, 20); }
      if (shielded) { ctx.save(); ctx.strokeStyle = 'rgba(76,240,208,.55)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.restore(); }
      for (const p of particles) {
        const ox = p.x, oy = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
        if (shielded && !p.in && Math.hypot(p.x - cx, p.y - cy) < R) { if (p.type === 'p' || Math.random() < 0.8) { p.dead = true; rings.push({ x: p.x, y: p.y, t: 0, c: '76,240,208' }); continue; } p.in = true; }
        const inBody = Math.abs(p.x - cx) < 0.24 * sc && Math.abs(p.y - cy) < 0.9 * sc;
        if (inBody && !p.in) { p.in = true; if (Math.random() < (p.type === 'p' ? 0.5 : 0.8)) { let r = Math.random() * parts.reduce((s, o) => s + o.sens, 0), o = parts[0]; for (const q of parts) { r -= q.sens; if (r <= 0) { o = q; break; } } const c = api.sysCenter(o.id); if (c) { rings.push({ x: c.x, y: c.y, t: 0, c: '255,61,240' }); dyn[o.id] = Math.min(0.5, (dyn[o.id] || 0) + 0.035); hits[o.id] = (hits[o.id] || 0) + 1; } } }
        if (p.x < -40 || p.x > W + 40 || p.y > H + 40) p.dead = true;
        ctx.strokeStyle = p.type === 'p' ? 'rgba(255,150,80,.9)' : 'rgba(150,235,255,.9)'; ctx.lineWidth = p.type === 'p' ? 2.4 : 1.4; ctx.beginPath(); ctx.moveTo(ox - p.vx * 0.03, oy - p.vy * 0.03); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      particles = particles.filter((p) => !p.dead); if (particles.length > 260) particles.splice(0, particles.length - 260);
      rings.forEach((g) => { g.t += dt; ctx.strokeStyle = `rgba(${g.c},${Math.max(0, 1 - g.t * 1.6)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(g.x, g.y, 4 + g.t * 38, 0, 7); ctx.stroke(); }); rings = rings.filter((g) => g.t < 0.65);
      if (t - lastUi > 0.8) { lastUi = t; if (!root || !root.querySelector('#radorg')) return; const el = root.querySelectorAll('#radorg .orow'); el.forEach((row, i) => { const o = parts[i]; if (!o) return; row.querySelector('em').textContent = (hits[o.id] || 0) + ' hits'; row.querySelector('.hbf').style.width = Math.round(clamp((base * o.sens + (dyn[o.id] || 0)) * 100 / 0.9, 4, 100)) + '%'; }); }
    });
  }

  function pickEx(id) {
    exSel = id; const e = C.EXERCISES.find((x) => x.id === id); if (!e || !exView) return;
    exView.setHighlight(e.groups.map((g) => 'm_' + g)); const el = root.querySelector('#exinfo');
    if (el) el.innerHTML = `<b>${esc(e.name)}</b><p class="sm">${esc(e.purpose)}</p><p class="sm"><b>Targets:</b> ${e.groups.map((g) => esc(C.GROUPS[g])).join(', ')}</p><p class="muted xs">Device: ${esc(e.device)} · Prescription (demo): ${esc(e.rx)} · ≈ ${e.min} min</p>`;
    root.querySelectorAll('.exrow').forEach((r) => r.classList.toggle('on', r.dataset.id === id));
  }

  /* ----- actions ----- */
  AS.act['hz-sec'] = (t) => { section = t.dataset.s; history.replaceState(null, '', '#/hazards?s=' + section); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  AS.act['hz-sys'] = (t) => { AS._pendingSel = t.dataset.id; location.hash = '#/overview'; };
  AS.act['rad-shield'] = () => rad && rad._ctl.shield();
  AS.act['rad-spe'] = () => rad && rad._ctl.spe();
  AS.act['rad-org'] = (t) => rad && rad._ctl.org(t.dataset.id);
  AS.act['ex-sel'] = (t, e) => { if (e.target.closest('[data-act="ex-log"],[data-act="ex-demo"]')) return; pickEx(t.dataset.id); };
  AS.act['ex-log'] = (t) => { const ex = C.EXERCISES.find((x) => x.id === t.dataset.id); AS.Engine.logExercise(ex.id); AS.UI.toast({ sev: 'info', title: 'Session logged', body: `${ex.name} (+${ex.min} min) added to today’s exercise record.` }); };
  AS.act['mood-set'] = (t) => { AS.Engine.addMeasurement('mood', +t.dataset.v); AS.UI.toast({ sev: 'info', title: 'Mood recorded', body: 'Saved to Health History.' }); };
  AS.act.breath = (t) => {
    if (breathT) { clearInterval(breathT); breathT = null; t.textContent = 'START'; const c = root.querySelector('#bcircle'); c.style.transform = 'scale(1)'; root.querySelector('#btxt').textContent = 'Ready'; return; }
    t.textContent = 'STOP'; const phases = [['Breathe in', 4, 1.35], ['Hold', 4, 1.35], ['Breathe out', 6, 1]]; let i = 0, left = 0; const c = root.querySelector('#bcircle'), tx = root.querySelector('#btxt');
    const step = () => { if (left <= 0) { const p = phases[i % 3]; i++; left = p[1]; c.style.transition = `transform ${p[1]}s ease-in-out`; c.style.transform = `scale(${p[2]})`; tx.textContent = p[0]; } else left--; if (left === 0) { /* next tick picks the next phase */ } };
    step(); breathT = setInterval(() => { if (!c.isConnected) { clearInterval(breathT); return; } left--; if (left <= 0) { const p = phases[i % 3]; i++; left = p[1]; c.style.transition = `transform ${p[1]}s ease-in-out`; c.style.transform = `scale(${p[2]})`; tx.textContent = p[0]; } }, 1000);
  };
  AS.act['stress-q'] = () => {
    const md = AS.UI.modal({ title: 'Brief stress check (BeaconCare – not a validated clinical instrument)' }); const lv = ['Not at all', 'A little', 'Somewhat', 'Quite a bit', 'Very much'];
    md.set(`${C.STRESSQ.map((q, i) => `<label class="fld"><span>${esc(q[0])}</span><select id="sq${i}">${lv.map((l, v) => `<option value="${v}">${v} – ${l}</option>`).join('')}</select></label>`).join('')}<div class="m-foot"><button class="btn primary" data-w="ok">Save</button></div>`);
    md.body.addEventListener('click', (e) => { if (!e.target.closest('[data-w]')) return; const sum = [0, 1, 2, 3].reduce((s, i) => s + (C.STRESSQ[i][1] ? 4 - +md.body.querySelector('#sq' + i).value : +md.body.querySelector('#sq' + i).value), 0); AS.Engine.addMeasurement('stress', +((sum / 16) * 10).toFixed(1)); md.close(); AS.UI.toast({ sev: 'info', title: 'Stress recorded', body: `Score ${((sum / 16) * 10).toFixed(1)}/10 saved to Health History.` }); });
  };
  AS.act['screen-q'] = () => {
    const md = AS.UI.modal({ title: 'PHQ-2 / GAD-2 screening (not a diagnosis)' });
    md.set(`<div class="note-box">${icon('info', 15)} <span>Over the last 2 weeks, how often have you been bothered by the following? A score of 3+ on either scale is a positive <b>screen</b> that suggests follow-up – it does not diagnose depression or anxiety.</span></div>${[...C.PHQ2.map((q, i) => ['p', i, q]), ...C.GAD2.map((q, i) => ['g', i, q])].map((x) => `<label class="fld"><span>${esc(x[2])}</span><select id="${x[0]}${x[1]}">${C.FREQ.map((l, v) => `<option value="${v}">${v} – ${l}</option>`).join('')}</select></label>`).join('')}<div class="m-foot"><button class="btn primary" data-w="ok">Save</button></div>`);
    md.body.addEventListener('click', (e) => { if (!e.target.closest('[data-w]')) return; const g = (id) => +md.body.querySelector('#' + id).value, p = g('p0') + g('p1'), a = g('g0') + g('g1'); AS.Engine.addMeasurement('phq', p); AS.Engine.addMeasurement('anx', a); md.close(); AS.UI.toast({ sev: p >= 3 || a >= 3 ? 'warn' : 'info', title: 'Screening saved', body: `PHQ-2 ${p}/6 · GAD-2 ${a}/6. ${p >= 3 || a >= 3 ? 'Positive screen – consider speaking with the psychological-support team.' : 'Below the follow-up threshold.'}` }); });
  };

  AS.Views.hazards = {
    mount(el, params) { root = el; section = (params && params.s && BUILD[params.s]) ? params.s : section; render(); },
    update() { if (root) render(); },
    destroy() { cleanup(); root = null; },
  };
})();
