# BeaconCare – Astronaut health & mind monitoring

An interactive, futuristic spaceflight health-monitoring app. Zero dependencies, no build step: open `index.html` or host it on GitHub Pages.

**All data is simulated. BeaconCare is a rule-based demonstration (no AI/ML), not a medical device, and never replaces the onboard medical officer or flight surgeon.**

## Features
- **Overview** – interactive 3D anatomy (9 systems, green/yellow/red from data, click to inspect, pain-region reporting), smart-band panel (simulated stream, optional Web Bluetooth heart-rate), full-body checkup wizard.
- **Spaceflight Hazards** – NASA's five hazards in four sections (radiation with interactive particle simulation, altered gravity with exercise tracking, behavioral health, hostile environment/sleep/nutrition/immune).
- **Health History** – timeline from Mission Day 01, daily/weekly/monthly/mission graphs, transparent early-risk algorithm with "why" explanations, improvement tracking, CSV export.
- **Medical Investigation** – connected to the anatomy; possible explanations (never diagnoses), symptoms, required measurements, classed actions (preventive / immediate / follow-up / escalation). No medications or doses.
- **Daily checkups** on configurable spacecraft (GMT) mission time, reminders and missed alerts.
- **Three scenarios** (Healthy, Abnormal, Critical) switchable live; everything updates.
- Data persists in `localStorage`.

## Run locally
Open `index.html`, or `python3 -m http.server` and visit http://localhost:8000.

## Deploy on GitHub Pages
1. Push this repo to GitHub (branch `main`).
2. Settings → Pages → Source: **GitHub Actions**. The included workflow publishes the site.

## Scientific basis and limits
References: [NASA HRP Risks](https://www.nasa.gov/hrp/risks/), [Human Research Roadmap](https://humanresearchroadmap.nasa.gov/), [Space Radiation](https://www.nasa.gov/hrp/space-radiation/), [Behavioral Health & Performance](https://www.nasa.gov/hrp/behavioral-health-and-performance/). Reference ranges are terrestrial; warn/critical bands and the 120 mSv radiation budget are illustrative demo values, **not NASA-approved thresholds**.

## Structure
`js/data.js` metrics & scenarios · `js/content.js` medical content · `js/engine.js` status/risk/investigation logic · `js/anatomy.js` software 3D renderer · `js/view-*.js` tabs · `js/app.js` shell.

## Refinement update
- Muted space palette with complete **light and dark themes** (toggle in the header, remembered between visits).
- Subtle spacecraft-window background, simplified on phones and with reduced motion.
- Anatomy: quiet defaults, hover/tap highlight with tooltip, click for details.
- Healthy scenario now shows an all-clear view; stale selections are cleared when switching scenarios.
- **Animated 2D exercise demonstrations** (Spaceflight hazards → Gravity fields → "Watch demo") with play, pause, replay and speed.
- Glossary tooltips for scientific terms.
- `astra-standalone.html` is a single-file build that works when opened directly from a phone file manager.

## Mind & focus tab
A fifth tab with three one-minute duties ported from the DEEPWATCH game: **Moths** (vigilance), **Charts** (2-back working memory) and **Flags** (go / no-go impulse control). Results are scored against a simulated reference and turned into **Focus**, **Impulse control**, a **Cognitive index** and a plain-language **Mental state** (Steady / Strained / Struggling / Needs support now). Once all three duties are kept, the cognitive index feeds the Nervous system on the Overview. All formulas and thresholds are shown in the tab ("How this is calculated") and live in `js/view-mind.js`. No AI or machine learning; the read-out is a screen, not a diagnosis.

## Lighthouse (Overview, above the anatomy)
An animated coastal scene driven by the same assessment as the anatomy (`AS.Model.overall` and `AS.U.STATUS`): green lamp, clear sky and calm sea when healthy; yellow lamp, clouds, wind and rougher water when abnormal; red lamp, storm, rain, lightning and heavy seas when critical. Severity eases gradually between scenarios. Affected-system chips under the scene select the matching system in the anatomy. See `js/lighthouse.js`.
