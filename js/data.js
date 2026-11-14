/* BeaconCare – metric definitions, body systems and the three DEMONSTRATION scenarios.
   ALL scenario data below is synthetic (seeded pseudo-random) and is labelled as such in the UI. */
(function () {
  const AS = (window.AS = window.AS || {});
  const { clamp, mulberry32 } = AS.U;
  const ramp = (d, a, b) => clamp((d - a) / (b - a), 0, 1);

  /* ---------- Metric definitions ----------
     ok/warn = bands used by BeaconCare to colour status. "ref" documents where the terrestrial
     reference comes from. warn/crit bands are BeaconCare DEMONSTRATION alert bands – NOT NASA-approved
     operational thresholds. */
  const INF = 9999;
  const M = {
    hr:       { label: 'Heart rate (resting)', short: 'HR', unit: 'bpm', dec: 0, ok: [50, 100], warn: [40, 120], ref: '60–100 bpm typical adult resting (AHA); well-trained adults can be lower. In-flight values can differ from terrestrial norms.' },
    sbp:      { label: 'Systolic BP', short: 'SBP', unit: 'mmHg', dec: 0, ok: [90, 119], warn: [80, 159], ref: '<120 mmHg normal; 120–129 elevated; ≥130 hypertension stage 1 (AHA/ACC 2017). Microgravity often lowers BP slightly.' },
    dbp:      { label: 'Diastolic BP', short: 'DBP', unit: 'mmHg', dec: 0, ok: [60, 79], warn: [50, 99], ref: '<80 mmHg normal; ≥80 hypertension stage 1 (AHA/ACC 2017).' },
    spo2:     { label: 'Blood oxygen (SpO₂)', short: 'SpO₂', unit: '%', dec: 1, ok: [95, 101], warn: [92, 101], ref: '95–100 % typical at sea-level pressure; spacecraft cabin pressure/composition can differ.' },
    temp:     { label: 'Body temperature', short: 'TEMP', unit: '°C', dec: 1, ok: [36.1, 37.2], warn: [35.5, 38.4], ref: '36.1–37.2 °C typical oral/core range; ≥38.0 °C is usually considered fever. Core temperature can run slightly higher in flight.' },
    rr:       { label: 'Respiratory rate', short: 'RR', unit: '/min', dec: 0, ok: [12, 20], warn: [10, 24], ref: '12–20 breaths/min typical adult at rest.' },
    hrv:      { label: 'Heart-rate variability', short: 'HRV', unit: 'ms', dec: 0, ref: 'Highly individual – BeaconCare compares against the astronaut’s own baseline only.' },
    sleepH:   { label: 'Sleep duration', short: 'SLEEP', unit: 'h', dec: 1, ok: [7, 10], warn: [4.5, 10], ref: '7–9 h recommended for adults (AASM/SRS). Crews in flight often average less – BeaconCare still tracks the shortfall.' },
    sleepQ:   { label: 'Sleep quality index', short: 'SLEEP Q', unit: '/100', dec: 0, ok: [70, 100], warn: [50, 100], ref: 'BeaconCare demonstration index combining efficiency and interruptions.' },
    wake:     { label: 'Sleep interruptions', short: 'WAKES', unit: '/night', dec: 0, ok: [0, 2], warn: [0, 4], ref: 'Fewer than ~2 awakenings per night typical.' },
    steps:    { label: 'Step count (motion)', short: 'STEPS', unit: 'steps', dec: 0, ref: 'In microgravity treadmill/cycle counts are used; value is a wearable motion count.' },
    exMin:    { label: 'Exercise time', short: 'EXERCISE', unit: 'min/day', dec: 0, ok: [90, 400], warn: [45, 400], ref: 'BeaconCare demo target ~120 min/day combined resistance + aerobic countermeasures (ISS crews typically schedule ~2 h/day).' },
    resMin:   { label: 'Resistance training', short: 'RESIST.', unit: 'min/day', dec: 0, ok: [40, 400], warn: [20, 400], ref: 'BeaconCare demo target ≥ 45 min/day on 6 days/week.' },
    weight:   { label: 'Body mass', short: 'WEIGHT', unit: 'kg', dec: 1, ref: 'Compared with the astronaut’s own baseline.' },
    wtChg:    { label: 'Body-mass change', short: 'Δ MASS', unit: '%', dec: 1, ok: [-2, 5], warn: [-5, 8], ref: 'Loss >2 % of baseline body mass over a mission segment warrants nutritional review (BeaconCare demo band).' },
    kcal:     { label: 'Energy intake', short: 'KCAL', unit: 'kcal/day', dec: 0, ok: [2500, 3300], warn: [1800, 3800], ref: 'BeaconCare demo target ≈ 2 800 kcal/day (individualised by crew dietitian).' },
    protein:  { label: 'Protein intake', short: 'PROTEIN', unit: 'g/day', dec: 0, ok: [90, 400], warn: [55, 400], ref: '≈1.2–1.6 g/kg/day is a commonly cited range for exercising adults.' },
    carbs:    { label: 'Carbohydrate', short: 'CARBS', unit: 'g/day', dec: 0, ref: 'Typically ~45–55 % of energy.' },
    fat:      { label: 'Fat', short: 'FAT', unit: 'g/day', dec: 0, ref: 'Typically ~25–35 % of energy.' },
    hydration:{ label: 'Hydration (fluid intake)', short: 'WATER', unit: 'L/day', dec: 1, ok: [2.0, 6], warn: [1.4, 6], ref: '≥2 L/day is commonly recommended in flight to reduce renal-stone risk.' },
    stress:   { label: 'Perceived stress', short: 'STRESS', unit: '/10', dec: 1, ok: [0, 4], warn: [0, 7], ref: 'Self-rated 0–10. BeaconCare brief stress check – not a validated clinical instrument.' },
    mood:     { label: 'Mood', short: 'MOOD', unit: '/10', dec: 1, ok: [6.5, 10], warn: [4, 10], ref: 'Self-rated 1–10; compared with personal baseline.' },
    anx:      { label: 'Anxiety screen (GAD-2)', short: 'GAD-2', unit: '/6', dec: 0, ok: [0, 2], warn: [0, 6], ref: 'GAD-2 ≥3 is a positive SCREEN that suggests follow-up; it is not a diagnosis.' },
    phq:      { label: 'Low-mood screen (PHQ-2)', short: 'PHQ-2', unit: '/6', dec: 0, ok: [0, 2], warn: [0, 6], ref: 'PHQ-2 ≥3 is a positive SCREEN that suggests follow-up; it is not a diagnosis.' },
    social:   { label: 'Crew social interaction', short: 'SOCIAL', unit: 'min/day', dec: 0, ok: [60, 600], warn: [30, 600], ref: 'BeaconCare demo indicator (shared meals, conversations, recreation).' },
    cog:      { label: 'Cognitive performance', short: 'COGNITION', unit: 'index', dec: 0, ok: [85, 110], warn: [70, 110], ref: 'Index (100 = personal pre-flight baseline reaction/attention battery). Demonstration value.' },
    rad:      { label: 'Daily radiation dose', short: 'DOSE', unit: 'mSv/day', dec: 2, ref: 'Dose-equivalent estimate from onboard dosimeter (simulated).' },
    radPct:   { label: 'Radiation budget used', short: 'BUDGET', unit: '%', dec: 0, ok: [0, 50], warn: [0, 80], ref: 'Illustrative mission dose budget (120 mSv) – set by mission planners; NOT a NASA limit. NASA career effective-dose limit is 600 mSv (NASA-STD-3001, 2022).' },
    wbc:      { label: 'White blood cells', short: 'WBC', unit: '×10⁹/L', dec: 1, ok: [4.5, 11], warn: [3.0, 15], ref: '4.5–11.0 ×10⁹/L typical adult.' },
    hb:       { label: 'Haemoglobin', short: 'HB', unit: 'g/dL', dec: 1, ok: [12, 17.5], warn: [10, 18.5], ref: '≈12–17.5 g/dL typical adult (sex-dependent).' },
    vitD:     { label: '25-OH vitamin D', short: 'VIT D', unit: 'ng/mL', dec: 0, ok: [30, 100], warn: [12, 100], ref: '≥30 ng/mL sufficient; 12–29 insufficient; <12 deficient (Endocrine Society range).' },
    glucose:  { label: 'Fasting glucose', short: 'GLUCOSE', unit: 'mg/dL', dec: 0, ok: [70, 99], warn: [60, 139], ref: '70–99 mg/dL normal fasting (ADA).' },
    uCa:      { label: 'Urinary calcium', short: 'U-Ca', unit: 'mg/24h', dec: 0, ok: [100, 300], warn: [50, 400], ref: '≈100–300 mg/24 h typical; microgravity raises excretion (bone resorption).' },
    bmd:      { label: 'Bone density index', short: 'BONE', unit: '% base', dec: 1, ok: [98, 200], warn: [95, 200], ref: 'Index vs pre-flight baseline (demonstration estimate, not DXA). Unmitigated loss ≈1–1.5 %/month in weight-bearing bone.' },
    muscle:   { label: 'Muscle mass index', short: 'MUSCLE', unit: '% base', dec: 1, ok: [97, 200], warn: [92, 200], ref: 'Index vs pre-flight baseline (demonstration estimate).' },
    strength: { label: 'Muscle strength index', short: 'STRENGTH', unit: '% base', dec: 1, ok: [95, 200], warn: [88, 200], ref: 'Index vs pre-flight baseline (leg-press / grip battery, demonstration).' },
  };

  /* Evaluate a value against a metric's bands -> {status, dir: 'high'|'low'|null} */
  function evalMetric(key, v) {
    const m = M[key];
    if (!m || !m.ok || v == null || isNaN(v)) return { status: 'ok', dir: null };
    if (v >= m.ok[0] && v <= m.ok[1]) return { status: 'ok', dir: null };
    const dir = v > m.ok[1] ? 'high' : 'low';
    if (v >= m.warn[0] && v <= m.warn[1]) return { status: 'warn', dir };
    return { status: 'crit', dir };
  }

  /* Anatomical systems ---------------------------------------------------- */
  const SYSTEMS = [
    { id: 'cardiovascular', name: 'Cardiovascular', hue: '#d4859a', metrics: ['hr', 'sbp', 'dbp'], blurb: 'Heart, arteries and veins – circulates blood, oxygen and nutrients. Microgravity shifts fluid toward the head and can lead to cardiovascular deconditioning.' },
    { id: 'respiratory', name: 'Respiratory', hue: '#7fb6d4', metrics: ['spo2', 'rr'], blurb: 'Lungs and airways – gas exchange. Spacecraft air quality, pressure and fluid shifts matter here.' },
    { id: 'nervous', name: 'Nervous', hue: '#a999d6', metrics: ['cog', 'stress', 'mood', 'sleepH'], blurb: 'Brain, spinal cord and nerves – cognition, mood, sleep regulation. Sensitive to isolation, sleep loss and radiation.' },
    { id: 'skeletal', name: 'Skeletal', hue: '#cfd9ea', metrics: ['bmd', 'uCa'], blurb: 'Bones – without gravitational loading, weight-bearing bone is resorbed and calcium is lost.' },
    { id: 'muscular', name: 'Muscular', hue: '#e0956a', metrics: ['muscle', 'strength', 'resMin'], blurb: 'Skeletal muscle – unloading causes atrophy of antigravity muscles (calves, quadriceps, back, core).' },
    { id: 'digestive', name: 'Digestive', hue: '#a9c96e', metrics: ['kcal', 'protein'], blurb: 'Gastrointestinal tract and liver – nutrition adequacy underpins muscle, bone and immune health.' },
    { id: 'immune', name: 'Immune', hue: '#78c4b0', metrics: ['wbc', 'temp'], blurb: 'White cells, lymphatic organs – spaceflight stress, sleep loss and radiation can dysregulate immune function.' },
    { id: 'endocrine', name: 'Endocrine', hue: '#e3c077', metrics: ['glucose', 'vitD', 'wtChg'], blurb: 'Glands and hormones – metabolism, stress response, vitamin D / calcium balance.' },
    { id: 'urinary', name: 'Urinary', hue: '#7f98d6', metrics: ['hydration', 'uCa'], blurb: 'Kidneys and bladder – fluid balance and calcium handling (renal-stone risk rises with dehydration and bone loss).' },
  ];

  /* ---------- Scenario generation ---------- */
  const isLab = (d, N) => d === 1 || d % 7 === 0 || d === N;
  function macros(kcal, protein) {
    const carbs = (kcal * 0.5) / 4;
    const fat = Math.max(30, (kcal - protein * 4 - carbs * 4) / 9);
    return { carbs: Math.round(carbs), fat: Math.round(fat) };
  }

  function genHealthy() {
    const N = 62, r = mulberry32(11), n = () => (r() + r() + r() - 1.5) / 0.5;
    const recs = [];
    for (let d = 1; d <= N; d++) {
      const kcal = 2820 + n() * 90, protein = 108 + n() * 6, mac = macros(kcal, protein);
      const ex = 125 + n() * 10, res = 52 + n() * 5;
      const rec = {
        d, hr: 57 + n() * 1.2, sbp: 112 + n() * 2, dbp: 71 + n() * 1.5, spo2: 98.1 + n() * 0.3, temp: 36.6 + n() * 0.1, rr: 14 + n() * 0.6, hrv: 62 + n() * 4,
        sleepH: 7.4 + n() * 0.3, sleepQ: 83 + n() * 3, wake: Math.round(1 + r()), steps: Math.round(75 * ex + n() * 300), exMin: ex, resMin: res,
        weight: 74.6 - 0.9 * ramp(d, 1, 62) + n() * 0.12, kcal, protein, carbs: mac.carbs, fat: mac.fat, hydration: 2.6 + n() * 0.12,
        micro: { vitD: 96 + n() * 3, ca: 100 + n() * 3, fe: 102 + n() * 3, vitC: 108 + n() * 4, mg: 98 + n() * 3 },
        stress: 2.6 + n() * 0.45, mood: 8 + n() * 0.35, anx: r() < 0.1 ? 1 : 0, phq: r() < 0.08 ? 1 : 0, social: 95 + n() * 8, cog: 94 + n() * 1.2,
        rad: 0.85 + n() * 0.07 + (d === 31 ? 4.2 : d === 32 ? 0.8 : 0),
        chkM: true, chkE: r() > 0.03,
      };
      if (isLab(d, N)) rec.lab = { wbc: 6.0 + n() * 0.35, hb: 14.6 + n() * 0.2, vitD: 38 - d * 0.03 + n() * 1.2, glucose: 88 + n() * 2.5, uCa: 205 + n() * 10, bmd: 100 - d * 0.0145 + n() * 0.1, muscle: 100 - d * 0.024 + n() * 0.1, strength: 100 - d * 0.04 + n() * 0.15 };
      recs.push(rec);
    }
    return recs;
  }

  function genAbnormal() {
    const N = 45, I = 36, r = mulberry32(23), n = () => (r() + r() + r() - 1.5) / 0.5;
    const recs = [], post = (d) => Math.max(0, d - I);
    for (let d = 1; d <= N; d++) {
      const sleep = 7.2 - 1.0 * ramp(d, 4, 8) - 1.1 * ramp(d, 8, 36) + 0.12 * post(d);
      const ex = 120 - 15 * ramp(d, 13, 16) - 55 * ramp(d, 16, 36) + 3.5 * post(d);
      const res = 50 - 6 * ramp(d, 13, 16) - 34 * ramp(d, 16, 36) + 3 * post(d);
      const kcal = 2780 - 720 * ramp(d, 20, 36) + 25 * post(d) + n() * 70;
      const protein = 105 - 45 * ramp(d, 22, 36) + 2.5 * post(d) + n() * 5;
      const mac = macros(kcal, protein);
      const p = ramp(d, 16, 36);
      const gad = clamp(Math.round(0.5 + 3.5 * p - 0.15 * post(d) + n() * 0.3), 0, 6);
      const phq = clamp(Math.round(0.4 + 2.8 * p - 0.1 * post(d) + n() * 0.3), 0, 6);
      const rec = {
        d, hr: 58 + 4 * ramp(d, 8, 12) + 12 * ramp(d, 12, 36) - 0.6 * post(d) + n() * 1.1,
        sbp: 113 + 15 * ramp(d, 12, 36) - 0.25 * post(d) + n() * 1.8, dbp: 73 + 11 * ramp(d, 12, 36) - 0.2 * post(d) + n() * 1.2,
        spo2: 98 + n() * 0.3, temp: 36.6 + 0.15 * ramp(d, 12, 36) + n() * 0.08, rr: 14 + 2 * ramp(d, 12, 36) + n() * 0.5, hrv: 60 - 20 * ramp(d, 12, 36) + 0.8 * post(d) + n() * 3,
        sleepH: sleep + n() * 0.28, sleepQ: 82 - 30 * ramp(d, 6, 36) + 1.5 * post(d) + n() * 3, wake: Math.round(1 + 3 * ramp(d, 8, 36) - 0.2 * post(d) + (r() - 0.5)),
        steps: Math.round(75 * ex + n() * 300), exMin: ex + n() * 6, resMin: Math.max(0, res + n() * 3),
        weight: 75.0 - 2.0 * ramp(d, 14, 36) + 0.05 * post(d) + n() * 0.1, kcal, protein, carbs: mac.carbs, fat: mac.fat, hydration: 2.5 - 0.8 * ramp(d, 18, 36) + 0.04 * post(d) + n() * 0.08,
        micro: { vitD: 92 - 40 * ramp(d, 20, 36) + n() * 3, ca: 98 - 25 * ramp(d, 20, 36) + n() * 3, fe: 100 - 10 * ramp(d, 20, 36) + n() * 3, vitC: 105 - 30 * ramp(d, 20, 36) + n() * 3, mg: 96 - 22 * ramp(d, 20, 36) + n() * 3 },
        stress: 3 + 1.0 * ramp(d, 10, 16) + 3.3 * ramp(d, 16, 36) - 0.1 * post(d) + n() * 0.35,
        mood: 7.8 - 0.8 * ramp(d, 10, 16) - 2.0 * ramp(d, 16, 36) + 0.08 * post(d) + n() * 0.3, anx: gad, phq,
        social: 90 - 55 * ramp(d, 14, 36) + 2 * post(d) + n() * 4, cog: 93 - 16 * ramp(d, 10, 36) + 0.6 * post(d) + n() * 1.3,
        rad: 1.15 + n() * 0.08 + (d === 27 ? 14 : d === 28 ? 3 : 0),
        chkM: r() > 0.12 * ramp(d, 20, 36), chkE: r() > (d <= I ? 0.5 : 0.15) * ramp(d, 18, 36),
      };
      if (isLab(d, N)) rec.lab = {
        wbc: 6.1 + 4.3 * ramp(d, 10, 36) - 0.12 * post(d) + n() * 0.2, hb: 14.4 - 0.9 * ramp(d, 10, 36) + n() * 0.1, vitD: 36 - 17 * ramp(d, 10, 36) + 0.2 * post(d) + n() * 0.8,
        glucose: 90 + 9 * ramp(d, 10, 36) + n() * 1.5, uCa: 210 + 62 * ramp(d, 10, 36) + n() * 8, bmd: 100 - 3.2 * ramp(d, 1, 45) + n() * 0.08, muscle: 100 - 5.5 * ramp(d, 5, 45) + n() * 0.1, strength: 100 - 9 * ramp(d, 5, 45) + n() * 0.15,
      };
      recs.push(rec);
    }
    return recs;
  }

  function genCritical() {
    const N = 38, r = mulberry32(37), n = () => (r() + r() + r() - 1.5) / 0.5;
    const recs = [];
    for (let d = 1; d <= N; d++) {
      const p = ramp(d, 28, 36), acute = d === 38, pre = d === 37;
      const ex = acute ? 20 : pre ? 60 : 125 - 30 * p + n() * 8;
      const kcal = 2800 - 300 * p + n() * 80, protein = 106 - 15 * p + n() * 5, mac = macros(kcal, protein);
      const rec = {
        d, hr: acute ? 138 : pre ? 84 : 58 + 6 * p + n() * 1.1, sbp: acute ? 168 : pre ? 138 : 114 + 10 * p + n() * 1.8, dbp: acute ? 104 : pre ? 88 : 72 + 6 * p + n() * 1.2,
        spo2: acute ? 90.5 : pre ? 96 : 98 + n() * 0.3, temp: acute ? 37.6 : 36.6 + n() * 0.1, rr: acute ? 26 : pre ? 18 : 14 + n() * 0.5, hrv: acute ? 18 : pre ? 32 : 60 - 16 * p + n() * 3,
        sleepH: acute ? 4.6 : pre ? 5.0 : 7.2 - 1.8 * p + n() * 0.25, sleepQ: acute ? 40 : 83 - 25 * p + n() * 3, wake: acute ? 4 : Math.round(1 + 2 * p + r() * 0.6),
        steps: Math.round(75 * ex), exMin: ex, resMin: acute ? 0 : pre ? 25 : 52 - 14 * p + n() * 4, weight: 74.0 - 0.2 * ramp(d, 1, 38) + n() * 0.1, kcal, protein, carbs: mac.carbs, fat: mac.fat,
        hydration: 2.5 - 0.4 * p + n() * 0.1, micro: { vitD: 95 + n() * 3, ca: 99 + n() * 3, fe: 101 + n() * 3, vitC: 106 + n() * 3, mg: 97 + n() * 3 },
        stress: acute ? 8.5 : 2.8 + 3 * p + n() * 0.4, mood: acute ? 4.5 : 8 - 2 * p + n() * 0.3, anx: acute ? 4 : p > 0.6 ? 2 : 0, phq: p > 0.6 ? 1 : 0, social: acute ? 40 : 92 - 25 * p + n() * 6, cog: acute ? 83 : 94 - 6 * p + n() * 1.2,
        rad: 0.9 + n() * 0.07, chkM: d < 38 ? r() > 0.04 : true, chkE: d < 37 ? r() > 0.06 * (1 + p) : false,
      };
      if (isLab(d, N)) rec.lab = { wbc: acute ? 7.8 : 6.2 + n() * 0.3, hb: 14.7 + n() * 0.2, vitD: 37 - d * 0.03 + n(), glucose: acute ? 112 : 89 + n() * 2.5, uCa: 205 + n() * 10, bmd: 100 - d * 0.0145, muscle: 100 - d * 0.024, strength: 100 - d * 0.04 };
      recs.push(rec);
    }
    return recs;
  }

  /* Scenario descriptors ---------------------------------------------------- */
  const SCENARIOS = {
    healthy: {
      id: 'healthy', name: 'Healthy astronaut', short: 'HEALTHY', color: '#4fbf8e', seed: 11, gen: genHealthy,
      mission: 'Deep-space transit (demo)', crew: 'CDR-01 “Demo Astronaut A”', commDelayMin: 4.2, intervention: null, todayMorningDone: true,
      blurb: 'Excellent routine: stable cardiovascular readings, regular resistance exercise, adequate sleep and nutrition.',
      live: { hrJitter: 1.6, irregular: false },
      events: [
        { d: 1, t: 'info', text: 'MISSION DAY 01 – healthy baseline measurements recorded.' },
        { d: 8, t: 'info', text: 'Baseline window complete – personal reference values locked for trend analysis.' },
        { d: 15, t: 'act', text: 'Resistance programme on schedule (6 sessions/week).' },
        { d: 31, t: 'rad', text: 'Solar particle event – storm-shelter protocol followed, dose +4.2 mSv.' },
        { d: 42, t: 'info', text: 'Routine blood panel within reference ranges.' },
        { d: 62, t: 'info', text: 'All indicators stable.' },
      ],
      symptoms: [],
      painRecords: [],
      actions: [
        { id: 'h1', title: 'Maintain resistance training ≥ 4 sessions/week', detail: 'Preventive countermeasure for muscle and bone.', cls: 'PREVENTIVE', sys: 'muscular', recDay: 1, status: 'done', doneDay: 62, metric: 'resMin' },
        { id: 'h2', title: 'Keep a consistent sleep window (± 30 min)', detail: 'Supports immune and cognitive function.', cls: 'PREVENTIVE', sys: 'nervous', recDay: 1, status: 'done', doneDay: 62, metric: 'sleepH' },
        { id: 'h3', title: 'Weekly crew social activity', detail: 'Behavioural-health countermeasure for isolation and confinement.', cls: 'PREVENTIVE', sys: 'nervous', recDay: 14, status: 'done', doneDay: 60, metric: 'social' },
      ],
    },
    abnormal: {
      id: 'abnormal', name: 'Abnormal health condition', short: 'ABNORMAL', color: '#e3b34f', seed: 23, gen: genAbnormal,
      mission: 'Deep-space transit (demo)', crew: 'FE-02 “Demo Astronaut B”', commDelayMin: 6.0, intervention: 36, todayMorningDone: false,
      blurb: 'Gradual deterioration: shorter sleep, rising stress, less exercise, elevated heart rate / BP and possible nutritional gaps – with a partial recovery after early intervention.',
      live: { hrJitter: 2.0, irregular: false },
      events: [
        { d: 1, t: 'info', text: 'MISSION DAY 01 – healthy baseline measurements recorded.' },
        { d: 5, t: 'sleep', text: 'Reduced sleep duration after schedule shift (≈6.2 h).' },
        { d: 10, t: 'hr', text: 'Resting heart rate starting to rise (+4 bpm vs baseline).' },
        { d: 15, t: 'act', text: 'Reduced exercise performance – resistance sessions skipped.' },
        { d: 21, t: 'mood', text: 'Self-reported stress and low mood increasing.' },
        { d: 27, t: 'rad', text: 'Solar particle event – storm-shelter protocol followed, dose +14 mSv.' },
        { d: 28, t: 'nutr', text: 'Protein intake below target on 5 consecutive days.' },
        { d: 31, t: 'symptom', text: 'Reported leg weakness during resistance exercise.' },
        { d: 33, t: 'alert', text: 'BeaconCare risk alert: combined strain pattern (sleep ↓, heart rate ↑, activity ↓, mood ↓).' },
        { d: 36, t: 'action', text: 'EARLY INTERVENTION started: resistance ≥4×/week, sleep-schedule reset, nutrition review requested.' },
        { d: 40, t: 'symptom', text: 'Mild lumbar back pain reported (3/10) – pain investigation: monitor.' },
        { d: 42, t: 'info', text: 'Blood panel: vitamin D low, WBC upper-normal.' },
        { d: 45, t: 'info', text: 'Partial improvement since intervention; indicators remain above baseline.' },
      ],
      symptoms: [],
      painRecords: [{ id: 'demo-back', day: 40, hh: 15.2, topic: 'back', severity: 3, symptoms: ['stiff'], vitals: {}, level: 'monitor', source: 'demo', note: 'Mild lumbar back pain after exercise; no red-flag features.' }],
      actions: [
        { id: 'a1', title: 'Increase resistance training to ≥ 4 sessions/week', detail: 'Targets the declining muscle-strength index and reduces bone-loading deficit.', cls: 'PREVENTIVE', sys: 'muscular', recDay: 33, startDay: 36, status: 'done', doneDay: 36, metric: 'resMin' },
        { id: 'a2', title: 'Reset sleep schedule and wind-down routine', detail: 'Fixed sleep window, light management, no screens/exercise in last hour.', cls: 'PREVENTIVE', sys: 'nervous', recDay: 33, startDay: 36, status: 'done', doneDay: 37, metric: 'sleepH' },
        { id: 'a3', title: 'Request nutritional assessment (protein, vitamin D)', detail: 'Repeated low protein intake and low 25-OH vitamin D – review with crew dietitian.', cls: 'FOLLOW-UP', sys: 'digestive', recDay: 34, dueDay: 38, status: 'missed', metric: 'protein' },
        { id: 'a4', title: 'Crew social time ≥ 60 min/day', detail: 'Behavioural-health countermeasure for isolation.', cls: 'PREVENTIVE', sys: 'nervous', recDay: 35, startDay: 38, status: 'done', doneDay: 38, metric: 'social' },
        { id: 'a5', title: 'Repeat BP and resting HR morning/evening for 7 days', detail: 'Confirm whether the elevated readings persist.', cls: 'FOLLOW-UP', sys: 'cardiovascular', recDay: 40, dueDay: 47, status: 'pending', metric: 'sbp' },
        { id: 'a6', title: 'Non-urgent consult with onboard medical officer', detail: 'Review cardiovascular and behavioural trends together.', cls: 'MEDICAL ESCALATION', sys: 'cardiovascular', recDay: 41, dueDay: 48, status: 'pending' },
      ],
    },
    critical: {
      id: 'critical', name: 'Critical health condition', short: 'CRITICAL', color: '#e0646f', seed: 37, gen: genCritical,
      mission: 'Deep-space transit (demo)', crew: 'FE-03 “Demo Astronaut C”', commDelayMin: 5.1, intervention: null, todayMorningDone: true, emergency: true, onsetMinAgo: 14,
      blurb: 'A potentially serious acute situation: critically abnormal cardiovascular and respiratory readings with severe symptoms – requires immediate escalation.',
      live: { hrJitter: 7, irregular: true },
      events: [
        { d: 1, t: 'info', text: 'MISSION DAY 01 – healthy baseline measurements recorded.' },
        { d: 28, t: 'sleep', text: 'Sleep shortening after a high-workload period.' },
        { d: 34, t: 'hr', text: 'Resting heart rate drifting upward (+5 bpm).' },
        { d: 37, t: 'symptom', text: 'Palpitations and fatigue reported during evening session; BP 138/88.' },
        { d: 38, t: 'alert', text: 'EMERGENCY: chest pressure 8/10 with shortness of breath, sweating and dizziness; HR 138, SpO₂ 90.5 %.' },
      ],
      symptoms: [],
      painRecords: [{ id: 'demo-chest', day: 38, hh: null, topic: 'chest', severity: 8, symptoms: ['pressure', 'radiating', 'dyspnea', 'sweating', 'dizzy'], vitals: { hr: 138, sbp: 168, dbp: 104, spo2: 90.5, temp: 37.6, rr: 26 }, level: 'emergency', source: 'demo', note: 'Chest pressure radiating to left arm with shortness of breath and sweating.' }],
      actions: [],
    },
  };

  AS.D = { M, SYSTEMS, SCENARIOS, evalMetric, ramp };
})();
