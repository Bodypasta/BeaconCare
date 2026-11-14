/* BeaconCare – LIGHTHOUSE: an animated coastal scene that mirrors the astronaut's overall health.
   It reads the SAME assessment as the anatomy view (AS.Model.overall / AS.Model.systems and AS.U.STATUS),
   so the lamp colour, sky, sea and weather can never disagree with the body-system colours.
   One continuous severity value (0 = stable, 1 = needs attention, 2 = critical) eases toward the target,
   so changes between scenarios are gradual. Pure SVG + one small canvas; paused when off-screen. */
(function () {
  const AS = (window.AS = window.AS || {});
  const { STATUS, clamp, mix, mulberry32 } = AS.U;
  const SEV = { ok: 0, warn: 1, crit: 2 };
  const W = 1200, H = 420, HORIZON = 232, LAMP = { x: 452, y: 112 };
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgb = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  const mixc = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  /* three-stop palette helper: lv 0..2 -> colour */
  const pal = (c0, c1, c2, lv) => (lv <= 1 ? mixc(hex(c0), hex(c1), lv) : mixc(hex(c1), hex(c2), lv - 1));
  const P = {
    skyTop: ['#5b9bd5', '#76899e', '#1d2430'], skyBot: ['#d6e8f4', '#bcc6cc', '#47505e'],
    seaFar: ['#4d8fb0', '#4a7089', '#27404f'], seaNear: ['#1f6389', '#2a4d66', '#101f2a'],
    cloud: ['#ffffff', '#cfd5da', '#4b5360'], land: ['#6f8a5f', '#657a58', '#46523f'], rock: ['#7b7468', '#6c675e', '#4a4741'],
    tower: ['#f1ede4', '#dedad1', '#b5b2ab'],
  };
  const col = (k, lv) => pal(P[k][0], P[k][1], P[k][2], lv);

  let host = null, svg = null, cv = null, ctx = null, raf = 0, lvNow = null, lvTarget = 0, tPrev = 0, focusSys = null, io = null, visible = true, last = null;
  let refs = {}, clouds = [], rain = [], streaks = [], flash = 0, nextBolt = 0, bolt = null, ro = null, cw = 0, ch = 0, reduced = false;

  const lampColor = (lv) => (lv <= 1 ? mixc(hex(STATUS.ok.color), hex(STATUS.warn.color), lv) : mixc(hex(STATUS.warn.color), hex(STATUS.crit.color), lv - 1));
  const sevOf = () => SEV[AS.Model.overall] || 0;
  const affected = () => Object.values(AS.Model.systems).filter((s) => s.status !== 'ok').sort((a, b) => SEV[b.status] - SEV[a.status]);

  function scene() {
    const r = mulberry32(7);
    clouds = Array.from({ length: 9 }, (_, i) => ({ x: r() * W, y: 24 + r() * 120, s: 0.7 + r() * 0.9, sp: 0.6 + r() * 0.8, need: i < 2 ? 0 : i < 6 ? 0.55 : 1.15, base: i < 2 ? 0.55 : 0.8 }));
    const cloudSvg = clouds.map((c, i) => `<g class="lh-cloud" data-i="${i}"><ellipse cx="0" cy="0" rx="86" ry="22"/><ellipse cx="-44" cy="8" rx="56" ry="17"/><ellipse cx="48" cy="9" rx="62" ry="18"/><ellipse cx="6" cy="-14" rx="46" ry="19"/></g>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Lighthouse scene" id="lh-svg">
      <defs>
        <linearGradient id="lh-sky" x1="0" y1="0" x2="0" y2="1"><stop id="lh-s0" offset="0"/><stop id="lh-s1" offset="1"/></linearGradient>
        <linearGradient id="lh-sea" x1="0" y1="0" x2="0" y2="1"><stop id="lh-w0" offset="0"/><stop id="lh-w1" offset="1"/></linearGradient>
        <radialGradient id="lh-sun"><stop offset="0" stop-color="#fff6d8" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe9a8" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
        <radialGradient id="lh-lamp"><stop offset="0" id="lh-l0" stop-opacity=".95"/><stop offset="1" id="lh-l1" stop-opacity="0"/></radialGradient>
        <linearGradient id="lh-bmR" gradientUnits="userSpaceOnUse" x1="${LAMP.x}" y1="0" x2="${LAMP.x + 560}" y2="0"><stop class="lh-b0" offset="0" stop-opacity=".9"/><stop class="lh-b1" offset="1" stop-opacity="0"/></linearGradient>
        <linearGradient id="lh-bmL" gradientUnits="userSpaceOnUse" x1="${LAMP.x}" y1="0" x2="${LAMP.x - 560}" y2="0"><stop class="lh-b0" offset="0" stop-opacity=".9"/><stop class="lh-b1" offset="1" stop-opacity="0"/></linearGradient>
        <filter id="lh-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur id="lh-bl" stdDeviation="2"/></filter>
        <filter id="lh-cblur"><feGaussianBlur stdDeviation="5"/></filter>
        <clipPath id="lh-seaclip"><rect x="0" y="${HORIZON}" width="${W}" height="${H - HORIZON}"/></clipPath>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#lh-sky)"/>
      <circle id="lh-sunc" cx="930" cy="92" r="150" fill="url(#lh-sun)"/>
      <g id="lh-clouds" filter="url(#lh-cblur)">${cloudSvg}</g>
      <rect id="lh-hz" x="0" y="${HORIZON - 1}" width="${W}" height="3" fill="#ffffff" opacity=".18"/>
      <rect x="0" y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#lh-sea)"/>
      <g clip-path="url(#lh-seaclip)"><path id="lh-wv0"/><path id="lh-wv1"/></g>
      <path id="lh-bolt" d="" fill="none" stroke="#f4f7ff" stroke-width="3" stroke-linejoin="round" opacity="0"/>
      <g id="lh-beams" filter="url(#lh-blur)"><polygon id="lh-bmA"/><polygon id="lh-bmB"/></g>
      <g id="lh-land">
        <path id="lh-rock" d="M176 ${HORIZON + 92} C 150 ${HORIZON + 50}, 170 ${HORIZON + 8}, 206 ${HORIZON - 8} C 230 ${HORIZON - 22}, 270 ${HORIZON - 34}, 330 ${HORIZON - 40} C 400 ${HORIZON - 46}, 470 ${HORIZON - 42}, 540 ${HORIZON - 30} C 600 ${HORIZON - 18}, 640 ${HORIZON + 4}, 690 ${HORIZON + 22} C 700 ${HORIZON + 50}, 690 ${HORIZON + 80}, 660 ${HORIZON + 92} C 480 ${HORIZON + 104}, 330 ${HORIZON + 104}, 176 ${HORIZON + 92} Z"/>
        <path id="lh-grass" d="M232 ${HORIZON - 26} C 290 ${HORIZON - 42}, 360 ${HORIZON - 52}, 440 ${HORIZON - 52} C 500 ${HORIZON - 52}, 560 ${HORIZON - 40}, 600 ${HORIZON - 24} C 540 ${HORIZON - 30}, 470 ${HORIZON - 36}, 400 ${HORIZON - 36} C 340 ${HORIZON - 36}, 280 ${HORIZON - 32}, 232 ${HORIZON - 26} Z"/>
        <g id="lh-tower">
          <path id="lh-body" d="M418 ${HORIZON - 48} L 436 ${LAMP.y + 28} L 468 ${LAMP.y + 28} L 486 ${HORIZON - 48} Z"/>
          <path d="M424 ${HORIZON - 108} L 430 ${HORIZON - 134} L 474 ${HORIZON - 134} L 480 ${HORIZON - 108} Z" fill="#2c3440" opacity=".55"/>
          <path d="M421 ${HORIZON - 78} L 426 ${HORIZON - 92} L 478 ${HORIZON - 92} L 483 ${HORIZON - 78} Z" fill="#2c3440" opacity=".5"/>
          <rect x="425" y="${LAMP.y + 22}" width="54" height="7" rx="2" fill="#2c3440"/>
          <rect x="437" y="${LAMP.y - 6}" width="30" height="28" rx="3" fill="#1c232d"/>
          <rect id="lh-glass" x="440" y="${LAMP.y - 3}" width="24" height="22" rx="2"/>
          <path d="M432 ${LAMP.y - 6} L 452 ${LAMP.y - 28} L 472 ${LAMP.y - 6} Z" fill="#2c3440"/>
          <rect x="450" y="${LAMP.y - 34}" width="4" height="8" fill="#2c3440"/>
        </g>
      </g>
      <g clip-path="url(#lh-seaclip)"><path id="lh-wv2"/><path id="lh-wv3"/><path id="lh-foam" d="M120 ${HORIZON + 88} q 40 -9 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0 t 80 0" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/></g>
      <circle id="lh-glow" cx="${LAMP.x}" cy="${LAMP.y + 8}" r="60" fill="url(#lh-lamp)"/>
      <rect id="lh-flash" width="${W}" height="${H}" fill="#eaf0ff" opacity="0"/>
    </svg>`;
  }

  function html() {
    return `<div class="lh-title"><h2>Health &amp; mind at a glance</h2><p>The lighthouse is the astronaut’s overall <b>physical health and mental state</b> in one picture. A <b>green</b> lamp, clear sky and calm sea mean stable. A <b>yellow</b> lamp, clouds and rougher water mean something needs attention. A <b>red</b> lamp and a storm mean critical: seek medical help now. The body systems below show exactly what is affected.</p></div>
    <div class="lh card glass" id="lh">
      <div class="lh-stage" id="lh-stage">${scene()}<canvas id="lh-rain" aria-hidden="true"></canvas>
        <div class="lh-cap" id="lh-cap" aria-live="polite"></div></div>
      <div class="lh-foot" id="lh-foot"></div></div>`;
  }

  function caption() {
    const m = AS.Model, s = m.overall, a = affected(), st = STATUS[s];
    const title = s === 'ok' ? 'All systems stable' : s === 'warn' ? 'Needs attention' : 'Critical – immediate assessment';
    const sub = s === 'ok' ? 'The lamp is green: every body system is within its assessment range.'
      : `${a.length} body system${a.length === 1 ? '' : 's'} affected. The lamp shows the overall severity; the anatomy below shows which systems.`;
    const cap = host.querySelector('#lh-cap'), foot = host.querySelector('#lh-foot');
    cap.innerHTML = `<span class="lh-dot" style="background:${st.color}"></span><b>${title}</b>`;
    const chips = a.length ? a.map((x) => `<button class="lh-chip s-${x.status} ${focusSys === x.id ? 'on' : ''}" data-act="lh-sys" data-id="${x.id}" aria-label="${x.def.name}: ${STATUS[x.status].word}"><i></i>${x.def.name}</button>`).join('') : '<span class="lh-ok">No affected systems</span>';
    const fx = focusSys && m.systems[focusSys] ? `<span class="lh-sel">Selected: <b>${m.systems[focusSys].def.name}</b> · ${STATUS[m.systems[focusSys].status].word}. Overall remains <b>${st.word.toLowerCase()}</b>.</span>` : '';
    foot.innerHTML = `<p class="lh-sub">${sub}</p><div class="lh-chips">${chips}</div>${fx}`;
    host.querySelector('#lh-svg').setAttribute('aria-label', `Lighthouse scene. Overall health: ${title}. ${a.length} affected systems.`);
  }

  /* ---------- per-frame drawing ---------- */
  function wavePath(i, t, lv) {
    const amp = lerp(3.5, 8, Math.min(lv, 1)) * (lv > 1 ? lerp(1, 2.5, lv - 1) : 1), sp = lerp(0.35, 0.8, Math.min(lv, 1)) * (lv > 1 ? lerp(1, 2.3, lv - 1) : 1);
    const y0 = HORIZON + 8 + i * 42, k = 0.012 + i * 0.004, a = amp * (0.55 + i * 0.28), ph = t * sp * (1 + i * 0.35) * (i % 2 ? -1 : 1);
    let d = `M0 ${H} L0 ${y0}`;
    for (let x = 0; x <= W; x += 24) d += ` L${x} ${(y0 + Math.sin(x * k + ph) * a + Math.sin(x * k * 2.1 + ph * 1.4) * a * 0.35).toFixed(1)}`;
    return d + ` L${W} ${H} Z`;
  }
  function draw(t, dt) {
    const lv = lvNow, a = Math.min(lv, 1), b = Math.max(0, lv - 1), lamp = lampColor(lv), lampS = rgb(lamp);
    const set = (id, k, v) => { const e = refs[id] || (refs[id] = svg.querySelector('#' + id)); if (e) e.setAttribute(k, v); };
    set('lh-s0', 'stop-color', rgb(col('skyTop', lv))); set('lh-s1', 'stop-color', rgb(col('skyBot', lv)));
    set('lh-w0', 'stop-color', rgb(col('seaFar', lv))); set('lh-w1', 'stop-color', rgb(col('seaNear', lv)));
    set('lh-sunc', 'opacity', (1 - a * 0.65 - b * 0.35).toFixed(3));
    for (let i = 0; i < 4; i++) { const e = refs['wv' + i] || (refs['wv' + i] = svg.querySelector('#lh-wv' + i)); e.setAttribute('d', wavePath(i, t, lv)); e.setAttribute('fill', rgb(mixc(col('seaFar', lv), col('seaNear', lv), 0.25 + i * 0.25))); e.setAttribute('opacity', i >= 2 ? '1' : (0.5 + i * 0.12).toFixed(2)); }
    set('lh-foam', 'opacity', (0.45 + b * 0.35).toFixed(2));
    const foam = refs.foam || (refs.foam = svg.querySelector('#lh-foam')); foam.setAttribute('transform', `translate(${(Math.sin(t * (0.6 + lv)) * (3 + lv * 5)).toFixed(1)} ${(Math.sin(t * (1.1 + lv)) * (1 + lv * 2.5)).toFixed(1)})`);
    set('lh-rock', 'fill', rgb(col('rock', lv))); set('lh-grass', 'fill', rgb(col('land', lv))); set('lh-body', 'fill', rgb(col('tower', lv)));
    /* clouds: drift with the wind, fade in/out by severity, darken with storm */
    const wind = lerp(5, 11, a) + b * 28, cc = rgb(col('cloud', lv));
    clouds.forEach((c, i) => {
      c.x += wind * c.sp * dt; if (c.x > W + 160) c.x = -160;
      const e = refs['c' + i] || (refs['c' + i] = svg.querySelector(`.lh-cloud[data-i="${i}"]`)), vis = clamp((lv - c.need + 0.35) / 0.5, 0, 1) * c.base;
      e.setAttribute('transform', `translate(${c.x.toFixed(1)} ${(c.y + Math.sin(t * 0.3 + i) * 3).toFixed(1)}) scale(${(c.s * (1 + b * 0.5)).toFixed(2)})`); e.setAttribute('opacity', vis.toFixed(3)); e.setAttribute('fill', cc);
    });
    /* lamp + beam */
    const flick = lv > 1.5 ? 0.82 + 0.18 * Math.sin(t * 17) * Math.sin(t * 5.3) : 1, pulse = 1 + 0.05 * Math.sin(t * 2.4);
    set('lh-glass', 'fill', lampS); set('lh-l0', 'stop-color', lampS); set('lh-l1', 'stop-color', lampS); svg.querySelectorAll('.lh-b0,.lh-b1').forEach((e) => e.setAttribute('stop-color', lampS));
    set('lh-glow', 'r', (lerp(46, 58, a) + b * 14).toFixed(1) * pulse); set('lh-glow', 'opacity', (lerp(0.7, 0.55, a) + b * 0.4).toFixed(2) * flick);
    set('lh-bl', 'stdDeviation', (lerp(1.2, 5.5, a) - b * 3).toFixed(2));
    const ang = t * (reduced ? 0 : lerp(0.55, 0.45, a) + b * 0.25), cs = Math.cos(ang), len = (lerp(520, 400, a) + b * 190) * Math.abs(cs), spread = lerp(20, 34, a) + b * 8, op = (lerp(0.8, 0.45, a) + b * 0.45) * flick;
    const poly = (dir) => { const x = LAMP.x + dir * len, y = LAMP.y + 8 + (cs * dir) * -2; return `${LAMP.x},${LAMP.y + 5} ${x.toFixed(1)},${(y - spread * Math.abs(cs)).toFixed(1)} ${x.toFixed(1)},${(y + spread * Math.abs(cs)).toFixed(1)} ${LAMP.x},${LAMP.y + 11}`; };
    const A = refs.bmA || (refs.bmA = svg.querySelector('#lh-bmA')), B = refs.bmB || (refs.bmB = svg.querySelector('#lh-bmB'));
    const dirA = cs >= 0 ? 1 : -1; A.setAttribute('points', poly(dirA)); B.setAttribute('points', poly(-dirA)); A.setAttribute('fill', dirA > 0 ? 'url(#lh-bmR)' : 'url(#lh-bmL)'); B.setAttribute('fill', dirA > 0 ? 'url(#lh-bmL)' : 'url(#lh-bmR)');
    A.setAttribute('opacity', op.toFixed(2)); B.setAttribute('opacity', (op * 0.22).toFixed(2));
    /* lightning (critical only) */
    if (!reduced && lv > 1.5) {
      if (t > nextBolt) { nextBolt = t + 4.5 + Math.random() * 7; flash = 1; const x0 = 700 + Math.random() * 400; let d = `M${x0} 0`, x = x0, y = 0; while (y < HORIZON + 8) { x += (Math.random() - 0.5) * 60; y += 28 + Math.random() * 30; d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; } bolt = d; }
    }
    flash = Math.max(0, flash - dt * 2.8);
    set('lh-flash', 'opacity', (flash * 0.28 * clamp(b * 2 - 0.4, 0, 1)).toFixed(3));
    const bo = refs.bolt || (refs.bolt = svg.querySelector('#lh-bolt')); if (bolt) bo.setAttribute('d', bolt); bo.setAttribute('opacity', (flash > 0.55 ? flash : 0).toFixed(2));
    drawRain(t, dt, lv, wind);
  }
  function drawRain(t, dt, lv, wind) {
    if (!ctx) return; const b = Math.max(0, lv - 1);
    ctx.clearRect(0, 0, cw, ch);
    const want = Math.round(b * (cw < 600 ? 110 : 220)), slant = 0.18 + b * 0.35 + (lv > 0.2 ? 0.06 : 0);
    while (rain.length < want) rain.push({ x: Math.random() * cw, y: Math.random() * ch, v: 520 + Math.random() * 380, l: 9 + Math.random() * 10 });
    if (rain.length > want) rain.length = want;
    ctx.strokeStyle = 'rgba(214,226,240,.5)'; ctx.lineWidth = 1; ctx.beginPath();
    rain.forEach((r) => { r.y += r.v * dt; r.x -= r.v * dt * slant; if (r.y > ch || r.x < -20) { r.y = -20; r.x = Math.random() * (cw + 80); } ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.l * slant, r.y - r.l); });
    ctx.stroke();
    /* wind streaks: faint horizontal gusts while abnormal or critical */
    const g = clamp(lv * 0.5, 0, 1) * (lv < 0.15 ? 0 : 1);
    if (g > 0) {
      while (streaks.length < 7) streaks.push({ x: Math.random() * cw, y: ch * (0.1 + Math.random() * 0.5), l: 50 + Math.random() * 90, v: 1 });
      ctx.strokeStyle = `rgba(255,255,255,${(0.12 * g).toFixed(3)})`; ctx.lineWidth = 1.2; ctx.beginPath();
      streaks.forEach((s) => { s.x += (wind * 6 + 40) * dt * s.v; if (s.x - s.l > cw) { s.x = -20; s.y = ch * (0.1 + Math.random() * 0.5); } ctx.moveTo(s.x - s.l, s.y); ctx.quadraticCurveTo(s.x - s.l / 2, s.y - 4, s.x, s.y); });
      ctx.stroke();
    }
  }
  function sizeCanvas() { const r = host.querySelector('#lh-stage').getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 1.5); cw = r.width; ch = r.height; cv.width = Math.round(cw * d); cv.height = Math.round(ch * d); ctx.setTransform(d, 0, 0, d, 0, 0); }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!host || !host.isConnected) { stop(); return; }
    if (!visible || document.hidden) { tPrev = now; return; }
    const dt = Math.min(0.05, (now - (tPrev || now)) / 1000); tPrev = now;
    const diff = lvTarget - lvNow; lvNow += Math.abs(diff) < 0.003 ? diff : diff * Math.min(1, dt * 1.1) + Math.sign(diff) * Math.min(Math.abs(diff), dt * 0.12);
    draw(now / 1000, dt);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; if (io) io.disconnect(); if (ro) ro.disconnect(); }

  /* ---------- public API ---------- */
  function mount(el) {
    host = el; el.innerHTML = html(); svg = el.querySelector('#lh-svg'); cv = el.querySelector('#lh-rain'); ctx = cv.getContext('2d'); refs = {}; rain = []; streaks = []; flash = 0; nextBolt = 6; bolt = null;
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    lvTarget = sevOf(); if (lvNow === null) lvNow = lvTarget; // first ever mount: jump; later mounts continue from the previous severity
    sizeCanvas(); ro = new ResizeObserver(sizeCanvas); ro.observe(el.querySelector('#lh-stage'));
    io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }); io.observe(el);
    caption(); draw(0, 0.016); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function refresh() { if (!host || !host.isConnected) return; lvTarget = sevOf(); caption(); }
  function focus(id) { focusSys = id || null; if (host && host.isConnected) caption(); }
  function destroy() { stop(); host = null; svg = null; focusSys = null; }
  AS.Lighthouse = { mount, refresh, focus, destroy, state: () => ({ target: lvTarget, now: lvNow }) };
  AS.act['lh-sys'] = (t) => { const id = t.dataset.id; if (AS.Views.overview) AS.Views.overview.select(id); };
})();
