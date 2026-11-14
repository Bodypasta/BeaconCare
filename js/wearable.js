/* BeaconCare – smart-band data layer.
   • By default a clearly-labelled SIMULATED stream is produced from the active demo scenario.
   • Optional real device: any BLE Heart Rate Service band via Web Bluetooth (Chrome/Edge over HTTPS or localhost).
     Only heart rate is read from a real device; every other channel stays labelled SIMULATED.
   Integration point for further devices: add a source to `sources` and set `src[key]` + `ble[key]`. */
(function () {
  const AS = (window.AS = window.AS || {});
  const { clamp } = AS.U;
  const KEYS = ['hr', 'sbp', 'dbp', 'spo2', 'temp', 'rr', 'hrv'];
  const AMP = { sbp: 2.2, dbp: 1.4, spo2: 0.3, temp: 0.04, rr: 0.5, hrv: 2.2 };

  const Band = {
    readings: {}, hist: {}, src: {}, device: null, ble: {}, lastBle: 0, n: 0, timer: null, wearTick: 0,
    base: {},
    reset() {
      const m = AS.Model, rec = m.recs[m.N - 1], sc = m.sc; this.base = {};
      KEYS.forEach((k) => { this.base[k] = rec[k]; this.src[k] = k === 'hr' && this.device && Date.now() - this.lastBle < 15000 ? 'live' : 'sim'; this.hist[k] = []; });
      this.sc = sc; this.rec = rec;
      for (let i = 0; i < 40; i++) this.step(-((40 - i) * 2000));
      this.n = 0;
    },
    step(dtMs) {
      const t = (Date.now() + (dtMs || 0)) / 1000, sc = this.sc, ts = Date.now() + (dtMs || 0);
      KEYS.forEach((k) => {
        let v = this.base[k];
        if (k === 'hr') { const j = sc.live.hrJitter; v += j * 0.6 * Math.sin(t / 6.5) + (Math.random() - 0.5) * j; if (sc.live.irregular) v += (Math.random() - 0.5) * 16 * (Math.random() < 0.3 ? 1.6 : 0.5); }
        else v += AMP[k] * (0.6 * Math.sin(t / 8 + k.length) + (Math.random() - 0.5) * 0.8);
        if (k === 'hr' && this.device && Date.now() - this.lastBle < 15000 && this.ble.hr) { v = this.ble.hr; this.src.hr = 'live'; } else this.src[k] = 'sim';
        if (k === 'spo2') v = Math.min(100, v);
        this.readings[k] = { v, ts };
        const h = this.hist[k]; h.push(v); if (h.length > 40) h.shift();
      });
    },
    /* smoothed values (mean of the last 3 readings) used for status evaluation so statuses do not flicker */
    live() { const o = {}; KEYS.forEach((k) => { const h = this.hist[k].slice(-3); o[k] = h.reduce((s, x) => s + x, 0) / h.length; }); return o; },
    activity() {
      const st = AS.Store.get().settings, wake = AS.Clock.parse(st.wake), sl = AS.Clock.parse(st.sleep), now = AS.Clock.minutes(), frac = clamp((now - wake) / (sl - wake), 0, 1), r = this.rec;
      return { steps: Math.round(r.steps * frac), exMin: Math.round(r.exMin * frac), resMin: Math.round(r.resMin * frac), sleepH: r.sleepH, sleepQ: r.sleepQ, wake: r.wake, frac };
    },
    start() {
      if (this.timer) return; this.reset();
      this.timer = setInterval(() => {
        this.step(0); this.n++;
        const changed = AS.Engine.update(this.live());
        AS.emit('tick'); if (changed) AS.emit('model-live');
        if (++this.wearTick % 15 === 0) { const u = AS.Store.user(); u.wear.push({ ts: Date.now(), hr: +this.readings.hr.v.toFixed(0), spo2: +this.readings.spo2.v.toFixed(1), sbp: Math.round(this.readings.sbp.v), dbp: Math.round(this.readings.dbp.v), temp: +this.readings.temp.v.toFixed(1), rr: Math.round(this.readings.rr.v), src: this.src.hr }); if (u.wear.length > 200) u.wear.shift(); AS.Store.save(); }
      }, 2000);
    },
    supported: () => !!(navigator.bluetooth),
    async connect() {
      if (!navigator.bluetooth) throw new Error('Web Bluetooth is not available in this browser. Use Chrome or Edge (desktop or Android) over HTTPS.');
      const dev = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
      const server = await dev.gatt.connect(), svc = await server.getPrimaryService('heart_rate'), ch = await svc.getCharacteristic('heart_rate_measurement');
      await ch.startNotifications();
      ch.addEventListener('characteristicvaluechanged', (e) => { const v = e.target.value, f = v.getUint8(0); this.ble.hr = f & 1 ? v.getUint16(1, true) : v.getUint8(1); this.lastBle = Date.now(); });
      dev.addEventListener('gattserverdisconnected', () => { this.device = null; this.ble = {}; AS.emit('device'); });
      this.device = dev; this.lastBle = Date.now(); AS.emit('device'); return dev;
    },
    disconnect() { try { if (this.device && this.device.gatt.connected) this.device.gatt.disconnect(); } catch (e) { /* */ } this.device = null; this.ble = {}; AS.emit('device'); },
  };
  AS.Band = Band;
})();
