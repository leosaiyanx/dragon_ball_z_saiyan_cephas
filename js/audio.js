/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — sound

   Every sound in this game is synthesised at runtime: impacts, ki charge,
   beams, explosions, and a driving rock soundtrack from a step sequencer.
   Nothing is downloaded, so the game works with no network at all.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M;
  var A = {};
  C.Audio = A;

  var ctx = null, master = null, musicGain = null, sfxGain = null, comp = null;
  var noiseBuf = null;
  var started = false;

  A.ready = false;

  A.init = function () {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 24;
    comp.ratio.value = 8;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);
    comp.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = C.S.music;
    musicGain.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = C.S.sfx;
    sfxGain.connect(master);

    /* one second of white noise, reused everywhere */
    var n = ctx.sampleRate * 1.2;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    var data = noiseBuf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;

    A.ready = true;
    return true;
  };

  A.resume = function () {
    if (!ctx) A.init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    started = true;
  };

  A.setVolumes = function () {
    if (!ctx) return;
    musicGain.gain.setTargetAtTime(C.S.music, ctx.currentTime, 0.05);
    sfxGain.gain.setTargetAtTime(C.S.sfx, ctx.currentTime, 0.05);
  };

  /* ------------------------------------------------------------- helpers */
  function now() { return ctx.currentTime; }

  function env(node, t0, a, d, s, r, peak, sus) {
    var g = node.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + a);
    g.exponentialRampToValueAtTime(Math.max(0.0001, sus === undefined ? peak * s : sus), t0 + a + d);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + d + r);
  }

  function osc(type, freq, t0, dur, gain, dest, detune) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (detune) o.detune.value = detune;
    var g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.06);
    return { o: o, g: g };
  }

  function noise(t0, dur, gain, dest) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.5;
    var g = ctx.createGain();
    g.gain.value = 0;
    s.connect(g); g.connect(dest || sfxGain);
    s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
    return { s: s, g: g };
  }

  function filt(type, freq, q) {
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  }

  /* keep the mix from turning to mud in a big fight */
  var budget = { n: 0, t: 0 };
  function canPlay(cost) {
    var t = ctx.currentTime;
    if (t - budget.t > 0.05) { budget.t = t; budget.n = 0; }
    if (budget.n > 9) return false;
    budget.n += cost || 1;
    return true;
  }

  /* ================================ SFX ================================= */
  A.sfx = function (name, opt) {
    if (!ctx || !started || C.S.sfx <= 0) return;
    opt = opt || {};
    var t = now();
    var vol = opt.vol === undefined ? 1 : opt.vol;
    var pitch = opt.pitch === undefined ? 1 : opt.pitch;

    switch (name) {
      case 'hit': {
        if (!canPlay()) return;
        var lp = filt('lowpass', 1400 * pitch, 1);
        lp.connect(sfxGain);
        var n1 = noise(t, 0.10, 1, lp);
        env(n1.g, t, 0.002, 0.03, 0.1, 0.07, 0.55 * vol);
        var o1 = osc('sine', 150 * pitch, t, 0.12, 1, sfxGain);
        o1.o.frequency.exponentialRampToValueAtTime(52 * pitch, t + 0.11);
        env(o1.g, t, 0.002, 0.03, 0.2, 0.08, 0.7 * vol);
        break;
      }
      case 'smash': {
        if (!canPlay(2)) return;
        var lp2 = filt('lowpass', 900, 1.5);
        lp2.connect(sfxGain);
        var n2 = noise(t, 0.35, 1, lp2);
        env(n2.g, t, 0.003, 0.10, 0.2, 0.24, 0.85 * vol);
        lp2.frequency.setValueAtTime(2600, t);
        lp2.frequency.exponentialRampToValueAtTime(180, t + 0.32);
        var o2 = osc('sine', 190, t, 0.4, 1, sfxGain);
        o2.o.frequency.exponentialRampToValueAtTime(38, t + 0.34);
        env(o2.g, t, 0.003, 0.09, 0.25, 0.26, 1.0 * vol);
        break;
      }
      case 'guard': {
        if (!canPlay()) return;
        var bp = filt('bandpass', 2400 * pitch, 6);
        bp.connect(sfxGain);
        var n3 = noise(t, 0.14, 1, bp);
        env(n3.g, t, 0.002, 0.05, 0.1, 0.09, 0.45 * vol);
        var o3 = osc('triangle', 640 * pitch, t, 0.16, 1, sfxGain);
        o3.o.frequency.exponentialRampToValueAtTime(320, t + 0.14);
        env(o3.g, t, 0.002, 0.04, 0.2, 0.1, 0.28 * vol);
        break;
      }
      case 'swing': {
        if (!canPlay(0.5)) return;
        var bp2 = filt('bandpass', 1100 + Math.random() * 800, 2.4);
        bp2.connect(sfxGain);
        var n4 = noise(t, 0.14, 1, bp2);
        bp2.frequency.exponentialRampToValueAtTime(320, t + 0.13);
        env(n4.g, t, 0.012, 0.05, 0.2, 0.07, 0.22 * vol);
        break;
      }
      case 'kishot': {
        if (!canPlay()) return;
        var o5 = osc('sawtooth', 900 * pitch, t, 0.22, 1, sfxGain);
        var lp5 = filt('lowpass', 3200, 4);
        o5.o.disconnect(); o5.o.connect(lp5); lp5.connect(o5.g);
        o5.o.frequency.exponentialRampToValueAtTime(180 * pitch, t + 0.20);
        lp5.frequency.exponentialRampToValueAtTime(400, t + 0.2);
        env(o5.g, t, 0.004, 0.05, 0.15, 0.14, 0.30 * vol);
        break;
      }
      case 'beam': {
        var dur = opt.dur || 1.0;
        var lp6 = filt('lowpass', 1800, 2);
        lp6.connect(sfxGain);
        var n6 = noise(t, dur, 1, lp6);
        env(n6.g, t, 0.05, 0.1, 0.8, dur * 0.5, 0.42 * vol, 0.30 * vol);
        var o6 = osc('sawtooth', 120, t, dur, 1, lp6);
        o6.o.frequency.setValueAtTime(90, t);
        o6.o.frequency.exponentialRampToValueAtTime(220, t + dur * 0.4);
        env(o6.g, t, 0.06, 0.2, 0.7, dur * 0.5, 0.30 * vol, 0.20 * vol);
        lp6.frequency.setValueAtTime(600, t);
        lp6.frequency.exponentialRampToValueAtTime(4200, t + 0.25);
        lp6.frequency.exponentialRampToValueAtTime(900, t + dur);
        break;
      }
      case 'charge': {
        /* a looping bed started and stopped explicitly */
        if (A._chargeNode) return;
        var lp7 = filt('lowpass', 700, 3);
        lp7.connect(sfxGain);
        var n7 = noise(t, 60, 1, lp7);
        n7.g.gain.setValueAtTime(0.0001, t);
        n7.g.gain.exponentialRampToValueAtTime(0.28, t + 0.20);
        var o7 = osc('sawtooth', 70, t, 60, 1, lp7);
        o7.g.gain.setValueAtTime(0.0001, t);
        o7.g.gain.exponentialRampToValueAtTime(0.16, t + 0.25);
        o7.o.frequency.setValueAtTime(60, t);
        o7.o.frequency.linearRampToValueAtTime(190, t + 5);
        lp7.frequency.setValueAtTime(340, t);
        lp7.frequency.linearRampToValueAtTime(2400, t + 5);
        A._chargeNode = { n: n7, o: o7, lp: lp7 };
        break;
      }
      case 'chargeStop': {
        if (!A._chargeNode) return;
        var cn = A._chargeNode;
        A._chargeNode = null;
        try {
          cn.n.g.gain.cancelScheduledValues(t);
          cn.n.g.gain.setValueAtTime(cn.n.g.gain.value, t);
          cn.n.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
          cn.o.g.gain.cancelScheduledValues(t);
          cn.o.g.gain.setValueAtTime(cn.o.g.gain.value, t);
          cn.o.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
          cn.n.s.stop(t + 0.2); cn.o.o.stop(t + 0.2);
        } catch (e) { }
        break;
      }
      case 'explode': {
        if (!canPlay(2)) return;
        var lp8 = filt('lowpass', 3000, 1);
        lp8.connect(sfxGain);
        var d8 = 0.5 + (opt.size || 1) * 0.22;
        var n8 = noise(t, d8, 1, lp8);
        env(n8.g, t, 0.004, 0.12, 0.3, d8 * 0.8, 0.9 * vol);
        lp8.frequency.setValueAtTime(3600, t);
        lp8.frequency.exponentialRampToValueAtTime(90, t + d8);
        var o8 = osc('sine', 110, t, d8, 1, sfxGain);
        o8.o.frequency.exponentialRampToValueAtTime(26, t + d8 * 0.8);
        env(o8.g, t, 0.004, 0.15, 0.2, d8 * 0.7, 1.0 * vol);
        break;
      }
      case 'transform': {
        var lp9 = filt('lowpass', 1200, 3);
        lp9.connect(sfxGain);
        var n9 = noise(t, 1.5, 1, lp9);
        env(n9.g, t, 0.35, 0.25, 0.5, 0.7, 0.75 * vol);
        lp9.frequency.setValueAtTime(300, t);
        lp9.frequency.exponentialRampToValueAtTime(6000, t + 0.7);
        lp9.frequency.exponentialRampToValueAtTime(700, t + 1.5);
        var o9 = osc('sawtooth', 60, t, 1.4, 1, sfxGain);
        o9.o.frequency.exponentialRampToValueAtTime(420, t + 0.72);
        o9.o.frequency.exponentialRampToValueAtTime(120, t + 1.4);
        env(o9.g, t, 0.25, 0.3, 0.6, 0.7, 0.4 * vol);
        A.sfxAt('explode', t + 0.62, { vol: 0.9, size: 2 });
        break;
      }
      case 'vanish': {
        if (!canPlay()) return;
        var oA = osc('sine', 1800, t, 0.2, 1, sfxGain);
        oA.o.frequency.exponentialRampToValueAtTime(320, t + 0.18);
        env(oA.g, t, 0.003, 0.05, 0.1, 0.12, 0.32 * vol);
        var bpA = filt('bandpass', 3200, 4); bpA.connect(sfxGain);
        var nA = noise(t, 0.16, 1, bpA);
        env(nA.g, t, 0.004, 0.05, 0.1, 0.1, 0.28 * vol);
        break;
      }
      case 'dash': {
        if (!canPlay(0.5)) return;
        var bpB = filt('bandpass', 700, 1.6); bpB.connect(sfxGain);
        var nB = noise(t, 0.3, 1, bpB);
        bpB.frequency.setValueAtTime(300, t);
        bpB.frequency.exponentialRampToValueAtTime(2400, t + 0.18);
        env(nB.g, t, 0.02, 0.08, 0.3, 0.18, 0.30 * vol);
        break;
      }
      case 'ko': {
        var oC = osc('sawtooth', 420, t, 1.0, 1, sfxGain);
        oC.o.frequency.exponentialRampToValueAtTime(48, t + 0.9);
        env(oC.g, t, 0.01, 0.2, 0.4, 0.6, 0.5 * vol);
        A.sfxAt('explode', t + 0.05, { vol: 1, size: 2.5 });
        break;
      }
      case 'struggle': {
        var lpD = filt('lowpass', 900, 2); lpD.connect(sfxGain);
        var nD = noise(t, 0.6, 1, lpD);
        env(nD.g, t, 0.05, 0.1, 0.7, 0.4, 0.5 * vol, 0.35 * vol);
        break;
      }
      case 'blip': {
        var oE = osc('square', 720 * pitch, t, 0.07, 1, sfxGain);
        env(oE.g, t, 0.002, 0.02, 0.1, 0.04, 0.16 * vol);
        break;
      }
      case 'confirm': {
        [660, 990].forEach(function (f, i) {
          var oF = osc('square', f, t + i * 0.06, 0.14, 1, sfxGain);
          env(oF.g, t + i * 0.06, 0.004, 0.03, 0.3, 0.09, 0.16 * vol);
        });
        break;
      }
      case 'cancel': {
        var oG = osc('square', 420, t, 0.14, 1, sfxGain);
        oG.o.frequency.exponentialRampToValueAtTime(210, t + 0.12);
        env(oG.g, t, 0.004, 0.03, 0.3, 0.08, 0.14 * vol);
        break;
      }
      case 'cheer': {
        var lpH = filt('bandpass', 1100, 0.8); lpH.connect(sfxGain);
        var nH = noise(t, 2.2, 1, lpH);
        env(nH.g, t, 0.35, 0.5, 0.6, 1.2, 0.30 * vol, 0.18 * vol);
        break;
      }
      case 'fanfare': {
        [523, 659, 784, 1047].forEach(function (f, i) {
          var oI = osc('square', f, t + i * 0.11, 0.34, 1, sfxGain);
          env(oI.g, t + i * 0.11, 0.01, 0.06, 0.5, 0.25, 0.18 * vol);
          var oJ = osc('triangle', f / 2, t + i * 0.11, 0.34, 1, sfxGain);
          env(oJ.g, t + i * 0.11, 0.01, 0.06, 0.5, 0.25, 0.14 * vol);
        });
        break;
      }
      case 'powerup': {
        var oK = osc('square', 300, t, 0.5, 1, sfxGain);
        oK.o.frequency.exponentialRampToValueAtTime(1400, t + 0.42);
        env(oK.g, t, 0.01, 0.1, 0.4, 0.24, 0.20 * vol);
        break;
      }
      case 'slam': {
        if (!canPlay(2)) return;
        var lpL = filt('lowpass', 400, 1.2); lpL.connect(sfxGain);
        var nL = noise(t, 0.6, 1, lpL);
        env(nL.g, t, 0.004, 0.14, 0.2, 0.4, 0.8 * vol);
        var oL = osc('sine', 90, t, 0.5, 1, sfxGain);
        oL.o.frequency.exponentialRampToValueAtTime(28, t + 0.44);
        env(oL.g, t, 0.004, 0.1, 0.2, 0.35, 1.0 * vol);
        break;
      }
    }
  };

  A.sfxAt = function (name, when, opt) {
    if (!ctx) return;
    var delay = Math.max(0, (when - ctx.currentTime) * 1000);
    setTimeout(function () { A.sfx(name, opt); }, delay);
  };

  /* ================================ music ===============================
     A tiny step sequencer. Each track is bass + chords + lead + drums over
     a repeating chord progression, played with square/saw voices.        */
  var NOTE = {};
  (function () {
    var names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (var o = 0; o <= 7; o++) {
      for (var i = 0; i < 12; i++) {
        NOTE[names[i] + o] = 440 * Math.pow(2, ((o - 4) * 12 + i - 9) / 12);
      }
    }
  })();

  function nf(n) { return NOTE[n] || 0; }

  /* progressions written as root notes; the lead riffs sit on top */
  var TRACKS = {
    menu: {
      bpm: 96, swing: 0.06,
      prog: ['A2', 'F2', 'C3', 'G2'],
      lead: [0, 3, 7, 10, 12, 10, 7, 3],
      leadOct: 2, drums: 'soft', lead2: [12, 15, 19, 15],
      pad: true, bassPat: [1, 0, 1, 0, 1, 0, 1, 1]
    },
    battle1: {
      bpm: 152, swing: 0,
      prog: ['E2', 'E2', 'G2', 'D2'],
      lead: [0, 0, 3, 5, 7, 5, 3, 0, 0, 3, 7, 10, 12, 10, 7, 5],
      leadOct: 2, drums: 'rock', lead2: null,
      bassPat: [1, 1, 0, 1, 1, 0, 1, 0]
    },
    battle2: {
      bpm: 168, swing: 0,
      prog: ['D2', 'F2', 'C2', 'G2'],
      lead: [0, 5, 7, 12, 10, 7, 5, 3, 0, 3, 5, 7, 10, 12, 15, 12],
      leadOct: 2, drums: 'rock', bassPat: [1, 1, 1, 0, 1, 1, 0, 1]
    },
    battle3: {
      bpm: 176, swing: 0,
      prog: ['A2', 'C3', 'G2', 'F2'],
      lead: [12, 10, 7, 10, 12, 15, 14, 12, 7, 10, 12, 14, 15, 17, 15, 12],
      leadOct: 2, drums: 'rock', bassPat: [1, 0, 1, 1, 1, 0, 1, 1]
    },
    boss: {
      bpm: 186, swing: 0,
      prog: ['C2', 'C2', 'A#1', 'G#1'],
      lead: [0, 1, 3, 1, 0, 3, 6, 3, 0, 1, 3, 6, 8, 6, 3, 1],
      leadOct: 2, drums: 'heavy', bassPat: [1, 1, 1, 1, 1, 1, 1, 1],
      dark: true
    },
    victory: {
      bpm: 128, swing: 0,
      prog: ['C3', 'G2', 'A2', 'F2'],
      lead: [12, 12, 14, 16, 17, 16, 14, 12],
      leadOct: 2, drums: 'soft', pad: true, bassPat: [1, 0, 1, 0, 1, 1, 0, 1]
    }
  };

  var seq = {
    track: null, step: 0, next: 0, timer: 0, playing: false, id: null
  };

  function drumKick(t, v) {
    var o = osc('sine', 130, t, 0.28, 1, musicGain);
    o.o.frequency.exponentialRampToValueAtTime(38, t + 0.13);
    env(o.g, t, 0.002, 0.05, 0.2, 0.16, 0.85 * v);
  }
  function drumSnare(t, v) {
    var bp = filt('bandpass', 1900, 1.1); bp.connect(musicGain);
    var n = noise(t, 0.2, 1, bp);
    env(n.g, t, 0.002, 0.04, 0.15, 0.12, 0.42 * v);
    var o = osc('triangle', 220, t, 0.14, 1, musicGain);
    env(o.g, t, 0.002, 0.03, 0.1, 0.07, 0.18 * v);
  }
  function drumHat(t, v, open) {
    var hp = filt('highpass', 7200, 1); hp.connect(musicGain);
    var n = noise(t, open ? 0.18 : 0.05, 1, hp);
    env(n.g, t, 0.001, open ? 0.08 : 0.02, 0.1, open ? 0.1 : 0.03, 0.14 * v);
  }

  function playVoice(type, freq, t, dur, gain, cut, q) {
    var lp = filt('lowpass', cut || 2600, q || 1);
    lp.connect(musicGain);
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    var g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g); g.connect(lp);
    o.start(t); o.stop(t + dur + 0.08);
    env(g, t, 0.008, dur * 0.35, 0.55, dur * 0.6, gain);
    return o;
  }

  function schedule(track, step, t) {
    var bar = Math.floor(step / 16) % track.prog.length;
    var root = nf(track.prog[bar]);
    var s16 = step % 16;
    var s8 = step % 8;
    var v = 1;

    /* drums */
    if (track.drums === 'rock' || track.drums === 'heavy') {
      if (s16 % 8 === 0 || s16 === 6 || (track.drums === 'heavy' && s16 % 4 === 0)) drumKick(t, v);
      if (s16 % 8 === 4) drumSnare(t, v);
      drumHat(t, s16 % 2 ? 0.5 : 0.85, s16 % 8 === 7);
      if (track.drums === 'heavy' && s16 === 14) drumSnare(t, 0.7);
    } else if (track.drums === 'soft') {
      if (s16 % 8 === 0) drumKick(t, 0.6);
      if (s16 % 16 === 8) drumSnare(t, 0.5);
      if (s16 % 4 === 2) drumHat(t, 0.35);
    }

    /* bass */
    if (track.bassPat[s8]) {
      playVoice('sawtooth', root / 2, t, 0.16, 0.20, 700, 3);
      playVoice('square', root / 2, t, 0.16, 0.10, 400, 2);
    }

    /* chord stabs on the off-beats */
    if (s16 % 4 === 2) {
      [0, 7, 12].forEach(function (iv) {
        playVoice('square', root * Math.pow(2, iv / 12), t, 0.12, 0.055, 1800, 1);
      });
    }
    if (track.pad && s16 === 0) {
      [0, 4, 7].forEach(function (iv, i) {
        playVoice('triangle', root * Math.pow(2, iv / 12) * 2, t, 1.6, 0.05, 1400, 1);
      });
    }

    /* lead */
    var li = step % track.lead.length;
    var semi = track.lead[li];
    if (semi !== null && semi !== undefined && (step % 2 === 0 || track.bpm > 160)) {
      var f = root * Math.pow(2, (semi + track.leadOct * 12) / 12);
      playVoice(track.dark ? 'sawtooth' : 'square', f, t, 0.14, 0.085, 3200, 1);
      playVoice('triangle', f, t, 0.14, 0.05, 2400, 1);
    }
    if (track.lead2 && s16 % 4 === 0) {
      var f2 = root * Math.pow(2, (track.lead2[(step / 4 | 0) % track.lead2.length] + 12) / 12);
      playVoice('triangle', f2, t, 0.5, 0.045, 1800, 1);
    }
  }

  function tick() {
    if (!seq.playing || !ctx) return;
    var track = seq.track;
    var spb = 60 / track.bpm / 4;                /* sixteenth notes */
    var horizon = ctx.currentTime + 0.16;
    while (seq.next < horizon) {
      var t = seq.next;
      if (track.swing && seq.step % 2 === 1) t += spb * track.swing;
      schedule(track, seq.step, Math.max(t, ctx.currentTime + 0.005));
      seq.step++;
      seq.next += spb;
    }
  }

  A.music = function (id) {
    if (!ctx || !started) { A._pending = id; return; }
    if (seq.id === id && seq.playing) return;
    A.stopMusic();
    var track = TRACKS[id];
    if (!track) return;
    seq.track = track;
    seq.id = id;
    seq.step = 0;
    seq.next = ctx.currentTime + 0.08;
    seq.playing = true;
    seq.timer = setInterval(tick, 40);
    tick();
  };

  A.stopMusic = function () {
    seq.playing = false;
    seq.id = null;
    if (seq.timer) { clearInterval(seq.timer); seq.timer = 0; }
  };

  A.duck = function (on) {
    if (!ctx) return;
    musicGain.gain.setTargetAtTime(on ? C.S.music * 0.35 : C.S.music, ctx.currentTime, 0.08);
  };

  /* pick a battle theme that suits the fight */
  A.battleTheme = function (level) {
    var pick = level >= 3 ? 'boss' : ['battle1', 'battle2', 'battle3'][level || 0];
    A.music(pick);
  };

  A.flushPending = function () {
    if (A._pending) { var p = A._pending; A._pending = null; A.music(p); }
  };

  /* ============================= event wiring =========================== */
  A.bind = function () {
    var bus = C.bus;
    bus.on('hit', function (e) {
      A.sfx('hit', { vol: M.clamp(e.dmg / 420, 0.35, 1.2), pitch: M.rand(0.85, 1.2) });
    });
    bus.on('guardhit', function () { A.sfx('guard', { pitch: M.rand(0.9, 1.15) }); });
    bus.on('swing', function (e) { A.sfx('swing', { vol: e.heavy ? 0.9 : 0.6 }); });
    bus.on('kishot', function (e) { A.sfx('kishot', { vol: e.small ? 0.55 : 0.8, pitch: M.rand(0.9, 1.15) }); });
    bus.on('beamfire', function () { A.sfx('beam', { dur: 1.1 }); });
    bus.on('explode', function (e) { A.sfx('explode', { size: M.clamp(e.r / 6, 0.5, 3) }); });
    bus.on('transform', function () { A.sfx('transform'); });
    bus.on('vanish', function () { A.sfx('vanish'); });
    bus.on('dash', function () { A.sfx('dash'); });
    bus.on('rushdash', function () { A.sfx('dash', { vol: 0.55 }); });
    bus.on('ko', function () { A.sfx('ko'); });
    bus.on('slam', function (e) { A.sfx('slam', { vol: M.clamp(e.power / 26, 0.4, 1) }); });
    bus.on('charge', function (e) { A.sfx(e.on ? 'charge' : 'chargeStop'); });
    bus.on('guardbreak', function () { A.sfx('smash', { vol: 0.8 }); });
    bus.on('buff', function () { A.sfx('powerup'); });
    bus.on('struggle', function (e) { if (e.on) A.sfx('struggle'); });
    bus.on('special', function (e) {
      if (e.ult) A.sfx('powerup', { vol: 1.1 });
    });
  };

})(DBZ);
