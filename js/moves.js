/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — moves, projectiles and beam struggles

   Nine archetypes cover every signature attack in the roster. A character's
   Kamehameha and another's Galick Gun run the same code with different
   numbers and colours, which means one well-tuned beam benefits everyone.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M, FX = C.FX, POSE = C.POSE;
  var Mv = {};
  C.Moves = Mv;

  var _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

  /* ============================== world hooks =========================== */
  Mv.init = function (scene) {
    Mv.scene = scene;
    Mv.projs = [];
    Mv.beams = [];
    Mv.struggles = [];
    Mv.minions = [];
    Mv.fighters = [];
  };

  Mv.reset = function () {
    var i;
    for (i = Mv.projs.length - 1; i >= 0; i--) killProj(Mv.projs[i]);
    for (i = Mv.beams.length - 1; i >= 0; i--) killBeam(Mv.beams[i]);
    Mv.projs.length = 0; Mv.beams.length = 0; Mv.struggles.length = 0;
  };

  /* ============================ melee attacks =========================== */
  /* Combo strings. Each entry: pose, timings, damage scale, knockback.     */
  /* Each step names an animation clip and the fraction of it at which the
     damage lands, so the hit frame and the visible strike can never drift.
     `cancel` is when the next attack may be buffered in. */
  var COMBO = [
    { clip: 'jab', dur: 0.30, hit: 0.34, cancel: 0.56, dmg: 1.00, kb: 3, side: -1 },
    { clip: 'cross', dur: 0.34, hit: 0.36, cancel: 0.58, dmg: 1.08, kb: 3, side: 1 },
    { clip: 'kickRound', dur: 0.40, hit: 0.42, cancel: 0.68, dmg: 1.30, kb: 5, side: 1 },
    { clip: 'hook', dur: 0.34, hit: 0.38, cancel: 0.60, dmg: 1.16, kb: 4, side: -1 },
    { clip: 'kickSpin', dur: 0.46, hit: 0.44, cancel: 0.72, dmg: 1.50, kb: 7, side: 1 },
    { clip: 'smash', dur: 0.52, hit: 0.46, cancel: 0.80, dmg: 2.20, kb: 22, launch: 1, big: 1, side: 1 }
  ];

  var RUSH_RANGE = 19;      /* auto-close distance for a locked-on strike */
  var MELEE_REACH = 2.6;

  Mv.melee = function (f, world, heavy) {
    if (!f.canAct()) {
      /* allow buffering the next hit while recovering */
      if (f.act && f.act.type === 'melee' && f.act.step < 5 &&
          f.act.t / f.act.c.dur >= f.act.c.cancel * 0.6) f.act.buffer = true;
      return false;
    }
    /* the five-hit string loops so a held button never stalls on one move */
    var step = heavy ? 5 : (f.comboT > 0 ? (f.combo % 5) : 0);
    startMelee(f, world, step, heavy);
    return true;
  };

  function startMelee(f, world, step, heavy) {
    var c = COMBO[step];
    f.setState('melee');
    f.act = {
      type: 'melee', step: step, c: c, t: 0, done: false,
      heavy: !!heavy, buffer: false, rushed: false, didHit: false
    };
    f.playClip(c.clip, c.dur);

    /* close the gap — this is what makes the game feel like the anime */
    var t = f.target;
    if (t && t.alive) {
      var d = f.distTo(t);
      if (d > MELEE_REACH + 0.4 && d < RUSH_RANGE) {
        f.snapFace();
        var want = _v.copy(t.pos).sub(f.pos);
        want.y = (t.pos.y + t.chestOff * 0.7) - (f.pos.y + f.chestOff * 0.7);
        var dist = want.length();
        want.normalize();
        f.pos.addScaledVector(want, Math.max(0, dist - MELEE_REACH * 0.72));
        f.pos.y = Math.max(world ? world.groundAt(f.pos.x, f.pos.z) : 0, f.pos.y);
        f.vel.multiplyScalar(0.2);
        if (!f.grounded || t.pos.y > 0.6) { f.flying = true; f.grounded = false; }
        f.act.rushed = true;
        FX.ghost(f.model, f.auraColor, 0.22, 0.5);
        C.bus.emit('rushdash', { fighter: f });
      }
    }
  }

  function meleeTick(f, dt, world) {
    var a = f.act, c = a.c;
    a.t += dt;
    var frac = a.t / c.dur;

    if (!a.didHit && frac >= c.hit) {
      a.didHit = true;
      doMeleeHit(f, c, world);
    }

    if (frac < c.cancel) return;

    var next = a.step + 1;
    /* A queued special / ultimate / transformation outranks the combo —
       otherwise a held attack button chains forever and the buffered
       action never finds a frame where the fighter can act. */
    var chain = (a.buffer || (f.autoCombo && f.holdAttack)) && !f.buf;
    if (chain && next <= 4 && !a.heavy) {
      startMelee(f, world, next, false);
      return;
    }
    if (frac >= 1) {
      f.act = null;
      f.setState('idle');
    }
  }

  function doMeleeHit(f, c, world) {
    var t = f.target;
    C.bus.emit('swing', { fighter: f, heavy: !!c.launch });
    if (!t || !t.alive) return;
    var d = f.distTo(t);
    var reach = MELEE_REACH + f.radius * 0.4 + t.radius * 0.4;
    if (d > reach) return;
    /* must be roughly in front */
    var toT = _v.copy(t.pos).sub(f.pos);
    var fwd = _v2.set(Math.sin(f.yaw), 0, Math.cos(f.yaw));
    toT.y = 0;
    if (toT.lengthSq() > 1e-4 && toT.normalize().dot(fwd) < 0.15) return;

    /* the defender may vanish out of it */
    if (t.aiWantsVanish && t.aiWantsVanish()) { t.vanish(); return; }

    var kn = _v3.copy(t.pos).sub(f.pos);
    kn.y = 0;
    if (kn.lengthSq() < 1e-4) kn.copy(fwd);
    kn.normalize().multiplyScalar(c.kb);
    if (c.launch) kn.y = 13; else kn.y = 1.2;

    var hp = f.handPos(c.side || 1, _v);
    var dmg = 225 * c.dmg * f.atk * (f.dmgOut || 1);

    t.hitBy = f;
    t.hurt({
      dmg: dmg, attacker: f, knock: kn, launch: !!c.launch, big: !!c.big,
      color: f.auraColor, stun: c.launch ? 0.85 : 0.26,
      x: hp.x, y: hp.y, z: hp.z, from: f.pos,
      stop: c.launch ? 0.10 : 0.05
    });
    f.combo++;
    f.comboT = 1.05;
    C.bus.emit('combo', { fighter: f, n: f.combo });
  }

  /* ============================== projectiles =========================== */
  function makeProjMesh(kind, color, radius) {
    var grp = new THREE.Object3D();
    var core = new THREE.Mesh(FX.GEO.sphLo, FX.hotMat(0xffffff, 3.2, { opacity: 1 }));
    core.scale.setScalar(radius * 0.62);
    grp.add(core);
    var glow = new THREE.Mesh(FX.GEO.sphLo, FX.hotMat(color, 2.4, { opacity: 0.85 }));
    glow.scale.setScalar(radius);
    grp.add(glow);
    if (kind === 'disc') {
      grp.remove(core); grp.remove(glow);
      var d = new THREE.Mesh(FX.GEO.ring, FX.hotMat(color, 3.4, { side: THREE.DoubleSide, opacity: 1 }));
      d.scale.setScalar(radius * 1.8);
      grp.add(d);
      var d2 = new THREE.Mesh(FX.GEO.ring, FX.hotMat(0xffffff, 3.0, { side: THREE.DoubleSide, opacity: 1 }));
      d2.scale.setScalar(radius * 1.35);
      grp.add(d2);
      grp.userData.spinAxis = 1;
    }
    grp.renderOrder = 5;
    return grp;
  }

  var projPool = [];
  function killProj(p) {
    if (p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh);
    var i = Mv.projs.indexOf(p);
    if (i >= 0) Mv.projs.splice(i, 1);
    if (p.mesh) {
      p.mesh.traverse(function (o) { if (o.isMesh && o.material) o.material.dispose(); });
    }
  }

  Mv.spawnProj = function (o) {
    var p = {
      kind: o.kind || 'blast',
      pos: new THREE.Vector3().copy(o.pos),
      vel: new THREE.Vector3().copy(o.vel),
      owner: o.owner, target: o.target,
      dmg: o.dmg, radius: o.radius || 0.35, blast: o.blast || 0,
      color: o.color, life: o.life || 4, homing: o.homing || 0,
      spin: o.spin || 0, pierce: o.pierce || 0, hits: 0,
      grav: o.grav || 0, trailT: 0, unblockable: o.unblockable || 0,
      status: o.status || null, big: o.big || 0
    };
    p.mesh = makeProjMesh(p.kind, p.color, p.radius);
    p.mesh.position.copy(p.pos);
    Mv.scene.add(p.mesh);
    Mv.projs.push(p);
    return p;
  };

  function projHit(p, victim, world) {
    var kn = _v.copy(p.vel).normalize().multiplyScalar(p.blast > 3 ? 16 : 6);
    kn.y = Math.max(kn.y, p.blast > 3 ? 9 : 2);
    victim.hitBy = p.owner;
    victim.hurt({
      dmg: p.dmg, attacker: p.owner, knock: kn, launch: p.blast > 2.2,
      big: !!p.big, color: p.color, x: p.pos.x, y: p.pos.y, z: p.pos.z,
      from: p.owner ? p.owner.pos : null, unblockable: !!p.unblockable,
      stun: p.blast > 2.2 ? 0.8 : 0.3
    });
    if (p.status) applyStatus(victim, p.status, p.owner);
    if (p.blast > 0) explode(p.pos, p.color, p.blast, p.dmg * 0.35, p.owner, victim, world);
    p.hits++;
    if (p.hits > p.pierce) p.dead = true;
  }

  function explode(pos, color, radius, dmg, owner, skip, world) {
    FX.burst(pos.x, pos.y, pos.z, color, radius, 0.55 + radius * 0.02);
    C.bus.emit('explode', { x: pos.x, y: pos.y, z: pos.z, r: radius });
    if (world && pos.y - (world.groundAt(pos.x, pos.z)) < radius) {
      FX.debris(pos.x, world.groundAt(pos.x, pos.z), pos.z, world.dustColor, M.clamp(radius * 0.35, 0.5, 3));
      if (world.crater) world.crater(pos.x, pos.z, M.clamp(radius * 0.22, 0.3, 2.2));
    }
    if (!dmg) return;
    for (var i = 0; i < Mv.fighters.length; i++) {
      var f = Mv.fighters[i];
      if (!f.alive || f === owner || f === skip) continue;
      if (owner && f.team === owner.team) continue;
      var d = f.chest(_v2).distanceTo(pos);
      if (d < radius + f.radius) {
        var falloff = 1 - M.sat((d - f.radius) / Math.max(0.01, radius));
        var kn = _v3.copy(f.chest(_v)).sub(pos).normalize().multiplyScalar(6 + radius);
        kn.y = Math.max(kn.y, 6);
        f.hitBy = owner;
        f.hurt({
          dmg: dmg * falloff, attacker: owner, knock: kn, launch: radius > 6,
          color: color, x: f.pos.x, y: f.pos.y + f.chestOff, z: f.pos.z,
          from: pos, stun: 0.5
        });
      }
    }
  }
  Mv.explode = explode;

  /* ================================ beams =============================== */
  function makeBeamMesh(color, width) {
    var grp = new THREE.Object3D();
    var core = new THREE.Mesh(FX.GEO.cyl, FX.hotMat(0xffffff, 3.6, { opacity: 1 }));
    var mid = new THREE.Mesh(FX.GEO.cyl, FX.hotMat(color, 3.0, { opacity: 0.9 }));
    var out = new THREE.Mesh(FX.GEO.cyl, FX.hotMat(color, 1.5, { opacity: 0.45 }));
    grp.add(out); grp.add(mid); grp.add(core);
    grp.userData.core = core; grp.userData.mid = mid; grp.userData.out = out;
    grp.userData.w = width;
    /* the cylinder is built along Y; we aim it with a quaternion */
    grp.renderOrder = 5;
    var muzzle = new THREE.Mesh(FX.GEO.sphLo, FX.hotMat(0xffffff, 3.4, { opacity: 1 }));
    grp.add(muzzle);
    grp.userData.muzzle = muzzle;
    var tip = new THREE.Mesh(FX.GEO.sphLo, FX.hotMat(color, 3.0, { opacity: 1 }));
    grp.add(tip);
    grp.userData.tip = tip;
    return grp;
  }

  function killBeam(b) {
    if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
    var i = Mv.beams.indexOf(b);
    if (i >= 0) Mv.beams.splice(i, 1);
    if (b.mesh) b.mesh.traverse(function (o) { if (o.isMesh && o.material) o.material.dispose(); });
    if (b.owner && b.owner.beam === b) b.owner.beam = null;
  }

  Mv.spawnBeam = function (o) {
    var b = {
      owner: o.owner, dir: new THREE.Vector3().copy(o.dir),
      origin: new THREE.Vector3().copy(o.origin),
      len: 0, maxLen: o.maxLen || 120, width: o.width || 0.6,
      dps: o.dps, color: o.color, life: o.life || 1.2, t: 0,
      pierce: !!o.pierce, power: o.power || 1, struggle: null,
      hitT: 0, tipDist: 0, thin: o.thin || 0
    };
    b.mesh = makeBeamMesh(b.color, b.width);
    Mv.scene.add(b.mesh);
    Mv.beams.push(b);
    if (o.owner) o.owner.beam = b;
    C.bus.emit('beamfire', { fighter: o.owner, beam: b });
    return b;
  };

  function updateBeam(b, dt, world) {
    b.t += dt;
    var f = b.owner;
    if (!f || !f.alive || (f.state !== 'beam' && f.state !== 'ult')) { b.life = Math.min(b.life, b.t + 0.08); }

    /* the beam starts at the hands and tracks slowly toward the target */
    if (f && f.alive) {
      var lh = f.handPos(-1, _v), rh = f.handPos(1, _v2);
      b.origin.set((lh.x + rh.x) * 0.5, (lh.y + rh.y) * 0.5, (lh.z + rh.z) * 0.5);
      if (f.target && f.target.alive && !b.struggle) {
        var want = _v3.copy(f.target.chest(_v)).sub(b.origin).normalize();
        b.dir.lerp(want, Math.min(1, dt * 3.2)).normalize();
      }
    }

    b.len = Math.min(b.maxLen, b.len + 260 * dt);

    /* --- what does the beam hit? --- */
    var stop = b.len;
    var hitF = null;
    var i;
    for (i = 0; i < Mv.fighters.length; i++) {
      var o = Mv.fighters[i];
      if (!o.alive || o === f) continue;
      if (f && o.team === f.team) continue;
      var rel = _v.copy(o.chest(_v2)).sub(b.origin);
      var along = rel.dot(b.dir);
      if (along < 0 || along > stop) continue;
      var perp = rel.addScaledVector(b.dir, -along).length();
      if (perp < b.width * 2.2 + o.radius) { stop = along; hitF = o; }
    }

    /* --- beam versus beam: the struggle --- */
    if (!b.struggle) {
      for (i = 0; i < Mv.beams.length; i++) {
        var ob = Mv.beams[i];
        if (ob === b || ob.struggle) continue;
        if (!ob.owner || !b.owner || ob.owner.team === b.owner.team) continue;
        var d = ob.dir.dot(b.dir);
        if (d > -0.25) continue;                      /* must be roughly head-on */
        var sep = b.origin.distanceTo(ob.origin);
        if (b.len + ob.len < sep - 1) continue;
        startStruggle(b, ob, sep);
        break;
      }
    }

    if (b.struggle) {
      var s = b.struggle;
      stop = Math.max(0.8, s.point.distanceTo(b.origin));
      hitF = null;
    }

    /* --- ground stop --- */
    if (world) {
      var steps = 8;
      for (i = 1; i <= steps; i++) {
        var t = (stop * i) / steps;
        var px = b.origin.x + b.dir.x * t, py = b.origin.y + b.dir.y * t, pz = b.origin.z + b.dir.z * t;
        if (py <= world.groundAt(px, pz)) {
          stop = t;
          b.groundHit = true;
          if (b.t - (b.lastGround || -1) > 0.12) {
            b.lastGround = b.t;
            FX.debris(px, world.groundAt(px, pz), pz, world.dustColor, 1.4);
            if (world.crater) world.crater(px, pz, 0.9);
          }
          break;
        }
      }
    }

    b.tipDist = stop;

    /* --- damage --- */
    if (hitF) {
      b.hitT -= dt;
      if (b.hitT <= 0) {
        b.hitT = 0.085;
        var tipx = b.origin.x + b.dir.x * stop, tipy = b.origin.y + b.dir.y * stop, tipz = b.origin.z + b.dir.z * stop;
        var kn = _v.copy(b.dir).multiplyScalar(9);
        kn.y = Math.max(kn.y, 3);
        hitF.hitBy = f;
        hitF.hurt({
          dmg: b.dps * 0.085, attacker: f, knock: kn, color: b.color,
          x: tipx, y: tipy, z: tipz, from: b.origin, stun: 0.18, stop: 0.02
        });
      }
    }

    /* --- draw --- */
    var mid = _v.copy(b.dir).multiplyScalar(stop * 0.5).add(b.origin);
    b.mesh.position.copy(mid);
    b.mesh.quaternion.setFromUnitVectors(_v2.set(0, 1, 0), b.dir);
    var fade = M.sat((b.life - b.t) / 0.22);
    var grow = M.sat(b.t / 0.10);
    var w = b.width * grow * fade * (0.9 + Math.sin(b.t * 44) * 0.10);
    var u = b.mesh.userData;
    u.core.scale.set(w * 0.42, stop, w * 0.42);
    u.mid.scale.set(w * 0.78, stop, w * 0.78);
    u.out.scale.set(w * 1.5, stop * 0.995, w * 1.5);
    u.muzzle.position.set(0, -stop * 0.5, 0);
    u.muzzle.scale.setScalar(w * 1.7);
    u.tip.position.set(0, stop * 0.5, 0);
    u.tip.scale.setScalar(w * (b.struggle ? 4.5 : (hitF || b.groundHit ? 2.6 : 1.3)) *
      (1 + Math.sin(b.t * 30) * 0.12));

    /* sparks at the impact point */
    if ((hitF || b.groundHit || b.struggle) && Math.random() < dt * 60) {
      var tp = _v2.copy(b.dir).multiplyScalar(stop).add(b.origin);
      FX.hit(tp.x, tp.y, tp.z, b.color, b.struggle ? 2.2 : 1.1);
    }

    if (b.t >= b.life) return false;
    return true;
  }

  /* ------------------------------ struggles ---------------------------- */
  function startStruggle(a, b, sep) {
    var s = {
      a: a, b: b, point: new THREE.Vector3(), t: 0,
      /* 0 = dead centre; positive pushes toward b */
      bias: 0, mashA: 0, mashB: 0, done: false
    };
    var mid = M.clamp(a.len / Math.max(0.01, a.len + b.len), 0.2, 0.8);
    s.point.copy(a.origin).lerp(b.origin, mid);
    a.struggle = s; b.struggle = s;
    Mv.struggles.push(s);
    var orb = new THREE.Mesh(FX.GEO.sphLo, FX.hotMat(0xffffff, 3.2, { opacity: 1 }));
    orb.scale.setScalar(1.4);
    Mv.scene.add(orb);
    s.orb = orb;
    C.bus.emit('struggle', { a: a.owner, b: b.owner, on: true });
  }

  function updateStruggle(s, dt) {
    s.t += dt;
    var a = s.a, b = s.b;
    if (!a.owner || !b.owner || !a.owner.alive || !b.owner.alive ||
      Mv.beams.indexOf(a) < 0 || Mv.beams.indexOf(b) < 0) { endStruggle(s, null); return false; }

    /* keep both beams alive, and keep both fighters braced behind them —
       a struggle where the casters go idle looks like a bug, not a duel */
    a.life = Math.max(a.life, a.t + 0.35);
    b.life = Math.max(b.life, b.t + 0.35);
    [a.owner, b.owner].forEach(function (o) {
      if (!o || !o.alive) return;
      o.setState('beam');
      o.setPose(POSE.beamFire, 12);
      o.vel.multiplyScalar(0.82);
      o.snapFace();
      o.ki = Math.max(0, o.ki - 5.5 * dt);
    });
    /* running dry is a way to lose */
    if (a.owner.ki <= 0 && b.owner.ki > 0) { endStruggle(s, a.owner); return false; }
    if (b.owner.ki <= 0 && a.owner.ki > 0) { endStruggle(s, b.owner); return false; }

    var pa = a.power * (1 + s.mashA * 0.95);
    var pb = b.power * (1 + s.mashB * 0.95);
    s.mashA = Math.max(0, s.mashA - dt * 1.5);
    s.mashB = Math.max(0, s.mashB - dt * 1.5);

    var push = (pa - pb) / Math.max(0.001, pa + pb);
    s.bias = M.clamp(s.bias + push * dt * 1.5, -1, 1);

    var mid = 0.5 + s.bias * 0.5;
    s.point.copy(a.origin).lerp(b.origin, M.clamp(mid, 0.04, 0.96));

    s.orb.position.copy(s.point);
    var pulse = 2.0 + Math.sin(s.t * 26) * 0.35 + Math.abs(s.bias) * 1.6;
    s.orb.scale.setScalar(pulse);
    s.orb.material.color.setHex(0xffffff).multiplyScalar(3.4);

    if (Math.random() < dt * 90) {
      FX.hit(s.point.x, s.point.y, s.point.z, Math.random() < 0.5 ? a.color : b.color, 2.4);
    }
    if (Math.random() < dt * 26) {
      var ang = M.rand(0, M.PI2);
      FX.bolt(s.point.x, s.point.y, s.point.z,
        s.point.x + Math.cos(ang) * 4, s.point.y + M.rand(-3, 3), s.point.z + Math.sin(ang) * 4,
        0xffffff, 0.14, 1.1, 3.0);
    }
    FX.ring({
      x: s.point.x, y: s.point.y, z: s.point.z, color: 0xffffff, boost: 2.4,
      orient: 'face', r0: 1.2, r1: 3.4, life: 0.22
    });

    /* someone got overwhelmed */
    if (s.bias >= 0.90) { endStruggle(s, b.owner); return false; }
    if (s.bias <= -0.90) { endStruggle(s, a.owner); return false; }
    /* a stalemate blows up between them and hurts both */
    if (s.t > 6.5) {
      explode(s.point, 0xffffff, 11, 700, null, null, Mv.world);
      endStruggle(s, null);
      return false;
    }
    return true;
  }

  function endStruggle(s, loser) {
    if (s.done) return;
    s.done = true;
    if (s.orb) { Mv.scene.remove(s.orb); s.orb.material.dispose(); }
    s.a.struggle = null; s.b.struggle = null;
    var i = Mv.struggles.indexOf(s);
    if (i >= 0) Mv.struggles.splice(i, 1);
    var win = loser === s.a.owner ? s.b.owner : (loser === s.b.owner ? s.a.owner : null);
    if (loser && loser.alive) {
      var beam = loser === s.a.owner ? s.b : s.a;
      var kn = _v.copy(beam.dir).multiplyScalar(26); kn.y = 14;
      loser.hitBy = win;
      loser.hurt({
        dmg: 1400 * (win ? win.atk : 1), attacker: win, knock: kn, launch: true, big: true,
        color: beam.color, x: loser.pos.x, y: loser.pos.y + loser.chestOff, z: loser.pos.z,
        from: s.point, stun: 1.4, stop: 0.2
      });
      explode(loser.chest(_v2), beam.color, 9, 300, win, loser, Mv.world);
    }
    s.a.life = Math.min(s.a.life, s.a.t + 0.15);
    s.b.life = Math.min(s.b.life, s.b.t + 0.15);
    C.bus.emit('struggle', { a: s.a.owner, b: s.b.owner, on: false, loser: loser });
  }

  /* the player and AI push by mashing */
  /* the player's per-press shove; tuned so a determined masher beats Elite */
  Mv.pushStruggle = function (f, amount) {
    for (var i = 0; i < Mv.struggles.length; i++) {
      var s = Mv.struggles[i];
      if (s.a.owner === f) { s.mashA = Math.min(1.6, s.mashA + amount); return true; }
      if (s.b.owner === f) { s.mashB = Math.min(1.6, s.mashB + amount); return true; }
    }
    return false;
  };

  Mv.inStruggle = function (f) {
    for (var i = 0; i < Mv.struggles.length; i++) {
      if (Mv.struggles[i].a.owner === f || Mv.struggles[i].b.owner === f) return Mv.struggles[i];
    }
    return null;
  };

  /* ============================== status ================================ */
  function applyStatus(victim, kind, from) {
    switch (kind) {
      case 'blind': victim.blind = 3.5; break;
      case 'bind': victim.bound = 1.6; break;
      case 'freeze': victim.bound = 1.2; break;
      case 'slow': victim.slowT = 4; break;
      case 'poison': victim.poison = 5; break;
      case 'stone': victim.bound = 2.0; break;
      case 'candy': victim.bound = 1.4; break;
      case 'mark': victim.markT = 8; break;
    }
    C.bus.emit('status', { fighter: victim, kind: kind, from: from });
  }
  Mv.applyStatus = applyStatus;

  /* ============================== specials ============================== */
  /* All specials go through here. `def` is the roster entry's move object. */
  Mv.special = function (f, world, def, isUlt) {
    if (!f.canAct() || !def) return false;
    var cost = isUlt ? 0 : costOf(def);
    if (isUlt) {
      if (f.ult < 100) return false;
    } else if (f.ki < cost) return false;

    if (isUlt) f.ult = 0; else f.ki -= cost;

    f.act = { type: 'special', def: def, t: 0, phase: 'wind', fired: 0, ult: !!isUlt, world: world };
    f.setState(isUlt ? 'ult' : 'special');
    f.faceLock = 0;
    f.snapFace();
    var arch = def.arch;
    /* One clip covers the whole move — wind-up, release and recovery — so the
       body flows through it instead of snapping between two held poses. */
    var T = TIMING[arch] || TIMING.nova;
    var wind = T[0] * (isUlt ? 1.5 : 1);
    if (arch === 'beam') wind = (def.charge || 1) * (isUlt ? 0.85 : 0.62);
    var total = wind + T[1] * (isUlt ? 1.35 : 1) + T[2];
    var clipName = C.Anim.archClip[arch] || 'nova';
    f.act.clipTotal = total;
    f.act.windFrac = wind / total;
    f.playClip(clipName, total, { hold: arch === 'beam' });
    C.bus.emit('special', { fighter: f, def: def, ult: !!isUlt });
    return true;
  };

  function costOf(def) {
    switch (def.arch) {
      case 'beam': return def.charge > 1.6 ? 45 : 26;
      case 'sphere': return 34;
      case 'barrage': return 20;
      case 'disc': return 24;
      case 'nova': return 30;
      case 'swarm': return 32;
      case 'rush': return 28;
      case 'buff': return 25;
      case 'trick': return 18;
      default: return 25;
    }
  }
  Mv.costOf = costOf;

  /* timings per archetype: [windup, action, recovery] */
  var TIMING = {
    beam: [0.42, 0.10, 0.45],
    sphere: [0.34, 0.12, 0.40],
    barrage: [0.16, 0.70, 0.28],
    disc: [0.28, 0.10, 0.32],
    nova: [0.30, 0.16, 0.44],
    swarm: [0.40, 0.55, 0.40],
    rush: [0.22, 0.95, 0.38],
    buff: [0.35, 0.20, 0.35],
    trick: [0.20, 0.14, 0.28]
  };

  function specialTick(f, dt, world) {
    var a = f.act, def = a.def, arch = def.arch;
    var T = TIMING[arch] || TIMING.nova;
    var wind = T[0] * (a.ult ? 1.5 : 1);
    if (arch === 'beam') wind = (def.charge || 1) * (a.ult ? 0.85 : 0.62);
    a.t += dt;

    if (a.phase === 'wind') {
      /* charge-up visuals */
      var hand = f.handPos(1, _v);
      if (arch === 'beam') {
        var lh = f.handPos(-1, _v2), rh = f.handPos(1, _v3);
        hand.set((lh.x + rh.x) * 0.5, (lh.y + rh.y) * 0.5, (lh.z + rh.z) * 0.5);
      }
      FX.charge(hand.x, hand.y, hand.z, def.color, 1.8, 90, dt);
      if (!a.orb) {
        a.orb = new THREE.Mesh(FX.GEO.sphLo, FX.hotMat(def.color, 3.0, { opacity: 1 }));
        Mv.scene.add(a.orb);
      }
      var k = M.sat(a.t / wind);
      a.orb.position.copy(hand);
      var os = (arch === 'sphere' ? 1.5 : 0.8) * (a.ult ? 1.7 : 1) * (0.25 + k * 0.9);
      a.orb.scale.setScalar(os * (1 + Math.sin(a.t * 30) * 0.06));
      if (arch === 'sphere' && def.sky) a.orb.position.y = f.pos.y + f.height * 1.5 + k * 2;

      if (a.t >= wind) { a.phase = 'act'; a.t = 0; fireSpecial(f, def, a, world); }
      return;
    }

    if (a.phase === 'act') {
      if (arch === 'barrage') runBarrage(f, a, def, dt, world);
      else if (arch === 'rush') runRush(f, a, def, dt, world);
      else if (arch === 'swarm') runSwarm(f, a, def, dt, world);
      if (a.t >= T[1] * (a.ult ? 1.35 : 1)) {
        a.phase = 'rec'; a.t = 0;
        if (a.orb) { Mv.scene.remove(a.orb); a.orb.material.dispose(); a.orb = null; }
      }
      return;
    }

    /* recovery */
    if (a.t >= T[2]) {
      if (a.orb) { Mv.scene.remove(a.orb); a.orb.material.dispose(); a.orb = null; }
      f.act = null;
      f.setState('idle');
    }
  }

  function fireSpecial(f, def, a, world) {
    var ult = a.ult;
    var mul = (ult ? 1 : 1) * f.atk * (f.dmgOut || 1);
    var origin = f.handPos(1, new THREE.Vector3());
    var dir = f.aim(new THREE.Vector3());

    switch (def.arch) {
      case 'beam': {
        var lh = f.handPos(-1, _v), rh = f.handPos(1, _v2);
        origin.set((lh.x + rh.x) * 0.5, (lh.y + rh.y) * 0.5, (lh.z + rh.z) * 0.5);
        var dur = ult ? 1.5 : 0.95;
        Mv.spawnBeam({
          owner: f, origin: origin, dir: dir,
          width: (def.thin ? 0.24 : 0.55) * (def.wide || 1) * (ult ? 1.5 : 1),
          dps: (def.dmg || 900) * mul / dur * 0.85,
          color: def.color, life: dur, pierce: !!def.pierce,
          power: (def.dmg || 900) * mul * (ult ? 1.6 : 1) / 1000,
          maxLen: 140, thin: def.thin
        });
        FX.burst(origin.x, origin.y, origin.z, def.color, 2.2, 0.35);
        f.vel.addScaledVector(dir, -6);
        break;
      }
      case 'sphere': {
        var sp = def.sky ? 26 : 34;
        var from = def.sky ? _v.set(f.pos.x, f.pos.y + f.height * 1.6, f.pos.z) : origin;
        Mv.spawnProj({
          kind: 'sphere', pos: from, vel: dir.clone().multiplyScalar(sp),
          owner: f, dmg: (def.dmg || 900) * mul * 0.55, radius: 0.9 * (ult ? 1.7 : 1) * (def.radius ? def.radius / 10 : 1),
          blast: (def.radius || 9) * (ult ? 1.3 : 1), color: def.color, life: 4,
          homing: 0.9, big: 1, grav: 0
        });
        break;
      }
      case 'disc': {
        var n = def.count || 1;
        for (var i = 0; i < n; i++) {
          var d2 = dir.clone();
          if (n > 1) { d2.applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (n - 1) / 2) * 0.22); }
          Mv.spawnProj({
            kind: 'disc', pos: origin, vel: d2.multiplyScalar(30),
            owner: f, dmg: (def.dmg || 800) * mul * 0.8, radius: 0.75,
            blast: 0, color: def.color, life: 3.2, homing: def.homing ? 2.6 : 0,
            spin: 22, pierce: 0, unblockable: 1
          });
        }
        break;
      }
      case 'nova': {
        var r = (def.radius || 9) * (ult ? 1.4 : 1);
        var c = f.chest(_v);
        explode(c, def.color, r, (def.dmg || 800) * mul * 0.9, f, null, world);
        FX.ring({ x: c.x, y: c.y, z: c.z, color: def.color, boost: 3.2, orient: 'flat', r0: 1, r1: r * 2.2, life: 0.6 });
        if (def.selfHurt) {
          f.hp = Math.max(1, f.hp - f.maxHp * def.selfHurt * 0.14);
        }
        C.bus.emit('shockwave', { x: c.x, y: c.y, z: c.z, r: r });
        break;
      }
      case 'barrage': {
        a.shots = def.count || 12;
        a.shotT = 0;
        break;
      }
      case 'swarm': {
        a.orbs = [];
        var count = def.count || 10;
        for (var s = 0; s < count; s++) {
          var ang = (s / count) * M.PI2, ring = 5 + (s % 3) * 1.6;
          var p = Mv.spawnProj({
            kind: 'blast',
            pos: _v.set(f.pos.x + Math.cos(ang) * 3, f.pos.y + f.chestOff + 1, f.pos.z + Math.sin(ang) * 3),
            vel: _v2.set(0, 0, 0), owner: f, dmg: (def.dmg || 700) * mul * 0.22,
            radius: 0.45, blast: 3.2, color: def.color, life: 5, homing: 0
          });
          p.orbit = { ang: ang, r: ring, t: 0, phase: 'form' };
          a.orbs.push(p);
        }
        break;
      }
      case 'rush': {
        a.hits = def.hits || 8;
        a.done = 0;
        a.hitT = 0;
        a.lockTarget = f.target;
        if (f.target && f.target.alive) {
          f.target.bound = Math.max(f.target.bound, 0.9);
          f.invuln = 0.9;
        }
        C.bus.emit('cinematic', { fighter: f, kind: 'rush', dur: 0.95 });
        break;
      }
      case 'buff': {
        applyBuff(f, def, ult);
        break;
      }
      case 'trick': {
        runTrick(f, def, world, ult);
        break;
      }
    }
  }

  function runBarrage(f, a, def, dt, world) {
    a.shotT -= dt;
    if (a.shotT > 0 || a.shots <= 0) return;
    a.shotT = 0.055;
    a.shots--;
    var side = (a.shots % 2) ? 1 : -1;
    var origin = f.handPos(side, new THREE.Vector3());
    var dir = f.aim(new THREE.Vector3());
    dir.x += M.rand(-0.05, 0.05); dir.y += M.rand(-0.04, 0.04); dir.z += M.rand(-0.05, 0.05);
    dir.normalize();
    Mv.spawnProj({
      kind: 'blast', pos: origin, vel: dir.multiplyScalar(def.thin ? 92 : 62),
      owner: f, dmg: (def.dmg || 620) * f.atk * (f.dmgOut || 1) * (a.ult ? 0.22 : 0.14),
      radius: def.thin ? 0.20 : 0.34, blast: def.thin ? 0 : 1.8,
      color: def.color, life: 2.4, homing: def.homing ? 2.2 : 0.5
    });
    FX.hit(origin.x, origin.y, origin.z, def.color, 0.35);
    C.bus.emit('kishot', { fighter: f, small: true });
  }

  function runSwarm(f, a, def, dt, world) {
    if (!a.orbs) return;
    var t = f.target;
    for (var i = 0; i < a.orbs.length; i++) {
      var p = a.orbs[i];
      if (p.dead || !p.orbit) continue;
      p.orbit.t += dt;
      if (p.orbit.phase === 'form' && t && t.alive) {
        p.orbit.ang += dt * 2.4;
        var cx = t.pos.x, cy = t.pos.y + t.chestOff, cz = t.pos.z;
        var want = _v.set(
          cx + Math.cos(p.orbit.ang) * p.orbit.r,
          cy + Math.sin(p.orbit.ang * 1.7) * 2.5,
          cz + Math.sin(p.orbit.ang) * p.orbit.r);
        p.pos.lerp(want, Math.min(1, dt * 6));
        if (p.orbit.t > 0.5 + i * 0.03) {
          p.orbit.phase = 'strike';
          p.vel.copy(_v2.set(cx, cy, cz).sub(p.pos)).normalize().multiplyScalar(48);
          p.homing = 3.5;
        }
      }
    }
  }

  function runRush(f, a, def, dt, world) {
    var t = a.lockTarget;
    if (!t || !t.alive) { a.t = 99; return; }
    a.hitT -= dt;
    t.bound = Math.max(t.bound, 0.2);
    if (a.hitT > 0 || a.done >= a.hits) return;
    a.hitT = 0.9 / Math.max(1, a.hits);
    a.done++;

    /* teleport to a new angle around the target and strike */
    var ang = M.rand(0, M.PI2), pitch = M.rand(-0.5, 0.7);
    var r = t.radius + f.radius + 0.9;
    f.pos.set(
      t.pos.x + Math.cos(ang) * r,
      t.pos.y + t.chestOff * 0.6 + Math.sin(pitch) * 1.6,
      t.pos.z + Math.sin(ang) * r);
    f.snapFace();
    f.vel.set(0, 0, 0);
    f.flying = true; f.grounded = false;
    FX.ghost(f.model, f.auraColor, 0.22, 0.6);
    f.playClip('rushHit', 0.9 / Math.max(1, a.hits) * 1.6);

    var last = a.done >= a.hits;
    var base = (def.dmg ? def.dmg / a.hits : (a.ult ? 260 : 150));
    var kn = _v.copy(t.pos).sub(f.pos).normalize().multiplyScalar(last ? 30 : 2);
    kn.y = last ? 16 : 0.5;
    var hp = f.handPos(a.done % 2 ? 1 : -1, _v2);
    t.hitBy = f;
    t.hurt({
      dmg: base * f.atk * (f.dmgOut || 1) * (last ? 3.2 : 1),
      attacker: f, knock: kn, launch: last, big: last, color: def.color,
      x: hp.x, y: hp.y, z: hp.z, from: f.pos, stun: last ? 1.3 : 0.16,
      stop: last ? 0.16 : 0.03
    });
    if (def.sword) FX.ring({ x: hp.x, y: hp.y, z: hp.z, color: 0xd8e6ff, boost: 3, orient: 'face', r0: 0.4, r1: 3.2, life: 0.2 });
    if (def.dragon && last) {
      /* Dragon Fist: a serpent of light */
      for (var i = 0; i < 26; i++) {
        var u = i / 25;
        var px = M.lerp(f.pos.x, t.pos.x, u) + Math.sin(u * 12) * 1.6;
        var py = M.lerp(f.pos.y + f.chestOff, t.pos.y + t.chestOff, u) + Math.cos(u * 10) * 1.2;
        var pz = M.lerp(f.pos.z, t.pos.z, u) + Math.cos(u * 12) * 1.6;
        FX.dots.spawn({
          x: px, y: py, z: pz, life: 0.55, size: 1.5 - u * 0.6, size1: 0,
          color: 0xffb545, boost: 3.2, color1: 0xffe14d, boost1: 2.4, drag: 0.5
        });
      }
    }
    if (last) explode(t.chest(_v), def.color, 7, 220 * f.atk, f, t, world);
  }

  function applyBuff(f, def, ult) {
    f.buff = { t: ult ? 16 : 11, pwr: ult ? 1.55 : 1.32, spd: ult ? 1.30 : 1.16, color: def.color };
    f.statMulBuff = f.buff;
    var mp = 1, ms = 1, md = 1, forms = f.spec.forms;
    for (var i = 0; i <= f.formIdx; i++) { mp *= forms[i].pwr; ms *= forms[i].spd; md *= forms[i].def; }
    f.statMul = { pwr: mp * f.buff.pwr, spd: ms * f.buff.spd, def: md };
    var frac = f.hp / f.maxHp;
    f.applyStats(f.hpScale || 1);
    f.hp = f.maxHp * frac;
    FX.burst(f.pos.x, f.pos.y + f.chestOff, f.pos.z, def.color, 4.5, 0.6);
    C.bus.emit('buff', { fighter: f, def: def });
  }

  function runTrick(f, def, world, ult) {
    var t = f.target;
    var mode = def.mode || 'buff';
    var c = f.chest(_v);
    switch (mode) {
      case 'blink':
        if (t && t.alive) {
          var back = _v2.set(Math.sin(t.yaw), 0, Math.cos(t.yaw)).multiplyScalar(-(t.radius + f.radius + 0.7));
          FX.ghost(f.model, 0xd8e6ff, 0.35, 0.7);
          f.pos.set(t.pos.x + back.x, t.pos.y + 0.1, t.pos.z + back.z);
          f.snapFace();
          f.invuln = 0.4;
        }
        FX.burst(c.x, c.y, c.z, def.color, 2.2, 0.35);
        break;
      case 'blind':
        FX.burst(c.x, c.y, c.z, 0xffffff, 9, 0.5);
        C.bus.emit('flashbang', { fighter: f });
        if (t && t.alive && f.distTo(t) < 26) applyStatus(t, 'blind', f);
        break;
      case 'shield':
        f.shield = 1400 * (ult ? 2.5 : 1) * f.atk;
        FX.ring({ x: c.x, y: c.y, z: c.z, color: def.color, boost: 3, orient: 'face', r0: 0.5, r1: f.radius * 3, life: 0.5 });
        break;
      case 'heal':
        f.heal(f.maxHp * (ult ? 0.35 : 0.20));
        FX.burst(c.x, c.y, c.z, 0x9fffd8, 3.5, 0.6);
        break;
      case 'absorb':
        f.ki = Math.min(f.maxKi, f.ki + 45);
        f.heal(f.maxHp * 0.10);
        if (t && t.alive && f.distTo(t) < 14) { t.ki = Math.max(0, t.ki - 30); }
        FX.burst(c.x, c.y, c.z, def.color, 3, 0.5);
        break;
      case 'drain':
        if (t && t.alive && f.distTo(t) < 22) {
          var amt = t.maxHp * 0.07;
          t.hitBy = f;
          t.hurt({ dmg: amt, attacker: f, color: def.color, stun: 0.2, from: f.pos });
          f.heal(amt * 0.9);
          f.ki = Math.min(f.maxKi, f.ki + 25);
        }
        break;
      case 'bind': case 'freeze': case 'stone': case 'candy': case 'seal':
        if (t && t.alive && f.distTo(t) < 24) {
          applyStatus(t, mode === 'seal' ? 'bind' : mode, f);
          FX.burst(t.pos.x, t.pos.y + t.chestOff, t.pos.z, def.color, 3, 0.5);
        }
        break;
      case 'timeskip': case 'counter': case 'rewind': case 'warp':
        f.counterT = 1.5;
        f.invuln = mode === 'counter' ? 0.9 : 0.55;
        FX.ghost(f.model, def.color, 0.4, 0.6);
        if (mode === 'timeskip' && t && t.alive) { t.slowT = 3.5; t.bound = 0.5; }
        break;
      case 'haste':
        applyBuff(f, { color: def.color }, false);
        f.buff.spd = 1.55;
        break;
      case 'mark':
        if (t && t.alive) applyStatus(t, 'mark', f);
        break;
      case 'poison':
        if (t && t.alive && f.distTo(t) < 20) applyStatus(t, 'poison', f);
        break;
      case 'hakai':
        if (t && t.alive && f.distTo(t) < 20) {
          t.hitBy = f;
          t.hurt({
            dmg: t.maxHp * (t.hp / t.maxHp < 0.25 ? 0.9 : 0.16) * (ult ? 2 : 1),
            attacker: f, unblockable: true, big: true, color: def.color,
            knock: _v2.set(0, 6, 0), from: f.pos, stun: 0.8
          });
          FX.burst(t.pos.x, t.pos.y + t.chestOff, t.pos.z, def.color, 6, 0.8);
        }
        break;
      case 'swap':
        if (t && t.alive) {
          var tmp = f.pos.clone();
          f.pos.copy(t.pos); t.pos.copy(tmp);
          f.snapFace(); t.snapFace();
          FX.burst(c.x, c.y, c.z, def.color, 3, 0.5);
        }
        break;
      case 'storm':
        for (var i = 0; i < 8; i++) {
          var ang = M.rand(0, M.PI2), rr = M.rand(4, 14);
          var tx = (t ? t.pos.x : f.pos.x) + Math.cos(ang) * rr;
          var tz = (t ? t.pos.z : f.pos.z) + Math.sin(ang) * rr;
          Mv.spawnProj({
            kind: 'blast', pos: _v2.set(tx, f.pos.y + 30, tz),
            vel: _v3.set(0, -55, 0), owner: f, dmg: 220 * f.atk,
            radius: 0.5, blast: 3.5, color: def.color, life: 3
          });
        }
        break;
      case 'ghosts': case 'clones': case 'minion':
        spawnMinions(f, def, mode, world);
        break;
      case 'copy':
        f.ki = Math.min(f.maxKi, f.ki + 40);
        f.ult = Math.min(100, f.ult + 35);
        FX.burst(c.x, c.y, c.z, def.color, 3.5, 0.5);
        break;
      default:
        applyBuff(f, def, ult);
    }
  }

  /* --------------------------------------------------------------- minions
     Cheap orbiting helpers: Cell Jrs, Super Ghosts, Multi-Form clones.   */
  function spawnMinions(f, def, mode, world) {
    var n = mode === 'ghosts' ? 4 : (mode === 'clones' ? 3 : 2);
    for (var i = 0; i < n; i++) {
      var g = new THREE.Mesh(FX.GEO.sphLo, FX.hotMat(def.color, 2.4, { opacity: 0.9 }));
      g.scale.setScalar(0.5);
      Mv.scene.add(g);
      Mv.minions.push({
        mesh: g, owner: f, t: 0, life: 7, ang: (i / n) * M.PI2,
        dmg: 320 * f.atk, color: def.color, phase: 'orbit', delay: 0.5 + i * 0.35
      });
    }
    FX.burst(f.pos.x, f.pos.y + f.chestOff, f.pos.z, def.color, 3, 0.5);
  }

  function updateMinions(dt, world) {
    for (var i = Mv.minions.length - 1; i >= 0; i--) {
      var m = Mv.minions[i];
      m.t += dt;
      var f = m.owner, t = f && f.target;
      if (m.t > m.life || !f || !f.alive) {
        Mv.scene.remove(m.mesh); m.mesh.material.dispose(); Mv.minions.splice(i, 1); continue;
      }
      if (m.phase === 'orbit') {
        m.ang += dt * 3;
        m.mesh.position.set(
          f.pos.x + Math.cos(m.ang) * 2.4,
          f.pos.y + f.chestOff + 0.8 + Math.sin(m.t * 3) * 0.3,
          f.pos.z + Math.sin(m.ang) * 2.4);
        if (m.t > m.delay && t && t.alive) m.phase = 'chase';
      } else {
        if (!t || !t.alive) { m.t = m.life; continue; }
        var to = _v.copy(t.chest(_v2)).sub(m.mesh.position);
        var d = to.length();
        to.normalize();
        m.mesh.position.addScaledVector(to, Math.min(d, 26 * dt));
        FX.trail(m.mesh.position.x, m.mesh.position.y, m.mesh.position.z, m.color, 0.3, 0.2);
        if (d < t.radius + 0.7) {
          t.hitBy = f;
          t.hurt({
            dmg: m.dmg, attacker: f, knock: _v3.copy(to).multiplyScalar(7),
            color: m.color, x: m.mesh.position.x, y: m.mesh.position.y, z: m.mesh.position.z,
            from: f.pos, stun: 0.3
          });
          explode(m.mesh.position, m.color, 3.2, m.dmg * 0.3, f, t, world);
          m.t = m.life;
        }
      }
    }
  }

  /* ============================ basic ki blast ========================== */
  Mv.kiBlast = function (f, world) {
    if (!f.canAct() && f.state !== 'guard') return false;
    if (f.kiShotT > 0) return false;
    if (f.ki < 2) return false;
    f.ki -= 2;
    f.kiShotT = 0.13;
    if (f.canAct()) { f.playClip('kiShot', 0.26); f.faceLock = 0.18; }
    var side = (f.kiSide = -(f.kiSide || -1));
    var origin = f.handPos(side, new THREE.Vector3());
    var dir = f.aim(new THREE.Vector3());
    Mv.spawnProj({
      kind: 'blast', pos: origin, vel: dir.multiplyScalar(58),
      owner: f, dmg: 130 * f.atk * (f.dmgOut || 1), radius: 0.30, blast: 1.6,
      color: f.auraColor, life: 2.2, homing: 1.4
    });
    C.bus.emit('kishot', { fighter: f });
    return true;
  };

  /* ================================ tick ================================ */
  Mv.tickFighter = function (f, dt, world) {
    if (f.kiShotT > 0) f.kiShotT -= dt;
    if (f.counterT > 0) f.counterT -= dt;
    if (f.poison > 0) {
      f.poison -= dt;
      f.hp = Math.max(1, f.hp - f.maxHp * 0.012 * dt);
    }
    if (f.buff) {
      f.buff.t -= dt;
      if (f.buff.t <= 0) {
        f.buff = null;
        var mp = 1, ms = 1, md = 1, forms = f.spec.forms;
        for (var i = 0; i <= f.formIdx; i++) { mp *= forms[i].pwr; ms *= forms[i].spd; md *= forms[i].def; }
        f.statMul = { pwr: mp, spd: ms, def: md };
        var frac = f.hp / f.maxHp;
        f.applyStats(f.hpScale || 1);
        f.hp = f.maxHp * frac;
      }
    }
    if (!f.act) return;
    if (f.hitStop > 0) return;
    if (f.act.type === 'melee') meleeTick(f, dt, world);
    else if (f.act.type === 'special') specialTick(f, dt, world);
  };

  Mv.update = function (dt, world) {
    Mv.world = world;
    var i, p;

    /* projectiles */
    for (i = Mv.projs.length - 1; i >= 0; i--) {
      p = Mv.projs[i];
      p.life -= dt;
      if (p.life <= 0 || p.dead) { killProj(p); continue; }

      if (p.homing > 0) {
        var t = p.owner && p.owner.target;
        if (t && t.alive) {
          var want = _v.copy(t.chest(_v2)).sub(p.pos).normalize().multiplyScalar(p.vel.length());
          p.vel.lerp(want, Math.min(1, p.homing * dt));
        }
      }
      if (p.grav) p.vel.y += p.grav * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      if (p.kind === 'disc') {
        p.mesh.rotation.y += dt * 26;
        p.mesh.rotation.x = Math.PI / 2;
      }

      p.trailT -= dt;
      if (p.trailT <= 0) {
        p.trailT = 0.016;
        FX.trail(p.pos.x, p.pos.y, p.pos.z, p.color, p.radius * 1.6, 0.24);
      }

      /* fighters */
      var hitSomething = false;
      for (var j = 0; j < Mv.fighters.length; j++) {
        var f = Mv.fighters[j];
        if (!f.alive || f === p.owner) continue;
        if (p.owner && f.team === p.owner.team) continue;
        if (f.chest(_v).distanceTo(p.pos) < f.radius + p.radius * 1.6) {
          projHit(p, f, world);
          hitSomething = true;
          break;
        }
      }
      if (p.dead) { killProj(p); continue; }
      if (hitSomething) continue;

      /* ground / ceiling */
      if (world) {
        var gy = world.groundAt(p.pos.x, p.pos.z);
        if (p.pos.y <= gy + p.radius) {
          if (p.blast > 0) explode(p.pos, p.color, p.blast, p.dmg * 0.3, p.owner, null, world);
          else FX.hit(p.pos.x, gy, p.pos.z, p.color, 1);
          killProj(p); continue;
        }
        if (world.outOfBounds && world.outOfBounds(p.pos)) { killProj(p); continue; }
      }
    }

    /* beams */
    for (i = Mv.beams.length - 1; i >= 0; i--) {
      if (!updateBeam(Mv.beams[i], dt, world)) killBeam(Mv.beams[i]);
    }

    /* struggles */
    for (i = Mv.struggles.length - 1; i >= 0; i--) {
      updateStruggle(Mv.struggles[i], dt);
    }

    updateMinions(dt, world);
  };

})(DBZ);
