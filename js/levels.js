/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — story mode and the other game modes

   Nine sagas, sixty-two fights, running from Raditz landing on Earth to the
   last stand in the Tournament of Power. Each fight names a suggested hero
   but never forces one: Cephas can walk any of the 79 fighters through any
   saga if he wants to see what happens.
   ==========================================================================*/
(function (C) {
  'use strict';

  var L = {};
  C.Levels = L;

  /* f(opponentId, stage, options) — one battle */
  function f(o) {
    return {
      foe: o.foe, stage: o.stage, form: o.form === undefined ? -1 : o.form,
      hero: o.hero || null, heroForm: o.heroForm,
      bump: o.bump || 0,                  /* difficulty tiers above the setting */
      hpFoe: o.hpFoe || 1, hpHero: o.hpHero || 1,
      title: o.title, intro: o.intro, win: o.win, lose: o.lose,
      rule: o.rule || null,               /* 'ringout' | 'timed' | 'survive' */
      time: o.time || 0, reward: o.reward || 220
    };
  }

  L.SAGAS = [
    {
      id: 'saiyan', name: 'Saiyan Saga', kanji: 'サイヤ人',
      blurb: 'A stranger lands on Earth and calls Goku by another name.',
      color: '#ff8a3d', icon: '☄',
      fights: [
        f({
          foe: 'raditz', stage: 'wasteland', hero: 'goku',
          title: 'The Brother From Nowhere',
          intro: "A pod cracks the earth open. The man who climbs out has a tail — and Goku's face in his memory.",
          win: 'Raditz is down. But he was the weakest of the three.',
          lose: 'Raditz drags you into the sky. Earth needs another plan.'
        }),
        f({
          foe: 'nappa', stage: 'wasteland', hero: 'goku', bump: 0,
          title: 'One Year Later',
          intro: 'Two more Saiyans arrive. The big one is smiling. That is never good.',
          win: 'Nappa hits the dirt. His prince is not impressed.',
          lose: 'Nappa laughs and looks around for something else to break.'
        }),
        f({
          foe: 'vegeta', stage: 'wasteland', hero: 'goku', bump: 1, hpFoe: 1.15,
          title: 'The Prince of All Saiyans',
          intro: "Vegeta has been fighting since he could walk. He has never once lost to a low-class warrior.",
          win: 'Vegeta crawls to his pod, swearing he will be back. He will.',
          lose: 'Vegeta stands over you. "Is that all Earth had?"'
        }),
        f({
          foe: 'vegeta', stage: 'wasteland', hero: 'goku', form: 0, bump: 1, hpFoe: 1.3,
          title: 'Kaio-ken Times Four',
          intro: 'He is not finished. Neither are you.',
          win: 'Earth holds. Barely.',
          lose: 'The planet goes quiet.', reward: 400
        })
      ]
    },
    {
      id: 'frieza', name: 'Frieza Saga', kanji: 'フリーザ',
      blurb: 'Namek has one hundred days of life left, and five minutes of it matter.',
      color: '#b46bff', icon: '👑',
      fights: [
        f({
          foe: 'dodoria', stage: 'namek', hero: 'gohan_kid',
          title: 'Landing on Namek',
          intro: "Frieza's men are already burning villages when you arrive.",
          win: 'Dodoria runs. He will not get far.',
          lose: 'You are outmatched. For now.'
        }),
        f({
          foe: 'zarbon', stage: 'namek', hero: 'vegeta',
          title: 'Something Beautiful',
          intro: 'Zarbon apologises in advance for what he is about to become.',
          win: 'The monster form was not enough.',
          lose: 'Zarbon dusts himself off and fixes his hair.'
        }),
        f({
          foe: 'recoome', stage: 'namek', hero: 'vegeta',
          title: 'The Ginyu Force Arrives',
          intro: 'They pose. They actually pose. And then Recoome breaks somebody.',
          win: 'RECOOOOME... is unconscious.',
          lose: 'Recoome announces his own victory. Loudly.'
        }),
        f({
          foe: 'ginyu', stage: 'namek', hero: 'goku', bump: 1,
          title: 'Captain Ginyu',
          intro: 'The captain has a trick, and it is not a punch.',
          win: 'Ginyu is beaten in a body he does not deserve.',
          lose: 'Ginyu grins with somebody else\'s face.'
        }),
        f({
          foe: 'frieza', stage: 'namek', hero: 'goku', form: 2, bump: 1, hpFoe: 1.2,
          title: 'The Emperor',
          intro: 'Frieza has not needed his final form in decades. He needs it now.',
          win: 'You have pushed the strongest being in the universe to his limit.',
          lose: 'Frieza tidies his sleeve.'
        }),
        f({
          foe: 'frieza', stage: 'namek', hero: 'goku', heroForm: 0, form: 3, bump: 2, hpFoe: 1.5,
          title: 'The Legend Awakens',
          intro: "Anger, sorrow, and a light no one on Namek has ever seen. Goku's hair goes gold.",
          win: 'Namek is finished. Frieza is finished. You are not.',
          lose: 'The legend stays a legend a little longer.', reward: 600
        })
      ]
    },
    {
      id: 'android', name: 'Android Saga', kanji: '人造人間',
      blurb: 'A boy from the future warns of two machines. He is wrong about which two.',
      color: '#59c8ff', icon: '⚙',
      fights: [
        f({
          foe: 'frieza', stage: 'city', hero: 'trunks', form: 4,
          title: 'A Purple-Haired Stranger',
          intro: 'Frieza returns to Earth with his father and a rebuilt body. He gets about ninety seconds.',
          win: 'The boy sheathes his sword and asks to speak with Goku.',
          lose: 'Frieza takes the planet after all.'
        }),
        f({
          foe: 'a19', stage: 'city', hero: 'goku', heroForm: 0,
          title: 'Not These Ones',
          intro: 'Two androids attack the city. Neither matches the warning.',
          win: 'Nineteen loses its hands and then its head.',
          lose: 'Nineteen drains you dry.'
        }),
        f({
          foe: 'gero', stage: 'wasteland', hero: 'piccolo',
          title: 'Doctor Gero',
          intro: 'Twenty years of hate wearing a lab coat and a mechanical body.',
          win: 'Gero flees toward his laboratory. Toward a worse idea.',
          lose: 'Gero returns to his lab to build something worse anyway.'
        }),
        f({
          foe: 'a18', stage: 'wasteland', hero: 'vegeta', heroForm: 0,
          title: 'Android 18',
          intro: 'Vegeta is Super Saiyan now. He is very keen to demonstrate.',
          win: 'Eighteen adjusts her jacket and calls it a draw.',
          lose: "Eighteen breaks the prince's arm and walks away bored."
        }),
        f({
          foe: 'a17', stage: 'wasteland', hero: 'piccolo', bump: 1,
          title: 'Android 17',
          intro: 'Piccolo has fused with Kami. It might just be enough.',
          win: 'Seventeen is stopped — but something is watching from the trees.',
          lose: 'Seventeen shrugs and looks for a faster car.'
        }),
        f({
          foe: 'a16', stage: 'wasteland', hero: 'goku', heroForm: 0, bump: 1,
          title: 'Sixteen Speaks',
          intro: 'The quiet one finally moves.',
          win: 'Sixteen stands down. He never wanted this.',
          lose: 'Sixteen completes his primary directive.', reward: 500
        })
      ]
    },
    {
      id: 'cell', name: 'Cell Saga', kanji: 'セル',
      blurb: 'Something crawled out of a basement laboratory with everyone\'s techniques.',
      color: '#63ff9a', icon: '🜃',
      fights: [
        f({
          foe: 'cell', stage: 'city', hero: 'piccolo',
          title: 'The Thing In The Tunnel',
          intro: 'It knows the Kamehameha. It knows the Special Beam Cannon. It knows your name.',
          win: 'Imperfect Cell retreats to find the androids.',
          lose: 'Cell absorbs another city block.'
        }),
        f({
          foe: 'cell', stage: 'wasteland', hero: 'vegeta', form: 0, heroForm: 0, bump: 1,
          title: 'Semi-Perfect',
          intro: 'Vegeta trained in a gravity chamber for this. Cell trained by eating people.',
          win: 'Semi-Perfect Cell is beaten — and then Vegeta lets him finish.',
          lose: 'Cell finds Eighteen anyway.'
        }),
        f({
          foe: 'cell_jr', stage: 'cellgames', hero: 'gohan', bump: 1,
          title: 'The Cell Juniors',
          intro: 'Seven little monsters, and everyone you love inside the ring with them.',
          win: 'The last Junior pops like a soap bubble.',
          lose: 'The Juniors keep giggling.'
        }),
        f({
          foe: 'cell', stage: 'cellgames', hero: 'goku', heroForm: 0, form: 1, bump: 1, hpFoe: 1.25,
          title: 'The Cell Games',
          intro: 'Perfect Cell has built a ring and invited the world to watch it end.',
          win: 'Goku steps back and calls out a name nobody expects.',
          lose: 'Cell bows to the cameras.'
        }),
        f({
          foe: 'cell', stage: 'cellgames', hero: 'gohan', heroForm: 1, form: 2, bump: 2, hpFoe: 1.5,
          title: 'Father-Son Kamehameha',
          intro: 'Gohan never wanted to fight. Cell made that irrelevant about ten seconds ago.',
          win: 'The beam takes Cell apart atom by atom. It is over.',
          lose: 'Cell wins, and takes the planet with him.', reward: 700
        })
      ]
    },
    {
      id: 'buu', name: 'Majin Buu Saga', kanji: '魔人ブウ',
      blurb: 'A wizard wakes something that has been sleeping since before the Kais.',
      color: '#ff7ad9', icon: '🧿',
      fights: [
        f({
          foe: 'dabura', stage: 'sacred', hero: 'gohan', heroForm: 1,
          title: 'The Demon King',
          intro: 'Babidi\'s champion turns people to stone. Try not to be people.',
          win: 'Dabura is beaten — but the seal is already breaking.',
          lose: 'Dabura spits, and you stop moving.'
        }),
        f({
          foe: 'vegeta', stage: 'wasteland', hero: 'goku', heroForm: 1, form: 1, bump: 1,
          title: 'Majin Vegeta',
          intro: 'Vegeta let the wizard in. He wanted this fight badly enough to sell his soul for it.',
          win: 'Vegeta smiles for the first time in years.',
          lose: 'The prince finally gets his win.'
        }),
        f({
          foe: 'buu_fat', stage: 'wasteland', hero: 'gotenks', heroForm: 1,
          title: 'Buu Wakes Up',
          intro: 'It looks like a pink balloon. It has erased galaxies.',
          win: 'Fat Buu is down. Something worse is climbing out of him.',
          lose: 'Buu turns you into a biscuit and eats you.'
        }),
        f({
          foe: 'buu_super', stage: 'city', hero: 'gotenks', heroForm: 2, bump: 1,
          title: 'Super Buu',
          intro: 'Gotenks has ten minutes and an unlimited supply of confidence.',
          win: 'Super Buu screams and starts absorbing.',
          lose: 'Buu adds two more fighters to his collection.'
        }),
        f({
          foe: 'buu_super', stage: 'sacred', hero: 'vegito', form: 0, bump: 2, hpFoe: 1.3,
          title: 'Vegito',
          intro: 'Two rivals put on matching earrings. The result is quite rude about it.',
          win: 'Buuhan is toyed with and taken apart.',
          lose: 'Even fusion was not enough.'
        }),
        f({
          foe: 'buu_kid', stage: 'sacred', hero: 'goku', heroForm: 2, bump: 2, hpFoe: 1.4,
          title: 'The Spirit Bomb',
          intro: 'The original Buu. Pure, small, and completely insane. Everyone on Earth, raise your hands.',
          win: 'The bomb lands. Buu is gone. Ask for a better rematch in ten years.',
          lose: 'Kid Buu blows up another planet out of boredom.', reward: 800
        })
      ]
    },
    {
      id: 'movies', name: 'Movie Legends', kanji: '劇場版',
      blurb: 'Threats that never made the history books, and one that made a legend.',
      color: '#ffb545', icon: '🎬',
      fights: [
        f({
          foe: 'garlic_jr', stage: 'islands', hero: 'gohan_kid',
          title: 'The Dead Zone',
          intro: 'An immortal with a grudge and a hole in reality.',
          win: 'Garlic Jr. falls into his own Dead Zone. Again.',
          lose: 'The Dead Zone closes over Earth.'
        }),
        f({
          foe: 'turles', stage: 'city', hero: 'goku', heroForm: 0,
          title: 'The Tree of Might',
          intro: 'He has your face and a tree that drinks planets.',
          win: 'Turles goes into the tree he planted.',
          lose: 'The fruit ripens.'
        }),
        f({
          foe: 'lord_slug', stage: 'city', hero: 'goku', heroForm: 0,
          title: 'Lord Slug',
          intro: 'A Super Namekian who freezes worlds for fun. He also grows.',
          win: 'The giant falls into the sun. Poetic.',
          lose: 'Earth becomes a very cold flowerpot.'
        }),
        f({
          foe: 'cooler', stage: 'namek', hero: 'goku', heroForm: 0, form: 0, bump: 1,
          title: "Cooler's Revenge",
          intro: "Frieza had a brother. He is not here about family.",
          win: 'Cooler burns up on re-entry. He will be back as metal.',
          lose: 'Cooler finishes what his brother started.'
        }),
        f({
          foe: 'bojack', stage: 'tournament', hero: 'gohan', heroForm: 1,
          title: 'Bojack Unbound',
          intro: 'A galactic pirate freed from a star. He brought friends.',
          win: 'Bojack is unbound no longer.',
          lose: 'The galaxy changes management.'
        }),
        f({
          foe: 'janemba', stage: 'hell', hero: 'gogeta', bump: 2, hpFoe: 1.2,
          title: 'Fusion Reborn',
          intro: 'Hell has burst its seams and taken a shape that giggles.',
          win: 'Gogeta erases Janemba with one clean punch.',
          lose: 'Hell keeps expanding.'
        }),
        f({
          foe: 'broly', stage: 'vegeta', hero: 'goku', heroForm: 2, form: 0, bump: 2, hpFoe: 1.6,
          title: 'The Legendary Super Saiyan',
          intro: 'He has been screaming one word since he was an infant. It is your name.',
          win: 'The legend is put down. For now.',
          lose: 'KAKAROT.', reward: 900
        })
      ]
    },
    {
      id: 'gt', name: 'Dragon Ball GT', kanji: 'GT',
      blurb: 'A careless wish shrinks Goku, and a century of wishes comes due.',
      color: '#ff4d5a', icon: '🐉',
      fights: [
        f({
          foe: 'baby_vegeta', stage: 'city', hero: 'goku_gt', heroForm: 2,
          title: 'Baby',
          intro: 'The last Tuffle is wearing the Prince of all Saiyans like a suit.',
          win: 'Baby is driven out — straight toward the sun.',
          lose: 'The Tuffle empire returns.'
        }),
        f({
          foe: 'baby_vegeta', stage: 'vegeta', hero: 'goku_gt', heroForm: 3, form: 0, bump: 1, hpFoe: 1.35,
          title: 'Super Saiyan 4',
          intro: 'Goku looks at the false moon and finds a form nobody has ever reached.',
          win: 'Super Saiyan 4 is real, and Baby is finished.',
          lose: 'Baby laughs with Vegeta\'s mouth.'
        }),
        f({
          foe: 'super17', stage: 'hell', hero: 'goku_gt', heroForm: 3, bump: 1,
          title: 'Super 17',
          intro: 'Two Seventeens, fused in Hell, eating every energy attack you throw.',
          win: 'Seventeen absorbs one blast too many and bursts.',
          lose: 'Seventeen keeps growing.'
        }),
        f({
          foe: 'omega_shenron', stage: 'city', hero: 'goku_gt', heroForm: 3, bump: 2, hpFoe: 1.4,
          title: 'The Shadow Dragons',
          intro: 'Every wish ever made on the Dragon Balls, come back to collect.',
          win: 'Omega Shenron is beaten — but Goku is spent.',
          lose: 'Omega Shenron settles in for a long reign.'
        }),
        f({
          foe: 'omega_shenron', stage: 'city', hero: 'gogeta_ssj4', bump: 2, hpFoe: 1.5,
          title: 'Gogeta Super Saiyan 4',
          intro: 'Ten minutes. That is all the fusion lasts. It should be plenty.',
          win: 'The negative energy is burned out of the world.',
          lose: 'The fusion runs out of time.', reward: 900
        })
      ]
    },
    {
      id: 'super', name: 'Dragon Ball Super', kanji: '超',
      blurb: 'Gods wake up, and the ceiling turns out to be much, much higher.',
      color: '#37b8ff', icon: '⚡',
      fights: [
        f({
          foe: 'beerus', stage: 'islands', hero: 'goku', heroForm: 2, bump: 1,
          title: 'Battle of Gods',
          intro: 'A God of Destruction has come a very long way to ask about a Super Saiyan God.',
          win: 'Beerus is impressed. That is nearly unheard of.',
          lose: 'Beerus taps you twice and goes back to bed.'
        }),
        f({
          foe: 'frieza', stage: 'islands', hero: 'goku', heroForm: 4, form: 4, bump: 1, hpFoe: 1.2,
          title: 'Resurrection F',
          intro: 'Frieza trained. For four months. For the first time in his life.',
          win: 'Golden Frieza runs out of stamina, exactly as predicted.',
          lose: 'Frieza destroys the Earth out of spite.'
        }),
        f({
          foe: 'hit', stage: 'top', hero: 'goku', heroForm: 4, bump: 1,
          title: 'The Universe 6 Tournament',
          intro: 'A legendary assassin who steals tenths of a second and hides in them.',
          win: 'Hit nods once. From him that is a standing ovation.',
          lose: 'You never see the punch that lands.'
        }),
        f({
          foe: 'goku_black', stage: 'city', hero: 'trunks', heroForm: 2, form: 0, bump: 1,
          title: 'Goku Black',
          intro: 'A future burned to ash by something wearing a very familiar face.',
          win: 'Black is driven back through time.',
          lose: 'The future stays dead.'
        }),
        f({
          foe: 'zamasu', stage: 'city', hero: 'vegito', form: -1, heroForm: 4, bump: 2, hpFoe: 1.35,
          title: 'Fused Zamasu',
          intro: 'An immortal god fused with a stolen body. There is no way to kill this. Only to outlast it.',
          win: 'Zamasu comes apart at the seams of his own perfection.',
          lose: 'The Zero Mortals Plan proceeds.'
        }),
        f({
          foe: 'kefla', stage: 'top', hero: 'goku', heroForm: 5, bump: 2,
          title: 'Tournament of Power: Kefla',
          intro: 'Two Saiyans fused into one very enthusiastic problem.',
          win: 'One blast through the middle. Kefla is out.',
          lose: 'Kefla knocks you off the platform.',
          rule: 'ringout'
        }),
        f({
          foe: 'jiren', stage: 'top', hero: 'goku', heroForm: 6, bump: 3, hpFoe: 1.7,
          title: 'Jiren',
          intro: 'The strongest mortal in the twelve universes. Ultra Instinct, or nothing.',
          win: 'Universe 7 survives. Somehow. Again.',
          lose: 'Ten universes go quiet.', reward: 1200
        })
      ]
    },
    {
      id: 'legend', name: 'Legend of Cephas', kanji: '伝説',
      blurb: 'The gauntlet. Everything the multiverse has left, one after another.',
      color: '#ffe14d', icon: '★',
      fights: [
        f({
          foe: 'broly_dbs', stage: 'vegeta', form: 1, bump: 2, hpFoe: 1.3,
          title: 'The Wrath of Broly',
          intro: 'The one who never learned to stop.',
          win: 'The screaming finally stops.', lose: 'It does not stop.'
        }),
        f({
          foe: 'moro', stage: 'sacred', bump: 2, hpFoe: 1.3,
          title: 'The Planet Eater',
          intro: 'Ten million years old, and hungry.',
          win: 'Moro is sealed away again.', lose: 'Another world goes dark.'
        }),
        f({
          foe: 'gas', stage: 'top', bump: 3, hpFoe: 1.4,
          title: 'The Strongest In The Universe',
          intro: 'A Dragon granted him the title. Take it from him.',
          win: 'The wish is broken.', lose: 'The title stands.'
        }),
        f({
          foe: 'whis', stage: 'sacred', bump: 4, hpFoe: 1.8,
          title: 'The Angel',
          intro: 'Nobody has ever landed a clean hit on Whis. Nobody.',
          win: 'Whis smiles and checks his watch. You did land one.',
          lose: 'He was not even holding the staff properly.', reward: 2000
        })
      ]
    }
  ];

  L.byId = {};
  L.SAGAS.forEach(function (s, i) { s.index = i; L.byId[s.id] = s; });

  L.totalFights = L.SAGAS.reduce(function (n, s) { return n + s.fights.length; }, 0);

  /* ---------------------------------------------------------------- modes */
  L.MODES = [
    {
      id: 'story', name: 'Story Mode', kanji: '物語', icon: '📖',
      blurb: 'Nine sagas from Raditz to Jiren. ' + L.totalFights + ' fights.'
    },
    {
      id: 'versus', name: 'Versus CPU', kanji: '対戦', icon: '⚔',
      blurb: 'Any fighter, any stage, any difficulty.'
    },
    {
      id: 'twoplayer', name: '2 Players', kanji: '二人', icon: '👥',
      blurb: 'Split screen on one keyboard, or two gamepads.'
    },
    {
      id: 'tournament', name: 'World Tournament', kanji: '天下一', icon: '🏆',
      blurb: 'An eight-fighter bracket. Win three fights to take the title.'
    },
    {
      id: 'survival', name: 'Survival', kanji: '生存', icon: '∞',
      blurb: 'Endless opponents, one health bar. How far can you get?'
    },
    {
      id: 'training', name: 'Training', kanji: '修行', icon: '🎯',
      blurb: 'No timer, no defeat. Learn every move at your own pace.'
    }
  ];

  /* ------------------------------------------------------------- progress */
  L.cleared = function (sagaId, idx) {
    var p = C.P.story[sagaId];
    return !!(p && p.cleared && p.cleared.indexOf(idx) >= 0);
  };

  L.clearFight = function (sagaId, idx, reward) {
    var P = C.P;
    var p = P.story[sagaId] || (P.story[sagaId] = { cleared: [] });
    if (!p.cleared) p.cleared = [];
    if (p.cleared.indexOf(idx) < 0) {
      p.cleared.push(idx);
      P.zeni += reward || 200;
    }
    C.save();
  };

  L.sagaProgress = function (sagaId) {
    var s = L.byId[sagaId];
    var p = C.P.story[sagaId];
    var n = (p && p.cleared) ? p.cleared.length : 0;
    return { done: n, total: s.fights.length, pct: n / s.fights.length };
  };

  /* A saga unlocks when the one before it is half finished — generous on
     purpose, so nobody gets stuck on one hard fight.                    */
  L.sagaUnlocked = function (idx) {
    if (idx === 0) return true;
    var prev = L.SAGAS[idx - 1];
    return L.sagaProgress(prev.id).pct >= 0.5;
  };

  L.totalCleared = function () {
    var n = 0;
    L.SAGAS.forEach(function (s) { n += L.sagaProgress(s.id).done; });
    return n;
  };

  /* ------------------------------------------------------------- survival */
  L.survivalFoe = function (round, rng) {
    var pool = C.Roster.list.filter(function (c) { return c.tier <= 2 + Math.floor(round / 3); });
    if (!pool.length) pool = C.Roster.list;
    var c = pool[Math.floor(rng() * pool.length)];
    var formIdx = -1;
    var maxForm = Math.min(c.forms.length - 1, Math.floor((round - 1) / 4));
    if (maxForm >= 0 && rng() < 0.55) formIdx = Math.floor(rng() * (maxForm + 1));
    var diffBump = Math.floor(round / 4);
    return {
      foe: c.id, form: formIdx, bump: diffBump,
      hpFoe: 1 + round * 0.045,
      stage: C.STAGES[Math.floor(rng() * C.STAGES.length)].id
    };
  };

  /* ----------------------------------------------------------- tournament */
  L.makeBracket = function (playerId, rng) {
    var pool = C.Roster.list.filter(function (c) { return c.id !== playerId && c.tier >= 2; });
    M.shuffleArr(pool, rng);
    var foes = pool.slice(0, 7);
    return {
      round: 0,
      entrants: [playerId].concat(foes.map(function (c) { return c.id; })),
      results: []
    };
  };

  var M = C.M;
  M.shuffleArr = function (arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

})(DBZ);
