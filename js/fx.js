/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — effects and the render pipeline

   The look of this game is one idea: draw the world normally, then find every
   pixel brighter than white and bleed it. Ki auras, beams and transformation
   flashes are authored with colour components well above 1.0, so they survive
   into a half-float buffer and bloom hard while the fighters stay crisp.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M;
  var FX = {};
  C.FX = FX;

  /* =========================== shared resources ========================= */
  var GEO = {}, MAT = {};
  FX.GEO = GEO; FX.MAT = MAT;

  FX.initShared = function () {
    if (GEO.quad) return;
    GEO.quad = new THREE.PlaneGeometry(2, 2);
    GEO.sph = new THREE.SphereGeometry(1, 20, 14);
    GEO.sphLo = new THREE.SphereGeometry(1, 12, 8);
    GEO.cyl = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
    GEO.cone = new THREE.ConeGeometry(1, 1, 16);
    GEO.ring = new THREE.RingGeometry(0.82, 1, 48);
    GEO.torus = new THREE.TorusGeometry(1, 0.06, 8, 40);
    GEO.plane = new THREE.PlaneGeometry(1, 1);
    GEO.box = new THREE.BoxGeometry(1, 1, 1);
  };

  /* a soft radial dot, used for every sprite-ish particle */
  FX.dotTexture = function () {
    if (FX._dot) return FX._dot;
    var s = 64, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var g = cv.getContext('2d');
    var grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0.00, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.28)');
    grd.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    var t = new THREE.CanvasTexture(cv);
    t.needsUpdate = true;
    FX._dot = t;
    return t;
  };

  /* a vertical streak, for aura flames and speed lines */
  FX.streakTexture = function () {
    if (FX._streak) return FX._streak;
    var w = 32, h = 128, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    for (var y = 0; y < h; y++) {
      var v = y / (h - 1);
      var a = Math.pow(1 - v, 1.5) * Math.min(1, v * 8);
      var wd = (1 - v) * 0.9 + 0.1;
      var grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(0.5, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(w / 2 - (w * wd) / 2, y, w * wd, 1);
    }
    var t = new THREE.CanvasTexture(cv);
    FX._streak = t;
    return t;
  };

  /* ======================== the bloom render pipeline ==================== */
  var VERT = [
    'varying vec2 vUv;',
    'void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
  ].join('\n');

  var FRAG_BRIGHT = [
    'uniform sampler2D tDiffuse; uniform float threshold; uniform float soft;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  float k = smoothstep(threshold, threshold + soft, l);',
    /* keep the hue but boost saturation slightly so beams read as coloured light */
    '  gl_FragColor = vec4(c * k, 1.0);',
    '}'
  ].join('\n');

  var FRAG_BLUR = [
    'uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;',
    'void main(){',
    '  vec3 s = texture2D(tDiffuse, vUv).rgb * 0.2270270270;',
    '  s += texture2D(tDiffuse, vUv + dir * 1.3846153846).rgb * 0.3162162162;',
    '  s += texture2D(tDiffuse, vUv - dir * 1.3846153846).rgb * 0.3162162162;',
    '  s += texture2D(tDiffuse, vUv + dir * 3.2307692308).rgb * 0.0702702703;',
    '  s += texture2D(tDiffuse, vUv - dir * 3.2307692308).rgb * 0.0702702703;',
    '  gl_FragColor = vec4(s, 1.0);',
    '}'
  ].join('\n');

  /* Composite also carries the two "camera feels it" effects: a radial
     speed blur during dashes and impacts, and a soft vignette.          */
  var FRAG_COMP = [
    'uniform sampler2D tBase; uniform sampler2D tBloom1; uniform sampler2D tBloom2;',
    'uniform float strength; uniform float radial; uniform vec2 center;',
    'uniform float vignette; uniform float aberr; uniform float flashAmt;',
    'uniform vec3 flashCol; uniform float grade;',
    'uniform float sat; uniform float contrast; uniform float lift;',
    'varying vec2 vUv;',
    'vec3 sampleBase(vec2 uv){',
    '  if (aberr < 0.001) return texture2D(tBase, uv).rgb;',
    '  vec2 d = (uv - center) * aberr;',
    '  return vec3(texture2D(tBase, uv + d).r,',
    '              texture2D(tBase, uv).g,',
    '              texture2D(tBase, uv - d).b);',
    '}',
    'void main(){',
    '  vec3 base;',
    '  if (radial > 0.0005) {',
    '    vec2 dir = (center - vUv) * radial;',
    '    base  = sampleBase(vUv) * 0.30;',
    '    base += sampleBase(vUv + dir * 0.25) * 0.22;',
    '    base += sampleBase(vUv + dir * 0.50) * 0.18;',
    '    base += sampleBase(vUv + dir * 0.75) * 0.16;',
    '    base += sampleBase(vUv + dir * 1.00) * 0.14;',
    '  } else {',
    '    base = sampleBase(vUv);',
    '  }',
    '  vec3 bl = texture2D(tBloom1, vUv).rgb * 0.62 + texture2D(tBloom2, vUv).rgb * 0.38;',
    '  vec3 col = base + bl * strength;',
    /* gentle filmic shoulder so nothing clips to flat white */
    '  col = col / (1.0 + col * grade);',
    /* Anime cels are printed, not photographed: push saturation and pull the
       midtones apart so flat colour fields stay distinct instead of drifting
       into one another. Without this a whole stage reads as beige haze. */
    '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '  col = mix(vec3(lum), col, sat);',
    '  col = clamp((col - 0.5) * contrast + 0.5 + lift, 0.0, 4.0);',
    '  float d = distance(vUv, vec2(0.5));',
    '  col *= 1.0 - vignette * smoothstep(0.35, 0.95, d);',
    '  col = mix(col, flashCol, flashAmt);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function Composer(renderer) {
    this.r = renderer;
    this.enabled = true;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    FX.initShared();
    this.quad = new THREE.Mesh(GEO.quad, null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    var fmt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    var hf = renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.hdr = hf;

    this.rtScene = new THREE.WebGLRenderTarget(2, 2, Object.assign({ type: hf, depthBuffer: true, stencilBuffer: false }, fmt));
    this.rtA = new THREE.WebGLRenderTarget(2, 2, Object.assign({ type: hf, depthBuffer: false }, fmt));
    this.rtB = new THREE.WebGLRenderTarget(2, 2, Object.assign({ type: hf, depthBuffer: false }, fmt));
    this.rtC = new THREE.WebGLRenderTarget(2, 2, Object.assign({ type: hf, depthBuffer: false }, fmt));
    this.rtD = new THREE.WebGLRenderTarget(2, 2, Object.assign({ type: hf, depthBuffer: false }, fmt));

    this.mBright = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_BRIGHT, depthTest: false, depthWrite: false,
      /* Threshold sits above the brightest a normally-lit surface can reach, so
         only the deliberately over-bright materials (auras, beams, sparks)
         bloom. Drop it and the whole world turns to fog. */
      uniforms: { tDiffuse: { value: null }, threshold: { value: 1.12 }, soft: { value: 0.45 } }
    });
    this.mBlur = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_BLUR, depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } }
    });
    this.mComp = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG_COMP, depthTest: false, depthWrite: false,
      uniforms: {
        tBase: { value: null }, tBloom1: { value: null }, tBloom2: { value: null },
        strength: { value: 1.15 }, radial: { value: 0 },
        center: { value: new THREE.Vector2(0.5, 0.5) },
        vignette: { value: 0.42 }, aberr: { value: 0 },
        flashAmt: { value: 0 }, flashCol: { value: new THREE.Vector3(1, 1, 1) },
        grade: { value: 0.09 },
        sat: { value: 1.22 }, contrast: { value: 1.10 }, lift: { value: -0.012 }
      }
    });
  }

  Composer.prototype.setSize = function (w, h, pr) {
    w = Math.max(2, Math.floor(w * pr)); h = Math.max(2, Math.floor(h * pr));
    if (this._w === w && this._h === h) return;
    this._w = w; this._h = h;
    this.rtScene.setSize(w, h);
    this.rtA.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.rtB.setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.rtC.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.rtD.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
  };

  Composer.prototype.blit = function (mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target || null);
    this.r.render(this.scene, this.cam);
  };

  /* renderFn(target) must draw the world into `target` (it may draw several
     viewports for split screen). Everything after that is post.          */
  Composer.prototype.render = function (renderFn) {
    if (!this.enabled) { renderFn(null); return; }
    renderFn(this.rtScene);

    this.mBright.uniforms.tDiffuse.value = this.rtScene.texture;
    this.blit(this.mBright, this.rtA);

    var w1 = this.rtA.width, h1 = this.rtA.height;
    this.mBlur.uniforms.tDiffuse.value = this.rtA.texture;
    this.mBlur.uniforms.dir.value.set(1.35 / w1, 0);
    this.blit(this.mBlur, this.rtB);
    this.mBlur.uniforms.tDiffuse.value = this.rtB.texture;
    this.mBlur.uniforms.dir.value.set(0, 1.35 / h1);
    this.blit(this.mBlur, this.rtA);

    /* second, much wider pass at quarter res — this is the "glow halo" */
    var w2 = this.rtC.width, h2 = this.rtC.height;
    this.mBlur.uniforms.tDiffuse.value = this.rtA.texture;
    this.mBlur.uniforms.dir.value.set(2.6 / w2, 0);
    this.blit(this.mBlur, this.rtC);
    this.mBlur.uniforms.tDiffuse.value = this.rtC.texture;
    this.mBlur.uniforms.dir.value.set(0, 2.6 / h2);
    this.blit(this.mBlur, this.rtD);
    this.mBlur.uniforms.tDiffuse.value = this.rtD.texture;
    this.mBlur.uniforms.dir.value.set(5.2 / w2, 0);
    this.blit(this.mBlur, this.rtC);
    this.mBlur.uniforms.tDiffuse.value = this.rtC.texture;
    this.mBlur.uniforms.dir.value.set(0, 5.2 / h2);
    this.blit(this.mBlur, this.rtD);

    this.mComp.uniforms.tBase.value = this.rtScene.texture;
    this.mComp.uniforms.tBloom1.value = this.rtA.texture;
    this.mComp.uniforms.tBloom2.value = this.rtD.texture;
    this.r.setRenderTarget(null);
    this.blit(this.mComp, null);
  };

  FX.Composer = Composer;

  /* ============================== particles =============================
     One THREE.Points for everything. Attributes are typed arrays we write
     from JS; the shader handles billboarding, fade and additive colour.  */
  var PVERT = [
    'attribute float aSize; attribute vec3 aColor; attribute float aAlpha;',
    'attribute float aRot;',
    'varying vec3 vColor; varying float vAlpha; varying float vRot;',
    'uniform float uScale;',
    'void main(){',
    '  vColor = aColor; vAlpha = aAlpha; vRot = aRot;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = aSize * uScale / max(0.001, -mv.z);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  var PFRAG = [
    'uniform sampler2D tMap;',
    'varying vec3 vColor; varying float vAlpha; varying float vRot;',
    'void main(){',
    '  vec2 uv = gl_PointCoord - 0.5;',
    '  float c = cos(vRot), s = sin(vRot);',
    '  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;',
    '  vec4 t = texture2D(tMap, uv);',
    '  gl_FragColor = vec4(vColor * t.a * vAlpha, t.a * vAlpha);',
    '}'
  ].join('\n');

  function Particles(max, texture) {
    this.max = max; this.n = 0;
    var g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.siz = new Float32Array(max);
    this.alp = new Float32Array(max);
    this.rot = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alp, 1));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1));
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: PVERT, fragmentShader: PFRAG,
      uniforms: { tMap: { value: texture }, uScale: { value: 420 } },
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
      transparent: true
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;

    /* CPU-side particle state, parallel arrays */
    this.vx = new Float32Array(max); this.vy = new Float32Array(max); this.vz = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.size0 = new Float32Array(max); this.size1 = new Float32Array(max);
    this.spin = new Float32Array(max);
    this.r0 = new Float32Array(max); this.g0 = new Float32Array(max); this.b0 = new Float32Array(max);
    this.r1 = new Float32Array(max); this.g1 = new Float32Array(max); this.b1 = new Float32Array(max);
    this.fadeIn = new Float32Array(max);
  }

  var _c = { r: 0, g: 0, b: 0 };
  function unpack(hex, out, mul) {
    mul = mul === undefined ? 1 : mul;
    out.r = (((hex >> 16) & 255) / 255) * mul;
    out.g = (((hex >> 8) & 255) / 255) * mul;
    out.b = ((hex & 255) / 255) * mul;
  }
  FX.unpack = unpack;

  Particles.prototype.spawn = function (o) {
    var i;
    if (this.n < this.max) { i = this.n++; }
    else {
      /* recycle the oldest — find the one closest to death */
      i = 0; var worst = 1e9;
      for (var k = 0; k < this.max; k += 7) {
        var rem = this.life[k];
        if (rem < worst) { worst = rem; i = k; }
      }
    }
    var p = i * 3;
    this.pos[p] = o.x; this.pos[p + 1] = o.y; this.pos[p + 2] = o.z;
    this.vx[i] = o.vx || 0; this.vy[i] = o.vy || 0; this.vz[i] = o.vz || 0;
    this.maxLife[i] = this.life[i] = o.life || 0.6;
    this.grav[i] = o.grav || 0; this.drag[i] = o.drag === undefined ? 1.6 : o.drag;
    this.size0[i] = o.size || 1; this.size1[i] = o.size1 === undefined ? 0 : o.size1;
    this.spin[i] = o.spin || 0;
    this.rot[i] = o.rot || 0;
    this.fadeIn[i] = o.fadeIn || 0;
    unpack(o.color === undefined ? 0xffffff : o.color, _c, o.boost === undefined ? 1 : o.boost);
    this.r0[i] = _c.r; this.g0[i] = _c.g; this.b0[i] = _c.b;
    unpack(o.color1 === undefined ? (o.color === undefined ? 0xffffff : o.color) : o.color1, _c, o.boost1 === undefined ? (o.boost === undefined ? 1 : o.boost) : o.boost1);
    this.r1[i] = _c.r; this.g1[i] = _c.g; this.b1[i] = _c.b;
    this.alp[i] = 0;
    return i;
  };

  Particles.prototype.update = function (dt) {
    var n = this.n, pos = this.pos, col = this.col, siz = this.siz, alp = this.alp;
    var live = 0;
    for (var i = 0; i < n; i++) {
      var L = this.life[i];
      if (L <= 0) { alp[i] = 0; siz[i] = 0; continue; }
      L -= dt;
      this.life[i] = L;
      if (L <= 0) { alp[i] = 0; siz[i] = 0; continue; }
      live++;
      var t = 1 - L / this.maxLife[i];            /* 0 at birth, 1 at death */
      var p = i * 3;
      var d = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= d; this.vz[i] *= d;
      this.vy[i] = this.vy[i] * d + this.grav[i] * dt;
      pos[p] += this.vx[i] * dt;
      pos[p + 1] += this.vy[i] * dt;
      pos[p + 2] += this.vz[i] * dt;
      this.rot[i] += this.spin[i] * dt;
      siz[i] = M.lerp(this.size0[i], this.size1[i], t);
      var a = 1 - t;
      if (this.fadeIn[i] > 0) a *= M.sat(t / this.fadeIn[i]);
      alp[i] = a * a;
      col[p] = M.lerp(this.r0[i], this.r1[i], t);
      col[p + 1] = M.lerp(this.g0[i], this.g1[i], t);
      col[p + 2] = M.lerp(this.b0[i], this.b1[i], t);
    }
    /* shrink the active range when the tail has died out */
    while (this.n > 0 && this.life[this.n - 1] <= 0) this.n--;
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aRot.needsUpdate = true;
    this.liveCount = live;
  };

  Particles.prototype.clear = function () {
    for (var i = 0; i < this.n; i++) { this.life[i] = 0; this.alp[i] = 0; this.siz[i] = 0; }
    this.n = 0;
    this.geo.setDrawRange(0, 0);
  };

  FX.Particles = Particles;

  /* ============================ FX manager ============================== */
  FX.init = function (scene, opts) {
    FX.initShared();
    FX.scene = scene;
    FX.quality = (opts && opts.quality) || 'high';
    var budget = FX.quality === 'low' ? 900 : (FX.quality === 'medium' ? 2200 : 4200);
    FX.dots = new Particles(budget, FX.dotTexture());
    FX.streaks = new Particles(FX.quality === 'low' ? 400 : 1200, FX.streakTexture());
    scene.add(FX.dots.points);
    scene.add(FX.streaks.points);
    FX.rings = [];
    FX.beams = [];
    FX.trails = [];
    FX.ghosts = [];
    FX.flashLights = [];
    FX.time = 0;
    FX.rate = C.S.particles;
    FX._ringPool = [];
    FX._ghostPool = [];
    FX._boltPool = [];
    FX.bolts = [];
  };

  FX.reset = function () {
    if (!FX.dots) return;
    FX.dots.clear(); FX.streaks.clear();
    var i;
    for (i = FX.rings.length - 1; i >= 0; i--) retireRing(FX.rings[i]);
    for (i = FX.ghosts.length - 1; i >= 0; i--) retireGhost(FX.ghosts[i]);
    for (i = FX.bolts.length - 1; i >= 0; i--) retireBolt(FX.bolts[i]);
    FX.rings.length = 0; FX.ghosts.length = 0; FX.bolts.length = 0;
  };

  FX.setQuality = function (q) {
    FX.quality = q;
    FX.rate = q === 'low' ? 0.45 : (q === 'medium' ? 0.75 : 1);
  };

  /* ------------------------------------------------------------- shockwave */
  function makeRing() {
    var m = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false
    }));
    m.renderOrder = 5;
    return m;
  }
  function retireRing(r) {
    if (r.parent) r.parent.remove(r);
    var i = FX.rings.indexOf(r); if (i >= 0) FX.rings.splice(i, 1);
    FX._ringPool.push(r);
  }

  /* orient: 'flat' lies on the ground, 'face' billboards, 'axis' uses `dir` */
  FX.ring = function (o) {
    var r = FX._ringPool.pop() || makeRing();
    r.position.set(o.x, o.y, o.z);
    r.material.color.setHex(o.color === undefined ? 0xffffff : o.color);
    r.material.color.multiplyScalar(o.boost === undefined ? 2.2 : o.boost);
    r.material.opacity = 1;
    r.scale.setScalar(o.r0 === undefined ? 0.4 : o.r0);
    r.userData.r0 = o.r0 === undefined ? 0.4 : o.r0;
    r.userData.r1 = o.r1 === undefined ? 6 : o.r1;
    r.userData.life = r.userData.max = o.life || 0.5;
    r.userData.mode = o.orient || 'flat';
    r.userData.thin = o.thin || 1;
    if (o.orient === 'flat') r.rotation.set(-Math.PI / 2, 0, o.spin || 0);
    else if (o.orient === 'axis' && o.dir) {
      r.lookAt(o.x + o.dir.x, o.y + o.dir.y, o.z + o.dir.z);
      r.rotateZ(o.spin || 0);
    } else r.rotation.set(0, 0, o.spin || 0);
    FX.scene.add(r); FX.rings.push(r);
    return r;
  };

  /* ------------------------------------------------------- lightning bolts
     A jagged tube between two points. Used for SSJ2+ auras and impacts.  */
  function makeBolt() {
    var g = new THREE.BufferGeometry();
    var N = 12;
    var pos = new Float32Array(N * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var m = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    });
    var l = new THREE.Line(g, m);
    l.frustumCulled = false;
    l.renderOrder = 7;
    l.userData.N = N;
    return l;
  }
  function retireBolt(b) {
    if (b.parent) b.parent.remove(b);
    var i = FX.bolts.indexOf(b); if (i >= 0) FX.bolts.splice(i, 1);
    FX._boltPool.push(b);
  }

  FX.bolt = function (ax, ay, az, bx, by, bz, color, life, jag, boost) {
    var b = FX._boltPool.pop() || makeBolt();
    var N = b.userData.N, arr = b.geometry.attributes.position.array;
    jag = jag === undefined ? 0.4 : jag;
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var w = Math.sin(t * Math.PI);
      arr[i * 3] = M.lerp(ax, bx, t) + (Math.random() - 0.5) * jag * w;
      arr[i * 3 + 1] = M.lerp(ay, by, t) + (Math.random() - 0.5) * jag * w;
      arr[i * 3 + 2] = M.lerp(az, bz, t) + (Math.random() - 0.5) * jag * w;
    }
    b.geometry.attributes.position.needsUpdate = true;
    b.material.color.setHex(color === undefined ? 0xffe97a : color);
    b.material.color.multiplyScalar(boost === undefined ? 3.0 : boost);
    b.material.opacity = 1;
    b.userData.life = b.userData.max = life || 0.14;
    FX.scene.add(b); FX.bolts.push(b);
    return b;
  };

  /* ------------------------------------------------------------ afterimage
     A cheap ghost: clone the fighter's mesh group into a flat-coloured
     copy that fades. Used on dashes and vanishes.                      */
  function retireGhost(g) {
    if (g.parent) g.parent.remove(g);
    var i = FX.ghosts.indexOf(g); if (i >= 0) FX.ghosts.splice(i, 1);
    g.traverse(function (o) { if (o.isMesh && o.material) o.material.dispose(); });
    if (g.geometry) g.geometry.dispose();
  }

  FX.ghost = function (sourceGroup, color, life, opacity) {
    if (FX.quality === 'low' && FX.ghosts.length > 4) return null;
    if (FX.ghosts.length > 26) return null;
    var clone = sourceGroup.clone(true);
    var mat = new THREE.MeshBasicMaterial({
      color: color === undefined ? 0x88ccff : color, transparent: true,
      opacity: opacity === undefined ? 0.5 : opacity, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false
    });
    clone.traverse(function (o) {
      if (o.isMesh) { o.material = mat; o.castShadow = false; o.receiveShadow = false; }
      if (o.isPoints || o.isLine) o.visible = false;
    });
    clone.userData.life = clone.userData.max = life || 0.32;
    clone.userData.mat = mat;
    clone.userData.op = opacity === undefined ? 0.5 : opacity;
    FX.scene.add(clone); FX.ghosts.push(clone);
    return clone;
  };

  /* ------------------------------------------------------------- emitters */

  /* impact spark burst — the bread and butter of melee */
  FX.hit = function (x, y, z, color, power) {
    power = power || 1;
    var n = Math.round(M.clamp(10 * power, 5, 40) * FX.rate);
    for (var i = 0; i < n; i++) {
      var sp = M.rand(4, 14) * (0.6 + power * 0.5);
      var th = M.rand(0, M.PI2), ph = Math.acos(M.rand(-1, 1));
      FX.dots.spawn({
        x: x, y: y, z: z,
        vx: Math.sin(ph) * Math.cos(th) * sp,
        vy: Math.cos(ph) * sp,
        vz: Math.sin(ph) * Math.sin(th) * sp,
        life: M.rand(0.16, 0.42), drag: 4.5,
        size: M.rand(0.10, 0.28) * (0.7 + power * 0.4), size1: 0,
        color: 0xffffff, boost: 3.5, color1: color, boost1: 2.2
      });
    }
    FX.ring({
      x: x, y: y, z: z, color: color, boost: 3.0, orient: 'face',
      r0: 0.2 * power, r1: 2.2 * power, life: 0.22
    });
  };

  /* a heavy blow: bigger ring, debris, a bolt or two */
  FX.smash = function (x, y, z, color, power) {
    FX.hit(x, y, z, color, power * 1.4);
    FX.ring({ x: x, y: y, z: z, color: 0xffffff, boost: 3.4, orient: 'face', r0: 0.3, r1: 4.2 * power, life: 0.34 });
    for (var i = 0; i < 3; i++) {
      var a = M.rand(0, M.PI2), r = 1.6 * power;
      FX.bolt(x, y, z,
        x + Math.cos(a) * r, y + M.rand(-r, r), z + Math.sin(a) * r,
        color, 0.12, 0.5, 3.2);
    }
  };

  /* ki charge motes converging on a point */
  FX.charge = function (x, y, z, color, radius, rate, dt) {
    var n = rate * dt * FX.rate;
    var k = Math.floor(n) + (Math.random() < (n % 1) ? 1 : 0);
    for (var i = 0; i < k; i++) {
      var th = M.rand(0, M.PI2), ph = Math.acos(M.rand(-1, 1));
      var R = radius * M.rand(0.7, 1.4);
      var px = x + Math.sin(ph) * Math.cos(th) * R;
      var py = y + Math.cos(ph) * R;
      var pz = z + Math.sin(ph) * Math.sin(th) * R;
      var life = M.rand(0.22, 0.42);
      FX.dots.spawn({
        x: px, y: py, z: pz,
        vx: (x - px) / life, vy: (y - py) / life, vz: (z - pz) / life,
        life: life, drag: 0.05, size: M.rand(0.08, 0.2), size1: 0.02,
        color: color, boost: 2.6, color1: 0xffffff, boost1: 3.4, fadeIn: 0.25
      });
    }
  };

  /* rising aura flames */
  FX.auraFlames = function (x, y, z, color, scale, intensity, dt) {
    var n = 62 * intensity * dt * FX.rate;
    var k = Math.floor(n) + (Math.random() < (n % 1) ? 1 : 0);
    for (var i = 0; i < k; i++) {
      var a = M.rand(0, M.PI2), r = M.rand(0, 0.55) * scale;
      FX.streaks.spawn({
        x: x + Math.cos(a) * r, y: y + M.rand(-0.7, 0.9) * scale, z: z + Math.sin(a) * r,
        vx: Math.cos(a) * 0.6, vy: M.rand(4, 9) * scale, vz: Math.sin(a) * 0.6,
        life: M.rand(0.20, 0.42), drag: 1.1,
        size: M.rand(0.55, 1.25) * scale, size1: 0.04,
        color: 0xffffff, boost: 2.4, color1: color, boost1: 3.0, fadeIn: 0.2
      });
    }
  };

  /* debris kicked up when someone hits the ground */
  FX.debris = function (x, y, z, color, power) {
    var n = Math.round(14 * power * FX.rate);
    for (var i = 0; i < n; i++) {
      var a = M.rand(0, M.PI2), sp = M.rand(3, 12) * power;
      FX.dots.spawn({
        x: x + M.rand(-1, 1) * power, y: y + 0.1, z: z + M.rand(-1, 1) * power,
        vx: Math.cos(a) * sp, vy: M.rand(4, 13) * power, vz: Math.sin(a) * sp,
        life: M.rand(0.5, 1.1), drag: 0.5, grav: -26,
        size: M.rand(0.10, 0.3), size1: 0.02,
        color: color === undefined ? 0x9a8a72 : color, boost: 0.9
      });
    }
    FX.ring({ x: x, y: y + 0.06, z: z, color: 0xd8c8a8, boost: 1.2, orient: 'flat', r0: 0.5 * power, r1: 6 * power, life: 0.55 });
  };

  /* a bright expanding sphere — explosions, transformations, nova blasts */
  FX.burst = function (x, y, z, color, radius, life) {
    life = life || 0.55;
    var n = Math.round(M.clamp(radius * 8, 14, 90) * FX.rate);
    for (var i = 0; i < n; i++) {
      var th = M.rand(0, M.PI2), ph = Math.acos(M.rand(-1, 1));
      var sp = radius / life * M.rand(0.5, 1.1);
      FX.dots.spawn({
        x: x, y: y, z: z,
        vx: Math.sin(ph) * Math.cos(th) * sp,
        vy: Math.cos(ph) * sp, vz: Math.sin(ph) * Math.sin(th) * sp,
        life: life * M.rand(0.5, 1), drag: 1.4,
        size: M.rand(0.25, 0.8) * Math.min(2, radius * 0.25), size1: 0,
        color: 0xffffff, boost: 4, color1: color, boost1: 2.4
      });
    }
    FX.ring({ x: x, y: y, z: z, color: color, boost: 3.4, orient: 'face', r0: 0.5, r1: radius * 1.5, life: life * 0.9 });
    FX.ring({ x: x, y: y, z: z, color: 0xffffff, boost: 3.0, orient: 'flat', r0: 0.5, r1: radius * 1.9, life: life });
  };

  /* ------------------------------------------------------------ trail bank
     Ribbon trails for dashes and thrown spheres, drawn as fading dots.  */
  FX.trail = function (x, y, z, color, size, life) {
    FX.dots.spawn({
      x: x, y: y, z: z, life: life || 0.3, drag: 3, size: size || 0.3, size1: 0,
      color: 0xffffff, boost: 2.6, color1: color, boost1: 2.0
    });
  };

  /* ================================ update ============================== */
  FX.update = function (dt) {
    FX.time += dt;
    FX.dots.update(dt);
    FX.streaks.update(dt);

    var i, o, t;
    for (i = FX.rings.length - 1; i >= 0; i--) {
      o = FX.rings[i];
      o.userData.life -= dt;
      if (o.userData.life <= 0) { retireRing(o); continue; }
      t = 1 - o.userData.life / o.userData.max;
      var s = M.lerp(o.userData.r0, o.userData.r1, M.easeOut(t));
      o.scale.set(s, s, s);
      o.material.opacity = (1 - t) * (1 - t);
      if (o.userData.mode === 'face' && FX.camera) o.quaternion.copy(FX.camera.quaternion);
    }

    for (i = FX.bolts.length - 1; i >= 0; i--) {
      o = FX.bolts[i];
      o.userData.life -= dt;
      if (o.userData.life <= 0) { retireBolt(o); continue; }
      o.material.opacity = o.userData.life / o.userData.max;
    }

    for (i = FX.ghosts.length - 1; i >= 0; i--) {
      o = FX.ghosts[i];
      o.userData.life -= dt;
      if (o.userData.life <= 0) { retireGhost(o); continue; }
      t = o.userData.life / o.userData.max;
      o.userData.mat.opacity = o.userData.op * t * t;
      o.scale.multiplyScalar(1 + dt * 0.35);
    }
  };

  /* helper: bump a colour above 1.0 so it blooms */
  FX.hot = function (mat, hex, boost) {
    mat.color.setHex(hex);
    mat.color.multiplyScalar(boost === undefined ? 2.4 : boost);
    return mat;
  };

  FX.hotMat = function (hex, boost, opts) {
    var m = new THREE.MeshBasicMaterial(Object.assign({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      toneMapped: false
    }, opts || {}));
    FX.hot(m, hex, boost);
    return m;
  };

})(DBZ);
