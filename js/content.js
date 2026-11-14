/* BeaconCare – educational / decision-support content. Wording is deliberately non-diagnostic.
   No medication names or doses are provided anywhere in BeaconCare. */
(function () {
  const AS = (window.AS = window.AS || {});

  const SOURCES = [
    ['NASA Human Research Program – Risks', 'https://www.nasa.gov/hrp/risks/'],
    ['NASA Human Research Roadmap', 'https://humanresearchroadmap.nasa.gov/'],
    ['NASA HRP – Space Radiation', 'https://www.nasa.gov/hrp/space-radiation/'],
    ['NASA HRP – Behavioral Health & Performance', 'https://www.nasa.gov/hrp/behavioral-health-and-performance/'],
  ];

  const HOWTO = {
    hr: { title: 'Heart rate', steps: ['Rest quietly for 2 minutes, restrained comfortably.', 'Place two fingers on the inside of the wrist (radial pulse) or read the smart band.', 'Count beats for 30 s and multiply by 2 (or 60 s if the rhythm feels irregular).', 'Note whether the rhythm is regular or irregular, then repeat once.'] },
    bp: { title: 'Blood pressure', steps: ['Rest 5 minutes; avoid exercise, caffeine or stress beforehand.', 'Fit the onboard cuff on the upper arm at heart level.', 'Stay still and silent while it inflates; record systolic / diastolic.', 'Repeat after 1–2 minutes and record both readings.'] },
    spo2: { title: 'Oxygen saturation (SpO₂)', steps: ['Warm the hand if cold; remove any nail polish.', 'Clip the pulse oximeter to a fingertip and keep the hand still.', 'Wait until the reading stabilises (≈30 s) and record it.', 'Note any breathing difficulty at the same time.'] },
    temp: { title: 'Body temperature', steps: ['Use the onboard thermometer per medical-kit instructions.', 'Wait 15 minutes after eating, drinking or exercise.', 'Record the reading and the measuring site.'] },
    rr: { title: 'Respiratory rate', steps: ['Sit still and breathe normally, without trying to control your breathing.', 'Count one breath each time the chest rises for 60 s (use the timer).', 'Record breaths/min and any wheeze, cough or effort.'] },
    weight: { title: 'Body mass', steps: ['Use the onboard body-mass measurement device (spring/inertial) per protocol.', 'Measure at the same time of day, before breakfast if possible.'] },
    lab: { title: 'Laboratory / point-of-care test', steps: ['This test requires onboard medical equipment and is performed by (or supervised by) the Crew Medical Officer.', 'Follow the mission medical checklist; BeaconCare only records the result.'] },
  };

  /* Possible explanations per metric – explanations, NOT diagnoses. */
  const EXPLAIN = {
    hr: {
      high: [['Sleep restriction or circadian disruption', 'Short or fragmented sleep raises resting heart rate through sympathetic activation.'], ['Psychological stress / workload', 'Sustained stress increases heart rate and blood pressure.'], ['Cardiovascular deconditioning', 'Reduced exercise load in microgravity lowers cardiac efficiency, so heart rate rises for the same demand.'], ['Dehydration or fluid-balance changes', 'Lower circulating volume raises heart rate.'], ['Fever, infection or a cardiac rhythm problem', 'Needs clinical assessment – cannot be distinguished by BeaconCare.']],
      low: [['High fitness level', 'Trained individuals often have resting rates <60 bpm.'], ['Medication or rhythm problem', 'Needs clinical assessment if symptomatic (dizziness, fainting).']],
    },
    sbp: {
      high: [['Stress and poor sleep', 'Both transiently raise blood pressure.'], ['Elevated sodium intake', 'Space food is often high in sodium, which raises BP in sensitive people.'], ['Reduced exercise', 'Lower aerobic conditioning is associated with higher resting BP.'], ['Pain or acute illness', 'Acute pain/cardiac or other events can cause sharp BP rises – evaluate with symptoms.']],
      low: [['Fluid shift / dehydration', 'Lower circulating volume can reduce BP, especially on standing after return to gravity.'], ['Acute illness or bleeding', 'Needs urgent clinical assessment if symptomatic.']],
    },
    dbp: { high: [['Stress, poor sleep, high sodium intake', 'Typical contributors to elevated diastolic pressure.'], ['Reduced aerobic exercise', 'Lower fitness correlates with higher BP.']], low: [['Fluid shift or dehydration', 'Lower circulating volume.']] },
    spo2: {
      low: [['Measurement artefact', 'Cold fingers, motion or poor sensor contact give falsely low readings – repeat the measurement.'], ['Cabin atmosphere / ventilation problem', 'Compare with crewmates and cabin O₂/CO₂ monitors.'], ['Respiratory or cardiac problem', 'Needs clinical assessment, particularly with breathlessness or chest symptoms.']],
    },
    rr: { high: [['Anxiety, pain or exertion', 'Common, benign causes of fast breathing.'], ['Elevated CO₂ in the cabin', 'Raised carbon dioxide stimulates breathing – check environmental monitors.'], ['Respiratory or cardiac problem', 'Needs clinical assessment when persistent or with other symptoms.']], low: [['Sleep / deep relaxation', 'Slow rates are expected at rest.']] },
    temp: { high: [['Infection or immune activation', 'Stress, sleep loss and altered immunity can allow viral reactivation or infection.'], ['Heat load from exercise or warm cabin', 'Heat dissipation is reduced in microgravity.'], ['Dehydration', 'Contributes to temperature rise.']], low: [['Cold sensor contact or cold environment', 'Repeat the measurement.']] },
    sleepH: { low: [['Schedule shifts / light exposure', 'Irregular light–dark cycles and shifted shifts disrupt circadian rhythm.'], ['Noise, temperature, CO₂ or discomfort', 'Environmental factors fragment sleep in flight.'], ['Stress, anxiety or low mood', 'Psychological load shortens and fragments sleep.'], ['Evening exercise or stimulants', 'Late activity delays sleep onset.']] },
    sleepQ: { low: [['Frequent awakenings', 'Fragmented sleep lowers restorative sleep.'], ['Environmental disturbances', 'Noise, light and temperature.']] },
    stress: { high: [['Workload and mission pressure', 'Task load, time pressure and consequences of errors.'], ['Isolation and confinement', 'Limited privacy and social variety raise strain.'], ['Sleep loss', 'Poor sleep amplifies stress reactivity.'], ['Communication delay / distance from Earth', 'Reduced real-time support increases autonomy demands.']] },
    mood: { low: [['Sleep loss and fatigue', 'Strongly linked to low mood.'], ['Reduced social contact', 'Isolation and fewer positive interactions.'], ['Reduced exercise', 'Exercise supports mood regulation.'], ['Persistent low mood needs human follow-up', 'Screening scores are not diagnoses – discuss with the psychological-support team.']] },
    anx: { high: [['Positive anxiety screen', 'A GAD-2 score ≥3 suggests follow-up; it does not diagnose an anxiety disorder.']] },
    phq: { high: [['Positive low-mood screen', 'A PHQ-2 score ≥3 suggests follow-up; it does not diagnose depression.']] },
    cog: { low: [['Sleep deprivation', 'Attention and reaction time fall rapidly with sleep loss.'], ['Stress / fatigue', 'Both reduce cognitive efficiency.'], ['Elevated CO₂ or other environmental factors', 'Check cabin monitors.'], ['Neurological cause', 'Needs clinical assessment if sudden or with other neurological symptoms.']] },
    bmd: { low: [['Microgravity unloading', 'Without mechanical loading, bone resorption outpaces formation.'], ['Insufficient resistance exercise', 'Skipped sessions reduce skeletal loading.'], ['Low calcium / vitamin D intake', 'Nutrition limits bone formation.']] },
    uCa: { high: [['Bone resorption', 'Calcium released from bone is excreted in urine.'], ['Dehydration', 'Concentrated urine raises stone-formation risk.']] },
    muscle: { low: [['Muscle unloading (microgravity)', 'Antigravity muscles atrophy without load.'], ['Inadequate resistance exercise', 'Fewer or lighter sessions than prescribed.'], ['Insufficient protein / energy intake', 'Limits muscle protein synthesis.'], ['Other medical conditions requiring assessment', 'Cannot be excluded by BeaconCare.']] },
    strength: { low: [['Neuromuscular deconditioning', 'Strength falls faster than muscle size early in unloading.'], ['Inadequate exercise load or intensity', '']] },
    resMin: { low: [['Skipped or shortened sessions', 'Check the exercise schedule and equipment availability.'], ['Fatigue or low motivation', 'Often follows sleep loss and stress.']] },
    exMin: { low: [['Reduced exercise adherence', 'Time pressure, fatigue or mood.'], ['Equipment or schedule conflicts', '']] },
    kcal: { low: [['Reduced appetite', 'Common in flight (fluid shift, food fatigue, stress).'], ['Food-system variety', 'Menu fatigue reduces intake.']] },
    protein: { low: [['Menu composition', 'Fewer high-protein items eaten.'], ['Reduced appetite', 'Overall intake decline.']] },
    hydration: { low: [['Reduced thirst sensation', 'Thirst is blunted in flight.'], ['Forgetting to drink during busy periods', '']] },
    vitD: { low: [['Absent sunlight exposure', 'Spacecraft lack natural UV exposure – dietary/supplemental intake is the only source.'], ['Low dietary intake', 'Check the nutrition record.']] },
    wbc: { high: [['Stress response', 'Stress and sleep loss shift white-cell counts upward.'], ['Infection or inflammation', 'Needs clinical correlation.']], low: [['Radiation or infection effects', 'Needs clinical assessment.']] },
    glucose: { high: [['Stress and sleep loss', 'Both affect glucose regulation.'], ['Dietary pattern', 'Check intake records.']] },
    hb: { low: [['Space anaemia', 'Red-cell mass declines in flight (fluid shift / increased red-cell destruction).'], ['Insufficient iron / nutrition', '']] },
    wtChg: { low: [['Energy intake below expenditure', 'Exercise and workload outpace intake.'], ['Muscle loss', 'Contributes to lower body mass.']] },
    radPct: { high: [['Cumulative exposure to galactic cosmic rays and solar particle events', 'Dose accumulates through the mission; storm-shelter use limits SPE dose.']] },
  };

  /* Effects of conditions on the body, per system (section 5.3 of the brief). */
  const EFFECTS = {
    cardiovascular: { illus: 'heart', why: 'The heart and vessels supply oxygen to every organ. Sustained high heart rate or blood pressure increases cardiac workload and, if unaddressed, can reduce exercise capacity and raise cardiovascular risk. In flight, fluid shifts toward the head and reduced loading already deplete cardiovascular conditioning.', proc: ['Sympathetic nervous activation raises heart rate and vascular tone.', 'Microgravity reduces gravitational blood pooling and plasma volume, lowering preload and cardiac muscle load.', 'Sleep loss and stress hormones further raise blood pressure.'], others: ['respiratory', 'nervous', 'urinary'], risks: ['Reduced exercise tolerance and orthostatic intolerance on return to gravity', 'Persistent hypertension and cardiac strain', 'Rhythm disturbances if the underlying cause persists'], highlight: ['heart', 'aorta', 'vessels'] },
    respiratory: { illus: 'lung', why: 'Gas exchange determines how much oxygen reaches the tissues. Low saturation or fast breathing can reflect problems with the lungs, the heart or the cabin atmosphere.', proc: ['Oxygen diffuses across the alveolar membrane into capillaries.', 'Chemoreceptors raise breathing rate when O₂ falls or CO₂ rises.', 'Fluid shifts and cabin dust/CO₂ can alter ventilation.'], others: ['cardiovascular', 'nervous'], risks: ['Tissue hypoxia affecting cognition and the heart', 'Fatigue and reduced exercise capacity', 'Progression to respiratory distress if the cause persists'], highlight: ['lung_l', 'lung_r', 'trachea'] },
    nervous: { illus: 'brain', why: 'The nervous system governs cognition, mood and sleep. Sleep loss, chronic stress and isolation reduce attention, decision quality and emotional regulation – safety-critical in long missions.', proc: ['Circadian disruption reduces restorative sleep and alters hormone secretion.', 'Chronic stress sustains cortisol/sympathetic activity affecting attention networks.', 'Reduced social stimulation affects mood regulation.'], others: ['endocrine', 'immune', 'cardiovascular'], risks: ['Performance errors and slower reaction times', 'Worsening mood or anxiety symptoms', 'Further sleep disruption (a vicious cycle)'], highlight: ['brain', 'cord'] },
    skeletal: { illus: 'bone', why: 'Bone remodels in response to mechanical load. Without gravity, resorption outpaces formation, releasing calcium and weakening weight-bearing bones such as the spine, pelvis and femurs.', proc: ['Osteoclast activity increases while osteoblast activity falls in unloaded bone.', 'Calcium released from bone is excreted by the kidneys.', 'Trabecular architecture thins, lowering fracture resistance.'], others: ['urinary', 'muscular', 'endocrine'], risks: ['Lower bone mineral density and higher fracture risk', 'Renal-stone risk from elevated urinary calcium', 'Slow or incomplete post-flight recovery'], highlight: ['sk_spine', 'sk_pelvis', 'sk_legs'] },
    muscular: { illus: 'muscle', why: 'Antigravity muscles (calves, quadriceps, back, core) are unloaded in microgravity and atrophy quickly – reducing strength and mission-critical performance, e.g. for emergency egress or surface work.', proc: ['Reduced mechanical loading lowers muscle protein synthesis and increases breakdown.', 'Fast-twitch fibres are lost and neuromuscular control declines.', 'Inadequate protein/energy intake accelerates loss.'], others: ['skeletal', 'cardiovascular', 'digestive'], risks: ['Reduced strength and endurance', 'Higher injury risk during and after flight', 'Reduced ability to perform physically demanding tasks'], highlight: ['m_quads', 'm_calves', 'm_back', 'm_core', 'm_glutes'] },
    digestive: { illus: 'gut', why: 'Adequate energy, protein and micronutrient intake is necessary to preserve muscle, bone and immune function. Space food, appetite changes and stress often reduce intake.', proc: ['Energy deficit forces catabolism of muscle protein.', 'Limited micronutrients (e.g. vitamin D, calcium) impair bone and immune health.', 'Fluid shifts and stress change appetite and digestion.'], others: ['muscular', 'skeletal', 'immune'], risks: ['Body-mass and muscle loss', 'Micronutrient deficiencies', 'Reduced immunity and slower recovery'], highlight: ['stomach', 'liver', 'small_int', 'large_int'] },
    immune: { illus: 'immune', why: 'Spaceflight stress, disturbed sleep, radiation and nutrition affect immune regulation; dormant viruses can reactivate and infections may be more frequent or prolonged.', proc: ['Stress hormones and sleep loss alter lymphocyte function.', 'Radiation can damage haematopoietic (blood-forming) tissue.', 'Nutrient shortfalls reduce immune cell production.'], others: ['endocrine', 'nervous', 'digestive'], risks: ['Higher infection and viral reactivation risk', 'Hypersensitivity / rash events', 'Slower wound healing'], highlight: ['spleen', 'thymus', 'nodes', 'lymph'] },
    endocrine: { illus: 'gland', why: 'Hormones regulate metabolism, stress response and calcium/vitamin D balance. Low vitamin D (no sunlight) and chronic stress can disturb these systems.', proc: ['Chronic stress alters cortisol rhythm and glucose regulation.', 'Vitamin D status influences calcium absorption and bone turnover.', 'Energy deficit changes thyroid/metabolic hormones.'], others: ['skeletal', 'digestive', 'nervous'], risks: ['Impaired glucose control', 'Bone-mineral imbalance', 'Persistent fatigue'], highlight: ['thyroid', 'pituitary', 'adrenal', 'pancreas'] },
    urinary: { illus: 'kidney', why: 'Kidneys regulate fluid and electrolytes. Dehydration plus high urinary calcium (from bone loss) concentrate stone-forming salts – an important in-flight risk.', proc: ['Reduced fluid intake concentrates urine.', 'Bone resorption raises urinary calcium excretion.', 'Fluid shifts alter renal handling of sodium and water.'], others: ['skeletal', 'cardiovascular'], risks: ['Kidney-stone formation (painful, mission-impacting)', 'Dehydration-related fatigue and lower BP', 'Urinary tract infection risk'], highlight: ['kidneys', 'bladder', 'ureters'] },
  };

  /* Guided investigations. kind 'system' or 'pain'. flag: 'red' = emergency feature, 'amber' = escalate-worthy */
  const S = (id, label, flag) => ({ id, label, flag: flag || null });
  const INV = {
    // ---- pain regions ----
    chest: { kind: 'pain', title: 'Chest pain', systems: ['cardiovascular', 'respiratory'], sevEsc: 4, sevEmerg: 7, measures: ['hr', 'bp', 'spo2', 'temp', 'rr'],
      symptoms: [S('pressure', 'Pressure or squeezing sensation', 'amber'), S('radiating', 'Pain spreading to arm, jaw, neck or back', 'red'), S('dyspnea', 'Shortness of breath', 'red'), S('sweating', 'Cold sweat', 'red'), S('dizzy', 'Dizziness or feeling faint', 'red'), S('palp', 'Palpitations / irregular heartbeat', 'amber'), S('pleuritic', 'Worse with deep breath or cough'), S('movement', 'Worse with movement or pressing on the area'), S('fever', 'Fever or chills', 'amber'), S('burning', 'Burning feeling, worse after meals')],
      expl: [['Cardiac cause that must be excluded urgently', 'Chest pressure with spread, breathlessness or sweating can reflect reduced blood supply to the heart muscle or a rhythm problem.', ['pressure', 'radiating', 'sweating', 'dyspnea', 'palp', 'dizzy']], ['Musculoskeletal strain', 'Chest-wall or rib strain after resistance exercise can cause localised pain that changes with movement.', ['movement']], ['Lung or pleural irritation', 'Pain that changes with breathing may involve the lungs or lining of the lungs.', ['pleuritic', 'dyspnea', 'fever']], ['Gastro-oesophageal causes', 'Reflux is more common with fluid shifts and some foods.', ['burning']], ['Stress or anxiety response', 'Can cause chest tightness and palpitations, but only after serious causes are excluded.', ['palp']]] },
    head: { kind: 'pain', title: 'Headache', systems: ['nervous'], sevEsc: 6, sevEmerg: 9, measures: ['hr', 'bp', 'temp'],
      symptoms: [S('sudden', 'Sudden, “worst ever” onset', 'red'), S('confusion', 'Confusion, drowsiness or trouble speaking', 'red'), S('weak', 'Weakness / numbness on one side', 'red'), S('neck', 'Stiff neck with fever', 'red'), S('vision', 'Blurred vision or visual changes', 'amber'), S('nausea', 'Nausea or vomiting', 'amber'), S('light', 'Sensitivity to light'), S('pressure', 'Pressure feeling, worse lying flat / in flight'), S('stress', 'Tension band-like, stress-related'), S('co2', 'Others in crew also have headaches')],
      expl: [['Fluid shift / cephalad pressure', 'Headward fluid shift in microgravity is a common cause of headache, especially early or after sleep.', ['pressure']], ['Environmental factors (CO₂, noise)', 'Elevated cabin CO₂ causes headache – check monitors and crewmates.', ['co2']], ['Tension / sleep loss / dehydration', 'Frequent and benign but worth correcting.', ['stress']], ['Vision-related (SANS spectrum)', 'Spaceflight-associated neuro-ocular changes can include headache with visual changes – needs medical review.', ['vision']], ['Neurological or infectious cause', 'Sudden severe onset, neurological signs or fever with stiff neck require emergency evaluation.', ['sudden', 'confusion', 'weak', 'neck']]] },
    back: { kind: 'pain', title: 'Back pain', systems: ['skeletal', 'muscular'], sevEsc: 6, sevEmerg: 9, measures: ['hr', 'temp'],
      symptoms: [S('numb', 'Numbness or weakness in the legs', 'red'), S('bladder', 'Loss of bladder or bowel control', 'red'), S('fever', 'Fever', 'amber'), S('radiate', 'Pain spreading down a leg', 'amber'), S('night', 'Pain at rest that does not ease'), S('spasm', 'Muscle spasm / tightness'), S('stiff', 'Stiffness after exercise'), S('trauma', 'Recent strain or impact', 'amber')],
      expl: [['Spinal elongation (microgravity)', 'The spine lengthens in flight, a very common cause of low-back pain in the first weeks.', ['stiff', 'spasm']], ['Muscle strain / core weakness', 'Weak core and back muscles after unloading increase strain risk during exercise.', ['spasm', 'stiff', 'trauma']], ['Disc or nerve involvement', 'Pain going down the leg or with numbness needs clinical review.', ['radiate', 'numb', 'bladder']], ['Infection or other medical cause', 'Fever with back pain needs prompt evaluation.', ['fever', 'night']]] },
    leg: { kind: 'pain', title: 'Leg pain', systems: ['muscular', 'cardiovascular', 'skeletal'], sevEsc: 6, sevEmerg: 9, measures: ['hr', 'spo2', 'temp'],
      symptoms: [S('swelling', 'Swelling, redness or warmth in one leg', 'red'), S('breath', 'Chest pain or shortness of breath at the same time', 'red'), S('cold', 'Leg pale, cold or numb', 'red'), S('calf', 'Calf tenderness', 'amber'), S('cramp', 'Cramping or heaviness'), S('exercise', 'Started after exercise'), S('weak', 'Weakness in the leg', 'amber')],
      expl: [['Exercise-related muscle strain or soreness', 'Typical after ARED/treadmill sessions, particularly after unloading.', ['exercise', 'cramp']], ['Calf / quadriceps atrophy and weakness', 'Antigravity muscles lose strength in flight.', ['weak', 'cramp']], ['Venous clot (thrombosis)', 'One swollen, warm, painful leg – particularly with breathlessness – needs urgent assessment; fluid shifts raise venous-clot risk in flight.', ['swelling', 'calf', 'breath']], ['Circulation or nerve problem', 'A cold, pale or numb leg is urgent.', ['cold']]] },
    muscle: { kind: 'pain', title: 'Muscle pain', systems: ['muscular'], sevEsc: 6, sevEmerg: 10, measures: ['hr', 'temp'],
      symptoms: [S('dark', 'Dark / tea-coloured urine', 'red'), S('swollen', 'Marked swelling or tenseness', 'amber'), S('weak', 'Weakness out of proportion to pain', 'amber'), S('exercise', 'After a hard session'), S('cramp', 'Cramping'), S('fever', 'Fever or flu-like illness', 'amber'), S('diffuse', 'Widespread aching')],
      expl: [['Delayed-onset muscle soreness', 'Soreness 1–2 days after unfamiliar or intense loading is common.', ['exercise']], ['Muscle deconditioning', 'Weak, unloaded muscles tire and ache more easily.', ['weak', 'diffuse']], ['Inadequate nutrition or hydration', 'Low protein / fluids slow recovery.', ['cramp']], ['Severe muscle injury or systemic illness', 'Dark urine, marked swelling or fever need medical assessment.', ['dark', 'swollen', 'fever']]] },
    joint: { kind: 'pain', title: 'Joint pain', systems: ['skeletal', 'muscular'], sevEsc: 6, sevEmerg: 10, measures: ['temp'],
      symptoms: [S('hot', 'Hot, red, swollen joint with fever', 'red'), S('cannot', 'Cannot move or bear load after impact', 'red'), S('swelling', 'Swelling', 'amber'), S('locking', 'Locking or giving way', 'amber'), S('stiff', 'Stiffness'), S('overuse', 'After repetitive exercise')],
      expl: [['Overuse or load-related strain', 'Repetitive exercise loads (harness, resistive devices) can irritate joints.', ['overuse', 'stiff']], ['Ligament / cartilage injury', 'Locking or instability needs imaging/clinical review.', ['locking', 'swelling', 'cannot']], ['Infection or inflammatory cause', 'Hot joint with fever is urgent.', ['hot']]] },
    abdominal: { kind: 'pain', title: 'Abdominal pain', systems: ['digestive', 'urinary'], sevEsc: 5, sevEmerg: 8, measures: ['hr', 'bp', 'temp'],
      symptoms: [S('rigid', 'Hard / rigid abdomen or pain with any movement', 'red'), S('blood', 'Vomiting blood or black stools', 'red'), S('sudden', 'Sudden, very severe pain', 'red'), S('fever', 'Fever', 'amber'), S('nausea', 'Nausea or vomiting', 'amber'), S('flank', 'Pain in the flank spreading to the groin', 'amber'), S('bloat', 'Bloating / gas'), S('constip', 'Constipation or diarrhoea')],
      expl: [['Gas and bloating (microgravity)', 'Gas does not rise in flight, so bloating and cramping are common.', ['bloat', 'constip']], ['Constipation / dietary change', 'Low fluid or fibre.', ['constip']], ['Kidney stone', 'Colicky pain from flank to groin, often with nausea – risk rises with dehydration and high urinary calcium.', ['flank', 'nausea']], ['Acute abdominal condition', 'Rigid abdomen, vomiting blood, black stools, or sudden severe pain require emergency evaluation.', ['rigid', 'blood', 'sudden', 'fever']]] },
    // ---- systems ----
    cardiovascular: { kind: 'system', title: 'Cardiovascular system', systems: ['cardiovascular'], sevEsc: 99, sevEmerg: 99, measures: ['hr', 'bp', 'spo2'],
      symptoms: [S('pressure', 'Chest pressure or discomfort', 'red'), S('dyspnea', 'Shortness of breath', 'red'), S('dizzy', 'Dizziness / near-fainting', 'red'), S('palp', 'Palpitations', 'amber'), S('fatigue', 'Unusual fatigue', 'amber'), S('swelling', 'Leg swelling'), S('headache', 'Headache or facial fullness')],
      expl: [] },
    respiratory: { kind: 'system', title: 'Respiratory system', systems: ['respiratory'], sevEsc: 99, sevEmerg: 99, measures: ['spo2', 'rr', 'hr', 'temp'],
      symptoms: [S('dyspnea', 'Shortness of breath at rest', 'red'), S('blue', 'Blue / grey lips or fingertips', 'red'), S('cough', 'New cough', 'amber'), S('wheeze', 'Wheezing', 'amber'), S('fever', 'Fever', 'amber'), S('pain', 'Pain with breathing')], expl: [] },
    nervous: { kind: 'system', title: 'Nervous system', systems: ['nervous'], sevEsc: 99, sevEmerg: 99, measures: ['hr', 'bp', 'temp'],
      symptoms: [S('confusion', 'Confusion or disorientation', 'red'), S('weak', 'Weakness / numbness on one side', 'red'), S('speech', 'Slurred speech', 'red'), S('vision', 'Visual changes', 'amber'), S('headache', 'Persistent headache', 'amber'), S('insomnia', 'Difficulty sleeping'), S('focus', 'Difficulty concentrating'), S('mood', 'Low mood / irritability')], expl: [] },
    skeletal: { kind: 'system', title: 'Skeletal system', systems: ['skeletal'], sevEsc: 99, sevEmerg: 99, measures: ['lab_uCa', 'weight'],
      symptoms: [S('cannot', 'Cannot bear load after impact', 'red'), S('boneP', 'Localised bone pain', 'amber'), S('back', 'Back pain'), S('stone', 'Flank pain (possible stone)', 'amber')], expl: [] },
    muscular: { kind: 'system', title: 'Muscular system', systems: ['muscular'], sevEsc: 99, sevEmerg: 99, measures: ['weight'],
      symptoms: [S('dark', 'Dark / tea-coloured urine', 'red'), S('weak', 'New muscle weakness', 'amber'), S('cramps', 'Frequent cramps'), S('fatigue', 'Reduced exercise performance'), S('swell', 'Muscle swelling', 'amber')], expl: [] },
    digestive: { kind: 'system', title: 'Digestive system', systems: ['digestive'], sevEsc: 99, sevEmerg: 99, measures: ['weight', 'temp'],
      symptoms: [S('blood', 'Vomiting blood / black stools', 'red'), S('pain', 'Severe abdominal pain', 'red'), S('nausea', 'Nausea / vomiting', 'amber'), S('appetite', 'Poor appetite'), S('bloat', 'Bloating'), S('diar', 'Diarrhoea / constipation')], expl: [] },
    immune: { kind: 'system', title: 'Immune system', systems: ['immune'], sevEsc: 99, sevEmerg: 99, measures: ['temp', 'hr', 'lab_wbc'],
      symptoms: [S('fever', 'Fever (≥ 38.0 °C)', 'amber'), S('rash', 'Rash or skin reaction', 'amber'), S('sore', 'Sore throat / congestion'), S('nodes', 'Swollen lymph nodes', 'amber'), S('heal', 'Slow wound healing'), S('sepsis', 'Confusion with fever and fast heartbeat', 'red')], expl: [] },
    endocrine: { kind: 'system', title: 'Endocrine system', systems: ['endocrine'], sevEsc: 99, sevEmerg: 99, measures: ['weight', 'lab_glucose'],
      symptoms: [S('thirst', 'Excessive thirst or urination', 'amber'), S('fatigue', 'Unusual fatigue'), S('wt', 'Unintended weight change', 'amber'), S('shaky', 'Shaky / sweaty / confused', 'red')], expl: [] },
    urinary: { kind: 'system', title: 'Urinary system', systems: ['urinary'], sevEsc: 99, sevEmerg: 99, measures: ['temp', 'weight'],
      symptoms: [S('flank', 'Severe flank pain', 'red'), S('blood', 'Blood in urine', 'amber'), S('burn', 'Burning on urination', 'amber'), S('dark', 'Very dark urine'), S('low', 'Little urine output', 'amber')], expl: [] },
  };
  // system explanations pull from metric EXPLAIN; give system topics a generic framing
  INV.cardiovascular.expl = [['Strain from sleep loss / stress / reduced fitness', 'The most common explanations for a gradual rise in HR or BP in flight.', ['fatigue', 'headache']], ['Fluid shift or dehydration', 'Changes in circulating volume alter HR and BP.', ['dizzy', 'swelling']], ['Rhythm or heart-muscle problem', 'Palpitations, chest pressure, breathlessness or dizziness require clinical assessment.', ['pressure', 'dyspnea', 'palp', 'dizzy']]];
  INV.respiratory.expl = [['Cabin atmosphere (CO₂, dust, humidity)', 'Compare with environmental monitors and crewmates.', ['cough', 'wheeze']], ['Respiratory infection', 'Fever, cough and congestion.', ['fever', 'cough']], ['Cardiac or lung problem', 'Breathlessness at rest or blue discolouration is urgent.', ['dyspnea', 'blue', 'pain']]];
  INV.nervous.expl = [['Sleep loss, stress and fatigue', 'The commonest cause of poorer concentration and mood in flight.', ['insomnia', 'focus', 'mood']], ['Cabin CO₂ or environmental factors', 'Check monitors.', ['headache', 'focus']], ['Neurological or vision-related problem', 'Sudden confusion, one-sided weakness or visual change needs urgent assessment.', ['confusion', 'weak', 'speech', 'vision']]];
  INV.skeletal.expl = [['Microgravity-related bone loss', 'Unloaded bone is resorbed, releasing calcium.', ['back']], ['Insufficient loading exercise or nutrition', 'Check exercise and vitamin D / calcium intake.', []], ['Fracture or stone', 'Localised pain after impact, or flank pain, needs assessment.', ['cannot', 'boneP', 'stone']]];
  INV.muscular.expl = [['Muscle deconditioning from unloading', 'Expected without sufficient countermeasures.', ['weak', 'fatigue']], ['Inadequate exercise or protein intake', 'Review sessions and nutrition.', ['cramps', 'fatigue']], ['Severe muscle injury or other illness', 'Dark urine or marked swelling needs medical review.', ['dark', 'swell']]];
  INV.digestive.expl = [['Appetite change / menu fatigue', 'Common in flight.', ['appetite', 'bloat']], ['Gas / constipation', 'Microgravity changes gut gas and transit.', ['bloat', 'diar']], ['Acute abdominal condition or gastrointestinal bleeding', 'Needs emergency evaluation.', ['blood', 'pain']]];
  INV.immune.expl = [['Stress and sleep-loss related immune changes', 'Reduced immune surveillance and viral reactivation can appear.', ['rash', 'sore']], ['Infection', 'Fever, sore throat or swollen nodes.', ['fever', 'sore', 'nodes']], ['Serious infection', 'Confusion with fever and a fast heartbeat is an emergency.', ['sepsis']]];
  INV.endocrine.expl = [['Stress / diet related glucose changes', 'Sleep loss and diet shift glucose control.', ['thirst', 'fatigue']], ['Low vitamin D or energy deficit', 'Review nutrition and labs.', ['wt']], ['Metabolic emergency', 'Shaky, sweaty and confused needs immediate help.', ['shaky']]];
  INV.urinary.expl = [['Dehydration', 'Low intake concentrates urine.', ['dark', 'low']], ['Kidney stone', 'Severe flank pain, blood in urine.', ['flank', 'blood']], ['Urinary tract infection', 'Burning and urgency.', ['burn']]];

  const PAIN_CHIPS = [['chest', 'Chest pain'], ['head', 'Headache'], ['back', 'Back pain'], ['leg', 'Leg pain'], ['muscle', 'Muscle pain'], ['joint', 'Joint pain'], ['abdominal', 'Abdominal pain']];
  /* 3D anchors for manual region selection: [x,y,z], anatomical left = +x */
  const REGIONS = [
    { id: 'head', label: 'Head', topic: 'head', p: [0, 0.8, 0.1] },
    { id: 'neck', label: 'Neck', topic: 'head', p: [0, 0.65, 0.06] },
    { id: 'chest', label: 'Chest', topic: 'chest', p: [0, 0.42, 0.13] },
    { id: 'upperback', label: 'Upper back', topic: 'back', p: [0, 0.42, -0.14] },
    { id: 'abdomen', label: 'Abdomen', topic: 'abdominal', p: [0, 0.14, 0.13] },
    { id: 'lowerback', label: 'Lower back', topic: 'back', p: [0, 0.1, -0.13] },
    { id: 'lshoulder', label: 'Left shoulder', topic: 'joint', p: [0.25, 0.54, 0.04] },
    { id: 'rshoulder', label: 'Right shoulder', topic: 'joint', p: [-0.25, 0.54, 0.04] },
    { id: 'larm', label: 'Left arm (muscle)', topic: 'muscle', p: [0.31, 0.38, 0.04] },
    { id: 'rarm', label: 'Right arm (muscle)', topic: 'muscle', p: [-0.31, 0.38, 0.04] },
    { id: 'lhip', label: 'Left hip', topic: 'joint', p: [0.11, -0.06, 0.1] },
    { id: 'rhip', label: 'Right hip', topic: 'joint', p: [-0.11, -0.06, 0.1] },
    { id: 'lthigh', label: 'Left thigh', topic: 'leg', p: [0.11, -0.27, 0.08] },
    { id: 'rthigh', label: 'Right thigh', topic: 'leg', p: [-0.11, -0.27, 0.08] },
    { id: 'lknee', label: 'Left knee', topic: 'joint', p: [0.11, -0.47, 0.06] },
    { id: 'rknee', label: 'Right knee', topic: 'joint', p: [-0.11, -0.47, 0.06] },
    { id: 'lcalf', label: 'Left calf', topic: 'leg', p: [0.11, -0.65, -0.05] },
    { id: 'rcalf', label: 'Right calf', topic: 'leg', p: [-0.11, -0.65, -0.05] },
  ];

  /* Exercise countermeasures – devices/names reflect real ISS hardware; prescriptions are demo values. */
  const EXERCISES = [
    { id: 'squat', name: 'ARED squat', device: 'ARED (Advanced Resistive Exercise Device)', groups: ['quads', 'glutes', 'hams', 'core', 'back'], cls: 'resistance', purpose: 'Loads hips, spine and legs – the main countermeasure against bone and antigravity-muscle loss.', rx: '3 sets × 8–10 reps', min: 20 },
    { id: 'deadlift', name: 'ARED deadlift', device: 'ARED', groups: ['back', 'glutes', 'hams', 'core'], cls: 'resistance', purpose: 'Strengthens posterior chain and spinal extensors; loads the spine.', rx: '3 sets × 8 reps', min: 15 },
    { id: 'heel', name: 'Heel raise (calf raise)', device: 'ARED', groups: ['calves'], cls: 'resistance', purpose: 'Calf muscles atrophy fastest in microgravity.', rx: '3 sets × 12–15 reps', min: 10 },
    { id: 'press', name: 'Bench / shoulder press', device: 'ARED / resistive bands', groups: ['chest', 'arms'], cls: 'resistance', purpose: 'Maintains upper-body strength for extravehicular and surface tasks.', rx: '3 sets × 10 reps', min: 12 },
    { id: 'row', name: 'Band rows / pulldowns', device: 'Resistive bands', groups: ['back', 'arms'], cls: 'resistance', purpose: 'Supports posture and upper back.', rx: '3 sets × 12 reps', min: 10 },
    { id: 'pushup', name: 'Push-up (modified, on knees)', device: 'Floor mat + harness / restraints', groups: ['chest', 'arms', 'core'], cls: 'resistance', purpose: 'Maintains chest, shoulder and arm strength with body-weight loading.', rx: '3 sets × 8–12 reps', min: 8 },
    { id: 'bicep', name: 'Resistance-band biceps curl', device: 'Resistive band', groups: ['arms'], cls: 'resistance', purpose: 'Keeps the elbow flexors strong for handling cargo and tools.', rx: '3 sets × 12 reps', min: 6 },
    { id: 'plank', name: 'Plank (forearm)', device: 'Floor mat / foot restraints', groups: ['core', 'back', 'chest'], cls: 'core', purpose: 'Builds trunk stability to protect the spine from microgravity elongation.', rx: '3 holds × 30–45 s', min: 6 },
    { id: 'core', name: 'Core circuit (dead-bug shown)', device: 'Bands / harness', groups: ['core', 'back'], cls: 'core', purpose: 'Core stability protects the spine from spinal elongation and strain.', rx: '3 rounds × 45 s', min: 12 },
    { id: 'tread', name: 'Treadmill run (harness loaded)', device: 'T2 treadmill (COLBERT) with harness', groups: ['quads', 'hams', 'calves', 'glutes'], cls: 'aerobic', purpose: 'Aerobic conditioning with impact loading of bones and legs.', rx: '30 min intervals', min: 30 },
    { id: 'cycle', name: 'Cycle ergometer', device: 'CEVIS (cycle ergometer with vibration isolation)', groups: ['quads', 'calves', 'glutes'], cls: 'aerobic', purpose: 'Cardiovascular conditioning with low joint impact.', rx: '30 min steady / intervals', min: 30 },
  ];
  const GROUPS = { chest: 'Chest & shoulders', arms: 'Arms', core: 'Core (abdominals)', back: 'Back (traps, lats, erectors)', glutes: 'Glutes', quads: 'Quadriceps', hams: 'Hamstrings', calves: 'Calves' };

  const PHQ2 = ['Little interest or pleasure in doing things', 'Feeling down, depressed or hopeless'];
  const GAD2 = ['Feeling nervous, anxious or on edge', 'Not being able to stop or control worrying'];
  const FREQ = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];
  const STRESSQ = [['I felt overwhelmed by my workload today', false], ['I had trouble relaxing or switching off', false], ['I felt irritable with crew or ground control', false], ['I felt able to cope with what was asked of me', true]];

  const HAZARDS5 = [
    { id: 'radiation', n: 1, name: 'Space radiation', section: 'radiation', blurb: 'Galactic cosmic rays and solar particle events penetrate the spacecraft and damage DNA and tissues.' },
    { id: 'isolation', n: 2, name: 'Isolation & confinement', section: 'behavioral', blurb: 'Small crew, limited privacy and monotony strain mood, cohesion and sleep.' },
    { id: 'distance', n: 3, name: 'Distance from Earth', section: 'behavioral', blurb: 'Communication delay and limited resupply/evacuation increase autonomy and psychological demands.' },
    { id: 'gravity', n: 4, name: 'Gravity fields (altered gravity)', section: 'gravity', blurb: 'Microgravity unloads bone and muscle and shifts body fluids toward the head.' },
    { id: 'environment', n: 5, name: 'Hostile / closed environments', section: 'environment', blurb: 'Sleep disruption, diet, microbiome, air quality and immune regulation inside a closed habitat.' },
  ];

  const RAD_ORGANS = [
    { id: 'skeletal', name: 'Bone marrow & skeleton', sens: 0.9, mech: 'Blood-forming marrow is highly radiosensitive; damage lowers white/red cell production (links to immune system).' },
    { id: 'digestive', name: 'Gastrointestinal tract', sens: 0.8, mech: 'Rapidly dividing gut lining cells are sensitive; high acute doses cause nausea and vomiting.' },
    { id: 'respiratory', name: 'Lungs', sens: 0.6, mech: 'Lung tissue is among the most radiosensitive solid organs for long-term cancer risk.' },
    { id: 'nervous', name: 'Brain & central nervous system', sens: 0.55, mech: 'Heavy-ion exposure may affect neurons and cognition – an active research area with uncertain risk.' },
    { id: 'cardiovascular', name: 'Heart & vessels', sens: 0.5, mech: 'Emerging evidence links radiation to vascular inflammation and degenerative cardiovascular effects; long-term risk is uncertain.' },
    { id: 'immune', name: 'Immune / lymphatic', sens: 0.7, mech: 'Lymphocytes are very radiosensitive; dysregulation can accompany spaceflight stress.' },
    { id: 'endocrine', name: 'Thyroid & glands', sens: 0.45, mech: 'Thyroid tissue is sensitive in youth; adult sensitivity is lower.' },
  ];

  const EMERGENCY_STEPS = [
    'STOP all activity. Secure yourself and call out to the nearest crewmate immediately.',
    'Alert the onboard Crew Medical Officer (CMO) and request help – do not wait to see if it settles.',
    'Contact the flight surgeon on the priority medical channel / mission control – give the readings BeaconCare recorded.',
    'Follow the mission’s emergency medical protocol and checklists exactly as directed by the CMO and flight surgeon.',
    'Stay with the affected crewmember. Repeat and report vitals when asked. Keep a written time log.',
    'Do NOT self-treat or take any medication unless instructed by the CMO / flight surgeon. BeaconCare does not provide treatment or dosing.',
  ];

  AS.C = { SOURCES, HOWTO, EXPLAIN, EFFECTS, INV, PAIN_CHIPS, REGIONS, EXERCISES, GROUPS, PHQ2, GAD2, FREQ, STRESSQ, HAZARDS5, RAD_ORGANS, EMERGENCY_STEPS };
})();
