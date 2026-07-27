/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — the game

   Renderer, cameras, match flow and everything that turns button presses into
   a fight. Also owns the menu diorama, so browsing the roster shows the real
   3D model rather than a picture of one.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M, FX = C.FX, Mv = C.Moves, U = C.UI, R = C.Roster, L = C.Levels;
  var G = {};
  C.Game = G;

  var _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

  /* =============================== bootstrap ============================= */
  G.init = function (canvas) {
    C.initTmp();
    G.canvas = canvas;

    var S = C.S;
    G.renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: S.quality !== 'low', powerPreference: 'high-performance',
      alpha: false, stencil: false
    });
    G.renderer.setClearColor(0x05070f, 1);
    G.renderer.autoClear = true;
    G.renderer.shadowMap.enabled = false;

    G.scene = new THREE.Scene();
    G.camera = new THREE.PerspectiveCamera(58, 1, 0.35, 2400);
    G.camera2 = new THREE.PerspectiveCamera(58, 1, 0.35, 2400);

    FX.init(G.scene, { quality: S.quality });
    FX.camera = G.camera;
    FX.setQuality(S.quality);
    Mv.init(G.scene);

    G.composer = new FX.Composer(G.renderer);
    G.composer.enabled = !!S.bloom;

    /* camera state */
    G.cam = {
      pos: new THREE.Vector3(0, 6, 18), look: new THREE.Vector3(),
      shake: 0, shakeV: new THREE.Vector3(), yawOff: 0, pitchOff: 0,
      dist: 14, fov: 58, radial: 0, aberr: 0, yaw: 0
    };
    G.cam2 = {
      pos: new THREE.Vector3(0, 6, -18), look: new THREE.Vector3(),
      shake: 0, yawOff: 0, pitchOff: 0, dist: 14, fov: 58, yaw: Math.PI
    };

    G.fighters = [];
    G.state = 'menu';
    G.time = 0;
    G.slowmo = 1;
    G.paused = false;
    G.splitScreen = false;

    G.resize();
    window.addEventListener('resize', G.resize);
    window.addEventListener('orientationchange', function () { setTimeout(G.resize, 250); });

    C.Input.init(canvas);
    C.Audio.bind();
    G.bindEvents();
    G.buildMenuScene();

    G.last = performance.now();
    G.frame = 0;
    requestAnimationFrame(G.tick);
    /* a watchdog in case rAF is throttled in a background tab */
    setInterval(function () {
      if (performance.now() - G.last > 500) G.tick(performance.now());
    }, 400);
  };

  G.resize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    var S = C.S;
    var pr = Math.min(window.devicePixelRatio || 1,
      S.quality === 'low' ? 1 : (S.quality === 'medium' ? 1.5 : 2));
    G.renderer.setPixelRatio(pr);
    G.renderer.setSize(w, h, false);
    G.vw = w; G.vh = h; G.pr = pr;
    if (G.composer) G.composer.setSize(w, h, pr);
    var aspect = G.splitScreen ? (w / 2) / h : w / h;
    G.camera.aspect = aspect; G.camera.updateProjectionMatrix();
    G.camera2.aspect = aspect; G.camera2.updateProjectionMatrix();
    var rot = document.getElementById('rotate');
    if (rot) rot.classList.toggle('armed', C.device.mobile && G.state === 'fight');
  };

  G.applyQuality = function () {
    var S = C.S;
    FX.setQuality(S.quality);
    G.composer.enabled = !!S.bloom;
    G.resize();
  };

  /* ============================== menu scene ============================= */
  G.buildMenuScene = function () {
    var g = new THREE.Object3D();
    G.menuGroup = g;
    G.scene.add(g);

    var sky = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x0a1024, side: THREE.BackSide }));
    g.add(sky);

    var hemi = new THREE.HemisphereLight(0x9fc8ff, 0x241a3a, 0.52);
    g.add(hemi);
    var key = new THREE.DirectionalLight(0xffe8c0, 0.48);
    key.position.set(6, 9, 8);
    g.add(key);
    var rim = new THREE.DirectionalLight(0xff8a3d, 0.28);
    rim.position.set(-8, 4, -7);
    g.add(rim);

    var disc = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 0.4, 40),
      new THREE.MeshLambertMaterial({ color: 0x1a2444 }));
    disc.position.y = -0.2;
    g.add(disc);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.09, 6, 60),
      FX.hotMat(0xffb545, 2.4, { opacity: 1 }));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    G.menuRing = ring;

    /* a slow drift of embers so the menu never looks static */
    G.menuT = 0;
    G.menuGroup.visible = true;
  };

  G.previewCharacter = function (spec) {
    if (G.state === 'fight') return;
    if (G.preview && G.preview.spec.id === spec.id) return;
    if (G.preview) { G.menuGroup.remove(G.preview.group); G.preview.dispose(); }
    var f = new C.Fighter(spec, { isPlayer: true, side: 0 });
    f.pos.set(0, 0, 0);
    f.target = null;
    f.auraLevel = 0;
    f.baseGlow = 0.30;
    G.menuGroup.add(f.group);
    f.setPose(C.POSE.stance, 999);
    f.syncTransform();
    G.preview = f;
    G.previewSpin = -0.4;
  };

  G.updateMenu = function (dt) {
    G.menuT += dt;
    if (!G.menuGroup.visible) return;
    if (G.menuRing) G.menuRing.rotation.z += dt * 0.4;
    var f = G.preview;
    if (f) {
      G.previewSpin += dt * 0.35;
      f.yaw = G.previewSpin;
      f.animT += dt;
      f.state = 'idle';
      f.grounded = true;
      f.updateAura(dt);
      f.setPose(C.POSE.stance, 8);
      f.applyPose(dt);
      f.syncTransform();
      /* the character floats and turns; the camera just watches */
      f.group.position.y = Math.sin(G.menuT * 1.1) * 0.06;
    }
    /* Menu camera: a slow orbit. On a wide screen the fighter is pushed to
       the right so the menu column on the left never sits on top of them. */
    var wide = G.vw / G.vh > 1.15;
    var offX = wide ? -1.55 : 0;
    var a = Math.sin(G.menuT * 0.12) * 0.30 + 0.22;
    var dist = wide ? 4.2 : 4.9;
    G.camera.position.set(Math.sin(a) * dist + offX, 1.55 + Math.sin(G.menuT * 0.3) * 0.12, Math.cos(a) * dist);
    G.camera.lookAt(offX, 1.02, 0);
  };

  G.clearMenuPreview = function () {
    if (G.preview) {
      G.menuGroup.remove(G.preview.group);
      G.preview.dispose();
      G.preview = null;
    }
  };

  /* ============================== match setup ============================ */
  G.defaultConfig = function () {
    return {
      mode: 'versus',
      p1: { id: C.load().lastUsed || 'goku', form: -1, human: true },
      p2: { id: 'vegeta', form: -1, human: false },
      stage: 'wasteland',
      difficulty: C.S.difficulty,
      time: 0,
      hp1: 1, hp2: 1,
      rule: null,
      intro: null, onWin: null, onLose: null
    };
  };

  G.startMatch = function (cfg) {
    G.cfg = cfg;
    G.teardownMatch();
    G.clearMenuPreview();
    G.menuGroup.visible = false;

    C.Audio.resume();
    C.Audio.flushPending();

    var stageDef = C.stageById[cfg.stage] || C.STAGES[0];
    G.arena = new C.Arena(G.scene, stageDef, { quality: C.S.quality });
    Mv.world = G.arena;

    var spawns = G.arena.spawnPoints();
    G.fighters = [];

    var d = C.diff(cfg.difficulty);

    for (var i = 0; i < 2; i++) {
      var pc = i === 0 ? cfg.p1 : cfg.p2;
      var spec = R.get(pc.id);
      var f = new C.Fighter(spec, {
        isPlayer: !!pc.human, side: i, team: i,
        hpScale: i === 0 ? cfg.hp1 : cfg.hp2,
        shadows: false
      });
      f.hpScale = i === 0 ? cfg.hp1 : cfg.hp2;
      f.applyStats(f.hpScale);
      f.reset(spawns[i], i === 0 ? Math.PI / 2 : -Math.PI / 2);
      f.pos.y = G.arena.groundAt(f.pos.x, f.pos.z);
      G.scene.add(f.group);
      G.fighters.push(f);
    }
    G.fighters[0].target = G.fighters[1];
    G.fighters[1].target = G.fighters[0];
    G.fighters[0].snapFace();
    G.fighters[1].snapFace();

    /* starting forms */
    [cfg.p1, cfg.p2].forEach(function (pc, i) {
      var f2 = G.fighters[i];
      if (pc.form !== undefined && pc.form >= 0) {
        for (var k = 0; k <= pc.form; k++) { f2.ki = 100; f2.transform(k); }
        f2.ki = 55;
      }
    });

    /* AI for anyone not human.

       Difficulty is expressed entirely from the player's point of view:
       `dmgOut` scales what the player deals and `dmgIn` scales what the
       player takes. Both therefore belong on the *human* fighter — hanging
       dmgOut on the CPU makes Rookie the tier that hits hardest. */
    var effDiff = cfg.difficulty;
    if (cfg.bump) {
      effDiff = C.DIFF_ORDER[M.clamp(
        C.DIFF_ORDER.indexOf(cfg.difficulty) + cfg.bump, 0, C.DIFF_ORDER.length - 1)];
    }
    var dd = C.diff(effDiff);
    G.effDiff = effDiff;

    G.humans = [];
    for (i = 0; i < 2; i++) {
      var pc2 = i === 0 ? cfg.p1 : cfg.p2;
      var f3 = G.fighters[i];
      if (pc2.human) {
        G.humans.push(f3);
        f3.autoCombo = !!C.S.assistCombo;
      } else {
        f3.ai = new C.AI(f3, effDiff, { seed: i + 1 + (cfg.seed || 0) });
        f3.dmgOut = 1;
      }
    }

    /* In two-player mode nobody gets a handicap. */
    if (cfg.mode !== 'twoplayer') {
      for (i = 0; i < G.humans.length; i++) {
        G.humans[i].dmgOut = dd.dmgOut;
        G.humans[i].defense *= dd.dmgIn;
      }
    }
    Mv.fighters = G.fighters;
    Mv.reset();
    FX.reset();

    G.splitScreen = (cfg.mode === 'twoplayer');
    C.Input.twoPlayer = G.splitScreen;
    document.getElementById('splitLine').classList.toggle('on', G.splitScreen);
    G.resize();

    G.matchTime = cfg.time || 0;
    G.elapsed = 0;
    G.state = 'intro';
    G.introT = 0;
    G.result = null;
    G.stats = { hits: 0, maxCombo: 0, dealt: 0, taken: 0, specials: 0, ults: 0 };
    G.paused = false;

    U.hide();
    U.showHud(true);
    U.bindFighters(G.fighters);
    U.setRoundInfo(cfg.label || '');
    C.Input.showTouch(C.device.touch);

    U.vsCard(G.fighters[0].spec.short, G.fighters[1].spec.short);
    C.Audio.battleTheme(cfg.themeLevel === undefined ? (cfg.bump || 0) : cfg.themeLevel);

    C.P.matches++;
    C.save();
  };

  G.teardownMatch = function () {
    if (G.fighters) {
      for (var i = 0; i < G.fighters.length; i++) {
        G.scene.remove(G.fighters[i].group);
        G.fighters[i].dispose();
      }
      G.fighters = [];
    }
    Mv.fighters = [];
    Mv.reset();
    FX.reset();
    if (G.arena) { G.arena.dispose(); G.arena = null; }
    document.getElementById('splitLine').classList.remove('on');
  };

  /* ================================ events =============================== */
  G.bindEvents = function () {
    var bus = C.bus;

    bus.on('hit', function (e) {
      G.cam.shake = Math.min(1.4, G.cam.shake + M.clamp(e.dmg / 900, 0.05, 0.6));
      if (e.fighter !== G.humans[0]) G.stats.dealt += e.dmg; else G.stats.taken += e.dmg;
      G.stats.hits++;
      var p = _v.set(e.x, e.y, e.z).project(G.camera);
      if (p.z < 1) {
        U.damage((p.x * 0.5 + 0.5) * G.vw, (-p.y * 0.5 + 0.5) * G.vh, e.dmg,
          e.dmg > 700 ? 'big' : null);
      }
    });

    bus.on('guardhit', function (e) {
      var p = _v.set(e.x, e.y, e.z).project(G.camera);
      if (p.z < 1) U.damage((p.x * 0.5 + 0.5) * G.vw, (-p.y * 0.5 + 0.5) * G.vh, 0, 'guard');
    });

    bus.on('combo', function (e) {
      if (e.fighter === G.humans[0]) {
        U.combo(e.n);
        G.stats.maxCombo = Math.max(G.stats.maxCombo, e.n);
      }
    });

    bus.on('special', function (e) {
      if (e.fighter === G.humans[0] || G.splitScreen) U.moveName(e.def.name);
      if (e.ult) { G.stats.ults++; G.cam.shake = Math.max(G.cam.shake, 0.7); U.flash(0.35, '#fff'); }
      else G.stats.specials++;
    });

    bus.on('transform', function (e) {
      U.big(e.form.name.toUpperCase());
      U.flash(0.85, '#ffffff');
      G.cam.shake = 1.3;
      G.hitStop(0.18);
      FX.burst(e.fighter.pos.x, e.fighter.pos.y + e.fighter.chestOff, e.fighter.pos.z,
        e.form.aura, 9, 1.0);
      if (G.arena) G.arena.crater(e.fighter.pos.x, e.fighter.pos.z, 1.6);
    });

    bus.on('explode', function (e) {
      var d = G.camera.position.distanceTo(_v.set(e.x, e.y, e.z));
      G.cam.shake = Math.min(1.6, G.cam.shake + M.clamp(e.r / (6 + d * 0.35), 0.05, 0.9));
    });

    bus.on('slam', function (e) { G.cam.shake = Math.min(1.5, G.cam.shake + e.power * 0.022); });
    bus.on('dash', function () { G.cam.radial = Math.max(G.cam.radial, 0.5); });
    bus.on('flashbang', function () { U.flash(0.9, '#ffffff'); });
    bus.on('guardbreak', function (e) {
      if (e.fighter !== G.humans[0]) U.big('GUARD BREAK');
      G.hitStop(0.12);
    });
    bus.on('struggle', function (e) {
      if (e.on) { C.Audio.duck(true); G.cam.shake = Math.max(G.cam.shake, 0.5); }
      else { C.Audio.duck(false); U.struggle(false); }
    });
    bus.on('ko', function (e) {
      G.onKO(e.fighter);
    });
    bus.on('cinematic', function (e) {
      G.cinematic = { f: e.fighter, t: e.dur };
    });
  };

  G.hitStop = function (t) { G.freeze = Math.max(G.freeze || 0, t); };

  /* =============================== controls ============================== */
  G.controlPlayer = function (f, pad, cam, dt) {
    if (!f.alive) return;

    /* beam struggle: mash */
    var st = Mv.inStruggle(f);
    if (st) {
      if (pad.pressed('attack') || pad.pressed('ki')) Mv.pushStruggle(f, 0.30);
      var side = st.a.owner === f ? 1 : -1;
      U.struggle(true, st.bias * side);
      return;
    }

    /* camera-relative movement. The camera is updated after this, so on the
       very first frame of a match fall back to the fighter's own heading
       rather than reading an undefined yaw and poisoning velocity. */
    var yaw = (typeof cam.yaw === 'number' && isFinite(cam.yaw)) ? cam.yaw : (f.yaw + Math.PI);
    var mx = pad.mx, my = pad.my;
    var len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    var wx = mx * Math.cos(yaw) - my * Math.sin(yaw);
    var wz = -mx * Math.sin(yaw) - my * Math.cos(yaw);

    var boosting = pad.held.boost;
    var mv = _v.set(wx, 0, wz);

    /* vertical */
    if (pad.held.up) { f.ascend(dt, 1); f.flying = true; }
    else if (pad.held.down) { f.ascend(dt, -1); }
    else if (f.flying && !f.grounded) {
      f.vel.y = M.damp(f.vel.y, 0, 3, dt);
    }

    if (len > 0.05) {
      f.move(mv, dt, boosting);
      /* boost + direction = dash */
      if (pad.pressed('boost')) {
        var dd = _v2.set(wx, f.flying ? 0.12 : 0, wz).normalize();
        f.startDash(dd);
      }
    } else if (pad.pressed('boost')) {
      f.startDash(f.aim(_v2));
    }

    /* guard */
    f.setGuard(pad.held.guard && f.canAct() || (pad.held.guard && f.state === 'guard'));

    /* charge */
    if (pad.held.charge) {
      if (f.canAct()) f.startCharge();
    } else if (f.state === 'charge') f.stopCharge();

    /* vanish: guard tapped while being hit */
    if (pad.pressed('guard') && (f.state === 'hit' || f.state === 'blow')) {
      f.vanish();
      return;
    }

    /* attacks */
    f.holdAttack = pad.held.attack;
    f.autoCombo = !!C.S.assistCombo;
    /* Holding the attack button keeps swinging. Without this a held button
       throws exactly one combo and then goes quiet, which is the first thing
       anyone does and the first thing that would feel broken. */
    if (pad.pressed('attack') || (pad.held.attack && f.canAct() && !f.act)) {
      Mv.melee(f, G.arena, false);
    }
    if (pad.pressed('heavy')) Mv.melee(f, G.arena, true);
    if (pad.held.ki && !pad.held.charge) Mv.kiBlast(f, G.arena);

    /* specials */
    var slots = ['s1', 's2', 's3', 's4'];
    for (var i = 0; i < 4; i++) {
      if (pad.pressed(slots[i])) {
        var def = f.spec[slots[i]];
        if (def) {
          if (!Mv.special(f, G.arena, def, false)) {
            if (f.ki < Mv.costOf(def)) U.toast('Not enough ki — hold CHARGE');
          }
        }
      }
    }
    if (pad.pressed('ult')) {
      if (f.ult >= 100) Mv.special(f, G.arena, f.spec.ult, true);
      else U.toast('Ultimate needs a full orange bar (' + Math.floor(f.ult) + '%)');
    }
    if (pad.pressed('transform')) {
      if (f.canTransform()) {
        if (f.canAct()) { f.setState('transform'); f.transform(); }
      } else if (f.formIdx + 1 >= f.spec.forms.length) {
        U.toast(f.spec.forms.length ? 'Already at maximum power' : f.spec.short + ' has no transformations');
      } else {
        U.toast('Need ' + f.spec.forms[f.formIdx + 1].cost + '% ki to become ' +
          f.spec.forms[f.formIdx + 1].name);
      }
    }
    if (pad.pressed('revert')) f.revert();
    if (pad.pressed('taunt') && f.canAct()) {
      f.setPose(C.POSE.victory, 8);
      f.ult = Math.min(100, f.ult + 4);
    }
  };

  /* ================================ camera =============================== */
  function updateCamera(cam, camObj, f, dt, pad) {
    if (!f) return;
    var t = f.target;
    var S = C.S;

    /* user look offset decays back behind the fighter */
    if (pad) {
      cam.yawOff += pad.camX;
      cam.pitchOff += pad.camY;
      pad.camX = pad.camY = 0;
    }
    cam.yawOff = M.damp(cam.yawOff, 0, 1.1, dt);
    cam.pitchOff = M.clamp(M.damp(cam.pitchOff, 0, 0.9, dt), -0.7, 0.9);

    var focus = _v.copy(f.chest(_v2));
    var behind;
    var wantDist;

    if (t && t.alive) {
      var sep = f.pos.distanceTo(t.pos);
      focus.lerp(t.chest(_v3), M.clamp(0.26 + sep * 0.005, 0.26, 0.40));
      behind = _v2.copy(f.pos).sub(t.pos);
      behind.y = 0;
      if (behind.lengthSq() < 1e-4) behind.set(0, 0, 1);
      behind.normalize();
      wantDist = M.clamp(8.0 + sep * 0.38, 8.0, 21) * S.camDist;
      /* pull back and widen for big moves */
      if (f.state === 'ult' || (t && t.state === 'ult')) wantDist *= 1.35;
      else if (f.state === 'beam' || f.state === 'special') wantDist *= 1.12;
    } else {
      behind = _v2.set(-Math.sin(f.yaw), 0, -Math.cos(f.yaw));
      wantDist = 12 * S.camDist;
    }

    cam.dist = M.damp(cam.dist, wantDist, 3.4, dt);
    var yaw = Math.atan2(behind.x, behind.z) + cam.yawOff;
    var pitch = 0.17 + cam.pitchOff;
    if (t && t.alive) {
      /* tilt so a flying opponent stays framed */
      var dy = (t.pos.y + t.chestOff) - (f.pos.y + f.chestOff);
      pitch += M.clamp(dy * 0.010, -0.28, 0.34);
    }

    var cd = Math.cos(pitch) * cam.dist;
    var want = _v3.set(
      focus.x + Math.sin(yaw) * cd,
      focus.y + Math.sin(pitch) * cam.dist + 1.35,
      focus.z + Math.cos(yaw) * cd);

    /* never let the camera sink into the ground */
    if (G.arena) {
      var gy = G.arena.groundAt(want.x, want.z) + 1.6;
      if (want.y < gy) want.y = gy;
    }

    var lag = f.state === 'ko' ? 2.2 : 7.5;
    cam.pos.lerp(want, 1 - Math.exp(-lag * dt));
    cam.look.lerp(focus, 1 - Math.exp(-11 * dt));
    cam.yaw = yaw;

    /* shake */
    cam.shake = Math.max(0, cam.shake - dt * 2.6);
    var sh = cam.shake * cam.shake * 0.45 * C.S.shake;
    camObj.position.copy(cam.pos);
    if (sh > 0.0005) {
      camObj.position.x += (Math.random() - 0.5) * sh;
      camObj.position.y += (Math.random() - 0.5) * sh;
      camObj.position.z += (Math.random() - 0.5) * sh;
    }
    camObj.lookAt(cam.look);

    /* a punchy FOV kick when things get fast */
    var speed = f.vel.length();
    var wantFov = 58 + M.clamp(speed * 0.22, 0, 14) + (f.state === 'ult' ? 6 : 0);
    cam.fov = M.damp(cam.fov, wantFov, 5, dt);
    if (Math.abs(camObj.fov - cam.fov) > 0.05) {
      camObj.fov = cam.fov;
      camObj.updateProjectionMatrix();
    }
  }

  /* ============================== the loop =============================== */
  G.tick = function (ts) {
    requestAnimationFrame(G.tick);
    var raw = (ts - G.last) / 1000;
    G.last = ts;
    if (!(raw > 0)) raw = 0.016;
    var dt = M.clamp(raw, 0.0005, 0.05);
    G.frame++;

    C.Input.update();
    var p1 = C.Input.p1, p2 = C.Input.p2;

    /* pause toggle works from anywhere in a fight */
    if ((p1.pressed('pause') || p2.pressed('pause')) && G.state === 'fight') {
      if (G.paused) G.resume(); else G.pause();
    }

    if (G.state === 'menu') {
      G.updateMenu(dt);
      FX.update(dt);
      G.render();
      C.Input.endFrame();
      return;
    }

    if (G.paused) {
      G.render();
      C.Input.endFrame();
      return;
    }

    /* global hit-stop for the meaty blows */
    var scale = 1;
    if (G.freeze > 0) { G.freeze -= raw; scale = 0.06; }
    if (G.slowmo !== 1) scale *= G.slowmo;
    var sdt = dt * scale;

    G.time += sdt;
    if (G.state === 'intro') {
      G.introT += raw;
      G.updateFight(sdt * 0.35, true);
      if (G.introT > 1.6) {
        G.state = 'fight';
        U.big('FIGHT!');
      }
    } else if (G.state === 'fight') {
      G.elapsed += sdt;
      G.updateFight(sdt, false);
      G.checkRules();
    } else if (G.state === 'over') {
      G.overT += raw;
      G.updateFight(sdt, true);
      if (G.overT > 2.6 && !G.resultShown) { G.resultShown = true; G.showResults(); }
    }

    U.updateHud(dt);
    G.render();
    C.Input.endFrame();
  };

  G.updateFight = function (dt, locked) {
    var i, f;
    var p1 = C.Input.p1, p2 = C.Input.p2;

    if (!locked) {
      if (G.humans[0]) G.controlPlayer(G.humans[0], p1, G.cam, dt);
      if (G.splitScreen && G.humans[1]) G.controlPlayer(G.humans[1], p2, G.cam2, dt);
    }

    for (i = 0; i < G.fighters.length; i++) {
      f = G.fighters[i];
      if (f.ai && !locked) f.ai.update(dt, G.arena);
      Mv.tickFighter(f, dt, G.arena);
      f.update(dt, G.arena);
    }

    Mv.update(dt, G.arena);
    FX.update(dt);
    if (G.arena) G.arena.update(dt, G.time);

    /* keep the two fighters from occupying the same space */
    if (G.fighters.length === 2) {
      var a = G.fighters[0], b = G.fighters[1];
      var d = _v.copy(b.pos).sub(a.pos);
      var minD = a.radius + b.radius;
      var dl = d.length();
      if (dl < minD && dl > 1e-4) {
        d.multiplyScalar((minD - dl) * 0.5 / dl);
        if (a.alive) a.pos.sub(d);
        if (b.alive) b.pos.add(d);
      }
    }

    /* struggle HUD for the human */
    var hs = G.humans[0] ? Mv.inStruggle(G.humans[0]) : null;
    if (!hs) U.struggle(false);

    updateCamera(G.cam, G.camera, G.humans[0] || G.fighters[0], dt, C.Input.p1);
    if (G.splitScreen) updateCamera(G.cam2, G.camera2, G.humans[1] || G.fighters[1], dt, C.Input.p2);
    FX.camera = G.camera;

    /* radial blur decays */
    G.cam.radial = Math.max(0, G.cam.radial - dt * 2.2);
    var comp = G.composer.mComp.uniforms;
    comp.radial.value = G.cam.radial * 0.05 + (G.freeze > 0 ? 0.02 : 0);
    comp.aberr.value = M.clamp(G.cam.shake * 0.004, 0, 0.006);
    comp.strength.value = 1.05 + G.cam.shake * 0.25;

    /* off-screen indicator */
    G.updateArrow();

    if (G.matchTime > 0) U.setClock(C.fmtTime(G.matchTime - G.elapsed));
  };

  G.updateArrow = function () {
    var arrow = U.hudEls.arrow;
    var h = G.humans[0];
    if (!h || !h.target || G.splitScreen) { arrow.style.display = 'none'; return; }
    var t = h.target;
    var p = _v.copy(t.chest(_v2)).project(G.camera);
    var on = p.z < 1 && Math.abs(p.x) < 0.92 && Math.abs(p.y) < 0.92;
    if (on) { arrow.style.display = 'none'; return; }
    arrow.style.display = 'block';
    var x = p.x, y = p.y;
    if (p.z > 1) { x = -x; y = -y; }
    var ang = Math.atan2(-y, x);
    var rx = G.vw * 0.5 + Math.cos(ang) * G.vw * 0.40;
    var ry = G.vh * 0.5 + Math.sin(ang) * G.vh * 0.38;
    arrow.style.left = (rx - 18) + 'px';
    arrow.style.top = (ry - 18) + 'px';
    arrow.style.transform = 'rotate(' + ang + 'rad)';
  };

  /* ============================== rules / end ============================ */
  G.checkRules = function () {
    if (G.matchTime > 0 && G.elapsed >= G.matchTime) {
      var a = G.fighters[0], b = G.fighters[1];
      G.endMatch((a.hp / a.maxHp) >= (b.hp / b.maxHp) ? 0 : 1, 'TIME UP');
      return;
    }
    if (G.cfg.rule === 'ringout' && G.arena) {
      for (var i = 0; i < 2; i++) {
        if (G.arena.outsideRing(G.fighters[i]) && G.fighters[i].alive) {
          G.endMatch(1 - i, 'RING OUT');
          return;
        }
      }
    }
  };

  G.onKO = function (f) {
    if (G.state !== 'fight') return;
    if (G.cfg.mode === 'training') {
      /* nobody loses in training */
      setTimeout(function () {
        f.hp = f.maxHp; f.alive = true; f.setState('idle');
        f.pos.y += 1; f.vel.set(0, 0, 0);
      }, 900);
      return;
    }
    var winner = f === G.fighters[0] ? 1 : 0;
    G.endMatch(winner, null);
  };

  G.endMatch = function (winnerIdx, reason) {
    if (G.state === 'over') return;
    G.state = 'over';
    G.overT = 0;
    G.resultShown = false;
    G.winner = winnerIdx;
    G.slowmo = 0.35;
    setTimeout(function () { G.slowmo = 1; }, 1400);
    var pw = G.humans.indexOf(G.fighters[winnerIdx]) >= 0;
    U.big(reason || (G.splitScreen
      ? 'PLAYER ' + (winnerIdx + 1) + ' WINS'
      : (pw ? 'K.O.' : 'DOWN')));
    C.Audio.stopMusic();
    C.Audio.sfx(pw ? 'fanfare' : 'cancel');
    U.struggle(false);
    C.P.totalKo++;
    if (pw) C.P.wins++; else C.P.losses++;
    C.save();
  };

  /* =============================== flow ================================== */
  G.pause = function () {
    if (G.state !== 'fight') return;
    G.paused = true;
    C.Audio.duck(true);
    C.Input.showTouch(false);
    U.pause(G);
  };

  G.resume = function () {
    G.paused = false;
    C.Audio.duck(false);
    U.hide();
    C.Input.showTouch(C.device.touch);
    C.Input.p1.reset(); C.Input.p2.reset();
  };

  G.restart = function () {
    U.hide();
    G.startMatch(G.cfg);
  };

  G.quitToMenu = function () {
    G.teardownMatch();
    G.state = 'menu';
    G.paused = false;
    G.splitScreen = false;
    C.Input.twoPlayer = false;
    C.Audio.stopMusic();
    C.Audio.music('menu');
    C.Input.showTouch(false);
    U.showHud(false);
    U.struggle(false);
    G.menuGroup.visible = true;
    G.resize();
    U.title(G);
  };

  /* ------------------------------ mode entry ------------------------------ */
  G.pickMode = function (id) {
    G.mode = id;
    switch (id) {
      case 'story': U.story(G); break;
      case 'versus':
        U.select(G, {
          title: 'Player 1', sub: 'Pick your fighter',
          onPick: function (p1) {
            U.select(G, {
              title: 'Opponent', sub: 'Pick who you are fighting', pick: 'vegeta',
              cta: 'Choose Stage ▶',
              back: function () { G.pickMode('versus'); },
              onPick: function (p2) {
                U.stage(G, function (st) {
                  var cfg = G.defaultConfig();
                  cfg.mode = 'versus';
                  cfg.p1 = { id: p1, form: -1, human: true };
                  cfg.p2 = { id: p2, form: -1, human: false };
                  cfg.stage = st;
                  cfg.difficulty = C.S.difficulty;
                  G.startMatch(cfg);
                }, function () { G.pickMode('versus'); });
              }
            });
          }
        });
        break;
      case 'twoplayer':
        U.select(G, {
          title: 'Player 1', sub: 'W A S D · Z attack · X ki · C guard',
          onPick: function (p1) {
            U.select(G, {
              title: 'Player 2', sub: 'T F G H · Z... see Controls for the full list',
              pick: 'vegeta', cta: 'Choose Stage ▶',
              back: function () { G.pickMode('twoplayer'); },
              onPick: function (p2) {
                U.stage(G, function (st) {
                  var cfg = G.defaultConfig();
                  cfg.mode = 'twoplayer';
                  cfg.p1 = { id: p1, form: -1, human: true };
                  cfg.p2 = { id: p2, form: -1, human: true };
                  cfg.stage = st;
                  cfg.label = 'SPLIT SCREEN';
                  G.startMatch(cfg);
                }, function () { G.pickMode('twoplayer'); });
              }
            });
          }
        });
        break;
      case 'survival':
        U.select(G, {
          title: 'Survival', sub: 'One health bar. Endless opponents.',
          cta: 'Begin ▶',
          onPick: function (p1) {
            G.survival = { round: 0, hero: p1, rng: M.seeded(Date.now() & 0xffff), hp: 1 };
            G.nextSurvival();
          }
        });
        break;
      case 'tournament':
        U.select(G, {
          title: 'World Tournament', sub: 'Eight fighters. Three wins for the title.',
          cta: 'Enter ▶',
          onPick: function (p1) {
            G.tourney = L.makeBracket(p1, M.seeded(Date.now() & 0xffff));
            G.tourney.hero = p1;
            G.nextTourney();
          }
        });
        break;
      case 'training':
        U.select(G, {
          title: 'Training', sub: 'Nobody can lose here.',
          cta: 'Choose Partner ▶',
          onPick: function (p1) {
            U.select(G, {
              title: 'Sparring Partner', pick: 'krillin', cta: 'Train ▶',
              back: function () { G.pickMode('training'); },
              onPick: function (p2) {
                var cfg = G.defaultConfig();
                cfg.mode = 'training';
                cfg.p1 = { id: p1, form: -1, human: true };
                cfg.p2 = { id: p2, form: -1, human: false };
                cfg.stage = 'timechamber';
                cfg.difficulty = 'rookie';
                cfg.label = 'TRAINING · NO DEFEAT';
                G.startMatch(cfg);
                setTimeout(function () {
                  U.toast('Everything is unlocked. Try 1-4 for specials, O to transform.', 5200);
                }, 2400);
              }
            });
          }
        });
        break;
    }
  };

  G.quickBattle = function () {
    var cfg = G.defaultConfig();
    cfg.p1 = { id: C.load().lastUsed || 'goku', form: -1, human: true };
    var foe = M.pick(R.list.filter(function (c) { return c.id !== cfg.p1.id; }));
    cfg.p2 = { id: foe.id, form: -1, human: false };
    cfg.stage = M.pick(C.STAGES).id;
    cfg.mode = 'versus';
    G.startMatch(cfg);
  };

  /* ------------------------------- story ---------------------------------- */
  G.startStoryFight = function (saga, idx) {
    var fg = saga.fights[idx];
    var pickHero = function (heroId) {
      var cfg = G.defaultConfig();
      cfg.mode = 'story';
      cfg.p1 = { id: heroId, form: fg.heroForm === undefined ? -1 : fg.heroForm, human: true };
      cfg.p2 = { id: fg.foe, form: fg.form, human: false };
      cfg.stage = fg.stage;
      cfg.bump = fg.bump;
      cfg.hp1 = fg.hpHero; cfg.hp2 = fg.hpFoe;
      cfg.rule = fg.rule;
      cfg.label = saga.name + ' · ' + (C.romans[idx] || (idx + 1));
      cfg.themeLevel = Math.min(3, (fg.bump || 0) + (idx >= saga.fights.length - 1 ? 2 : 0));
      cfg.story = { saga: saga, idx: idx, fight: fg };
      G.startMatch(cfg);
      setTimeout(function () { U.toast(fg.intro, 6000); }, 1800);
    };

    U.select(G, {
      title: fg.title,
      sub: 'Suggested: ' + (fg.hero ? R.get(fg.hero).name : 'anyone') + ' — but take whoever you like',
      pick: fg.hero || C.load().lastUsed || 'goku',
      cta: 'Start Fight ▶',
      back: function () { U.fights(G, saga); },
      onPick: pickHero
    });
  };

  /* ------------------------------ survival -------------------------------- */
  G.nextSurvival = function () {
    var s = G.survival;
    s.round++;
    var spec = L.survivalFoe(s.round, s.rng);
    var cfg = G.defaultConfig();
    cfg.mode = 'survival';
    cfg.p1 = { id: s.hero, form: -1, human: true };
    cfg.p2 = { id: spec.foe, form: spec.form, human: false };
    cfg.stage = spec.stage;
    cfg.bump = Math.min(3, spec.bump);
    cfg.hp2 = spec.hpFoe;
    cfg.label = 'SURVIVAL · ROUND ' + s.round;
    cfg.themeLevel = Math.min(3, Math.floor(s.round / 4));
    G.startMatch(cfg);
    /* carry health between rounds, with a small top-up */
    var hero = G.fighters[0];
    hero.hp = Math.min(hero.maxHp, hero.maxHp * s.hp + hero.maxHp * 0.12);
    hero.ki = 60;
  };

  /* ----------------------------- tournament ------------------------------- */
  G.nextTourney = function () {
    var t = G.tourney;
    var foeIdx = 1 + t.round;
    var foe = t.entrants[foeIdx] || M.pick(R.list).id;
    var cfg = G.defaultConfig();
    cfg.mode = 'tournament';
    cfg.p1 = { id: t.hero, form: -1, human: true };
    cfg.p2 = { id: foe, form: -1, human: false };
    cfg.stage = 'tournament';
    cfg.rule = 'ringout';
    cfg.time = 180;
    cfg.bump = t.round;
    cfg.label = ['QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'][t.round] || 'EXHIBITION';
    cfg.themeLevel = t.round;
    G.startMatch(cfg);
    setTimeout(function () { U.toast('Ring out or K.O. — 3 minutes.', 3800); }, 2200);
  };

  /* ------------------------------- results -------------------------------- */
  G.showResults = function () {
    var cfg = G.cfg;
    var heroWon = G.humans.indexOf(G.fighters[G.winner]) >= 0;
    var data = {
      win: heroWon,
      stats: [
        ['Hits landed', G.stats.hits],
        ['Best combo', G.stats.maxCombo],
        ['Damage dealt', C.fmtNum(G.stats.dealt)],
        ['Specials', G.stats.specials + G.stats.ults],
        ['Time', C.fmtTime(G.elapsed)]
      ],
      buttons: []
    };

    if (cfg.mode === 'story' && cfg.story) {
      var fg = cfg.story.fight, saga = cfg.story.saga, idx = cfg.story.idx;
      data.storyTitle = fg.title;
      data.story = heroWon ? fg.win : fg.lose;
      data.subtitle = saga.name;
      if (heroWon) {
        L.clearFight(saga.id, idx, fg.reward);
        var next = idx + 1;
        if (next < saga.fights.length) {
          data.buttons.push(['Next fight ▶', function () { G.startStoryFight(saga, next); }]);
        } else {
          data.subtitle = saga.name + ' complete!';
          data.buttons.push(['Back to sagas', function () { G.backToMenus(function () { U.story(G); }); }]);
        }
      } else {
        data.buttons.push(['Try again', function () { G.restart(); }]);
        data.buttons.push(['Easier difficulty', function () {
          var i = M.clamp(C.DIFF_ORDER.indexOf(C.S.difficulty) - 1, 0, 4);
          C.S.difficulty = C.DIFF_ORDER[i];
          C.save();
          U.toast('Difficulty set to ' + C.diff(C.S.difficulty).name);
          G.cfg.difficulty = C.S.difficulty;
          G.restart();
        }]);
      }
      data.buttons.push(['Saga list', function () { G.backToMenus(function () { U.fights(G, saga); }); }]);
    } else if (cfg.mode === 'survival') {
      var s = G.survival;
      if (heroWon) {
        s.hp = G.fighters[0].hp / G.fighters[0].maxHp;
        data.subtitle = 'Round ' + s.round + ' cleared';
        data.stats.unshift(['Round', s.round]);
        data.buttons.push(['Next round ▶', function () { G.nextSurvival(); }]);
      } else {
        data.subtitle = 'You lasted ' + s.round + ' round' + (s.round === 1 ? '' : 's');
        if (s.round - 1 > C.P.bestSurvival) {
          C.P.bestSurvival = s.round - 1;
          C.save();
          data.subtitle += ' — new record!';
        }
        data.buttons.push(['Try again', function () { G.pickMode('survival'); }]);
      }
      data.buttons.push(['Menu', function () { G.quitToMenu(); }]);
    } else if (cfg.mode === 'tournament') {
      var t = G.tourney;
      if (heroWon) {
        t.round++;
        if (t.round >= 3) {
          data.subtitle = 'World Martial Arts Champion!';
          C.P.tournamentsWon++;
          C.P.zeni += 1500;
          C.save();
          C.Audio.sfx('cheer');
          data.buttons.push(['Menu', function () { G.quitToMenu(); }]);
        } else {
          data.subtitle = 'On to the ' + ['semi-final', 'final'][t.round - 1];
          data.buttons.push(['Next match ▶', function () { G.nextTourney(); }]);
        }
      } else {
        data.subtitle = 'Knocked out of the tournament';
        data.buttons.push(['Try again', function () { G.pickMode('tournament'); }]);
      }
      data.buttons.push(['Menu', function () { G.quitToMenu(); }]);
    } else {
      data.buttons.push(['Rematch', function () { G.restart(); }]);
      data.buttons.push(['Change fighter', function () { G.backToMenus(function () { G.pickMode(cfg.mode); }); }]);
      data.buttons.push(['Menu', function () { G.quitToMenu(); }]);
    }

    if (heroWon) C.Audio.music('victory');
    U.showHud(false);
    C.Input.showTouch(false);
    U.results(G, data);
  };

  G.backToMenus = function (fn) {
    G.teardownMatch();
    G.state = 'menu';
    G.splitScreen = false;
    C.Input.twoPlayer = false;
    G.menuGroup.visible = true;
    C.Audio.stopMusic();
    C.Audio.music('menu');
    U.showHud(false);
    C.Input.showTouch(false);
    G.resize();
    fn();
  };

  /* =============================== render ================================ */
  G.render = function () {
    var r = G.renderer;
    var draw = function (target) {
      r.setRenderTarget(target || null);
      r.setScissorTest(false);
      r.clear(true, true, true);
      if (G.splitScreen && G.state !== 'menu') {
        var w = Math.floor(G.vw * G.pr), h = Math.floor(G.vh * G.pr);
        var hw = Math.floor(w / 2);
        r.setScissorTest(true);
        r.setViewport(0, 0, hw, h);
        r.setScissor(0, 0, hw, h);
        r.render(G.scene, G.camera);
        r.setViewport(hw, 0, w - hw, h);
        r.setScissor(hw, 0, w - hw, h);
        r.render(G.scene, G.camera2);
        r.setScissorTest(false);
        r.setViewport(0, 0, w, h);
      } else {
        r.render(G.scene, G.camera);
      }
    };
    G.composer.render(draw);
  };

})(DBZ);
