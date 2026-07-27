/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — arenas

   Each stage is a heightfield plus a set of decorations, all generated from a
   seed so they are identical every time without storing any data. The ground
   is genuinely destructible: craters punched by slams and beams deform the
   same field that collision reads, so the battlefield degrades as you fight.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M, FX = C.FX;

  /* ============================== sky dome ============================== */
  var SKY_VERT = [
    'varying vec3 vDir;',
    'void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');

  var SKY_FRAG = [
    'varying vec3 vDir;',
    'uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot;',
    'uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunSize;',
    'uniform float stars; uniform float bands;',
    'float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }',
    'void main(){',
    '  float y = vDir.y;',
    '  vec3 col = y > 0.0 ? mix(cMid, cTop, pow(clamp(y,0.0,1.0), 0.65))',
    '                     : mix(cMid, cBot, pow(clamp(-y,0.0,1.0), 0.55));',
    '  float s = max(0.0, dot(vDir, normalize(sunDir)));',
    '  col += sunCol * pow(s, sunSize) * 1.2;',
    '  col += sunCol * pow(s, 3.0) * 0.10;',
    '  if (bands > 0.0) {',
    '    float b = sin(vDir.y * 26.0 + vDir.x * 4.0) * 0.5 + 0.5;',
    '    col *= 1.0 + b * bands * 0.16;',
    '  }',
    '  if (stars > 0.0) {',
    '    vec3 g = floor(vDir * 190.0);',
    '    float r = h31(g);',
    '    float tw = step(0.9965, r);',
    '    col += vec3(tw) * stars * (0.6 + h31(g + 3.0) * 0.9);',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function makeSky(o) {
    var g = new THREE.SphereGeometry(900, 32, 20);
    var m = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide,
      depthWrite: false, fog: false,
      uniforms: {
        cTop: { value: new THREE.Color(o.top) },
        cMid: { value: new THREE.Color(o.mid) },
        cBot: { value: new THREE.Color(o.bot) },
        sunDir: { value: new THREE.Vector3(0.35, 0.5, -0.7).normalize() },
        sunCol: { value: new THREE.Color(o.sun || 0xffe9c0) },
        sunSize: { value: o.sunSize || 340 },
        stars: { value: o.stars || 0 },
        bands: { value: o.bands || 0 }
      }
    });
    var mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    return mesh;
  }

  /* ============================ stage catalogue ========================= */
  /* kind: 'terrain' (rolling heightfield) | 'ring' (flat arena disc) |
           'void' (flat infinite) | 'islands' (platform over water)       */
  var STAGES = [
    {
      id: 'wasteland', name: 'Rocky Wasteland', sub: 'Where it usually starts',
      kind: 'terrain', radius: 150, ceil: 105, seed: 7,
      ground: 0xa08560, ground2: 0x6e5a40, dust: 0xbfa580,
      sky: { top: 0x2f6ec8, mid: 0x8fc4ec, bot: 0xd8c9a8, sun: 0xffe9c0, sunSize: 300 },
      fog: 0x9fb6cf, fogD: 0.0022, hemi: 0x9fc8ff, hemiG: 0xa08560,
      rocks: 90, amp: 5.5, freq: 0.012
    },
    {
      id: 'namek', name: 'Planet Namek', sub: 'Five minutes left',
      kind: 'terrain', radius: 155, ceil: 110, seed: 21,
      ground: 0x4faf6a, ground2: 0x2f7a52, dust: 0x86c98f, water: 0x2fa8c8,
      sky: { top: 0x2fa87a, mid: 0x9fe0a8, bot: 0xd8f0c0, sun: 0x9fffd0, sunSize: 220, bands: 0.25 },
      fog: 0x8fd8a8, fogD: 0.0021, hemi: 0xa8ffc8, hemiG: 0x3f8f5a,
      rocks: 40, trees: 34, amp: 6.5, freq: 0.011, waterY: -1.6
    },
    {
      id: 'cellgames', name: 'Cell Games Arena', sub: 'Ten fighters, one ring',
      kind: 'ring', radius: 130, ceil: 100, seed: 33, ringR: 22, ringH: 1.2,
      ground: 0x9a8f78, ground2: 0x6a6250, dust: 0xc0b49a, tile: 0xd8cfae, tile2: 0x8f8468,
      sky: { top: 0x2a5fb8, mid: 0x8fbde8, bot: 0xcfd8c0, sun: 0xffefd0, sunSize: 320 },
      fog: 0xa8bcd0, fogD: 0.0022, hemi: 0xa8c8ff, hemiG: 0x8a8068,
      rocks: 55, amp: 3.5, freq: 0.014
    },
    {
      id: 'tournament', name: 'World Tournament', sub: 'Stay inside the ring',
      kind: 'ring', radius: 120, ceil: 95, seed: 44, ringR: 20, ringH: 1.6, crowd: 1,
      ground: 0x6f8f52, ground2: 0x4f6f3a, dust: 0xd8c8a0, tile: 0xe8d8b0, tile2: 0xc8a878,
      sky: { top: 0x2f74d8, mid: 0x9fd0f2, bot: 0xe8e0c8, sun: 0xfff2d8, sunSize: 300 },
      fog: 0xbdd4e8, fogD: 0.0020, hemi: 0xbdd8ff, hemiG: 0x6f8f52,
      rocks: 12, amp: 1.5, freq: 0.02
    },
    {
      id: 'vegeta', name: 'Planet Vegeta', sub: 'Before the sky burned',
      kind: 'terrain', radius: 150, ceil: 110, seed: 58,
      ground: 0x9a5a48, ground2: 0x6a3830, dust: 0xc08a70,
      sky: { top: 0x5a2a6a, mid: 0xb85a5a, bot: 0xe8a878, sun: 0xffb070, sunSize: 200 },
      fog: 0xb87a68, fogD: 0.0024, hemi: 0xffb0a0, hemiG: 0x8a4a3a,
      rocks: 110, amp: 8, freq: 0.013
    },
    {
      id: 'timechamber', name: 'Hyperbolic Time Chamber', sub: 'A year in a day',
      kind: 'void', radius: 130, ceil: 120, seed: 66,
      ground: 0xf2f4f8, ground2: 0xdfe4ec, dust: 0xffffff,
      sky: { top: 0xf6f8fc, mid: 0xffffff, bot: 0xe8ecf4, sun: 0xffffff, sunSize: 40 },
      fog: 0xffffff, fogD: 0.0035, hemi: 0xffffff, hemiG: 0xe0e6f0,
      rocks: 0, amp: 0, freq: 0, dome: 1
    },
    {
      id: 'top', name: 'Tournament of Power', sub: 'Forty-eight minutes',
      kind: 'ring', radius: 165, ceil: 120, seed: 77, ringR: 150, ringH: 0.8, space: 1,
      ground: 0x5f6a86, ground2: 0x3a4460, dust: 0x9aa8c8, tile: 0x8f9ab8, tile2: 0x59627e,
      sky: { top: 0x080a18, mid: 0x14203a, bot: 0x1a1030, sun: 0x8fb0ff, sunSize: 160, stars: 1 },
      fog: 0x1a2340, fogD: 0.0016, hemi: 0x8fa8ff, hemiG: 0x3a4460,
      rocks: 26, amp: 0, freq: 0, debris: 40
    },
    {
      id: 'islands', name: 'Kame House Sea', sub: 'Turtle school waters',
      kind: 'islands', radius: 145, ceil: 100, seed: 88,
      ground: 0xd8c89a, ground2: 0x9a8a60, dust: 0xe8d8b0, water: 0x2f8fd8,
      sky: { top: 0x2f7ad8, mid: 0x9fd8f2, bot: 0xd8f0ff, sun: 0xfff0d0, sunSize: 280 },
      fog: 0xa8d8f0, fogD: 0.0020, hemi: 0xbde8ff, hemiG: 0x2f8fd8,
      rocks: 18, amp: 2.2, freq: 0.03, waterY: -0.6, islands: 7
    },
    {
      id: 'sacred', name: 'Sacred World of the Kais', sub: 'Where the Z Sword sleeps',
      kind: 'terrain', radius: 150, ceil: 115, seed: 99,
      ground: 0x7fd8a8, ground2: 0x4fa878, dust: 0xb8f0d0,
      sky: { top: 0x8f4fd8, mid: 0xd88fd8, bot: 0xf0c8e8, sun: 0xffd8f0, sunSize: 180, stars: 0.35, bands: 0.3 },
      fog: 0xd0a8e8, fogD: 0.0020, hemi: 0xf0c8ff, hemiG: 0x5fb888,
      rocks: 34, trees: 12, amp: 7, freq: 0.010, float: 8
    },
    {
      id: 'city', name: 'Ruined City', sub: 'Someone will have to fix this',
      kind: 'terrain', radius: 145, ceil: 105, seed: 111,
      ground: 0x8a8a92, ground2: 0x5a5a62, dust: 0xb0b0b8,
      sky: { top: 0x3a4a6a, mid: 0x8a90a8, bot: 0xc8a888, sun: 0xffd8a0, sunSize: 260 },
      fog: 0x9aa4b8, fogD: 0.0024, hemi: 0xb8c8e0, hemiG: 0x6a6a72,
      rocks: 20, amp: 1.8, freq: 0.02, buildings: 46
    },
    {
      id: 'kingkai', name: "King Kai's Planet", sub: 'Mind the gravity',
      kind: 'void', radius: 96, ceil: 95, seed: 123,
      ground: 0x5faf5a, ground2: 0x3f8f4a, dust: 0x8fd88a,
      sky: { top: 0x0a1030, mid: 0x1a2050, bot: 0x101838, sun: 0xfff0c0, sunSize: 200, stars: 1 },
      fog: 0x1a2050, fogD: 0.0012, hemi: 0x8fd8ff, hemiG: 0x3f8f4a,
      rocks: 10, amp: 0, freq: 0, tinyPlanet: 1, trees: 6
    },
    {
      id: 'hell', name: 'Home For Infinite Losers', sub: 'Hell, for short',
      kind: 'terrain', radius: 145, ceil: 105, seed: 135,
      ground: 0x8a3a4a, ground2: 0x4a1a2a, dust: 0xc85a5a,
      sky: { top: 0x2a0a1a, mid: 0x8a2a3a, bot: 0xd85a3a, sun: 0xff8a4a, sunSize: 150, bands: 0.4 },
      fog: 0x7a2a3a, fogD: 0.0026, hemi: 0xff8a8a, hemiG: 0x6a2030,
      rocks: 80, amp: 9, freq: 0.014, spikes: 30
    }
  ];

  C.STAGES = STAGES;
  C.stageById = {};
  STAGES.forEach(function (s) { C.stageById[s.id] = s; });

  /* ================================ Arena =============================== */
  function Arena(scene, def, opts) {
    opts = opts || {};
    this.def = def;
    this.scene = scene;
    this.group = new THREE.Object3D();
    scene.add(this.group);
    this.rng = M.seeded(def.seed);
    this.radius = def.radius;
    this.ceil = def.ceil;
    this.dustColor = def.dust;
    this.craters = [];
    this.quality = opts.quality || 'high';

    this.buildSky();
    this.buildGround();
    this.buildDecor();
    this.buildLights();
  }

  Arena.prototype.buildSky = function () {
    this.sky = makeSky(this.def.sky);
    this.group.add(this.sky);
    this.scene.fog = new THREE.FogExp2(this.def.fog, this.def.fogD);
  };

  Arena.prototype.buildLights = function () {
    var d = this.def;
    /* Total light is kept just under 1.0 so lit surfaces never cross the
       bloom threshold — the glow belongs to ki, not to grass. */
    var hemi = new THREE.HemisphereLight(d.hemi, d.hemiG, 0.46);
    this.group.add(hemi);
    var sun = new THREE.DirectionalLight(0xffffff, 0.42);
    sun.position.set(60, 110, -80);
    this.group.add(sun);
    var rim = new THREE.DirectionalLight(d.sky.sun || 0xffffff, 0.13);
    rim.position.set(-70, 40, 70);
    this.group.add(rim);
    this.sun = sun;
  };

  /* ------------------------------------------------------------ heightfield */
  Arena.prototype.baseHeight = function (x, z) {
    var d = this.def;
    if (d.kind === 'void') {
      if (d.tinyPlanet) {
        var r = Math.hypot(x, z);
        return -r * r * 0.0022;
      }
      return 0;
    }
    if (d.kind === 'ring') {
      var rr = Math.hypot(x, z);
      if (rr < d.ringR) return d.ringH;
      var t = M.sat((rr - d.ringR) / 8);
      var terr = M.fbm2(x * (d.freq || 0.014), z * (d.freq || 0.014), 3) * (d.amp || 3);
      return M.lerp(d.ringH, terr - 1.2, t);
    }
    if (d.kind === 'islands') {
      var h = -3;
      for (var i = 0; i < this.isl.length; i++) {
        var s = this.isl[i];
        var dd = Math.hypot(x - s.x, z - s.z);
        if (dd < s.r) h = Math.max(h, s.h * Math.cos((dd / s.r) * Math.PI * 0.5));
      }
      return h;
    }
    var n = M.fbm2(x * d.freq, z * d.freq, 4) * d.amp;
    /* flatten the middle so the fight starts on level ground */
    var c = M.sat((Math.hypot(x, z) - 14) / 26);
    return n * c;
  };

  Arena.prototype.groundAt = function (x, z) {
    var h = this.baseHeight(x, z);
    for (var i = 0; i < this.craters.length; i++) {
      var c = this.craters[i];
      var d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r) {
        var t = 1 - d / c.r;
        h -= c.depth * t * t * (3 - 2 * t);
      }
    }
    return h;
  };

  Arena.prototype.buildGround = function () {
    var d = this.def, rng = this.rng;

    if (d.kind === 'islands') {
      this.isl = [];
      var n = d.islands || 6;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * M.PI2 + rng() * 0.5;
        var rr = i === 0 ? 0 : 26 + rng() * 68;
        this.isl.push({
          x: Math.cos(a) * rr, z: Math.sin(a) * rr,
          r: 16 + rng() * 22, h: 1.5 + rng() * 4
        });
      }
    }

    var SEG = this.quality === 'low' ? 84 : (this.quality === 'medium' ? 120 : 156);
    var SIZE = this.radius * 2.4;
    var geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var c1 = new THREE.Color(d.ground), c2 = new THREE.Color(d.ground2);
    var tmp = new THREE.Color();

    for (var v = 0; v < pos.count; v++) {
      var x = pos.getX(v), z = pos.getZ(v);
      var y = this.baseHeight(x, z);
      pos.setY(v, y);
      var band = M.sat((y + 4) / 12) + M.fbm2(x * 0.08, z * 0.08, 2) * 0.18;
      tmp.copy(c2).lerp(c1, M.sat(band));
      if (d.kind === 'ring' && Math.hypot(x, z) < d.ringR) {
        /* the tiled fighting ring */
        var tile = (Math.floor(x / 3.2) + Math.floor(z / 3.2)) & 1;
        tmp.setHex(tile ? (d.tile || 0xd8cfae) : (d.tile2 || 0x8f8468));
      }
      colors[v * 3] = tmp.r; colors[v * 3 + 1] = tmp.g; colors[v * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    var matr = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.ground = new THREE.Mesh(geo, matr);
    this.ground.receiveShadow = true;
    this.group.add(this.ground);
    this.groundGeo = geo;
    this.groundSeg = SEG;
    this.groundSize = SIZE;
    this.groundDirty = false;

    if (d.water !== undefined) {
      var wg = new THREE.PlaneGeometry(this.radius * 4, this.radius * 4, 1, 1);
      wg.rotateX(-Math.PI / 2);
      var wm = new THREE.MeshLambertMaterial({
        color: d.water, transparent: true, opacity: 0.82
      });
      this.water = new THREE.Mesh(wg, wm);
      this.water.position.y = d.waterY || -1;
      this.group.add(this.water);
    }
  };

  /* punch a bowl in the terrain; both collision and the mesh follow */
  Arena.prototype.crater = function (x, z, scale) {
    if (this.def.kind === 'void' && !this.def.tinyPlanet) return;
    if (this.quality === 'low' && this.craters.length > 8) return;
    var r = M.clamp(3.5 * scale, 2, 12);
    /* merge with a nearby crater instead of stacking a hundred */
    for (var i = 0; i < this.craters.length; i++) {
      var c = this.craters[i];
      if (Math.hypot(c.x - x, c.z - z) < r * 0.55) {
        c.depth = Math.min(4.5, c.depth + 0.28 * scale);
        c.r = Math.min(14, Math.max(c.r, r));
        this.deform(c.x, c.z, c.r + 2);
        return;
      }
    }
    if (this.craters.length >= 26) this.craters.shift();
    var nc = { x: x, z: z, r: r, depth: M.clamp(1.1 * scale, 0.5, 3.6) };
    this.craters.push(nc);
    this.deform(x, z, r + 2);
    FX.ring({ x: x, y: this.groundAt(x, z) + 0.08, z: z, color: this.dustColor, boost: 1.1, orient: 'flat', r0: r * 0.4, r1: r * 1.5, life: 0.5 });
  };

  Arena.prototype.deform = function (cx, cz, rad) {
    var geo = this.groundGeo, pos = geo.attributes.position;
    var half = this.groundSize / 2, step = this.groundSize / this.groundSeg;
    var i0 = Math.max(0, Math.floor((cx - rad + half) / step));
    var i1 = Math.min(this.groundSeg, Math.ceil((cx + rad + half) / step));
    var j0 = Math.max(0, Math.floor((cz - rad + half) / step));
    var j1 = Math.min(this.groundSeg, Math.ceil((cz + rad + half) / step));
    var W = this.groundSeg + 1;
    for (var j = j0; j <= j1; j++) {
      for (var i = i0; i <= i1; i++) {
        var idx = j * W + i;
        if (idx >= pos.count) continue;
        var x = pos.getX(idx), z = pos.getZ(idx);
        pos.setY(idx, this.groundAt(x, z));
      }
    }
    pos.needsUpdate = true;
    this.groundDirty = true;
  };

  Arena.prototype.lateUpdate = function () {
    if (this.groundDirty) {
      this.groundGeo.computeVertexNormals();
      this.groundGeo.attributes.normal.needsUpdate = true;
      this.groundDirty = false;
    }
  };

  /* ------------------------------------------------------------- decoration */
  Arena.prototype.buildDecor = function () {
    var d = this.def, rng = this.rng, i, a, r, x, z, y;
    var mk = C.Build;

    function rockMat(hex) { return new THREE.MeshLambertMaterial({ color: hex, flatShading: true }); }

    if (d.rocks) {
      var rm = rockMat(d.ground2);
      var rm2 = rockMat(d.ground);
      var n = Math.round(d.rocks * (this.quality === 'low' ? 0.4 : 1));
      for (i = 0; i < n; i++) {
        a = rng() * M.PI2; r = 24 + rng() * (this.radius - 30);
        x = Math.cos(a) * r; z = Math.sin(a) * r;
        y = this.baseHeight(x, z);
        var s = 1.2 + rng() * 5.5;
        var rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rng() < 0.5 ? rm : rm2);
        rock.scale.set(s * (0.7 + rng() * 0.7), s * (0.5 + rng()), s * (0.7 + rng() * 0.7));
        rock.position.set(x, y + s * 0.2, z);
        rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
        rock.receiveShadow = true;
        this.group.add(rock);
      }
    }

    if (d.spikes) {
      var sm = rockMat(0x5a1a2a);
      for (i = 0; i < d.spikes; i++) {
        a = rng() * M.PI2; r = 26 + rng() * (this.radius - 32);
        x = Math.cos(a) * r; z = Math.sin(a) * r;
        var sp = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 6), sm);
        var hh = 8 + rng() * 22;
        sp.scale.set(2 + rng() * 3, hh, 2 + rng() * 3);
        sp.position.set(x, this.baseHeight(x, z) + hh * 0.42, z);
        this.group.add(sp);
      }
    }

    if (d.trees) {
      var trunk = new THREE.MeshLambertMaterial({ color: 0x6a4a3a });
      var leaf = new THREE.MeshLambertMaterial({ color: d.id === 'namek' ? 0x2f8fd8 : 0x3f9f5a, flatShading: true });
      for (i = 0; i < d.trees; i++) {
        a = rng() * M.PI2; r = 28 + rng() * (this.radius - 36);
        x = Math.cos(a) * r; z = Math.sin(a) * r;
        y = this.baseHeight(x, z);
        var tg = new THREE.Object3D();
        var th = 5 + rng() * 9;
        var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, th, 6), trunk);
        tr.position.y = th * 0.5;
        tg.add(tr);
        var lv = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), leaf);
        lv.scale.set(3 + rng() * 2.5, 2 + rng() * 2, 3 + rng() * 2.5);
        lv.position.y = th + 1;
        tg.add(lv);
        tg.position.set(x, y, z);
        this.group.add(tg);
      }
    }

    if (d.buildings) {
      var bm = [new THREE.MeshLambertMaterial({ color: 0x8a8f9a }),
      new THREE.MeshLambertMaterial({ color: 0x6a707c }),
      new THREE.MeshLambertMaterial({ color: 0xa89a8a })];
      for (i = 0; i < d.buildings; i++) {
        a = rng() * M.PI2; r = 30 + rng() * (this.radius - 34);
        x = Math.cos(a) * r; z = Math.sin(a) * r;
        y = this.baseHeight(x, z);
        var bh = 8 + rng() * 42;
        var bw = 5 + rng() * 9;
        var bld = new THREE.Mesh(FX.GEO.box, bm[(rng() * 3) | 0]);
        var broken = rng() < 0.45;
        bld.scale.set(bw, bh, bw * (0.7 + rng() * 0.6));
        bld.position.set(x, y + bh * 0.5, z);
        if (broken) { bld.rotation.z = (rng() - 0.5) * 0.5; bld.rotation.x = (rng() - 0.5) * 0.3; }
        bld.rotation.y = rng() * 3;
        bld.receiveShadow = true;
        this.group.add(bld);
      }
    }

    if (d.float) {
      var fm = new THREE.MeshLambertMaterial({ color: d.ground2, flatShading: true });
      for (i = 0; i < d.float; i++) {
        a = rng() * M.PI2; r = 40 + rng() * 80;
        var isl = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), fm);
        var s2 = 6 + rng() * 14;
        isl.scale.set(s2, s2 * 0.5, s2);
        isl.position.set(Math.cos(a) * r, 22 + rng() * 55, Math.sin(a) * r);
        this.group.add(isl);
      }
    }

    if (d.debris) {
      var dm = new THREE.MeshLambertMaterial({ color: 0x6a7490, flatShading: true });
      this.debris = [];
      for (i = 0; i < d.debris; i++) {
        var db = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), dm);
        var ds = 1.5 + rng() * 6;
        db.scale.set(ds, ds * 0.7, ds);
        a = rng() * M.PI2; r = 60 + rng() * 220;
        db.position.set(Math.cos(a) * r, 20 + rng() * 90, Math.sin(a) * r);
        this.group.add(db);
        this.debris.push({ m: db, sp: (rng() - 0.5) * 0.4, sp2: (rng() - 0.5) * 0.3 });
      }
    }

    if (d.dome) {
      /* the Time Chamber's little house and its endless white */
      var wall = new THREE.MeshLambertMaterial({ color: 0xe8ecf4 });
      var house = new THREE.Mesh(FX.GEO.box, wall);
      house.scale.set(14, 8, 12);
      house.position.set(0, 4, -34);
      this.group.add(house);
      var roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), new THREE.MeshLambertMaterial({ color: 0xc8d0dc }));
      roof.scale.set(12, 6, 12);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 11, -34);
      this.group.add(roof);
      for (i = 0; i < 2; i++) {
        var col = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 26, 10), wall);
        col.position.set(i ? 22 : -22, 13, -34);
        this.group.add(col);
      }
    }

    if (d.crowd) {
      /* a ring of seats and a wash of colour for the audience */
      var seat = new THREE.MeshLambertMaterial({ color: 0xb8ac90 });
      var stand = new THREE.Mesh(new THREE.CylinderGeometry(46, 40, 12, 40, 1, true), seat);
      stand.position.y = 4;
      stand.material.side = THREE.DoubleSide;
      this.group.add(stand);
      var people = 260;
      var pg = new THREE.SphereGeometry(0.55, 5, 4);
      var pmat = [0xd85a5a, 0x5a8fd8, 0xd8c85a, 0x5ad88f, 0xd85ad8, 0xf2f2f2].map(function (c) {
        return new THREE.MeshLambertMaterial({ color: c });
      });
      var inst = new THREE.Object3D();
      for (i = 0; i < people; i++) {
        a = (i / people) * M.PI2;
        var rr2 = 41 + (i % 4) * 1.6;
        var pp = new THREE.Mesh(pg, pmat[(rng() * pmat.length) | 0]);
        pp.position.set(Math.cos(a) * rr2, 8 + (i % 4) * 0.9, Math.sin(a) * rr2);
        inst.add(pp);
      }
      this.group.add(inst);
      this.crowd = inst;
    }

    if (d.tinyPlanet) {
      /* King Kai's house, road and a very small horizon */
      var road = new THREE.Mesh(new THREE.TorusGeometry(30, 2.2, 6, 40),
        new THREE.MeshLambertMaterial({ color: 0xc8b88a }));
      road.rotation.x = Math.PI / 2;
      road.position.y = -1.9;
      this.group.add(road);
      var kh = new THREE.Mesh(FX.GEO.box, new THREE.MeshLambertMaterial({ color: 0xe8d8b0 }));
      kh.scale.set(9, 6, 9);
      kh.position.set(0, 3, -22);
      this.group.add(kh);
      var kr = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), new THREE.MeshLambertMaterial({ color: 0xd85a5a }));
      kr.scale.set(8, 4, 8); kr.rotation.y = Math.PI / 4; kr.position.set(0, 8, -22);
      this.group.add(kr);
    }

    if (d.space) {
      /* the ToP platform edge glow */
      var edge = new THREE.Mesh(new THREE.TorusGeometry(d.ringR, 1.2, 6, 64),
        FX.hotMat(0x6fa8ff, 2.0, { opacity: 0.9 }));
      edge.rotation.x = Math.PI / 2;
      edge.position.y = d.ringH;
      this.group.add(edge);
    }
  };

  /* --------------------------------------------------------------- bounds */
  Arena.prototype.clamp = function (f) {
    var r = Math.hypot(f.pos.x, f.pos.z);
    var lim = this.radius - f.radius;
    if (r > lim) {
      var k = lim / r;
      f.pos.x *= k; f.pos.z *= k;
      var nx = f.pos.x / r, nz = f.pos.z / r;
      var vn = f.vel.x * nx + f.vel.z * nz;
      if (vn > 0) { f.vel.x -= vn * nx * 1.4; f.vel.z -= vn * nz * 1.4; }
    }
    if (f.pos.y > this.ceil) {
      f.pos.y = this.ceil;
      if (f.vel.y > 0) f.vel.y = 0;
    }
    /* fell off the tiny planet or the ToP platform */
    if (this.def.tinyPlanet && f.pos.y < -40) { f.pos.y = -40; f.vel.y = 0; }
  };

  Arena.prototype.outOfBounds = function (p) {
    return (p.x * p.x + p.z * p.z) > (this.radius + 40) * (this.radius + 40) ||
      p.y > this.ceil + 60 || p.y < -80;
  };

  /* ring-out check for tournament rules */
  Arena.prototype.outsideRing = function (f) {
    if (this.def.kind !== 'ring' || this.def.ringR > 100) return false;
    return Math.hypot(f.pos.x, f.pos.z) > this.def.ringR && f.grounded;
  };

  Arena.prototype.spawnPoints = function () {
    var d = 9;
    return [
      new THREE.Vector3(-d, this.groundAt(-d, 0), 0),
      new THREE.Vector3(d, this.groundAt(d, 0), 0)
    ];
  };

  Arena.prototype.update = function (dt, t) {
    if (this.water) {
      this.water.position.y = (this.def.waterY || -1) + Math.sin(t * 0.6) * 0.12;
    }
    if (this.debris) {
      for (var i = 0; i < this.debris.length; i++) {
        var d = this.debris[i];
        d.m.rotation.x += d.sp * dt;
        d.m.rotation.y += d.sp2 * dt;
      }
    }
    if (this.crowd) this.crowd.rotation.y = Math.sin(t * 0.4) * 0.01;
    this.lateUpdate();
  };

  Arena.prototype.dispose = function () {
    var self = this;
    this.group.traverse(function (o) {
      if (o.isMesh) {
        if (o.geometry && o.geometry !== FX.GEO.box && o.geometry !== FX.GEO.sphLo) o.geometry.dispose();
        if (o.material && o.material.dispose) o.material.dispose();
      }
    });
    this.scene.remove(this.group);
    this.scene.fog = null;
  };

  C.Arena = Arena;

})(DBZ);
