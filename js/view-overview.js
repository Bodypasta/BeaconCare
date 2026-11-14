/* BeaconCare – OVERVIEW: interactive 3D anatomy + smart-band panel */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc, STATUS, worst, fmt, clamp } = AS.U;
  const { icon, pill, sim } = AS.UI;
  const { SYSTEMS, evalMetric, M } = AS.D;
  AS.Views = AS.Views || {};

  let anat = null, sel = null, selPart = null, root = null, ecg = null, colorMode = 'status', painOn = false, bandBuilt = '';
  const sysDef = (id) => SYSTEMS.find((s) => s.id === id);
  const statuses = () => { const o = {}; SYSTEMS.forEach((s) => { o[s.id] = AS.Model.systems[s.id].status; }); return o; };
  const fv = (m) => (m.value == null ? '—' : Number(m.value).toFixed(m.dec));

  function render() {
    return `
<div class="ov">
  <div id="emerg"></div>
  <div id="lh-host"></div>
  <div class="ov-grid">
    <aside class="ov-left">
      <div class="card glass"><h4>${icon('overview', 15)} Body systems</h4><ul class="syslist" id="syslist"></ul></div>
      <div class="card glass" id="chkcard"></div>
    </aside>
    <div class="ov-stage glass" id="stage">
      <div class="stage-top">
        <div class="seg" role="group" aria-label="Colour mode"><button data-act="colormode" data-m="status" class="on">Health status</button><button data-act="colormode" data-m="system">System colours</button></div>
        <span class="simtag lg" title="All anatomy colours are driven by simulated demonstration data">SIMULATED DEMO DATA</span>
      </div>
      <canvas id="anat" tabindex="0" aria-label="Interactive 3D human anatomy. Drag to rotate, click a body system to inspect it."></canvas>
      <div id="paintip" class="painhint" hidden>${icon('info', 15)} Tap a highlighted ring where you feel pain – BeaconCare will guide an investigation.</div>
      <div class="tip3d" id="tip3d" hidden></div>
      <div class="stage-ctrl">
        <button class="icon-btn" data-act="rot" data-d="-0.4" aria-label="Rotate left" title="Rotate left">${icon('rotate', 16)}</button>
        <button class="icon-btn" data-act="rot" data-d="0.4" aria-label="Rotate right" title="Rotate right"><span style="display:inline-block;transform:scaleX(-1)">${icon('rotate', 16)}</span></button>
        <button class="icon-btn" data-act="zoom" data-d="-0.15" aria-label="Zoom out">${icon('zoomout', 16)}</button>
        <button class="icon-btn" data-act="zoom" data-d="0.15" aria-label="Zoom in">${icon('zoomin', 16)}</button>
        <button class="icon-btn" id="autobtn" data-act="autorot" aria-label="Toggle auto-rotate" title="Auto-rotate">${icon('refresh', 16)}</button>
        <button class="icon-btn" data-act="resetview" aria-label="Reset view" title="Reset view">${icon('scan', 16)}</button>
        <button class="btn sm warn-btn" id="painbtn" data-act="painmode">${icon('hazards', 14)} Report pain on body</button>
      </div>
      <div class="legend-row"><span><i class="s-ok"></i>Healthy / normal</span><span><i class="s-warn"></i>Abnormal – needs attention</span><span><i class="s-crit"></i>Critical – immediate assessment</span></div>
      <div class="selcard glass" id="selcard" hidden></div>
    </div>
    <aside class="ov-right"><div class="card glass band" id="band"></div></aside>
  </div>
  <div class="ov-bottom">
    <div class="card glass" id="assess"></div>
    <div class="card glass" id="alerts"></div>
    <div class="card glass" id="painbox"></div>
  </div>
</div>`;
  }

  function mount(el) {
    root = el; el.innerHTML = render();
    const cv = el.querySelector('#anat'); const m = AS.Model;
    anat = AS.Anatomy.create(cv, {
      onSelect: (sysId, prim) => { if (!sysId) return; selectSys(sysId, prim && prim.part); },
      onRegion: (r) => { AS.act.openInvestigationWizard({ topic: r.topic, region: r.label }); },
      onHover: (prim, x, y, region) => {
        const tip = el.querySelector('#tip3d'); if (!tip) return;
        if (!prim && !region) { tip.hidden = true; return; }
        const r = el.querySelector('#stage').getBoundingClientRect(); tip.hidden = false; tip.style.left = Math.min(x - r.left + 14, r.width - 210) + 'px'; tip.style.top = y - r.top + 14 + 'px';
        if (region) tip.innerHTML = `<b>${esc(region.label)}</b><span>Click to report pain here</span>`;
        else { const s = m.systems[prim.sys]; tip.innerHTML = `<b>${esc(prim.part)}</b><span>${esc(sysDef(prim.sys).name)} system · ${STATUS[s.status].label}</span>`; }
      },
    });
    sel = null; selPart = null; painOn = false; colorMode = 'status'; bandBuilt = '';
    AS.Lighthouse.mount(el.querySelector('#lh-host'));
    anat.setStatuses(statuses()); anat.scan(); updateAll();
    startEcg();
  }

  /* ---------- selection ---------- */
  function selectSys(id, part) { sel = id; selPart = part || null; anat.setSelected(id); anat.setHighlight(null); renderSelCard(); renderSysList(); AS.Lighthouse.focus(id); }
  function clearSel() { sel = null; selPart = null; anat.setSelected(null); renderSelCard(); renderSysList(); AS.Lighthouse.focus(null); }

  function renderSelCard() {
    const el = root.querySelector('#selcard'); if (!el) return;
    if (!sel) { el.hidden = true; return; }
    const m = AS.Model, s = m.systems[sel], d = s.def; el.hidden = false;
    const meas = s.measures.map((x) => `<li class="mr s-${x.status}"><span>${esc(x.label)}</span><b>${fv(x)} <small>${esc(x.unit)}</small></b>${AS.UI.dot(x.status)}</li>`).join('');
    const unusual = [];
    s.measures.filter((x) => x.status !== 'ok').forEach((x) => unusual.push(`<li><i class="s-${x.status}"></i>${esc(x.label)} ${fv(x)} ${esc(x.unit)} – ${x.dir === 'high' ? 'above' : 'below'} the reference range</li>`));
    s.findings.forEach((f) => unusual.push(`<li><i class="s-${f.sev}"></i>${esc(f.title)}</li>`));
    s.pain.forEach((p) => unusual.push(`<li><i class="s-${p.level === 'emergency' ? 'crit' : 'warn'}"></i>Reported ${esc(AS.C.INV[p.topic].title.toLowerCase())} ${p.severity}/10</li>`));
    el.innerHTML = `
      <div class="sc-head"><span class="sic" style="color:${STATUS[s.status].color}">${icon(sel, 22)}</span><div><h3>${esc(d.name)} system</h3>${selPart ? `<small class="muted">Selected part: ${esc(selPart)}</small>` : ''}</div>${pill(s.status)}<button class="icon-btn" data-act="clearsel" aria-label="Close">${icon('x', 16)}</button></div>
      <p class="muted sm">${esc(d.blurb)}</p>
      <div class="sc-sub">MEASUREMENTS ${sim()}</div><ul class="meas">${meas}</ul>
      <div class="sc-sub">Unusual indicators</div>
      ${unusual.length ? `<ul class="unusual">${unusual.join('')}</ul>` : '<p class="ok-note">No unusual indicators – all measurements are within their current assessment ranges.</p>'}
      <div class="sc-actions"><button class="btn primary" data-act="inv-sys">${icon('investigation', 16)} Investigate system</button>${s.status !== 'ok' ? `<button class="btn" data-act="more-info">More information</button>` : ''}</div>`;
  }

  function renderSysList() {
    const el = root.querySelector('#syslist'); if (!el) return; const m = AS.Model;
    el.innerHTML = SYSTEMS.map((d) => { const s = m.systems[d.id], k = d.metrics[0], x = s.measures[0]; return `<li><button class="sysrow s-${s.status} ${sel === d.id ? 'on' : ''}" data-act="selsys" data-id="${d.id}" aria-pressed="${sel === d.id}"><span class="sic">${icon(d.id, 18)}</span><span class="sn">${esc(d.name)}</span><span class="sv">${fv(x)}<small>${esc(x.unit)}</small></span><i class="sdot s-${s.status}"></i></button></li>`; }).join('');
  }

  function renderEmerg() {
    const el = root.querySelector('#emerg'), m = AS.Model; if (!el) return;
    if (!m.emergency) { el.innerHTML = ''; return; }
    const hr = m.measures.hr, sp = m.measures.spo2, bp = `${fmt(m.measures.sbp.value)}/${fmt(m.measures.dbp.value)}`;
    el.innerHTML = `<div class="emerg" role="alert"><div class="emerg-ico">!</div><div class="emerg-tx"><h2>Emergency alert – potentially serious medical situation</h2><p>Heart rate ${fmt(hr.value)} bpm · BP ${bp} mmHg · SpO₂ ${fmt(sp.value, 1)} % with reported chest pressure, shortness of breath and sweating. <b>BeaconCare cannot diagnose or treat this.</b> Follow the mission emergency medical protocol and contact the onboard Crew Medical Officer and the flight surgeon <b>now</b>.</p></div><div class="emerg-btns"><button class="btn danger" data-act="open-emergency">Open emergency protocol</button><button class="btn" data-act="goto" data-to="#/investigation">View investigation</button></div></div>`;
  }

  function renderCheck() {
    const el = root.querySelector('#chkcard'), ck = AS.Engine.checkups(), lab = { done: 'COMPLETED', open: 'Due now', upcoming: 'UPCOMING', missed: 'MISSED' };
    const row = (n, c) => `<div class="ckrow s-${c.status === 'done' ? 'ok' : c.status === 'missed' ? 'crit' : c.status === 'open' ? 'warn' : 'idle'}"><span class="ckd">${c.status === 'done' ? icon('check', 14) : ''}</span><div><b>${n} CHECKUP</b><small>${c.start}–${c.end} GMT</small></div><em>${lab[c.status]}</em></div>`;
    el.innerHTML = `<h4>${icon('history', 15)} Daily checkups <small class="muted">MISSION DAY ${String(AS.Model.N).padStart(2, '0')}</small></h4>${row('MORNING', ck.morning)}${row('EVENING', ck.evening)}<div class="ckbar"><i style="width:${ck.done * 50}%"></i></div><button class="btn primary block" data-act="start-checkup">${icon('scan', 16)} Start full body checkup</button><button class="btn ghost block sm" data-act="open-sched">Configure schedule (mission time, GMT)</button>`;
  }

  function renderBottom() {
    const m = AS.Model, o = m.overall, risk = m.risk;
    const names = { ok: 'Overall: within current assessment ranges', warn: 'Overall: some indicators need attention', crit: 'Overall: critical indicators present' };
    const counts = { ok: 0, warn: 0, crit: 0 }; SYSTEMS.forEach((d) => counts[m.systems[d.id].status]++);
    root.querySelector('#assess').innerHTML = `<h4>${icon('activity', 15)} Mission health assessment</h4><div class="assess"><div class="gwrap">${AS.Charts.gauge(risk.score, risk.cat === 'LOW' ? '#4fbf8e' : risk.cat === 'MODERATE' ? '#b9c95e' : risk.cat === 'ELEVATED' ? '#e3b34f' : '#e0646f', risk.cat + ' RISK')}</div><div><div class="ov-state s-${o}">${pill(o)} <b>${names[o]}</b></div><div class="counts"><span class="s-ok"><b>${counts.ok}</b> healthy</span><span class="s-warn"><b>${counts.warn}</b> attention</span><span class="s-crit"><b>${counts.crit}</b> critical</span></div><p class="muted sm">${m.trend === 'acute' ? 'Acute event in progress – trend analysis suspended.' : `Trend vs 7 days ago: <b class="tr-${m.trend}">${m.trend.toUpperCase()}</b>.`} Potential risks only – not a diagnosis. <a href="#/history" class="lnk">How is this calculated?</a></p></div></div>`;
    const al = m.findings.slice(0, 3);
    root.querySelector('#alerts').innerHTML = `<h4>${icon('bell', 15)} Active alerts</h4>${al.length ? al.map((f) => `<a class="alrt s-${f.sev}" href="#/${f.kind === 'acute' ? 'investigation' : 'history'}"><i></i><div><b>${esc(f.title)}</b><small>${esc((f.evidence[0] || '').slice(0, 110))}</small></div></a>`).join('') : '<p class="ok-note">No alerts. BeaconCare found no concerning patterns in the mission history.</p>'}`;
    root.querySelector('#painbox').innerHTML = `<h4>${icon('hazards', 15)} Feeling pain or unwell?</h4><p class="muted sm">Pick the type of pain, or choose the region directly on the 3D body. BeaconCare never assumes the cause – it asks for measurements and symptoms first.</p><div class="chips">${AS.C.PAIN_CHIPS.map((c) => `<button class="chip" data-act="pain-topic" data-t="${c[0]}">${esc(c[1])}</button>`).join('')}</div><button class="btn sm block" data-act="painmode">Select region on 3D body</button>`;
  }

  /* ---------- smart band ---------- */
  const TILES = ['hr', 'bp', 'spo2', 'temp', 'rr', 'act', 'sleep', 'hrv'];
  function buildBand() {
    const el = root.querySelector('#band'), B = AS.Band;
    const ble = B.device ? `<span class="simtag live">HR: LIVE · ${esc(B.device.name || 'BLE device')}</span>` : sim('SIMULATED STREAM');
    el.innerHTML = `<div class="band-h"><h4>${icon('activity', 15)} Smart band</h4>${ble}</div>
    <p class="muted xs band-note">${B.device ? 'Heart rate comes from your connected device; every other channel is simulated.' : 'No wearable connected – values are a realistic simulation of the selected scenario, updating every 2 s.'}</p>
    <div class="tiles">
      <div class="tile wide" data-k="hr"><div class="t-head"><span class="ico beat" id="ic-hr">${icon('cardiovascular', 20)}</span><span class="t-name">Heart rate</span><span class="src" data-src></span></div><div class="t-val"><b data-v>--</b><small>bpm</small><span class="pill" data-p></span></div><canvas id="ecg" class="ecg" width="300" height="44"></canvas><div class="t-foot"><span class="trend" data-tr></span><span class="sparkw" data-sp></span><span class="ts" data-ts></span></div></div>
      <div class="tile" data-k="bp"><div class="t-head"><span class="ico">${icon('activity', 18)}</span><span class="t-name">Blood pressure</span><span class="src" data-src></span></div><div class="t-val"><b data-v>--</b><small>mmHg</small></div><span class="pill" data-p></span><div class="t-foot"><span class="trend" data-tr></span><span class="ts" data-ts></span></div></div>
      <div class="tile" data-k="spo2"><div class="t-head"><span class="ico" id="o2ring"></span><span class="t-name">SpO₂</span><span class="src" data-src></span></div><div class="t-val"><b data-v>--</b><small>%</small></div><span class="pill" data-p></span><div class="t-foot"><span class="trend" data-tr></span><span class="ts" data-ts></span></div></div>
      <div class="tile" data-k="temp"><div class="t-head"><span class="ico" id="thermo"></span><span class="t-name">Temperature</span><span class="src" data-src></span></div><div class="t-val"><b data-v>--</b><small>°C</small></div><span class="pill" data-p></span><div class="t-foot"><span class="trend" data-tr></span><span class="ts" data-ts></span></div></div>
      <div class="tile" data-k="rr"><div class="t-head"><span class="ico breathe" id="ic-rr">${icon('respiratory', 18)}</span><span class="t-name">Resp. rate</span><span class="src" data-src></span></div><div class="t-val"><b data-v>--</b><small>/min</small></div><span class="pill" data-p></span><div class="t-foot"><span class="trend" data-tr></span><span class="ts" data-ts></span></div></div>
      <div class="tile" data-k="hrv"><div class="t-head"><span class="ico">${icon('activity', 18)}</span><span class="t-name">HRV</span><span class="src" data-src></span></div><div class="t-val"><b data-v>--</b><small>ms</small></div><span class="trend" data-tr></span><div class="t-foot"><span class="sparkw" data-sp></span><span class="ts" data-ts></span></div></div>
      <div class="tile wide act" data-k="act"><div class="t-head"><span class="ico">${icon('activity', 18)}</span><span class="t-name">Activity · steps today</span><span class="src" data-src></span></div><div class="actrow"><div class="rings" data-rings></div><div class="actv"><b data-v>--</b><small>steps</small><div class="legend-mini"><span style="--c:#e0646f">Move</span><span style="--c:#4fbf8e">Exercise</span><span style="--c:#7fb6d4">Resist.</span></div><span class="pill" data-p></span></div></div><div class="t-foot"><span class="trend" data-tr></span><span class="ts" data-ts></span></div></div>
      <div class="tile wide" data-k="sleep"><div class="t-head"><span class="ico moon">${icon('moon', 18)}</span><span class="t-name">Sleep · last night</span><span class="src" data-src></span></div><div class="t-val"><b data-v>--</b><small>h</small><span class="pill" data-p></span></div><div class="sleepbars" data-sl></div><div class="t-foot"><span class="trend" data-tr></span><span class="ts" data-ts></span></div></div>
    </div>
    <div class="band-foot"><button class="btn sm block" data-act="connect-ble">${icon('bt', 15)} ${B.device ? 'Disconnect wearable' : 'CONNECT WEARABLE (Web Bluetooth)'}</button><p class="muted xs">${B.supported() ? 'Works with any BLE band exposing the standard Heart Rate service.' : 'Web Bluetooth is not supported in this browser – use Chrome/Edge (desktop or Android) over HTTPS.'}</p></div>`;
    bandBuilt = AS.Model.id + (B.device ? 'd' : 'n');
  }

  function tickBand() {
    if (!root || !root.querySelector('#band')) return; const B = AS.Band, m = AS.Model, key = m.id + (B.device ? 'd' : 'n');
    if (bandBuilt !== key) { buildBand(); startEcg(); }
    const R = B.readings; if (!R.hr) return;
    const tile = (k) => root.querySelector(`.tile[data-k="${k}"]`);
    const stamp = (k) => AS.Clock.hhmmss(new Date(R.hr.ts + (AS.Store.get().clockOffset || 0))) + ' GMT';
    const trend = (cur, base, unit, dec, goodDir) => { const d = cur - base; const a = Math.abs(d) < (dec ? 0.05 : 0.5) ? '●' : d > 0 ? '▲' : '▼'; return `${a} ${d >= 0 ? '+' : ''}${d.toFixed(dec)}${unit} vs baseline`; };
    const set = (k, o) => { const t = tile(k); if (!t) return; t.className = `tile ${t.classList.contains('wide') ? 'wide' : ''} ${k === 'act' ? 'act' : ''} s-${o.status}`; const q = (s) => t.querySelector(s);
      if (q('[data-v]')) q('[data-v]').textContent = o.v; if (q('[data-p]')) q('[data-p]').innerHTML = pillTxt(o.status); if (q('[data-tr]')) q('[data-tr]').textContent = o.tr || ''; if (q('[data-ts]')) q('[data-ts]').textContent = 'Updated ' + stamp(k);
      if (q('[data-src]')) { q('[data-src]').textContent = o.src === 'live' ? 'LIVE' : 'SIM'; q('[data-src]').className = 'src ' + (o.src === 'live' ? 'live' : 'sim'); } if (q('[data-sp]') && o.spark) q('[data-sp]').innerHTML = AS.Charts.spark(o.spark, STATUS[o.status].color, 84, 22); };
    const pillTxt = (s) => `<i></i>${STATUS[s].label}`;
    const me = m.measures, b = m.base, hr = R.hr.v, sbp = R.sbp.v, dbp = R.dbp.v;
    set('hr', { v: fmt(hr), status: me.hr.status, tr: trend(hr, b.hr, ' bpm', 0), src: B.src.hr, spark: B.hist.hr });
    set('bp', { v: `${fmt(sbp)}/${fmt(dbp)}`, status: worst(me.sbp.status, me.dbp.status), tr: trend(sbp, b.sbp, ' mmHg', 0), src: 'sim' });
    set('spo2', { v: fmt(R.spo2.v, 1), status: me.spo2.status, tr: trend(R.spo2.v, b.spo2, '%', 1), src: 'sim' });
    set('temp', { v: fmt(R.temp.v, 1), status: me.temp.status, tr: trend(R.temp.v, b.temp, '°', 1), src: 'sim' });
    set('rr', { v: fmt(R.rr.v), status: me.rr.status, tr: trend(R.rr.v, b.rr, '', 0), src: 'sim' });
    set('hrv', { v: fmt(R.hrv.v), status: 'ok', tr: trend(R.hrv.v, b.hrv, ' ms', 0), src: 'sim', spark: B.hist.hrv });
    const a = B.activity(); const aS = worst(me.exMin.status, me.resMin.status);
    set('act', { v: a.steps.toLocaleString(), status: aS, tr: `Exercise ${a.exMin} min · resistance ${a.resMin} min today (7-day mean ${fmt(me.exMin.value)} / ${fmt(me.resMin.value)})`, src: 'sim' });
    const rg = root.querySelector('[data-rings]'); if (rg) rg.innerHTML = ringsSvg(a.steps / 10000, a.exMin / 120, a.resMin / 45);
    const sl = evalMetric('sleepH', a.sleepH).status; set('sleep', { v: a.sleepH.toFixed(1), status: sl, tr: `Quality ${Math.round(a.sleepQ)}/100 · ${Math.round(a.wake)} awakenings · baseline ${b.sleepH.toFixed(1)} h`, src: 'sim' });
    const sb = root.querySelector('[data-sl]'); if (sb && !sb.dataset.d) { sb.dataset.d = 1; const r = AS.U.mulberry32(m.N * 7); let h = ''; for (let i = 0; i < 28; i++) { const ph = r(); const c = ph < 0.2 ? '#7f98d6' : ph < 0.55 ? '#7fb6d4' : ph < 0.85 ? '#78c4b0' : '#e3b34f'; h += `<i style="height:${20 + ph * 70}%;background:${c}"></i>`; } sb.innerHTML = h; }
    const o2 = root.querySelector('#o2ring'); if (o2) o2.innerHTML = AS.Charts.ring((R.spo2.v - 80) / 20, STATUS[me.spo2.status].color, 26, 4);
    const th = root.querySelector('#thermo'); if (th) th.innerHTML = `<svg width="18" height="26" viewBox="0 0 18 26"><rect x="6" y="2" width="6" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="20" r="4.5" fill="${STATUS[me.temp.status].color}"/><rect x="7.7" y="${18 - clamp((R.temp.v - 35) / 4, 0, 1) * 14}" width="2.6" height="${clamp((R.temp.v - 35) / 4, 0, 1) * 14 + 2}" fill="${STATUS[me.temp.status].color}"/></svg>`;
    const ih = root.querySelector('#ic-hr'); if (ih) { ih.style.setProperty('--dur', (60 / clamp(hr, 30, 200)).toFixed(2) + 's'); }
    const ir = root.querySelector('#ic-rr'); if (ir) ir.style.setProperty('--dur', (60 / clamp(R.rr.v, 6, 40)).toFixed(2) + 's');
    if (anat) anat.setHeart(hr, m.sc.live.irregular);
  }
  function ringsSvg(a, b, c) { const r = (rad, p, col) => { const C = 2 * Math.PI * rad; return `<circle cx="34" cy="34" r="${rad}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/><circle cx="34" cy="34" r="${rad}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * clamp(p, 0, 1)} ${C}" transform="rotate(-90 34 34)"/>`; }; return `<svg width="68" height="68" viewBox="0 0 68 68">${r(30, a, '#e0646f')}${r(21, b, '#4fbf8e')}${r(12, c, '#7fb6d4')}</svg>`; }

  /* ECG-style animated trace (simulated) */
  function startEcg() {
    const cv = root && root.querySelector('#ecg'); if (!cv) return; const ctx = cv.getContext('2d'); const beats = []; let alive = true; ecg = () => { alive = false; };
    const wave = (p) => { const g = (c, w, a) => a * Math.exp(-Math.pow((p - c) / w, 2)); return g(0.16, 0.025, 0.12) + g(0.285, 0.012, -0.15) + g(0.3, 0.012, 1) + g(0.315, 0.014, -0.25) + g(0.52, 0.05, 0.25); };
    function frame(now) {
      if (!alive || !cv.isConnected) return; const t = now / 1000, hr = AS.Band.readings.hr ? AS.Band.readings.hr.v : 70, irr = AS.Model.sc.live.irregular;
      let last = beats[beats.length - 1]; if (!last || t >= last.s + last.p) { const base = 60 / clamp(hr, 30, 200); beats.push({ s: last ? last.s + last.p : t, p: base * (irr ? 0.6 + Math.random() * 0.8 : 1) }); if (beats.length > 12) beats.shift(); }
      const W = cv.width, H = cv.height, pps = 70; ctx.clearRect(0, 0, W, H); const st = STATUS[AS.Model.measures.hr.status].color;
      ctx.strokeStyle = 'rgba(127,182,212,.08)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x < W; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = st; ctx.lineWidth = 1.7; ctx.shadowColor = st; ctx.shadowBlur = 5;
      for (let x = 0; x < W; x++) { const tt = t - (W - x) / pps; let y = 0; for (let i = beats.length - 1; i >= 0; i--) { const b = beats[i]; if (tt >= b.s) { const ph = (tt - b.s) / b.p; y = ph < 1 ? wave(ph) : 0; break; } } const py = H * 0.72 - y * H * 0.62; if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py); }
      ctx.stroke(); ctx.shadowBlur = 0; requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function updateAll() {
    if (!root) return; const m = AS.Model;
    anat.setStatuses(statuses()); anat.setMode(colorMode); anat.setHeart(m.measures.hr.value, m.sc.live.irregular);
    renderEmerg(); renderSysList(); renderSelCard(); renderCheck(); renderBottom(); tickBand(); AS.Lighthouse.refresh();
  }
  function destroy() { if (anat) anat.destroy(); anat = null; if (ecg) ecg(); AS.Lighthouse.destroy(); root = null; }

  AS.Views.overview = { mount, update: updateAll, tick: tickBand, destroy, scan() { if (anat) anat.scan(); }, select: (id) => { if (anat) selectSys(id); }, resetSel() { sel = null; } };

  AS.act.selsys = (t) => { const id = t.dataset.id; if (sel === id) clearSel(); else selectSys(id); };
  AS.act.clearsel = clearSel;
  AS.act.colormode = (t) => { colorMode = t.dataset.m; anat.setMode(colorMode); root.querySelectorAll('[data-act="colormode"]').forEach((b) => b.classList.toggle('on', b === t)); };
  AS.act.rot = (t) => { anat.setAuto(false); anat.rotateBy(+t.dataset.d); };
  AS.act.zoom = (t) => anat.zoomBy(+t.dataset.d);
  AS.act.autorot = (t) => { const on = !anat.state.auto; anat.setAuto(on); t.classList.toggle('on', on); };
  AS.act.resetview = () => { anat.reset(); anat.setAuto(true); };
  AS.act.painmode = () => { painOn = !painOn; anat.setPainMode(painOn); if (painOn) { clearSel(); anat.setAuto(false); } const b = root.querySelector('#painbtn'); if (b) { b.classList.toggle('on', painOn); b.innerHTML = painOn ? `${icon('x', 14)} CANCEL PAIN SELECTION` : `${icon('hazards', 14)} REPORT PAIN ON BODY`; } root.querySelector('#paintip').hidden = !painOn; root.querySelector('#stage').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  AS.act['inv-sys'] = () => AS.act.openInvestigationWizard({ topic: sel });
  AS.act['more-info'] = () => { location.hash = `#/investigation?sys=${sel}`; };
  AS.act['pain-topic'] = (t) => AS.act.openInvestigationWizard({ topic: t.dataset.t });
  AS.act['connect-ble'] = async () => { try { if (AS.Band.device) AS.Band.disconnect(); else { await AS.Band.connect(); AS.UI.toast({ sev: 'info', title: 'Wearable connected', body: 'Heart rate is now read from your device. Other channels remain simulated.' }); } } catch (e) { AS.UI.toast({ sev: 'warn', title: 'Wearable not connected', body: e.message || String(e) }); } };
  AS.on('device', () => { if (root) { buildBand(); startEcg(); tickBand(); } });
  AS.act.goto = (t) => { location.hash = t.dataset.to; };
})();
