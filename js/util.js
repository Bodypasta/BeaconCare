/* BeaconCare – shared utilities. No build step: every file attaches to window.AS */
(function () {
  const AS = (window.AS = window.AS || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad2 = (n) => String(Math.floor(n)).padStart(2, '0');
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round = (v, d = 0) => { const m = Math.pow(10, d); return Math.round(v * m) / m; };
  const fmt = (v, d = 0) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(d));
  const mean = (a) => { const b = a.filter((x) => x != null && !isNaN(x)); return b.length ? b.reduce((s, x) => s + x, 0) / b.length : null; };
  const sum = (a) => a.reduce((s, x) => s + (x || 0), 0);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const STATUS = {
    ok: { color: '#4fbf8e', label: 'NORMAL', word: 'Healthy', rank: 0 },
    warn: { color: '#e3b34f', label: 'ATTENTION', word: 'Needs attention', rank: 1 },
    crit: { color: '#e0646f', label: 'CRITICAL', word: 'Immediate assessment', rank: 2 },
  };
  const worst = (a, b) => (STATUS[a].rank >= STATUS[b].rank ? a : b);
  const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (h, a) => { const c = hexToRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const mix = (h1, h2, t) => { const a = hexToRgb(h1), b = hexToRgb(h2); return '#' + [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], t)).toString(16).padStart(2, '0')).join(''); };
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  AS.U = { clamp, lerp, pad2, mulberry32, esc, round, fmt, mean, sum, $, $$, STATUS, worst, rgba, mix, hexToRgb, debounce };
  AS.act = {}; // click-action registry (data-act="name")
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const f = AS.act[t.dataset.act];
    if (f) { f(t, e); }
  });
})();
