/* BeaconCare – interactive 3D anatomy. A small software 3D engine drawing shaded "hologram" meshes on a 2D canvas
   (no external library, so it works offline on GitHub Pages). Nine systems + skin, picking, pain-region anchors.
   Anatomical LEFT = +x (viewer's right when the model faces the viewer). */
(function () {
  const AS = (window.AS = window.AS || {});
  const { clamp, rgba, mix, STATUS } = AS.U;

  /* ---------- vector + mesh helpers ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  function ellipsoid(c, r, o) {
    o = o || {}; const nu = o.nu || 10, nv = o.nv || 6, az = o.rz || 0, ax = o.rx || 0, V = [], Q = [], cs = Math.cos(az), sn = Math.sin(az), cx = Math.cos(ax), sx = Math.sin(ax);
    for (let j = 0; j <= nv; j++) { const ph = (Math.PI * j) / nv; for (let i = 0; i < nu; i++) { const th = (2 * Math.PI * i) / nu; let x = r[0] * Math.sin(ph) * Math.cos(th), y = r[1] * Math.cos(ph), z = r[2] * Math.sin(ph) * Math.sin(th); let y2 = y * cx - z * sx, z2 = y * sx + z * cx; y = y2; z = z2; const x2 = x * cs - y * sn; y2 = x * sn + y * cs; V.push([c[0] + x2, c[1] + y2, c[2] + z]); } }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * nu + i, b = j * nu + ((i + 1) % nu), cc = (j + 1) * nu + ((i + 1) % nu), d = (j + 1) * nu + i; Q.push([a, b, cc, d, c]); }
    return { V, Q };
  }
  function catmull(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return [0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)); }
  function spline(pts, rad, k) {
    const n = pts.length, rr = (i) => (Array.isArray(rad) ? rad[Math.min(i, rad.length - 1)] : rad), P = [], R = [];
    const lerpR = (a, b, t) => (Array.isArray(a) ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : a + (b - a) * t);
    for (let i = 0; i < n - 1; i++) for (let s = 0; s < k; s++) { const t = s / k; P.push(n > 2 ? catmull(pts[Math.max(i - 1, 0)], pts[i], pts[i + 1], pts[Math.min(i + 2, n - 1)], t) : [0, 1, 2].map((q) => pts[i][q] + (pts[i + 1][q] - pts[i][q]) * t)); R.push(lerpR(rr(i), rr(i + 1), t)); }
    P.push(pts[n - 1]); R.push(rr(n - 1)); return { P, R };
  }
  function tube(pts, rad, o) {
    o = o || {}; const seg = o.seg || 8; let P = pts, R = rad; if (o.smooth) { const s = spline(pts, rad, o.smooth); P = s.P; R = s.R; }
    const n = P.length, V = [], Q = [];
    for (let i = 0; i < n; i++) {
      const d = nrm(sub(P[Math.min(i + 1, n - 1)], P[Math.max(i - 1, 0)])), ref = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], a = nrm(cross(d, ref)), b = cross(d, a);
      const r = Array.isArray(R) ? R[Math.min(i, R.length - 1)] : R, rx = Array.isArray(r) ? r[0] : r, rz = Array.isArray(r) ? r[1] : r;
      for (let s = 0; s < seg; s++) { const t = (2 * Math.PI * s) / seg, cs = Math.cos(t) * rx, sn = Math.sin(t) * rz; V.push([P[i][0] + a[0] * cs + b[0] * sn, P[i][1] + a[1] * cs + b[1] * sn, P[i][2] + a[2] * cs + b[2] * sn]); }
    }
    for (let i = 0; i < n - 1; i++) { const cen = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2, (P[i][2] + P[i + 1][2]) / 2]; for (let s = 0; s < seg; s++) Q.push([i * seg + s, i * seg + ((s + 1) % seg), (i + 1) * seg + ((s + 1) % seg), (i + 1) * seg + s, cen]); }
    return { V, Q };
  }
  function merge(ms) {
    const V = [], Q = []; ms.forEach((m) => { const off = V.length; m.V.forEach((v) => V.push(v)); m.Q.forEach((q) => Q.push([q[0] + off, q[1] + off, q[2] + off, q[3] + off, q[4]])); });
    const nv = V.length, nq = Q.length, VF = new Float32Array(nv * 3), QF = new Uint32Array(nq * 4), NF = new Float32Array(nq * 3);
    V.forEach((v, i) => { VF[i * 3] = v[0]; VF[i * 3 + 1] = v[1]; VF[i * 3 + 2] = v[2]; });
    let cx = 0, cy = 0, cz = 0; V.forEach((v) => { cx += v[0]; cy += v[1]; cz += v[2]; }); cx /= nv; cy /= nv; cz /= nv;
    Q.forEach((q, i) => {
      const a = V[q[0]], b = V[q[1]], c = V[q[2]], d = V[q[3]];
      let n = nrm(cross(sub(c, a), sub(d, b))); const qc = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4, (a[2] + b[2] + c[2] + d[2]) / 4];
      if (dot(n, sub(qc, q[4])) < 0) n = [-n[0], -n[1], -n[2]];
      QF[i * 4] = q[0]; QF[i * 4 + 1] = q[1]; QF[i * 4 + 2] = q[2]; QF[i * 4 + 3] = q[3]; NF[i * 3] = n[0]; NF[i * 3 + 1] = n[1]; NF[i * 3 + 2] = n[2];
    });
    return { V: VF, Q: QF, N: NF, nv, nq, cx, cy, cz };
  }

  /* ---------- the body ---------- */
  let BODY = null;
  function buildBody() {
    if (BODY) return BODY;
    const P = [], E = ellipsoid, T = tube;
    const add = (id, sys, part, ms, o) => P.push(Object.assign({ id, sys, part }, merge(ms), o || {}));
    const both = (f) => [1, -1].map(f);

    // SKIN (context silhouette, not a system)
    add('skin', 'skin', 'Body surface', [
      E([0, 0.77, 0.01], [0.095, 0.12, 0.11], { nu: 14, nv: 8 }),
      T([[0, 0.64, 0], [0, 0.7, 0.01]], 0.045, { seg: 10 }),
      T([[0, -0.06, 0], [0, 0.1, 0], [0, 0.28, 0], [0, 0.42, 0], [0, 0.52, 0], [0, 0.6, 0]], [[0.17, 0.1], [0.15, 0.095], [0.155, 0.1], [0.185, 0.11], [0.2, 0.1], [0.1, 0.07]], { seg: 14, smooth: 3 }),
      ...both((s) => T([[s * 0.24, 0.54, 0], [s * 0.33, 0.27, 0], [s * 0.41, 0.02, 0], [s * 0.45, -0.07, 0]], [0.05, 0.04, 0.03, 0.025], { seg: 10, smooth: 3 })),
      ...both((s) => T([[s * 0.09, -0.05, 0], [s * 0.11, -0.47, 0], [s * 0.11, -0.84, 0], [s * 0.11, -0.89, 0.05]], [0.085, 0.055, 0.035, 0.03], { seg: 10, smooth: 3 })),
      E([0, -0.04, 0], [0.17, 0.09, 0.1], { nu: 12, nv: 6 }),
    ]);

    // MUSCULAR (8 groups)
    add('m_chest', 'muscular', 'Chest & shoulders (pectorals, deltoids)', [...both((s) => E([s * 0.09, 0.43, 0.085], [0.095, 0.065, 0.035], { rz: -s * 0.15 })), ...both((s) => E([s * 0.25, 0.52, 0], [0.05, 0.065, 0.05]))], { group: 'chest' });
    add('m_arms', 'muscular', 'Arms (biceps, triceps, forearms)', both((s) => T([[s * 0.26, 0.5, 0.01], [s * 0.31, 0.33, 0.01], [s * 0.34, 0.25, 0], [s * 0.4, 0.04, 0]], [0.036, 0.034, 0.03, 0.02], { seg: 8, smooth: 3 })), { group: 'arms' });
    add('m_core', 'muscular', 'Core (abdominals & obliques)', [...[0.28, 0.2, 0.12, 0.04].flatMap((y) => both((s) => E([s * 0.035, y, 0.1], [0.032, 0.038, 0.02], { nu: 8, nv: 5 }))), ...both((s) => E([s * 0.13, 0.18, 0.06], [0.04, 0.1, 0.05], { nu: 8, nv: 6 }))], { group: 'core' });
    add('m_back', 'muscular', 'Back (trapezius, latissimus, erector spinae)', [...both((s) => E([s * 0.07, 0.55, -0.07], [0.1, 0.07, 0.03])), ...both((s) => E([s * 0.14, 0.33, -0.075], [0.07, 0.15, 0.03])), ...both((s) => T([[s * 0.045, 0.5, -0.085], [s * 0.04, 0.25, -0.09], [s * 0.04, 0, -0.09]], 0.03, { seg: 6 }))], { group: 'back' });
    add('m_glutes', 'muscular', 'Glutes', both((s) => E([s * 0.085, -0.06, -0.085], [0.085, 0.09, 0.07])), { group: 'glutes' });
    add('m_quads', 'muscular', 'Quadriceps', both((s) => T([[s * 0.095, -0.1, 0.04], [s * 0.11, -0.42, 0.035]], [0.075, 0.05], { seg: 8, smooth: 3 })), { group: 'quads' });
    add('m_hams', 'muscular', 'Hamstrings', both((s) => T([[s * 0.095, -0.1, -0.04], [s * 0.11, -0.42, -0.035]], [0.07, 0.045], { seg: 8, smooth: 3 })), { group: 'hams' });
    add('m_calves', 'muscular', 'Calves (gastrocnemius, soleus)', both((s) => T([[s * 0.11, -0.5, -0.02], [s * 0.11, -0.66, -0.025], [s * 0.11, -0.82, -0.01]], [0.045, 0.05, 0.022], { seg: 8, smooth: 3 })), { group: 'calves' });

    // SKELETAL
    add('sk_skull', 'skeletal', 'Skull', [E([0, 0.78, 0.01], [0.075, 0.095, 0.09], { nu: 12, nv: 8 }), E([0, 0.7, 0.045], [0.05, 0.035, 0.045], { nu: 8, nv: 5 })]);
    const vert = []; for (let i = 0; i < 24; i++) { const t = i / 23, y = 0.64 - t * 0.66, z = -0.075 - 0.02 * Math.sin(t * Math.PI * 2.2), s = i < 7 ? 0.016 : i < 19 ? 0.022 : 0.028; vert.push(E([0, y, z], [s, 0.011, s * 0.9], { nu: 6, nv: 4 })); }
    add('sk_spine', 'skeletal', 'Spine (vertebral column)', vert);
    const ribs = [], rw = [0.1, 0.125, 0.145, 0.155, 0.16, 0.158, 0.15, 0.14], rd = [0.06, 0.075, 0.085, 0.09, 0.092, 0.09, 0.085, 0.08];
    for (let i = 0; i < 8; i++) both((s) => { const pts = []; for (let k = 0; k <= 8; k++) { const th = Math.PI * (0.08 + (0.84 * k) / 8); pts.push([s * rw[i] * Math.sin(th), 0.56 - i * 0.045 - 0.04 * (th / Math.PI), -rd[i] * Math.cos(th) - 0.01]); } ribs.push(T(pts, 0.0065, { seg: 5, smooth: 2 })); });
    ribs.push(E([0, 0.43, 0.1], [0.02, 0.09, 0.012], { nu: 6, nv: 5 }));
    add('sk_ribs', 'skeletal', 'Ribcage & sternum', ribs);
    add('sk_girdle', 'skeletal', 'Shoulder girdle', [...both((s) => T([[s * 0.02, 0.57, 0.06], [s * 0.2, 0.56, 0.03]], 0.01, { seg: 5 })), ...both((s) => E([s * 0.13, 0.47, -0.09], [0.07, 0.08, 0.01], { nu: 8, nv: 5 }))]);
    add('sk_pelvis', 'skeletal', 'Pelvis', [...both((s) => E([s * 0.1, 0.0, 0.0], [0.08, 0.07, 0.05], { nu: 8, nv: 5 })), E([0, -0.03, -0.07], [0.04, 0.06, 0.025], { nu: 8, nv: 5 }), E([0, -0.1, 0.05], [0.07, 0.02, 0.02], { nu: 8, nv: 4 })]);
    add('sk_arms', 'skeletal', 'Arm bones', both((s) => T([[s * 0.24, 0.54, 0], [s * 0.32, 0.28, 0], [s * 0.41, 0.03, 0], [s * 0.45, -0.06, 0]], [0.014, 0.011, 0.01, 0.016], { seg: 6, smooth: 3 })));
    add('sk_legs', 'skeletal', 'Leg bones', [...both((s) => T([[s * 0.09, -0.05, 0], [s * 0.11, -0.46, 0]], [0.022, 0.026], { seg: 6, smooth: 3 })), ...both((s) => T([[s * 0.11, -0.48, 0], [s * 0.11, -0.84, 0]], [0.02, 0.016], { seg: 6, smooth: 3 })), ...both((s) => E([s * 0.11, -0.47, 0.03], [0.02, 0.025, 0.015], { nu: 6, nv: 4 })), ...both((s) => E([s * 0.11, -0.89, 0.05], [0.03, 0.02, 0.07], { nu: 6, nv: 4 }))]);

    // DIGESTIVE
    add('esoph', 'digestive', 'Oesophagus', [T([[0, 0.62, 0], [0, 0.5, -0.02], [0.01, 0.36, -0.01], [0.04, 0.28, 0.02]], 0.011, { seg: 6, smooth: 3 })]);
    add('liver', 'digestive', 'Liver', [E([-0.085, 0.26, 0.045], [0.12, 0.055, 0.065], { nu: 12, nv: 7, rz: 0.15 }), E([-0.04, 0.2, 0.07], [0.012, 0.02, 0.012], { nu: 5, nv: 4 })]);
    add('stomach', 'digestive', 'Stomach', [E([0.075, 0.24, 0.05], [0.07, 0.055, 0.05], { nu: 10, nv: 6, rz: -0.5 })]);
    const si = []; for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) { const kk = r % 2 ? 5 - k : k; si.push([-0.085 + kk * 0.034, 0.13 - r * 0.03, 0.05 + 0.01 * Math.sin(r + k)]); }
    add('small_int', 'digestive', 'Small intestine', [T(si, 0.014, { seg: 6, smooth: 3 })]);
    add('large_int', 'digestive', 'Large intestine (colon)', [T([[-0.12, -0.04, 0.04], [-0.125, 0.1, 0.04], [-0.1, 0.17, 0.05], [0, 0.175, 0.06], [0.1, 0.17, 0.05], [0.125, 0.1, 0.04], [0.12, -0.03, 0.04], [0.07, -0.06, 0.03], [0.02, -0.06, 0.03]], 0.019, { seg: 8, smooth: 3 })]);

    // URINARY
    add('kidneys', 'urinary', 'Kidneys', both((s) => E([s * 0.065, 0.2, -0.06], [0.028, 0.05, 0.025], { nu: 8, nv: 6 })));
    add('ureters', 'urinary', 'Ureters', both((s) => T([[s * 0.055, 0.15, -0.055], [s * 0.05, 0.05, -0.03], [s * 0.025, -0.04, 0.02]], 0.0045, { seg: 5, smooth: 3 })));
    add('bladder', 'urinary', 'Bladder', [E([0, -0.06, 0.03], [0.04, 0.035, 0.035], { nu: 8, nv: 6 })]);

    // ENDOCRINE
    add('pituitary', 'endocrine', 'Pituitary', [E([0, 0.755, 0.03], [0.014, 0.011, 0.014], { nu: 6, nv: 4 })]);
    add('thyroid', 'endocrine', 'Thyroid', [...both((s) => E([s * 0.017, 0.61, 0.035], [0.016, 0.026, 0.014], { nu: 6, nv: 5 })), E([0, 0.6, 0.04], [0.016, 0.006, 0.01], { nu: 6, nv: 4 })]);
    add('adrenal', 'endocrine', 'Adrenal glands', both((s) => E([s * 0.065, 0.255, -0.05], [0.03, 0.014, 0.02], { nu: 6, nv: 4 })));
    add('pancreas', 'endocrine', 'Pancreas', [T([[-0.04, 0.22, 0], [0, 0.23, 0.02], [0.07, 0.24, 0]], [0.018, 0.014, 0.01], { seg: 6, smooth: 3 })]);

    // IMMUNE
    add('thymus', 'immune', 'Thymus', [E([0, 0.52, 0.05], [0.035, 0.04, 0.012], { nu: 6, nv: 5 })]);
    add('spleen', 'immune', 'Spleen', [E([0.125, 0.27, -0.04], [0.025, 0.05, 0.03], { nu: 7, nv: 5 })]);
    const nodes = []; [[0.05, 0.63, 0.03], [0.07, 0.66, 0.02], [0.2, 0.5, 0], [0.07, -0.08, 0.05], [0, 0.08, 0.05], [0.04, 0.58, 0.04], [0.09, 0.3, 0.02], [0.17, 0.46, 0.02]].forEach((p) => { nodes.push(E(p, [0.011, 0.011, 0.011], { nu: 5, nv: 4 })); nodes.push(E([-p[0], p[1], p[2]], [0.011, 0.011, 0.011], { nu: 5, nv: 4 })); });
    add('nodes', 'immune', 'Lymph nodes', nodes);
    add('lymph', 'immune', 'Lymphatic vessels', [...both((s) => T([[s * 0.06, -0.08, 0.04], [s * 0.03, 0, 0], [0, 0.12, -0.03], [0, 0.35, -0.04], [s * 0.04, 0.6, 0]], 0.004, { seg: 5, smooth: 3 })), ...both((s) => T([[s * 0.4, 0.05, 0], [s * 0.3, 0.3, 0], [s * 0.2, 0.5, 0], [s * 0.05, 0.6, 0.02]], 0.0035, { seg: 5, smooth: 3 }))]);

    // RESPIRATORY
    add('trachea', 'respiratory', 'Trachea & bronchi', [T([[0, 0.7, 0.03], [0, 0.6, 0.025], [0, 0.52, 0.02]], 0.012, { seg: 8 }), ...both((s) => T([[0, 0.52, 0.02], [s * 0.04, 0.48, 0.02], [s * 0.07, 0.42, 0.0]], 0.009, { seg: 6, smooth: 3 }))]);
    add('lung_r', 'respiratory', 'Right lung', [E([-0.095, 0.42, 0.0], [0.075, 0.13, 0.07], { nu: 12, nv: 8, rz: -0.07 })]);
    add('lung_l', 'respiratory', 'Left lung', [E([0.095, 0.42, 0.0], [0.07, 0.13, 0.07], { nu: 12, nv: 8, rz: 0.07 })]);

    // CARDIOVASCULAR
    add('vessels', 'cardiovascular', 'Peripheral arteries & veins', [
      ...both((s) => T([[s * 0.04, -0.1, 0], [s * 0.09, -0.3, 0.01], [s * 0.11, -0.5, 0], [s * 0.11, -0.8, 0]], [0.01, 0.008, 0.006, 0.005], { seg: 5, smooth: 3 })),
      ...both((s) => T([[s * 0.06, 0.55, 0], [s * 0.2, 0.53, 0], [s * 0.3, 0.3, 0], [s * 0.4, 0.04, 0]], 0.006, { seg: 5, smooth: 3 })),
      ...both((s) => T([[s * 0.02, 0.56, 0.02], [s * 0.03, 0.7, 0.02], [s * 0.035, 0.75, 0.03]], 0.0065, { seg: 5 })),
      ...both((s) => T([[s * 0.075, -0.1, 0.01], [s * 0.12, -0.3, 0.015], [s * 0.125, -0.5, 0.01], [s * 0.12, -0.8, 0.005]], [0.009, 0.007, 0.005, 0.004], { seg: 5, smooth: 3 })),
    ]);
    add('aorta', 'cardiovascular', 'Aorta & great vessels', [T([[0.01, 0.44, 0.04], [0, 0.5, 0.03], [-0.03, 0.53, 0], [-0.04, 0.5, -0.03], [-0.02, 0.35, -0.04], [-0.01, 0.1, -0.03], [0, -0.03, -0.02]], [0.015, 0.014, 0.013, 0.012, 0.011, 0.009, 0.008], { seg: 7, smooth: 3 }), T([[-0.02, 0.44, 0.03], [-0.03, 0.35, 0], [-0.025, 0.1, -0.01], [-0.01, -0.03, 0]], 0.011, { seg: 6, smooth: 2 })]);
    add('heart', 'cardiovascular', 'Heart', [E([0.03, 0.4, 0.045], [0.05, 0.062, 0.045], { nu: 12, nv: 8, rz: -0.45 }), E([-0.02, 0.43, 0.04], [0.03, 0.036, 0.03], { nu: 8, nv: 5 }), E([0.035, 0.45, 0.03], [0.025, 0.025, 0.025], { nu: 8, nv: 5 })], { pulse: true });

    // NERVOUS
    add('brain', 'nervous', 'Brain', [...both((s) => E([s * 0.036, 0.8, 0.0], [0.04, 0.058, 0.074], { nu: 10, nv: 7 })), E([0, 0.75, -0.06], [0.05, 0.025, 0.035], { nu: 8, nv: 5 }), T([[0, 0.76, -0.01], [0, 0.66, -0.03]], 0.013, { seg: 6 })]);
    add('cord', 'nervous', 'Spinal cord', [T([[0, 0.65, -0.045], [0, 0.4, -0.085], [0, 0.1, -0.09], [0, -0.02, -0.085]], 0.007, { seg: 6, smooth: 3 })]);
    add('nerves', 'nervous', 'Peripheral nerves', [...both((s) => T([[0, 0.55, -0.05], [s * 0.24, 0.54, -0.02], [s * 0.34, 0.26, -0.02], [s * 0.42, 0.02, -0.01]], 0.004, { seg: 4, smooth: 3 })), ...both((s) => T([[0, -0.02, -0.08], [s * 0.09, -0.1, -0.03], [s * 0.11, -0.45, -0.03], [s * 0.11, -0.84, 0]], 0.004, { seg: 4, smooth: 3 }))]);

    BODY = P; return P;
  }

  const ORDER = ['skin', 'muscular', 'skeletal', 'digestive', 'urinary', 'endocrine', 'immune', 'respiratory', 'cardiovascular', 'nervous'];
  const STYLE = { skin: [0.05, 0.17], muscular: [0.17, 0.3], skeletal: [0.32, 0.5], digestive: [0.5, 0.72], urinary: [0.58, 0.8], endocrine: [0.65, 0.85], immune: [0.58, 0.8], respiratory: [0.46, 0.72], cardiovascular: [0.6, 0.88], nervous: [0.55, 0.85] };
  const BUCKET_F = [0.5, 0.8, 1.15, 1.6], BUCKET_S = [0.6, 0.85, 1.1, 1.4];
  const LIGHT = nrm([-0.4, 0.6, 0.7]);

  /* ---------- the view ---------- */
  function create(canvas, o) {
    o = o || {};
    const body = buildBody().slice().sort((a, b) => ORDER.indexOf(a.sys) - ORDER.indexOf(b.sys));
    const ctx = canvas.getContext('2d');
    const pick = document.createElement('canvas'), pctx = pick.getContext('2d', { willReadFrequently: true });
    const st = { yaw: o.yaw != null ? o.yaw : 0.45, pitch: 0.04, zoom: o.zoom || 1, auto: o.auto !== false, statuses: {}, selected: null, hover: null, mode: 'status', visible: null, highlight: null, heart: 70, irregular: false, painMode: false, heat: null, scanT: 1, t: 0, regionHover: null, overlay: null, dim: true, regionPick: null };
    let W = 0, H = 0, dpr = 1, dead = false, dirty = true, pickDirty = true, hoverReq = false, last = performance.now(), beatPhase = 0, hold = 0;
    const scr = body.map((p) => ({ sx: new Float32Array(p.nv), sy: new Float32Array(p.nv), sz: new Float32Array(p.nv), front: new Int32Array(p.nq), nf: 0 }));
    const idx = {}; body.forEach((p, i) => { idx[p.id] = i; });

    function resize() { const r = canvas.getBoundingClientRect(); dpr = Math.min(innerWidth < 700 ? 1.5 : 2, window.devicePixelRatio || 1); W = Math.max(50, r.width); H = Math.max(50, r.height); canvas.width = W * dpr; canvas.height = H * dpr; pick.width = W; pick.height = H; dirty = pickDirty = true; }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    const statusColor = (sys) => (st.mode === 'system' ? (AS.D.SYSTEMS.find((s) => s.id === sys) || { hue: '#7fb6d4' }).hue : STATUS[st.statuses[sys] || 'ok'].color);
    const shown = (p) => p.sys === 'skin' || !st.visible || st.visible.has(p.sys);

    function project() {
      const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch), sc = H * 0.5 * st.zoom, D = 4.2, cx0 = W / 2, cy0 = H * 0.5 + (st.zoom > 1.2 ? 0 : 4);
      body.forEach((p, i) => {
        if (!shown(p)) { scr[i].nf = 0; return; }
        const S = scr[i], V = p.V; let k = 1; if (p.pulse) k = 1 + 0.085 * beat();
        for (let v = 0; v < p.nv; v++) {
          let x = V[v * 3], y = V[v * 3 + 1], z = V[v * 3 + 2];
          if (p.pulse) { x = p.cx + (x - p.cx) * k; y = p.cy + (y - p.cy) * k; z = p.cz + (z - p.cz) * k; }
          const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, f = D / (D - z2);
          S.sx[v] = cx0 + x1 * sc * f; S.sy[v] = cy0 - y2 * sc * f; S.sz[v] = z2;
        }
        let nf = 0; const N = p.N;
        for (let q = 0; q < p.nq; q++) { const nx = N[q * 3], ny = N[q * 3 + 1], nz = N[q * 3 + 2], z1 = -nx * sy + nz * cy, z2 = ny * sp + z1 * cp; if (z2 > 0.015 || p.sys === 'skin' && false) S.front[nf++] = q; }
        S.nf = nf;
      });
      st._cp = cp; st._sp = sp; st._cy = cy; st._sy = sy;
    }
    function beat() { const ph = beatPhase % 1; return Math.exp(-ph * 9) * 1 + 0.55 * Math.exp(-Math.pow((ph - 0.22) * 9, 2)) * 0.6; }

    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      project();
      const t = st.t, sc = H * 0.5 * st.zoom;
      // floor rings
      const fy = H * 0.5 + 0.9 * sc * 0.98;
      ctx.save(); ctx.translate(W / 2, fy); ctx.scale(1, 0.22);
      [0.55, 0.78, 1.02].forEach((r, i) => { ctx.beginPath(); ctx.arc(0, 0, sc * r * 0.62, 0, Math.PI * 2); ctx.strokeStyle = `rgba(127,182,212,${0.22 - i * 0.05})`; ctx.setLineDash(i === 1 ? [6, 8] : []); ctx.lineDashOffset = -t * 18 * (i + 1); ctx.lineWidth = 1.4; ctx.stroke(); });
      ctx.restore(); ctx.setLineDash([]);

      const selSys = st.selected, hovSys = st.hover && st.hover.sys;
      body.forEach((p, i) => {
        if (!shown(p)) return; const S = scr[i]; if (!S.nf && p.sys !== 'skin') return;
        const sty = STYLE[p.sys]; let a = 1, col;
        if (p.sys === 'skin') { col = '#7fb6d4'; a = selSys || st.highlight ? 0.6 : 1; }
        else {
          const sstat = st.statuses[p.sys] || 'ok';
          col = st.heat ? mix('#7fb6d4', '#b58bc9', clamp(st.heat[p.sys] || 0, 0, 1)) : statusColor(p.sys);
          const isSel = selSys === p.sys, isHov = hovSys === p.sys;
          a = 0.78; // calm default: all systems visible but none glowing
          if (st.highlight) a = st.highlight.has(p.id) ? 1.6 : 0.1;
          else if (selSys) a = isSel ? 1.6 : isHov ? 0.95 : st.dim ? 0.14 : 0.42;
          else if (hovSys) a = isHov ? 1.55 : 0.55;
          if (!st.heat && !st.highlight && !st.mode_system_hue) { const m = (isSel || isHov) ? 0 : sstat === 'ok' ? 0.5 : 0.28; if (m) col = mix(col, '#a9b8d2', m); }
          if (!st.heat && sstat === 'crit') a *= 1 + 0.09 * Math.sin(t * 4);
        }
        const bk = [[], [], [], []], N = p.N, cy = st._cy, sy = st._sy, cp = st._cp, sp = st._sp;
        const front = S.front;
        for (let f = 0; f < S.nf; f++) { const q = front[f], nx = N[q * 3], ny = N[q * 3 + 1], nz = N[q * 3 + 2]; const x1 = nx * cy + nz * sy, z1 = -nx * sy + nz * cy, y2 = ny * cp - z1 * sp, z2 = ny * sp + z1 * cp; const rim = 1 - z2, dif = Math.max(0, x1 * LIGHT[0] + y2 * LIGHT[1] + z2 * LIGHT[2]); bk[clamp(Math.floor((rim * 0.65 + dif * 0.5) * 3.4), 0, 3)].push(q); }
        const Q = p.Q;
        for (let b = 0; b < 4; b++) {
          const list = bk[b]; if (!list.length) continue; ctx.beginPath();
          for (let l = 0; l < list.length; l++) { const q = list[l] * 4, i0 = Q[q], i1 = Q[q + 1], i2 = Q[q + 2], i3 = Q[q + 3]; ctx.moveTo(S.sx[i0], S.sy[i0]); ctx.lineTo(S.sx[i1], S.sy[i1]); ctx.lineTo(S.sx[i2], S.sy[i2]); ctx.lineTo(S.sx[i3], S.sy[i3]); ctx.closePath(); }
          ctx.fillStyle = rgba(col, Math.min(0.92, sty[0] * a * BUCKET_F[b])); ctx.fill();
          ctx.strokeStyle = rgba(col, Math.min(0.95, sty[1] * a * BUCKET_S[b])); ctx.lineWidth = 0.7; ctx.stroke();
        }
        if (p.sys === 'skin') { // faint back-face wireframe for a see-through hologram feel
          ctx.beginPath(); const fr = new Set(); for (let f = 0; f < S.nf; f++) fr.add(front[f]);
          for (let q = 0; q < p.nq; q += 2) { if (fr.has(q)) continue; const qq = q * 4, i0 = Q[qq], i1 = Q[qq + 1], i2 = Q[qq + 2]; ctx.moveTo(S.sx[i0], S.sy[i0]); ctx.lineTo(S.sx[i1], S.sy[i1]); ctx.lineTo(S.sx[i2], S.sy[i2]); }
          ctx.strokeStyle = 'rgba(127,182,212,.05)'; ctx.stroke();
        } else if (((selSys === p.sys || hovSys === p.sys) && !st.highlight) || (st.highlight && st.highlight.has(p.id))) {
          const strong = selSys === p.sys || st.highlight; ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = strong ? 10 : 5; ctx.strokeStyle = rgba(col, strong ? 0.8 : 0.55); ctx.lineWidth = 0.9; ctx.beginPath();
          for (let f = 0; f < S.nf; f += 2) { const q = front[f] * 4, i0 = Q[q], i1 = Q[q + 1], i2 = Q[q + 2]; ctx.moveTo(S.sx[i0], S.sy[i0]); ctx.lineTo(S.sx[i1], S.sy[i1]); ctx.lineTo(S.sx[i2], S.sy[i2]); }
          ctx.stroke(); ctx.restore();
        }
      });

      // scanning band (idle + triggered)
      const idle = (t % 7) / 7, bandY = (st.scanT < 1 ? st.scanT : idle) * (H * 0.96) + H * 0.02, ba = st.scanT < 1 ? 0.9 : 0.35;
      const gr = ctx.createLinearGradient(0, bandY - 26, 0, bandY + 2); gr.addColorStop(0, 'rgba(127,182,212,0)'); gr.addColorStop(1, `rgba(127,182,212,${0.16 * ba})`);
      ctx.fillStyle = gr; ctx.fillRect(W * 0.15, bandY - 26, W * 0.7, 28); ctx.fillStyle = `rgba(150,200,225,${0.7 * ba})`; ctx.fillRect(W * 0.15, bandY, W * 0.7, 1.2);

      // pain-region anchors
      if (st.painMode) {
        AS.C.REGIONS.forEach((r) => { const s = projPoint(r.p); if (!s.vis) return; const hot = st.regionHover === r.id, pr = 7 + 3 * Math.sin(t * 4 + r.p[1] * 9) + (hot ? 4 : 0);
          ctx.beginPath(); ctx.arc(s.x, s.y, pr, 0, 7); ctx.strokeStyle = hot ? '#fff' : 'rgba(227,179,79,.95)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 7); ctx.fillStyle = hot ? '#fff' : '#e3b34f'; ctx.fill();
          if (hot) { ctx.font = '600 11px Inter, system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(r.label, s.x, s.y - 14); } });
      }
      if (st.overlay) st.overlay(ctx, api, t, W, H);
    }
    function projPoint(p) { const x1 = p[0] * st._cy + p[2] * st._sy, z1 = -p[0] * st._sy + p[2] * st._cy, y2 = p[1] * st._cp - z1 * st._sp, z2 = p[1] * st._sp + z1 * st._cp, sc = H * 0.5 * st.zoom, f = 4.2 / (4.2 - z2); return { x: W / 2 + x1 * sc * f, y: H * 0.5 - y2 * sc * f + 4, z: z2, vis: z2 > -0.05 }; }

    function drawPick() {
      project(); pctx.clearRect(0, 0, W, H); pctx.imageSmoothingEnabled = false;
      body.forEach((p, i) => { if (p.sys === 'skin' || !shown(p)) return; const S = scr[i], Q = p.Q; pctx.beginPath(); for (let f = 0; f < S.nf; f++) { const q = S.front[f] * 4, i0 = Q[q], i1 = Q[q + 1], i2 = Q[q + 2], i3 = Q[q + 3]; pctx.moveTo(S.sx[i0], S.sy[i0]); pctx.lineTo(S.sx[i1], S.sy[i1]); pctx.lineTo(S.sx[i2], S.sy[i2]); pctx.lineTo(S.sx[i3], S.sy[i3]); pctx.closePath(); } pctx.fillStyle = `rgb(${(i + 1) * 5},0,0)`; pctx.fill(); });
      pickDirty = false;
    }
    function pickAt(x, y) {
      if (pickDirty) drawPick();
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const px = Math.round(x + dx), py = Math.round(y + dy); if (px < 0 || py < 0 || px >= W || py >= H) continue; const d = pctx.getImageData(px, py, 1, 1).data; if (d[3] === 255 && d[0] % 5 === 0 && d[0] > 0) return body[d[0] / 5 - 1]; }
      return null;
    }
    function regionAt(x, y) { let best = null, bd = 18; AS.C.REGIONS.forEach((r) => { const s = projPoint(r.p); if (!s.vis) return; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = r; } }); return best; }

    // pointer interaction
    let down = null, moved = 0;
    const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, id: e.pointerId, touch: e.pointerType === 'touch' }; moved = 0; try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* */ } hold = 3; });
    canvas.addEventListener('pointermove', (e) => {
      const [x, y] = local(e);
      if (down && down.id === e.pointerId) { const dx = e.clientX - down.x, dy = e.clientY - down.y; moved = Math.max(moved, Math.hypot(dx, dy)); if (moved > 4) { st.yaw = down.yaw + dx * 0.01; if (!down.touch) st.pitch = clamp(down.pitch + dy * 0.005, -0.5, 0.5); pickDirty = true; } return; }
      if (hoverReq) return; hoverReq = true;
      requestAnimationFrame(() => {
        hoverReq = false; if (dead) return;
        if (st.painMode) { const r = regionAt(x, y); st.regionHover = r ? r.id : null; canvas.style.cursor = r ? 'pointer' : 'grab'; if (o.onHover) o.onHover(null, e.clientX, e.clientY, r); return; }
        const p = pickAt(x, y); const nh = p && p.sys !== 'skin' ? p : null; if ((nh && nh.id) !== (st.hover && st.hover.id)) { st.hover = nh; } canvas.style.cursor = nh ? 'pointer' : 'grab'; if (o.onHover) o.onHover(nh, e.clientX, e.clientY);
      });
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!down) return; const wasDrag = moved > 5, [x, y] = local(e); down = null; hold = 2;
      if (wasDrag) return;
      if (st.painMode) { const r = regionAt(x, y); if (r && o.onRegion) o.onRegion(r); return; }
      const p = pickAt(x, y); if (p && p.sys !== 'skin') { if (o.onSelect) o.onSelect(p.sys, p); } else if (o.onSelect && o.deselectOnEmpty) o.onSelect(null, null);
    });
    canvas.addEventListener('pointerleave', () => { st.hover = null; st.regionHover = null; if (o.onHover) o.onHover(null); });
    canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { st.yaw -= 0.15; pickDirty = true; } else if (e.key === 'ArrowRight') { st.yaw += 0.15; pickDirty = true; } else if (e.key === '+' || e.key === '=') api.zoomBy(0.1); else if (e.key === '-') api.zoomBy(-0.1); });
    canvas.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); api.zoomBy(-e.deltaY * 0.002); } }, { passive: false });

    function frame(now) {
      if (dead || !canvas.isConnected) { dead = true; ro.disconnect(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!document.hidden && canvas.offsetParent !== null) {
        st.t += dt; beatPhase += dt * (st.heart / 60) * (st.irregular ? 0.75 + 0.5 * Math.abs(Math.sin(st.t * 2.3 + Math.sin(st.t * 5.1) * 2)) : 1);
        if (st.auto && !down && !(st.hover) && !st.selected && !st.painMode && hold <= 0) { st.yaw += dt * 0.28; pickDirty = true; } if (hold > 0) hold -= dt;
        if (st.scanT < 1) st.scanT = Math.min(1, st.scanT + dt / 1.8);
        draw(now);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    const api = {
      state: st,
      setStatuses(s) { st.statuses = s; },
      setSelected(id) { st.selected = id || null; st.highlight = null; },
      setMode(m) { st.mode = m; },
      setVisible(set) { st.visible = set ? new Set(set) : null; pickDirty = true; },
      setHighlight(ids) { st.highlight = ids ? new Set(ids) : null; },
      setHeart(bpm, irregular) { st.heart = clamp(bpm || 70, 30, 200); st.irregular = !!irregular; },
      setPainMode(on) { st.painMode = !!on; st.regionHover = null; canvas.style.cursor = on ? 'grab' : ''; },
      setAuto(on) { st.auto = !!on; },
      setHeat(h) { st.heat = h; },
      setOverlay(f) { st.overlay = f; },
      setDim(b) { st.dim = b; },
      setYaw(y) { st.yaw = y; pickDirty = true; },
      rotateBy(d) { st.yaw += d; pickDirty = true; },
      zoomBy(d) { st.zoom = clamp(st.zoom + d, 0.7, 2.4); pickDirty = true; },
      reset() { st.yaw = 0.45; st.pitch = 0.04; st.zoom = 1; pickDirty = true; },
      scan() { st.scanT = 0; },
      partCenter(id) { const i = idx[id]; if (i == null) return null; const S = scr[i], p = body[i]; let x = 0, y = 0, n = 0; for (let v = 0; v < p.nv; v++) { x += S.sx[v]; y += S.sy[v]; n++; } return n ? { x: x / n, y: y / n } : null; },
      sysCenter(sys) { let x = 0, y = 0, n = 0; body.forEach((p, i) => { if (p.sys !== sys) return; const c = api.partCenter(p.id); if (c) { x += c.x; y += c.y; n++; } }); return n ? { x: x / n, y: y / n } : null; },
      parts: () => body.filter((p) => p.sys !== 'skin').map((p) => ({ id: p.id, sys: p.sys, part: p.part, group: p.group })),
      scale: () => H * 0.5 * st.zoom, size: () => ({ W, H }),
      destroy() { dead = true; ro.disconnect(); },
    };
    return api;
  }

  AS.Anatomy = { create, ORDER };
})();
