/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — 3D roster portraits

   The select screen used to show hand-drawn 2D badges, which stopped matching
   the game the moment the fighters became cel-shaded. These render the actual
   character model to an offscreen target instead, so a tile is a picture of
   the thing you are about to play.

   Building 79 fighters at once would stall the page, so tiles are rendered
   lazily: only what scrolls into view, a couple per frame, cached forever.
   ==========================================================================*/
(function (C) {
  'use strict';

  var P = {};
  C.Portrait = P;

  var W = 232, H = 300;
  var rt = null, scene = null, cam = null, ready = false;
  var cache = {};                 /* id -> dataURL */
  var queue = [], pending = {};
  var pixels = null;

  function init(renderer) {
    if (ready) return true;
    if (!renderer) return false;
    scene = new THREE.Scene();

    cam = new THREE.PerspectiveCamera(26, W / H, 0.1, 60);

    /* Portrait lighting is its own rig: a strong key from screen-left so the
       cel terminator falls across the face, and a hot rim from behind to cut
       the silhouette out of the card background. */
    /* Portraits bypass the bloom composite, so there is no filmic shoulder to
       catch overexposure — the rig has to stay under 1.0 on its own or every
       face renders as a white blob. */
    var hemi = new THREE.HemisphereLight(0xcfe2ff, 0x2a2036, 0.28);
    scene.add(hemi);
    var key = new THREE.DirectionalLight(0xfff4e2, 0.52);
    key.position.set(-3.4, 4.6, 4.2);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x9ec8ff, 0.26);
    rim.position.set(3.2, 2.4, -3.6);
    scene.add(rim);
    var fill = new THREE.DirectionalLight(0xffd9a8, 0.10);
    fill.position.set(2.8, 0.6, 3.2);
    scene.add(fill);

    rt = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      depthBuffer: true, stencilBuffer: false
    });
    pixels = new Uint8Array(W * H * 4);
    ready = true;
    return true;
  }
  P.init = init;

  P.has = function (id) { return !!cache[id]; };
  P.get = function (id) { return cache[id]; };

  /* Ask for a portrait. `cb(dataURL)` fires once it exists — immediately if
     it is already cached. */
  P.request = function (spec, cb) {
    if (cache[spec.id]) { cb(cache[spec.id]); return; }
    var e = pending[spec.id];
    if (e) { e.cbs.push(cb); return; }
    e = pending[spec.id] = { spec: spec, cbs: [cb] };
    queue.push(e);
  };

  P.cancel = function (id) {
    var e = pending[id];
    if (!e) return;
    var i = queue.indexOf(e);
    if (i >= 0) queue.splice(i, 1);
    delete pending[id];
  };

  P.clearQueue = function () { queue.length = 0; pending = {}; };

  function renderOne(renderer, spec) {
    var f = new C.Fighter(spec, { side: 0, shadows: false });
    f.pos.set(0, 0, 0);
    f.yaw = 0.40;
    f.target = null;
    f.baseGlow = 0;
    f.aura.visible = false;
    f.auraCore.visible = false;
    C.Anim.copy(C.Anim.POSE.stance, f.poseTarget);
    f.poseBlend = 999;
    f.animT = 0.8;
    f.applyPose(1);
    f.syncTransform();
    scene.add(f.group);

    /* Frame on the head and shoulders — a full body at this size is a smudge,
       and the face is what tells you who it is. Aim at the actual head joint,
       not a fraction of body height: tall hair lives well above the skull and
       gets guillotined otherwise. */
    var focus = f.P.headY - f.height * 0.04;
    cam.position.set(0.38, focus + 0.02, f.height * 1.20);
    cam.lookAt(0, focus, 0);
    cam.updateProjectionMatrix();

    var prevTarget = renderer.getRenderTarget();
    var prevClear = new THREE.Color();
    renderer.getClearColor(prevClear);
    var prevAlpha = renderer.getClearAlpha();

    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, W, H, pixels);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClear, prevAlpha);

    scene.remove(f.group);
    f.dispose();

    /* GL reads bottom-up; canvas is top-down. */
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var img = g.createImageData(W, H);
    for (var y = 0; y < H; y++) {
      var src = (H - 1 - y) * W * 4;
      var dst = y * W * 4;
      for (var x = 0; x < W * 4; x++) img.data[dst + x] = pixels[src + x];
    }
    g.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }

  /* Called from the game loop while a menu is open. Budgeted so the menu
     never hitches: a couple of characters per frame at most. */
  P.pump = function (renderer, budget) {
    if (!queue.length) return 0;
    if (!init(renderer)) return 0;
    var n = 0, max = budget === undefined ? 2 : budget;
    var t0 = (window.performance && performance.now) ? performance.now() : 0;
    while (queue.length && n < max) {
      var e = queue.shift();
      if (!pending[e.spec.id]) continue;
      var url;
      try { url = renderOne(renderer, e.spec); }
      catch (err) { url = null; }
      delete pending[e.spec.id];
      if (url) {
        cache[e.spec.id] = url;
        for (var i = 0; i < e.cbs.length; i++) {
          try { e.cbs[i](url); } catch (err2) { }
        }
      }
      n++;
      /* if a single character was unusually slow, stop early */
      if (t0 && performance.now() - t0 > 12) break;
    }
    return n;
  };

  P.queued = function () { return queue.length; };

})(DBZ);
