/* BeaconCare – 2D animated exercise demonstrations (lightweight SVG, no video).
   A small side-view skeleton is posed with forward/inverse kinematics each frame.
   Demonstrations teach the movement pattern only; on orbit the load, volume and hardware come from the
   crew's approved exercise prescription (ARED / CEVIS / T2 with restraints), not from this page. */
(function () {
  const AS = (window.AS = window.AS || {});
  const { esc } = AS.U;
  const R = Math.PI / 180;
  const L = { torso: 44, thigh: 36, shin: 34, foot: 13, uarm: 24, farm: 22, neck: 20 };
  const FLOOR = 170;

  const pt = (o, len, deg) => [o[0] + len * Math.cos(deg * R), o[1] + len * Math.sin(deg * R)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 0.5 - 0.5 * Math.cos(2 * Math.PI * t); // 0→1→0 over a loop
  function ik(a, b, l1, l2, bend) {
    let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.5), l1 + l2 - 0.01);
    const base = Math.atan2(dy, dx), A = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
    return [a[0] + l1 * Math.cos(base + bend * A), a[1] + l1 * Math.sin(base + bend * A)];
  }
  /* body from hip + absolute segment directions (degrees, screen space: 0 = right, -90 = up) */
  function build(o) {
    const j = { hip: o.hip };
    j.knee = pt(o.hip, L.thigh, o.thigh); j.ankle = pt(j.knee, L.shin, o.shin); j.toe = pt(j.ankle, L.foot, o.foot != null ? o.foot : 0);
    j.sh = pt(o.hip, L.torso, o.torso); j.elb = pt(j.sh, L.uarm, o.uarm); j.wri = pt(j.elb, L.farm, o.farm);
    j.head = pt(j.sh, L.neck, o.neck != null ? o.neck : o.torso);
    if (o.thigh2 != null) { j.knee2 = pt(o.hip, L.thigh, o.thigh2); j.ankle2 = pt(j.knee2, L.shin, o.shin2); j.toe2 = pt(j.ankle2, L.foot, o.foot2 != null ? o.foot2 : 0); }
    if (o.uarm2 != null) { j.elb2 = pt(j.sh, L.uarm, o.uarm2); j.wri2 = pt(j.elb2, L.farm, o.farm2); }
    j.dir = { thigh: o.thigh, shin: o.shin, torso: o.torso, uarm: o.uarm, farm: o.farm };
    return j;
  }
  const anchored = (A, shinUp, thighUp) => { const knee = pt(A, L.shin, shinUp); return { knee, hip: pt(knee, L.thigh, thighUp) }; };

  /* ---------- exercise definitions ---------- */
  const E = {};
  E.squat = {
    period: 4.2, targets: ['quads', 'glutes', 'hams', 'core'],
    cues: [[0, 0.46, 'Lowering – knees track over toes, chest up'], [0.46, 0.56, 'Bottom – hold briefly'], [0.56, 1, 'Driving up through the whole foot']],
    steps: ['Stand with feet about shoulder-width apart, toes slightly out, core braced.', 'Breathe in, push hips back and bend the knees together, keeping your chest up.', 'Lower until thighs are about parallel to the floor, or as far as you can with good form.', 'Drive through the whole foot to stand tall, breathing out.'],
    safety: ['Keep knees in line with toes – do not let them cave inward.', 'Keep your back neutral; stop the set if form breaks down.', 'On orbit the load comes from ARED with a shoulder harness: follow the device set-up checklist.'],
  };
  E.squat.pose = function (t) {
    const p = ease(t), A = [165, FLOOR - 4], shinUp = -90 + 38 * p, thighUp = -90 - 78 * p, knee = pt(A, L.shin, shinUp), hip = pt(knee, L.thigh, thighUp);
    const j = build({ hip, thigh: thighUp + 180, shin: shinUp + 180, torso: -90 + 40 * p, uarm: -3, farm: -3, foot: 0 }); j.ankle = A; j.knee = knee; j.toe = pt(A, L.foot, 0); return j;
  };
  E.deadlift = {
    period: 4.6, targets: ['back', 'glutes', 'hams', 'core'],
    cues: [[0, 0.46, 'Hinge – hips travel back, bar slides down the legs'], [0.46, 0.56, 'Bar below the knee – back flat'], [0.56, 1, 'Drive hips forward to stand tall']],
    steps: ['Stand with the bar over the middle of your feet, hands just outside the legs.', 'Brace the core, push the hips back and lower the bar along your legs with a flat back.', 'Pause when the bar is below the knee – do not round the spine.', 'Push the floor away and drive the hips forward until you are standing tall.'],
    safety: ['Never round the lower back; reduce the load if you cannot keep it flat.', 'Keep the bar close to the body throughout.', 'Use the restraint/harness configuration from your ARED checklist.'],
    pose(t) { const p = ease(t), A = [150, FLOOR - 4], shinUp = -88 + 8 * p, thighUp = -90 - 40 * p, knee = pt(A, L.shin, shinUp), hip = pt(knee, L.thigh, thighUp);
      const j = build({ hip, thigh: thighUp + 180, shin: shinUp + 180, torso: -90 + 62 * p, uarm: 90, farm: 90, foot: 0, neck: -90 + 40 * p }); j.ankle = A; j.knee = knee; j.toe = pt(A, L.foot, 0); j.eq = [{ c: j.wri, r: 9, bar: true }]; return j; },
  };
  E.heel = {
    period: 3.0, targets: ['calves'],
    cues: [[0, 0.45, 'Rise onto the balls of the feet'], [0.45, 0.58, 'Top – squeeze the calves'], [0.58, 1, 'Lower slowly with control']],
    steps: ['Stand tall with the balls of your feet on the platform and heels free.', 'Rise as high as possible onto your toes.', 'Hold for one second and squeeze the calf muscles.', 'Lower slowly until the heels are just below the platform edge.'],
    safety: ['Keep knees soft but not bent; avoid bouncing at the bottom.', 'Hold a rail for balance if needed.', 'Calf muscles lose strength fastest in microgravity – do not skip this exercise.'],
    pose(t) { const p = ease(t), T = [165, FLOOR - 4], ank = pt(T, L.foot + 3, 180 + 64 * p), hip = [ank[0], ank[1] - L.shin - L.thigh];
      const j = build({ hip, thigh: 90, shin: 90, torso: -90, uarm: 92, farm: 90, foot: 0 }); j.ankle = ank; j.toe = T; j.knee = [ank[0], ank[1] - L.shin]; return j; },
  };
  E.press = {
    period: 4.0, targets: ['chest', 'arms', 'core'],
    cues: [[0, 0.46, 'Press overhead – ribs down, glutes tight'], [0.46, 0.56, 'Lock out – arms by the ears'], [0.56, 1, 'Lower back to shoulder height']],
    steps: ['Stand tall with the load at shoulder height, elbows slightly in front.', 'Brace the core and squeeze the glutes.', 'Press straight overhead until the arms are fully extended.', 'Lower under control to shoulder height.'],
    safety: ['Do not lean back or arch the lower back.', 'Keep wrists stacked over elbows.', 'Choose a load you can control for every repetition.'],
    pose(t) { const p = ease(t), j = build({ hip: [160, FLOOR - 4 - L.shin - L.thigh], thigh: 90, shin: 90, torso: -90, uarm: lerp(72, -88, p), farm: lerp(-82, -90, p), foot: 0, neck: -90 }); j.eq = [{ c: j.wri, r: 8, bar: true }]; return j; },
  };
  E.row = {
    period: 3.6, targets: ['back', 'arms'],
    cues: [[0, 0.46, 'Pull the elbows back, squeeze the shoulder blades'], [0.46, 0.56, 'Hands at the chest – hold'], [0.56, 1, 'Return slowly with control']],
    steps: ['Sit tall with legs extended and the band looped around the feet.', 'Start with arms straight and shoulders relaxed.', 'Pull the elbows back, drawing the shoulder blades together.', 'Return slowly to the start without slumping forward.'],
    safety: ['Keep the chest tall – do not lean back to pull.', 'Check the band for nicks or wear before use.', 'Anchor the band firmly; on orbit use the approved attachment points.'],
    pose(t) { const p = ease(t), j = build({ hip: [110, FLOOR - 9], thigh: 0, shin: 0, foot: -78, torso: lerp(-82, -97, p), uarm: lerp(-4, 150, p), farm: lerp(-4, -25, p), neck: -90 }); j.band = [j.toe, j.wri]; return j; },
  };
  E.pushup = {
    period: 4.0, targets: ['chest', 'arms', 'core'], ground: true,
    cues: [[0, 0.46, 'Lower the chest – body stays in one line'], [0.46, 0.56, 'Chest near the floor'], [0.56, 1, 'Press the floor away']],
    steps: ['Start on hands and knees, hands under the shoulders, body in a straight line from head to knees.', 'Brace the core and lower the chest toward the floor, elbows about 45° from the body.', 'Pause just above the floor.', 'Press up until the arms are straight, keeping the hips in line.'],
    safety: ['Modified (knee) push-up shown – progress only when form stays perfect.', 'Do not let the hips sag or pike.', 'In microgravity a harness or foot restraint provides the counter-force: use the approved set-up.'],
    pose(t) { const p = ease(t), K = [95, FLOOR - 3], W = [165, FLOOR - 3], sy = 122 + 30 * p, S = [K[0] + Math.sqrt(6400 - Math.pow(FLOOR - 3 - sy, 2)), sy];
      const u = [(K[0] - S[0]) / 80, (K[1] - S[1]) / 80], hip = [S[0] + L.torso * u[0], S[1] + L.torso * u[1]], tdeg = Math.atan2(S[1] - hip[1], S[0] - hip[0]) / R;
      const elb = ik(S, W, L.uarm, L.farm, -1), j = build({ hip, thigh: Math.atan2(K[1] - hip[1], K[0] - hip[0]) / R, shin: -160, foot: -160, torso: tdeg, uarm: 90, farm: 90, neck: tdeg - 12 });
      j.knee = K; j.ankle = pt(K, L.shin, -160); j.toe = pt(j.ankle, L.foot, -150); j.sh = S; j.elb = elb; j.wri = W; j.head = pt(S, L.neck, tdeg - 12); j.hip = hip; return j; },
  };
  E.plank = {
    period: 5.0, targets: ['core', 'back', 'chest'], hold: 45, ground: true,
    cues: [[0, 1, 'Hold – ribs down, glutes tight, breathe steadily']],
    steps: ['Place forearms on the floor, elbows directly under the shoulders.', 'Extend the legs behind you, balanced on the toes.', 'Brace the abdominals and squeeze the glutes so the body forms one straight line.', 'Hold, breathing steadily. Stop if the lower back sags.'],
    safety: ['Never let the hips sag or lift above the shoulder line.', 'Stop the hold when form breaks – quality beats duration.', 'On orbit use foot restraints / a harness as set out in your core-stability prescription.'],
    pose(t) { const sway = Math.sin(t * 2 * Math.PI) * 1.2, E0 = [170, FLOOR - 3], S = [170, FLOOR - 3 - L.uarm + sway * 0.5], ank = [58, FLOOR - 7], dx = ank[0] - S[0], dy = ank[1] - S[1], dd = Math.hypot(dx, dy), u = [dx / dd, dy / dd];
      const hip = [S[0] + L.torso * u[0], S[1] + L.torso * u[1] + sway * 0.4], knee = [S[0] + (L.torso + L.thigh) * u[0], S[1] + (L.torso + L.thigh) * u[1]], tdeg = Math.atan2(S[1] - hip[1], S[0] - hip[0]) / R;
      const j = build({ hip, thigh: 180, shin: 180, torso: tdeg, uarm: 90, farm: 0, foot: -80, neck: tdeg - 6 }); j.knee = knee; j.ankle = [knee[0] + u[0] * 28, knee[1] + u[1] * 28]; j.toe = pt(j.ankle, L.foot, -95); j.sh = S; j.elb = E0; j.wri = [E0[0] + L.farm, E0[1]]; j.head = pt(S, L.neck, tdeg - 6); return j; },
  };
  E.bicep = {
    period: 3.6, targets: ['arms'],
    cues: [[0, 0.46, 'Curl – elbows stay pinned to the sides'], [0.46, 0.56, 'Top – squeeze the biceps'], [0.56, 1, 'Lower slowly to full extension']],
    steps: ['Stand on the middle of the band, holding the handles with palms forward.', 'Keep the upper arms still against your sides.', 'Curl the hands toward the shoulders until the elbows are fully bent.', 'Lower slowly until the arms are straight again.'],
    safety: ['Do not swing the torso – reduce the band tension if you have to.', 'Inspect the band before every session.', 'Keep wrists straight, not bent back.'],
    pose(t) { const p = ease(t), j = build({ hip: [160, FLOOR - 4 - L.shin - L.thigh], thigh: 90, shin: 90, torso: -90, uarm: 92, farm: lerp(88, -72, p), foot: 0, neck: -90 }); j.band = [[150, FLOOR - 2], j.wri]; return j; },
  };
  E.core = {
    period: 5.6, targets: ['core', 'back'], ground: true,
    cues: [[0, 0.5, 'Opposite arm and leg lower – lower back stays flat'], [0.5, 1, 'Switch sides, slowly and with control']],
    steps: ['Lie on your back with arms pointing to the ceiling and knees bent over the hips.', 'Press the lower back gently into the floor.', 'Slowly lower the right arm overhead and the left leg toward the floor.', 'Return to the start and repeat on the other side.'],
    safety: ['Move only as far as the lower back stays flat on the floor.', 'Breathe out as the limbs extend.', 'On orbit use the restraint/harness set-up from your core circuit.'],
    pose(t) { const a = Math.max(0, Math.sin(2 * Math.PI * t)), b = Math.max(0, -Math.sin(2 * Math.PI * t));
      return build({ hip: [190, FLOOR - 7], thigh: -90 + 78 * b, shin: lerp(0, -8, b), foot: 0, thigh2: -90 + 78 * a, shin2: lerp(0, -8, a), foot2: 0, torso: 180, neck: 180, uarm: -90 - 90 * a, farm: -90 - 90 * a, uarm2: -90 - 90 * b, farm2: -90 - 90 * b }); },
  };
  E.tread = {
    period: 1.0, targets: ['quads', 'hams', 'calves', 'glutes'], run: true,
    cues: [[0, 1, 'Light, quick steps – harness keeps you on the belt']],
    steps: ['Fasten the harness and bungee system so you are loaded evenly.', 'Start at a walking pace and raise speed in the planned intervals.', 'Land softly under the hips with a slight forward lean.', 'Cool down with a slow walk before releasing the harness.'],
    safety: ['Check harness and bungee tension before starting.', 'Stop immediately if you feel chest pain, dizziness or unusual breathlessness.', 'Speed, load and duration come from your exercise prescription.'],
    pose(t) { const ph = t * 2 * Math.PI, leg = (q) => { const th = 90 - 38 * Math.sin(ph + q), flex = 12 + 80 * (0.5 + 0.5 * Math.cos(ph + q - 0.6)); return [th, th + flex]; }, n = leg(0), f = leg(Math.PI);
      let j = build({ hip: [160, 0], thigh: n[0], shin: n[1], foot: 0, thigh2: f[0], shin2: f[1], foot2: 0, torso: -80, uarm: 90 + 38 * Math.sin(ph), farm: 20 + 38 * Math.sin(ph), uarm2: 90 - 38 * Math.sin(ph), farm2: 20 - 38 * Math.sin(ph), neck: -78 });
      const low = Math.max(j.ankle[1], j.ankle2[1]), off = FLOOR - 6 - low; Object.keys(j).forEach((k) => { if (Array.isArray(j[k])) j[k] = [j[k][0], j[k][1] + off]; }); j.belt = t; return j; },
  };
  E.cycle = {
    period: 2.0, targets: ['quads', 'calves', 'glutes'], bike: true,
    cues: [[0, 1, 'Smooth circles – drive the pedal around, do not stomp']],
    steps: ['Adjust the saddle so the knee is slightly bent at the bottom of the stroke.', 'Strap the feet into the pedals and hold the handles lightly.', 'Pedal in smooth circles at the prescribed cadence.', 'Follow the planned intervals and finish with an easy spin.'],
    safety: ['Check foot straps and the vibration-isolation mount.', 'Keep shoulders relaxed and wrists neutral.', 'Intensity targets come from your exercise prescription (heart-rate guided).'],
    pose(t) { const ph = t * 2 * Math.PI, C = [196, 140], r = 19, hip = [112, 108], P1 = [C[0] + r * Math.cos(ph), C[1] + r * Math.sin(ph)], P2 = [C[0] - r * Math.cos(ph), C[1] - r * Math.sin(ph)];
      const k1 = ik(hip, P1, L.thigh, L.shin, -1), k2 = ik(hip, P2, L.thigh, L.shin, -1), d = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / R, torso = -52, sh = pt(hip, L.torso, torso), H = [176, 86], e = ik(sh, H, L.uarm, L.farm, 1);
      const j = build({ hip, thigh: d(hip, k1), shin: d(k1, P1), foot: 5, thigh2: d(hip, k2), shin2: d(k2, P2), foot2: 5, torso, uarm: d(sh, e), farm: d(e, H), neck: -45 });
      j.crank = { C, r, P1, P2 }; return j; },
  };

  AS.Exercise = { defs: E };

  /* ---------- renderer ---------- */
  const SEG = (j, a, b) => `<line x1="${j[a][0].toFixed(1)}" y1="${j[a][1].toFixed(1)}" x2="${j[b][0].toFixed(1)}" y2="${j[b][1].toFixed(1)}"`;
  const norm = (a, b, sign) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [sign * dy / d, -sign * dx / d]; };
  function highlights(j, targets) {
    const out = [], hl = (a, b, k, sign, w) => { const n = norm(a, b, sign); out.push(`<line class="hl" x1="${(a[0] + n[0] * k).toFixed(1)}" y1="${(a[1] + n[1] * k).toFixed(1)}" x2="${(b[0] + n[0] * k).toFixed(1)}" y2="${(b[1] + n[1] * k).toFixed(1)}" stroke-width="${w || 9}"/>`); }, mid = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    const has = (g) => targets.includes(g);
    if (has('quads')) hl(j.hip, j.knee, 3.5, 1, 9);
    if (has('hams')) hl(j.hip, j.knee, 3.5, -1, 9);
    if (has('calves')) hl(j.knee, j.ankle, 3.2, -1, 8);
    if (has('glutes')) out.push(`<circle class="hl2" cx="${(j.hip[0]).toFixed(1)}" cy="${(j.hip[1]).toFixed(1)}" r="9"/>`);
    if (has('core')) hl(j.hip, mid(j.hip, j.sh, 0.62), 3.5, -1, 10);
    if (has('back')) hl(j.hip, j.sh, 3.5, 1, 9);
    if (has('chest')) { hl(mid(j.hip, j.sh, 0.45), j.sh, 3.5, -1, 9); out.push(`<circle class="hl2" cx="${j.sh[0].toFixed(1)}" cy="${j.sh[1].toFixed(1)}" r="7.5"/>`); }
    if (has('arms')) { hl(j.sh, j.elb, 3, -1, 8); hl(j.elb, j.wri, 3, -1, 7); }
    return out.join('');
  }
  function figure(j, def) {
    const eq = [];
    if (def.run) { const off = (j.belt * 60) % 24; eq.push(`<rect class="eq-belt" x="40" y="${FLOOR - 1}" width="240" height="7" rx="3"/>`); for (let x = 50 - off; x < 280; x += 24) if (x > 40) eq.push(`<line class="eq-tick" x1="${x}" y1="${FLOOR + 2}" x2="${x + 8}" y2="${FLOOR + 2}"/>`); }
    else if (def.bike && j.crank) { const c = j.crank; eq.push(`<circle class="eq" cx="${c.C[0]}" cy="${c.C[1]}" r="${c.r}" fill="none"/><line class="eq" x1="${c.C[0]}" y1="${c.C[1]}" x2="${c.C[0]}" y2="${FLOOR}"/><line class="eq" x1="${c.C[0]}" y1="${c.C[1]}" x2="${j.hip[0]}" y2="${j.hip[1] + 6}"/><line class="eq" x1="${j.hip[0] - 14}" y1="${j.hip[1] + 7}" x2="${j.hip[0] + 8}" y2="${j.hip[1] + 7}" stroke-width="4"/><line class="eq" x1="${c.C[0]}" y1="${c.C[1]}" x2="176" y2="86"/><line class="eq" x1="170" y1="86" x2="182" y2="86" stroke-width="3"/><line class="eq" x1="70" y1="${FLOOR}" x2="250" y2="${FLOOR}" stroke-width="3"/>`); }
    else eq.push(`<line class="eq-floor" x1="20" y1="${FLOOR + 2}" x2="300" y2="${FLOOR + 2}"/>`);
    if (def.hold) eq.push(`<line class="eq-floor" x1="20" y1="${FLOOR + 2}" x2="300" y2="${FLOOR + 2}"/>`);
    if (j.band) eq.push(`<line class="band" x1="${j.band[0][0].toFixed(1)}" y1="${j.band[0][1].toFixed(1)}" x2="${j.band[1][0].toFixed(1)}" y2="${j.band[1][1].toFixed(1)}"/>`);
    (j.eq || []).forEach((e) => { if (e.bar) eq.push(`<line class="bar" x1="${e.c[0] - 15}" y1="${e.c[1]}" x2="${e.c[0] + 15}" y2="${e.c[1]}"/><circle class="plate" cx="${e.c[0]}" cy="${e.c[1]}" r="${e.r}"/>`); });
    const far = [];
    if (j.knee2) far.push(`${SEG(j, 'hip', 'knee2')}/>`, `${SEG(j, 'knee2', 'ankle2')}/>`, `${SEG(j, 'ankle2', 'toe2')}/>`);
    if (j.elb2) far.push(`${SEG(j, 'sh', 'elb2')}/>`, `${SEG(j, 'elb2', 'wri2')}/>`);
    const near = [`${SEG(j, 'hip', 'knee')}/>`, `${SEG(j, 'knee', 'ankle')}/>`, `${SEG(j, 'ankle', 'toe')}/>`, `${SEG(j, 'hip', 'sh')} class="tor"/>`, `${SEG(j, 'sh', 'elb')}/>`, `${SEG(j, 'elb', 'wri')}/>`];
    return `<g>${eq.join('')}</g><g class="hlg">${highlights(j, def._targets)}</g><g class="far">${far.join('')}</g><g class="body">${near.join('')}<circle class="head" cx="${j.head[0].toFixed(1)}" cy="${j.head[1].toFixed(1)}" r="9"/></g>`;
  }

  function open(id) {
    const ex = AS.C.EXERCISES.find((x) => x.id === id), def = E[id]; if (!ex || !def) return;
    def._targets = def.targets;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let playing = !reduced, speed = 1, time = 0, raf = 0, last = 0, repsT = 0;
    const md = AS.UI.modal({ title: ex.name, wide: true, onClose() { cancelAnimationFrame(raf); } });
    const tgt = ex.rep || ex.rx;
    md.set(`<div class="exdemo">
      <div class="exfig"><svg id="exsvg" viewBox="0 0 320 190" role="img" aria-label="Animated demonstration of ${esc(ex.name)}"></svg>
        <div class="excue" id="excue" aria-live="polite"></div></div>
      <div class="excontrols">
        <button class="btn primary" data-xa="play" aria-pressed="${playing}">${playing ? 'Pause' : 'Play'}</button>
        <button class="btn" data-xa="replay">Replay</button>
        <div class="seg" role="group" aria-label="Animation speed">${[0.5, 1, 1.5].map((s) => `<button class="${s === 1 ? 'on' : ''}" data-xa="speed" data-s="${s}">${s}×</button>`).join('')}</div>
        <span class="exrep" id="exrep"></span>
      </div>
      <div class="exinfo2">
        <div><h5>Muscles worked</h5><div class="chips">${def.targets.map((g) => `<span class="chip hlchip">${esc(AS.C.GROUPS[g] || g)}</span>`).join('')}</div>
          <p class="muted sm">The highlighted areas on the figure show where the work happens.</p>
          <h5>Purpose</h5><p class="sm">${esc(ex.purpose)}</p>
          <h5>Prescription (demonstration)</h5><p class="sm">${esc(ex.rx)} · about ${ex.min} min · ${esc(ex.device)}</p></div>
        <div><h5>How to do it</h5><ol class="steps">${def.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
      </div>
      <details open><summary>Safety precautions</summary><ul class="bul">${def.safety.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>
      <div class="note-box">${AS.UI.icon('info', 15)} <span>This animation teaches the movement pattern in an Earth-gravity pose. It is <b>not</b> an exercise prescription: in microgravity the load, volume and hardware (ARED, T2 treadmill, CEVIS, bands, harness) come from your approved crew exercise protocol.</span></div>
      <div class="m-foot"><button class="btn" data-xa="log">Log this session</button><button class="btn" data-close>Close</button></div></div>`);
    const svg = md.body.querySelector('#exsvg'), cue = md.body.querySelector('#excue'), rep = md.body.querySelector('#exrep'), bplay = md.body.querySelector('[data-xa=play]');
    function frame() {
      const t = def.hold ? (time / def.period) % 1 : (time / def.period) % 1, j = def.pose(t);
      svg.innerHTML = figure(j, def);
      const c = def.cues.find((q) => t >= q[0] && t < q[1]) || def.cues[0]; cue.textContent = c[2];
      if (def.hold) { const left = Math.max(0, def.hold - Math.floor(time)); rep.textContent = `Hold ${Math.min(def.hold, Math.floor(time))} / ${def.hold} s`; }
      else rep.textContent = `Repetition ${Math.floor(time / def.period) + 1}`;
    }
    function loop(ts) { if (!last) last = ts; const dt = Math.min(0.05, (ts - last) / 1000); last = ts; if (playing) time += dt * speed; frame(); raf = requestAnimationFrame(loop); }
    frame(); if (!reduced) raf = requestAnimationFrame(loop); else { raf = requestAnimationFrame(loop); }
    md.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-xa]'); if (!b) return; const a = b.dataset.xa;
      if (a === 'play') { playing = !playing; b.textContent = playing ? 'Pause' : 'Play'; b.setAttribute('aria-pressed', playing); last = 0; }
      if (a === 'replay') { time = 0; playing = true; bplay.textContent = 'Pause'; last = 0; }
      if (a === 'speed') { speed = +b.dataset.s; md.body.querySelectorAll('[data-xa=speed]').forEach((x) => x.classList.toggle('on', x === b)); }
      if (a === 'log') { AS.Engine.logExercise(ex.id); AS.UI.toast({ sev: 'info', title: 'Session logged', body: `${ex.name} (+${ex.min} min) added to today’s exercise record.` }); }
    });
  }
  AS.Exercise.svgAt = (id, t) => { const d = E[id]; d._targets = d.targets; return figure(d.pose(t), d); };
  AS.Exercise.open = open;
  AS.act['ex-demo'] = (t) => open(t.dataset.id);
})();
