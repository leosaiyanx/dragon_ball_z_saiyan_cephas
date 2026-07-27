/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — interface

   Screens, the roster grid and the in-fight HUD. Character tiles are drawn
   with 2D canvas from the same appearance data the 3D builder uses, so all
   79 portraits are distinct without rendering 79 WebGL scenes.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M, R = C.Roster, L = C.Levels;
  var U = {};
  C.UI = U;

  /* --------------------------------------------------------------- helpers */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function on(node, fn) {
    node.addEventListener('click', function (e) {
      C.Audio.sfx('blip');
      fn(e);
    });
    return node;
  }
  U.el = el; U.$ = $;

  function hex(n) { return '#' + ('000000' + (n >>> 0).toString(16)).slice(-6); }

  /* ========================= procedural portraits ======================== */
  /* A head-and-shoulders badge built from the character's own colour and
     hair descriptors — the same data the 3D rig reads.                   */
  var portraitCache = {};

  U.portrait = function (spec, size) {
    size = size || 128;
    var key = spec.id + '_' + size;
    if (portraitCache[key]) return portraitCache[key];

    var cv = document.createElement('canvas');
    var W = size, H = Math.round(size * 4 / 3);
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');

    var aura = hex(spec.aura);
    var skin = hex(spec.skin);
    var hairC = hex(spec.hair.color);
    var hairT = spec.hair.tip ? hex(spec.hair.tip) : hairC;
    var fit = spec.fit || {};

    /* backdrop: a burst of the character's ki colour */
    var bg = g.createRadialGradient(W * 0.5, H * 0.42, 2, W * 0.5, H * 0.5, H * 0.75);
    bg.addColorStop(0, aura);
    bg.addColorStop(0.42, shade(spec.aura, -0.55));
    bg.addColorStop(1, '#080c1a');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    /* speed lines */
    g.save();
    g.globalAlpha = 0.22;
    g.strokeStyle = '#ffffff';
    g.lineWidth = Math.max(1, W * 0.012);
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * Math.PI * 2 + 0.3;
      g.beginPath();
      g.moveTo(W / 2 + Math.cos(a) * W * 0.30, H * 0.46 + Math.sin(a) * W * 0.30);
      g.lineTo(W / 2 + Math.cos(a) * W * 0.95, H * 0.46 + Math.sin(a) * W * 0.95);
      g.stroke();
    }
    g.restore();

    var cx = W * 0.5, cy = H * 0.44, hr = W * 0.24;

    /* shoulders / outfit */
    g.fillStyle = hex(fit.c1 === undefined ? 0x2b3a6b : fit.c1);
    g.beginPath();
    g.moveTo(W * 0.06, H);
    g.quadraticCurveTo(W * 0.5, H * 0.60, W * 0.94, H);
    g.closePath();
    g.fill();
    g.fillStyle = hex(fit.c2 === undefined ? 0xf2f2f2 : fit.c2);
    g.beginPath();
    g.moveTo(W * 0.40, H);
    g.quadraticCurveTo(W * 0.5, H * 0.70, W * 0.60, H);
    g.closePath();
    g.fill();

    /* neck */
    g.fillStyle = shade(spec.skin, -0.18);
    g.fillRect(cx - hr * 0.36, cy + hr * 0.55, hr * 0.72, hr * 0.9);

    /* the back mane, drawn before the head */
    var hs = spec.hair;
    if (hs.style !== 'bald' && hs.back > 0) {
      g.fillStyle = hairC;
      g.beginPath();
      g.ellipse(cx, cy + hr * (0.2 + hs.back * 0.55), hr * (1.05 + hs.thick * 0.16),
        hr * (0.9 + hs.back * 1.35), 0, 0, Math.PI * 2);
      g.fill();
    }

    /* head */
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(cx, cy, hr * 0.92, hr, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = shade(spec.skin, -0.10);
    g.beginPath();
    g.ellipse(cx, cy + hr * 0.42, hr * 0.78, hr * 0.52, 0, 0, Math.PI * 2);
    g.fill();

    /* hair on top */
    if (hs.style !== 'bald') {
      g.fillStyle = hairC;
      if (hs.style === 'bob' || hs.style === 'flat') {
        g.beginPath();
        g.ellipse(cx, cy - hr * 0.20, hr * 1.02, hr * (0.72 + hs.len), 0, Math.PI, Math.PI * 2);
        g.fill();
        g.fillRect(cx - hr * 1.02, cy - hr * 0.22, hr * 2.04, hr * (0.30 + hs.len * 1.4));
      } else {
        var n = Math.max(5, hs.n);
        var span = hs.style === 'flame' ? 1.45 : Math.PI;
        for (var s = 0; s < n; s++) {
          var t = n === 1 ? 0.5 : s / (n - 1);
          var ang = hs.style === 'flame'
            ? (-Math.PI * 0.5 - 0.5 + t * span)
            : (Math.PI + t * Math.PI);
          var bx = cx + Math.cos(ang) * hr * 0.86;
          var by = cy + Math.sin(ang) * hr * 0.90;
          var len = hr * hs.len * (hs.style === 'flame' ? 4.6 : 3.2) *
            (0.7 + 0.5 * Math.sin(t * 3.1 + s));
          var lift = hs.lift * 1.5;
          var dx = Math.cos(ang), dy = Math.sin(ang) - lift;
          var dl = Math.hypot(dx, dy) || 1;
          dx /= dl; dy /= dl;
          var wdt = hr * 0.20 * (hs.thick || 1);
          g.fillStyle = (s % 3 === 0) ? hairT : hairC;
          g.beginPath();
          g.moveTo(bx - dy * wdt, by + dx * wdt);
          g.lineTo(bx + dy * wdt, by - dx * wdt);
          g.lineTo(bx + dx * len, by + dy * len);
          g.closePath();
          g.fill();
        }
        /* skull cap so the spikes read as one head of hair */
        g.fillStyle = hairC;
        g.beginPath();
        g.ellipse(cx, cy - hr * 0.10, hr * 0.94, hr * 0.72, 0, Math.PI, Math.PI * 2);
        g.fill();
      }
      /* bangs */
      if (hs.bang > 0.3) {
        g.fillStyle = hairC;
        g.beginPath();
        g.moveTo(cx - hr * 0.9, cy - hr * 0.28);
        g.lineTo(cx + hr * 0.9, cy - hr * 0.28);
        g.lineTo(cx + hr * 0.5, cy - hr * 0.28 + hr * hs.bang * 0.75);
        g.lineTo(cx, cy - hr * 0.28 + hr * hs.bang * 0.45);
        g.lineTo(cx - hr * 0.5, cy - hr * 0.28 + hr * hs.bang * 0.8);
        g.closePath();
        g.fill();
      }
    }

    var hx = spec.head || {};
    /* horns / antennae / ears read strongly at thumbnail size */
    if (hx.horns) {
      g.fillStyle = '#e8e2d2';
      var hornAng = hx.horns === 'frieza' ? 1.55 : 0.7;
      for (var hI = 0; hI < 2; hI++) {
        var sgn = hI ? 1 : -1;
        g.save();
        g.translate(cx + sgn * hr * 0.85, cy - hr * 0.25);
        g.rotate(sgn * hornAng);
        g.beginPath();
        g.moveTo(-hr * 0.12, 0); g.lineTo(hr * 0.12, 0); g.lineTo(0, -hr * 0.85);
        g.closePath(); g.fill();
        g.restore();
      }
    }
    if (hx.antenna) {
      g.strokeStyle = shade(spec.skin, -0.12);
      g.lineWidth = hr * 0.11;
      for (var aI = 0; aI < 2; aI++) {
        var sg = aI ? 1 : -1;
        g.beginPath();
        g.moveTo(cx + sg * hr * 0.22, cy - hr * 0.72);
        g.quadraticCurveTo(cx + sg * hr * 0.34, cy - hr * 1.30, cx + sg * hr * 0.16, cy - hr * 1.45);
        g.stroke();
      }
    }
    if (hx.crest) {
      g.fillStyle = '#1a1a24';
      for (var cI = 0; cI < 2; cI++) {
        var sc = cI ? 1 : -1;
        g.beginPath();
        g.moveTo(cx + sc * hr * 0.25, cy - hr * 0.6);
        g.lineTo(cx + sc * hr * 0.95, cy - hr * 1.5);
        g.lineTo(cx + sc * hr * 0.62, cy - hr * 0.45);
        g.closePath(); g.fill();
      }
    }
    if (hx.tentacle) {
      g.strokeStyle = skin; g.lineWidth = hr * 0.30; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx, cy - hr * 0.85);
      g.quadraticCurveTo(cx - hr * 0.5, cy - hr * 1.7, cx - hr * 1.15, cy - hr * 1.4);
      g.stroke();
    }
    if (hx.catEars) {
      g.fillStyle = skin;
      for (var kI = 0; kI < 2; kI++) {
        var sk = kI ? 1 : -1;
        g.beginPath();
        g.moveTo(cx + sk * hr * 0.30, cy - hr * 0.72);
        g.lineTo(cx + sk * hr * 0.78, cy - hr * 1.42);
        g.lineTo(cx + sk * hr * 0.86, cy - hr * 0.55);
        g.closePath(); g.fill();
      }
    }
    if (hx.halo) {
      g.strokeStyle = '#ffe14d'; g.lineWidth = hr * 0.11;
      g.beginPath(); g.ellipse(cx, cy - hr * 1.45, hr * 0.60, hr * 0.18, 0, 0, Math.PI * 2); g.stroke();
    }

    /* eyes — the single biggest identity cue */
    var eyeC = hex(spec.eye === undefined ? 0x1d2733 : spec.eye);
    var ex = hr * 0.40, ey = cy + hr * 0.02;
    g.fillStyle = '#f6f7fb';
    [-1, 1].forEach(function (sd) {
      g.beginPath();
      g.ellipse(cx + sd * ex, ey, hr * 0.24, hr * 0.19, 0, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = eyeC;
    [-1, 1].forEach(function (sd) {
      g.beginPath();
      g.ellipse(cx + sd * ex, ey, hr * 0.12, hr * 0.15, 0, 0, Math.PI * 2);
      g.fill();
    });
    if (hx.thirdEye) {
      g.fillStyle = '#f6f7fb';
      g.beginPath(); g.ellipse(cx, cy - hr * 0.40, hr * 0.20, hr * 0.15, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = eyeC;
      g.beginPath(); g.ellipse(cx, cy - hr * 0.40, hr * 0.10, hr * 0.11, 0, 0, Math.PI * 2); g.fill();
    }
    /* brows */
    g.strokeStyle = '#14141c'; g.lineWidth = hr * 0.11; g.lineCap = 'round';
    [-1, 1].forEach(function (sd) {
      g.beginPath();
      g.moveTo(cx + sd * (ex - hr * 0.24), ey - hr * 0.32);
      g.lineTo(cx + sd * (ex + hr * 0.22), ey - hr * 0.16);
      g.stroke();
    });
    /* mouth */
    g.lineWidth = hr * 0.08;
    g.beginPath();
    g.moveTo(cx - hr * 0.20, cy + hr * 0.52);
    g.lineTo(cx + hr * 0.20, cy + hr * 0.52);
    g.stroke();

    if (hx.moustache) {
      g.fillStyle = '#2a1a12';
      g.fillRect(cx - hr * 0.30, cy + hr * 0.34, hr * 0.60, hr * 0.14);
    }
    if (hx.beard) {
      g.fillStyle = '#eef0f4';
      g.beginPath(); g.ellipse(cx, cy + hr * 0.95, hr * 0.52, hr * 0.48, 0, 0, Math.PI * 2); g.fill();
    }
    if (hx.shades) {
      g.fillStyle = '#22222c';
      g.fillRect(cx - hr * 0.78, ey - hr * 0.18, hr * 1.56, hr * 0.32);
    }
    if (hx.scouter) {
      g.fillStyle = hex(hx.scouter);
      g.globalAlpha = 0.85;
      g.fillRect(cx + hr * 0.24, ey - hr * 0.22, hr * 0.72, hr * 0.38);
      g.globalAlpha = 1;
      g.strokeStyle = '#2b2b3a'; g.lineWidth = hr * 0.07;
      g.strokeRect(cx + hr * 0.24, ey - hr * 0.22, hr * 0.72, hr * 0.38);
    }
    if (hx.dots) {
      g.fillStyle = '#6a3a2a';
      for (var d = 0; d < 6; d++) {
        g.beginPath();
        g.arc(cx + ((d % 3) - 1) * hr * 0.26, cy - hr * (d < 3 ? 0.48 : 0.28), hr * 0.055, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (hx.scar) {
      g.strokeStyle = '#c06a5a'; g.lineWidth = hr * 0.07;
      g.beginPath(); g.moveTo(cx - hr * 0.52, cy - hr * 0.30); g.lineTo(cx - hr * 0.38, cy + hr * 0.14); g.stroke();
    }

    /* frame */
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, W - 2, H - 2);

    portraitCache[key] = cv;
    return cv;
  };

  function shade(hexnum, amt) {
    var r = (hexnum >> 16) & 255, gg = (hexnum >> 8) & 255, b = hexnum & 255;
    if (amt > 0) { r += (255 - r) * amt; gg += (255 - gg) * amt; b += (255 - b) * amt; }
    else { r *= (1 + amt); gg *= (1 + amt); b *= (1 + amt); }
    return 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')';
  }
  U.shade = shade;

  /* ================================ screens ============================== */
  U.screens = {};
  U.stack = [];

  U.mount = function () {
    U.overlay = $('overlay');
    ['title', 'modes', 'story', 'fights', 'select', 'stage', 'settings',
      'controls', 'pause', 'results', 'bracket'].forEach(function (id) {
        var s = el('div', 'screen');
        s.id = 'scr-' + id;
        U.overlay.appendChild(s);
        U.screens[id] = s;
      });
    U.buildHud();
  };

  U.show = function (id, opts) {
    U.overlay.classList.add('show');
    for (var k in U.screens) U.screens[k].classList.remove('on');
    var s = U.screens[id];
    if (!s) return;
    s.classList.add('on');
    s.classList.toggle('clear', !!(opts && opts.clear));
    U.current = id;
    s.scrollTop = 0;
    C.bus.emit('screen', { id: id });
  };

  U.hide = function () {
    U.overlay.classList.remove('show');
    for (var k in U.screens) U.screens[k].classList.remove('on');
    U.current = null;
    C.bus.emit('screen', { id: null });
  };

  function head(screen, title, sub, backFn) {
    clear(screen);
    var h = el('div', 'scr-head');
    if (backFn) {
      var b = el('button', 'btn ghost', '◀');
      b.style.padding = '0.5em 0.8em';
      on(b, backFn);
      h.appendChild(b);
    }
    var box = el('div');
    box.appendChild(el('h2', null, title));
    if (sub) box.appendChild(el('div', 'sub', sub));
    h.appendChild(box);
    screen.appendChild(h);
    var body = el('div', 'scr-body');
    screen.appendChild(body);
    var foot = el('div', 'scr-foot');
    screen.appendChild(foot);
    return { body: body, foot: foot, head: h };
  }
  U.head = head;

  /* -------------------------------- title --------------------------------- */
  U.title = function (G) {
    var s = U.screens.title;
    clear(s);
    s.classList.add('clear');
    var wrap = el('div');
    wrap.style.cssText = 'margin:auto;text-align:center;padding:1em;';

    var logo = el('div', 'logo');
    logo.appendChild(el('span', 'l1', 'DRAGON BALL Z'));
    logo.appendChild(el('span', 'l2', 'SAIYAN CEPHAS'));
    logo.appendChild(el('span', 'l3 kanji', 'ドラゴンボールZ　セファス'));
    wrap.appendChild(logo);
    wrap.appendChild(el('div', 'forCephas', 'Built for Cephas Emokpae'));

    var menu = el('div', 'titleMenu');
    var cleared = L.totalCleared();
    [
      ['▶', 'Play', cleared ? 'Continue — ' + cleared + '/' + L.totalFights + ' fights cleared' : 'Start the story', function () { U.modes(G); }],
      ['⚔', 'Quick Battle', 'Jump straight into a fight', function () { G.quickBattle(); }],
      ['👤', 'Fighters', R.count + ' characters, ' + R.formCount + ' forms', function () { U.select(G, { browse: true }); }],
      ['⚙', 'Settings', 'Graphics, sound, difficulty, assists', function () { U.settings(G); }],
      ['⌨', 'How to Play', 'Controls and combat tips', function () { U.controls(G); }]
    ].forEach(function (r, i) {
      var b = el('button', 'btn wide' + (i === 0 ? ' primary' : ''));
      b.appendChild(el('span', 'ico', r[0]));
      var t = el('span', 'txt');
      t.appendChild(el('b', null, r[1]));
      t.appendChild(el('small', null, r[2]));
      b.appendChild(t);
      on(b, r[3]);
      menu.appendChild(b);
    });
    wrap.appendChild(menu);
    s.appendChild(wrap);
    U.show('title', { clear: true });
  };

  /* -------------------------------- modes --------------------------------- */
  U.modes = function (G) {
    var s = U.screens.modes;
    var h = head(s, 'Choose a Mode', 'Everything is unlocked. Go anywhere.', function () { U.title(G); });
    var grid = el('div', 'sagaList');
    L.MODES.forEach(function (m) {
      var card = el('div', 'saga');
      var row = el('div', 'row');
      row.appendChild(el('span', 'ico', m.icon));
      row.appendChild(el('h3', null, m.name));
      row.appendChild(el('span', 'kj kanji', m.kanji));
      card.appendChild(row);
      card.appendChild(el('p', null, m.blurb));
      if (m.id === 'story') {
        var p = el('div', 'prog');
        var i2 = el('i');
        i2.style.width = (L.totalCleared() / L.totalFights * 100) + '%';
        p.appendChild(i2);
        card.appendChild(p);
        card.appendChild(el('div', 'cnt', L.totalCleared() + ' / ' + L.totalFights + ' fights cleared'));
      }
      on(card, function () { G.pickMode(m.id); });
      grid.appendChild(card);
    });
    h.body.appendChild(grid);

    var st = el('div', 'statsGrid');
    var P = C.P;
    [['Wins', P.wins], ['Fights', P.matches], ['KOs', P.totalKo],
    ['Zeni', C.fmtNum(P.zeni)], ['Best Survival', P.bestSurvival],
    ['Titles', P.tournamentsWon]].forEach(function (r) {
      var b = el('div', 'statBox');
      b.appendChild(el('b', null, String(r[1])));
      b.appendChild(el('small', null, r[0]));
      st.appendChild(b);
    });
    h.body.appendChild(st);
    U.show('modes');
  };

  /* ------------------------------- story ---------------------------------- */
  U.story = function (G) {
    var s = U.screens.story;
    var h = head(s, 'Story Mode', 'Nine sagas. ' + L.totalFights + ' fights.', function () { U.modes(G); });
    var grid = el('div', 'sagaList');
    L.SAGAS.forEach(function (saga, i) {
      var pr = L.sagaProgress(saga.id);
      var unlocked = L.sagaUnlocked(i);
      var card = el('div', 'saga' + (unlocked ? '' : ' locked'));
      card.style.borderLeft = '4px solid ' + saga.color;
      var row = el('div', 'row');
      row.appendChild(el('span', 'ico', unlocked ? saga.icon : '🔒'));
      row.appendChild(el('h3', null, saga.name));
      row.appendChild(el('span', 'kj kanji', saga.kanji));
      card.appendChild(row);
      card.appendChild(el('p', null, unlocked ? saga.blurb : 'Clear half of ' + L.SAGAS[i - 1].name + ' to unlock.'));
      var p = el('div', 'prog');
      var fill = el('i');
      fill.style.width = (pr.pct * 100) + '%';
      fill.style.background = saga.color;
      p.appendChild(fill);
      card.appendChild(p);
      card.appendChild(el('div', 'cnt', pr.done + ' / ' + pr.total + ' cleared'));
      if (unlocked) on(card, function () { U.fights(G, saga); });
      grid.appendChild(card);
    });
    h.body.appendChild(grid);
    U.show('story');
  };

  U.fights = function (G, saga) {
    var s = U.screens.fights;
    var h = head(s, saga.name, saga.blurb, function () { U.story(G); });
    var list = el('div', 'fightList');
    saga.fights.forEach(function (fg, i) {
      var done = L.cleared(saga.id, i);
      var row = el('div', 'fight');
      row.appendChild(el('div', 'no', C.romans[i] || (i + 1)));
      var info = el('div', 'info');
      info.appendChild(el('b', null, fg.title));
      var foe = R.get(fg.foe);
      var stage = C.stageById[fg.stage];
      info.appendChild(el('small', null, 'vs ' + foe.name +
        (fg.form >= 0 && foe.forms[fg.form] ? ' (' + foe.forms[fg.form].name + ')' : '') +
        ' · ' + (stage ? stage.name : fg.stage)));
      row.appendChild(info);
      if (done) row.appendChild(el('div', 'done', '✔'));
      on(row, function () { G.startStoryFight(saga, i); });
      list.appendChild(row);
    });
    h.body.appendChild(list);
    U.show('fights');
  };

  /* --------------------------- character select --------------------------- */
  U.select = function (G, opts) {
    opts = opts || {};
    var s = U.screens.select;
    var title = opts.title || (opts.browse ? 'Fighters' : 'Choose Your Fighter');
    var sub = opts.sub || (R.count + ' fighters · ' + R.formCount + ' forms · everyone unlocked');
    var h = head(s, title, sub, opts.back || function () { U.modes(G); });

    var state = { era: 'all', pick: opts.pick || C.load().lastUsed || 'goku' };

    var filters = el('div', 'filters');
    R.ERAS.forEach(function (e) {
      var c = el('button', 'chip' + (e.id === state.era ? ' on' : ''), e.name);
      on(c, function () {
        state.era = e.id;
        var all = filters.querySelectorAll('.chip');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
        c.classList.add('on');
        renderGrid();
      });
      filters.appendChild(c);
    });
    var favChip = el('button', 'chip', '★ Favourites');
    on(favChip, function () {
      state.era = state.era === 'fav' ? 'all' : 'fav';
      favChip.classList.toggle('on', state.era === 'fav');
      renderGrid();
    });
    filters.appendChild(favChip);

    var detail = el('div', 'detail');
    var grid = el('div', 'grid');
    h.body.appendChild(detail);
    h.body.appendChild(filters);
    h.body.appendChild(grid);

    function renderDetail() {
      var c = R.get(state.pick);
      clear(detail);
      var left = el('div');
      var pc = U.portrait(c, 220);
      pc.style.cssText = 'width:100%;max-width:210px;border-radius:0.5em;display:block;';
      left.appendChild(pc);
      var fav = el('button', 'btn ghost', (C.load().favorites.indexOf(c.id) >= 0 ? '★ Favourite' : '☆ Add favourite'));
      fav.style.cssText = 'margin-top:0.5em;width:100%;font-size:0.82em;';
      on(fav, function () {
        var f = C.load().favorites, i = f.indexOf(c.id);
        if (i >= 0) f.splice(i, 1); else f.push(c.id);
        C.save();
        renderDetail();
      });
      left.appendChild(fav);
      detail.appendChild(left);

      var right = el('div');
      right.appendChild(el('h3', null, c.name));
      var meta = el('div');
      meta.style.cssText = 'display:flex;gap:0.4em;flex-wrap:wrap;margin-top:0.3em;';
      meta.appendChild(el('span', 'tag', c.race));
      meta.appendChild(el('span', 'tag', c.era === 'Z' ? 'Dragon Ball Z' :
        c.era === 'GT' ? 'Dragon Ball GT' : c.era === 'Super' ? 'Dragon Ball Super' :
          c.era === 'Movie' ? 'Movie' : 'Dragon Ball'));
      if (c.saga) meta.appendChild(el('span', 'tag', c.saga));
      right.appendChild(meta);
      right.appendChild(el('div', 'bio', c.bio));

      var stats = el('div', 'stats');
      [['Power', c.pwr], ['Speed', c.spd], ['Defence', c.def], ['Ki', c.ki], ['Skill', c.tec]].forEach(function (r) {
        var row = el('div', 'stat');
        row.appendChild(el('span', null, r[0]));
        var bar = el('div', 'bar');
        var fi = el('i');
        fi.style.width = (r[1] / 10 * 100) + '%';
        bar.appendChild(fi);
        row.appendChild(bar);
        stats.appendChild(row);
      });
      right.appendChild(stats);

      var bp = el('div');
      bp.style.cssText = 'margin-top:0.5em;font-size:0.8em;opacity:0.75;';
      bp.innerHTML = 'Battle power <b style="color:var(--gold)">' + C.fmtNum(R.power(c)) + '</b>' +
        (c.forms.length ? ' → <b style="color:var(--gold)">' + C.fmtNum(R.power(c, c.forms.length - 1)) + '</b> at full power' : '');
      right.appendChild(bp);

      if (c.forms.length) {
        var fl = el('div', 'formList');
        fl.appendChild(el('span', 'formPill', 'Base'));
        c.forms.forEach(function (fm) {
          fl.appendChild(el('span', 'formPill', (fm.kanji ? fm.kanji + ' ' : '') + fm.name));
        });
        right.appendChild(fl);
      }

      var ml = el('div', 'moveList');
      [['1', c.s1], ['2', c.s2], ['3', c.s3], ['4', c.s4], ['ULT', c.ult]].forEach(function (r) {
        if (!r[1]) return;
        var m2 = el('div', 'mv');
        m2.appendChild(el('b', null, r[0]));
        m2.appendChild(el('span', null, r[1].name));
        m2.appendChild(el('span', 'arch', r[1].arch));
        ml.appendChild(m2);
      });
      right.appendChild(ml);
      if (c.quip) {
        var q = el('div');
        q.style.cssText = 'margin-top:0.5em;font-style:italic;opacity:0.7;font-size:0.85em;';
        q.textContent = '“' + c.quip + '”';
        right.appendChild(q);
      }
      detail.appendChild(right);
      if (G.previewCharacter) G.previewCharacter(c);
    }

    function renderGrid() {
      clear(grid);
      var list = state.era === 'fav'
        ? C.load().favorites.map(function (id) { return R.byId[id]; }).filter(Boolean)
        : R.filter(state.era);
      if (!list.length) {
        grid.appendChild(el('div', null, '<em style="opacity:.6">No favourites yet — tap ☆ on a fighter.</em>'));
        return;
      }
      list.forEach(function (c) {
        var tile = el('div', 'cha' + (c.id === state.pick ? ' sel' : ''));
        var art = el('div', 'art');
        var cv = U.portrait(c, 128);
        var img = cv.cloneNode(true);
        img.getContext('2d').drawImage(cv, 0, 0);
        art.appendChild(img);
        tile.appendChild(art);
        tile.appendChild(el('div', 'era', c.era));
        if (c.forms.length) tile.appendChild(el('div', 'forms', '+' + c.forms.length));
        tile.appendChild(el('div', 'nm', c.short));
        on(tile, function () {
          state.pick = c.id;
          var sel = grid.querySelectorAll('.cha');
          for (var i = 0; i < sel.length; i++) sel[i].classList.remove('sel');
          tile.classList.add('sel');
          renderDetail();
          h.body.scrollTop = 0;
        });
        grid.appendChild(tile);
      });
    }

    renderDetail();
    renderGrid();

    if (!opts.browse) {
      var go = el('button', 'btn primary', opts.cta || 'Fight ▶');
      go.style.fontSize = '1.05em';
      on(go, function () {
        C.load().lastUsed = state.pick;
        C.save();
        opts.onPick(state.pick);
      });
      var rnd = el('button', 'btn ghost', '🎲 Random');
      on(rnd, function () {
        state.pick = M.pick(R.list).id;
        renderDetail(); renderGrid();
      });
      h.foot.appendChild(rnd);
      h.foot.appendChild(el('div', 'spacer'));
      h.foot.appendChild(go);
    } else {
      var back = el('button', 'btn ghost', 'Back');
      on(back, function () { U.title(G); });
      h.foot.appendChild(back);
    }
    U.show('select');
  };

  /* ----------------------------- stage select ----------------------------- */
  U.stage = function (G, onPick, backFn) {
    var s = U.screens.stage;
    var h = head(s, 'Choose a Stage', C.STAGES.length + ' battlegrounds', backFn);
    var grid = el('div', 'sagaList');
    C.STAGES.forEach(function (st) {
      var card = el('div', 'saga');
      var row = el('div', 'row');
      row.appendChild(el('span', 'ico', '🌐'));
      row.appendChild(el('h3', null, st.name));
      card.appendChild(row);
      card.appendChild(el('p', null, st.sub));
      var sw = el('div');
      sw.style.cssText = 'height:0.5em;border-radius:999px;background:linear-gradient(90deg,' +
        hex(st.sky.top) + ',' + hex(st.sky.mid) + ',' + hex(st.ground) + ');';
      card.appendChild(sw);
      on(card, function () { onPick(st.id); });
      grid.appendChild(card);
    });
    h.body.appendChild(grid);
    var rnd = el('button', 'btn ghost', '🎲 Random Stage');
    on(rnd, function () { onPick(M.pick(C.STAGES).id); });
    h.foot.appendChild(rnd);
    U.show('stage');
  };

  /* ------------------------------- settings ------------------------------- */
  function seg(opts, get, set) {
    var wrap = el('div', 'seg');
    opts.forEach(function (o) {
      var b = el('button', get() === o[1] ? 'on' : '', o[0]);
      b.addEventListener('click', function () {
        C.Audio.sfx('blip');
        set(o[1]);
        var all = wrap.querySelectorAll('button');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
        b.classList.add('on');
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function slider(get, set, min, max, step) {
    var i = el('input');
    i.type = 'range';
    i.min = min; i.max = max; i.step = step;
    i.value = get();
    i.addEventListener('input', function () { set(parseFloat(i.value)); });
    return i;
  }

  function setRow(body, label, note, control) {
    var r = el('div', 'set');
    var l = el('label');
    l.appendChild(document.createTextNode(label));
    if (note) l.appendChild(el('small', null, note));
    r.appendChild(l);
    r.appendChild(control);
    body.appendChild(r);
    return r;
  }

  U.settings = function (G, fromPause) {
    var s = U.screens.settings;
    var S = C.S;
    var h = head(s, 'Settings', 'Changes save automatically', function () {
      C.save(true);
      if (fromPause) U.pause(G); else U.title(G);
    });
    var list = el('div', 'setList');

    setRow(list, 'Difficulty', 'Sets how hard CPU opponents fight',
      seg(C.DIFF_ORDER.map(function (d) { return [C.DIFFICULTY[d].name, d]; }),
        function () { return S.difficulty; },
        function (v) { S.difficulty = v; C.save(); U.toast(C.diff(v).blurb); }));

    setRow(list, 'Graphics', 'Lower this if the game runs slowly',
      seg([['Low', 'low'], ['Medium', 'medium'], ['High', 'high']],
        function () { return S.quality; },
        function (v) { S.quality = v; C.save(); if (G.applyQuality) G.applyQuality(); }));

    setRow(list, 'Glow', 'Bloom on ki auras and beams',
      seg([['Off', false], ['On', true]],
        function () { return !!S.bloom; },
        function (v) { S.bloom = v; C.save(); if (G.applyQuality) G.applyQuality(); }));

    setRow(list, 'Music', null, slider(function () { return S.music; },
      function (v) { S.music = v; C.Audio.setVolumes(); C.save(); }, 0, 1, 0.05));
    setRow(list, 'Sound effects', null, slider(function () { return S.sfx; },
      function (v) { S.sfx = v; C.Audio.setVolumes(); C.save(); }, 0, 1, 0.05));
    setRow(list, 'Screen shake', null, slider(function () { return S.shake; },
      function (v) { S.shake = v; C.save(); }, 0, 1.5, 0.05));

    list.appendChild(el('div', null,
      '<h3 style="margin:0.8em 0 0.2em;font-size:1em;color:var(--gold)">Assists</h3>' +
      '<div style="font-size:0.82em;opacity:0.7;margin-bottom:0.4em">' +
      'Turn these off for a stricter fight.</div>'));

    setRow(list, 'Auto-face target', 'Always turn toward your opponent',
      seg([['Off', false], ['On', true]], function () { return !!S.assistAim; },
        function (v) { S.assistAim = v; C.save(); }));
    setRow(list, 'Auto combo', 'Hold the attack button to keep the combo going',
      seg([['Off', false], ['On', true]], function () { return !!S.assistCombo; },
        function (v) { S.assistCombo = v; C.save(); }));
    setRow(list, 'Damage numbers', null,
      seg([['Off', false], ['On', true]], function () { return !!S.damageNumbers; },
        function (v) { S.damageNumbers = v; C.save(); }));
    setRow(list, 'Camera distance', null, slider(function () { return S.camDist; },
      function (v) { S.camDist = v; C.save(); }, 0.7, 1.6, 0.05));
    setRow(list, 'Mouse sensitivity', null, slider(function () { return S.sensitivity; },
      function (v) { S.sensitivity = v; C.save(); }, 0.3, 2.5, 0.1));
    setRow(list, 'Invert camera Y', null,
      seg([['Off', false], ['On', true]], function () { return !!S.invertY; },
        function (v) { S.invertY = v; C.save(); }));

    h.body.appendChild(list);

    var reset = el('button', 'btn ghost', 'Reset all progress');
    on(reset, function () {
      if (window.confirm('Erase all story progress, stats and settings?')) {
        C.resetSave();
        U.toast('Everything reset.');
        U.settings(G, fromPause);
      }
    });
    h.foot.appendChild(reset);
    h.foot.appendChild(el('div', 'spacer'));
    var v = el('div');
    v.style.cssText = 'font-size:0.78em;opacity:0.5;';
    v.textContent = 'v' + C.VERSION;
    h.foot.appendChild(v);
    U.show('settings');
  };

  /* ------------------------------- controls ------------------------------- */
  U.controls = function (G, fromPause) {
    var s = U.screens.controls;
    var h = head(s, 'How to Play', 'Everything you can do', function () {
      if (fromPause) U.pause(G); else U.title(G);
    });

    var tabs = el('div', 'filters');
    var pane = el('div');
    var which = C.Input.scheme();

    function draw(kind) {
      clear(pane);
      var grid = el('div', 'ctrlGrid');
      C.Input.HINTS[kind].forEach(function (r) {
        var c = el('div', 'ctrl');
        c.appendChild(el('span', 'key', r[0]));
        c.appendChild(el('span', null, r[1]));
        grid.appendChild(c);
      });
      pane.appendChild(grid);

      var tips = el('div');
      tips.style.cssText = 'margin-top:1em;display:grid;gap:0.5em;';
      [
        ['Rush in automatically', 'Press attack from a distance and you fly straight at your opponent. You never have to walk into range.'],
        ['Build combos', 'Keep pressing attack: punch, punch, kick, punch, spin kick, then a heavy smash that launches them into the sky.'],
        ['Charge your ki', 'Hold the charge button. Your aura explodes outward and the ki bar fills. Specials and transformations both cost ki.'],
        ['Transform', 'Once you have enough ki, transform to jump to the next form. Higher forms drain ki constantly, so use them when it counts.'],
        ['Vanish out of trouble', 'Guard right as a hit lands and you teleport behind your attacker. It costs ki and it saves your life.'],
        ['Beam struggles', 'Fire a beam into an incoming beam and the two lock. Mash the attack button to push the ball of light into them.'],
        ['Ultimate', 'The orange bar fills as you deal and take damage. At 100% your Ultimate is free and it hurts.']
      ].forEach(function (t) {
        var card = el('div', 'storyCard');
        card.appendChild(el('h3', null, t[0]));
        card.appendChild(document.createTextNode(t[1]));
        tips.appendChild(card);
      });
      pane.appendChild(tips);
    }

    [['Keyboard', 'key'], ['Gamepad', 'pad'], ['Touch', 'touch']].forEach(function (t) {
      var c = el('button', 'chip' + (t[1] === which ? ' on' : ''), t[0]);
      on(c, function () {
        var all = tabs.querySelectorAll('.chip');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
        c.classList.add('on');
        draw(t[1]);
      });
      tabs.appendChild(c);
    });
    h.body.appendChild(tabs);
    h.body.appendChild(pane);
    draw(which);
    U.show('controls');
  };

  /* --------------------------------- pause -------------------------------- */
  U.pause = function (G) {
    var s = U.screens.pause;
    var h = head(s, 'Paused', null, null);
    var menu = el('div', 'titleMenu');
    menu.style.margin = '0 auto';
    [
      ['▶', 'Resume', function () { G.resume(); }],
      ['↻', 'Restart fight', function () { G.restart(); }],
      ['⌨', 'Controls', function () { U.controls(G, true); }],
      ['⚙', 'Settings', function () { U.settings(G, true); }],
      ['✖', 'Quit to menu', function () { G.quitToMenu(); }]
    ].forEach(function (r, i) {
      var b = el('button', 'btn wide' + (i === 0 ? ' primary' : ''));
      b.appendChild(el('span', 'ico', r[0]));
      b.appendChild(el('span', 'txt', '<b>' + r[1] + '</b>'));
      on(b, r[2]);
      menu.appendChild(b);
    });
    h.body.appendChild(menu);
    U.show('pause', { clear: true });
  };

  /* -------------------------------- results ------------------------------- */
  U.results = function (G, data) {
    var s = U.screens.results;
    clear(s);
    var wrap = el('div');
    wrap.style.cssText = 'margin:auto;padding:1.4em 1em;width:min(52em,94vw);text-align:center;';
    wrap.appendChild(el('div', 'big', data.win ? 'VICTORY' : 'DEFEAT'));
    if (data.subtitle) {
      var sb = el('div');
      sb.style.cssText = 'font-size:1.1em;opacity:0.85;margin-top:-0.2em;';
      sb.textContent = data.subtitle;
      wrap.appendChild(sb);
    }
    if (data.story) {
      var card = el('div', 'storyCard');
      card.style.marginTop = '1em';
      card.appendChild(el('h3', null, data.storyTitle || ''));
      card.appendChild(document.createTextNode(data.story));
      wrap.appendChild(card);
    }
    var st = el('div', 'statsGrid');
    (data.stats || []).forEach(function (r) {
      var b = el('div', 'statBox');
      b.appendChild(el('b', null, String(r[1])));
      b.appendChild(el('small', null, r[0]));
      st.appendChild(b);
    });
    wrap.appendChild(st);

    var row = el('div');
    row.style.cssText = 'display:flex;gap:0.6em;justify-content:center;margin-top:1.4em;flex-wrap:wrap;';
    (data.buttons || []).forEach(function (b, i) {
      var btn = el('button', 'btn' + (i === 0 ? ' primary' : ' ghost'), b[0]);
      on(btn, b[1]);
      row.appendChild(btn);
    });
    wrap.appendChild(row);
    s.appendChild(wrap);
    U.show('results', { clear: true });
  };

  /* ================================== HUD ================================= */
  U.buildHud = function () {
    var hud = $('hud');
    clear(hud);

    U.hudEls = { bars: [] };
    for (var i = 0; i < 2; i++) {
      var b = el('div', 'pbar p' + i);
      var nm = el('div', 'pname');
      var nameEl = el('span', 'n', 'Fighter');
      var formEl = el('span', 'pform');
      formEl.style.display = 'none';
      nm.appendChild(nameEl);
      nm.appendChild(formEl);
      b.appendChild(nm);

      var hw = el('div', 'hpwrap');
      var ghost = el('div', 'hpghost');
      var hpf = el('div', 'hpfill');
      var hpn = el('div', 'hpnum', '0');
      hw.appendChild(ghost); hw.appendChild(hpf); hw.appendChild(hpn);
      b.appendChild(hw);

      var kw = el('div', 'kiwrap');
      var kif = el('div', 'kifill');
      kw.appendChild(kif);
      b.appendChild(kw);

      var uw = el('div', 'ultwrap');
      var uf = el('div', 'ultfill');
      uw.appendChild(uf);
      b.appendChild(uw);

      hud.appendChild(b);
      U.hudEls.bars.push({
        root: b, name: nameEl, form: formEl, ghost: ghost, hp: hpf,
        num: hpn, ki: kif, ult: uf, ultWrap: uw, ghostV: 1
      });
    }

    U.hudEls.clock = el('div');
    U.hudEls.clock.id = 'clock';
    U.hudEls.clock.textContent = '';
    hud.appendChild(U.hudEls.clock);

    U.hudEls.round = el('div');
    U.hudEls.round.id = 'roundInfo';
    hud.appendChild(U.hudEls.round);

    var cb = el('div');
    cb.id = 'combo';
    cb.appendChild(el('div', 'n', '0'));
    cb.appendChild(el('div', 't', 'HITS'));
    hud.appendChild(cb);
    U.hudEls.combo = cb;

    var center = el('div');
    center.id = 'center';
    var big = el('div');
    big.id = 'bigtext';
    center.appendChild(big);
    hud.appendChild(center);
    U.hudEls.big = big;

    var toast = el('div');
    toast.id = 'toast';
    hud.appendChild(toast);
    U.hudEls.toast = toast;

    var mn = el('div');
    mn.id = 'moveName';
    hud.appendChild(mn);
    U.hudEls.moveName = mn;

    var dl = el('div');
    dl.id = 'dmgLayer';
    hud.appendChild(dl);
    U.hudEls.dmg = dl;

    var arrow = el('div');
    arrow.id = 'offArrow';
    arrow.textContent = '➤';
    hud.appendChild(arrow);
    U.hudEls.arrow = arrow;

    var sb = el('div');
    sb.id = 'struggleBar';
    var track = el('div', 'track');
    var fill = el('div', 'fill');
    track.appendChild(fill);
    sb.appendChild(track);
    sb.appendChild(el('div', 'lbl', 'MASH ATTACK!'));
    hud.appendChild(sb);
    U.hudEls.struggle = sb;
    U.hudEls.struggleFill = fill;
  };

  U.showHud = function (on) {
    $('hud').classList.toggle('show', !!on);
  };

  U.bindFighters = function (fighters) {
    U.fighters = fighters;
    for (var i = 0; i < 2; i++) {
      var b = U.hudEls.bars[i], f = fighters[i];
      if (!f) { b.root.style.display = 'none'; continue; }
      b.root.style.display = '';
      b.name.textContent = f.spec.short;
      b.ghostV = 1;
    }
  };

  U.updateHud = function (dt) {
    if (!U.fighters) return;
    for (var i = 0; i < 2; i++) {
      var b = U.hudEls.bars[i], f = U.fighters[i];
      if (!f) continue;
      var frac = M.sat(f.hp / f.maxHp);
      b.hp.style.transform = 'scaleX(' + frac + ')';
      b.hp.className = 'hpfill' + (frac < 0.25 ? ' low' : (frac < 0.55 ? ' mid' : ''));
      b.ghostV = Math.max(frac, b.ghostV - dt * 0.22);
      b.ghost.style.transform = 'scaleX(' + b.ghostV + ')';
      b.num.textContent = Math.ceil(f.hp);
      b.ki.style.transform = 'scaleX(' + M.sat(f.ki / f.maxKi) + ')';
      b.ult.style.transform = 'scaleX(' + M.sat(f.ult / 100) + ')';
      b.ultWrap.classList.toggle('full', f.ult >= 100);
      var fm = f.form();
      if (fm) {
        b.form.style.display = '';
        b.form.textContent = (fm.kanji ? fm.kanji + ' ' : '') + fm.name;
      } else {
        b.form.style.display = 'none';
      }
    }
  };

  U.setClock = function (txt) { U.hudEls.clock.textContent = txt || ''; };
  U.setRoundInfo = function (txt) { U.hudEls.round.textContent = txt || ''; };

  U.combo = function (n) {
    var c = U.hudEls.combo;
    if (n < 2) { c.classList.remove('on'); return; }
    c.classList.add('on');
    c.firstChild.textContent = n;
    clearTimeout(U._comboT);
    U._comboT = setTimeout(function () { c.classList.remove('on'); }, 1400);
  };

  U.big = function (txt) {
    var b = U.hudEls.big;
    b.classList.remove('show');
    void b.offsetWidth;
    b.textContent = txt;
    b.classList.add('show');
  };

  U.toast = function (txt, ms) {
    var t = U.hudEls.toast;
    if (!t) return;
    t.textContent = txt;
    t.classList.add('on');
    clearTimeout(U._toastT);
    U._toastT = setTimeout(function () { t.classList.remove('on'); }, ms || 2200);
  };

  U.moveName = function (txt) {
    var m = U.hudEls.moveName;
    m.classList.remove('on');
    void m.offsetWidth;
    m.textContent = txt;
    m.classList.add('on');
  };

  U.damage = function (x, y, n, kind) {
    if (!C.S.damageNumbers) return;
    var d = el('div', 'dmg' + (kind ? ' ' + kind : ''), kind === 'guard' ? 'BLOCK' : String(Math.round(n)));
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    U.hudEls.dmg.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 900);
  };

  U.struggle = function (on, bias) {
    U.hudEls.struggle.classList.toggle('on', !!on);
    if (on) U.hudEls.struggleFill.style.right = (50 - bias * 50) + '%';
  };

  U.flash = function (amount, color) {
    var f = $('flash');
    f.style.background = color || '#fff';
    f.style.opacity = amount;
    f.style.transition = 'none';
    void f.offsetWidth;
    f.style.transition = 'opacity 0.4s';
    f.style.opacity = 0;
  };

  U.vsCard = function (a, b, cb) {
    var v = $('vsCard');
    clear(v);
    var left = el('div', 'who slideL', a);
    var mid = el('div', 'vs', 'VS');
    var right = el('div', 'who slideR', b);
    v.appendChild(left); v.appendChild(mid); v.appendChild(right);
    v.classList.add('on');
    setTimeout(function () { v.classList.remove('on'); if (cb) cb(); }, 1500);
  };

})(DBZ);
