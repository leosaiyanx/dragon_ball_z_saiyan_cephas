/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — input

   Keyboard, mouse, gamepad and touch all write the same action table, so the
   rest of the game never asks how a button was pressed. Player two gets a
   second keyboard layout for couch versus.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M;
  var I = {};
  C.Input = I;

  var ACTIONS = ['attack', 'heavy', 'ki', 'charge', 'guard', 'boost', 'up', 'down',
    's1', 's2', 's3', 's4', 'ult', 'transform', 'revert', 'lock', 'pause', 'taunt'];

  function Pad() {
    this.mx = 0; this.my = 0;               /* stick, screen relative  */
    this.camX = 0; this.camY = 0;
    this.held = {};
    this.edge = {};
    this.rel = {};
    for (var i = 0; i < ACTIONS.length; i++) { this.held[ACTIONS[i]] = false; }
    this.mashCount = 0;
  }
  Pad.prototype.set = function (a, on) {
    if (on && !this.held[a]) { this.edge[a] = true; this.mashCount++; }
    if (!on && this.held[a]) this.rel[a] = true;
    this.held[a] = on;
  };
  Pad.prototype.pressed = function (a) { return !!this.edge[a]; };
  Pad.prototype.released = function (a) { return !!this.rel[a]; };
  Pad.prototype.clearEdges = function () { this.edge = {}; this.rel = {}; };
  Pad.prototype.reset = function () {
    this.mx = this.my = this.camX = this.camY = 0;
    for (var i = 0; i < ACTIONS.length; i++) this.held[ACTIONS[i]] = false;
    this.clearEdges();
  };

  I.p1 = new Pad();
  I.p2 = new Pad();
  I.pads = [I.p1, I.p2];

  /* ------------------------------------------------------------ keyboard */
  var KEYMAP1 = {
    KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r',
    ArrowUp: 'f', ArrowDown: 'b', ArrowLeft: 'l', ArrowRight: 'r',
    Space: 'up', KeyC: 'down', ControlLeft: 'down',
    ShiftLeft: 'boost', ShiftRight: 'boost',
    KeyJ: 'attack', KeyU: 'heavy', KeyK: 'ki', KeyL: 'charge',
    KeyI: 'guard', KeyO: 'transform', KeyP: 'revert',
    Digit1: 's1', Digit2: 's2', Digit3: 's3', Digit4: 's4',
    Digit5: 'ult', KeyE: 'ult', KeyQ: 'lock', KeyT: 'taunt',
    Tab: 'lock', Escape: 'pause', KeyM: 'pause'
  };

  /* player two on the same keyboard — left hand cluster */
  var KEYMAP2 = {
    KeyT: 'f', KeyG: 'b', KeyF: 'l', KeyH: 'r',
    KeyR: 'up', KeyV: 'down', KeyY: 'boost',
    KeyZ: 'attack', KeyX: 'ki', KeyB: 'heavy', KeyN: 'charge',
    KeyC: 'guard', Digit6: 's1', Digit7: 's2', Digit8: 's3', Digit9: 's4',
    Digit0: 'ult', KeyM: 'transform'
  };

  var dirs = { f: 0, b: 0, l: 0, r: 0 };
  var dirs2 = { f: 0, b: 0, l: 0, r: 0 };

  I.twoPlayer = false;
  I.keys = {};

  function applyKey(code, down) {
    I.keys[code] = down;
    var a = KEYMAP1[code];
    if (a) {
      if (dirs[a] !== undefined) dirs[a] = down ? 1 : 0;
      else I.p1.set(a, down);
    }
    if (I.twoPlayer) {
      var b = KEYMAP2[code];
      if (b) {
        if (dirs2[b] !== undefined) dirs2[b] = down ? 1 : 0;
        else I.p2.set(b, down);
      }
    }
  }

  /* ---------------------------------------------------------------- mouse */
  I.mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, right: false, locked: false };

  /* ---------------------------------------------------------------- touch */
  I.touch = { active: false, stick: { id: -1, cx: 0, cy: 0, x: 0, y: 0 } };

  I.init = function (canvas) {
    I.canvas = canvas;

    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
      /* While a menu is open the keyboard drives the menu, not the fighter. */
      if (C.UI && C.UI.current && C.UI.navKey(e.code)) { e.preventDefault(); return; }
      applyKey(e.code, true);
    }, { passive: false });

    window.addEventListener('keyup', function (e) { applyKey(e.code, false); });
    window.addEventListener('blur', function () {
      for (var k in I.keys) applyKey(k, false);
      I.p1.reset(); I.p2.reset();
    });

    canvas.addEventListener('mousedown', function (e) {
      if (e.button === 0) { I.mouse.down = true; I.p1.set('attack', true); }
      if (e.button === 2) { I.mouse.right = true; I.p1.set('ki', true); }
      if (e.button === 1) { I.p1.set('charge', true); e.preventDefault(); }
    });
    window.addEventListener('mouseup', function (e) {
      if (e.button === 0) { I.mouse.down = false; I.p1.set('attack', false); }
      if (e.button === 2) { I.mouse.right = false; I.p1.set('ki', false); }
      if (e.button === 1) I.p1.set('charge', false);
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('mousemove', function (e) {
      I.mouse.dx += e.movementX || 0;
      I.mouse.dy += e.movementY || 0;
      I.mouse.x = e.clientX; I.mouse.y = e.clientY;
    });
    canvas.addEventListener('wheel', function (e) {
      I.wheel = (I.wheel || 0) + Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('pointerdown', function () {
      if (C.UI && C.UI.navClear) C.UI.navClear();
    }, true);

    I.initTouch();
  };

  /* ------------------------------------------------------------ touch UI */
  I.initTouch = function () {
    var root = document.getElementById('touch');
    if (!root) return;
    I.touchRoot = root;

    var stick = document.getElementById('tStick');
    var knob = document.getElementById('tKnob');
    if (stick) {
      var maxR = 52;
      var onStart = function (e) {
        var t = e.changedTouches ? e.changedTouches[0] : e;
        var r = stick.getBoundingClientRect();
        I.touch.stick.id = t.identifier === undefined ? 'mouse' : t.identifier;
        I.touch.stick.cx = r.left + r.width / 2;
        I.touch.stick.cy = r.top + r.height / 2;
        move(t);
        e.preventDefault();
      };
      var move = function (t) {
        var dx = t.clientX - I.touch.stick.cx;
        var dy = t.clientY - I.touch.stick.cy;
        var d = Math.hypot(dx, dy);
        if (d > maxR) { dx *= maxR / d; dy *= maxR / d; }
        knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        I.p1.mx = dx / maxR;
        I.p1.my = -dy / maxR;
      };
      var onMove = function (e) {
        var list = e.changedTouches || [e];
        for (var i = 0; i < list.length; i++) {
          var t = list[i];
          var id = t.identifier === undefined ? 'mouse' : t.identifier;
          if (id === I.touch.stick.id) { move(t); e.preventDefault(); }
        }
      };
      var onEnd = function (e) {
        var list = e.changedTouches || [e];
        for (var i = 0; i < list.length; i++) {
          var id = list[i].identifier === undefined ? 'mouse' : list[i].identifier;
          if (id === I.touch.stick.id) {
            I.touch.stick.id = -1;
            I.p1.mx = I.p1.my = 0;
            knob.style.transform = 'translate(0,0)';
          }
        }
      };
      stick.addEventListener('touchstart', onStart, { passive: false });
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);
      stick.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', function (e) { if (I.touch.stick.id === 'mouse') move(e); });
      window.addEventListener('mouseup', onEnd);
    }

    /* every element with data-act works as a hold button */
    var btns = root.querySelectorAll('[data-act]');
    for (var i = 0; i < btns.length; i++) bindButton(btns[i]);
  };

  function bindButton(el) {
    var act = el.getAttribute('data-act');
    var press = function (e) {
      el.classList.add('on');
      I.p1.set(act, true);
      I.touch.active = true;
      if (e.cancelable) e.preventDefault();
    };
    var rel = function (e) {
      el.classList.remove('on');
      I.p1.set(act, false);
      if (e && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', rel, { passive: false });
    el.addEventListener('touchcancel', rel);
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', rel);
    el.addEventListener('mouseleave', rel);
  }
  I.bindButton = bindButton;

  I.showTouch = function (on) {
    if (!I.touchRoot) return;
    I.touchRoot.classList.toggle('show', !!on);
    I.touch.active = !!on;
  };

  /* -------------------------------------------------------------- gamepad */
  var padPrev = [{}, {}];

  var BTN = {
    0: 'attack', 1: 'ki', 2: 'guard', 3: 'charge',
    4: 'boost', 5: 'heavy', 6: 'down', 7: 'up',
    8: 'revert', 9: 'pause', 10: 'transform', 11: 'ult',
    12: 's1', 13: 's2', 14: 's3', 15: 's4', 16: 'pause'
  };

  I.pollGamepads = function () {
    if (!navigator.getGamepads) return;
    var gps = navigator.getGamepads();
    var used = 0;
    for (var g = 0; g < gps.length && used < 2; g++) {
      var gp = gps[g];
      if (!gp || !gp.connected) continue;
      var pad = I.pads[used];
      var prev = padPrev[used];
      used++;
      I.gamepadActive = true;

      var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) < 0.18) ax = 0;
      if (Math.abs(ay) < 0.18) ay = 0;
      if (ax || ay) { pad.mx = ax; pad.my = -ay; }
      var cx = gp.axes[2] || 0, cy = gp.axes[3] || 0;
      if (Math.abs(cx) > 0.18) pad.camX += cx * 0.045;
      if (Math.abs(cy) > 0.18) pad.camY += cy * 0.035;

      for (var b = 0; b < gp.buttons.length; b++) {
        var a = BTN[b];
        if (!a) continue;
        var down = gp.buttons[b].pressed || gp.buttons[b].value > 0.4;
        if (down !== prev[b]) { pad.set(a, down); prev[b] = down; }
      }
      /* d-pad may arrive as an axis on some pads */
      if (gp.axes.length > 9) {
        var h = gp.axes[9];
        if (h > -1.1 && h < 1.1) {
          var up = Math.abs(h + 1) < 0.1, right = Math.abs(h - (-0.43)) < 0.1;
          if (up !== prev.du) { pad.set('s1', up); prev.du = up; }
          if (right !== prev.dr) { pad.set('s2', right); prev.dr = right; }
        }
      }
    }
  };

  /* ------------------------------------------------------------- per frame */
  I.update = function () {
    I.pollGamepads();

    /* keyboard direction wins if any key is down */
    var kx = dirs.r - dirs.l, ky = dirs.f - dirs.b;
    if (kx || ky) {
      var l = Math.hypot(kx, ky);
      I.p1.mx = kx / l; I.p1.my = ky / l;
    } else if (!I.touch.active && !I.gamepadActive) {
      I.p1.mx = 0; I.p1.my = 0;
    } else if (I.touch.stick.id === -1 && !I.gamepadActive) {
      I.p1.mx = 0; I.p1.my = 0;
    }

    if (I.twoPlayer) {
      var k2x = dirs2.r - dirs2.l, k2y = dirs2.f - dirs2.b;
      if (k2x || k2y) {
        var l2 = Math.hypot(k2x, k2y);
        I.p2.mx = k2x / l2; I.p2.my = k2y / l2;
      } else if (!I.gamepadActive) { I.p2.mx = 0; I.p2.my = 0; }
    }

    /* mouse look feeds the camera offset */
    if (I.mouse.dx || I.mouse.dy) {
      I.p1.camX += I.mouse.dx * 0.0022 * C.S.sensitivity;
      I.p1.camY += I.mouse.dy * 0.0018 * C.S.sensitivity * (C.S.invertY ? -1 : 1);
      I.mouse.dx = I.mouse.dy = 0;
    }
  };

  I.endFrame = function () {
    I.p1.clearEdges();
    I.p2.clearEdges();
  };

  /* Which physical scheme is the player using right now? Drives the hints. */
  I.scheme = function () {
    if (I.touch.active) return 'touch';
    if (I.gamepadActive) return 'pad';
    return 'key';
  };

  I.HINTS = {
    key: [
      ['WASD', 'Move'], ['Space / C', 'Fly up / down'], ['Shift', 'Boost dash'],
      ['J', 'Punch & kick'], ['U', 'Heavy smash'], ['K', 'Ki blast'],
      ['L', 'Charge ki (hold)'], ['I', 'Guard (hold)'],
      ['1 2 3 4', 'Special moves'], ['5 or E', 'Ultimate'],
      ['O', 'Transform'], ['P', 'Power down'], ['M / Esc', 'Pause']
    ],
    pad: [
      ['Left stick', 'Move'], ['RT / LT', 'Fly up / down'], ['LB', 'Boost dash'],
      ['A', 'Punch & kick'], ['RB', 'Heavy smash'], ['B', 'Ki blast'],
      ['Y', 'Charge ki (hold)'], ['X', 'Guard (hold)'],
      ['D-pad', 'Special moves'], ['R3', 'Ultimate'],
      ['L3', 'Transform'], ['Back', 'Power down'], ['Start', 'Pause']
    ],
    touch: [
      ['Stick', 'Move'], ['▲ / ▼', 'Fly up / down'], ['BOOST', 'Dash'],
      ['PUNCH', 'Punch & kick'], ['SMASH', 'Heavy smash'], ['KI', 'Ki blast'],
      ['CHARGE', 'Hold to charge ki'], ['GUARD', 'Hold to block'],
      ['SP', 'Special moves'], ['ULT', 'Ultimate'], ['⚡', 'Transform']
    ]
  };

})(DBZ);
