/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — poses and animation clips

   Every pose is a bag of joint angles; every clip is a list of poses on a
   timeline. Attacks are keyframed the way they are drawn: anticipation (pull
   back), the strike (fast, past the target), then recovery (settle back to
   guard). Two-pose snaps read as a twitch; three or four keys read as a punch.

   Sign conventions, verified against the rig in js/build.js:
     arm  X  negative -> swings FORWARD          positive -> back
     arm  Z  positive -> swings toward +x        (out for R, in for L)
     fore X  negative -> elbow bends, hand rises (-1.6 is a right angle)
     leg  X  negative -> knee lifts forward      positive -> leg trails back
     shin X  positive -> heel toward the hips
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M;
  var A = {};
  C.Anim = A;

  var KEYS = ['hipY', 'hipsX', 'hipsY', 'hipsZ',
    'torsoX', 'torsoY', 'torsoZ',
    'chestX', 'chestY', 'chestZ',
    'headX', 'headY', 'headZ',
    'aLX', 'aLY', 'aLZ', 'fLX', 'hLX',
    'aRX', 'aRY', 'aRZ', 'fRX', 'hRX',
    'lLX', 'lLZ', 'sLX', 'ftLX',
    'lRX', 'lRZ', 'sRX', 'ftRX'];
  A.KEYS = KEYS;

  function P(o) {
    var p = {}, i;
    for (i = 0; i < KEYS.length; i++) p[KEYS[i]] = 0;
    if (o) for (var k in o) if (p[k] !== undefined) p[k] = o[k];
    return p;
  }
  A.P = P;

  A.blank = function () { return P(); };

  A.copy = function (src, dst) {
    for (var i = 0; i < KEYS.length; i++) dst[KEYS[i]] = src[KEYS[i]];
    return dst;
  };

  A.lerpInto = function (a, b, t, out) {
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      out[k] = a[k] + (b[k] - a[k]) * t;
    }
    return out;
  };

  /* ============================== the poses ============================= */
  /* A bladed fighting stance: hips turned, lead hand up, weight back. */
  var stance = P({
    hipsY: 0.30, hipY: -0.012,
    torsoX: 0.06, torsoY: -0.12,
    chestY: 0.24, chestX: 0.04,
    headY: -0.20, headX: 0.04,
    /* lead (left) hand high and forward */
    aLX: -0.62, aLZ: -0.34, aLY: 0.18, fLX: -1.78,
    /* rear (right) hand cocked by the cheek */
    aRX: -0.24, aRZ: 0.40, aRY: -0.16, fRX: -2.16,
    lLX: -0.30, lLZ: 0.20, sLX: 0.46, ftLX: -0.18,
    lRX: 0.14, lRZ: -0.24, sRX: 0.34, ftRX: -0.12
  });

  var POSE = {
    stance: stance,

    /* relaxed, used on the menu turntable and between rounds */
    idle: P({
      hipsY: 0.16, torsoY: -0.06, chestY: 0.14, headY: -0.10,
      aLX: -0.16, aLZ: -0.26, fLX: -0.42,
      aRX: -0.16, aRZ: 0.26, fRX: -0.42,
      lLX: -0.06, lLZ: 0.13, sLX: 0.12,
      lRX: 0.02, lRZ: -0.15, sRX: 0.14
    }),

    fly: P({
      torsoX: 0.46, chestX: 0.10, hipY: 0.02,
      aLX: 0.95, aLZ: -0.44, fLX: -0.55,
      aRX: 0.95, aRZ: 0.44, fRX: -0.55,
      lLX: 0.30, lLZ: 0.10, sLX: -0.26,
      lRX: 0.26, lRZ: -0.10, sRX: -0.22,
      headX: -0.42
    }),

    dash: P({
      torsoX: 0.92, chestX: 0.18,
      aLX: 2.35, aLZ: -0.20, fLX: -0.18,
      aRX: 2.35, aRZ: 0.20, fRX: -0.18,
      lLX: 0.46, sLX: -0.50, lRX: 0.34, sRX: -0.42,
      headX: -0.78
    }),

    /* Ki charge: feet planted wide, fists clenched low at the hips, chest
       thrown open, head back. The classic power-up brace. */
    charge: P({
      torsoX: -0.24, chestX: -0.16, hipY: -0.05,
      aLX: 0.42, aLZ: -0.86, aLY: 0.20, fLX: -0.72,
      aRX: 0.42, aRZ: 0.86, aRY: -0.20, fRX: -0.72,
      lLX: -0.14, lLZ: 0.40, sLX: 0.52, ftLX: -0.22,
      lRX: -0.14, lRZ: -0.40, sRX: 0.52, ftRX: -0.22,
      headX: -0.40
    }),

    guard: P({
      torsoX: 0.26, chestX: 0.16, hipY: -0.06, hipsY: 0.18,
      aLX: -1.16, aLY: 0.48, aLZ: -0.30, fLX: -2.30,
      aRX: -1.16, aRY: -0.48, aRZ: 0.30, fRX: -2.30,
      lLX: -0.30, lLZ: 0.26, sLX: 0.56, lRX: -0.24, lRZ: -0.26, sRX: 0.52,
      headX: 0.20
    }),

    /* beam: hands cupped at the hip, then thrust out together */
    beamCharge: P({
      hipsY: 0.66, torsoY: 0.26, chestY: 0.30, hipY: -0.04,
      aLX: -0.34, aLY: 1.30, aLZ: -0.30, fLX: -1.92, hLX: -0.5,
      aRX: -0.34, aRY: 1.24, aRZ: 0.26, fRX: -1.92, hRX: -0.5,
      lLX: -0.34, lLZ: 0.34, sLX: 0.60, ftLX: -0.24,
      lRX: -0.14, lRZ: -0.34, sRX: 0.44, ftRX: -0.18,
      headY: -0.62, headX: 0.10
    }),

    beamFire: P({
      hipsY: -0.08, torsoY: -0.06, chestY: -0.10, torsoX: 0.14,
      aLX: -1.62, aLY: 0.26, aLZ: -0.22, fLX: -0.10, hLX: -0.4,
      aRX: -1.62, aRY: -0.26, aRZ: 0.22, fRX: -0.10, hRX: -0.4,
      lLX: -0.40, lLZ: 0.26, sLX: 0.58, lRX: 0.22, lRZ: -0.26, sRX: 0.24,
      headX: -0.06
    }),

    palmOut: P({
      hipsY: 0.10, chestY: -0.34, torsoY: -0.14,
      aRX: -1.60, aRY: -0.14, aRZ: 0.10, fRX: -0.06, hRX: -0.6,
      aLX: -0.36, aLZ: -0.72, fLX: -1.66,
      lLX: -0.26, lLZ: 0.24, sLX: 0.44, lRX: -0.10, lRZ: -0.24, sRX: 0.26
    }),

    throwOver: P({
      torsoX: 0.20, chestX: 0.18, chestY: -0.30, hipsY: 0.12,
      aRX: -2.75, aRZ: 0.16, fRX: -0.30,
      aLX: -0.70, aLZ: -0.66, fLX: -1.30,
      lLX: -0.22, sLX: 0.38, lRX: -0.06, sRX: 0.22
    }),

    roar: P({
      torsoX: -0.44, chestX: -0.22, hipY: 0.10,
      aLX: 0.58, aLZ: -1.28, fLX: -0.92,
      aRX: 0.58, aRZ: 1.28, fRX: -0.92,
      lLX: -0.24, lLZ: 0.42, sLX: 0.64, ftLX: -0.30,
      lRX: -0.24, lRZ: -0.42, sRX: 0.64, ftRX: -0.30,
      headX: -0.66
    }),

    hit: P({
      torsoX: -0.42, chestX: -0.26, hipsX: 0.22, hipY: -0.05,
      aLX: 0.50, aLZ: -0.78, fLX: -0.80,
      aRX: 0.50, aRZ: 0.78, fRX: -0.80,
      lLX: 0.20, lLZ: 0.24, sLX: 0.58, lRX: 0.08, lRZ: -0.22, sRX: 0.44,
      headX: -0.48
    }),

    blow: P({
      torsoX: -0.78, chestX: -0.34, hipsX: 0.42,
      aLX: 1.85, aLZ: -0.95, fLX: -0.35,
      aRX: 1.85, aRZ: 0.95, fRX: -0.35,
      lLX: 0.62, lLZ: 0.22, sLX: 0.35, lRX: 0.42, lRZ: -0.20, sRX: 0.25,
      headX: -0.85
    }),

    down: P({
      hipY: -0.70, hipsX: -1.40, torsoX: 0.14, chestX: 0.10,
      aLX: 0.60, aLZ: -1.36, aRX: 0.60, aRZ: 1.36,
      lLX: 0.22, lLZ: 0.22, sLX: 0.35, lRX: 0.16, lRZ: -0.22, sRX: 0.28,
      headX: 0.32
    }),

    victory: P({
      torsoX: -0.08, hipY: 0.12, chestY: 0.10,
      aRX: -2.70, aRZ: 0.34, fRX: -0.30,
      aLX: -0.30, aLZ: -0.48, fLX: -1.60,
      lLX: -0.08, lLZ: 0.14, sLX: 0.16, lRX: -0.08, lRZ: -0.14, sRX: 0.16,
      headX: -0.24
    }),

    intro: P({
      hipsY: 0.10, aLZ: -0.20, aRZ: 0.20, fLX: -0.30, fRX: -0.30,
      lLZ: 0.10, lRZ: -0.12
    })
  };
  A.POSE = POSE;

  /* ============================== the clips =============================
     `keys` are {t, p} with t in 0..1 of the clip's own duration. `hit` is
     when the damage frame lands, so timing and animation can never drift.  */
  function clip(o) {
    o.keys.sort(function (a, b) { return a.t - b.t; });
    return o;
  }

  /* helper: a pose expressed as "stance, but with these joints changed" */
  function from(base, o) {
    var p = P();
    A.copy(base, p);
    for (var k in o) if (p[k] !== undefined) p[k] = o[k];
    return p;
  }
  A.from = from;

  var CLIP = {};
  A.CLIP = CLIP;

  /* ---- straight left (jab) ------------------------------------------- */
  CLIP.jab = clip({
    dur: 0.30, hit: 0.30, side: -1,
    keys: [
      { t: 0.00, p: stance },
      /* anticipation: shoulder loads back, weight sinks */
      {
        t: 0.16, p: from(stance, {
          chestY: 0.46, hipsY: 0.38, aLX: -0.34, fLX: -2.10, hipY: -0.035
        })
      },
      /* strike: arm snaps straight, chest whips through */
      {
        t: 0.34, p: from(stance, {
          chestY: -0.42, hipsY: 0.06, torsoY: -0.22,
          aLX: -1.66, aLY: 0.10, aLZ: -0.12, fLX: -0.04,
          aRX: -0.10, aRZ: 0.52, fRX: -2.30,
          lLX: -0.42, sLX: 0.30, lRX: 0.26, sRX: 0.40, hipY: -0.02
        })
      },
      /* over-extension, then snap back to guard */
      {
        t: 0.52, p: from(stance, {
          chestY: -0.30, aLX: -1.54, fLX: -0.30, aRZ: 0.46, fRX: -2.22
        })
      },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- right cross ----------------------------------------------------- */
  CLIP.cross = clip({
    dur: 0.34, hit: 0.34, side: 1,
    keys: [
      { t: 0.00, p: stance },
      {
        t: 0.18, p: from(stance, {
          chestY: 0.52, hipsY: 0.46, aRX: 0.10, fRX: -2.35, hipY: -0.04
        })
      },
      {
        t: 0.36, p: from(stance, {
          chestY: -0.62, hipsY: -0.16, torsoY: -0.32, torsoX: 0.10,
          aRX: -1.70, aRY: -0.12, aRZ: 0.10, fRX: -0.02,
          aLX: -0.20, aLZ: -0.50, fLX: -2.30,
          lRX: -0.30, sRX: 0.26, lLX: -0.10, sLX: 0.42, hipY: -0.015
        })
      },
      {
        t: 0.55, p: from(stance, {
          chestY: -0.44, aRX: -1.56, fRX: -0.28, aLZ: -0.44, fLX: -2.20
        })
      },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- left hook ------------------------------------------------------- */
  CLIP.hook = clip({
    dur: 0.34, hit: 0.36, side: -1,
    keys: [
      { t: 0.00, p: stance },
      {
        t: 0.18, p: from(stance, {
          chestY: 0.54, hipsY: 0.44, aLX: -0.52, aLZ: -0.86, aLY: 0.55, fLX: -1.70
        })
      },
      {
        t: 0.38, p: from(stance, {
          chestY: -0.58, hipsY: -0.10, torsoY: -0.26,
          aLX: -1.10, aLY: -0.62, aLZ: -0.30, fLX: -1.34,
          aRX: -0.14, aRZ: 0.50, fRX: -2.28,
          lLX: -0.36, sLX: 0.34, lRX: 0.20, sRX: 0.42
        })
      },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- rising uppercut -------------------------------------------------- */
  CLIP.upper = clip({
    dur: 0.36, hit: 0.38, side: 1,
    keys: [
      { t: 0.00, p: stance },
      {
        t: 0.20, p: from(stance, {
          hipY: -0.07, torsoX: 0.24, chestX: 0.18, chestY: 0.42,
          aRX: 0.44, aRZ: 0.30, fRX: -2.30, lLX: -0.42, sLX: 0.70, lRX: 0.10, sRX: 0.56
        })
      },
      {
        t: 0.40, p: from(stance, {
          hipY: 0.06, torsoX: -0.30, chestX: -0.26, chestY: -0.30,
          aRX: -0.92, aRY: -0.20, aRZ: 0.22, fRX: -1.66,
          aLX: -0.20, aLZ: -0.54, fLX: -2.24,
          lLX: -0.16, sLX: 0.22, lRX: -0.04, sRX: 0.16, headX: -0.24
        })
      },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- right roundhouse kick -------------------------------------------- */
  CLIP.kickRound = clip({
    dur: 0.40, hit: 0.40, side: 1, leg: 1,
    keys: [
      { t: 0.00, p: stance },
      /* chamber: knee comes up and across */
      {
        t: 0.20, p: from(stance, {
          hipsY: 0.52, chestY: 0.34, torsoX: -0.10, hipY: -0.02,
          lRX: -1.30, lRZ: -0.55, sRX: 1.30, ftRX: -0.30,
          lLX: -0.06, lLZ: 0.16, sLX: 0.26,
          aLX: -0.40, aLZ: -0.80, fLX: -1.50, aRX: -0.10, aRZ: 0.70, fRX: -1.80
        })
      },
      /* extension: hip snaps over, leg whips straight */
      {
        t: 0.42, p: from(stance, {
          hipsY: -0.44, chestY: -0.66, torsoZ: 0.22, torsoX: -0.18, hipY: 0.04,
          lRX: -1.52, lRZ: -0.95, sRX: 0.18, ftRX: -0.36,
          lLX: 0.10, lLZ: 0.12, sLX: 0.22,
          aLX: -0.30, aLZ: -1.00, fLX: -1.10, aRX: 0.55, aRZ: 0.95, fRX: -0.90,
          headY: -0.30
        })
      },
      /* retract the knee before setting the foot down */
      {
        t: 0.66, p: from(stance, {
          hipsY: -0.10, chestY: -0.20, lRX: -0.90, lRZ: -0.50, sRX: 1.10
        })
      },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- spinning back kick ----------------------------------------------- */
  CLIP.kickSpin = clip({
    dur: 0.46, hit: 0.44, side: -1, leg: 1,
    keys: [
      { t: 0.00, p: stance },
      {
        t: 0.18, p: from(stance, {
          hipsY: 0.85, chestY: 0.70, headY: 0.55, hipY: -0.04,
          lRX: 0.30, sRX: 0.50, lLX: -0.20, sLX: 0.50
        })
      },
      {
        t: 0.44, p: from(stance, {
          hipsY: -1.05, chestY: -0.85, headY: -0.55, torsoX: -0.26, hipY: 0.05,
          lRX: -1.42, lRZ: -0.30, sRX: 0.12, ftRX: -0.34,
          lLX: 0.18, lLZ: 0.10, sLX: 0.20,
          aLX: 0.30, aLZ: -1.20, fLX: -0.70, aRX: 0.30, aRZ: 1.20, fRX: -0.70
        })
      },
      {
        t: 0.70, p: from(stance, {
          hipsY: -0.30, chestY: -0.20, lRX: -0.60, sRX: 0.80
        })
      },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- two-fist overhead hammer (the launcher) --------------------------- */
  CLIP.smash = clip({
    dur: 0.52, hit: 0.46, side: 1,
    keys: [
      { t: 0.00, p: stance },
      /* big anticipation — both fists overhead, back arched */
      {
        t: 0.26, p: from(stance, {
          hipY: 0.09, torsoX: -0.42, chestX: -0.30, hipsY: 0.10,
          aLX: -2.85, aLZ: -0.30, fLX: -0.34,
          aRX: -2.85, aRZ: 0.30, fRX: -0.34,
          lLX: -0.20, sLX: 0.30, lRX: -0.10, sRX: 0.26, headX: -0.36
        })
      },
      /* the drop */
      {
        t: 0.48, p: from(stance, {
          hipY: -0.10, torsoX: 0.66, chestX: 0.38,
          aLX: -0.55, aLZ: -0.22, fLX: -0.22,
          aRX: -0.55, aRZ: 0.22, fRX: -0.22,
          lLX: -0.34, sLX: 0.62, lRX: -0.24, sRX: 0.56, headX: 0.40
        })
      },
      { t: 0.68, p: from(stance, { torsoX: 0.40, chestX: 0.22, hipY: -0.05 }) },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- flying knee / rush strike used by cinematic rushes ---------------- */
  CLIP.rushHit = clip({
    dur: 0.22, hit: 0.30, side: 1,
    keys: [
      { t: 0.00, p: from(stance, { chestY: 0.50, aRX: 0.20, fRX: -2.30 }) },
      {
        t: 0.30, p: from(stance, {
          chestY: -0.60, torsoY: -0.28, aRX: -1.72, aRZ: 0.08, fRX: -0.02,
          aLX: -0.16, aLZ: -0.52, fLX: -2.30, lRX: -0.34, sRX: 0.30
        })
      },
      { t: 1.00, p: from(stance, { chestY: -0.20, aRX: -1.30, fRX: -0.60 }) }
    ]
  });

  /* ---- ki blast: quick single-palm shove --------------------------------- */
  CLIP.kiShot = clip({
    dur: 0.26, hit: 0.34, side: 1,
    keys: [
      { t: 0.00, p: stance },
      { t: 0.20, p: from(stance, { chestY: 0.34, aRX: 0.10, aRZ: 0.46, fRX: -2.10 }) },
      {
        t: 0.40, p: from(POSE.palmOut, { chestY: -0.30 })
      },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- beam: draw back, gather, thrust ----------------------------------- */
  CLIP.beam = clip({
    dur: 1.0, hit: 0.72, side: 1, hold: true,
    keys: [
      { t: 0.00, p: stance },
      { t: 0.22, p: from(POSE.beamCharge, { hipsY: 0.48, headY: -0.42 }) },
      /* the gather — hands drop lower, body coils tighter */
      { t: 0.62, p: from(POSE.beamCharge, { hipY: -0.075, torsoX: 0.10 }) },
      { t: 0.72, p: POSE.beamFire },
      { t: 1.00, p: POSE.beamFire }
    ]
  });

  /* ---- overhead sphere throw --------------------------------------------- */
  CLIP.sphere = clip({
    dur: 0.62, hit: 0.55, side: 1,
    keys: [
      { t: 0.00, p: stance },
      {
        t: 0.30, p: from(POSE.throwOver, {
          torsoX: -0.34, chestX: -0.24, aRX: -2.90, hipY: 0.06
        })
      },
      { t: 0.55, p: from(POSE.throwOver, { torsoX: 0.34, chestX: 0.22, aRX: -1.30, chestY: -0.42 }) },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- nova: crouch then erupt -------------------------------------------- */
  CLIP.nova = clip({
    dur: 0.60, hit: 0.42, side: 1,
    keys: [
      { t: 0.00, p: stance },
      {
        t: 0.26, p: from(POSE.charge, {
          hipY: -0.11, torsoX: 0.34, chestX: 0.24, headX: 0.30,
          aLZ: -0.50, aRZ: 0.50, fLX: -1.90, fRX: -1.90
        })
      },
      { t: 0.42, p: from(POSE.roar, { hipY: 0.10 }) },
      { t: 0.66, p: from(POSE.roar, { hipY: 0.02 }) },
      { t: 1.00, p: stance }
    ]
  });

  /* ---- getting hit --------------------------------------------------------- */
  CLIP.hitLight = clip({
    dur: 0.26, hit: 0,
    keys: [
      { t: 0.00, p: from(stance, { torsoX: -0.30, chestX: -0.22, headX: -0.34 }) },
      { t: 0.30, p: POSE.hit },
      { t: 1.00, p: stance }
    ]
  });

  CLIP.hitHeavy = clip({
    dur: 0.5, hit: 0,
    keys: [
      { t: 0.00, p: POSE.hit },
      { t: 0.25, p: from(POSE.blow, { torsoX: -0.9 }) },
      { t: 1.00, p: POSE.blow }
    ]
  });

  /* ---- power up ------------------------------------------------------------ */
  CLIP.transform = clip({
    dur: 0.95, hit: 0,
    keys: [
      { t: 0.00, p: stance },
      { t: 0.14, p: from(POSE.charge, { hipY: -0.09, torsoX: 0.22, headX: 0.24 }) },
      { t: 0.34, p: from(POSE.roar, { hipY: 0.12, headX: -0.72 }) },
      { t: 0.72, p: from(POSE.roar, { hipY: 0.04 }) },
      { t: 1.00, p: stance }
    ]
  });

  CLIP.victory = clip({
    dur: 1.3, hit: 0,
    keys: [
      { t: 0.00, p: stance },
      { t: 0.22, p: from(POSE.victory, { aRX: -1.2, hipY: 0.04 }) },
      { t: 0.45, p: POSE.victory },
      { t: 1.00, p: POSE.victory }
    ]
  });

  /* ============================== sampling =============================== */
  /* Cubic ease on each segment so limbs accelerate and settle rather than
     sliding linearly, which is most of what makes a strike feel like one. */
  function ease(t) { return t * t * (3 - 2 * t); }

  A.sample = function (cl, t, out) {
    var keys = cl.keys;
    t = M.sat(t);
    if (t <= keys[0].t) return A.copy(keys[0].p, out);
    var last = keys[keys.length - 1];
    if (t >= last.t) return A.copy(last.p, out);
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (t >= a.t && t <= b.t) {
        var u = (t - a.t) / Math.max(1e-5, b.t - a.t);
        return A.lerpInto(a.p, b.p, ease(u), out);
      }
    }
    return A.copy(last.p, out);
  };

  /* Which clip plays for a given combo step or special archetype. */
  A.comboClip = ['jab', 'cross', 'kickRound', 'hook', 'kickSpin', 'smash'];

  A.archClip = {
    beam: 'beam', sphere: 'sphere', barrage: 'kiShot', disc: 'sphere',
    nova: 'nova', swarm: 'nova', rush: 'rushHit', buff: 'transform',
    trick: 'nova'
  };

  /* Back-compat: the rest of the game still reaches for C.POSE. */
  C.POSE = POSE;

})(DBZ);
