/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — procedural character construction

   Turns a roster entry into a posable rig of primitives. Every silhouette
   detail that makes a character recognisable — Vegeta's widow's peak, Piccolo's
   antennae, Frieza's horns, Cell's crest, Buu's head tentacle — is a small
   parameterised builder here. No meshes are downloaded, ever.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M;
  var B = {};
  C.Build = B;

  /* ============================== cel shading ============================
     Anime does not shade with a smooth gradient — it fills a flat base
     colour and drops one hard-edged shadow shape over it. MeshToonMaterial
     with a stepped gradient map gives exactly that, and unlike a bespoke
     shader it still gets three.js lighting, fog and shadow maps for free. */
  var gradientTex = null;
  function toonGradient() {
    if (gradientTex) return gradientTex;
    /* three bands: core shadow, mid, lit. The jump from 0.42 to 0.86 is what
       makes the terminator a line instead of a fade. */
    var steps = [110, 178, 255];
    var data = new Uint8Array(steps.length * 4);
    for (var i = 0; i < steps.length; i++) {
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = steps[i];
      data[i * 4 + 3] = 255;
    }
    gradientTex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
    gradientTex.minFilter = gradientTex.magFilter = THREE.NearestFilter;
    gradientTex.generateMipmaps = false;
    gradientTex.needsUpdate = true;
    return gradientTex;
  }
  B.toonGradient = toonGradient;

  /* Terrain wants more steps than a character: three hard bands across a
     whole hillside stripes the horizon, five reads as painted ground. */
  var softTex = null;
  function toonGradientSoft() {
    if (softTex) return softTex;
    var steps = [126, 162, 196, 226, 255];
    var data = new Uint8Array(steps.length * 4);
    for (var i = 0; i < steps.length; i++) {
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = steps[i];
      data[i * 4 + 3] = 255;
    }
    softTex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
    softTex.minFilter = softTex.magFilter = THREE.NearestFilter;
    softTex.generateMipmaps = false;
    softTex.needsUpdate = true;
    return softTex;
  }
  B.toonGradientSoft = toonGradientSoft;

  /* Toon shading alone still leaves a figure looking flat against a bright
     sky, so every surface also gets a rim term injected into the shader —
     the bounce light anime uses to separate a character from the
     background. It is a two-line patch rather than a whole custom material. */
  function addRim(m, strength) {
    var k = strength === undefined ? 0.42 : strength;
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uRim = { value: k };
      /* `vNormal` only exists when the material is smooth-shaded, so the
         normal is grabbed from normal_fragment_begin instead — that local
         is defined for flat and smooth alike. */
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {',
          'uniform float uRim;\nvec3 gRimN;\nvoid main() {')
        .replace('#include <normal_fragment_begin>',
          '#include <normal_fragment_begin>\n  gRimN = normal;')
        .replace('#include <dithering_fragment>',
          '#include <dithering_fragment>\n' +
          '  float rimT = 1.0 - abs(dot(normalize(gRimN), normalize(vViewPosition)));\n' +
          '  gl_FragColor.rgb += pow(clamp(rimT, 0.0, 1.0), 3.0) * uRim * diffuseColor.rgb;');
    };
    m.customProgramCacheKey = function () { return 'rim' + k; };
    return m;
  }

  var matCache = {};
  function mat(hex, opts) {
    var key = hex + '|' + (opts ? JSON.stringify(opts) : '');
    var m = matCache[key];
    if (m) return m;
    m = makeToon(hex, opts);
    matCache[key] = m;
    return m;
  }
  B.mat = mat;

  function makeToon(hex, opts) {
    var o = Object.assign({ color: hex, gradientMap: toonGradient() }, opts || {});
    return addRim(new THREE.MeshToonMaterial(o));
  }

  /* Skin, hair and outfit materials are cloned per fighter so a
     transformation can tint one body without touching everyone else.  */
  function ownMat(hex, opts) {
    return makeToon(hex, opts);
  }
  B.ownMat = ownMat;

  function glowMat(hex, boost) {
    var m = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });
    m.color.multiplyScalar(boost === undefined ? 2.2 : boost);
    m.userData.glow = true;
    return m;
  }
  B.glowMat = glowMat;

  /* ================================ outlines =============================
     Classic inverted hull: the same shape re-drawn backface-only and pushed
     out along its normals. The offset is scaled by view depth so the ink
     line stays the same thickness on screen whether the fighter is in your
     face or across the arena. */
  var OUTLINE_VERT = [
    'uniform float uWidth;',
    'void main(){',
    '  vec3 n = normalize(normalMatrix * normal);',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  mv.xyz += n * uWidth * max(0.6, -mv.z);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  var OUTLINE_FRAG = [
    'uniform vec3 uColor;',
    'void main(){ gl_FragColor = vec4(uColor, 1.0); }'
  ].join('\n');

  B.outlineMaterial = function (width, color) {
    return new THREE.ShaderMaterial({
      vertexShader: OUTLINE_VERT, fragmentShader: OUTLINE_FRAG,
      uniforms: {
        uWidth: { value: width === undefined ? 0.0080 : width },
        uColor: { value: new THREE.Color(color === undefined ? 0x0a0a12 : color) }
      },
      side: THREE.BackSide, depthWrite: true, depthTest: true, fog: false
    });
  };

  /* Every mesh hanging off one joint shares that joint's transform, so they
     can be baked into a single outline mesh. That turns ~130 extra draw
     calls per fighter into ~18, which is the difference between outlines
     being affordable on a phone and not. */
  function mergeJointOutline(joint, material) {
    var pos = [], nrm = [], idx = [], base = 0;
    var mtx = new THREE.Matrix4(), nm = new THREE.Matrix3();
    var v = new THREE.Vector3();
    for (var c = 0; c < joint.children.length; c++) {
      var o = joint.children[c];
      if (!o.isMesh || o.userData.noOutline) continue;
      if (o.material && (o.material.userData.glow || o.material.transparent ||
        o.material.side === THREE.DoubleSide)) continue;
      var g = o.geometry;
      if (!g || !g.attributes.position || !g.attributes.normal) continue;
      o.updateMatrix();
      mtx.copy(o.matrix);
      nm.getNormalMatrix(mtx);
      var p = g.attributes.position, n = g.attributes.normal;
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(mtx);
        pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
        nrm.push(v.x, v.y, v.z);
      }
      if (g.index) {
        var ia = g.index.array;
        for (var k = 0; k < ia.length; k++) idx.push(ia[k] + base);
      } else {
        for (var k2 = 0; k2 < p.count; k2++) idx.push(k2 + base);
      }
      base += p.count;
    }
    if (!pos.length) return null;
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setIndex(idx);
    var mesh = new THREE.Mesh(geo, material);
    mesh.userData.isOutline = true;
    mesh.renderOrder = -1;
    joint.add(mesh);
    return mesh;
  }
  B.mergeJointOutline = mergeJointOutline;

  /* ------------------------------------------------------- geometry cache */
  var geoCache = {};
  function g_(key, make) {
    var g = geoCache[key];
    if (!g) { g = make(); geoCache[key] = g; }
    return g;
  }
  function sph(seg) { return g_('sph' + seg, function () { return new THREE.SphereGeometry(1, seg, Math.max(4, seg >> 1)); }); }
  function cyl(rt, rb, seg) {
    return g_('cyl' + rt + '_' + rb + '_' + seg, function () {
      return new THREE.CylinderGeometry(rt, rb, 1, seg, 1);
    });
  }
  function cone(seg) { return g_('cone' + seg, function () { return new THREE.ConeGeometry(1, 1, seg); }); }
  function box() { return g_('box', function () { return new THREE.BoxGeometry(1, 1, 1); }); }
  function torus(tube, seg) {
    return g_('tor' + tube + '_' + seg, function () { return new THREE.TorusGeometry(1, tube, 6, seg); });
  }
  B.sph = sph; B.cyl = cyl; B.cone = cone; B.box = box; B.torus = torus;

  /* ---------------------------------------------------------- primitives */
  function m_(geo, material, parent) {
    var m = new THREE.Mesh(geo, material);
    if (parent) parent.add(m);
    return m;
  }

  function ball(parent, material, r, x, y, z) {
    var m = m_(sph(12), material, parent);
    m.scale.setScalar(r);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  function ellip(parent, material, rx, ry, rz, x, y, z) {
    var m = m_(sph(12), material, parent);
    m.scale.set(rx, ry, rz);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  function tube(parent, material, rTop, rBot, len, seg) {
    var m = m_(cyl(1, 1, seg || 10), material, parent);
    m.scale.set(rBot, len, rBot);
    /* a real taper needs its own geometry; approximate with two stacked */
    if (Math.abs(rTop - rBot) > 0.001) {
      m.geometry = g_('tap' + rTop.toFixed(3) + '_' + rBot.toFixed(3) + '_' + (seg || 10), function () {
        return new THREE.CylinderGeometry(rTop / rBot, 1, 1, seg || 10, 1);
      });
    }
    return m;
  }

  function plate(parent, material, w, h, d, x, y, z) {
    var m = m_(box(), material, parent);
    m.scale.set(w, h, d);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  /* A smooth muscular torso: a lathe profile squashed on Z. */
  function torsoGeo(key, prof) {
    return g_('torso' + key, function () {
      var pts = [];
      for (var i = 0; i < prof.length; i++) pts.push(new THREE.Vector2(prof[i][0], prof[i][1]));
      var g = new THREE.LatheGeometry(pts, 16);
      g.computeVertexNormals();
      return g;
    });
  }

  /* ================================ HAIR ================================ */
  /* Builds into `head`, expecting head radius `hr` and the head centred at 0 */
  function buildHair(head, h, hr, out) {
    if (!h || h.style === 'bald' || h.n === 0) return;
    var col = h.color, tip = h.tip;
    var hm = ownMat(col);
    var tm = tip ? ownMat(tip) : hm;
    out.hairMats.push(hm);
    if (tip) out.hairMats.push(tm);

    var group = new THREE.Object3D();
    head.add(group);
    out.hairGroup = group;

    var i, a, spike;
    var N = h.n;
    var thick = h.thick || 1;

    function spikeAt(theta, phi, len, lift, rad, material) {
      var sx = Math.sin(phi) * Math.cos(theta);
      var sy = Math.cos(phi);
      var sz = Math.sin(phi) * Math.sin(theta);
      var mesh = m_(cone(6), material, group);
      mesh.scale.set(rad, len, rad);
      /* base sits on the scalp, tip pushed outward and lifted */
      var bx = sx * hr * 0.94, by = sy * hr * 0.94, bz = sz * hr * 0.94;
      var dx = sx, dy = sy + lift * 1.6, dz = sz;
      var dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl; dy /= dl; dz /= dl;
      mesh.position.set(bx + dx * len * 0.45, by + dy * len * 0.45, bz + dz * len * 0.45);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz));
      return mesh;
    }

    if (h.style === 'bob' || h.style === 'flat') {
      /* a rounded cap that hugs the skull */
      var cap = m_(g_('cap', function () {
        return new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
      }), hm, group);
      cap.scale.setScalar(hr * (1.06 + h.len * 0.5));
      cap.position.y = -hr * 0.04;
      /* fringe: short downward tabs across the brow */
      var fr = Math.max(3, Math.round(N * 0.7));
      for (i = 0; i < fr; i++) {
        var t = (i / (fr - 1) - 0.5) * 1.9;
        var f = m_(cone(5), hm, group);
        var fl = h.len * (h.style === 'flat' ? 0.7 : 1) * (0.8 + 0.4 * Math.cos(t));
        f.scale.set(hr * 0.20 * thick, fl + hr * 0.5, hr * 0.16);
        f.position.set(Math.sin(t) * hr * 0.86, hr * 0.42 - fl * 0.3, Math.cos(t * 0.8) * hr * 0.82);
        f.rotation.x = Math.PI * (h.style === 'flat' ? 0.06 : 0.94);
        f.rotation.z = -t * 0.35;
      }
      if (h.part) {
        /* a swept side-part slab */
        var sp = m_(cone(5), hm, group);
        sp.scale.set(hr * 0.3, hr * 1.1, hr * 0.3);
        sp.position.set(hr * 0.6, hr * 0.6, hr * 0.5);
        sp.rotation.z = -0.9;
      }
      if (h.back > 0) {
        var bk = m_(cone(7), hm, group);
        bk.scale.set(hr * 0.85 * thick, hr * h.back * 2.2, hr * 0.55);
        bk.position.set(0, hr * 0.1 - hr * h.back * 0.9, -hr * 0.68);
        bk.rotation.x = Math.PI * 0.98;
      }
    } else {
      /* spiky / flame / mane all share the crown-of-cones core */
      var lift = h.lift;
      var rings = h.style === 'flame' ? 2 : 3;
      var placed = 0;
      for (var r = 0; r < rings; r++) {
        var phi = 0.22 + r * (h.style === 'flame' ? 0.42 : 0.36);
        var count = Math.max(1, Math.round(N * (r === 0 ? 0.3 : (r === 1 ? 0.38 : 0.32))));
        for (i = 0; i < count && placed < N + 3; i++, placed++) {
          a = (i / count) * M.PI2 + r * 0.5;
          if (h.style === 'flame') {
            /* sweep everything backward into one blade */
            a = -Math.PI / 2 + (i / Math.max(1, count - 1) - 0.5) * 1.5;
          }
          var len = h.len * hr * (h.style === 'flame' ? (7.6 - r * 1.2) : (5.9 - r * 0.75)) *
            (0.84 + 0.34 * M.hash1(i * 3.1 + r * 7.7));
          var rad = hr * (h.style === 'flame' ? 0.34 : 0.31) * thick * (1 - r * 0.09);
          spike = spikeAt(a, phi, len, lift * (1 + r * 0.15), rad, (tip && r === 0) ? tm : hm);
          if (h.style === 'flame') spike.rotation.z += 0.0;
        }
      }
      /* front bangs, stopping above the brow so the face stays readable */
      if (h.bang > 0) {
        var nb = Math.max(2, Math.round(N * 0.35));
        for (i = 0; i < nb; i++) {
          var bt = (i / (nb - 1) - 0.5) * 1.5;
          var bang = m_(cone(5), hm, group);
          var bl = h.bang * hr * 0.72 * (0.7 + 0.5 * Math.cos(bt));
          bang.scale.set(hr * 0.20 * thick, bl, hr * 0.16);
          bang.position.set(Math.sin(bt) * hr * 0.70, hr * 0.74 - bl * 0.34, hr * 0.72);
          bang.rotation.x = Math.PI * 0.84;
          bang.rotation.z = -bt * 0.55;
        }
      }
      if (h.part) {
        /* Vegeta's widow's peak: one blade down the centre of the forehead */
        var wp = m_(cone(5), hm, group);
        wp.scale.set(hr * 0.24, hr * 0.62, hr * 0.2);
        wp.position.set(0, hr * 0.42, hr * 0.86);
        wp.rotation.x = Math.PI * 0.86;
      }
      /* the trailing mane */
      if (h.back > 0) {
        var nm = Math.max(3, Math.round(N * 0.55));
        for (i = 0; i < nm; i++) {
          var mt = (i / (nm - 1) - 0.5) * 2.0;
          var strand = m_(cone(6), hm, group);
          var ml = h.back * hr * 3.0 * (0.7 + 0.45 * Math.cos(mt * 0.8));
          strand.scale.set(hr * 0.26 * thick, ml, hr * 0.22 * thick);
          strand.position.set(Math.sin(mt) * hr * 0.7, hr * 0.15 - ml * 0.42, -hr * 0.72 - Math.abs(Math.sin(mt)) * hr * 0.2);
          strand.rotation.x = Math.PI * 0.97;
          strand.rotation.z = -mt * 0.28;
          out.maneStrands.push(strand);
        }
      }
    }
  }

  /* ================================ FACE ================================ */
  function buildFace(head, spec, hr, out) {
    var skinM = out.skinMat;
    var eyeWhite = ownMat(0xf6f7fb);
    var iris = ownMat(spec.eye === undefined ? 0x1d2733 : spec.eye);
    var dark = ownMat(0x14141c);
    out.irisMats.push(iris);

    /* Big anime eyes, built in layers: a dark socket that peeks out as the
       ink line round the lid, the white, a tall iris and a highlight. That
       stack is what separates an anime eye from two dots on a ball. */
    var ex = hr * 0.38, ey = hr * 0.05, ez = hr * 0.78;
    var socket = [
      ellip(head, dark, hr * 0.34, hr * 0.31, hr * 0.15, -ex, ey, ez - hr * 0.02),
      ellip(head, dark, hr * 0.34, hr * 0.31, hr * 0.15, ex, ey, ez - hr * 0.02)
    ];
    socket[0].rotation.z = 0.16; socket[1].rotation.z = -0.16;
    var sw = ellip(head, eyeWhite, hr * 0.29, hr * 0.26, hr * 0.23, -ex, ey, ez + hr * 0.07);
    var se = ellip(head, eyeWhite, hr * 0.29, hr * 0.26, hr * 0.23, ex, ey, ez + hr * 0.07);
    sw.rotation.z = 0.16; se.rotation.z = -0.16;
    sw.userData.noOutline = true; se.userData.noOutline = true;
    socket[0].userData.noOutline = true; socket[1].userData.noOutline = true;
    out.eyeWhites = [sw, se];
    out.pupils = [
      ellip(head, iris, hr * 0.14, hr * 0.22, hr * 0.15, -ex, ey, ez + hr * 0.21),
      ellip(head, iris, hr * 0.14, hr * 0.22, hr * 0.15, ex, ey, ez + hr * 0.21)
    ];
    /* pupil core and catchlight */
    ellip(head, dark, hr * 0.08, hr * 0.14, hr * 0.10, -ex, ey - hr * 0.01, ez + hr * 0.26)
      .userData.noOutline = true;
    ellip(head, dark, hr * 0.08, hr * 0.14, hr * 0.10, ex, ey - hr * 0.01, ez + hr * 0.26)
      .userData.noOutline = true;
    var shine = ownMat(0xffffff);
    ellip(head, shine, hr * 0.055, hr * 0.065, hr * 0.05,
      -ex + hr * 0.08, ey + hr * 0.11, ez + hr * 0.28).userData.noOutline = true;
    ellip(head, shine, hr * 0.055, hr * 0.065, hr * 0.05,
      ex + hr * 0.08, ey + hr * 0.11, ez + hr * 0.28).userData.noOutline = true;

    /* angry anime brows — the single strongest read on a low-poly face */
    var bl = plate(head, dark, hr * 0.46, hr * 0.11, hr * 0.13, -ex, hr * 0.44, ez + hr * 0.08);
    var br = plate(head, dark, hr * 0.46, hr * 0.11, hr * 0.13, ex, hr * 0.44, ez + hr * 0.08);
    bl.rotation.z = -0.40; br.rotation.z = 0.40;
    bl.userData.noOutline = true; br.userData.noOutline = true;
    out.pupils[0].userData.noOutline = true;
    out.pupils[1].userData.noOutline = true;
    out.brows = [bl, br];
    if (spec.head && spec.head.noBrow) { bl.visible = br.visible = false; }

    /* mouth — a thin dark slab that opens for shouts */
    var mouth = plate(head, dark, hr * 0.30, hr * 0.055, hr * 0.10, 0, -hr * 0.46, hr * 0.80);
    mouth.userData.noOutline = true;
    out.mouth = mouth;

    /* nose hint */
    ellip(head, skinM, hr * 0.07, hr * 0.06, hr * 0.09, 0, -hr * 0.20, hr * 0.90);
  }

  /* ============================ HEAD EXTRAS ============================= */
  function buildHeadExtras(head, spec, hr, out) {
    var hx = spec.head || {};
    var skinM = out.skinMat;
    var dark = ownMat(0x171720);
    var i, a;

    if (hx.elfEars) {
      for (i = 0; i < 2; i++) {
        var e = m_(cone(5), skinM, head);
        e.scale.set(hr * 0.12, hr * 0.44, hr * 0.10);
        e.position.set((i ? 1 : -1) * hr * 0.92, hr * 0.06, -hr * 0.06);
        e.rotation.z = (i ? -1 : 1) * 1.15;
        e.rotation.x = -0.25;
      }
    } else if (hx.catEars) {
      for (i = 0; i < 2; i++) {
        var ce = m_(cone(5), skinM, head);
        ce.scale.set(hr * 0.26, hr * 0.55, hr * 0.12);
        ce.position.set((i ? 1 : -1) * hr * 0.60, hr * 0.86, -hr * 0.05);
        ce.rotation.z = (i ? -1 : 1) * 0.34;
      }
    } else if (hx.rabbitEars) {
      for (i = 0; i < 2; i++) {
        var re = m_(cone(5), skinM, head);
        re.scale.set(hr * 0.15, hr * 1.5, hr * 0.13);
        re.position.set((i ? 1 : -1) * hr * 0.38, hr * 1.35, -hr * 0.1);
        re.rotation.z = (i ? -1 : 1) * 0.18;
      }
    } else {
      /* plain human ears */
      for (i = 0; i < 2; i++) {
        ellip(head, skinM, hr * 0.08, hr * 0.20, hr * 0.14, (i ? 1 : -1) * hr * 0.93, 0, 0);
      }
    }

    if (hx.snout) {
      ellip(head, skinM, hr * 0.30, hr * 0.24, hr * 0.42, 0, -hr * 0.26, hr * 0.72);
    }

    if (hx.antenna) {
      for (i = 0; i < 2; i++) {
        var an = tube(head, skinM, hr * 0.045, hr * 0.06, hr * 0.62, 6);
        an.position.set((i ? 1 : -1) * hr * 0.22, hr * 0.72, hr * 0.5);
        an.rotation.x = -0.85;
        an.rotation.z = (i ? -1 : 1) * 0.16;
        out.antennae.push(an);
      }
    }

    if (hx.horns) {
      var hornM = ownMat(hx.hornColor || 0xe8e2d2);
      var mk = function (x, y, z, sx, sy, sz, rz, rx) {
        var hn = m_(cone(6), hornM, head);
        hn.scale.set(sx, sy, sz); hn.position.set(x, y, z);
        hn.rotation.z = rz || 0; hn.rotation.x = rx || 0;
        return hn;
      };
      if (hx.horns === 'frieza') {
        mk(-hr * 0.85, hr * 0.20, 0, hr * 0.16, hr * 0.75, hr * 0.16, 1.45, 0);
        mk(hr * 0.85, hr * 0.20, 0, hr * 0.16, hr * 0.75, hr * 0.16, -1.45, 0);
      } else if (hx.horns === 'long') {
        mk(-hr * 0.7, hr * 0.5, -hr * 0.1, hr * 0.15, hr * 1.5, hr * 0.15, 0.7, -0.5);
        mk(hr * 0.7, hr * 0.5, -hr * 0.1, hr * 0.15, hr * 1.5, hr * 0.15, -0.7, -0.5);
      } else if (hx.horns === 'crown') {
        for (i = 0; i < 5; i++) {
          a = (i / 4 - 0.5) * 2.2;
          mk(Math.sin(a) * hr * 0.8, hr * 0.62, Math.cos(a) * hr * 0.35 - hr * 0.1,
            hr * 0.11, hr * 0.55, hr * 0.11, -a * 0.5, -0.2);
        }
      } else if (hx.horns === 'demon') {
        mk(-hr * 0.55, hr * 0.72, hr * 0.15, hr * 0.14, hr * 0.9, hr * 0.14, 0.42, -0.3);
        mk(hr * 0.55, hr * 0.72, hr * 0.15, hr * 0.14, hr * 0.9, hr * 0.14, -0.42, -0.3);
      } else if (hx.horns === 'goat') {
        mk(-hr * 0.62, hr * 0.70, 0, hr * 0.13, hr * 1.25, hr * 0.13, 1.05, -0.35);
        mk(hr * 0.62, hr * 0.70, 0, hr * 0.13, hr * 1.25, hr * 0.13, -1.05, -0.35);
      } else if (hx.horns === 'ginyu') {
        mk(-hr * 0.6, hr * 0.75, 0, hr * 0.13, hr * 0.7, hr * 0.13, 0.5, 0);
        mk(hr * 0.6, hr * 0.75, 0, hr * 0.13, hr * 0.7, hr * 0.13, -0.5, 0);
      } else if (hx.horns === 'cooler') {
        mk(-hr * 0.55, hr * 0.85, -hr * 0.2, hr * 0.14, hr * 1.1, hr * 0.14, 0.3, 0.5);
        mk(hr * 0.55, hr * 0.85, -hr * 0.2, hr * 0.14, hr * 1.1, hr * 0.14, -0.3, 0.5);
      } else if (hx.horns === 'dragon') {
        mk(-hr * 0.6, hr * 0.6, -hr * 0.3, hr * 0.14, hr * 1.3, hr * 0.14, 0.55, 0.8);
        mk(hr * 0.6, hr * 0.6, -hr * 0.3, hr * 0.14, hr * 1.3, hr * 0.14, -0.55, 0.8);
      }
    }

    if (hx.crest) {
      /* Cell's black wing crest */
      var crestM = ownMat(0x1a1a24);
      for (i = 0; i < 2; i++) {
        var cw = m_(cone(4), crestM, head);
        cw.scale.set(hr * 0.16, hr * 1.15, hr * 0.42);
        cw.position.set((i ? 1 : -1) * hr * 0.42, hr * 0.78, -hr * 0.18);
        cw.rotation.z = (i ? -1 : 1) * 0.48;
        cw.rotation.x = -0.30;
      }
      ellip(head, crestM, hr * 0.5, hr * 0.16, hr * 0.5, 0, hr * 0.86, -hr * 0.1);
    }

    if (hx.tentacle) {
      /* Buu's head tentacle: a chain of shrinking balls we wobble each frame */
      var tm = out.skinMat;
      var seg = new THREE.Object3D();
      head.add(seg);
      seg.position.set(0, hr * 0.9, -hr * 0.1);
      var chain = [], parent = seg;
      var n = hx.tentacle === 2 ? 9 : 7;
      for (i = 0; i < n; i++) {
        var node = new THREE.Object3D();
        node.position.y = hr * 0.38;
        parent.add(node);
        ball(node, tm, hr * (0.30 - i * 0.026), 0, 0, 0);
        chain.push(node);
        parent = node;
      }
      seg.rotation.x = -0.5;
      out.tentacle = chain;
    }

    if (hx.holes) {
      var holeM = ownMat(0x8a3a5a);
      for (i = 0; i < 4; i++) {
        a = (i / 4) * M.PI2 + 0.4;
        ellip(head, holeM, hr * 0.09, hr * 0.09, hr * 0.05,
          Math.cos(a) * hr * 0.55, hr * 0.35, Math.sin(a) * hr * 0.55 - hr * 0.2);
      }
    }

    if (hx.thirdEye) {
      var w3 = ellip(head, ownMat(0xf6f7fb), hr * 0.20, hr * 0.15, hr * 0.12, 0, hr * 0.46, hr * 0.78);
      ellip(head, ownMat(spec.eye || 0x1d2733), hr * 0.10, hr * 0.11, hr * 0.08, 0, hr * 0.46, hr * 0.86);
      out.thirdEye = w3;
    }

    if (hx.fourEyes) {
      for (i = 0; i < 2; i++) {
        ellip(head, ownMat(0xf6f7fb), hr * 0.16, hr * 0.13, hr * 0.10, (i ? 1 : -1) * hr * 0.62, hr * 0.36, hr * 0.62);
        ellip(head, ownMat(spec.eye || 0x1d2733), hr * 0.08, hr * 0.09, hr * 0.07, (i ? 1 : -1) * hr * 0.62, hr * 0.36, hr * 0.70);
      }
    }

    if (hx.dots) {
      var dotM = ownMat(0x6a3a2a);
      for (i = 0; i < hx.dots; i++) {
        var row = i < 3 ? 0 : 1;
        var col = i % 3;
        ball(head, dotM, hr * 0.055, (col - 1) * hr * 0.26, hr * 0.52 - row * hr * 0.20, hr * 0.80);
      }
    }

    if (hx.moustache) {
      plate(head, ownMat(0x2a1a12), hr * 0.52, hr * 0.13, hr * 0.14, 0, -hr * 0.30, hr * 0.86);
    }
    if (hx.beard) {
      ellip(head, ownMat(0xeef0f4), hr * 0.52, hr * 0.55, hr * 0.42, 0, -hr * 0.72, hr * 0.32);
    }
    if (hx.shades) {
      var sh = plate(head, glowMat(0x1a1a24, 1), hr * 1.5, hr * 0.30, hr * 0.10, 0, hr * 0.12, hr * 0.86);
      sh.material = ownMat(0x22222c);
    }
    if (hx.visor) {
      plate(head, glowMat(0x2fd85a, 1.6), hr * 1.4, hr * 0.22, hr * 0.08, 0, hr * 0.12, hr * 0.90);
    }
    if (hx.scouter) {
      var sc = m_(torus(0.06, 12), ownMat(0x2b2b3a), head);
      sc.scale.setScalar(hr * 0.42);
      sc.position.set(hr * 0.72, hr * 0.06, hr * 0.12);
      sc.rotation.y = 0.5;
      var lens = plate(head, glowMat(hx.scouter, 2.4), hr * 0.05, hr * 0.34, hr * 0.5, hr * 0.78, hr * 0.06, hr * 0.34);
      lens.rotation.y = 0.35;
      out.glowParts.push(lens);
    }
    if (hx.potara) {
      for (i = 0; i < 2; i++) {
        var pm = glowMat(hx.potara, 1.6);
        ball(head, pm, hr * 0.13, (i ? 1 : -1) * hr * 0.92, -hr * 0.30, 0);
        out.glowParts.push(ball(head, pm, hr * 0.07, (i ? 1 : -1) * hr * 0.92, -hr * 0.14, 0));
      }
    }
    if (hx.earring) {
      for (i = 0; i < 2; i++) ball(head, glowMat(hx.earring, 1.4), hr * 0.09, (i ? 1 : -1) * hr * 0.94, -hr * 0.26, 0);
    }
    if (hx.halo) {
      var hl = m_(torus(0.09, 20), glowMat(0xffe14d, 2.6), head);
      hl.scale.setScalar(hr * 0.62);
      hl.rotation.x = Math.PI / 2;
      hl.position.y = hr * 1.5;
      out.halo = hl;
    }
    if (hx.band) {
      var bd = m_(torus(0.09, 14), ownMat(hx.band), head);
      bd.scale.setScalar(hr * 1.02);
      bd.rotation.x = Math.PI / 2;
      bd.position.y = hr * 0.44;
    }
    if (hx.turban) { /* handled by the outfit */ }
    if (hx.cap) {
      var cp = m_(cone(10), ownMat(0xf2d24b), head);
      cp.scale.set(hr * 1.0, hr * 0.7, hr * 1.0);
      cp.position.y = hr * 0.9;
    }
    if (hx.mask === 'cooler') {
      var mk2 = plate(head, ownMat(0x8a5ad8), hr * 1.5, hr * 0.9, hr * 0.5, 0, hr * 0.15, hr * 0.55);
      mk2.scale.z = hr * 0.6;
      plate(head, glowMat(0xd8483f, 1.5), hr * 1.1, hr * 0.14, hr * 0.1, 0, hr * 0.16, hr * 0.9);
    }
    if (hx.scar) {
      plate(head, ownMat(0xc06a5a), hr * 0.07, hr * 0.42, hr * 0.06, -hr * 0.44, hr * 0.22, hr * 0.80).rotation.z = 0.2;
    }
    if (hx.eyepatch) {
      plate(head, ownMat(0x2b2b3a), hr * 0.42, hr * 0.34, hr * 0.12, -hr * 0.38, hr * 0.10, hr * 0.82);
    }
    if (hx.rosy) {
      for (i = 0; i < 2; i++) ellip(head, ownMat(0xf28aa8), hr * 0.16, hr * 0.10, hr * 0.06, (i ? 1 : -1) * hr * 0.52, -hr * 0.18, hr * 0.80);
    }
    if (hx.tuffleMark) {
      plate(head, glowMat(0xd8483f, 1.4), hr * 0.30, hr * 0.10, hr * 0.06, 0, hr * 0.52, hr * 0.84);
    }
    if (hx.demonMark) {
      plate(head, glowMat(0xd8483f, 1.6), hr * 0.9, hr * 0.09, hr * 0.06, 0, hr * 0.40, hr * 0.84);
    }
    if (hx.brain) {
      ellip(head, ownMat(0xd8b0a0), hr * 0.85, hr * 0.4, hr * 0.8, 0, hr * 0.72, -hr * 0.05);
    }
    if (hx.bigEyes) {
      out.eyeWhites.forEach(function (e) { e.scale.multiplyScalar(1.5); });
      out.pupils.forEach(function (p) { p.scale.multiplyScalar(1.35); });
    }
    if (hx.fangs) {
      for (i = 0; i < 2; i++) {
        var fg = m_(cone(4), ownMat(0xf6f7fb), head);
        fg.scale.set(hr * 0.05, hr * 0.16, hr * 0.05);
        fg.position.set((i ? 1 : -1) * hr * 0.15, -hr * 0.50, hr * 0.84);
        fg.rotation.x = Math.PI;
      }
    }
    if (hx.spikes) {
      for (i = 0; i < 6; i++) {
        a = (i / 6) * M.PI2;
        var dsp = m_(cone(4), out.skinMat, head);
        dsp.scale.set(hr * 0.13, hr * 0.28, hr * 0.13);
        dsp.position.set(Math.cos(a) * hr * 0.7, hr * 0.55, Math.sin(a) * hr * 0.7);
        dsp.rotation.z = -Math.cos(a) * 0.5;
        dsp.rotation.x = Math.sin(a) * 0.5;
      }
    }
    if (hx.halfFace) {
      /* Fused Zamasu's mismatched skin */
      var hf = ellip(head, ownMat(spec.skin2 || 0xa87ad6), hr * 0.52, hr * 1.0, hr * 1.0, -hr * 0.52, 0, 0);
      hf.scale.x = hr * 0.55;
    }
    if (hx.clown) {
      for (i = 0; i < 2; i++) ellip(head, ownMat(0xd8483f), hr * 0.20, hr * 0.13, hr * 0.07, (i ? 1 : -1) * hr * 0.55, -hr * 0.16, hr * 0.78);
    }
    if (hx.dragon) {
      ellip(head, out.skinMat, hr * 0.45, hr * 0.32, hr * 0.75, 0, -hr * 0.25, hr * 0.72);
    }
  }

  /* =============================== OUTFIT =============================== */
  function buildOutfit(rig, spec, P, out) {
    var f = spec.fit || {};
    var kind = f.kind || 'gi';
    var c1 = ownMat(f.c1), c2 = ownMat(f.c2), c3 = ownMat(f.c3);
    out.fitMats.push(c1, c2, c3);
    var W = P.shoulderW, H = P.H;

    var torsoTop = P.chestY - P.hipY;

    /* --- torso shell ----------------------------------------------------
       `mul` is relative to the bare torso, which already carries real-world
       radii; the 0.74 keeps the same front-to-back squash as the body.    */
    function shell(material, mul, yoff) {
      var s = m_(out.torsoGeo, material, rig.torso);
      s.scale.set(mul, mul, mul * 0.74);
      s.position.y = yoff || 0;
      return s;
    }

    function sleeves(material, len) {
      [rig.armL, rig.armR].forEach(function (a) {
        var sl = tube(a, material, P.armR * 1.42, P.armR * 1.56, P.upperArm * len, 8);
        sl.position.y = -P.upperArm * len * 0.5;
        out.clothParts.push(sl);
      });
    }

    /* Trousers cover the thigh AND the top of the shin, so the boot has
       something to tuck into instead of leaving a band of bare knee. */
    function pants(material, len) {
      [rig.legL, rig.legR].forEach(function (l) {
        var pl = tube(l, material, P.legR * 1.30, P.legR * 1.48, P.thigh * len, 8);
        pl.position.y = -P.thigh * len * 0.5;
      });
      [rig.shinL, rig.shinR].forEach(function (sn) {
        var cuff = tube(sn, material, P.legR * 1.44, P.legR * 1.30, P.shin * 0.62, 8);
        cuff.position.y = -P.shin * 0.28;
      });
    }

    function boots(material, high, bandMat) {
      var hi = high || 0.8;
      [rig.shinL, rig.shinR].forEach(function (s) {
        var bt = tube(s, material, P.legR * 1.36, P.legR * 1.28, P.shin * hi, 8);
        bt.position.y = -P.shin + P.shin * hi * 0.5;
        if (bandMat) {
          /* the cuff sits at the TOP of the boot, at mid-calf */
          var band = tube(s, bandMat, P.legR * 1.42, P.legR * 1.42, P.shin * 0.12, 8);
          band.position.y = -P.shin + P.shin * hi - P.shin * 0.02;
        }
      });
      [rig.footL, rig.footR].forEach(function (ft) {
        ft.children.forEach(function (ch) { ch.material = material; });
      });
    }

    /* A sash rides the narrowest point of the waist, not the hip bone. Made
       wide on purpose: it is the break between gi top and gi trousers, and
       without it the whole fighter reads as one orange tube. */
    function belt(material, r) {
      var rr = W * (r || 0.60);
      var b = m_(torus(0.46, 18), material, rig.torso);
      b.scale.set(rr, rr, rr * 0.76);
      b.rotation.x = Math.PI / 2;
      b.position.y = torsoTop * 0.22;
      /* the knot, tied off to one side */
      var knot = ellip(rig.torso, material, rr * 0.34, rr * 0.30, rr * 0.26,
        rr * 0.42, torsoTop * 0.20, rr * 0.62);
      knot.rotation.z = 0.4;
      return b;
    }

    /* the coloured undershirt showing at the collar and down the front */
    function collar(material) {
      var c = ellip(rig.chest, material, W * 0.40, W * 0.16, W * 0.34,
        0, torsoTop * 0.58, W * 0.16);
      var v = m_(cone(6), material, rig.chest);
      v.scale.set(W * 0.30, W * 0.42, W * 0.22);
      v.position.set(0, torsoTop * 0.40, W * 0.34);
      v.rotation.x = Math.PI;
      return c;
    }

    /* Pads sit on the chest node at the real shoulder height. They used to be
       pinned to the torso at 0.44 of its length — the middle of the ribcage. */
    function shoulderPads(material, big) {
      [-1, 1].forEach(function (side) {
        var pad = m_(sph(10), material, rig.chest);
        var k = big ? 1.0 : 0.78;
        pad.scale.set(W * 0.46 * k, W * 0.36 * k, W * 0.42 * k);
        pad.position.set(side * P.shoulderX * 0.96, torsoTop * 0.56, 0);
        pad.rotation.z = -side * 0.22;
      });
    }

    function wrist(material) {
      [rig.foreL, rig.foreR].forEach(function (a) {
        var wb = m_(torus(0.26, 10), material, a);
        wb.scale.set(P.armR * 0.98, P.armR * 0.98, P.armR * 0.98);
        wb.rotation.x = Math.PI / 2;
        wb.position.y = -P.foreArm * 0.84;
      });
    }

    /* A cape is a half-cylinder wrapped round the back, not a flat sheet —
       it catches the light like cloth and never reads as a signboard. */
    function cape(material) {
      var g = new THREE.CylinderGeometry(1, 1.35, 1, 14, 9, true,
        Math.PI * 0.42, Math.PI * 1.16);
      var cp = new THREE.Mesh(g, makeToon(material, { side: THREE.DoubleSide }));
      cp.userData.noOutline = true;
      cp.scale.set(W * 1.12, H * 0.50, W * 0.95);
      cp.position.set(0, torsoTop * 0.52 - H * 0.25, 0);
      rig.torso.add(cp);
      out.cape = cp;
      out.capeBase = cp.geometry.attributes.position.array.slice();
      return cp;
    }

    /* every fighter gets skin-coloured limbs by default; outfits paint over */
    switch (kind) {
      case 'gi':
        if (!f.sleeveless) sleeves(c1, 0.98); else sleeves(c1, 0.28);
        shell(c1, 1.09);
        if (f.shirt) shell(ownMat(f.shirt), 0.99, -torsoTop * 0.08);
        collar(ownMat(f.c2));
        belt(ownMat(f.belt || f.c2), 0.60);
        pants(c1, 1.0);
        boots(ownMat(f.boots || f.c2), 0.52, ownMat(f.c3));
        wrist(ownMat(f.c3));
        if (f.kanji) {
          var k1 = plate(rig.chest, ownMat(f.c2), W * 0.38, W * 0.38, W * 0.06, W * 0.34, torsoTop * 0.16, W * 0.52);
          k1.rotation.y = -0.2;
        }
        if (f.pride) {
          plate(rig.chest, c2, W * 1.3, W * 0.14, W * 0.1, 0, torsoTop * 0.14, W * 0.55);
        }
        break;

      case 'armor':
        /* skin-tight suit under a hard chest plate */
        var suit = ownMat(f.suit || 0x2b3a6b);
        sleeves(suit, 1.0);
        pants(suit, 1.0);
        shell(suit, 1.07);
        var plateM = c1;
        var chest = shell(plateM, 1.16, torsoTop * 0.12);
        chest.scale.y *= 0.72;
        var abs = shell(ownMat(f.c3), 1.08, -torsoTop * 0.16);
        abs.scale.y *= 0.55;
        if (f.shoulders) shoulderPads(plateM, true);
        if (f.skirt) {
          var sk = m_(cone(12), plateM, rig.torso);
          sk.scale.set(W * 0.95, torsoTop * 0.42, W * 0.75);
          sk.position.y = -torsoTop * 0.52;
          sk.rotation.x = Math.PI;
        }
        boots(plateM, 0.85);
        wrist(plateM);
        plate(rig.chest, c2, W * 0.8, W * 0.13, W * 0.08, 0, torsoTop * 0.14, W * 0.56);
        break;

      case 'namek':
        sleeves(c1, 1.0);
        shell(c1, 1.10);
        belt(ownMat(f.sash || f.c2), 0.64);
        pants(c1, 1.0);
        boots(ownMat(f.c3), 0.85);
        wrist(ownMat(f.c3));
        shoulderPads(ownMat(f.c3), true);
        if (f.cape) cape(f.capeC || 0xf2f2f2);
        if (f.turban) {
          var tb = m_(cyl(1, 1, 12), ownMat(f.c3), rig.head);
          tb.scale.set(P.headR * 1.08, P.headR * 0.9, P.headR * 1.08);
          tb.position.y = P.headR * 0.72;
          var dome = ball(rig.head, ownMat(f.c3), P.headR * 1.06, 0, P.headR * 1.1, 0);
          dome.scale.y *= 0.6;
        }
        break;

      case 'bio':
        /* organic plating: glossy patches over bare skin */
        var pm = c2;
        shell(out.skinMat, 1.02);
        var bib = shell(pm, 1.09, torsoTop * 0.16);
        bib.scale.y *= 0.52;
        ellip(rig.torso, pm, W * 0.30, W * 0.28, W * 0.14, 0, torsoTop * 0.30, W * 0.48);
        if (f.plates || f.armored) {
          shoulderPads(pm, false);
          [rig.shinL, rig.shinR].forEach(function (s) {
            var g2 = tube(s, pm, P.legR * 1.2, P.legR * 1.3, P.shin * 0.5, 8);
            g2.position.y = -P.shin * 0.7;
          });
          [rig.foreL, rig.foreR].forEach(function (a) {
            var g3 = tube(a, pm, P.armR * 1.25, P.armR * 1.35, P.foreArm * 0.55, 8);
            g3.position.y = -P.foreArm * 0.6;
          });
        }
        if (f.insect) {
          /* Cell / 21's carapace spots */
          var spotM = ownMat(f.c3);
          for (var si = 0; si < 6; si++) {
            var sa = (si / 6) * M.PI2;
            ellip(rig.torso, spotM, W * 0.16, W * 0.16, W * 0.05,
              Math.cos(sa) * W * 0.42, torsoTop * 0.42 + Math.sin(sa) * torsoTop * 0.18, W * 0.46);
          }
        }
        if (f.wings) {
          for (var wi = 0; wi < 2; wi++) {
            var wg = m_(cone(4), ownMat(0x1a1a24), rig.torso);
            wg.scale.set(W * 0.14, W * 1.5, W * 0.5);
            wg.position.set((wi ? 1 : -1) * W * 0.45, torsoTop * 0.30, -W * 0.48);
            wg.rotation.x = 0.5;
            wg.rotation.z = (wi ? -1 : 1) * 0.5;
          }
        }
        if (f.scales) {
          for (var sc2 = 0; sc2 < 5; sc2++) {
            var sp2 = m_(cone(4), ownMat(f.c2), rig.torso);
            sp2.scale.set(W * 0.12, W * 0.35, W * 0.12);
            sp2.position.set(0, torsoTop * (0.60 - sc2 * 0.18), -W * 0.50);
            sp2.rotation.x = -0.8;
          }
        }
        if (f.cape) cape(f.capeC || 0x2b3a6b);
        break;

      case 'jacket':
        pants(ownMat(f.jeans || 0x3a5a8a), 1.0);
        shell(ownMat(f.c2), 1.07);
        var jk = shell(c1, 1.12, torsoTop * 0.06);
        jk.scale.y *= 0.86;
        if (!f.tee) sleeves(c1, 1.0); else sleeves(c1, 0.55);
        boots(ownMat(f.c3), 0.6);
        if (f.armored) shoulderPads(c1, false);
        if (f.coat) {
          var ct = m_(cone(12), c1, rig.torso);
          ct.scale.set(W * 1.05, torsoTop * 1.05, W * 0.85);
          ct.position.y = -torsoTop * 0.62;
          ct.rotation.x = Math.PI;
        }
        if (f.scarf) {
          var sf = m_(torus(0.34, 12), ownMat(f.c3), rig.torso);
          sf.scale.set(W * 0.40, W * 0.40, W * 0.32);
          sf.rotation.x = Math.PI / 2;
          sf.position.y = torsoTop * 0.96;
        }
        if (f.gloves) wrist(c3);
        if (f.badge) plate(rig.torso, c3, W * 0.24, W * 0.24, W * 0.06, W * 0.42, torsoTop * 0.34, W * 0.72);
        if (f.sword) buildSword(rig, out, P);
        if (f.cape) cape(f.capeC || 0x2f6f4a);
        break;

      case 'robe':
        shell(c1, 1.10);
        sleeves(c1, 1.1);
        var skirt = m_(cone(14), c1, rig.torso);
        skirt.scale.set(W * 1.1, torsoTop * 1.5, W * 0.95);
        skirt.position.y = -torsoTop * 0.85;
        skirt.rotation.x = Math.PI;
        belt(ownMat(f.sash || f.c2), 0.66);
        if (f.vest) {
          var vs = shell(ownMat(f.c2), 1.07, torsoTop * 0.16);
          vs.scale.y *= 0.55;
        }
        boots(ownMat(f.c3), 0.5);
        if (f.egypt) {
          shoulderPads(ownMat(f.c2), false);
          plate(rig.chest, ownMat(f.c3), W * 0.9, W * 0.18, W * 0.1, 0, torsoTop * 0.38, W * 0.5);
        }
        if (f.staff) buildStaff(rig, out, P);
        break;

      case 'bare':
        /* skin torso; just legwear */
        pants(ownMat(f.pants || 0x2b2b3a), 1.05);
        boots(ownMat(f.pants || 0x2b2b3a), 0.55);
        belt(c1, 0.60);
        if (f.wristA) wrist(c1);
        if (f.crop) {
          var cr = shell(c1, 1.05, torsoTop * 0.26);
          cr.scale.y *= 0.4;
        }
        if (f.vest) {
          var vt = shell(c3, 1.05, torsoTop * 0.2);
          vt.scale.y *= 0.5;
        }
        if (f.pelt) {
          var pt = m_(cone(10), ownMat(0xd8c8a8), rig.torso);
          pt.scale.set(W * 0.85, torsoTop * 0.8, W * 0.7);
          pt.position.y = -torsoTop * 0.55;
          pt.rotation.x = Math.PI;
        }
        if (f.cape) cape(f.capeC || 0x8a5ad8);
        break;

      case 'demon':
        shell(c1, 1.09);
        sleeves(c1, 0.9);
        pants(c1, 1.0);
        var bp = shell(c2, 1.09, torsoTop * 0.14);
        bp.scale.y *= 0.6;
        shoulderPads(c2, true);
        for (var di = 0; di < 2; di++) {
          var spk = m_(cone(5), c2, rig.torso);
          spk.scale.set(W * 0.16, W * 0.55, W * 0.16);
          spk.position.set((di ? 1 : -1) * P.shoulderX * 1.02, torsoTop * 0.80, 0);
          spk.rotation.z = (di ? -1 : 1) * 0.3;
        }
        boots(c2, 0.8);
        wrist(c2);
        if (f.cape) cape(f.capeC || 0x2b2b3a);
        break;

      case 'fusion':
        /* the Metamoran vest: open jacket, no sleeves, wide sash */
        shell(out.skinMat, 1.02);
        var vest = shell(c1, 1.07, torsoTop * 0.20);
        vest.scale.y *= 0.66;
        shoulderPads(c1, false);
        belt(ownMat(f.sash || f.c2), 0.64);
        pants(ownMat(f.c3), 1.05);
        boots(ownMat(f.c3), 0.55);
        wrist(ownMat(f.c3));
        if (f.crop) {
          var cf = shell(c1, 1.05, torsoTop * 0.26);
          cf.scale.y *= 0.4;
        }
        break;

      case 'tourney':
      default:
        shell(c1, 1.09);
        sleeves(c1, 0.6);
        pants(c1, 1.0);
        belt(ownMat(f.belt || f.c2), 0.66);
        boots(ownMat(f.c3), 0.6);
        if (f.champ) {
          var cb = plate(rig.torso, ownMat(0xf2d24b), W * 1.2, W * 0.26, W * 0.14, 0, -torsoTop * 0.26, W * 0.42);
          out.glowParts.push(cb);
        }
        break;
    }

    if (f.fur) {
      /* SSJ4 body fur */
      var furM = ownMat(f.fur);
      shell(furM, 1.01, -torsoTop * 0.05).scale.y *= 0.8;
      sleeves(furM, 1.0);
      pants(furM, 1.0);
    }
  }

  function buildSword(rig, out, P) {
    var grp = new THREE.Object3D();
    rig.torso.add(grp);
    grp.position.set(-P.shoulderW * 0.75, P.torsoLen * 0.2, -P.shoulderW * 0.5);
    grp.rotation.z = 0.5; grp.rotation.x = -0.35;
    var blade = plate(grp, mat(0xd8e6ff), P.H * 0.035, P.H * 0.52, P.H * 0.012, 0, P.H * 0.26, 0);
    plate(grp, mat(0x3a4a5a), P.H * 0.045, P.H * 0.10, P.H * 0.03, 0, -P.H * 0.03, 0);
    plate(grp, mat(0x2b6fd8), P.H * 0.12, P.H * 0.02, P.H * 0.03, 0, P.H * 0.02, 0);
    out.sword = grp;
    out.swordBlade = blade;
  }

  function buildStaff(rig, out, P) {
    var grp = new THREE.Object3D();
    rig.foreR.add(grp);
    grp.position.set(0, -P.foreArm * 0.9, 0);
    var shaft = tube(grp, mat(0x2b3a6b), P.H * 0.012, P.H * 0.012, P.H * 1.1, 6);
    shaft.position.y = 0;
    var orb = ball(grp, glowMat(0x9fe8ff, 2.2), P.H * 0.05, 0, P.H * 0.55, 0);
    out.glowParts.push(orb);
    out.staff = grp;
  }

  /* =============================== TAIL ================================= */
  function buildTail(rig, spec, P, out, colorOverride) {
    var m = colorOverride ? ownMat(colorOverride) : out.skinMat;
    var root = new THREE.Object3D();
    rig.hips.add(root);
    root.position.set(0, -P.H * 0.02, -P.shoulderW * 0.5);
    var chain = [], parent = root, n = 8;
    for (var i = 0; i < n; i++) {
      var node = new THREE.Object3D();
      node.position.y = -P.H * 0.075;
      parent.add(node);
      var seg = ball(node, m, P.H * (0.030 - i * 0.0022), 0, 0, 0);
      seg.scale.y *= 1.5;
      chain.push(node);
      parent = node;
    }
    root.rotation.x = -0.4;
    out.tail = chain;
    out.tailRoot = root;
  }

  /* ============================== THE RIG =============================== */
  /* Returns { group, rig, parts } — `rig` holds the posable joints.        */
  B.character = function (spec, opts) {
    opts = opts || {};
    var out = {
      skinMats: [], hairMats: [], fitMats: [], irisMats: [], glowParts: [],
      clothParts: [], maneStrands: [], antennae: [], eyeWhites: [], pupils: [],
      brows: [], tail: null, cape: null, tentacle: null
    };

    var h = spec.h || 1, bulk = spec.bulk || 1;
    var H = 1.78 * h;
    /* kids and small fighters get proportionally bigger heads */
    var headRatio = M.lerp(0.122, 0.090, M.sat((h - 0.62) / 0.42));
    var P = {
      H: H,
      headR: H * headRatio,
      hipY: H * 0.480,
      chestY: H * 0.775,
      neckY: H * 0.840,
      headY: H * 0.840 + H * headRatio * 0.98,
      /* Broad shoulders over a narrow waist is the entire silhouette. At
         H*0.152 the shoulders come out ~2.4 head-widths across, which is
         what reads as a Dragon Ball fighter rather than a stick figure. */
      shoulderW: H * 0.152 * bulk * (spec.fem ? 0.88 : 1),
      armR: H * 0.042 * bulk,
      legR: H * 0.052 * bulk,
      upperArm: H * 0.170,
      foreArm: H * 0.155,
      thigh: H * 0.232,
      shin: H * 0.224
    };
    P.torsoLen = P.chestY - P.hipY;
    out.P = P;

    var skinM = ownMat(spec.skin);
    out.skinMat = skinM;
    out.skinMats.push(skinM);

    var group = new THREE.Object3D();
    var rig = {};
    out.rig = rig;

    /* --- hips / torso -------------------------------------------------- */
    var hips = new THREE.Object3D();
    hips.position.y = P.hipY;
    group.add(hips);
    rig.hips = hips;

    var torso = new THREE.Object3D();
    hips.add(torso);
    rig.torso = torso;

    var W = P.shoulderW;
    var TL = P.torsoLen;
    var waist = spec.fem ? 0.44 : 0.48;
    out.torsoGeo = torsoGeo(
      (bulk.toFixed(2) + '_' + TL.toFixed(3) + '_' + W.toFixed(3) + '_' + waist),
      [
        [W * 0.40, -TL * 0.10], [W * 0.54, TL * 0.02], [W * waist, TL * 0.26],
        [W * 0.60, TL * 0.46], [W * 0.86, TL * 0.68], [W * 0.96, TL * 0.86],
        [W * 0.70, TL * 0.97], [W * 0.30, TL * 1.03], [0.001, TL * 1.04]
      ]);
    var body = m_(out.torsoGeo, skinM, torso);
    body.scale.z = 0.72;
    out.bodyMesh = body;

    /* A chest node above the waist. Punches rotate the hips one way and the
       shoulders the other; without a second joint the whole body swings as
       one plank and every strike looks the same. */
    var chest = new THREE.Object3D();
    chest.position.y = TL * 0.30;
    torso.add(chest);
    rig.chest = chest;

    /* muscle: pectorals and a stack of abdominals, sitting proud of the lathe */
    var pecY = TL * 0.44, pecR = W * 0.30;
    for (var pi = 0; pi < 2; pi++) {
      var pec = ellip(chest, skinM, pecR, pecR * 0.62, pecR * 0.70,
        (pi ? 1 : -1) * W * 0.32, pecY, W * 0.28);
      pec.rotation.z = (pi ? -1 : 1) * 0.18;
    }
    for (var ai = 0; ai < 3; ai++) {
      var absR = W * (0.26 - ai * 0.022);
      ellip(chest, skinM, absR, absR * 0.52, absR * 0.44,
        -absR * 0.55, pecY - TL * (0.20 + ai * 0.115), W * 0.20);
      ellip(chest, skinM, absR, absR * 0.52, absR * 0.44,
        absR * 0.55, pecY - TL * (0.20 + ai * 0.115), W * 0.20);
    }
    /* trapezius wedge — fills the neck-to-shoulder line */
    var trap = ellip(chest, skinM, W * 0.86, W * 0.24, W * 0.42, 0, TL * 0.60, -W * 0.06);
    out.trap = trap;

    /* neck */
    var neck = tube(chest, skinM, W * 0.26, W * 0.30, TL * 0.16, 8);
    neck.position.y = TL * 0.70;

    /* --- head ---------------------------------------------------------- */
    var headPivot = new THREE.Object3D();
    headPivot.position.y = TL * 0.78;
    chest.add(headPivot);
    rig.head = headPivot;

    var hr = P.headR;
    var skull = ball(headPivot, skinM, hr, 0, hr * 0.86, 0);
    skull.scale.set(hr, hr * 1.06, hr * 0.98);
    /* jaw taper */
    var jaw = ellip(headPivot, skinM, hr * 0.86, hr * 0.52, hr * 0.86, 0, hr * 0.38, hr * 0.06);
    out.headMeshes = [skull, jaw];

    var headInner = new THREE.Object3D();
    headInner.position.y = hr * 0.86;
    headPivot.add(headInner);
    rig.headInner = headInner;

    buildFace(headInner, spec, hr, out);
    buildHeadExtras(headInner, spec, hr, out);
    buildHair(headInner, spec.hair, hr, out);

    /* --- arms ------------------------------------------------------------
       Mounted OUTSIDE the torso silhouette. The old rig hung them at 0.92W
       while the clothed torso reached 1.03W, so every arm was buried in the
       chest and no pose could be seen. The deltoid ball bridges the gap. */
    P.shoulderX = W * 1.02;
    function arm(side) {
      var sh = new THREE.Object3D();
      sh.position.set(side * P.shoulderX, TL * 0.54, 0);
      chest.add(sh);

      var delt = ellip(sh, skinM, W * 0.33, W * 0.31, W * 0.32, 0, W * 0.04, 0);
      delt.rotation.z = -side * 0.2;

      var upper = tube(sh, skinM, P.armR * 0.92, P.armR * 1.20, P.upperArm, 8);
      upper.position.y = -P.upperArm * 0.5;
      /* bicep — bulges on the front of the upper arm */
      ellip(sh, skinM, P.armR * 1.05, P.armR * 1.45, P.armR * 1.08,
        0, -P.upperArm * 0.40, P.armR * 0.14);

      var el = new THREE.Object3D();
      el.position.y = -P.upperArm;
      sh.add(el);
      ball(el, skinM, P.armR * 1.00);
      var fore = tube(el, skinM, P.armR * 0.74, P.armR * 1.02, P.foreArm, 8);
      fore.position.y = -P.foreArm * 0.5;
      ellip(el, skinM, P.armR * 1.02, P.armR * 1.22, P.armR * 1.02,
        0, -P.foreArm * 0.30, 0);

      var hand = new THREE.Object3D();
      hand.position.y = -P.foreArm;
      el.add(hand);
      /* a fist, not a ball: a rounded block of knuckles plus a thumb, so a
         punch has something recognisable on the end of it */
      var fist = ellip(hand, skinM, P.armR * 1.12, P.armR * 1.15, P.armR * 1.30,
        0, -P.armR * 0.55, 0);
      var knuck = ellip(hand, skinM, P.armR * 1.05, P.armR * 0.42, P.armR * 0.55,
        0, -P.armR * 1.28, P.armR * 0.30);
      var thumb = ellip(hand, skinM, P.armR * 0.34, P.armR * 0.55, P.armR * 0.40,
        -side * P.armR * 0.95, -P.armR * 0.70, P.armR * 0.35);
      thumb.rotation.z = side * 0.5;
      return { sh: sh, el: el, hand: hand, fist: fist };
    }
    var aL = arm(-1), aR = arm(1);
    rig.armL = aL.sh; rig.foreL = aL.el; rig.handL = aL.hand;
    rig.armR = aR.sh; rig.foreR = aR.el; rig.handR = aR.hand;

    /* --- legs ---------------------------------------------------------- */
    function leg(side) {
      var hp = new THREE.Object3D();
      hp.position.set(side * W * 0.34, -TL * 0.04, 0);
      hips.add(hp);
      var thigh = tube(hp, skinM, P.legR * 0.92, P.legR * 1.30, P.thigh, 8);
      thigh.position.y = -P.thigh * 0.5;
      /* quad mass high on the thigh */
      ellip(hp, skinM, P.legR * 1.06, P.legR * 1.45, P.legR * 1.08,
        0, -P.thigh * 0.32, P.legR * 0.10);

      var kn = new THREE.Object3D();
      kn.position.y = -P.thigh;
      hp.add(kn);
      ball(kn, skinM, P.legR * 0.96);
      var shin = tube(kn, skinM, P.legR * 0.72, P.legR * 0.98, P.shin, 8);
      shin.position.y = -P.shin * 0.5;
      /* calf, set back so the leg has a profile */
      ellip(kn, skinM, P.legR * 0.95, P.legR * 1.30, P.legR * 0.95,
        0, -P.shin * 0.30, -P.legR * 0.20);

      var ft = new THREE.Object3D();
      ft.position.y = -P.shin;
      kn.add(ft);
      var foot = plate(ft, skinM, P.legR * 1.9, P.legR * 0.85, P.legR * 3.2,
        0, -P.legR * 0.38, P.legR * 0.85);
      /* toe cap rounds off the boot */
      ellip(ft, skinM, P.legR * 0.95, P.legR * 0.55, P.legR * 0.75,
        0, -P.legR * 0.38, P.legR * 2.3);
      return { hp: hp, kn: kn, ft: ft, foot: foot };
    }
    var lL = leg(-1), lR = leg(1);
    rig.legL = lL.hp; rig.shinL = lL.kn; rig.footL = lL.ft;
    rig.legR = lR.hp; rig.shinR = lR.kn; rig.footR = lR.ft;

    /* --- outfit, tail -------------------------------------------------- */
    buildOutfit(rig, spec, P, out);
    if (spec.tail) buildTail(rig, spec, P, out, spec.fit && spec.fit.fur ? spec.fit.fur : null);

    group.traverse(function (o) {
      if (o.isMesh) { o.castShadow = !!opts.shadows; o.receiveShadow = false; o.matrixAutoUpdate = true; }
    });

    /* --- ink outlines --------------------------------------------------
       One baked outline mesh per joint. Anything transparent, additive or
       double-sided is skipped: an inverted hull round a translucent sheet
       reads as a black smear rather than a line. */
    if (opts.outline !== false) {
      out.outlineMat = B.outlineMaterial(opts.outlineWidth || 0.0080);
      out.outlines = [];
      var joints = [rig.hips, rig.torso, rig.chest, rig.head, rig.headInner,
      rig.armL, rig.foreL, rig.handL, rig.armR, rig.foreR, rig.handR,
      rig.legL, rig.shinL, rig.footL, rig.legR, rig.shinR, rig.footR];
      for (var ji = 0; ji < joints.length; ji++) {
        if (!joints[ji]) continue;
        var om = mergeJointOutline(joints[ji], out.outlineMat);
        if (om) out.outlines.push(om);
      }
    }

    out.group = group;
    out.height = H;
    return out;
  };

  /* Outlines are baked from the mesh layout, so a transformation that swaps
     the hair has to rebuild the head's line art or it keeps the old spikes. */
  B.rebuildOutline = function (built, joint) {
    if (!built.outlineMat || !joint) return;
    for (var i = joint.children.length - 1; i >= 0; i--) {
      var c = joint.children[i];
      if (c.userData && c.userData.isOutline) {
        joint.remove(c);
        if (c.geometry) c.geometry.dispose();
        var k = built.outlines.indexOf(c);
        if (k >= 0) built.outlines.splice(k, 1);
      }
    }
    var om = mergeJointOutline(joint, built.outlineMat);
    if (om) built.outlines.push(om);
  };

  /* --------------------------------------------------------- retinting ---
     Transformations recolour hair, eyes and skin without a rebuild.      */
  B.retint = function (built, o) {
    var i;
    if (o.hairColor !== undefined) {
      for (i = 0; i < built.hairMats.length; i++) built.hairMats[i].color.setHex(o.hairColor);
    }
    if (o.eye !== undefined) {
      for (i = 0; i < built.irisMats.length; i++) built.irisMats[i].color.setHex(o.eye);
    }
    if (o.skin !== undefined) {
      for (i = 0; i < built.skinMats.length; i++) built.skinMats[i].color.setHex(o.skin);
    }
  };

  /* Swap the whole hair group for a transformation's style. */
  B.rehair = function (built, spec, hairSpec) {
    if (built.hairGroup) {
      built.hairGroup.parent.remove(built.hairGroup);
      built.hairGroup.traverse(function (o) { if (o.isMesh && o.material) o.material.dispose(); });
      built.hairGroup = null;
    }
    built.hairMats.length = 0;
    built.maneStrands.length = 0;
    buildHair(built.rig.headInner, hairSpec, built.P.headR, built);
    B.rebuildOutline(built, built.rig.headInner);
  };

})(DBZ);
