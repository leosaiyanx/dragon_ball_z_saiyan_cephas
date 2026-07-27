/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — the fighter

   Resources (health / ki / guard / ultimate), free 3D flight physics, the
   combat state machine, and a procedural animation system that poses the rig
   from js/build.js. Move *behaviour* lives in js/moves.js; this file owns the
   body and everything that happens to it.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M, B = C.Build, FX = C.FX;

  /* ============================== the aura ============================== */
  var AURA_VERT = [
    'varying vec2 vUv; varying float vRim;',
    'uniform float uTime; uniform float uWob;',
    'void main(){',
    '  vUv = uv;',
    '  vec3 p = position;',
    '  float w = sin(uTime * 9.0 + p.y * 6.0 + p.x * 3.0) * 0.5 + sin(uTime * 13.0 + p.z * 5.0) * 0.5;',
    '  p.xz *= 1.0 + w * uWob * (0.25 + uv.y * 0.9);',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    /* rim term: the shell is transparent face-on and bright at the silhouette,
       which is what stops it reading as a solid cone */
    '  vec3 n = normalize(normalMatrix * normal);',
    '  vec3 v = normalize(-mv.xyz);',
    '  vRim = 1.0 - abs(dot(n, v));',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  var AURA_FRAG = [
    'varying vec2 vUv; varying float vRim;',
    'uniform float uTime; uniform vec3 uColor; uniform vec3 uCore;',
    'uniform float uIntensity; uniform float uTongues;',
    'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(h21(i), h21(i + vec2(1,0)), u.x),',
    '             mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y);',
    '}',
    'void main(){',
    '  vec2 q = vec2(vUv.x * uTongues, vUv.y * 2.2 - uTime * 2.4);',
    '  float n = vnoise(q) * 0.6 + vnoise(q * 2.3 + 11.0) * 0.4;',
    /* flames thin out toward the tip; the noise eats into them as they rise */
    '  float body = smoothstep(0.0, 0.06, vUv.y) * pow(1.0 - vUv.y, 1.5);',
    '  float tongue = smoothstep(0.46, 0.92, n + (1.0 - vUv.y) * 0.55);',
    '  float rim = pow(clamp(vRim, 0.0, 1.0), 2.2);',
    '  float a = clamp(rim * body * 1.15 + tongue * body * 1.45, 0.0, 1.0) * uIntensity;',
    '  vec3 col = mix(uColor, uCore, smoothstep(0.25, 0.9, n) * (1.0 - vUv.y * 0.5));',
    '  gl_FragColor = vec4(col * (0.75 + n * 1.7), a);',
    '}'
  ].join('\n');

  function makeAura(height, radius) {
    var g = new THREE.ConeGeometry(radius, height, 22, 10, true);
    g.translate(0, height * 0.5, 0);
    var m = new THREE.ShaderMaterial({
      vertexShader: AURA_VERT, fragmentShader: AURA_FRAG,
      uniforms: {
        uTime: { value: 0 }, uColor: { value: new THREE.Color(0x59c8ff) },
        uCore: { value: new THREE.Color(0xffffff) }, uIntensity: { value: 0 },
        uWob: { value: 0.10 }, uTongues: { value: 7 }
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    var mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = 4;
    mesh.frustumCulled = false;
    return mesh;
  }

  /* ============================ pose plumbing =========================== */
  var PKEYS = ['hipY', 'hipsX', 'hipsY', 'hipsZ', 'torsoX', 'torsoY', 'torsoZ',
    'headX', 'headY', 'headZ',
    'aLX', 'aLY', 'aLZ', 'fLX', 'aRX', 'aRY', 'aRZ', 'fRX',
    'lLX', 'lLZ', 'sLX', 'lRX', 'lRZ', 'sRX', 'ftLX', 'ftRX'];

  function P(o) {
    var p = {};
    for (var i = 0; i < PKEYS.length; i++) p[PKEYS[i]] = 0;
    if (o) for (var k in o) if (p[k] !== undefined || k === 'hipY') p[k] = o[k];
    return p;
  }

  /* The fighting stance every other pose is measured against. */
  var POSE = {
    stance: P({
      torsoX: 0.07, torsoY: 0.16, hipsY: -0.10,
      aLX: -0.34, aLZ: -0.17, fLX: -0.92,
      aRX: -0.46, aRZ: 0.20, fRX: -1.10,
      lLX: -0.16, lLZ: 0.19, sLX: 0.30, ftLX: -0.14,
      lRX: -0.10, lRZ: -0.21, sRX: 0.24, ftRX: -0.10,
      headY: -0.10
    }),
    fly: P({
      torsoX: 0.50, hipY: 0.02,
      aLX: 1.20, aLZ: 0.28, fLX: -0.35,
      aRX: 1.20, aRZ: -0.28, fRX: -0.35,
      lLX: 0.28, lLZ: 0.08, sLX: -0.30,
      lRX: 0.28, lRZ: -0.08, sRX: -0.30,
      headX: -0.45
    }),
    dash: P({
      torsoX: 0.95,
      aLX: 2.45, aLZ: 0.16, fLX: -0.20,
      aRX: 2.45, aRZ: -0.16, fRX: -0.20,
      lLX: 0.45, sLX: -0.55, lRX: 0.35, sRX: -0.45,
      headX: -0.75
    }),
    charge: P({
      torsoX: -0.22, hipsY: 0,
      aLX: 0.55, aLZ: 0.85, fLX: -0.55,
      aRX: 0.55, aRZ: -0.85, fRX: -0.55,
      lLX: -0.22, lLZ: 0.30, sLX: 0.46, ftLX: -0.20,
      lRX: -0.22, lRZ: -0.30, sRX: 0.46, ftRX: -0.20,
      headX: -0.35
    }),
    guard: P({
      torsoX: 0.24, hipsY: -0.05,
      aLX: -1.30, aLY: 0.55, aLZ: 0.55, fLX: -1.85,
      aRX: -1.30, aRY: -0.55, aRZ: -0.55, fRX: -1.85,
      lLX: -0.28, lLZ: 0.22, sLX: 0.52, lRX: -0.28, lRZ: -0.22, sRX: 0.52,
      headX: 0.18
    }),
    punchR: P({
      torsoY: -0.52, torsoX: 0.14,
      aRX: -1.62, aRY: -0.10, aRZ: -0.06, fRX: -0.10,
      aLX: -0.20, aLZ: 0.95, fLX: -2.20,
      lLX: -0.18, lLZ: 0.18, sLX: 0.34, lRX: -0.05, lRZ: -0.16, sRX: 0.20
    }),
    punchL: P({
      torsoY: 0.52, torsoX: 0.14,
      aLX: -1.62, aLY: 0.10, aLZ: 0.06, fLX: -0.10,
      aRX: -0.20, aRZ: -0.95, fRX: -2.20,
      lRX: -0.18, lRZ: -0.18, sRX: 0.34, lLX: -0.05, lLZ: 0.16, sLX: 0.20
    }),
    kickR: P({
      torsoX: -0.30, torsoY: -0.30, hipsX: -0.20,
      lRX: -1.45, lRZ: -0.22, sRX: 0.16, ftRX: -0.30,
      lLX: 0.10, lLZ: 0.10, sLX: 0.16,
      aLX: -0.60, aLZ: 1.10, fLX: -1.30, aRX: 0.70, aRZ: -0.85, fRX: -0.90
    }),
    kickSpin: P({
      torsoX: -0.10, torsoY: 0.55, hipsX: -0.32,
      lRX: -1.30, lRZ: -0.65, sRX: 0.10,
      lLX: 0.24, lLZ: 0.16, sLX: 0.50,
      aLX: -0.30, aLZ: 1.40, aRX: -0.30, aRZ: -1.40
    }),
    smash: P({
      torsoX: 0.55, hipsX: 0.20,
      aLX: -2.65, aLZ: 0.22, fLX: -0.28,
      aRX: -2.65, aRZ: -0.22, fRX: -0.28,
      lLX: -0.15, sLX: 0.35, lRX: -0.15, sRX: 0.35,
      headX: 0.30
    }),
    windup: P({
      torsoX: -0.42, torsoY: 0.62,
      aRX: 0.95, aRY: -0.30, aRZ: -0.55, fRX: -1.95,
      aLX: -0.65, aLZ: 0.75, fLX: -1.15,
      lLX: -0.24, lLZ: 0.24, sLX: 0.48, lRX: -0.20, lRZ: -0.24, sRX: 0.40
    }),
    beamCharge: P({
      torsoY: 0.62, torsoX: 0.05, hipsY: 0.30,
      aLX: -0.55, aLY: 1.25, aLZ: 0.55, fLX: -1.55,
      aRX: -0.55, aRY: 1.25, aRZ: -0.10, fRX: -1.55,
      lLX: -0.28, lLZ: 0.30, sLX: 0.55, ftLX: -0.24,
      lRX: -0.24, lRZ: -0.30, sRX: 0.50, ftRX: -0.20,
      headY: -0.55
    }),
    beamFire: P({
      torsoY: -0.10, torsoX: 0.16, hipsY: -0.05,
      aLX: -1.58, aLY: 0.30, aLZ: 0.26, fLX: -0.16,
      aRX: -1.58, aRY: -0.30, aRZ: -0.26, fRX: -0.16,
      lLX: -0.30, lLZ: 0.24, sLX: 0.52, lRX: -0.10, lRZ: -0.24, sRX: 0.28,
      headX: -0.08
    }),
    throwOver: P({
      torsoX: 0.35, torsoY: -0.25,
      aRX: -2.85, aRZ: -0.14, fRX: -0.20,
      aLX: -0.80, aLZ: 0.90, fLX: -1.20,
      lLX: -0.18, sLX: 0.32, lRX: -0.10, sRX: 0.24
    }),
    palmOut: P({
      torsoY: -0.28, torsoX: 0.10,
      aRX: -1.58, aRY: -0.16, aRZ: -0.10, fRX: -0.05,
      aLX: -0.45, aLZ: 0.85, fLX: -1.40,
      lLX: -0.22, lLZ: 0.20, sLX: 0.40, lRX: -0.12, lRZ: -0.20, sRX: 0.28
    }),
    roar: P({
      torsoX: -0.42, hipsY: 0.12,
      aLX: 0.70, aLZ: 1.35, fLX: -0.85,
      aRX: 0.70, aRZ: -1.35, fRX: -0.85,
      lLX: -0.30, lLZ: 0.38, sLX: 0.62, ftLX: -0.28,
      lRX: -0.30, lRZ: -0.38, sRX: 0.62, ftRX: -0.28,
      headX: -0.62
    }),
    hit: P({
      torsoX: -0.55, hipsX: 0.28, hipsY: 0.18, hipY: -0.06,
      aLX: 0.60, aLZ: 0.95, fLX: -0.75,
      aRX: 0.60, aRZ: -0.95, fRX: -0.75,
      lLX: 0.24, lLZ: 0.26, sLX: 0.62, lRX: 0.10, lRZ: -0.24, sRX: 0.48,
      headX: -0.55
    }),
    blow: P({
      torsoX: -0.85, hipsX: 0.45,
      aLX: 1.85, aLZ: 1.05, fLX: -0.35,
      aRX: 1.85, aRZ: -1.05, fRX: -0.35,
      lLX: 0.62, lLZ: 0.22, sLX: 0.35, lRX: 0.42, lRZ: -0.20, sRX: 0.25,
      headX: -0.85
    }),
    down: P({
      hipY: -0.72, hipsX: -1.42, torsoX: 0.16,
      aLX: 0.65, aLZ: 1.42, aRX: 0.65, aRZ: -1.42,
      lLX: 0.22, lLZ: 0.22, sLX: 0.35, lRX: 0.16, lRZ: -0.22, sRX: 0.28,
      headX: 0.35
    }),
    victory: P({
      torsoX: -0.10, hipsY: 0.14,
      aRX: -2.75, aRZ: -0.32, fRX: -0.30,
      aLX: -0.35, aLZ: 0.55, fLX: -1.65,
      lLX: -0.10, lLZ: 0.14, sLX: 0.18, lRX: -0.10, lRZ: -0.14, sRX: 0.18,
      headX: -0.22
    }),
    intro: P({
      torsoX: 0.02, aLZ: 0.16, aRZ: -0.16, fLX: -0.25, fRX: -0.25,
      lLZ: 0.08, lRZ: -0.08
    })
  };
  C.POSE = POSE;

  /* ============================== Fighter =============================== */
  function Fighter(spec, opts) {
    opts = opts || {};
    this.spec = spec;
    this.id = spec.id;
    this.name = spec.name;
    this.isPlayer = !!opts.isPlayer;
    this.side = opts.side || 0;
    this.team = opts.team === undefined ? this.side : opts.team;

    /* ---- body ---- */
    this.built = B.character(spec, { shadows: opts.shadows });
    this.group = new THREE.Object3D();
    this.model = this.built.group;
    this.group.add(this.model);
    this.rig = this.built.rig;
    this.P = this.built.P;
    this.height = this.built.height;
    this.radius = Math.max(0.42, this.P.shoulderW * 2.6);
    this.chestOff = this.P.chestY;

    /* ---- aura ---- */
    this.aura = makeAura(this.height * 1.22, this.P.shoulderW * 2.15);
    this.aura.position.y = -this.height * 0.06;
    this.model.add(this.aura);
    this.auraCore = makeAura(this.height * 0.86, this.P.shoulderW * 1.45);
    this.auraCore.position.y = -this.height * 0.03;
    this.auraCore.material.uniforms.uTongues.value = 4;
    this.auraCore.material.uniforms.uWob.value = 0.05;
    this.model.add(this.auraCore);

    /* ---- transform state ---- */
    this.formIdx = -1;                       /* -1 = base form */
    this.baseHair = spec.hair;
    this.auraColor = spec.aura;
    this.statMul = { pwr: 1, spd: 1, def: 1 };

    /* ---- transform ---- */
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.targetYaw = 0;
    this.pitch = 0;
    this.grounded = true;
    this.flying = false;

    /* ---- pose ---- */
    this.pose = P(POSE.stance);
    this.poseTarget = P(POSE.stance);
    this.poseBlend = 12;
    this.animT = 0;

    /* ---- combat ---- */
    this.state = 'idle';
    this.stateT = 0;
    this.target = null;
    this.combo = 0;
    this.comboT = 0;
    this.hitBy = null;
    this.invuln = 0;
    this.hitStop = 0;
    this.act = null;                          /* the running move, see moves.js */
    this.queued = null;
    this.lastHitTime = -99;
    this.stunT = 0;
    this.downT = 0;
    this.vanishWindow = 0;
    this.dashT = 0; this.ghostT = 0;
    this.chargeT = 0;
    this.blind = 0; this.bound = 0; this.slowT = 0; this.markT = 0;
    this.shield = 0;
    this.dizzy = 0;
    this.rushLock = null;
    this.faceLock = 0;

    this.applyStats(opts.hpScale || 1);
    this.hp = this.maxHp;
    this.ki = 50;
    this.guard = 100;
    this.ult = 0;

    this.alive = true;
    this.wins = 0;

    this.setPose(POSE.stance, 999);
    this.refreshAura();
  }

  Fighter.prototype.applyStats = function (hpScale) {
    var s = this.spec, mul = this.statMul;
    /* Transformations compound: Final Form Frieza is 4.6x his base power.
       Feeding that straight into damage lets one Death Ball delete a full
       health bar, so offence takes the root of it and health takes a slice
       — a transformed fighter hits much harder and lasts longer, but a
       single move can never end a fight outright. */
    var pw = Math.pow(mul.pwr, 0.62);
    var hpBoost = Math.pow(mul.pwr, 0.36);
    this.maxHp = Math.round((4800 + s.def * 480 + s.pwr * 120) * hpScale * hpBoost *
      (this.spec.h < 0.8 ? 0.9 : 1));
    this.atk = (0.55 + s.pwr * 0.11) * pw;
    this.defense = 1 / (0.62 + s.def * 0.055 * mul.def);
    this.moveSpd = (7.2 + s.spd * 1.25) * mul.spd;
    this.flySpd = (9.5 + s.spd * 1.75) * mul.spd;
    this.dashSpd = (26 + s.spd * 3.6) * mul.spd;
    /* Passive regen is generous on purpose: specials are the fun part, and a
       fight where nobody can afford one is a fight nobody wants to watch. */
    this.kiRegen = 2.0 + s.ki * 0.45;
    this.kiCharge = 18 + s.ki * 3.4;
    this.maxKi = 100;
    this.turnRate = 7 + s.spd * 0.7;
    this.tech = s.tec;
  };

  /* --------------------------------------------------------------- pose */
  Fighter.prototype.setPose = function (p, blend) {
    for (var i = 0; i < PKEYS.length; i++) this.poseTarget[PKEYS[i]] = p[PKEYS[i]] || 0;
    this.poseBlend = blend === undefined ? 14 : blend;
    if (blend === 999) {
      for (i = 0; i < PKEYS.length; i++) this.pose[PKEYS[i]] = this.poseTarget[PKEYS[i]];
    }
  };

  /* blend between two poses, e.g. a punch mid-swing */
  Fighter.prototype.setPoseMix = function (a, b, t, blend) {
    for (var i = 0; i < PKEYS.length; i++) {
      var k = PKEYS[i];
      this.poseTarget[k] = M.lerp(a[k] || 0, b[k] || 0, t);
    }
    this.poseBlend = blend === undefined ? 20 : blend;
  };

  Fighter.prototype.applyPose = function (dt) {
    var p = this.pose, t = this.poseTarget, r = this.rig;
    var k = 1 - Math.exp(-this.poseBlend * dt);
    for (var i = 0; i < PKEYS.length; i++) {
      var key = PKEYS[i];
      p[key] += (t[key] - p[key]) * k;
    }

    /* idle life: breathing, weight shift, hair and cloth sway */
    var bt = this.animT;
    var breathe = this.state === 'ko' ? 0 : Math.sin(bt * 2.4) * 0.02;
    var bob = 0;
    if (this.state === 'fly' || this.state === 'idle' && !this.grounded) bob = Math.sin(bt * 1.8) * 0.05;

    r.hips.position.y = this.P.hipY + p.hipY * this.height + breathe * 0.4 + bob;
    r.hips.rotation.set(p.hipsX, p.hipsY, p.hipsZ);
    r.torso.rotation.set(p.torsoX + breathe, p.torsoY, p.torsoZ);
    r.head.rotation.set(p.headX - breathe * 0.5, p.headY, p.headZ);
    r.armL.rotation.set(p.aLX, p.aLY, p.aLZ);
    r.armR.rotation.set(p.aRX, p.aRY, p.aRZ);
    r.foreL.rotation.x = p.fLX;
    r.foreR.rotation.x = p.fRX;
    r.legL.rotation.set(p.lLX, 0, p.lLZ);
    r.legR.rotation.set(p.lRX, 0, p.lRZ);
    r.shinL.rotation.x = p.sLX;
    r.shinR.rotation.x = p.sRX;
    r.footL.rotation.x = p.ftLX;
    r.footR.rotation.x = p.ftRX;

    /* secondary motion */
    var bl = this.built;
    var sway = Math.sin(bt * 3.1) * 0.06 + this.vel.length() * 0.004;
    if (bl.maneStrands.length) {
      for (i = 0; i < bl.maneStrands.length; i++) {
        var s = bl.maneStrands[i];
        s.rotation.x = Math.PI * 0.97 - sway * 0.7 - Math.min(0.5, this.vel.length() * 0.012);
        s.rotation.y = Math.sin(bt * 2.6 + i) * 0.05;
      }
    }
    if (bl.antennae.length) {
      for (i = 0; i < bl.antennae.length; i++) {
        bl.antennae[i].rotation.x = -0.85 + Math.sin(bt * 2.2 + i * 1.3) * 0.10;
      }
    }
    if (bl.tail) {
      for (i = 0; i < bl.tail.length; i++) {
        bl.tail[i].rotation.x = Math.sin(bt * 2.0 - i * 0.45) * 0.14;
        bl.tail[i].rotation.z = Math.cos(bt * 1.7 - i * 0.4) * 0.10;
      }
      if (bl.tailRoot) bl.tailRoot.rotation.x = -0.4 + Math.sin(bt * 1.4) * 0.12;
    }
    if (bl.tentacle) {
      for (i = 0; i < bl.tentacle.length; i++) {
        bl.tentacle[i].rotation.x = Math.sin(bt * 2.2 - i * 0.5) * 0.12 - 0.04;
        bl.tentacle[i].rotation.z = Math.cos(bt * 1.9 - i * 0.42) * 0.10;
      }
    }
    if (bl.halo) bl.halo.rotation.z += dt * 1.2;
    if (bl.cape) this.updateCape(dt);
  };

  /* The cape is a wrapped cylinder; we billow it by pushing the lower rows
     backward and rippling them, scaled by how fast the fighter is moving. */
  Fighter.prototype.updateCape = function (dt) {
    var cp = this.built.cape, base = this.built.capeBase;
    var arr = cp.geometry.attributes.position.array;
    var t = this.animT * 3.4;
    var wind = M.clamp(this.vel.length() * 0.045, 0, 1.6);
    for (var i = 0; i < arr.length; i += 3) {
      var bx = base[i], by = base[i + 1], bz = base[i + 2];
      var v = 0.5 - by;                        /* 0 at the collar, 1 at the hem */
      var ripple = Math.sin(t + bx * 4.5 + v * 5.0) * 0.07 * v;
      var flare = 1 + v * (0.10 + wind * 0.22);
      arr[i] = bx * flare;
      arr[i + 1] = by + v * v * wind * 0.16;   /* lifts as you fly */
      arr[i + 2] = (bz - (v * v * 0.30 + ripple) * (0.5 + wind)) * flare;
    }
    cp.geometry.attributes.position.needsUpdate = true;
    cp.geometry.computeVertexNormals();
  };

  /* --------------------------------------------------------------- aura */
  Fighter.prototype.refreshAura = function () {
    var f = this.form();
    var col = f ? f.aura : this.spec.aura;
    this.auraColor = col;
    var c = new THREE.Color(col);
    this.aura.material.uniforms.uColor.value.copy(c);
    this.aura.material.uniforms.uCore.value.set(1, 1, 1);
    this.auraCore.material.uniforms.uColor.value.copy(c).multiplyScalar(1.4);
    this.auraCore.material.uniforms.uCore.value.set(1.4, 1.4, 1.4);
    this.baseGlow = f ? (f.glow || 0.6) : 0.16;
  };

  Fighter.prototype.form = function () {
    return this.formIdx >= 0 ? this.spec.forms[this.formIdx] : null;
  };

  Fighter.prototype.formName = function () {
    var f = this.form();
    return f ? f.name : 'Base';
  };

  Fighter.prototype.canTransform = function () {
    var next = this.formIdx + 1;
    if (next >= this.spec.forms.length) return false;
    return this.ki >= this.spec.forms[next].cost;
  };

  Fighter.prototype.transform = function (idx) {
    var forms = this.spec.forms;
    if (idx === undefined) idx = this.formIdx + 1;
    if (idx >= forms.length) return false;
    var f = forms[idx];
    if (idx > this.formIdx && this.ki < f.cost) return false;
    if (idx > this.formIdx) this.ki -= f.cost;
    this.formIdx = idx;

    /* stats are the product of every form up to this one */
    var mp = 1, ms = 1, md = 1;
    for (var i = 0; i <= idx; i++) { mp *= forms[i].pwr; ms *= forms[i].spd; md *= forms[i].def; }
    this.statMul = { pwr: mp, spd: ms, def: md };
    var hpFrac = this.hp / this.maxHp;
    this.applyStats(this.hpScale || 1);
    this.hp = this.maxHp * hpFrac;

    if (f.hair) B.rehair(this.built, this.spec, f.hair);
    B.retint(this.built, { eye: f.eye === null ? undefined : f.eye, skin: f.skin === null ? undefined : f.skin });
    if (f.bulk && f.bulk !== 1) this.model.scale.setScalar(1);
    this.model.scale.setScalar((f.h || 1));
    this.refreshAura();
    this.transformFlash = 0.9;
    this.kiDrain = f.kiDrain;
    C.bus.emit('transform', { fighter: this, form: f });
    return true;
  };

  Fighter.prototype.revert = function () {
    if (this.formIdx < 0) return false;
    this.formIdx--;
    var forms = this.spec.forms;
    var mp = 1, ms = 1, md = 1;
    for (var i = 0; i <= this.formIdx; i++) { mp *= forms[i].pwr; ms *= forms[i].spd; md *= forms[i].def; }
    this.statMul = { pwr: mp, spd: ms, def: md };
    var hpFrac = this.hp / this.maxHp;
    this.applyStats(this.hpScale || 1);
    this.hp = this.maxHp * hpFrac;
    var f = this.form();
    B.rehair(this.built, this.spec, f && f.hair ? f.hair : this.baseHair);
    B.retint(this.built, {
      eye: f && f.eye ? f.eye : this.spec.eye,
      skin: f && f.skin ? f.skin : this.spec.skin
    });
    this.model.scale.setScalar(f && f.h ? f.h : 1);
    this.refreshAura();
    this.kiDrain = f ? f.kiDrain : 0;
    return true;
  };

  /* ------------------------------------------------------------ helpers */
  Fighter.prototype.chest = function (out) {
    out = out || new THREE.Vector3();
    return out.set(this.pos.x, this.pos.y + this.chestOff, this.pos.z);
  };

  Fighter.prototype.handPos = function (side, out) {
    out = out || new THREE.Vector3();
    var h = side < 0 ? this.rig.handL : this.rig.handR;
    h.getWorldPosition(out);
    return out;
  };

  Fighter.prototype.forward = function (out) {
    out = out || new THREE.Vector3();
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  };

  /* aim vector including the vertical offset to the target */
  Fighter.prototype.aim = function (out) {
    out = out || new THREE.Vector3();
    if (this.target && this.target.alive) {
      out.copy(this.target.chest(C.tmp.v4)).sub(this.chest(C.tmp.v5)).normalize();
    } else {
      out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    }
    return out;
  };

  Fighter.prototype.distTo = function (o) {
    return this.chest(C.tmp.v0).distanceTo(o.chest(C.tmp.v1));
  };

  Fighter.prototype.faceTarget = function (dt, rate) {
    if (!this.target) return;
    var dx = this.target.pos.x - this.pos.x, dz = this.target.pos.z - this.pos.z;
    if (dx * dx + dz * dz < 1e-5) return;
    this.targetYaw = Math.atan2(dx, dz);
    this.yaw = M.dampAngle(this.yaw, this.targetYaw, rate === undefined ? this.turnRate : rate, dt);
  };

  Fighter.prototype.snapFace = function () {
    if (!this.target) return;
    this.yaw = this.targetYaw = Math.atan2(this.target.pos.x - this.pos.x, this.target.pos.z - this.pos.z);
  };

  /* --------------------------------------------------------------- state */
  Fighter.prototype.setState = function (s) {
    if (this.state === s) return;
    this.state = s;
    this.stateT = 0;
  };

  Fighter.prototype.busy = function () {
    return this.state === 'melee' || this.state === 'special' || this.state === 'beam' ||
      this.state === 'ult' || this.state === 'hit' || this.state === 'blow' ||
      this.state === 'down' || this.state === 'rise' || this.state === 'ko' ||
      this.state === 'transform' || this.state === 'vanish' || this.state === 'intro';
  };

  Fighter.prototype.canAct = function () {
    if (!this.alive) return false;
    if (this.bound > 0 || this.dizzy > 0) return false;
    return !this.busy();
  };

  /* Interruptible states can be cancelled into a vanish or a guard. */
  Fighter.prototype.canVanish = function () {
    return this.alive && this.ki >= 12 && this.bound <= 0 &&
      (this.state === 'hit' || this.state === 'blow' || !this.busy());
  };

  /* --------------------------------------------------------------- damage */
  Fighter.prototype.hurt = function (info) {
    if (!this.alive) return 0;
    if (this.invuln > 0 && !info.unblockable) return 0;

    var dmg = info.dmg || 100;
    var guarded = false;

    if (this.shield > 0 && !info.unblockable) {
      this.shield -= dmg;
      FX.ring({
        x: this.pos.x, y: this.pos.y + this.chestOff, z: this.pos.z,
        color: 0x9fe8ff, boost: 3, orient: 'face', r0: this.radius, r1: this.radius * 2.4, life: 0.3
      });
      if (this.shield <= 0) { this.shield = 0; }
      return 0;
    }

    /* guarding: cheap to hold, expensive to hold badly */
    if (this.state === 'guard' && this.guard > 0 && !info.unblockable) {
      var ang = 1;
      if (info.from) {
        var dx = info.from.x - this.pos.x, dz = info.from.z - this.pos.z;
        var a = Math.atan2(dx, dz);
        ang = Math.cos(M.angDelta(this.yaw, a));
      }
      if (ang > 0.1) {
        guarded = true;
        this.guard -= dmg * 0.055 + 4;
        dmg *= 0.14;
        if (this.guard <= 0) {
          this.guard = 0;
          this.dizzy = 1.6;
          guarded = false;
          dmg *= 2.2;
          C.bus.emit('guardbreak', { fighter: this });
        }
      }
    }

    dmg *= this.defense;
    if (info.scale) dmg *= info.scale;

    /* combo scaling — long strings taper so nobody gets deleted in one go */
    if (info.attacker) {
      var n = info.attacker.combo;
      dmg *= M.clamp(1 - n * 0.028, 0.42, 1);
    }

    dmg = Math.max(1, dmg);
    this.hp -= dmg;
    this.ult = Math.min(100, this.ult + dmg * 0.0055);
    this.lastHitTime = this.animT;

    if (info.attacker) {
      info.attacker.ult = Math.min(100, info.attacker.ult + dmg * 0.0075);
      info.attacker.ki = Math.min(info.attacker.maxKi, info.attacker.ki + dmg * 0.0016);
    }

    var hx = info.x === undefined ? this.pos.x : info.x;
    var hy = info.y === undefined ? this.pos.y + this.chestOff : info.y;
    var hz = info.z === undefined ? this.pos.z : info.z;

    if (guarded) {
      FX.ring({ x: hx, y: hy, z: hz, color: 0x9fe8ff, boost: 2.6, orient: 'face', r0: 0.3, r1: 1.8, life: 0.22 });
      C.bus.emit('guardhit', { fighter: this, dmg: dmg, x: hx, y: hy, z: hz });
      this.hitStop = Math.max(this.hitStop, 0.03);
      this.vel.multiplyScalar(0.5);
      if (info.knock) {
        this.vel.addScaledVector(info.knock, 0.28);
      }
    } else {
      var power = M.clamp(dmg / 380, 0.5, 3);
      if (info.big) FX.smash(hx, hy, hz, info.color || 0xffe14d, power);
      else FX.hit(hx, hy, hz, info.color || 0xfff0a0, power);
      C.bus.emit('hit', { fighter: this, dmg: dmg, x: hx, y: hy, z: hz, info: info, guarded: false });

      this.hitStop = Math.max(this.hitStop, info.stop === undefined ? 0.055 : info.stop);
      if (info.attacker) info.attacker.hitStop = this.hitStop;

      if (info.knock) this.vel.copy(info.knock);
      if (info.launch) {
        this.setState('blow');
        this.stunT = info.stun || 0.85;
        this.grounded = false;
      } else {
        this.setState('hit');
        this.stunT = info.stun || 0.28;
      }
      this.act = null;
      this.chargeT = 0;
      this.vanishWindow = 0.22;   /* the window to punish back */
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.knockOut(info);
    }
    return dmg;
  };

  Fighter.prototype.knockOut = function (info) {
    if (!this.alive) return;
    this.alive = false;
    this.setState('ko');
    this.act = null;
    this.grounded = false;
    var k = (info && info.knock) ? info.knock.clone() : new THREE.Vector3(0, 6, 0);
    k.multiplyScalar(1.4); k.y = Math.max(k.y, 7);
    this.vel.copy(k);
    this.auraOn = false;
    FX.burst(this.pos.x, this.pos.y + this.chestOff, this.pos.z, this.auraColor, 5, 0.7);
    C.bus.emit('ko', { fighter: this, by: info && info.attacker });
  };

  Fighter.prototype.heal = function (n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  };

  /* --------------------------------------------------------------- update */
  var _v = new THREE.Vector3();

  Fighter.prototype.update = function (dt, world) {
    this.animT += dt;

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      /* frozen frame: still animate the aura so it does not look dead */
      this.aura.material.uniforms.uTime.value += dt;
      this.auraCore.material.uniforms.uTime.value += dt;
      this.applyPose(dt * 0.15);
      this.syncTransform();
      return;
    }

    var i;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.vanishWindow = Math.max(0, this.vanishWindow - dt);
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    this.blind = Math.max(0, this.blind - dt);
    this.bound = Math.max(0, this.bound - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.markT = Math.max(0, this.markT - dt);
    this.dizzy = Math.max(0, this.dizzy - dt);
    this.faceLock = Math.max(0, this.faceLock - dt);
    if (this.transformFlash) this.transformFlash = Math.max(0, this.transformFlash - dt * 1.6);

    /* --- resources --- */
    if (this.alive) {
      var f = this.form();
      if (f && f.kiDrain) {
        this.ki -= f.kiDrain * dt;
        if (this.ki <= 0) { this.ki = 0; this.revert(); }
      }
      if (this.state !== 'charge') {
        this.ki = Math.min(this.maxKi, this.ki + this.kiRegen * dt);
      }
      this.guard = Math.min(100, this.guard + (this.state === 'guard' ? 3 : 16) * dt);
    }

    /* --- state timers --- */
    switch (this.state) {
      case 'hit':
        this.stunT -= dt;
        this.setPose(POSE.hit, 22);
        if (this.stunT <= 0) this.setState('idle');
        break;
      case 'blow':
        this.stunT -= dt;
        this.setPose(POSE.blow, 9);
        if (this.stunT <= 0) {
          if (this.grounded) { this.setState('down'); this.downT = 0.55; }
          else this.setState('idle');
        }
        break;
      case 'down':
        this.downT -= dt;
        this.setPose(POSE.down, 12);
        if (this.downT <= 0) { this.setState('rise'); }
        break;
      case 'rise':
        this.setPose(POSE.stance, 9);
        if (this.stateT > 0.32) { this.setState('idle'); this.invuln = 0.25; }
        break;
      case 'ko':
        this.setPose(POSE.down, 6);
        break;
      case 'transform':
        this.setPose(POSE.roar, 10);
        if (this.stateT > 0.9) this.setState('idle');
        break;
      case 'vanish':
        if (this.stateT > 0.14) { this.setState('idle'); }
        break;
      case 'charge':
        this.chargeT += dt;
        this.ki = Math.min(this.maxKi, this.ki + this.kiCharge * dt);
        this.setPose(POSE.charge, 14);
        break;
      case 'guard':
        this.setPose(POSE.guard, 18);
        break;
    }

    /* --- physics --- */
    var drag = this.grounded ? 9 : (this.flying ? 5.5 : 1.2);
    if (this.state === 'blow' || this.state === 'ko') drag = 0.9;
    if (this.state === 'dash') drag = 1.6;

    var g = 0;
    if (!this.flying || this.state === 'blow' || this.state === 'ko' || this.state === 'down') {
      g = -34;
      if (this.state === 'ko') g = -26;
    }

    this.vel.y += g * dt;
    var k = Math.exp(-drag * dt);
    this.vel.x *= k; this.vel.z *= k;
    if (this.flying && this.state !== 'blow' && this.state !== 'ko') this.vel.y *= k;

    this.pos.addScaledVector(this.vel, dt);

    /* ground */
    var gy = world ? world.groundAt(this.pos.x, this.pos.z) : 0;
    if (this.pos.y <= gy + 0.001) {
      var impact = -this.vel.y;
      this.pos.y = gy;
      if (this.vel.y < 0) this.vel.y = 0;
      if (!this.grounded) {
        this.grounded = true;
        this.flying = false;
        if (impact > 12) {
          FX.debris(this.pos.x, gy, this.pos.z, world && world.dustColor, M.clamp(impact / 22, 0.6, 2.6));
          if (world && world.crater) world.crater(this.pos.x, this.pos.z, M.clamp(impact / 26, 0.4, 1.6));
          C.bus.emit('slam', { fighter: this, power: impact });
          if (this.state === 'blow' && impact > 18) {
            this.hurt({ dmg: impact * 5, unblockable: false, attacker: this.hitBy, x: this.pos.x, y: gy + 0.5, z: this.pos.z, stun: 0.4 });
            this.setState('down'); this.downT = 0.7;
          }
        }
      }
      if (this.state === 'blow') { this.setState('down'); this.downT = 0.6; }
      if (this.state === 'ko') { this.vel.x *= 0.6; this.vel.z *= 0.6; }
    } else {
      this.grounded = false;
    }

    /* arena bounds */
    if (world) world.clamp(this);

    /* --- facing --- */
    if (this.alive && this.target && this.faceLock <= 0 &&
      this.state !== 'ko' && this.state !== 'down' && this.state !== 'blow') {
      var rate = this.state === 'beam' || this.state === 'ult' ? 3 : this.turnRate;
      this.faceTarget(dt, rate);
    }

    /* --- afterimages while dashing --- */
    if ((this.state === 'dash' || this.dashT > 0) && this.alive) {
      this.dashT -= dt;
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        this.ghostT = 0.045;
        FX.ghost(this.model, this.auraColor, 0.3, 0.42);
      }
    }

    /* --- aura --- */
    this.updateAura(dt);

    /* --- pose --- */
    this.animateLocomotion(dt);
    this.applyPose(dt);
    this.syncTransform();
  };

  Fighter.prototype.syncTransform = function () {
    this.group.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    /* lean into the direction of travel while flying */
    var lean = this.flying ? M.clamp(this.vel.length() * 0.012, 0, 0.35) : 0;
    this.model.rotation.z = 0;
    this.model.rotation.x = 0;
    if (lean > 0.001) {
      var fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      var fwd = this.vel.x * fx + this.vel.z * fz;
      var side = this.vel.x * fz - this.vel.z * fx;
      this.model.rotation.x = M.clamp(fwd * 0.010, -0.4, 0.4);
      this.model.rotation.z = M.clamp(-side * 0.012, -0.4, 0.4);
    }
  };

  Fighter.prototype.updateAura = function (dt) {
    var u = this.aura.material.uniforms, u2 = this.auraCore.material.uniforms;
    u.uTime.value += dt; u2.uTime.value += dt;

    var want = this.baseGlow;
    if (this.state === 'charge') want = 1.5 + Math.sin(this.animT * 22) * 0.18;
    else if (this.state === 'dash') want = Math.max(want, 1.0);
    else if (this.state === 'beam' || this.state === 'ult' || this.state === 'special') want = Math.max(want, 1.1);
    else if (this.state === 'transform') want = 2.4;
    if (!this.alive) want = 0;
    if (this.transformFlash > 0) want = Math.max(want, this.transformFlash * 2.6);

    this.auraLevel = M.damp(this.auraLevel === undefined ? 0 : this.auraLevel, want, 9, dt);
    u.uIntensity.value = this.auraLevel * 0.65;
    u2.uIntensity.value = this.auraLevel * 0.55;
    var s = 1 + this.auraLevel * 0.10;
    this.aura.scale.set(s, 1 + this.auraLevel * 0.20, s);

    /* flame particles + lightning for the higher forms */
    if (this.auraLevel > 0.25 && this.alive) {
      FX.auraFlames(this.pos.x, this.pos.y + this.chestOff * 0.8, this.pos.z,
        this.auraColor, this.height * 0.42, Math.min(2, this.auraLevel), dt);
      var f = this.form();
      var sparks = f ? (f.sparks || 0) : 0;
      if (this.state === 'charge') sparks += 0.8;
      if (sparks > 0) {
        this._boltT = (this._boltT || 0) - dt;
        if (this._boltT <= 0) {
          this._boltT = M.rand(0.04, 0.18) / Math.max(0.3, sparks);
          var a = M.rand(0, M.PI2), r = this.radius * M.rand(0.8, 2.0);
          var y0 = this.pos.y + M.rand(0.2, this.height);
          FX.bolt(this.pos.x + Math.cos(a) * r * 0.3, y0, this.pos.z + Math.sin(a) * r * 0.3,
            this.pos.x + Math.cos(a) * r, y0 + M.rand(-0.6, 1.4), this.pos.z + Math.sin(a) * r,
            0xfff6b0, 0.11, 0.35, 3.4);
        }
      }
    }
  };

  /* run / fly cycle layered on top of whatever pose is active */
  Fighter.prototype.animateLocomotion = function (dt) {
    if (this.busy() || this.state === 'charge' || this.state === 'guard') return;
    var sp = Math.hypot(this.vel.x, this.vel.z);
    if (!this.alive) return;

    if (!this.grounded || this.flying) {
      if (sp > this.flySpd * 0.55) this.setPose(POSE.dash, 10);
      else if (sp > 0.6 || !this.grounded) this.setPose(POSE.fly, 8);
      else this.setPose(POSE.stance, 10);
      return;
    }

    if (sp < 0.45) { this.setPose(POSE.stance, 10); return; }

    /* grounded run: a stance with swinging limbs */
    var cyc = this.animT * M.clamp(sp * 1.5, 5, 16);
    var s = Math.sin(cyc), c = Math.cos(cyc);
    var amp = M.clamp(sp / this.moveSpd, 0.3, 1.2);
    var p = this.poseTarget;
    for (var i = 0; i < PKEYS.length; i++) p[PKEYS[i]] = POSE.stance[PKEYS[i]];
    p.lLX += s * 0.85 * amp;
    p.lRX += -s * 0.85 * amp;
    p.sLX += Math.max(0, -s) * 1.1 * amp;
    p.sRX += Math.max(0, s) * 1.1 * amp;
    p.aLX += -s * 0.55 * amp;
    p.aRX += s * 0.55 * amp;
    p.torsoX += 0.16 * amp;
    p.hipY = Math.abs(c) * 0.012 * amp;
    p.hipsY += s * 0.12 * amp;
    this.poseBlend = 18;
  };

  /* ------------------------------------------------------------- movement */
  /* `mv` is a world-space desired direction, length 0..1 */
  Fighter.prototype.move = function (mv, dt, boost) {
    if (!this.canAct() && this.state !== 'guard') return;
    var spd = (this.flying ? this.flySpd : this.moveSpd) * (boost ? 1.8 : 1);
    if (this.state === 'guard') spd *= 0.35;
    if (this.slowT > 0) spd *= 0.45;
    var accel = (this.grounded ? 60 : 34) * (boost ? 1.6 : 1);
    this.vel.x += mv.x * spd * accel * dt / Math.max(1, spd);
    this.vel.z += mv.z * spd * accel * dt / Math.max(1, spd);
    if (this.flying) this.vel.y += mv.y * spd * accel * dt / Math.max(1, spd);
    var h = Math.hypot(this.vel.x, this.vel.z);
    if (h > spd) { this.vel.x *= spd / h; this.vel.z *= spd / h; }
  };

  Fighter.prototype.ascend = function (dt, dir) {
    this.flying = true;
    this.grounded = false;
    this.vel.y += dir * 44 * dt;
    this.vel.y = M.clamp(this.vel.y, -this.flySpd, this.flySpd);
  };

  Fighter.prototype.startDash = function (dirVec) {
    if (this.ki < 6) return false;
    this.ki -= 6;
    this.setState('dash');
    this.dashT = 0.30;
    this.flying = true;
    this.grounded = false;
    var d = dirVec || this.forward(_v);
    this.vel.copy(d).setLength(this.dashSpd);
    C.bus.emit('dash', { fighter: this });
    return true;
  };

  Fighter.prototype.startCharge = function () {
    if (!this.canAct()) return false;
    this.setState('charge');
    this.chargeT = 0;
    C.bus.emit('charge', { fighter: this, on: true });
    return true;
  };

  Fighter.prototype.stopCharge = function () {
    if (this.state === 'charge') { this.setState('idle'); C.bus.emit('charge', { fighter: this, on: false }); }
  };

  Fighter.prototype.setGuard = function (on) {
    if (on) { if (this.canAct() || this.state === 'guard') this.setState('guard'); }
    else if (this.state === 'guard') this.setState('idle');
  };

  /* Vanish: teleport behind the attacker and get a free beat. */
  Fighter.prototype.vanish = function () {
    if (!this.canVanish()) return false;
    this.ki -= 12;
    var t = this.hitBy && this.hitBy.alive ? this.hitBy : this.target;
    FX.ghost(this.model, 0xd8e6ff, 0.35, 0.7);
    FX.burst(this.pos.x, this.pos.y + this.chestOff, this.pos.z, 0xd8e6ff, 1.6, 0.3);
    if (t) {
      var back = _v.set(Math.sin(t.yaw), 0, Math.cos(t.yaw)).multiplyScalar(-this.radius * 2.1);
      this.pos.set(t.pos.x + back.x, t.pos.y + 0.2, t.pos.z + back.z);
      this.snapFace();
    }
    this.vel.multiplyScalar(0.1);
    this.setState('vanish');
    this.invuln = 0.28;
    this.stunT = 0;
    this.act = null;
    C.bus.emit('vanish', { fighter: this });
    return true;
  };

  Fighter.prototype.reset = function (pos, yaw, opts) {
    opts = opts || {};
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = this.targetYaw = yaw;
    this.hp = this.maxHp;
    this.ki = opts.ki === undefined ? 40 : opts.ki;
    this.guard = 100;
    this.ult = opts.ult || 0;
    this.alive = true;
    this.combo = 0;
    this.act = null;
    this.state = 'idle';
    this.stateT = 0;
    this.grounded = true;
    this.flying = false;
    this.invuln = 0;
    this.hitStop = 0;
    this.shield = 0;
    this.blind = this.bound = this.slowT = this.markT = this.dizzy = 0;
    while (this.formIdx >= 0) this.revert();
    this.setPose(POSE.stance, 999);
    this.syncTransform();
  };

  Fighter.prototype.dispose = function () {
    this.model.traverse(function (o) {
      if (o.isMesh) { if (o.material && o.material.dispose) o.material.dispose(); }
    });
  };

  C.Fighter = Fighter;

})(DBZ);
