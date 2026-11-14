/* BeaconCare – shared UI helpers: icons, pills, modal, toasts, illustrations */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc, STATUS } = AS.U;

  const ICON = {
    cardiovascular: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
    respiratory: 'M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2 M9.6 4.6A2 2 0 1 1 11 8H2 M12.6 19.4A2 2 0 1 0 14 16H2',
    nervous: 'M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 4V3Z M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 4V3Z',
    skeletal: 'M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z',
    muscular: 'M14.4 14.4 9.6 9.6 M3 3l1 1 M20 20l1 1 M18 22l4-4 M2 6l4-4 M3 10l7-7 M14 21l7-7',
    digestive: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2 M7 2v20 M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7',
    immune: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    endocrine: 'M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    urinary: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
    overview: 'M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M6 22v-7l-2-3 M18 22v-7l2-3 M9 22v-6 M15 22v-6 M8 8h8l1 7H7z',
    hazards: 'M12 3 2 20h20L12 3z M12 10v4 M12 17h.01',
    history: 'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5 M12 7v5l4 2',
    investigation: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.3-4.3',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    thermo: 'M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z', moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', activity: 'M22 12h-4l-3 9L9 3l-3 9H2', check: 'M20 6 9 17l-5-5', x: 'M18 6 6 18 M6 6l12 12',
    bt: 'M7 7l10 10-5 5V2l5 5L7 17', radiation: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M12 3a9 9 0 0 1 7.8 4.5l-4.3 2.5a4 4 0 0 0-3.5-2 M4.2 7.5A9 9 0 0 1 12 3v5a4 4 0 0 0-3.5 2 M12 21a9 9 0 0 1-7.8-4.5l4.3-2.5a4 4 0 0 0 3.5 2 M19.8 16.5A9 9 0 0 1 12 21v-5a4 4 0 0 0 3.5-2', phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
    scan: 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10', info: 'M12 16v-4 M12 8h.01 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', play: 'M6 4l14 8-14 8z', refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5', zoomin: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.3-4.3 M11 8v6 M8 11h6', zoomout: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.3-4.3 M8 11h6', rotate: 'M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5', dl: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
  };
  const icon = (n, s) => `<svg class="ic" width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[n] || ICON.info}"/></svg>`;
  const pill = (s, txt) => `<span class="pill s-${s}"><i></i>${esc(txt || STATUS[s].label)}</span>`;
  const dot = (s) => `<span class="sdot s-${s}"></span>`;
  const sim = (t) => `<span class="simtag" title="Simulated demonstration data – not a real medical reading">${esc(t || 'SIMULATED')}</span>`;

  /* ---------- modal ---------- */
  let modalStack = [];
  function modal(o) {
    const host = document.getElementById('modal'), el = document.createElement('div');
    el.className = 'modal-wrap'; el.innerHTML = `<div class="modal glass ${o.wide ? 'wide' : ''} ${o.danger ? 'danger' : ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title || '')}"><div class="m-head"><h3>${esc(o.title || '')}</h3><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div><div class="m-body"></div></div>`;
    host.appendChild(el); document.body.classList.add('modal-open');
    const api = { el, body: el.querySelector('.m-body'), title: el.querySelector('h3'), close() { el.remove(); modalStack = modalStack.filter((m) => m !== api); if (!modalStack.length) document.body.classList.remove('modal-open'); if (o.onClose) o.onClose(); }, set(html) { api.body.innerHTML = html; api.body.scrollTop = 0; el.querySelector('.modal').scrollTop = 0; } };
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) api.close(); });
    modalStack.push(api); if (o.html) api.set(o.html); if (o.onMount) o.onMount(api);
    const f = el.querySelector('button,input,select'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
    return api;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1].close(); });

  /* ---------- toasts ---------- */
  function toast(o) {
    const host = document.getElementById('toasts'), el = document.createElement('div'); el.className = `toast s-${o.sev === 'crit' ? 'crit' : o.sev === 'warn' ? 'warn' : 'info'}`;
    el.innerHTML = `<div class="tt">${icon(o.sev === 'crit' ? 'hazards' : o.sev === 'warn' ? 'hazards' : 'bell', 16)}<b>${esc(o.title)}</b><button class="icon-btn" aria-label="Dismiss">${icon('x', 14)}</button></div><p>${esc(o.body || '')}</p>${o.action ? `<button class="btn sm" data-ta>${esc(o.action.label)}</button>` : ''}`;
    host.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    el.querySelector('.icon-btn').onclick = kill; if (o.action) el.querySelector('[data-ta]').onclick = () => { o.action.fn(); kill(); };
    if (o.sev !== 'crit') setTimeout(kill, o.ms || 8000);
    while (host.children.length > 4) host.firstChild.remove();
  }

  /* ---------- SVG illustrations (educational, schematic) ---------- */
  const Illus = {
    muscle(pct) { // healthy vs weakened muscle cross-section; pct = current muscle index
      const fibres = (cx, cy, r, scale, gap) => { let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,155,94,.10)" stroke="#e0956a" stroke-width="1.5"/>`; for (let i = 0; i < 28; i++) { const a = i * 2.4, rr = Math.sqrt(i / 28) * (r - 10 * scale); if (gap && i % gap === 0) continue; s += `<circle cx="${cx + Math.cos(a) * rr}" cy="${cy + Math.sin(a) * rr}" r="${9 * scale}" fill="rgba(255,155,94,.35)" stroke="#e8b595" stroke-width="1"/>`; } return s; };
      const w = Math.max(0.55, Math.min(1, (pct - 80) / 20 + 0.45));
      return `<svg viewBox="0 0 360 150" class="illus" role="img" aria-label="Healthy versus weakened muscle"><text x="70" y="14" class="il">Healthy muscle</text>${fibres(70, 82, 56, 1, 0)}<text x="250" y="14" class="il">UNLOADED / ATROPHIED (${pct ? pct.toFixed(0) : '—'} %)</text>${fibres(250, 82, 56 * (0.78 + 0.22 * w), 0.7 + 0.3 * w, 4)}<path d="M135 82h70" stroke="#7fb6d4" stroke-dasharray="4 4"/><path d="M198 76l8 6-8 6" fill="none" stroke="#7fb6d4"/><text x="170" y="72" text-anchor="middle" class="il">microgravity</text><text x="170" y="100" text-anchor="middle" class="il">↓ loading</text></svg>`;
    },
    bone(pct) { // trabecular bone
      const net = (cx, dens, col) => { let s = `<rect x="${cx - 55}" y="22" width="110" height="110" rx="10" fill="rgba(227,236,255,.05)" stroke="${col}"/>`; const rnd = AS.U.mulberry32(Math.round(dens * 100)); for (let i = 0; i < 34 * dens; i++) { const x1 = cx - 50 + rnd() * 100, y1 = 28 + rnd() * 98, x2 = x1 + (rnd() - 0.5) * 36, y2 = y1 + (rnd() - 0.5) * 36; s += `<line x1="${x1}" y1="${y1}" x2="${Math.max(cx - 52, Math.min(cx + 52, x2))}" y2="${Math.max(24, Math.min(130, y2))}" stroke="${col}" stroke-width="${1 + dens * 1.6}" opacity=".8"/>`; } return s; };
      const d = Math.max(0.35, Math.min(1, (pct - 88) / 12 + 0.5));
      return `<svg viewBox="0 0 360 150" class="illus" role="img" aria-label="Healthy versus porous bone"><text x="70" y="14" class="il">Dense trabecular bone</text>${net(70, 1, '#cfd9ea')}<text x="250" y="14" class="il">THINNED BONE (${pct ? pct.toFixed(1) : '—'} % of baseline)</text>${net(250, d, '#e3b34f')}<text x="160" y="84" class="il" text-anchor="middle">→</text></svg>`;
    },
    ecg(hr, irregular) { // schematic ECG
      let d = 'M0 40', x = 0, per = 360 / Math.max(1, hr / 60 * 2.2); let i = 0;
      while (x < 360) { const p = irregular ? per * (0.7 + 0.6 * Math.abs(Math.sin(i * 2.7))) : per; d += ` L${x + p * 0.1} 40 q${p * 0.04} -6 ${p * 0.08} 0 L${x + p * 0.32} 40 l${p * 0.02} 6 l${p * 0.04} -38 l${p * 0.04} 46 l${p * 0.02} -14 L${x + p * 0.56} 40 q${p * 0.08} -12 ${p * 0.16} 0 L${x + p} 40`; x += p; i++; }
      return `<svg viewBox="0 0 360 80" class="illus" role="img" aria-label="Schematic ECG trace"><path d="${d}" fill="none" stroke="#e0646f" stroke-width="1.8"/><text x="4" y="12" class="il">SCHEMATIC TRACE (${Math.round(hr)} bpm) – illustration only, not diagnostic</text></svg>`;
    },
    dna() {
      let s = '<svg viewBox="0 0 360 150" class="illus" role="img" aria-label="DNA damage by radiation"><text x="6" y="14" class="il">RADIATION → DNA DOUBLE-STRAND BREAK (schematic)</text>';
      for (let i = 0; i < 16; i++) { const x = 40 + i * 18, y1 = 80 + Math.sin(i * 0.7) * 30, y2 = 80 - Math.sin(i * 0.7) * 30, brk = i === 8; s += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#7fb6d4" opacity=".5"/>`; s += `<circle cx="${x}" cy="${y1}" r="3.5" fill="#7f98d6"/><circle cx="${x}" cy="${y2}" r="3.5" fill="#78c4b0"/>`; if (brk) s += `<rect x="${x - 5}" y="50" width="10" height="60" fill="#04101f"/><text x="${x}" y="130" text-anchor="middle" class="il" fill="#e0646f">break</text>`; }
      return s + '<path d="M300 20 L205 78" stroke="#b58bc9" stroke-width="2" marker-end="url(#ar)"/><circle cx="302" cy="18" r="5" fill="#b58bc9"/><text x="330" y="36" class="il" text-anchor="end">heavy ion</text></svg>';
    },
    flow(items) { // generic left-to-right flow [{t,c}]
      const w = 360 / items.length; let s = `<svg viewBox="0 0 360 ${60}" class="illus">`;
      items.forEach((it, i) => { s += `<rect x="${i * w + 4}" y="8" width="${w - 22}" height="44" rx="8" fill="rgba(127,182,212,.08)" stroke="${it.c || '#7fb6d4'}"/><text x="${i * w + 4 + (w - 22) / 2}" y="34" text-anchor="middle" class="il">${esc(it.t)}</text>`; if (i < items.length - 1) s += `<path d="M${i * w + w - 16} 30h12" stroke="#7fb6d4"/><path d="M${i * w + w - 8} 26l4 4-4 4" fill="none" stroke="#7fb6d4"/>`; });
      return s + '</svg>';
    },
  };

  AS.UI = { icon, pill, dot, sim, modal, toast, Illus };
})();

/* Glossary tooltips: wrap scientific terms in .gl elements with a plain-language definition. */
(function () {
  const AS = window.AS, G = {
    'SpO₂': 'Blood oxygen saturation – the share of haemoglobin carrying oxygen.', 'HRV': 'Heart-rate variability – the beat-to-beat variation in timing; lower values can signal stress or fatigue.',
    'BMD': 'Bone mineral density – how much mineral is packed into bone; low values mean weaker bone.', 'mSv': 'Millisievert – a unit of radiation dose that reflects biological effect.',
    'GAD-2': 'A two-question screening check for anxiety symptoms. It is a screen, not a diagnosis.', 'PHQ-2': 'A two-question screening check for low mood. It is a screen, not a diagnosis.',
    'resorption': 'Bone being broken down faster than it is rebuilt.', 'atrophy': 'Muscle shrinking from reduced use or loading.', 'deconditioning': 'Loss of fitness and cardiovascular efficiency from reduced load.',
    'orthostatic': 'Related to standing up – blood pressure can drop when blood pools in the legs.', 'arrhythmia': 'An irregular heart rhythm.', 'VIIP': 'Visual impairment from fluid shift toward the head, also called SANS.', 'SANS': 'Spaceflight-associated neuro-ocular syndrome – eye and vision changes from fluid shift.'
  }, terms = Object.keys(G).sort((a, b) => b.length - a.length), re = new RegExp('(?<![\\w-])(' + terms.map((t) => t.replace(/[-.]/g, '\\$&')).join('|') + ')(?![\\w-])', 'g');
  AS.UI.glossify = function (root) {
    const seen = new Set([...root.querySelectorAll('.gl')].map((x) => x.textContent)), w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement.closest('script,style,button,a,.gl,summary,svg,canvas,textarea,input,h1,h2,h3,h4,.pill') || !re.test(n.nodeValue) ? (re.lastIndex = 0, NodeFilter.FILTER_REJECT) : (re.lastIndex = 0, NodeFilter.FILTER_ACCEPT) }), nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach((n) => { const f = document.createDocumentFragment(); let i = 0, m; re.lastIndex = 0; const txt = n.nodeValue;
      while ((m = re.exec(txt))) { if (seen.has(m[1])) continue; seen.add(m[1]); f.append(txt.slice(i, m.index)); const s = document.createElement('span'); s.className = 'gl'; s.tabIndex = 0; s.dataset.def = G[m[1]]; s.textContent = m[1]; f.append(s); i = m.index + m[1].length; }
      f.append(txt.slice(i)); n.replaceWith(f); });
  };
})();
