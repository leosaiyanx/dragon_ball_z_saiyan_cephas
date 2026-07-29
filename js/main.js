/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — boot
   ==========================================================================*/
(function (C) {
  'use strict';

  function boot() {
    var bootEl = document.getElementById('boot');
    var bar = document.getElementById('bootBar').firstElementChild;
    var text = document.getElementById('bootText');

    var steps = [
      ['Waking the Dragon Balls', function () { C.load(); }],
      ['Gathering fighters', function () { /* roster.js already ran */ }],
      ['Lighting the arenas', function () { C.UI.mount(); }],
      ['Charging ki', function () { C.Game.init(document.getElementById('gl')); }],
      ['Ready', function () { }]
    ];

    var i = 0;
    function step() {
      if (i >= steps.length) { finish(); return; }
      text.textContent = steps[i][0];
      bar.style.width = ((i + 1) / steps.length * 100) + '%';
      try { steps[i][1](); }
      catch (e) {
        console.error('boot step failed:', steps[i][0], e);
        text.textContent = 'Something went wrong: ' + (e && e.message);
        text.style.color = '#ff8a8a';
        return;
      }
      i++;
      setTimeout(step, 90);
    }

    function finish() {
      bootEl.classList.add('gone');
      setTimeout(function () { bootEl.style.display = 'none'; }, 550);
      C.UI.title(C.Game);
      C.Game.previewCharacter(C.Roster.get(C.load().lastUsed || 'goku'));

      /* deep links: ?char=goku&stage=namek&mode=versus
         ?screen=<id> jumps straight to a menu screen, which is how the
         screenshot tooling checks menu layout without clicking through. */
      var q = C.qs;
      if (q.screen) {
        setTimeout(function () {
          var G = C.Game, U = C.UI;
          var jump = {
            title: function () { U.title(G); },
            modes: function () { U.modes(G); },
            story: function () { U.story(G); },
            fights: function () { U.fights(G, C.Levels.SAGAS[0]); },
            select: function () { U.select(G, { browse: true }); },
            pick: function () { G.pickMode('versus'); },
            stage: function () { U.stage(G, function () { }, function () { }); },
            settings: function () { U.settings(G); },
            controls: function () { U.controls(G); },
            pause: function () { U.pause(G); }
          };
          (jump[q.screen] || jump.title)();
        }, 320);
        return;
      }
      if (q.mode || q.char) {
        setTimeout(function () {
          if (q.mode === 'story') { C.UI.story(C.Game); return; }
          var cfg = C.Game.defaultConfig();
          if (q.char) cfg.p1.id = q.char;
          if (q.foe) cfg.p2.id = q.foe;
          if (q.stage) cfg.stage = q.stage;
          if (q.diff) cfg.difficulty = q.diff;
          if (q.form) cfg.p1.form = parseInt(q.form, 10);
          if (q.foeform) cfg.p2.form = parseInt(q.foeform, 10);
          if (q.mode === 'versus' || q.char) C.Game.startMatch(cfg);
        }, 400);
      }
    }

    step();
  }

  /* first gesture unlocks audio on every browser that matters */
  function armAudio() {
    var go = function () {
      C.Audio.resume();
      C.Audio.setVolumes();
      if (C.Game.state === 'menu') C.Audio.music('menu');
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
      window.removeEventListener('touchstart', go);
    };
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
    window.addEventListener('touchstart', go);
  }

  /* offline support — only on a real https origin so local dev never fights
     a stale cache */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }

  /* stop iOS Safari from bouncing the page while you play */
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

  window.addEventListener('error', function (e) {
    var t = document.getElementById('bootText');
    if (t && !document.getElementById('boot').classList.contains('gone')) {
      t.textContent = 'Error: ' + (e.message || 'unknown');
      t.style.color = '#ff8a8a';
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { armAudio(); boot(); registerSW(); });
  } else { armAudio(); boot(); registerSW(); }

})(DBZ);
