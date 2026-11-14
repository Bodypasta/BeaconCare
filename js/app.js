/* BeaconCare – application shell: router, header, notifications, scenario switching */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc, STATUS } = AS.U;
  const { icon } = AS.UI;
  const $ = (id) => document.getElementById(id);
  const ROUTES = ['overview', 'hazards', 'history', 'investigation', 'mind'];
  const NAMES = { overview: 'OVERVIEW', hazards: 'Spaceflight hazards', history: 'Health history', investigation: 'Medical investigation', mind: 'Mind & focus' };
  let cur = null, curName = null, raf = 0;

  /* ---------- router ---------- */
  function parseHash() {
    const h = (location.hash || '#/overview').replace(/^#\/?/, ''), [name, q] = h.split('?');
    const params = {}; (q || '').split('&').forEach((p) => { if (!p) return; const [k, v] = p.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { name: ROUTES.includes(name) ? name : 'overview', params };
  }
  let glT = 0; function glossLater() { clearTimeout(glT); glT = setTimeout(() => { const v = $('view'); if (v) AS.UI.glossify(v); }, 120); }
  function route() {
    const { name, params } = parseHash();
    if (cur && cur.destroy) cur.destroy();
    const host = $('view'); host.innerHTML = ''; host.className = 'view v-' + name;
    const el = document.createElement('div'); el.className = 'view-in'; host.appendChild(el);
    curName = name; cur = AS.Views[name];
    cur.mount(el, params);
    if (name === 'overview' && AS._pendingSel) { const id = AS._pendingSel; AS._pendingSel = null; setTimeout(() => { if (curName === 'overview') AS.Views.overview.select(id); }, 80); }
    document.querySelectorAll('[data-nav]').forEach((a) => { const on = a.dataset.nav === name; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = `BeaconCare – ${NAMES[name]}`;
    glossLater();
    if (name !== 'overview') window.scrollTo(0, 0);
  }
  AS.act.goto = (t) => { if (t.dataset.sel) AS._pendingSel = t.dataset.sel; const to = t.dataset.to; if (location.hash === to) route(); else location.hash = to; };

  /* ---------- header / chrome ---------- */
  function chrome() {
    const m = AS.Model, sc = m.sc;
    document.documentElement.style.setProperty('--sc', sc.color);
    $('mission').innerHTML = `<b>${esc(sc.mission)}</b><small>${esc(sc.crew)}</small>`;
    $('mday').textContent = 'Mission day ' + String(m.N).padStart(2, '0');
    document.querySelectorAll('[data-act="scenario"]').forEach((b) => { const on = b.dataset.id === m.id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const n = AS.D.SYSTEMS.filter((s) => m.systems[s.id].status !== 'ok').length;
    document.querySelectorAll('.nav-badge').forEach((b) => { b.textContent = n; b.hidden = !n; b.className = 'nav-badge s-' + (m.overall === 'crit' ? 'crit' : 'warn'); });
    const bar = $('alertbar');
    if (m.emergency || m.overall === 'crit') { bar.hidden = false; bar.innerHTML = `<b>${icon('hazards', 16)} ${m.emergency ? 'Emergency alert' : 'Critical indicator'}</b><span>${m.emergency ? 'Potentially serious medical situation – follow the emergency protocol.' : 'A body system is in a critical range.'}</span><button class="btn sm danger" data-act="goto" data-to="#/investigation">Open investigation</button>`; }
    else bar.hidden = true;
    renderBell();
  }
  function clockTick() {
    $('clock').textContent = AS.Clock.hhmmss() + ' GMT';
    $('clock').title = AS.Store.get().clockOffset ? 'Demo clock offset active (see Settings → schedule)' : 'Spacecraft mission time (GMT) – independent of Earth local time';
  }

  /* ---------- theme ---------- */
  AS.Theme = {
    get: () => document.documentElement.getAttribute('data-theme') || 'dark',
    set(t) {
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('astra.theme', t); } catch (e) { /* ignore */ }
      const mt = document.getElementById('metatheme'); if (mt) mt.content = t === 'light' ? '#edf1f7' : '#0a1220';
      AS.emit('theme', t);
    },
    toggle() { this.set(this.get() === 'light' ? 'dark' : 'light'); },
  };
  AS.act.theme = () => { AS.Theme.toggle(); route(); };

  /* ---------- space backdrop parallax (desktop, skipped for reduced motion) ---------- */
  function parallax() {
    const sp = document.getElementById('space');
    if (!sp || matchMedia('(prefers-reduced-motion: reduce)').matches || innerWidth < 700) return;
    const els = Array.from(sp.querySelectorAll('[data-px]')); let mx = 0, my = 0, sy = 0, ticking = false;
    const apply = () => { ticking = false; els.forEach((e) => { const k = +e.dataset.px; e.style.transform = `translate3d(${(-mx * k).toFixed(1)}px, ${(-my * k - sy * k * 0.04).toFixed(1)}px, 0)`; }); };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
    addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; req(); }, { passive: true });
    addEventListener('scroll', () => { sy = scrollY; req(); }, { passive: true });
  }

  /* ---------- scenarios ---------- */
  AS.act.scenario = (t) => {
    const id = t.dataset.id; // picking a scenario (even the active one) restarts it from its clean demo state
    AS.Store.resetScenario(id); AS.Engine.load(id); AS.Band.reset(); AS.Engine.update(null);
    AS.emit('model-reset'); AS._pendingSel = null;
    history.replaceState(null, '', '#/' + curName); // drop stale ?sys= / ?s= parameters from the previous scenario
    chrome(); route(); notifyCycle(true);
    const sc = AS.Model.sc;
    AS.UI.toast({ sev: 'info', title: `Scenario: ${sc.name}`, body: 'All data views were regenerated from this scenario (simulated).' });
    if (AS.Views.overview && curName === 'overview') AS.Views.overview.scan();
  };

  /* ---------- notifications ---------- */
  function allNotes() { return AS.Engine.collectNotifications(AS.Model); }
  function renderBell() {
    const u = AS.Store.user(), list = allNotes(), unread = list.filter((n) => !u.read[n.id]).length;
    const b = $('bellcount'); b.textContent = unread; b.hidden = !unread;
    if (!$('drawer').hidden) renderDrawer();
  }
  function renderDrawer() {
    const u = AS.Store.user(), list = allNotes().sort((a, b) => STATUS[b.sev === 'info' ? 'ok' : b.sev].rank - STATUS[a.sev === 'info' ? 'ok' : a.sev].rank);
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    $('drawer').innerHTML = `<div class="dr-h"><b>NOTIFICATIONS</b><div><button class="btn sm" data-act="note-readall">Mark all read</button><button class="icon-btn" data-act="note-close" aria-label="Close">${icon('x', 16)}</button></div></div>
      ${perm === 'default' ? `<div class="note-box">${icon('info', 15)} <span>Allow device notifications to receive checkup reminders even when this tab is in the background.</span><button class="btn sm" data-act="note-perm">Enable</button></div>` : perm === 'denied' ? '<p class="muted xs pad">Device notifications are blocked in your browser; in-app alerts still work.</p>' : ''}
      <div class="dr-list">${list.length ? list.map((n) => `<div class="nt s-${n.sev === 'info' ? 'info' : n.sev} ${u.read[n.id] ? 'read' : ''}"><i></i><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p></div><button class="btn sm" data-act="note-open" data-id="${esc(n.id)}">${n.act === 'checkup' ? 'START' : 'OPEN'}</button></div>`).join('') : '<p class="muted pad">No notifications.</p>'}</div>`;
  }
  AS.act.bell = () => { const d = $('drawer'); d.hidden = !d.hidden; if (!d.hidden) renderDrawer(); };
  AS.act['note-close'] = () => { $('drawer').hidden = true; };
  AS.act['note-readall'] = () => { const u = AS.Store.user(); allNotes().forEach((n) => { u.read[n.id] = true; }); AS.Store.save(); renderBell(); renderDrawer(); };
  AS.act['note-perm'] = () => { try { Notification.requestPermission().then(() => renderDrawer()); } catch (e) { /* ignore */ } };
  AS.act['note-open'] = (t) => {
    const n = allNotes().find((x) => x.id === t.dataset.id); if (!n) return;
    const u = AS.Store.user(); u.read[n.id] = true; AS.Store.save(); $('drawer').hidden = true; renderBell();
    if (n.act === 'checkup') AS.act['start-checkup'](); else if (n.route) { if (location.hash === n.route) route(); else location.hash = n.route; }
  };
  let firstCycle = true;
  function notifyCycle(initial) {
    const u = AS.Store.user(), list = allNotes();
    const fresh = list.filter((n) => !u.delivered[n.id]);
    fresh.forEach((n) => { u.delivered[n.id] = true; });
    if (fresh.length) AS.Store.save();
    let shown = 0;
    fresh.sort((a, b) => STATUS[b.sev === 'info' ? 'ok' : b.sev].rank - STATUS[a.sev === 'info' ? 'ok' : a.sev].rank).forEach((n) => {
      if (n.id.includes(':ins:')) return;
      if (shown >= 2) return; shown++;
      AS.UI.toast({ sev: n.sev, title: n.title, body: n.body, action: n.act === 'checkup' ? { label: 'Start checkup', fn: () => AS.act['start-checkup']() } : n.route ? { label: 'OPEN', fn: () => { location.hash = n.route; } } : null });
      try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('BeaconCare – ' + n.title, { body: n.body }); } catch (e) { /* ignore */ }
    });
    renderBell(); firstCycle = false;
  }

  /* ---------- settings ---------- */
  AS.act['open-settings'] = () => {
    const md = AS.UI.modal({ title: 'Settings & about' });
    md.set(`<div class="setrow"><div><b>Checkup schedule &amp; mission clock</b><small class="muted">Wake/sleep times, morning and evening windows, demo clock jumps.</small></div><button class="btn sm" data-w="sched">Open</button></div>
      <div class="setrow"><div><b>Reset this scenario</b><small class="muted">Deletes only the records, actions and checkups you saved for “${esc(AS.Model.sc.name)}”.</small></div><button class="btn sm" data-w="rs">Reset</button></div>
      <div class="setrow"><div><b>Reset everything</b><small class="muted">Clears all saved BeaconCare data in this browser.</small></div><button class="btn sm danger" data-w="ra">Reset all</button></div>
      <div class="note-box">${icon('info', 15)} <span><b>About BeaconCare.</b> Astronaut health and mind monitoring with early risk assessment. A rule-based demonstration – no artificial intelligence, no cloud, no medical-device claims. All data is <b>simulated</b>. Alert bands are BeaconCare demonstration settings, not NASA-approved operational thresholds. It is decision-support only and never replaces the onboard medical officer or flight surgeon.</span></div>
      <p class="muted xs">Everything stays in your browser (localStorage). Source: see the repository README.</p>`);
    md.body.addEventListener('click', (e) => {
      const w = e.target.closest('[data-w]'); if (!w) return; const k = w.dataset.w;
      if (k === 'sched') { md.close(); AS.act['open-sched'](); }
      if (k === 'rs' && confirm('Reset saved data for this scenario?')) { AS.Store.resetScenario(AS.Model.id); AS.Engine.load(AS.Model.id); AS.Band.reset(); md.close(); chrome(); route(); AS.UI.toast({ sev: 'info', title: 'Scenario reset', body: 'Saved records for this scenario were removed.' }); }
      if (k === 'ra' && confirm('Clear ALL saved BeaconCare data in this browser?')) { AS.Store.resetAll(); AS.Engine.load('healthy'); AS.Band.reset(); md.close(); chrome(); route(); AS.UI.toast({ sev: 'info', title: 'All data cleared', body: 'BeaconCare was reset to the Healthy scenario.' }); }
    });
  };

  /* ---------- model events ---------- */
  function refresh() {
    if (raf) return; raf = requestAnimationFrame(() => { raf = 0; chrome(); if (cur && cur.update) cur.update(); glossLater(); });
  }
  AS.on('model', refresh);
  AS.on('model-live', () => { if (curName === 'overview' && cur && cur.update) cur.update(); chromeLight(); });
  AS.on('tick', () => { if (curName === 'overview' && cur && cur.tick) cur.tick(); });
  AS.on('clock', () => { clockTick(); refresh(); });
  AS.on('remind', () => { chrome(); notifyCycle(); });
  function chromeLight() { const m = AS.Model; const bar = $('alertbar'); const want = !!(m.emergency || m.overall === 'crit'); if (bar.hidden === want) chrome(); }

  /* ---------- boot ---------- */
  function boot() {
    AS.Engine.load(AS.Store.get().scenario in AS.D.SCENARIOS ? AS.Store.get().scenario : 'healthy');
    AS.Band.reset();
    chrome(); clockTick();
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = '#/overview'; else route();
    AS.Band.start();
    setInterval(clockTick, 1000);
    setInterval(() => notifyCycle(), 15000);
    setTimeout(() => notifyCycle(true), 1500);
    const st = AS.Store.get();
    if (st.firstRun) { st.firstRun = false; AS.Store.saveNow(); setTimeout(() => AS.UI.toast({ sev: 'info', ms: 12000, title: 'Welcome to BeaconCare', body: 'Everything here is simulated. Use the Healthy / Abnormal / Critical buttons in the top bar to explore the three demo scenarios.' }), 2500); }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('drawer').hidden = true; } });
    document.addEventListener('click', (e) => { const d = $('drawer'); if (!d.hidden && !e.target.closest('#drawer') && !e.target.closest('[data-act="bell"]') && !e.target.closest('[data-act^="note-"]')) d.hidden = true; });
    parallax();
    document.body.classList.add('ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
