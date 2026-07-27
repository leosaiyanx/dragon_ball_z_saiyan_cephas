/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — core
   Namespace, math, device detection, persistent save, settings.
   Everything hangs off the single global `DBZ`.
   ==========================================================================*/
var DBZ = (function () {
  'use strict';

  var C = {};

  C.VERSION = '1.0.0';
  C.TITLE = 'Dragon Ball Z: Saiyan Cephas';

  /* ---------------------------------------------------------------- math */
  var M = {};
  C.M = M;

  M.PI2 = Math.PI * 2;
  M.DEG = Math.PI / 180;

  M.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
  M.sat = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };
  M.lerp = function (a, b, t) { return a + (b - a) * t; };
  M.mix = M.lerp;

  /* frame-rate independent exponential approach. rate = "how fast", dt secs */
  M.damp = function (a, b, rate, dt) {
    return b + (a - b) * Math.exp(-rate * dt);
  };

  M.smoothstep = function (e0, e1, x) {
    var t = M.sat((x - e0) / (e1 - e0 || 1e-6));
    return t * t * (3 - 2 * t);
  };

  M.approach = function (a, b, step) {
    if (a < b) return Math.min(a + step, b);
    return Math.max(a - step, b);
  };

  /* shortest signed difference between two angles */
  M.angDelta = function (a, b) {
    var d = (b - a) % M.PI2;
    if (d > Math.PI) d -= M.PI2;
    if (d < -Math.PI) d += M.PI2;
    return d;
  };

  M.wrapAngle = function (a) {
    a = a % M.PI2;
    if (a > Math.PI) a -= M.PI2;
    if (a < -Math.PI) a += M.PI2;
    return a;
  };

  M.dampAngle = function (a, b, rate, dt) {
    return a + M.angDelta(a, b) * (1 - Math.exp(-rate * dt));
  };

  M.rand = function (a, b) {
    if (a === undefined) return Math.random();
    if (b === undefined) { b = a; a = 0; }
    return a + Math.random() * (b - a);
  };

  M.randInt = function (a, b) { return Math.floor(M.rand(a, b + 1)); };

  M.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };

  M.shuffle = function (arr, rng) {
    rng = rng || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  /* deterministic RNG — used for stage decoration and tournament brackets */
  M.seeded = function (seed) {
    var a = (seed | 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* value noise, handy for aura wobble and terrain */
  M.hash1 = function (n) {
    var s = Math.sin(n) * 43758.5453123;
    return s - Math.floor(s);
  };

  M.noise1 = function (x) {
    var i = Math.floor(x), f = x - i;
    var u = f * f * (3 - 2 * f);
    return M.lerp(M.hash1(i), M.hash1(i + 1), u) * 2 - 1;
  };

  M.noise2 = function (x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function h(a, b) { return M.hash1(a * 127.1 + b * 311.7); }
    var a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return M.lerp(M.lerp(a, b, u), M.lerp(c, d, u), v) * 2 - 1;
  };

  M.fbm2 = function (x, y, oct) {
    var s = 0, amp = 0.5, f = 1;
    for (var i = 0; i < (oct || 4); i++) {
      s += M.noise2(x * f, y * f) * amp;
      amp *= 0.5; f *= 2.03;
    }
    return s;
  };

  /* easing */
  M.easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  M.easeIn = function (t) { return t * t * t; };
  M.easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  M.easeOutBack = function (t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  M.easeOutElastic = function (t) {
    if (t <= 0) return 0; if (t >= 1) return 1;
    var c4 = M.PI2 / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };
  M.pulse = function (t, w) { return Math.exp(-((t / (w || 0.2)) * (t / (w || 0.2)))); };

  /* ------------------------------------------------------------ formatting */
  C.fmtTime = function (sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  };

  C.fmtNum = function (n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  C.romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

  /* --------------------------------------------------------------- device */
  var D = {};
  C.device = D;

  D.touch = (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  D.coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  D.mobile = /android|iphone|ipad|ipod|mobile|silk/i.test(navigator.userAgent) ||
    (D.touch && D.coarse);
  D.ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  D.standalone = !!(window.matchMedia &&
    window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) ||
    !!window.navigator.standalone;
  D.cores = navigator.hardwareConcurrency || 4;
  D.mem = navigator.deviceMemory || 4;

  /* rough performance tier 0..2 — picks default graphics quality */
  D.tier = (function () {
    if (D.mobile) return (D.cores >= 6 && D.mem >= 4) ? 1 : 0;
    if (D.cores >= 8 && D.mem >= 8) return 2;
    return 1;
  })();

  /* ----------------------------------------------------------------- save */
  var KEY = 'dbz-saiyan-cephas-v1';

  var DEFAULT_SAVE = {
    settings: {
      quality: ['low', 'medium', 'high'][D.tier],
      bloom: D.tier > 0,
      shadows: D.tier > 0,
      particles: D.tier > 0 ? 1 : 0.5,
      shake: 1,
      music: 0.55,
      sfx: 0.8,
      voice: true,
      difficulty: 'warrior',       /* default for age 8-11 */
      assistAim: true,             /* auto-face the locked target */
      assistCombo: true,           /* hold attack to keep the combo going */
      assistRecover: true,         /* auto-recover from knockdowns */
      damageNumbers: true,
      hudScale: 1,
      invertY: false,
      sensitivity: 1,
      camDist: 1,
      lang: 'en'
    },
    progress: {
      story: {},                 /* sagaId -> { cleared:[idx], best:{} } */
      unlocked: {},              /* charId -> true */
      zeni: 0,
      wins: 0, losses: 0, matches: 0,
      bestSurvival: 0,
      tournamentsWon: 0,
      seenIntro: false,
      totalKo: 0,
      playtime: 0
    },
    favorites: [],
    lastUsed: 'goku'
  };

  function deepDefault(target, defaults) {
    for (var k in defaults) {
      if (!Object.prototype.hasOwnProperty.call(defaults, k)) continue;
      var d = defaults[k];
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        if (typeof target[k] !== 'object' || target[k] === null) target[k] = {};
        deepDefault(target[k], d);
      } else if (target[k] === undefined) {
        target[k] = Array.isArray(d) ? d.slice() : d;
      }
    }
    return target;
  }

  var save = null;

  C.load = function () {
    if (save) return save;
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
    var obj = {};
    if (raw) { try { obj = JSON.parse(raw) || {}; } catch (e) { obj = {}; } }
    save = deepDefault(obj, DEFAULT_SAVE);
    return save;
  };

  var saveTimer = 0;
  C.save = function (now) {
    C.load();
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; }
    if (!now) { saveTimer = setTimeout(function () { C.save(true); }, 400); return; }
    try { window.localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ }
  };

  C.resetSave = function () {
    try { window.localStorage.removeItem(KEY); } catch (e) { }
    save = null;
    return C.load();
  };

  Object.defineProperty(C, 'S', { get: function () { return C.load().settings; } });
  Object.defineProperty(C, 'P', { get: function () { return C.load().progress; } });

  /* ------------------------------------------------------------- difficulty
     Five tiers. `aggro` biases the AI toward offence, `react` is how many
     seconds it needs before it can answer something (lower = scarier),
     `dmgIn/dmgOut` scale damage to and from the player.               */
  C.DIFFICULTY = {
    rookie: {
      id: 'rookie', name: 'Rookie', kanji: '弱', color: '#5fd97a', rank: 0,
      aggro: 0.30, react: 0.65, skill: 0.20, dmgIn: 0.30, dmgOut: 1.55,
      kiRegen: 0.7, comboLen: 2, vanish: 0.05, guard: 0.25,
      blurb: 'Gentle sparring partners. Great for learning the moves.'
    },
    warrior: {
      id: 'warrior', name: 'Warrior', kanji: '戦', color: '#67c8ff', rank: 1,
      aggro: 0.54, react: 0.40, skill: 0.48, dmgIn: 0.68, dmgOut: 1.18,
      kiRegen: 1.0, comboLen: 3, vanish: 0.18, guard: 0.45,
      blurb: 'A real fight, but it forgives mistakes. Recommended.'
    },
    elite: {
      id: 'elite', name: 'Elite', kanji: '精', color: '#ffb545', rank: 2,
      aggro: 0.72, react: 0.26, skill: 0.72, dmgIn: 1.0, dmgOut: 0.9,
      kiRegen: 1.2, comboLen: 4, vanish: 0.34, guard: 0.6,
      blurb: 'Punishes sloppy combos and blocks on reaction.'
    },
    supersaiyan: {
      id: 'supersaiyan', name: 'Super Saiyan', kanji: '超', color: '#ffe14d', rank: 3,
      aggro: 0.85, react: 0.18, skill: 0.88, dmgIn: 1.2, dmgOut: 0.78,
      kiRegen: 1.45, comboLen: 5, vanish: 0.5, guard: 0.72,
      blurb: 'Relentless pressure, beam duels, real combo routes.'
    },
    legendary: {
      id: 'legendary', name: 'Legendary', kanji: '伝', color: '#ff5a7a', rank: 4,
      aggro: 0.95, react: 0.12, skill: 1.0, dmgIn: 1.45, dmgOut: 0.66,
      kiRegen: 1.8, comboLen: 6, vanish: 0.68, guard: 0.82,
      blurb: 'Reads you. Vanishes through combos. You have been warned.'
    }
  };
  C.DIFF_ORDER = ['rookie', 'warrior', 'elite', 'supersaiyan', 'legendary'];

  C.diff = function (id) { return C.DIFFICULTY[id] || C.DIFFICULTY.warrior; };

  /* -------------------------------------------------------------- palettes */
  C.PAL = {
    ki: {
      blue: 0x59c8ff, white: 0xffffff, yellow: 0xffe14d, gold: 0xffb020,
      purple: 0xb46bff, red: 0xff4d5a, green: 0x63ff9a, pink: 0xff7ad9,
      orange: 0xff8a3d, cyan: 0x5ffff0, crimson: 0xff2246, violet: 0x8f5cff,
      black: 0x6a3fb5, silver: 0xd8e6ff
    }
  };

  /* --------------------------------------------------------------- events */
  C.bus = (function () {
    var map = {};
    return {
      on: function (name, fn) { (map[name] = map[name] || []).push(fn); return fn; },
      off: function (name, fn) {
        var a = map[name]; if (!a) return;
        var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
      },
      emit: function (name, arg) {
        var a = map[name]; if (!a) return;
        for (var i = 0; i < a.length; i++) { try { a[i](arg); } catch (e) { console.error(e); } }
      }
    };
  })();

  /* ------------------------------------------------------------ tiny pool */
  C.Pool = function (make, reset) {
    this.make = make; this.reset = reset; this.free = []; this.live = [];
  };
  C.Pool.prototype.get = function () {
    var o = this.free.pop();
    if (!o) o = this.make();
    this.live.push(o);
    return o;
  };
  C.Pool.prototype.release = function (o) {
    var i = this.live.indexOf(o);
    if (i >= 0) this.live.splice(i, 1);
    if (this.reset) this.reset(o);
    this.free.push(o);
  };
  C.Pool.prototype.releaseAll = function () {
    while (this.live.length) this.release(this.live[this.live.length - 1]);
  };

  /* ------------------------------------------------------- scratch vectors
     Reused every frame so the hot loop never allocates.                   */
  C.tmp = {};
  C.initTmp = function () {
    if (C.tmp.v0) return;
    C.tmp.v0 = new THREE.Vector3(); C.tmp.v1 = new THREE.Vector3();
    C.tmp.v2 = new THREE.Vector3(); C.tmp.v3 = new THREE.Vector3();
    C.tmp.v4 = new THREE.Vector3(); C.tmp.v5 = new THREE.Vector3();
    C.tmp.q0 = new THREE.Quaternion(); C.tmp.q1 = new THREE.Quaternion();
    C.tmp.m0 = new THREE.Matrix4();
    C.tmp.c0 = new THREE.Color(); C.tmp.c1 = new THREE.Color();
    C.tmp.e0 = new THREE.Euler();
  };

  /* ------------------------------------------------------------ debug flag */
  var qs = {};
  (window.location.search || '').replace(/^\?/, '').split('&').forEach(function (p) {
    if (!p) return;
    var kv = p.split('=');
    qs[decodeURIComponent(kv[0])] = kv.length > 1 ? decodeURIComponent(kv[1]) : '1';
  });
  C.qs = qs;
  C.debug = qs.debug === '1';

  return C;
})();
