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
    'float h1(float n){ return fract(sin(n) * 43758.5453); }',
    'void main(){',
    '  vUv = uv;',
    '  vec3 p = position;',
    /* Ragged the silhouette on purpose. A smooth cone always reads as a cone
       no matter how it is shaded; breaking the outer edge with noise is what
       turns it into a column of fire. */
    '  float band = floor(uv.x * 13.0);',
    '  float rough = h1(band * 12.9898 + floor(uTime * 7.0) * 3.71) * 0.6',
    '               + h1(band * 4.1 + floor(uTime * 11.0) * 1.37) * 0.4;',
    '  float w = sin(uTime * 9.0 + p.y * 6.0 + p.x * 3.0) * 0.4',
    '          + sin(uTime * 13.0 + p.z * 5.0) * 0.3 + (rough - 0.5) * 1.6;',
    '  p.xz *= 1.0 + w * uWob * (0.22 + uv.y * 1.15);',
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
    /* The base of the cone has to fade out too. Leaving it solid draws a
       bright ring round the fighter's feet, which is what makes an aura read
       as a glass lampshade instead of fire. */
    '  float body = smoothstep(0.02, 0.26, vUv.y) * pow(1.0 - vUv.y, 1.25);',
    '  float tongue = smoothstep(0.47, 0.86, n + (1.0 - vUv.y) * 0.42);',
    '  float rim = pow(clamp(vRim, 0.0, 1.0), 2.6);',
    /* Alpha is capped below 1 on purpose. Additive blending plus an
       uncapped intensity turns a full-power aura into an opaque white cone
       with the fighter hidden inside it. */
    '  float a = clamp((rim * body * 0.14 + tongue * body * 2.25) * uIntensity, 0.0, 0.82);',
    '  vec3 col = mix(uColor, uCore, smoothstep(0.25, 0.9, n) * (1.0 - vUv.y * 0.5));',
    '  gl_FragColor = vec4(col * (0.55 + n * 1.15), a);',
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
        uWob: { value: 0.30 }, uTongues: { value: 13 }
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    var mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = 4;
    mesh.frustumCulled = false;
    return mesh;
  }

  /* ============================ pose plumbing ===========================
     Poses and clips live in js/anim.js; this file just plays them back. */
  var A = C.Anim;
  var PKEYS = A.KEYS;
  var P = A.P;
  var POSE = A.POSE;

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
    this.auraCore.material.uniforms.uTongues.value = 7;
    this.auraCore.material.uniforms.uWob.value = 0.18;
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

  /* ------------------------------------------------------------ clips ----
     Play a keyframed animation from js/anim.js. `dur` overrides the clip's
     own length so a move's timing and its animation always agree.        */
  Fighter.prototype.playClip = function (name, dur, opts) {
    var cl = A.CLIP[name];
    if (!cl) return false;
    this.clip = {
      def: cl, name: name, t: 0,
      dur: dur || cl.dur,
      hold: !!(opts && opts.hold) || !!cl.hold,
      mirror: !!(opts && opts.mirror)
    };
    if (!this._clipPose) this._clipPose = P();
    return true;
  };

  Fighter.prototype.stopClip = function () { this.clip = null; };

  Fighter.prototype.clipDone = function () {
    return !this.clip || this.clip.t >= 1;
  };

  Fighter.prototype.updateClip = function (dt) {
    var c = this.clip;
    if (!c) return false;
    c.t += dt / Math.max(0.02, c.dur);
    if (c.t >= 1 && !c.hold) { this.clip = null; return false; }
    A.sample(c.def, Math.min(1, c.t), this._clipPose);
    /* a clip drives the target directly and snaps hard — the keyframes
       already carry the easing, so a slow blend would only smear them */
    for (var i = 0; i < PKEYS.length; i++) {
      this.poseTarget[PKEYS[i]] = this._clipPose[PKEYS[i]];
    }
    this.poseBlend = 40;
    return true;
  };

  Fighter.prototype.applyPose = function (dt) {
    var p = this.pose, t = this.poseTarget, r = this.rig;
    var k = 1 - Math.exp(-this.poseBlend * dt);
    for (var i = 0; i < PKEYS.length; i++) {
      var key = PKEYS[i];
      p[key] += (t[key] - p[key]) * k;
    }

    /* Idle life, layered on top of whatever pose is playing. A fighter that
       holds perfectly still reads as a statue no matter how good the pose. */
    var bt = this.animT;
    var alive = this.alive && this.state !== 'ko';
    var breathe = alive ? Math.sin(bt * 2.3) * 0.022 : 0;
    var sway2 = alive ? Math.sin(bt * 1.15) * 0.030 : 0;   /* slow weight shift */
    var bounce = alive ? Math.sin(bt * 2.3 + 1.2) * 0.006 : 0;
    var bob = 0;
    if (!this.grounded || this.flying) bob = Math.sin(bt * 1.7) * 0.05;

    r.hips.position.y = this.P.hipY + p.hipY * this.height + bounce + bob;
    r.hips.rotation.set(p.hipsX, p.hipsY + sway2 * 0.5, p.hipsZ + sway2 * 0.35);
    r.torso.rotation.set(p.torsoX + breathe, p.torsoY, p.torsoZ - sway2 * 0.25);
    if (r.chest) r.chest.rotation.set(p.chestX + breathe * 0.8, p.chestY, p.chestZ);
    /* the head counter-rotates a little so it stays levelled at the target */
    r.head.rotation.set(p.headX - breathe * 0.6, p.headY - sway2 * 0.4, p.headZ);
    r.armL.rotation.set(p.aLX + breathe * 0.5, p.aLY, p.aLZ - breathe * 0.6);
    r.armR.rotation.set(p.aRX + breathe * 0.5, p.aRY, p.aRZ + breathe * 0.6);
    r.foreL.rotation.x = p.fLX;
    r.foreR.rotation.x = p.fRX;
    if (r.handL) r.handL.rotation.x = p.hLX;
    if (r.handR) r.handR.rotation.x = p.hRX;
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
    this.baseGlow = f ? (f.glow || 0.6) : 0.10;
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
    /* Nobody gets punched out of a transformation. It costs ki and a beat of
       animation; taking a full combo on top of that just teaches players to
       never press the most exciting button in the game. */
    this.invuln = Math.max(this.invuln, 1.0);
    this.playClip('transform', 0.95);
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
        this.playClip('hitHeavy', Math.max(0.4, this.stunT), { hold: true });
      } else {
        this.setState('hit');
        this.stunT = info.stun || 0.28;
        /* a short recoil clip, so being hit is a motion and not a held pose */
        this.playClip('hitLight', Math.max(0.22, this.stunT * 1.1));
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

    /* --- state timers ---
       A running clip owns the pose; these states only set one when there is
       no clip, so an attack animation is never stomped mid-swing. */
    var clipRunning = this.updateClip(dt);
    switch (this.state) {
      case 'hit':
        this.stunT -= dt;
        if (!clipRunning) this.setPose(POSE.hit, 22);
        if (this.stunT <= 0) this.setState('idle');
        break;
      case 'blow':
        this.stunT -= dt;
        if (!clipRunning) this.setPose(POSE.blow, 9);
        if (this.stunT <= 0) {
          if (this.grounded) { this.setState('down'); this.downT = 0.55; }
          else this.setState('idle');
        }
        break;
      case 'down':
        this.downT -= dt;
        this.stopClip();
        this.setPose(POSE.down, 12);
        if (this.downT <= 0) { this.setState('rise'); }
        break;
      case 'rise':
        this.setPose(POSE.stance, 9);
        if (this.stateT > 0.32) { this.setState('idle'); this.invuln = 0.25; }
        break;
      case 'ko':
        this.stopClip();
        this.setPose(POSE.down, 6);
        break;
      case 'transform':
        if (!clipRunning) this.setPose(POSE.roar, 10);
        if (this.stateT > 0.95) this.setState('idle');
        break;
      case 'vanish':
        if (this.stateT > 0.14) { this.setState('idle'); }
        break;
      case 'charge':
        this.chargeT += dt;
        this.ki = Math.min(this.maxKi, this.ki + this.kiCharge * dt);
        this.stopClip();
        /* the strain shake — a charging fighter should vibrate, not pose */
        var q = 1 + Math.min(1.6, this.chargeT * 0.8);
        this.setPose(POSE.charge, 14);
        this.poseTarget.torsoX += Math.sin(this.animT * 34) * 0.020 * q;
        this.poseTarget.chestX += Math.sin(this.animT * 41 + 1) * 0.022 * q;
        this.poseTarget.headX += Math.sin(this.animT * 37 + 2) * 0.030 * q;
        this.poseTarget.aLZ += Math.sin(this.animT * 44) * 0.030 * q;
        this.poseTarget.aRZ -= Math.sin(this.animT * 44) * 0.030 * q;
        this.poseTarget.hipY += Math.abs(Math.sin(this.animT * 22)) * 0.008 * q;
        break;
      case 'guard':
        this.stopClip();
        this.setPose(POSE.guard, 18);
        /* absorb-the-blow micro-recoil while blocking */
        var gr = Math.max(0, 0.25 - (this.animT - this.lastHitTime)) * 4;
        if (gr > 0) { this.poseTarget.torsoX -= gr * 0.18; this.poseTarget.hipY -= gr * 0.02; }
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
    /* Non-linear so a resting fighter's aura all but disappears. A linear
       ramp left a faintly lit cone around everyone at all times, which read
       as a glass lampshade rather than as ki. */
    var lv = Math.min(1.55, Math.pow(Math.max(0, this.auraLevel), 1.7));
    var show = this.auraLevel > 0.20;
    this.aura.visible = show;
    this.auraCore.visible = show;
    u.uIntensity.value = lv * 0.20;
    u2.uIntensity.value = lv * 0.26;
    var s = 1 + this.auraLevel * 0.10;
    this.aura.scale.set(s, 1 + this.auraLevel * 0.20, s);

    /* flame particles + lightning for the higher forms */
    if (this.auraLevel > 0.25 && this.alive) {
      /* Particles, not the shell, are what the aura actually is — the mesh
         is a cone and will always read as one, however it is shaded. */
      FX.auraFlames(this.pos.x, this.pos.y + this.chestOff * 0.72, this.pos.z,
        this.auraColor, this.height * 0.50, Math.min(2.6, this.auraLevel * 1.9), dt);
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

  /* Locomotion and the standing idle. Layered over the stance, never
     replacing it, so a fighter always looks ready rather than parked. */
  Fighter.prototype.animateLocomotion = function (dt) {
    if (this.clip) return;                       /* a clip owns the pose */
    if (this.busy() || this.state === 'charge' || this.state === 'guard') return;
    if (!this.alive) return;
    var sp = Math.hypot(this.vel.x, this.vel.z);
    var p = this.poseTarget, i;
    var bt = this.animT;

    function base(src) {
      for (i = 0; i < PKEYS.length; i++) p[PKEYS[i]] = src[PKEYS[i]];
    }

    if (!this.grounded || this.flying) {
      if (sp > this.flySpd * 0.55) { this.setPose(POSE.dash, 10); return; }
      if (sp > 0.6 || !this.grounded) {
        /* hovering: legs trail and drift, arms float — not a frozen T-pose */
        base(POSE.fly);
        var f2 = Math.sin(bt * 1.9), g2 = Math.cos(bt * 1.5);
        p.lLX += f2 * 0.10; p.lRX -= f2 * 0.09;
        p.sLX += g2 * 0.08; p.sRX -= g2 * 0.07;
        p.aLZ -= f2 * 0.07; p.aRZ += f2 * 0.07;
        p.torsoX += g2 * 0.05;
        this.poseBlend = 9;
        return;
      }
      this.setPose(POSE.stance, 10);
      return;
    }

    if (sp < 0.45) {
      /* Standing idle: a boxer's bounce. Small, fast, and constant — this is
         the difference between a fighting game and a diorama. */
      base(POSE.stance);
      var b = Math.sin(bt * 3.4);
      var b2 = Math.sin(bt * 3.4 + 0.9);
      p.hipY += (Math.abs(b) - 0.5) * 0.016;
      p.sLX += Math.abs(b) * 0.10;
      p.sRX += Math.abs(b2) * 0.09;
      p.lLX -= Math.abs(b) * 0.05;
      p.lRX -= Math.abs(b2) * 0.04;
      /* fists breathe in and out of guard */
      p.fLX += b * 0.075;
      p.fRX -= b2 * 0.065;
      p.aLX += b * 0.045;
      p.aRX -= b2 * 0.040;
      p.chestY += b * 0.035;
      p.hipsY -= b * 0.028;
      this.poseBlend = 13;
      return;
    }

    /* Grounded run: contralateral swing with a real knee lift and a bob. */
    var cyc = bt * M.clamp(sp * 1.6, 6, 17);
    var s = Math.sin(cyc), c = Math.cos(cyc);
    var amp = M.clamp(sp / this.moveSpd, 0.35, 1.25);
    base(POSE.stance);
    p.lLX += s * 0.95 * amp;
    p.lRX += -s * 0.95 * amp;
    /* the trailing leg folds; the leading one straightens to plant */
    p.sLX += Math.max(0, -s) * 1.30 * amp;
    p.sRX += Math.max(0, s) * 1.30 * amp;
    p.ftLX += -Math.max(0, -s) * 0.30 * amp;
    p.ftRX += -Math.max(0, s) * 0.30 * amp;
    p.aLX += -s * 0.60 * amp;
    p.aRX += s * 0.60 * amp;
    p.fLX += -Math.abs(s) * 0.25 * amp;
    p.fRX += -Math.abs(s) * 0.25 * amp;
    p.torsoX += 0.15 * amp;
    p.hipY += (Math.abs(c) - 0.5) * 0.030 * amp;
    p.hipsY += s * 0.16 * amp;
    p.chestY += -s * 0.20 * amp;         /* shoulders counter the hips */
    p.headY += s * 0.05 * amp;
    this.poseBlend = 20;
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
    this.stopClip();
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
    this.stopClip();
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
