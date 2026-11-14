/* BeaconCare – small dependency-free SVG chart helpers (line, bars, gauge, ring, sparkline) */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc } = AS.U;
  const reg = {};
  let uidn = 0;

  function ticks(lo, hi, n) {
    if (hi === lo) { hi = lo + 1; }
    const raw = (hi - lo) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, a = Math.floor(lo / step) * step, out = [];
    for (let v = a; v <= hi + step * 0.001; v += step) out.push(+v.toFixed(6));
    return out;
  }

  /* opts: series[{name,color,pts:[{x,y}],dash,area}], bands, lines, marks, height, yMin, yMax, unit, xName, dec */
  function line(o) {
    const id = 'c' + ++uidn, W = 640, H = o.height || 220, L = 46, R = 14, T = 14, B = 28;
    const all = o.series.flatMap((s) => s.pts.filter((p) => p.y != null));
    if (!all.length) return '<div class="empty">No data</div>';
    let xs = [...new Set(o.series.flatMap((s) => s.pts.map((p) => p.x)))].sort((a, b) => a - b);
    const x0 = xs[0], x1 = xs[xs.length - 1] || x0 + 1;
    let ymin = o.yMin != null ? o.yMin : Math.min(...all.map((p) => p.y)), ymax = o.yMax != null ? o.yMax : Math.max(...all.map((p) => p.y));
    (o.lines || []).forEach((l) => { if (o.yMin == null) ymin = Math.min(ymin, l.y); if (o.yMax == null) ymax = Math.max(ymax, l.y); });
    if (o.yMin == null) { const pad = (ymax - ymin) * 0.12 || 1; ymin -= pad; ymax += pad; }
    const tk = ticks(ymin, ymax, 4); if (o.yMin == null) { ymin = Math.min(ymin, tk[0]); ymax = Math.max(ymax, tk[tk.length - 1]); }
    const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R), sy = (y) => T + (1 - (y - ymin) / (ymax - ymin || 1)) * (H - T - B);
    let g = '';
    (o.bands || []).forEach((b) => { const a = sy(Math.min(b.hi, ymax)), c = sy(Math.max(b.lo, ymin)); if (c > a) g += `<rect x="${L}" y="${a}" width="${W - L - R}" height="${c - a}" fill="${b.color || '#4fbf8e'}" opacity="${b.op || 0.07}"/>`; });
    tk.forEach((t) => { if (t < ymin || t > ymax) return; g += `<line x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}" class="gl"/><text x="${L - 6}" y="${sy(t) + 3}" text-anchor="end" class="ax">${+t.toFixed(2)}</text>`; });
    const nx = Math.min(8, xs.length), step = Math.max(1, Math.floor((xs.length - 1) / (nx - 1 || 1)));
    xs.forEach((x, i) => { if (i % step === 0 || i === xs.length - 1) g += `<text x="${sx(x)}" y="${H - 8}" text-anchor="middle" class="ax">${esc(o.xFmt ? o.xFmt(x) : x)}</text>`; });
    (o.lines || []).forEach((l) => { g += `<line x1="${L}" x2="${W - R}" y1="${sy(l.y)}" y2="${sy(l.y)}" stroke="${l.color || '#e3b34f'}" stroke-dasharray="5 4" opacity=".75"/><text x="${W - R - 2}" y="${sy(l.y) - 4}" text-anchor="end" class="ax" fill="${l.color || '#e3b34f'}">${esc(l.label || '')}</text>`; });
    (o.marks || []).forEach((m) => { if (m.x < x0 || m.x > x1) return; g += `<line x1="${sx(m.x)}" x2="${sx(m.x)}" y1="${T}" y2="${H - B}" stroke="${m.color || '#8aa'}" stroke-dasharray="2 3" opacity=".8"/><text x="${sx(m.x) + 3}" y="${T + 9}" class="ax" fill="${m.color || '#9ab'}">${esc(m.label)}</text>`; });
    o.series.forEach((s) => {
      const pts = s.pts.filter((p) => p.y != null); if (!pts.length) return;
      const d = pts.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ');
      if (s.area) g += `<path d="${d} L${sx(pts[pts.length - 1].x)} ${H - B} L${sx(pts[0].x)} ${H - B}Z" fill="${s.color}" opacity=".12"/>`;
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="5 4"' : ''} class="ln"/>`;
      if (pts.length <= 40) pts.forEach((p) => { g += `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="2.4" fill="${s.color}"/>`; });
    });
    reg[id] = { xs, sx, sy, W, H, L, R, T, B, series: o.series, xName: o.xName || 'Day', xFmt: o.xFmt, dec: o.dec != null ? o.dec : 1, unit: o.unit || '' };
    const leg = o.series.length > 1 || o.legend ? `<div class="legend">${o.series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
    return `<div class="chart" data-cid="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'chart')}">${g}<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" style="display:none"/></svg><div class="tip" style="display:none"></div>${leg}</div>`;
  }

  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.chart'); document.querySelectorAll('.chart .xh').forEach((x) => { if (!c || x.closest('.chart') !== c) { x.style.display = 'none'; const t = x.closest('.chart').querySelector('.tip'); if (t) t.style.display = 'none'; } });
    if (!c) return; const m = reg[c.dataset.cid]; if (!m) return;
    const svg = c.querySelector('svg'), r = svg.getBoundingClientRect(), fx = ((e.clientX - r.left) / r.width) * m.W;
    let best = null, bd = 1e9; m.xs.forEach((x) => { const d = Math.abs(m.sx(x) - fx); if (d < bd) { bd = d; best = x; } });
    if (best == null) return;
    const xh = c.querySelector('.xh'), tip = c.querySelector('.tip'); xh.setAttribute('x1', m.sx(best)); xh.setAttribute('x2', m.sx(best)); xh.style.display = '';
    const rows = m.series.map((s) => { const p = s.pts.find((q) => q.x === best); return p && p.y != null ? `<div><i style="background:${s.color}"></i>${esc(s.name)}: <b>${(+p.y).toFixed(m.dec)}</b> ${esc(m.unit)}</div>` : ''; }).join('');
    tip.innerHTML = `<b>${esc(m.xName)} ${esc(m.xFmt ? m.xFmt(best) : best)}</b>${rows}`; tip.style.display = '';
    const px = (m.sx(best) / m.W) * r.width; tip.style.left = Math.min(Math.max(px + 10, 4), r.width - 150) + 'px'; tip.style.top = '6px';
  });

  function bars(o) { // o: items [{label,value,color,target}], max, unit, height
    const H = o.height || 160, W = 640, L = 36, B = 30, T = 12, n = o.items.length, bw = Math.min(46, (W - L - 10) / n - 8), max = o.max || Math.max(...o.items.map((i) => Math.max(i.value, i.target || 0))) * 1.15;
    let g = ''; ticks(0, max, 4).forEach((t) => { const y = T + (1 - t / max) * (H - T - B); g += `<line x1="${L}" x2="${W - 8}" y1="${y}" y2="${y}" class="gl"/><text x="${L - 5}" y="${y + 3}" text-anchor="end" class="ax">${t}</text>`; });
    o.items.forEach((it, i) => { const cx = L + ((i + 0.5) / n) * (W - L - 10), h = (it.value / max) * (H - T - B), y = H - B - h; g += `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${it.color || '#7fb6d4'}" opacity=".85"/><text x="${cx}" y="${y - 4}" text-anchor="middle" class="ax" fill="#dff">${it.value.toFixed(o.dec || 0)}</text><text x="${cx}" y="${H - 10}" text-anchor="middle" class="ax">${esc(it.label)}</text>`; if (it.target) { const ty = H - B - (it.target / max) * (H - T - B); g += `<line x1="${cx - bw / 2 - 4}" x2="${cx + bw / 2 + 4}" y1="${ty}" y2="${ty}" stroke="#fff" stroke-width="2" stroke-dasharray="3 2"/>`; } });
    return `<svg viewBox="0 0 ${W} ${H}" class="barsvg" role="img" aria-label="${esc(o.title || 'bar chart')}">${g}</svg>`;
  }

  function hbars(items, o) { // items [{label,value,max,color,note}]
    return `<div class="hbars">${items.map((it) => { const pct = Math.max(0, Math.min(100, (it.value / (it.max || 100)) * 100)); return `<div class="hb"><div class="hbl"><span>${esc(it.label)}</span><b>${it.text != null ? esc(it.text) : it.value.toFixed(0) + (o && o.unit ? o.unit : '')}</b></div><div class="hbt"><div class="hbf" style="width:${pct}%;background:${it.color || 'var(--cyan)'}"></div>${it.target != null ? `<div class="hbm" style="left:${Math.min(100, (it.target / (it.max || 100)) * 100)}%"></div>` : ''}</div></div>`; }).join('')}</div>`;
  }

  function gauge(score, color, label) {
    const r = 70, cx = 90, cy = 88, a = Math.PI * (1 - Math.min(100, Math.max(0, score)) / 100);
    const px = cx + r * Math.cos(a), py = cy - r * Math.sin(a), big = 0;
    return `<svg viewBox="0 0 180 112" class="gauge" role="img" aria-label="Risk index ${score} of 100"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#4fbf8e"/><stop offset=".55" stop-color="#e3b34f"/><stop offset="1" stop-color="#e0646f"/></linearGradient></defs><path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="12" stroke-linecap="round"/><path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="6" fill="${color}" stroke="#04101f" stroke-width="2"/><text x="${cx}" y="${cy - 8}" text-anchor="middle" class="gv" fill="${color}">${score}</text><text x="${cx}" y="${cy + 12}" text-anchor="middle" class="gl2">${esc(label)}</text></svg>`;
  }

  function ring(pct, color, size, w) {
    size = size || 56; w = w || 6; const r = (size - w) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${w}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dasharray .8s"/></svg>`;
  }

  function spark(vals, color, w, h) {
    w = w || 90; h = h || 26; const v = vals.filter((x) => x != null); if (v.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
    const lo = Math.min(...v), hi = Math.max(...v), rg = hi - lo || 1;
    const d = v.map((y, i) => (i ? 'L' : 'M') + ((i / (v.length - 1)) * (w - 2) + 1).toFixed(1) + ' ' + (h - 3 - ((y - lo) / rg) * (h - 6)).toFixed(1)).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="spark"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }

  AS.Charts = { line, bars, hbars, gauge, ring, spark, ticks };

  /* light-theme colour mapping: pale series colours are darkened so lines stay readable on light surfaces */
  (function () {
    const MAP = { '7fb6d4': '2f6f9f', '78c4b0': '2b8a78', 'b58bc9': '8a5aa3', 'a999d6': '6e5fb0', '7f98d6': '4a62b8', 'e0956a': 'c4673a', 'cfd9ea': '4b5b78', 'a9c96e': '6d8f2e', 'e3c077': 'b58a1c', '4fbf8e': '2f9e6e', 'e3b34f': 'b98311', 'e0646f': 'cc4452', 'e8b595': 'b9703f', 'b9c95e': '7e9a22', 'd4859a': 'b0546f' };
    Object.keys(AS.Charts).forEach((k) => {
      const f = AS.Charts[k]; if (typeof f !== 'function') return;
      AS.Charts[k] = function () {
        const out = f.apply(this, arguments);
        if (typeof out !== 'string' || document.documentElement.getAttribute('data-theme') !== 'light') return out;
        return out.replace(/#([0-9a-fA-F]{6})/g, (m, h) => (MAP[h.toLowerCase()] ? '#' + MAP[h.toLowerCase()] : m));
      };
    });
  })();
})();