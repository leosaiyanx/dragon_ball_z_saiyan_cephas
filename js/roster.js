/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — the roster
   Every fighter across Dragon Ball Z, GT, Super and the movies.

   Nothing here is art: a character is a bag of numbers that js/fighter.js
   turns into a mesh and js/moves.js turns into a moveset. Appearance is
   composed from `hair`, `head` and `fit` (outfit) descriptors so ~100 named
   fighters all read differently on screen with zero downloaded assets.
   ==========================================================================*/
(function (C) {
  'use strict';

  var R = {};
  C.Roster = R;

  /* ---- skin tones and common colours -------------------------------- */
  var SK = {
    light: 0xf6cfa8, tan: 0xe8b183, deep: 0x8a5a34, pale: 0xf2e2cf,
    green: 0x6fbf4a, dgreen: 0x3f8f43, pink: 0xff8fb8, hotpink: 0xf25f9c,
    white: 0xf0f4ff, grey: 0xb9c2cc, blue: 0x7fb6ff, purple: 0xa87ad6,
    red: 0xd8483f, teal: 0x59c4b8, yellow: 0xf2d24b, mag: 0xc0559a,
    ice: 0xe9f2ff, ashen: 0x9aa4ae, tuffle: 0xf0c9a0, demon: 0xb02a2a,
    cat: 0xb9a7ea, orange: 0xf29a4a, cereal: 0xd9a06a, saiyanGrey: 0xd8d8d8
  };
  R.SK = SK;

  /* ---- the four move archetypes plus flavours (mechanics in moves.js) - */
  function beam(name, color, o) { return Object.assign({ arch: 'beam', name: name, color: color }, o || {}); }
  function sphere(name, color, o) { return Object.assign({ arch: 'sphere', name: name, color: color }, o || {}); }
  function barrage(name, color, o) { return Object.assign({ arch: 'barrage', name: name, color: color }, o || {}); }
  function disc(name, color, o) { return Object.assign({ arch: 'disc', name: name, color: color }, o || {}); }
  function rush(name, color, o) { return Object.assign({ arch: 'rush', name: name, color: color }, o || {}); }
  function nova(name, color, o) { return Object.assign({ arch: 'nova', name: name, color: color }, o || {}); }
  function swarm(name, color, o) { return Object.assign({ arch: 'swarm', name: name, color: color }, o || {}); }
  function buff(name, color, o) { return Object.assign({ arch: 'buff', name: name, color: color }, o || {}); }
  function trick(name, color, o) { return Object.assign({ arch: 'trick', name: name, color: color }, o || {}); }
  R.beam = beam; R.sphere = sphere; R.barrage = barrage; R.disc = disc;
  R.rush = rush; R.nova = nova; R.swarm = swarm; R.buff = buff; R.trick = trick;

  /* ---- hair presets --------------------------------------------------- */
  /* style: spiky | mane | bob | flat | bald | tuft
     n spikes, len length, lift how far the spikes point up, back = trailing
     mane, bang = forehead fringe, wide = crown radius scale               */
  function hair(o) {
    return Object.assign({
      style: 'spiky', n: 9, len: 0.30, lift: 0.35, spread: 1, back: 0,
      bang: 0.6, wide: 1, color: 0x1a1512, tip: null, thick: 1, part: 0
    }, o || {});
  }
  R.hair = hair;

  var HAIR = {
    goku: hair({ n: 11, len: 0.36, lift: 0.30, bang: 0.85, back: 0.16, color: 0x141010 }),
    gokuSSJ: hair({ n: 11, len: 0.42, lift: 0.78, bang: 0.30, back: 0.10, color: 0xffe04a, tip: 0xfff6b0 }),
    vegeta: hair({ style: 'flame', n: 8, len: 0.44, lift: 0.92, bang: 0.05, color: 0x14100e, part: 1 }),
    gohanKid: hair({ style: 'bob', n: 8, len: 0.16, lift: 0.05, bang: 0.9, wide: 1.04, color: 0x141010 }),
    gohanTeen: hair({ n: 10, len: 0.24, lift: 0.42, bang: 0.6, color: 0x141010 }),
    goten: hair({ n: 10, len: 0.30, lift: 0.24, bang: 0.8, back: 0.12, color: 0x141010 }),
    trunks: hair({ style: 'bob', n: 9, len: 0.20, lift: 0.10, bang: 0.85, color: 0xb489e6 }),
    trunksSpiky: hair({ n: 10, len: 0.30, lift: 0.55, bang: 0.4, color: 0xb489e6 }),
    raditz: hair({ style: 'mane', n: 12, len: 0.34, lift: 0.24, back: 1.55, bang: 0.5, color: 0x141010 }),
    nappa: hair({ style: 'bald', n: 0 }),
    bardock: hair({ n: 11, len: 0.32, lift: 0.42, bang: 0.55, back: 0.12, color: 0x141010 }),
    turles: hair({ n: 12, len: 0.36, lift: 0.20, bang: 0.9, back: 0.30, color: 0x141010 }),
    broly: hair({ style: 'mane', n: 13, len: 0.36, lift: 0.30, back: 0.85, bang: 0.4, color: 0x141010, thick: 1.25 }),
    brolyLSSJ: hair({ style: 'mane', n: 13, len: 0.42, lift: 0.80, back: 0.55, bang: 0.15, color: 0xd9f24a, tip: 0xf4ffb8, thick: 1.3 }),
    ssj3: hair({ style: 'mane', n: 14, len: 0.30, lift: 0.55, back: 2.35, bang: 0.0, color: 0xffe04a, tip: 0xfff6b0, thick: 1.15 }),
    ssj4: hair({ style: 'mane', n: 12, len: 0.40, lift: 0.42, back: 1.0, bang: 0.5, color: 0x141010, thick: 1.15 }),
    krillin: hair({ style: 'bald', n: 0 }),
    yamcha: hair({ n: 9, len: 0.20, lift: 0.30, bang: 0.7, back: 0.35, color: 0x141010 }),
    tien: hair({ style: 'bald', n: 0 }),
    chiaotzu: hair({ style: 'flat', n: 6, len: 0.10, lift: 0, bang: 0.9, color: 0x141010 }),
    roshi: hair({ style: 'bald', n: 0 }),
    piccolo: hair({ style: 'bald', n: 0 }),
    a17: hair({ style: 'bob', n: 9, len: 0.22, lift: 0.12, bang: 0.8, color: 0x1c1a26 }),
    a18: hair({ style: 'bob', n: 9, len: 0.20, lift: 0.10, bang: 0.9, color: 0xf0d97a, part: 1 }),
    a16: hair({ style: 'flat', n: 7, len: 0.12, lift: 0.5, bang: 0.2, color: 0xe2612d }),
    gero: hair({ style: 'mane', n: 7, len: 0.16, lift: 0.05, back: 0.5, bang: 0.3, color: 0xf0f0f0 }),
    cell: hair({ style: 'bald', n: 0 }),
    buu: hair({ style: 'bald', n: 0 }),
    zarbon: hair({ style: 'mane', n: 6, len: 0.18, lift: 0.05, back: 1.7, bang: 0.4, color: 0x2f8f6a }),
    dodoria: hair({ style: 'bald', n: 0 }),
    ginyu: hair({ style: 'bald', n: 0 }),
    recoome: hair({ style: 'flat', n: 8, len: 0.20, lift: 0.35, bang: 0.15, color: 0xe07a2a }),
    burter: hair({ style: 'bald', n: 0 }),
    jeice: hair({ style: 'mane', n: 9, len: 0.24, lift: 0.10, back: 1.15, bang: 0.3, color: 0xf5f0ea }),
    guldo: hair({ style: 'bald', n: 0 }),
    frieza: hair({ style: 'bald', n: 0 }),
    beerus: hair({ style: 'bald', n: 0 }),
    whis: hair({ style: 'flat', n: 6, len: 0.14, lift: 0.55, bang: 0.1, color: 0xf2f6ff }),
    hit: hair({ n: 7, len: 0.16, lift: 0.75, bang: 0.05, color: 0x2a1f2e }),
    jiren: hair({ style: 'bald', n: 0 }),
    toppo: hair({ style: 'flat', n: 5, len: 0.12, lift: 0.3, bang: 0.2, color: 0x2a2a2a }),
    dyspo: hair({ style: 'bald', n: 0 }),
    kefla: hair({ style: 'mane', n: 12, len: 0.30, lift: 0.55, back: 1.1, bang: 0.3, color: 0x141010 }),
    caulifla: hair({ style: 'mane', n: 11, len: 0.26, lift: 0.60, back: 0.9, bang: 0.2, color: 0x141010 }),
    kale: hair({ style: 'mane', n: 8, len: 0.18, lift: 0.05, back: 1.4, bang: 0.6, color: 0x141010 }),
    cabba: hair({ n: 10, len: 0.22, lift: 0.40, bang: 0.6, color: 0x141010 }),
    zamasu: hair({ style: 'flame', n: 6, len: 0.26, lift: 0.85, bang: 0.05, color: 0xf2f6ff }),
    black: hair({ n: 11, len: 0.34, lift: 0.30, bang: 0.85, back: 0.14, color: 0x141010 }),
    videl: hair({ style: 'bob', n: 8, len: 0.18, lift: 0.05, bang: 0.85, back: 0.55, color: 0x141010 }),
    satan: hair({ style: 'mane', n: 12, len: 0.24, lift: 0.42, back: 0.35, bang: 0.3, color: 0x2a1a12, thick: 1.5 }),
    pan: hair({ style: 'bob', n: 8, len: 0.16, lift: 0.06, bang: 0.9, color: 0x141010 }),
    uub: hair({ style: 'flame', n: 5, len: 0.22, lift: 0.85, bang: 0.05, color: 0x141010 }),
    baby: hair({ style: 'flat', n: 6, len: 0.14, lift: 0.4, bang: 0.4, color: 0x9a6ad8 }),
    bojack: hair({ style: 'flame', n: 7, len: 0.30, lift: 0.9, bang: 0.05, color: 0xe2612d }),
    omega: hair({ style: 'bald', n: 0 }),
    dabura: hair({ style: 'bald', n: 0 }),
    janemba: hair({ style: 'flame', n: 6, len: 0.26, lift: 0.9, bang: 0.05, color: 0xffd24a }),
    moro: hair({ style: 'mane', n: 6, len: 0.14, lift: 0, back: 1.2, bang: 0.2, color: 0xf0f0f0 }),
    granolah: hair({ n: 8, len: 0.18, lift: 0.35, bang: 0.5, color: 0xf5f0ea }),
    gas: hair({ style: 'mane', n: 8, len: 0.20, lift: 0.10, back: 1.3, bang: 0.4, color: 0xf5f0ea }),
    supremeKai: hair({ style: 'flame', n: 5, len: 0.20, lift: 0.8, bang: 0.05, color: 0xf2f6ff }),
    chichi: hair({ style: 'bob', n: 8, len: 0.16, lift: 0.05, bang: 0.9, back: 0.4, color: 0x141010 }),
    tapion: hair({ style: 'mane', n: 8, len: 0.20, lift: 0.15, back: 0.9, bang: 0.6, color: 0xe2612d }),
    cooler: hair({ style: 'bald', n: 0 }),
    frost: hair({ style: 'bald', n: 0 })
  };
  R.HAIR = HAIR;

  /* ---- outfits -------------------------------------------------------- */
  /* kind: gi | armor | namek | bio | jacket | robe | bare | tourney | demon */
  function fit(kind, c1, c2, c3, o) {
    return Object.assign({ kind: kind, c1: c1, c2: c2, c3: c3 }, o || {});
  }
  R.fit = fit;

  /* ============================ THE ROSTER ============================= */
  /* Compact rows. `mk` fills in every default so a line stays readable.   */
  var LIST = [];

  function mk(o) {
    var d = {
      id: o.id,
      name: o.name,
      short: o.short || o.name,
      race: o.race || 'Saiyan',
      era: o.era || 'Z',                    /* Z | GT | Super | Movie | DB */
      saga: o.saga || '',
      /* combat stats, 1..10, normalised into real numbers by fighter.js */
      pwr: o.pwr || 5, spd: o.spd || 5, def: o.def || 5, ki: o.ki || 5, tec: o.tec || 5,
      /* body */
      h: o.h || 1, bulk: o.bulk || 1, fem: o.fem || 0,
      skin: o.skin === undefined ? SK.light : o.skin,
      skin2: o.skin2 === undefined ? null : o.skin2,
      eye: o.eye === undefined ? 0x1d2733 : o.eye,
      hair: o.hair || HAIR.goku,
      head: o.head || {},
      fit: o.fit || fit('gi', 0xf07a1e, 0x1f4bd8, 0xf2e7c8),
      tail: !!o.tail,
      aura: o.aura === undefined ? 0x6fd8ff : o.aura,
      /* moves */
      s1: o.s1, s2: o.s2, s3: o.s3, s4: o.s4, ult: o.ult,
      /* transformations, in order */
      forms: o.forms || [],
      /* flavour */
      quip: o.quip || '',
      bio: o.bio || '',
      tier: o.tier || 3,                    /* 1 easy .. 5 monstrous  */
      unlock: o.unlock === undefined ? true : o.unlock,
      cost: o.cost || 0
    };
    LIST.push(d);
    return d;
  }
  R.mk = mk;

  /* a transformation: multiplies stats, restyles hair/aura, drains ki */
  function form(o) {
    return Object.assign({
      id: o.id, name: o.name, kanji: o.kanji || '',
      pwr: 1.15, spd: 1.1, def: 1.08, kiDrain: 3.5, cost: 25,
      hair: null, aura: 0xffe14d, glow: 0.55, eye: null, skin: null,
      bulk: 1, h: 1, sparks: 0, cry: 'kiai'
    }, o);
  }
  R.form = form;

  /* shared transformation chains ------------------------------------- */
  function ssjChain(base, opts) {
    opts = opts || {};
    var chain = [];
    chain.push(form({
      id: 'ssj', name: 'Super Saiyan', kanji: '超', hair: opts.ssjHair || HAIR.gokuSSJ,
      aura: 0xffd83a, pwr: 1.42, spd: 1.24, def: 1.16, cost: 22, kiDrain: 3.0,
      eye: 0x4fd4a8, bulk: 1.05, glow: 0.7
    }));
    if (opts.two !== false) chain.push(form({
      id: 'ssj2', name: 'Super Saiyan 2', kanji: '超弐', hair: opts.ssjHair || HAIR.gokuSSJ,
      aura: 0xffe14d, pwr: 1.78, spd: 1.44, def: 1.28, cost: 40, kiDrain: 5.0,
      eye: 0x4fd4a8, bulk: 1.08, sparks: 1, glow: 0.85
    }));
    if (opts.three) chain.push(form({
      id: 'ssj3', name: 'Super Saiyan 3', kanji: '超参', hair: HAIR.ssj3,
      aura: 0xffe97a, pwr: 2.15, spd: 1.55, def: 1.34, cost: 62, kiDrain: 11.0,
      eye: 0x4fd4a8, bulk: 1.12, sparks: 1.4, glow: 1.0, noBrow: true
    }));
    return chain;
  }
  R.ssjChain = ssjChain;

  var GOD = form({
    id: 'god', name: 'Super Saiyan God', kanji: '神', pwr: 2.35, spd: 1.72, def: 1.42,
    cost: 55, kiDrain: 6.5, aura: 0xff4d7a, hair: hair({ n: 10, len: 0.30, lift: 0.22, bang: 0.85, color: 0xff4d7a, tip: 0xff9ec2 }),
    eye: 0xff4d7a, glow: 0.9
  });
  var BLUE = form({
    id: 'blue', name: 'Super Saiyan Blue', kanji: '青', pwr: 2.75, spd: 1.95, def: 1.55,
    cost: 70, kiDrain: 8.0, aura: 0x37b8ff, hair: hair({ n: 11, len: 0.40, lift: 0.72, bang: 0.30, color: 0x2fa8ff, tip: 0xc0ecff }),
    eye: 0x2fa8ff, glow: 1.05, sparks: 0.7
  });

  /* ============================== SAIYANS ============================== */

  mk({
    id: 'goku', name: 'Son Goku', race: 'Saiyan', era: 'Z', saga: 'Saiyan Saga',
    pwr: 8, spd: 8, def: 7, ki: 9, tec: 8, tier: 4,
    hair: HAIR.goku, tail: false, aura: 0x8fe4ff,
    fit: fit('gi', 0xf2761b, 0x1f4bd8, 0xf4ead2, { belt: 0x1f4bd8, kanji: '悟' }),
    s1: beam('Kamehameha', 0x6fd8ff, { charge: 1.0, dmg: 900 }),
    s2: rush('Meteor Combination', 0xfff0a0, { hits: 9 }),
    s3: trick('Instant Transmission', 0x9fe8ff, { mode: 'blink' }),
    s4: nova('Kaio-ken Burst', 0xff3b3b, { dmg: 520 }),
    ult: sphere('Spirit Bomb', 0x8fe4ff, { charge: 2.4, dmg: 3200, radius: 14, sky: true }),
    forms: ssjChain('goku', { three: true }).concat([GOD, BLUE, form({
      id: 'ui', name: 'Ultra Instinct', kanji: '極', pwr: 3.4, spd: 2.6, def: 1.9,
      cost: 95, kiDrain: 13, aura: 0xd8e6ff,
      hair: hair({ n: 11, len: 0.36, lift: 0.30, bang: 0.8, color: 0xd8e6ff, tip: 0xffffff }),
      eye: 0xc8d8ff, glow: 1.4, sparks: 0.4, dodge: 0.55
    })]),
    quip: "Let's see what you've got!",
    bio: 'Raised on Earth, born on Vegeta. The best fight always finds him.'
  });

  mk({
    id: 'vegeta', name: 'Vegeta', race: 'Saiyan', era: 'Z', saga: 'Saiyan Saga',
    pwr: 8, spd: 7, def: 7, ki: 8, tec: 8, tier: 4, bulk: 1.02, h: 0.95,
    hair: HAIR.vegeta, aura: 0xffd24a,
    fit: fit('armor', 0xf2f2f2, 0xe8a83a, 0x2b3a6b, { shoulders: 1, skirt: 1, suit: 0x2b3a6b }),
    s1: beam('Galick Gun', 0xb46bff, { charge: 0.9, dmg: 940 }),
    s2: beam('Final Flash', 0xffe14d, { charge: 1.8, dmg: 1700, wide: 1.7 }),
    s3: barrage('Consecutive Energy Blast', 0xb46bff, { count: 16 }),
    s4: nova('Big Bang Attack', 0x8fd8ff, { dmg: 780, radius: 7 }),
    ult: beam('Final Shine Attack', 0x63ff9a, { charge: 2.2, dmg: 3050, wide: 2.1 }),
    forms: ssjChain('vegeta', { ssjHair: hair({ style: 'flame', n: 8, len: 0.46, lift: 0.98, bang: 0.05, color: 0xffe04a, tip: 0xfff6b0, part: 1 }) })
      .concat([GOD, BLUE, form({
        id: 'ego', name: 'Ultra Ego', kanji: '傲', pwr: 3.1, spd: 1.9, def: 2.4,
        cost: 90, kiDrain: 11, aura: 0x9b5cff,
        hair: hair({ style: 'flame', n: 8, len: 0.48, lift: 0.95, bang: 0.05, color: 0x9b5cff, tip: 0xe0c8ff, part: 1 }),
        eye: 0xb46bff, glow: 1.25, sparks: 1.2, rage: 0.45
      })]),
    quip: 'I am the Prince of all Saiyans!',
    bio: 'Pride made flesh. Second place is the only thing he truly fears.'
  });

  mk({
    id: 'gohan', name: 'Gohan (Teen)', short: 'Gohan', race: 'Saiyan', era: 'Z', saga: 'Cell Saga',
    pwr: 8, spd: 7, def: 6, ki: 8, tec: 7, tier: 4, h: 0.92,
    hair: HAIR.gohanTeen, aura: 0xfff0a0,
    fit: fit('gi', 0xf2761b, 0x1f4bd8, 0xf4ead2, { belt: 0x1f4bd8, cape: 0 }),
    s1: beam('Masenko', 0xffe14d, { charge: 0.7, dmg: 820 }),
    s2: beam('Kamehameha', 0x6fd8ff, { charge: 1.0, dmg: 900 }),
    s3: rush('Soaring Fist', 0xfff0a0, { hits: 7 }),
    s4: nova('Furious Roar', 0xffe14d, { dmg: 600, radius: 8 }),
    ult: beam('Father-Son Kamehameha', 0x9fe8ff, { charge: 2.3, dmg: 3300, wide: 2.3 }),
    forms: ssjChain('gohan').concat([form({
      id: 'ult', name: 'Ultimate Gohan', kanji: '潜', pwr: 2.5, spd: 1.7, def: 1.5,
      cost: 60, kiDrain: 5.5, aura: 0xf2f6ff, hair: HAIR.gohanTeen,
      eye: 0x1d2733, glow: 0.95
    }), form({
      id: 'beast', name: 'Beast Gohan', kanji: '獣', pwr: 3.2, spd: 2.2, def: 1.8,
      cost: 92, kiDrain: 10, aura: 0xd8e6ff,
      hair: hair({ style: 'mane', n: 12, len: 0.34, lift: 0.5, back: 1.5, bang: 0.2, color: 0xf2f6ff }),
      eye: 0xff2b4d, glow: 1.3, sparks: 1.1
    })]),
    quip: "I won't let you hurt anyone else.",
    bio: 'The gentlest fighter alive, and the most terrifying when pushed.'
  });

  mk({
    id: 'gohan_kid', name: 'Gohan (Kid)', short: 'Kid Gohan', race: 'Saiyan', era: 'Z', saga: 'Saiyan Saga',
    pwr: 5, spd: 6, def: 4, ki: 6, tec: 4, tier: 2, h: 0.72, bulk: 0.82, tail: true,
    hair: HAIR.gohanKid, aura: 0xffe9a8,
    fit: fit('gi', 0xf2761b, 0x1f4bd8, 0xf4ead2, { belt: 0x1f4bd8, cape: 1, capeC: 0xf4ead2 }),
    s1: beam('Masenko', 0xffe14d, { charge: 0.7, dmg: 620 }),
    s2: barrage('Ki Blast Volley', 0xffe14d, { count: 10 }),
    s3: nova('Rage Explosion', 0xffd24a, { dmg: 480, radius: 7 }),
    s4: trick('Hidden Potential', 0xfff0a0, { mode: 'buff' }),
    ult: beam('Full-Power Masenko', 0xffe14d, { charge: 1.9, dmg: 2400 }),
    quip: 'I have to be brave!',
    bio: "Four years old, terrified, and stronger than his father already knows."
  });

  mk({
    id: 'goten', name: 'Goten', race: 'Saiyan', era: 'Z', saga: 'Buu Saga',
    pwr: 5, spd: 6, def: 4, ki: 6, tec: 4, tier: 2, h: 0.68, bulk: 0.78,
    hair: HAIR.goten, aura: 0xa8e8ff,
    fit: fit('gi', 0x3fa04a, 0xf2c84a, 0xf4ead2, { belt: 0xf2c84a, sleeveless: 1 }),
    s1: beam('Kamehameha', 0x6fd8ff, { charge: 0.8, dmg: 640 }),
    s2: barrage('Playful Volley', 0x9fe8ff, { count: 12 }),
    s3: rush('Flying Kick Rush', 0xfff0a0, { hits: 5 }),
    s4: nova('Kid Burst', 0x9fe8ff, { dmg: 420, radius: 6 }),
    ult: beam('Super Kamehameha', 0x6fd8ff, { charge: 1.9, dmg: 2300 }),
    forms: ssjChain('goten', { two: false }),
    quip: 'Big brother taught me this one!',
    bio: 'Turned Super Saiyan before he learned to tie his shoes.'
  });

  mk({
    id: 'trunks', name: 'Future Trunks', short: 'Trunks', race: 'Half-Saiyan', era: 'Z', saga: 'Android Saga',
    pwr: 7, spd: 7, def: 6, ki: 7, tec: 7, tier: 3, h: 0.97,
    hair: HAIR.trunks, aura: 0xc8a8ff,
    fit: fit('jacket', 0x3a6fd8, 0x1f2a3a, 0xf2c84a, { sword: 1, boots: 0xf2d24b, badge: 1 }),
    s1: beam('Burning Attack', 0xffb545, { charge: 0.9, dmg: 880 }),
    s2: rush('Shining Sword Attack', 0xc8e8ff, { hits: 8, sword: 1 }),
    s3: barrage('Buster Cannon', 0xffe14d, { count: 12 }),
    s4: nova('Heat Dome Attack', 0xffd24a, { dmg: 700, radius: 8 }),
    ult: beam('Final Hope Slash', 0xb46bff, { charge: 2.1, dmg: 2950, sword: 1 }),
    forms: ssjChain('trunks', { ssjHair: hair({ style: 'bob', n: 10, len: 0.24, lift: 0.35, bang: 0.6, color: 0xffe04a, tip: 0xfff6b0 }) })
      .concat([form({
        id: 'rage', name: 'Super Saiyan Rage', kanji: '怒', pwr: 2.6, spd: 1.8, def: 1.5,
        cost: 72, kiDrain: 8.5, aura: 0xffe14d, sparks: 1.5, glow: 1.1,
        hair: hair({ style: 'flame', n: 11, len: 0.40, lift: 0.85, bang: 0.1, color: 0xffe04a, tip: 0xffffff }),
        eye: 0x4fd4a8
      })]),
    quip: 'I came a long way to end this.',
    bio: 'From a future where everyone died. He does not intend to lose twice.'
  });

  mk({
    id: 'bardock', name: 'Bardock', race: 'Saiyan', era: 'Movie', saga: 'Bardock',
    pwr: 7, spd: 7, def: 6, ki: 6, tec: 6, tier: 3, bulk: 1.05,
    hair: HAIR.bardock, aura: 0xff8a3d, head: { scar: 1, band: 0xb02a2a },
    fit: fit('armor', 0x2b3a4b, 0x9aa4ae, 0xb02a2a, { shoulders: 0, skirt: 0, suit: 0x1c2430 }),
    s1: beam('Riot Javelin', 0x9fe8ff, { charge: 0.8, dmg: 860 }),
    s2: rush('Rebellion Rush', 0xffb545, { hits: 8 }),
    s3: barrage('Saiyan Spirit', 0xff8a3d, { count: 14 }),
    s4: nova('Final Stand', 0xff8a3d, { dmg: 700, radius: 8 }),
    ult: sphere('Final Riot Javelin', 0x9fe8ff, { charge: 2.1, dmg: 2900, radius: 11 }),
    forms: ssjChain('bardock', { two: false }),
    quip: 'You picked the wrong Saiyan.',
    bio: 'Saw the end of his world coming and threw one last punch at it anyway.'
  });

  mk({
    id: 'raditz', name: 'Raditz', race: 'Saiyan', era: 'Z', saga: 'Saiyan Saga',
    pwr: 4, spd: 5, def: 4, ki: 4, tec: 4, tier: 1, bulk: 1.08, tail: true,
    hair: HAIR.raditz, aura: 0x9fe8ff, head: { scouter: 0x2fd85a },
    fit: fit('armor', 0x1c2430, 0x9aa4ae, 0x2b3a6b, { shoulders: 1, skirt: 0, suit: 0x1c2430 }),
    s1: beam('Double Sunday', 0xb46bff, { charge: 0.8, dmg: 620 }),
    s2: rush('Saturday Crash', 0xffb545, { hits: 5 }),
    s3: barrage('Shining Friday', 0x9fe8ff, { count: 10 }),
    s4: nova('Brother Slam', 0xb46bff, { dmg: 420, radius: 6 }),
    ult: beam('Weekend', 0xb46bff, { charge: 1.8, dmg: 2000 }),
    quip: 'My power level is over one thousand!',
    bio: "Goku's brother, and the reason Earth ever learned the word 'Saiyan'."
  });

  mk({
    id: 'nappa', name: 'Nappa', race: 'Saiyan', era: 'Z', saga: 'Saiyan Saga',
    pwr: 5, spd: 3, def: 6, ki: 4, tec: 3, tier: 2, bulk: 1.32, h: 1.12, tail: true,
    hair: HAIR.nappa, aura: 0xffd24a, head: { moustache: 1, scouter: 0x2fd85a },
    fit: fit('armor', 0x1c2430, 0xe8a83a, 0x2b3a6b, { shoulders: 1, skirt: 1, suit: 0x1c2430 }),
    s1: nova('Break Cannon', 0xffd24a, { dmg: 620, radius: 8 }),
    s2: barrage('Bomber DX', 0xffb545, { count: 12 }),
    s3: rush('Giant Storm', 0xffd24a, { hits: 5 }),
    s4: trick('Saibaman Call', 0x63ff9a, { mode: 'minion' }),
    ult: nova('Planet Crusher', 0xffb545, { dmg: 2500, radius: 15 }),
    quip: 'Should I destroy this planet, Vegeta?',
    bio: 'A wall of Saiyan muscle with a gleeful streak of cruelty.'
  });

  mk({
    id: 'turles', name: 'Turles', race: 'Saiyan', era: 'Movie', saga: 'Tree of Might',
    pwr: 6, spd: 6, def: 6, ki: 6, tec: 5, tier: 3, skin: SK.deep, bulk: 1.05,
    hair: HAIR.turles, aura: 0xff5a7a,
    fit: fit('armor', 0x1c2430, 0xb02a2a, 0x2b3a6b, { shoulders: 1, skirt: 1, suit: 0x1c2430 }),
    s1: sphere('Kill Driver', 0xb02a2a, { charge: 1.0, dmg: 900, radius: 9 }),
    s2: barrage('Meteor Burst', 0xff5a7a, { count: 14 }),
    s3: trick('Fruit of Might', 0xff5a7a, { mode: 'buff' }),
    s4: rush('Dark Rush', 0xff5a7a, { hits: 7 }),
    ult: sphere('Calamity Blaster', 0xb02a2a, { charge: 2.2, dmg: 2900, radius: 13 }),
    quip: 'The fruit has made me a god.',
    bio: 'A low-class Saiyan who ate his way to power. Wears Goku\'s face like a taunt.'
  });

  mk({
    id: 'broly', name: 'Broly (Legendary)', short: 'Broly', race: 'Saiyan', era: 'Movie', saga: 'Legendary',
    pwr: 10, spd: 6, def: 9, ki: 8, tec: 3, tier: 5, bulk: 1.35, h: 1.14,
    hair: HAIR.broly, aura: 0x63ff9a,
    fit: fit('bare', 0xf2d24b, 0x2fa87a, 0xb02a2a, { belt: 0xf2d24b, wristA: 1, pants: 0xffffff }),
    s1: nova('Gigantic Roar', 0x63ff9a, { dmg: 900, radius: 11 }),
    s2: sphere('Eraser Cannon', 0x63ff9a, { charge: 1.1, dmg: 1200, radius: 10 }),
    s3: rush('Gigantic Fury', 0x63ff9a, { hits: 9 }),
    s4: barrage('Blaster Shell', 0x63ff9a, { count: 18 }),
    ult: sphere('Omega Blaster', 0x2fd85a, { charge: 2.5, dmg: 3600, radius: 18 }),
    forms: [form({
      id: 'lssj', name: 'Legendary Super Saiyan', kanji: '伝説', pwr: 2.4, spd: 1.35, def: 1.9,
      cost: 45, kiDrain: 4.5, aura: 0x8fff6a, hair: HAIR.brolyLSSJ, bulk: 1.28,
      eye: 0xf2f6ff, glow: 1.25, sparks: 1.2, rage: 0.6
    })],
    quip: 'KAKAROT!',
    bio: 'Born with a power that frightened a king. It still frightens everyone.'
  });

  mk({
    id: 'broly_dbs', name: 'Broly (Super)', short: 'Broly DBS', race: 'Saiyan', era: 'Super', saga: 'Broly',
    pwr: 10, spd: 7, def: 9, ki: 8, tec: 4, tier: 5, bulk: 1.3, h: 1.12, tail: true,
    hair: HAIR.broly, aura: 0x63ff9a, head: { scar: 0 },
    fit: fit('bare', 0xf2d24b, 0x2fa87a, 0x8a5a34, { pelt: 1, pants: 0x3a2a1a, belt: 0xd8c8a8 }),
    s1: nova('Wrathful Roar', 0x63ff9a, { dmg: 950, radius: 12 }),
    s2: rush('Berserk Rush', 0x8fff6a, { hits: 11 }),
    s3: sphere('Gigantic Impact', 0x63ff9a, { charge: 1.0, dmg: 1150, radius: 10 }),
    s4: barrage('Blaster Meteor', 0x8fff6a, { count: 20 }),
    ult: beam('Gigantic Roar Beam', 0x2fd85a, { charge: 2.4, dmg: 3500, wide: 2.6 }),
    forms: [form({
      id: 'wrath', name: 'Wrath State', kanji: '憤', pwr: 1.8, spd: 1.4, def: 1.5,
      cost: 30, kiDrain: 3.5, aura: 0x63ff9a, eye: 0xf2f6ff, glow: 0.9, rage: 0.5,
      hair: hair({ style: 'mane', n: 13, len: 0.36, lift: 0.5, back: 0.9, bang: 0.3, color: 0x141010, thick: 1.25 })
    }), form({
      id: 'lssj', name: 'Legendary Super Saiyan', kanji: '伝説', pwr: 2.6, spd: 1.5, def: 2.0,
      cost: 55, kiDrain: 5.5, aura: 0x8fff6a, hair: HAIR.brolyLSSJ, bulk: 1.3,
      eye: 0xf2f6ff, glow: 1.35, sparks: 1.3, rage: 0.7
    })],
    quip: '...',
    bio: 'Raised on a dead world with no one to talk to but a father who used him.'
  });

  mk({
    id: 'kale', name: 'Kale', race: 'Saiyan', era: 'Super', saga: 'Universe 6', fem: 1,
    pwr: 8, spd: 6, def: 7, ki: 7, tec: 4, tier: 4, h: 0.93,
    hair: HAIR.kale, aura: 0x63ff9a,
    fit: fit('gi', 0x2f6f4a, 0xf2f2f2, 0xf2d24b, { sleeveless: 1, belt: 0xf2d24b }),
    s1: nova('Timid Burst', 0x63ff9a, { dmg: 700, radius: 9 }),
    s2: barrage('Berserk Volley', 0x8fff6a, { count: 16 }),
    s3: rush('Wild Charge', 0x63ff9a, { hits: 8 }),
    s4: sphere('Fierce Ball', 0x63ff9a, { charge: 1.0, dmg: 950, radius: 9 }),
    ult: beam('Full Power Energy Wave', 0x2fd85a, { charge: 2.2, dmg: 3100, wide: 2.2 }),
    forms: [form({
      id: 'lssj', name: 'Legendary Super Saiyan', kanji: '伝説', pwr: 2.5, spd: 1.4, def: 1.8,
      cost: 55, kiDrain: 6.0, aura: 0x8fff6a, bulk: 1.22, glow: 1.2, sparks: 1.1,
      hair: hair({ style: 'mane', n: 11, len: 0.36, lift: 0.6, back: 1.2, bang: 0.2, color: 0xd9f24a, tip: 0xf4ffb8 })
    })],
    quip: 'S-sorry... I can\'t hold back!',
    bio: 'Universe 6\'s shy Legendary Super Saiyan. Do not make her angry.'
  });

  mk({
    id: 'caulifla', name: 'Caulifla', race: 'Saiyan', era: 'Super', saga: 'Universe 6', fem: 1,
    pwr: 7, spd: 8, def: 5, ki: 7, tec: 6, tier: 3, h: 0.92,
    hair: HAIR.caulifla, aura: 0xffd24a,
    fit: fit('bare', 0x2b1f2a, 0xf2d24b, 0xb02a2a, { crop: 1, pants: 0x2b1f2a }),
    s1: barrage('Crush Cannon', 0xffd24a, { count: 14 }),
    s2: rush('Gang Rush', 0xffe14d, { hits: 8 }),
    s3: nova('Saiyan Pride Burst', 0xffd24a, { dmg: 620, radius: 8 }),
    s4: beam('Energy Wave', 0xffe14d, { charge: 0.9, dmg: 860 }),
    ult: beam('Crush Kamehameha', 0xffe14d, { charge: 2.0, dmg: 2900 }),
    forms: ssjChain('caulifla', {
      ssjHair: hair({ style: 'mane', n: 11, len: 0.28, lift: 0.7, back: 0.9, bang: 0.2, color: 0xffe04a, tip: 0xfff6b0 })
    }),
    quip: 'Teach me that trick, and then I\'ll beat you with it.',
    bio: 'A street gang boss who learned Super Saiyan in an afternoon.'
  });

  mk({
    id: 'cabba', name: 'Cabba', race: 'Saiyan', era: 'Super', saga: 'Universe 6',
    pwr: 6, spd: 7, def: 5, ki: 6, tec: 6, tier: 3, h: 0.93,
    hair: HAIR.cabba, aura: 0x8fd8ff,
    fit: fit('armor', 0xf2f2f2, 0xe8a83a, 0x2b3a6b, { shoulders: 0, skirt: 0, suit: 0x2b3a6b }),
    s1: beam('Sonic Wave', 0x8fd8ff, { charge: 0.8, dmg: 780 }),
    s2: rush('Cutting Rush', 0xffe14d, { hits: 7 }),
    s3: barrage('Universe 6 Volley', 0x8fd8ff, { count: 12 }),
    s4: nova('Pride Burst', 0xffd24a, { dmg: 540, radius: 7 }),
    ult: beam('Galick Gun (taught)', 0xb46bff, { charge: 2.0, dmg: 2700 }),
    forms: ssjChain('cabba'),
    quip: 'Master Vegeta showed me this!',
    bio: 'Polite, earnest, and the first Universe 6 Saiyan to go Super.'
  });

  mk({
    id: 'gogeta', name: 'Gogeta', race: 'Fusion', era: 'Movie', saga: 'Fusion',
    pwr: 10, spd: 10, def: 8, ki: 10, tec: 9, tier: 5, bulk: 1.06,
    hair: hair({ n: 12, len: 0.40, lift: 0.55, bang: 0.5, back: 0.15, color: 0x141010 }), aura: 0xa8e8ff,
    fit: fit('fusion', 0x2b3a6b, 0xf2d24b, 0xf2f2f2, { vest: 1, sash: 0xf2d24b }),
    s1: beam('Big Bang Kamehameha', 0x8fd8ff, { charge: 1.4, dmg: 1500, wide: 1.9 }),
    s2: rush('Stardust Breaker', 0xffe14d, { hits: 10 }),
    s3: barrage('Soul Punisher Volley', 0xa8e8ff, { count: 18 }),
    s4: nova('Fusion Burst', 0xa8e8ff, { dmg: 900, radius: 11 }),
    ult: beam('Big Bang Kamehameha ×100', 0x37b8ff, { charge: 2.6, dmg: 4200, wide: 2.8 }),
    forms: ssjChain('gogeta').concat([BLUE, form({
      id: 'ssj4', name: 'Super Saiyan 4', kanji: '四', pwr: 3.2, spd: 2.2, def: 1.85,
      cost: 88, kiDrain: 10, aura: 0xff4d5a, hair: HAIR.ssj4, fur: 0xd83a4a,
      eye: 0xf2d24b, glow: 1.3, sparks: 0.8
    })]),
    quip: 'Two warriors, one fist.',
    bio: 'The fusion dance done right. Almost unfairly strong, and knows it.'
  });

  mk({
    id: 'vegito', name: 'Vegito', race: 'Fusion', era: 'Z', saga: 'Buu Saga',
    pwr: 10, spd: 9, def: 8, ki: 10, tec: 10, tier: 5, bulk: 1.04,
    hair: hair({ style: 'flame', n: 11, len: 0.42, lift: 0.65, bang: 0.45, color: 0x141010, part: 1 }), aura: 0xa8e8ff,
    head: { potara: 0xf2d24b },
    fit: fit('gi', 0x2b4bd8, 0xf2761b, 0xf4ead2, { belt: 0xf2761b }),
    s1: beam('Final Kamehameha', 0x8fd8ff, { charge: 1.5, dmg: 1550, wide: 1.8 }),
    s2: rush('Spirit Sword', 0x63d8ff, { hits: 9, sword: 1 }),
    s3: barrage('Banshee Blast', 0xa8e8ff, { count: 18 }),
    s4: trick('Candy Beam Dodge', 0xff7ad9, { mode: 'counter' }),
    ult: beam('Final Kamehameha (Blue)', 0x37b8ff, { charge: 2.6, dmg: 4150, wide: 2.7 }),
    forms: ssjChain('vegito').concat([BLUE]),
    quip: 'I am neither Goku nor Vegeta. I am the one who will defeat you.',
    bio: 'Potara fusion. All of Vegeta\'s pride, all of Goku\'s instinct, no weaknesses.'
  });

  mk({
    id: 'gotenks', name: 'Gotenks', race: 'Fusion', era: 'Z', saga: 'Buu Saga',
    pwr: 7, spd: 8, def: 5, ki: 8, tec: 6, tier: 3, h: 0.75, bulk: 0.85,
    hair: hair({ n: 11, len: 0.30, lift: 0.45, bang: 0.4, color: 0x141010, tip: 0xb489e6 }), aura: 0xffe14d,
    fit: fit('fusion', 0x2b3a6b, 0xf2d24b, 0xf2f2f2, { vest: 1, sash: 0xf2d24b }),
    s1: trick('Super Ghost Kamikaze Attack', 0xf2f6ff, { mode: 'ghosts' }),
    s2: rush('Charging Ultra Buu Buu Volleyball', 0xffe14d, { hits: 8 }),
    s3: barrage('Galactic Donut', 0xffe14d, { count: 12, ring: 1 }),
    s4: nova('Show-off Burst', 0xffe14d, { dmg: 560, radius: 8 }),
    ult: beam('Ultra Volleyball Finish', 0xffe14d, { charge: 2.1, dmg: 2950 }),
    forms: ssjChain('gotenks', { three: true }),
    quip: 'Behold! The Super Ghost Kamikaze Attack!',
    bio: 'Two ten-year-olds with the power of a god and the patience of neither.'
  });

  /* ============================ FRIEZA FORCE =========================== */

  mk({
    id: 'frieza', name: 'Frieza', race: 'Frost Demon', era: 'Z', saga: 'Frieza Saga',
    pwr: 9, spd: 8, def: 7, ki: 9, tec: 9, tier: 4, h: 0.86, bulk: 0.88,
    skin: SK.white, skin2: 0xd8a8e8, eye: 0xb02a2a, hair: HAIR.frieza,
    head: { horns: 'frieza', bio: 1 }, tail: true, aura: 0xb46bff,
    fit: fit('bio', 0xf0f4ff, 0xb46bff, 0x8a5ad8, { plates: 1 }),
    s1: beam('Death Beam', 0xb46bff, { charge: 0.25, dmg: 520, thin: 1, fast: 1 }),
    s2: sphere('Death Ball', 0xff8a3d, { charge: 1.6, dmg: 1500, radius: 13, sky: true }),
    s3: barrage('Death Beam Barrage', 0xb46bff, { count: 20, thin: 1 }),
    s4: disc('Death Saucer', 0xb46bff, { dmg: 750, homing: 1 }),
    ult: sphere('Supernova', 0xff8a3d, { charge: 2.6, dmg: 3800, radius: 20, sky: true }),
    forms: [
      form({ id: 'f2', name: 'Second Form', kanji: '二', pwr: 1.3, spd: 0.95, def: 1.3, cost: 18, kiDrain: 2, aura: 0xb46bff, bulk: 1.35, h: 1.16, horns: 'long' }),
      form({ id: 'f3', name: 'Third Form', kanji: '三', pwr: 1.6, spd: 1.0, def: 1.4, cost: 30, kiDrain: 3, aura: 0xb46bff, bulk: 1.2, h: 1.1, horns: 'crown' }),
      form({ id: 'final', name: 'Final Form', kanji: '真', pwr: 2.2, spd: 1.65, def: 1.4, cost: 45, kiDrain: 4, aura: 0xb46bff, bulk: 0.95, h: 0.98, glow: 0.7, horns: 'none' }),
      form({ id: 'golden', name: 'Golden Frieza', kanji: '金', pwr: 3.0, spd: 2.0, def: 1.7, cost: 78, kiDrain: 9, aura: 0xffb020, skin: 0xffc83a, glow: 1.3, sparks: 0.6, horns: 'none' }),
      form({ id: 'black', name: 'Black Frieza', kanji: '黒', pwr: 4.0, spd: 2.5, def: 2.3, cost: 100, kiDrain: 15, aura: 0x8f5cff, skin: 0x1a1420, glow: 1.5, sparks: 1.0, horns: 'none' })
    ],
    quip: 'I do hope you enjoyed the show.',
    bio: 'Emperor of the universe. Polite, immaculate, and utterly monstrous.'
  });

  mk({
    id: 'cooler', name: 'Cooler', race: 'Frost Demon', era: 'Movie', saga: 'Cooler',
    pwr: 8, spd: 8, def: 8, ki: 8, tec: 8, tier: 4, h: 1.02,
    skin: SK.purple, skin2: 0x3a5a8a, eye: 0xb02a2a, hair: HAIR.cooler,
    head: { mask: 'cooler', horns: 'cooler' }, tail: true, aura: 0xb46bff,
    fit: fit('bio', 0x8a5ad8, 0x3a5a8a, 0xb46bff, { plates: 1, armored: 1 }),
    s1: beam('Death Beam', 0xb46bff, { charge: 0.25, dmg: 540, thin: 1, fast: 1 }),
    s2: sphere('Supernova Cooler', 0xff8a3d, { charge: 1.7, dmg: 1550, radius: 13, sky: true }),
    s3: rush('Nova Strike', 0xb46bff, { hits: 8, dash: 1 }),
    s4: barrage('Death Chaser', 0xb46bff, { count: 16 }),
    ult: rush('Nova Chariot', 0xff8a3d, { hits: 14, dash: 1, dmg: 3400 }),
    forms: [
      form({ id: 'fifth', name: 'Fifth Form', kanji: '五', pwr: 2.1, spd: 1.5, def: 1.6, cost: 45, kiDrain: 4.5, aura: 0xb46bff, bulk: 1.2, h: 1.08, glow: 0.8 }),
      form({ id: 'metal', name: 'Metal Cooler', kanji: '鋼', pwr: 3.0, spd: 1.9, def: 2.4, cost: 80, kiDrain: 8, aura: 0x59c8ff, skin: 0xc8d8e8, glow: 1.2, sparks: 0.5 })
    ],
    quip: "My brother was a fool. I am not.",
    bio: "Frieza's older brother — colder, smarter, and far more patient."
  });

  mk({
    id: 'king_cold', name: 'King Cold', race: 'Frost Demon', era: 'Z', saga: 'Trunks',
    pwr: 6, spd: 5, def: 7, ki: 6, tec: 6, tier: 2, h: 1.2, bulk: 1.25,
    skin: SK.white, skin2: 0x7fb6ff, eye: 0xb02a2a, hair: HAIR.frieza,
    head: { horns: 'crown' }, tail: true, aura: 0xb46bff,
    fit: fit('bio', 0xf0f4ff, 0x7fb6ff, 0x8a5ad8, { plates: 1, cape: 1, capeC: 0x2b3a6b }),
    s1: beam('Cold Beam', 0xb46bff, { charge: 0.4, dmg: 640, thin: 1 }),
    s2: sphere('Emperor Ball', 0xb46bff, { charge: 1.4, dmg: 1050, radius: 10 }),
    s3: barrage('Royal Volley', 0xb46bff, { count: 14 }),
    s4: nova('Imperial Presence', 0xb46bff, { dmg: 600, radius: 9 }),
    ult: sphere('Cold Supernova', 0xff8a3d, { charge: 2.3, dmg: 3000, radius: 15, sky: true }),
    quip: 'You will address me properly.',
    bio: 'Patriarch of the family that conquered a galaxy.'
  });

  mk({
    id: 'zarbon', name: 'Zarbon', race: 'Alien', era: 'Z', saga: 'Frieza Saga',
    pwr: 4, spd: 6, def: 4, ki: 5, tec: 6, tier: 1, skin: SK.green, eye: 0xf2d24b,
    hair: HAIR.zarbon, aura: 0x63ff9a, head: { earring: 0xf2d24b },
    fit: fit('armor', 0x3a5a8a, 0xf2f2f2, 0xb46bff, { shoulders: 0, skirt: 0, suit: 0x2b3a6b, cape: 1, capeC: 0x8a5ad8 }),
    s1: beam('Elegant Blaster', 0x63ff9a, { charge: 0.7, dmg: 560 }),
    s2: rush('Graceful Rush', 0x63ff9a, { hits: 6 }),
    s3: barrage('Emerald Volley', 0x63ff9a, { count: 12 }),
    s4: trick('Monster Form', 0x2fa87a, { mode: 'buff' }),
    ult: nova('Monstrous Slam', 0x2fa87a, { dmg: 2100, radius: 11 }),
    forms: [form({
      id: 'monster', name: 'Monster Form', kanji: '獣', pwr: 1.9, spd: 0.9, def: 1.6,
      cost: 25, kiDrain: 3, aura: 0x2fa87a, skin: 0x4a7a3a, bulk: 1.4, h: 1.08, glow: 0.5
    })],
    quip: 'Must I ruin my beautiful face over you?',
    bio: 'Vain, refined, and hiding something genuinely hideous.'
  });

  mk({
    id: 'dodoria', name: 'Dodoria', race: 'Alien', era: 'Z', saga: 'Frieza Saga',
    pwr: 4, spd: 3, def: 5, ki: 4, tec: 3, tier: 1, skin: SK.hotpink, eye: 0x1d2733,
    hair: HAIR.dodoria, bulk: 1.35, h: 0.96, head: { spikes: 1, scouter: 0x2fd85a },
    aura: 0xff7ad9,
    fit: fit('armor', 0x2b3a4b, 0xf2f2f2, 0x8a5ad8, { shoulders: 0, skirt: 0, suit: 0x2b3a6b }),
    s1: beam('Mouth Energy Wave', 0xff7ad9, { charge: 0.5, dmg: 520 }),
    s2: nova('Body Slam', 0xff7ad9, { dmg: 480, radius: 7 }),
    s3: barrage('Pink Volley', 0xff7ad9, { count: 10 }),
    s4: rush('Bulldozer Rush', 0xff7ad9, { hits: 5 }),
    ult: nova('Maximum Buster', 0xff7ad9, { dmg: 1900, radius: 12 }),
    quip: 'You should have run when you had the chance.',
    bio: "Frieza's enforcer. All appetite, no subtlety."
  });

  mk({
    id: 'ginyu', name: 'Captain Ginyu', short: 'Ginyu', race: 'Alien', era: 'Z', saga: 'Frieza Saga',
    pwr: 6, spd: 6, def: 6, ki: 6, tec: 7, tier: 2, skin: SK.purple, eye: 0xf2d24b,
    hair: HAIR.ginyu, head: { horns: 'ginyu' }, aura: 0xb46bff, bulk: 1.1,
    fit: fit('armor', 0xf2f2f2, 0xe8a83a, 0x2b3a6b, { shoulders: 1, skirt: 1, suit: 0x2b3a6b }),
    s1: beam('Milky Cannon', 0xb46bff, { charge: 0.8, dmg: 720 }),
    s2: trick('Body Change', 0xb46bff, { mode: 'swap' }),
    s3: rush('Heroic Pose Rush', 0xb46bff, { hits: 7 }),
    s4: barrage('Strong Jersey', 0xb46bff, { count: 12 }),
    ult: nova('Ginyu Force Pose!', 0xb46bff, { dmg: 2400, radius: 12 }),
    quip: 'Ginyu Force... POSE!',
    bio: 'Leader of an elite squad who rehearse choreography before every fight.'
  });

  mk({
    id: 'recoome', name: 'Recoome', race: 'Alien', era: 'Z', saga: 'Frieza Saga',
    pwr: 5, spd: 3, def: 6, ki: 4, tec: 3, tier: 1, bulk: 1.32, h: 1.14,
    hair: HAIR.recoome, aura: 0xffb545,
    fit: fit('armor', 0xf2f2f2, 0xe8a83a, 0x2b3a6b, { shoulders: 1, skirt: 1, suit: 0x2b3a6b }),
    s1: beam('Recoome Eraser Gun', 0xffb545, { charge: 1.0, dmg: 700 }),
    s2: rush('Recoome Kick', 0xffb545, { hits: 5 }),
    s3: nova('Recoome Boom', 0xffb545, { dmg: 560, radius: 8 }),
    s4: barrage('Recoome Renegade Bomber', 0xffb545, { count: 10 }),
    ult: beam('Recoome Ultra Fighting Bomber', 0xffb545, { charge: 2.0, dmg: 2300 }),
    quip: 'Recooooome!',
    bio: 'Announces his own attacks. Takes a beating like a mountain.'
  });

  mk({
    id: 'burter', name: 'Burter', race: 'Alien', era: 'Z', saga: 'Frieza Saga',
    pwr: 4, spd: 8, def: 3, ki: 4, tec: 5, tier: 1, skin: 0x3a6fd8, eye: 0xf2d24b,
    hair: HAIR.burter, head: { fin: 1 }, h: 1.12, bulk: 0.9, aura: 0x59c8ff,
    fit: fit('armor', 0xf2f2f2, 0xe8a83a, 0x2b3a6b, { shoulders: 1, skirt: 0, suit: 0x2b3a6b }),
    s1: rush('Blue Hurricane', 0x59c8ff, { hits: 9, dash: 1 }),
    s2: barrage('Mach Volley', 0x59c8ff, { count: 16 }),
    s3: trick('Speed Blur', 0x59c8ff, { mode: 'blink' }),
    s4: beam('Blue Beam', 0x59c8ff, { charge: 0.6, dmg: 520 }),
    ult: rush('Fastest in the Universe', 0x59c8ff, { hits: 18, dash: 1, dmg: 2200 }),
    quip: "You can't hit what you can't see.",
    bio: 'The self-declared fastest being in the universe. He is quite fast.'
  });

  mk({
    id: 'jeice', name: 'Jeice', race: 'Alien', era: 'Z', saga: 'Frieza Saga',
    pwr: 4, spd: 6, def: 4, ki: 5, tec: 5, tier: 1, skin: SK.red, eye: 0xf2d24b,
    hair: HAIR.jeice, h: 0.92, aura: 0xff5a7a,
    fit: fit('armor', 0xf2f2f2, 0xe8a83a, 0x2b3a6b, { shoulders: 1, skirt: 0, suit: 0x2b3a6b }),
    s1: sphere('Crusher Ball', 0xff5a7a, { charge: 0.8, dmg: 640, radius: 8 }),
    s2: barrage('Red Magma', 0xff5a7a, { count: 14 }),
    s3: rush('Purple Comet Attack', 0xff5a7a, { hits: 7 }),
    s4: beam('Crimson Wave', 0xff5a7a, { charge: 0.7, dmg: 600 }),
    ult: sphere('Crusher Ball Barrage', 0xff5a7a, { charge: 2.0, dmg: 2250, radius: 12 }),
    quip: "Right then, let's have a go.",
    bio: 'The Red Magma. Never fights alone if he can help it.'
  });

  mk({
    id: 'guldo', name: 'Guldo', race: 'Alien', era: 'Z', saga: 'Frieza Saga',
    pwr: 2, spd: 3, def: 3, ki: 5, tec: 8, tier: 1, skin: SK.green, eye: 0xf2d24b,
    hair: HAIR.guldo, head: { fourEyes: 1 }, h: 0.62, bulk: 1.2, aura: 0x63ff9a,
    fit: fit('armor', 0xf2f2f2, 0xe8a83a, 0x2b3a6b, { shoulders: 0, skirt: 0, suit: 0x2b3a6b }),
    s1: trick('Time Freeze', 0x63ff9a, { mode: 'freeze' }),
    s2: trick('Mind Bind', 0xb46bff, { mode: 'bind' }),
    s3: barrage('Psychic Rocks', 0x8a7a5a, { count: 8, rock: 1 }),
    s4: beam('Psycho Beam', 0x63ff9a, { charge: 0.6, dmg: 420 }),
    ult: nova('Psychic Crush', 0xb46bff, { dmg: 1800, radius: 10 }),
    quip: "I only need a moment. And I can take one.",
    bio: 'The weakest of the Ginyu Force, and easily the most annoying.'
  });

  mk({
    id: 'frost', name: 'Frost', race: 'Frost Demon', era: 'Super', saga: 'Universe 6',
    pwr: 6, spd: 7, def: 6, ki: 7, tec: 7, tier: 3, h: 0.88,
    skin: 0xbfe2ff, skin2: 0x3a5a8a, eye: 0xb02a2a, hair: HAIR.frost,
    head: { horns: 'frieza' }, tail: true, aura: 0x59c8ff,
    fit: fit('bio', 0xbfe2ff, 0x3a5a8a, 0x59c8ff, { plates: 1 }),
    s1: beam('Chaos Beam', 0x59c8ff, { charge: 0.3, dmg: 500, thin: 1, poison: 1 }),
    s2: sphere('Frost Ball', 0x59c8ff, { charge: 1.3, dmg: 1000, radius: 10 }),
    s3: barrage('Icicle Volley', 0x59c8ff, { count: 16 }),
    s4: trick('Dirty Trick', 0x59c8ff, { mode: 'poison' }),
    ult: sphere('Nova Frost', 0x59c8ff, { charge: 2.2, dmg: 2900, radius: 14, sky: true }),
    forms: [form({
      id: 'final', name: 'Final Form', kanji: '真', pwr: 2.0, spd: 1.6, def: 1.4,
      cost: 45, kiDrain: 4.5, aura: 0x59c8ff, glow: 0.8, h: 1.0
    })],
    quip: 'A hero must sometimes... improvise.',
    bio: "Universe 6's beloved champion. The mask slips in the ring."
  });

  /* ========================== ANDROIDS & CELL ========================== */

  mk({
    id: 'cell', name: 'Cell', race: 'Bio-Android', era: 'Z', saga: 'Cell Saga',
    pwr: 9, spd: 8, def: 8, ki: 9, tec: 9, tier: 4, h: 1.06, bulk: 1.1,
    skin: 0x8fd86a, skin2: 0x2f4a2a, eye: 0xd83a4a, hair: HAIR.cell,
    head: { crest: 1, cellSpots: 1 }, tail: false, aura: 0xffe14d,
    fit: fit('bio', 0x8fd86a, 0x2f4a2a, 0xf2a8c8, { insect: 1, wings: 1 }),
    s1: beam('Kamehameha', 0x6fd8ff, { charge: 1.0, dmg: 950 }),
    s2: disc('Destructo Disc', 0xffe14d, { dmg: 800, homing: 1 }),
    s3: barrage('Gravity Impact', 0xffe14d, { count: 16 }),
    s4: trick('Spawn Cell Jr.', 0x8fd86a, { mode: 'minion' }),
    ult: beam('Solar Kamehameha', 0xffe14d, { charge: 2.5, dmg: 3600, wide: 2.4 }),
    forms: [
      form({ id: 'semi', name: 'Semi-Perfect', kanji: '半', pwr: 1.5, spd: 1.1, def: 1.35, cost: 25, kiDrain: 2.5, aura: 0x8fd86a, bulk: 1.25, glow: 0.5 }),
      form({ id: 'perfect', name: 'Perfect Cell', kanji: '完', pwr: 2.3, spd: 1.7, def: 1.55, cost: 50, kiDrain: 5, aura: 0xffe14d, bulk: 1.02, glow: 0.9 }),
      form({ id: 'super', name: 'Super Perfect Cell', kanji: '超完', pwr: 2.9, spd: 1.95, def: 1.7, cost: 78, kiDrain: 8, aura: 0xffe97a, glow: 1.2, sparks: 1.1 })
    ],
    quip: 'Perfection is not a goal. It is my nature.',
    bio: 'Every great fighter in history, grown in a jar and sharpened for war.'
  });

  mk({
    id: 'cell_jr', name: 'Cell Jr.', race: 'Bio-Android', era: 'Z', saga: 'Cell Saga',
    pwr: 5, spd: 7, def: 4, ki: 6, tec: 5, tier: 2, h: 0.66, bulk: 0.8,
    skin: 0x8fd86a, skin2: 0x2f4a2a, eye: 0xd83a4a, hair: HAIR.cell,
    head: { crest: 1, cellSpots: 1 }, aura: 0xffe14d,
    fit: fit('bio', 0x8fd86a, 0x2f4a2a, 0xf2a8c8, { insect: 1 }),
    s1: beam('Little Kamehameha', 0x6fd8ff, { charge: 0.7, dmg: 560 }),
    s2: barrage('Giggling Volley', 0xffe14d, { count: 14 }),
    s3: rush('Swarm Rush', 0xffe14d, { hits: 7 }),
    s4: nova('Junior Burst', 0xffe14d, { dmg: 420, radius: 6 }),
    ult: beam('Perfect Legacy', 0xffe14d, { charge: 1.9, dmg: 2100 }),
    quip: 'Hee hee hee!',
    bio: 'Small, blue, and gleefully sadistic. There are usually seven.'
  });

  mk({
    id: 'a17', name: 'Android 17', race: 'Android', era: 'Z', saga: 'Android Saga',
    pwr: 7, spd: 8, def: 7, ki: 8, tec: 7, tier: 3,
    hair: HAIR.a17, eye: 0x3a6fd8, aura: 0x59c8ff, head: { scarf: 0xf2f2f2 },
    fit: fit('jacket', 0x2f4a6b, 0xf2f2f2, 0xd8582a, { tee: 1, jeans: 0x3a5a8a }),
    s1: beam('Power Blitz', 0x59c8ff, { charge: 0.7, dmg: 780 }),
    s2: trick('Android Barrier', 0x59c8ff, { mode: 'shield' }),
    s3: barrage('Endless Shot', 0x59c8ff, { count: 20 }),
    s4: rush('Accel Dance', 0x59c8ff, { hits: 8 }),
    ult: nova('Super Electric Strike', 0x59c8ff, { dmg: 3100, radius: 14 }),
    quip: "I've got infinite energy. You don't.",
    bio: 'Park ranger by day. Infinite-energy android forever.'
  });

  mk({
    id: 'a18', name: 'Android 18', race: 'Android', era: 'Z', saga: 'Android Saga', fem: 1,
    pwr: 7, spd: 8, def: 6, ki: 7, tec: 8, tier: 3, h: 0.95,
    hair: HAIR.a18, eye: 0x3a6fd8, aura: 0x9fe8ff,
    fit: fit('jacket', 0x2b3a6b, 0xf2f2f2, 0xd8c8a8, { tee: 1, jeans: 0x3a5a8a, vest: 1 }),
    s1: beam('Power Blitz', 0x9fe8ff, { charge: 0.7, dmg: 760 }),
    s2: trick('Energy Absorb', 0x9fe8ff, { mode: 'absorb' }),
    s3: rush('Deadly Dance', 0x9fe8ff, { hits: 9 }),
    s4: barrage('Sadistic Dance', 0x9fe8ff, { count: 16 }),
    ult: nova('Infinity Bullet', 0x9fe8ff, { dmg: 3000, radius: 13 }),
    quip: 'Are we done? I have shopping to do.',
    bio: 'Unlimited stamina and zero patience for showboating.'
  });

  mk({
    id: 'a16', name: 'Android 16', race: 'Android', era: 'Z', saga: 'Android Saga',
    pwr: 8, spd: 5, def: 9, ki: 7, tec: 6, tier: 3, h: 1.22, bulk: 1.35,
    hair: HAIR.a16, eye: 0x3fbf6a, aura: 0x63ff9a, head: { visor: 1 },
    fit: fit('jacket', 0x2f6f4a, 0xf2762a, 0xd8c8a8, { armored: 1, jeans: 0x2f4a3a }),
    s1: nova('Hell Flash', 0x63ff9a, { dmg: 1100, radius: 10 }),
    s2: rush('Rocket Punch', 0x9aa4ae, { hits: 4, heavy: 1 }),
    s3: barrage('Arm Cannon Volley', 0x63ff9a, { count: 10 }),
    s4: trick('Iron Guard', 0x9aa4ae, { mode: 'shield' }),
    ult: nova('Self Destruct', 0xff8a3d, { dmg: 4000, radius: 22, selfHurt: 0.5 }),
    quip: 'It is not a sin to fight for the right cause.',
    bio: 'A machine built to kill who would rather listen to birds.'
  });

  mk({
    id: 'a19', name: 'Android 19', race: 'Android', era: 'Z', saga: 'Android Saga',
    pwr: 5, spd: 4, def: 6, ki: 6, tec: 5, tier: 1, h: 0.9, bulk: 1.3,
    skin: SK.pale, hair: hair({ style: 'flat', n: 5, len: 0.1, lift: 0.2, color: 0x2a2a2a }),
    eye: 0x1d2733, aura: 0xff7ad9, head: { clown: 1 },
    fit: fit('jacket', 0x2b3a6b, 0xf2f2f2, 0xf2d24b, { armored: 1, jeans: 0x2b3a6b }),
    s1: trick('Energy Absorb', 0xff7ad9, { mode: 'absorb' }),
    s2: beam('Eye Beam', 0xff7ad9, { charge: 0.4, dmg: 480, thin: 1 }),
    s3: barrage('Photon Wave', 0xff7ad9, { count: 12 }),
    s4: rush('Grip Rush', 0xff7ad9, { hits: 5 }),
    ult: nova('Photon Explosion', 0xff7ad9, { dmg: 1900, radius: 11 }),
    quip: 'Your energy belongs to Dr. Gero now.',
    bio: 'A grinning doll that drains you dry through its palms.'
  });

  mk({
    id: 'gero', name: 'Dr. Gero', race: 'Android', era: 'Z', saga: 'Android Saga',
    pwr: 5, spd: 4, def: 5, ki: 6, tec: 7, tier: 1, h: 0.95,
    skin: SK.pale, hair: HAIR.gero, eye: 0x1d2733, aura: 0xb46bff, head: { moustache: 1, brain: 1 },
    fit: fit('jacket', 0x3a4a5a, 0xf2f2f2, 0xd8582a, { armored: 1, jeans: 0x2b3a4b }),
    s1: trick('Energy Absorb', 0xb46bff, { mode: 'absorb' }),
    s2: beam('Bionic Punisher', 0xb46bff, { charge: 0.8, dmg: 640 }),
    s3: barrage('Super Explosive Wave', 0xb46bff, { count: 12 }),
    s4: nova('Android Assault', 0xb46bff, { dmg: 520, radius: 8 }),
    ult: beam("Vengeance of a Genius", 0xb46bff, { charge: 2.1, dmg: 2200 }),
    quip: 'Twenty years of hatred, perfected.',
    bio: 'Turned himself into his own greatest creation. Still lost.'
  });

  mk({
    id: 'a13', name: 'Android 13', race: 'Android', era: 'Movie', saga: 'Super Android 13',
    pwr: 7, spd: 6, def: 8, ki: 7, tec: 5, tier: 3, h: 1.1, bulk: 1.25,
    hair: hair({ style: 'flat', n: 6, len: 0.12, lift: 0.3, color: 0xf2d24b }),
    eye: 0x3a6fd8, aura: 0x59c8ff, head: { cap: 0xd8582a },
    fit: fit('jacket', 0x2b3a6b, 0xd8582a, 0xf2f2f2, { armored: 1, jeans: 0x3a5a8a }),
    s1: nova('S.S. Deadly Bomber', 0x59c8ff, { dmg: 900, radius: 10 }),
    s2: beam('Chaotic Energy Wave', 0x59c8ff, { charge: 0.9, dmg: 820 }),
    s3: rush('Hunting Rush', 0x59c8ff, { hits: 7 }),
    s4: barrage('Backhand Volley', 0x59c8ff, { count: 14 }),
    ult: nova('S.S. Deadly Bomber Max', 0x59c8ff, { dmg: 3200, radius: 16 }),
    forms: [form({
      id: 'fusion', name: 'Super Android 13', kanji: '合', pwr: 2.2, spd: 1.4, def: 1.9,
      cost: 55, kiDrain: 5, aura: 0x59c8ff, skin: 0x4a6fd8, bulk: 1.35, h: 1.1, glow: 1.0
    })],
    quip: 'Gero programmed me for exactly one thing.',
    bio: 'A backwoods killer with a computer for a conscience.'
  });

  mk({
    id: 'super17', name: 'Super 17', race: 'Android', era: 'GT', saga: 'Super 17',
    pwr: 9, spd: 8, def: 9, ki: 9, tec: 7, tier: 4, h: 1.05, bulk: 1.12,
    hair: HAIR.a17, eye: 0xd83a4a, aura: 0xb46bff, head: { scarf: 0x1a1a1a },
    fit: fit('jacket', 0x1a1a24, 0xb46bff, 0xd8582a, { armored: 1, jeans: 0x1a1a24 }),
    s1: trick('Absorption Barrier', 0xb46bff, { mode: 'absorb' }),
    s2: beam('Flash Bomber', 0xb46bff, { charge: 0.9, dmg: 1000 }),
    s3: barrage('Shocking Death Ball Volley', 0xb46bff, { count: 18 }),
    s4: rush('Hyper Rush', 0xb46bff, { hits: 9 }),
    ult: nova('Electric Hell Flash', 0xb46bff, { dmg: 3500, radius: 16 }),
    quip: 'Every blast you fire only makes me stronger.',
    bio: 'Two Seventeens fused in Hell. Eats energy attacks for breakfast.'
  });

  mk({
    id: 'a21', name: 'Android 21', race: 'Bio-Android', era: 'Super', saga: 'FighterZ', fem: 1,
    pwr: 9, spd: 8, def: 7, ki: 9, tec: 9, tier: 4, h: 0.96,
    skin: SK.pink, skin2: 0x8fd86a, eye: 0xd83a4a,
    hair: hair({ style: 'mane', n: 8, len: 0.2, lift: 0.1, back: 1.5, bang: 0.5, color: 0xf2d8e8 }),
    head: { crest: 1, antenna: 1 }, tail: true, aura: 0xff7ad9,
    fit: fit('bio', 0xff8fb8, 0x8a5ad8, 0xf2d24b, { insect: 1 }),
    s1: trick('Sweet Tooth', 0xff7ad9, { mode: 'candy' }),
    s2: beam('Photon Wave', 0xff7ad9, { charge: 1.0, dmg: 980 }),
    s3: barrage('Connoisseur Cut', 0xff7ad9, { count: 16 }),
    s4: disc('Excellent Full Course', 0xff7ad9, { dmg: 820, homing: 1 }),
    ult: beam('Total Detonation Ball', 0xff7ad9, { charge: 2.5, dmg: 3600, wide: 2.4 }),
    quip: "You look absolutely delicious.",
    bio: 'A brilliant scientist rebuilt as a bio-android with an endless appetite.'
  });

  /* ============================== BUU SAGA ============================= */

  mk({
    id: 'buu_fat', name: 'Majin Buu (Fat)', short: 'Fat Buu', race: 'Majin', era: 'Z', saga: 'Buu Saga',
    pwr: 8, spd: 5, def: 10, ki: 8, tec: 5, tier: 4, h: 1.05, bulk: 1.55,
    skin: SK.pink, eye: 0x1d2733, hair: HAIR.buu, head: { tentacle: 1, holes: 1 },
    aura: 0xff7ad9,
    fit: fit('bare', 0xf2d24b, 0x1a1a24, 0xff7ad9, { pants: 0xf2f2f2, cape: 1, capeC: 0x8a5ad8, vest: 1 }),
    s1: trick('Chocolate Beam', 0xff7ad9, { mode: 'candy' }),
    s2: nova('Body Bounce', 0xff7ad9, { dmg: 700, radius: 9 }),
    s3: barrage('Angry Explosion', 0xff7ad9, { count: 14 }),
    s4: trick('Regeneration', 0xff7ad9, { mode: 'heal' }),
    ult: nova('Planet Burst', 0xff7ad9, { dmg: 3400, radius: 20 }),
    forms: [form({
      id: 'evil', name: 'Evil Buu', kanji: '悪', pwr: 1.6, spd: 1.5, def: 1.1,
      cost: 35, kiDrain: 3.5, aura: 0x8a5ad8, skin: 0xd8a8c8, bulk: 0.85, h: 1.05, glow: 0.7
    })],
    quip: 'Buu make you into candy!',
    bio: 'A child with the power to erase planets and the temper to match.'
  });

  mk({
    id: 'buu_super', name: 'Super Buu', race: 'Majin', era: 'Z', saga: 'Buu Saga',
    pwr: 9, spd: 8, def: 9, ki: 9, tec: 7, tier: 5, h: 1.08, bulk: 1.18,
    skin: SK.pink, eye: 0xd83a4a, hair: HAIR.buu, head: { tentacle: 2, holes: 1 },
    aura: 0x8a5ad8,
    fit: fit('bare', 0xf2d24b, 0x1a1a24, 0xff7ad9, { pants: 0x2b2b3a, cape: 1, capeC: 0x8a5ad8 }),
    s1: beam('Vanishing Beam', 0x8a5ad8, { charge: 0.9, dmg: 1000 }),
    s2: trick('Absorb', 0x8a5ad8, { mode: 'absorb' }),
    s3: barrage('Mystic Ball Attack', 0xff7ad9, { count: 18 }),
    s4: nova('Human Extinction Attack', 0xff7ad9, { dmg: 1100, radius: 14 }),
    ult: nova('Planet Burst', 0x8a5ad8, { dmg: 3800, radius: 22 }),
    forms: [form({
      id: 'gotenks', name: 'Buuhan (Absorbed)', kanji: '吸', pwr: 2.3, spd: 1.7, def: 1.5,
      cost: 60, kiDrain: 6, aura: 0x8a5ad8, bulk: 1.15, glow: 1.0
    })],
    quip: 'You will make me stronger.',
    bio: 'Buu with the fat trimmed off. What remains is pure malice.'
  });

  mk({
    id: 'buu_kid', name: 'Kid Buu', race: 'Majin', era: 'Z', saga: 'Buu Saga',
    pwr: 10, spd: 9, def: 8, ki: 9, tec: 4, tier: 5, h: 0.82, bulk: 0.95,
    skin: SK.pink, eye: 0xd83a4a, hair: HAIR.buu, head: { tentacle: 1, holes: 1 },
    aura: 0xff7ad9,
    fit: fit('bare', 0xf2d24b, 0x1a1a24, 0xff7ad9, { pants: 0x2b2b3a }),
    s1: nova('Vanishing Ball', 0xff7ad9, { dmg: 1200, radius: 12 }),
    s2: barrage('Mad Volley', 0xff7ad9, { count: 22 }),
    s3: rush('Feral Rush', 0xff7ad9, { hits: 11 }),
    s4: trick('Regeneration', 0xff7ad9, { mode: 'heal' }),
    ult: sphere('Planet Burst', 0xff7ad9, { charge: 2.3, dmg: 4000, radius: 24, sky: true }),
    quip: '(shrieking laughter)',
    bio: 'The original Buu. No thought, no mercy, no off switch.'
  });

  mk({
    id: 'dabura', name: 'Dabura', race: 'Demon', era: 'Z', saga: 'Buu Saga',
    pwr: 6, spd: 6, def: 6, ki: 6, tec: 6, tier: 2, h: 1.06, bulk: 1.15,
    skin: SK.demon, eye: 0xf2d24b, hair: HAIR.dabura, head: { horns: 'demon', moustache: 1 },
    aura: 0xb02a2a,
    fit: fit('demon', 0x2b2b3a, 0xf2d24b, 0xb02a2a, { cape: 1, capeC: 0x2b2b3a, armored: 1 }),
    s1: rush('Darkness Sword Attack', 0xb02a2a, { hits: 7, sword: 1 }),
    s2: trick('Petrifying Spit', 0xb02a2a, { mode: 'stone' }),
    s3: beam('Evil Flame', 0xff8a3d, { charge: 0.9, dmg: 820 }),
    s4: barrage('Demon Volley', 0xb02a2a, { count: 12 }),
    ult: nova("Demon King's Wrath", 0xb02a2a, { dmg: 2700, radius: 13 }),
    quip: 'Kneel before the King of the Demon Realm.',
    bio: 'Ruler of the Demon Realm, second only to Babidi in arrogance.'
  });

  mk({
    id: 'supreme_kai', name: 'Supreme Kai', race: 'Kai', era: 'Z', saga: 'Buu Saga',
    pwr: 5, spd: 6, def: 5, ki: 7, tec: 8, tier: 2, h: 0.9,
    skin: SK.purple, eye: 0x1d2733, hair: HAIR.supremeKai, head: { potara: 0xf2d24b, elfEars: 1 },
    aura: 0xb46bff,
    fit: fit('robe', 0x2b3a6b, 0xf2d24b, 0xf2f2f2, { sash: 0xf2d24b, vest: 1 }),
    s1: beam('Kai Beam', 0xb46bff, { charge: 0.7, dmg: 660 }),
    s2: trick('Kai Kai', 0xb46bff, { mode: 'blink' }),
    s3: barrage('Divine Volley', 0xb46bff, { count: 12 }),
    s4: trick('Healing Light', 0xf2f6ff, { mode: 'heal' }),
    ult: beam('Divine Judgement', 0xb46bff, { charge: 2.0, dmg: 2500 }),
    quip: 'I had hoped it would not come to this.',
    bio: 'A god of creation who is deeply out of his depth in a brawl.'
  });

  /* ============================= NAMEKIANS ============================= */

  mk({
    id: 'piccolo', name: 'Piccolo', race: 'Namekian', era: 'Z', saga: 'Saiyan Saga',
    pwr: 7, spd: 7, def: 7, ki: 7, tec: 9, tier: 3, h: 1.06, skin: SK.green,
    eye: 0xd8d8d8, hair: HAIR.piccolo, head: { antenna: 1, elfEars: 1, pink: 1 },
    aura: 0xb46bff,
    fit: fit('namek', 0x8a3ad8, 0x2b3a6b, 0xf2f2f2, { cape: 1, capeC: 0xf2f2f2, turban: 1, shoulders: 1, sash: 0x2b6fd8 }),
    s1: beam('Special Beam Cannon', 0xffb545, { charge: 1.6, dmg: 1400, thin: 1, pierce: 1 }),
    s2: swarm('Hellzone Grenade', 0xb46bff, { count: 12 }),
    s3: rush('Stretch Arm Rush', 0x63ff9a, { hits: 8, reach: 1 }),
    s4: nova('Explosive Demon Wave', 0xb46bff, { dmg: 800, radius: 10 }),
    ult: beam('Light Grenade', 0xb46bff, { charge: 2.2, dmg: 3000, wide: 2.0 }),
    forms: [form({
      id: 'potential', name: 'Potential Unleashed', kanji: '解', pwr: 1.7, spd: 1.35, def: 1.4,
      cost: 40, kiDrain: 4, aura: 0xffffff, glow: 0.9
    }), form({
      id: 'orange', name: 'Orange Piccolo', kanji: '橙', pwr: 2.9, spd: 1.6, def: 2.1,
      cost: 82, kiDrain: 9, aura: 0xff8a3d, skin: 0xf2762a, bulk: 1.25, h: 1.06, glow: 1.25
    })],
    quip: 'You are already dead. You just have not fallen yet.',
    bio: 'Started as a demon king reborn. Became the best teacher Earth ever had.'
  });

  mk({
    id: 'nail', name: 'Nail', race: 'Namekian', era: 'Z', saga: 'Frieza Saga',
    pwr: 5, spd: 6, def: 6, ki: 5, tec: 7, tier: 2, h: 1.05, skin: SK.green,
    eye: 0xd8d8d8, hair: HAIR.piccolo, head: { antenna: 1, elfEars: 1, pink: 1 },
    aura: 0x63ff9a,
    fit: fit('namek', 0x2f6f4a, 0x2b3a6b, 0xf2f2f2, { shoulders: 1, sash: 0xf2f2f2 }),
    s1: rush('Stretch Punish', 0x63ff9a, { hits: 7, reach: 1 }),
    s2: beam('Namekian Wave', 0x63ff9a, { charge: 0.8, dmg: 700 }),
    s3: nova('Guardian Burst', 0x63ff9a, { dmg: 560, radius: 8 }),
    s4: trick('Regeneration', 0x63ff9a, { mode: 'heal' }),
    ult: beam('Warrior of Namek', 0x63ff9a, { charge: 2.0, dmg: 2400 }),
    quip: "I am the strongest warrior on Namek.",
    bio: "Guardian of the Grand Elder. Bought Goku the time he needed."
  });

  mk({
    id: 'lord_slug', name: 'Lord Slug', race: 'Namekian', era: 'Movie', saga: 'Lord Slug',
    pwr: 7, spd: 6, def: 7, ki: 7, tec: 6, tier: 3, h: 1.08, skin: SK.dgreen,
    eye: 0xd83a4a, hair: HAIR.piccolo, head: { antenna: 1, elfEars: 1, fangs: 1 },
    aura: 0x2fa87a,
    fit: fit('namek', 0x2b2b3a, 0x8a5ad8, 0xf2d24b, { cape: 1, capeC: 0x2b2b3a, shoulders: 1, armored: 1 }),
    s1: beam('Darkness Cannon', 0x2fa87a, { charge: 1.0, dmg: 900 }),
    s2: nova('Hurricane Blast', 0x2fa87a, { dmg: 800, radius: 10 }),
    s3: rush('Giant Slam', 0x2fa87a, { hits: 6, heavy: 1 }),
    s4: trick('Giant Form', 0x2fa87a, { mode: 'buff' }),
    ult: sphere('Darkness Eye Beam', 0x2fa87a, { charge: 2.2, dmg: 2950, radius: 13 }),
    forms: [form({
      id: 'giant', name: 'Giant Namekian', kanji: '巨', pwr: 2.0, spd: 0.85, def: 1.9,
      cost: 40, kiDrain: 4, aura: 0x2fa87a, bulk: 1.6, h: 1.35, glow: 0.6
    })],
    quip: 'This world will make a fine flowerpot.',
    bio: 'A Super Namekian who freezes worlds and grows to the size of a tower.'
  });

  mk({
    id: 'king_piccolo', name: 'King Piccolo', race: 'Namekian', era: 'DB', saga: 'King Piccolo',
    pwr: 5, spd: 5, def: 6, ki: 6, tec: 7, tier: 2, h: 1.1, bulk: 1.1, skin: SK.dgreen,
    eye: 0xd83a4a, hair: HAIR.piccolo, head: { antenna: 1, elfEars: 1, old: 1 },
    aura: 0x8a5ad8,
    fit: fit('namek', 0x8a3ad8, 0x2b2b3a, 0xf2d24b, { cape: 1, capeC: 0x2b2b3a, turban: 1, shoulders: 1, kanji: '魔' }),
    s1: beam('Explosive Demon Wave', 0x8a5ad8, { charge: 1.0, dmg: 820 }),
    s2: trick('Evil Containment Wave', 0x8a5ad8, { mode: 'seal' }),
    s3: barrage('Demon Volley', 0x8a5ad8, { count: 12 }),
    s4: nova('Demon Rend', 0x8a5ad8, { dmg: 640, radius: 9 }),
    ult: nova('Demon King Descends', 0x8a5ad8, { dmg: 2600, radius: 14 }),
    quip: 'The Demon King has returned.',
    bio: 'The evil Kami spat out, in a chair, ruling by terror.'
  });

  /* ============================= EARTHLINGS ============================ */

  mk({
    id: 'krillin', name: 'Krillin', race: 'Human', era: 'Z', saga: 'Saiyan Saga',
    pwr: 4, spd: 6, def: 4, ki: 6, tec: 8, tier: 1, h: 0.74, bulk: 0.95,
    hair: HAIR.krillin, head: { dots: 6 }, aura: 0xffb545,
    fit: fit('gi', 0xf2761b, 0x8a3ad8, 0xf4ead2, { belt: 0x8a3ad8, kanji: '亀' }),
    s1: disc('Destructo Disc', 0x9fe8ff, { dmg: 900, homing: 1 }),
    s2: beam('Kamehameha', 0x6fd8ff, { charge: 1.0, dmg: 700 }),
    s3: trick('Solar Flare', 0xfff6b0, { mode: 'blind' }),
    s4: barrage('Scatter Shot', 0xffb545, { count: 14 }),
    ult: disc('Destructo Disc Barrage', 0x9fe8ff, { dmg: 2600, homing: 1, count: 3 }),
    quip: 'I might be short, but I fight tall.',
    bio: "Earth's strongest human, and the bravest man Goku knows."
  });

  mk({
    id: 'yamcha', name: 'Yamcha', race: 'Human', era: 'Z', saga: 'Saiyan Saga',
    pwr: 3, spd: 6, def: 3, ki: 4, tec: 7, tier: 1,
    hair: HAIR.yamcha, head: { scar: 1 }, aura: 0xffb545,
    fit: fit('gi', 0xf2761b, 0x8a3ad8, 0xf4ead2, { belt: 0x8a3ad8, kanji: '亀' }),
    s1: rush('Wolf Fang Fist', 0xffb545, { hits: 10 }),
    s2: beam('Kamehameha', 0x6fd8ff, { charge: 1.0, dmg: 620 }),
    s3: barrage('Spirit Ball', 0x9fe8ff, { count: 8, homing: 1 }),
    s4: nova('Desert Storm', 0xffb545, { dmg: 460, radius: 7 }),
    ult: rush('Neo Wolf Fang Fist', 0xffb545, { hits: 18, dmg: 2200 }),
    quip: 'Watch this — Wolf Fang Fist!',
    bio: 'A desert bandit turned baseball star turned world-saver. Mostly.'
  });

  mk({
    id: 'tien', name: 'Tien Shinhan', short: 'Tien', race: 'Human', era: 'Z', saga: 'Saiyan Saga',
    pwr: 5, spd: 6, def: 5, ki: 6, tec: 8, tier: 2, h: 1.04, bulk: 1.06,
    hair: HAIR.tien, head: { thirdEye: 1 }, aura: 0x63ff9a,
    fit: fit('gi', 0x2f6f4a, 0x2b3a6b, 0xf4ead2, { sleeveless: 1, belt: 0x2b3a6b }),
    s1: nova('Tri-Beam', 0xf2f6ff, { dmg: 1300, radius: 9, selfHurt: 0.15, square: 1 }),
    s2: beam('Dodon Ray', 0xf2d24b, { charge: 0.5, dmg: 560, thin: 1 }),
    s3: trick('Multi-Form', 0x63ff9a, { mode: 'clones' }),
    s4: trick('Solar Flare', 0xfff6b0, { mode: 'blind' }),
    ult: nova('Neo Tri-Beam', 0xf2f6ff, { dmg: 3200, radius: 15, selfHurt: 0.28, square: 1 }),
    quip: 'I will hold the line as long as I can stand.',
    bio: 'A three-eyed martial artist who will spend his life to buy you a second.'
  });

  mk({
    id: 'chiaotzu', name: 'Chiaotzu', race: 'Human', era: 'Z', saga: 'Saiyan Saga',
    pwr: 2, spd: 5, def: 2, ki: 5, tec: 8, tier: 1, h: 0.6, bulk: 0.85,
    skin: SK.pale, hair: HAIR.chiaotzu, eye: 0x1d2733, aura: 0xff7ad9, head: { rosy: 1 },
    fit: fit('gi', 0x2f6f4a, 0xf2d24b, 0xf4ead2, { belt: 0xf2d24b, cap: 1 }),
    s1: trick('Telekinesis', 0xff7ad9, { mode: 'bind' }),
    s2: beam('Dodon Ray', 0xf2d24b, { charge: 0.5, dmg: 420, thin: 1 }),
    s3: barrage('Psychic Volley', 0xff7ad9, { count: 10 }),
    s4: nova('Self-Destruct Gambit', 0xff7ad9, { dmg: 1800, radius: 12, selfHurt: 0.55 }),
    ult: nova('Final Sacrifice', 0xff7ad9, { dmg: 2600, radius: 14, selfHurt: 0.4 }),
    quip: 'Tien! I can hold him!',
    bio: 'Tiny, psychic and impossibly loyal.'
  });

  mk({
    id: 'roshi', name: 'Master Roshi', race: 'Human', era: 'Z', saga: 'Tournament',
    pwr: 4, spd: 5, def: 4, ki: 6, tec: 9, tier: 2, h: 0.86, bulk: 0.9,
    hair: HAIR.roshi, head: { beard: 1, shades: 1, old: 1 }, aura: 0xffb545,
    fit: fit('gi', 0xf2761b, 0xd8582a, 0xf4ead2, { belt: 0xd8582a, shirt: 0xf2c84a, kanji: '亀' }),
    s1: beam('Kamehameha', 0x6fd8ff, { charge: 1.1, dmg: 800 }),
    s2: trick('Max Power', 0xffb545, { mode: 'buff' }),
    s3: trick('Evil Containment Wave', 0x8a5ad8, { mode: 'seal' }),
    s4: nova('Thunder Shock Surprise', 0xf2d24b, { dmg: 620, radius: 8 }),
    ult: beam('MAX Power Kamehameha', 0x6fd8ff, { charge: 2.3, dmg: 3000, wide: 2.2 }),
    forms: [form({
      id: 'max', name: 'Max Power', kanji: '極', pwr: 1.9, spd: 0.95, def: 1.6,
      cost: 30, kiDrain: 4, aura: 0xffb545, bulk: 1.55, h: 1.08, glow: 0.6
    })],
    quip: 'The turtle school still has a few lessons left.',
    bio: 'Inventor of the Kamehameha. Older than most civilisations.'
  });

  mk({
    id: 'videl', name: 'Videl', race: 'Human', era: 'Z', saga: 'Buu Saga', fem: 1,
    pwr: 3, spd: 6, def: 3, ki: 3, tec: 7, tier: 1, h: 0.9,
    hair: HAIR.videl, aura: 0x9fe8ff,
    fit: fit('jacket', 0xf2f2f2, 0x2b3a6b, 0xd8582a, { tee: 1, jeans: 0x2b3a6b, gloves: 1 }),
    s1: rush('Justice Combo', 0x9fe8ff, { hits: 8 }),
    s2: nova('Eagle Kick', 0x9fe8ff, { dmg: 480, radius: 6 }),
    s3: barrage('Learner Volley', 0x9fe8ff, { count: 8 }),
    s4: trick('Flight Training', 0x9fe8ff, { mode: 'buff' }),
    ult: rush('Satan Family Barrage', 0x9fe8ff, { hits: 16, dmg: 1900 }),
    quip: 'Teach me to fly and I will teach you manners.',
    bio: 'Champion of Satan City, and the only person who bosses Gohan around.'
  });

  mk({
    id: 'satan', name: 'Mr. Satan', race: 'Human', era: 'Z', saga: 'Cell Saga',
    pwr: 2, spd: 3, def: 3, ki: 1, tec: 5, tier: 1, h: 1.04, bulk: 1.2,
    hair: HAIR.satan, head: { moustache: 1 }, aura: 0xf2d24b,
    fit: fit('tourney', 0x2b2b3a, 0xf2d24b, 0xf2f2f2, { belt: 0xf2d24b, champ: 1 }),
    s1: rush('Dynamite Kick', 0xf2d24b, { hits: 6 }),
    s2: nova('Present For You', 0xd8582a, { dmg: 400, radius: 7, bomb: 1 }),
    s3: trick('Crowd Cheer', 0xf2d24b, { mode: 'buff' }),
    s4: rush('Rolling Punch', 0xf2d24b, { hits: 8 }),
    ult: rush('MEGATON PUNCH!', 0xf2d24b, { hits: 1, dmg: 2400, heavy: 1 }),
    quip: 'The champ is HERE!',
    bio: 'Zero power, infinite confidence, and somehow always in the right place.'
  });

  mk({
    id: 'uub', name: 'Uub', race: 'Human', era: 'Z', saga: 'End of Z',
    pwr: 7, spd: 8, def: 6, ki: 7, tec: 6, tier: 3, h: 0.94, skin: SK.deep,
    hair: HAIR.uub, aura: 0xffb545,
    fit: fit('gi', 0xf2761b, 0x8a3ad8, 0xf4ead2, { belt: 0x8a3ad8, sleeveless: 1 }),
    s1: rush('Wild Instinct', 0xffb545, { hits: 9 }),
    s2: beam('Ki Wave', 0xffb545, { charge: 0.8, dmg: 820 }),
    s3: barrage('Untrained Volley', 0xffb545, { count: 14 }),
    s4: nova('Latent Burst', 0xffb545, { dmg: 700, radius: 9 }),
    ult: beam('Awakened Potential', 0xffb545, { charge: 2.2, dmg: 3000 }),
    quip: 'I do not really know what I am doing yet!',
    bio: "Kid Buu reborn good. Goku's last and most promising student."
  });

  mk({
    id: 'pan', name: 'Pan', race: 'Quarter-Saiyan', era: 'GT', saga: 'GT', fem: 1,
    pwr: 4, spd: 7, def: 4, ki: 5, tec: 6, tier: 1, h: 0.68, bulk: 0.8,
    hair: HAIR.pan, head: { band: 0xd8582a }, aura: 0xff7ad9,
    fit: fit('gi', 0xd8582a, 0xf2f2f2, 0x2b3a6b, { sleeveless: 1, belt: 0x2b3a6b }),
    s1: rush('Maiden Blast Rush', 0xff7ad9, { hits: 8 }),
    s2: beam('Kamehameha', 0x6fd8ff, { charge: 0.9, dmg: 640 }),
    s3: barrage('Energy Volley', 0xff7ad9, { count: 12 }),
    s4: nova('Pan Burst', 0xff7ad9, { dmg: 480, radius: 7 }),
    ult: beam('Full Power Kamehameha', 0x6fd8ff, { charge: 2.0, dmg: 2300 }),
    quip: "Grandpa taught me everything!",
    bio: "Goku's granddaughter — a quarter Saiyan with a full share of the temper."
  });

  mk({
    id: 'chichi', name: 'Chi-Chi', race: 'Human', era: 'Z', saga: 'Tournament', fem: 1,
    pwr: 3, spd: 5, def: 3, ki: 3, tec: 6, tier: 1, h: 0.92,
    hair: HAIR.chichi, aura: 0xff7ad9,
    fit: fit('tourney', 0x8a3ad8, 0xf2d24b, 0xf2f2f2, { belt: 0xf2d24b }),
    s1: rush('Bansho Fan Rush', 0xff7ad9, { hits: 8 }),
    s2: nova('Mother\'s Fury', 0xff7ad9, { dmg: 520, radius: 7 }),
    s3: barrage('Frying Pan Toss', 0x9aa4ae, { count: 8, rock: 1 }),
    s4: trick('Ox-King Stance', 0xff7ad9, { mode: 'buff' }),
    ult: rush('Wrath of the Ox Princess', 0xff7ad9, { hits: 14, dmg: 2000 }),
    quip: 'Gohan has STUDYING to do!',
    bio: 'Princess of Fire Mountain, undefeated in the domestic arena.'
  });

  /* ============================== GT & SUPER =========================== */

  mk({
    id: 'goku_gt', name: 'Goku (GT)', short: 'Goku GT', race: 'Saiyan', era: 'GT', saga: 'GT',
    pwr: 8, spd: 9, def: 6, ki: 9, tec: 8, tier: 4, h: 0.68, bulk: 0.8,
    hair: HAIR.goku, aura: 0x8fe4ff,
    fit: fit('gi', 0x2b3a6b, 0xf2761b, 0xf4ead2, { belt: 0xf2761b }),
    s1: beam('Kamehameha', 0x6fd8ff, { charge: 0.9, dmg: 860 }),
    s2: rush('Dragon Fist', 0xffb545, { hits: 12, dragon: 1 }),
    s3: trick('Instant Transmission', 0x9fe8ff, { mode: 'blink' }),
    s4: barrage('Ki Storm', 0x8fe4ff, { count: 16 }),
    ult: beam('×10 Kamehameha', 0xff4d5a, { charge: 2.5, dmg: 3700, wide: 2.5 }),
    forms: ssjChain('gokugt', { three: true }).concat([form({
      id: 'ssj4', name: 'Super Saiyan 4', kanji: '四', pwr: 3.1, spd: 2.2, def: 1.8,
      cost: 88, kiDrain: 10, aura: 0xff4d5a, hair: HAIR.ssj4, fur: 0xd83a4a,
      eye: 0xf2d24b, glow: 1.3, sparks: 0.8, h: 1.32, bulk: 1.3
    })]),
    quip: 'Wished small, hits just as hard.',
    bio: 'Turned back into a child by Pilaf and immediately went to space.'
  });

  mk({
    id: 'vegeta_gt', name: 'Vegeta (GT)', short: 'Vegeta GT', race: 'Saiyan', era: 'GT', saga: 'GT',
    pwr: 8, spd: 8, def: 7, ki: 8, tec: 8, tier: 4, h: 0.96,
    hair: HAIR.vegeta, head: { moustache: 0 }, aura: 0xffd24a,
    fit: fit('jacket', 0x2b3a6b, 0xf2d24b, 0xf2f2f2, { tee: 1, jeans: 0x2b3a6b }),
    s1: beam('Galick Gun', 0xb46bff, { charge: 0.9, dmg: 920 }),
    s2: beam('Final Shine Attack', 0x63ff9a, { charge: 1.5, dmg: 1450 }),
    s3: barrage('Big Bang Volley', 0x8fd8ff, { count: 16 }),
    s4: nova('Big Bang Attack', 0x8fd8ff, { dmg: 800, radius: 8 }),
    ult: beam('Final Shine ×10', 0x63ff9a, { charge: 2.5, dmg: 3600, wide: 2.6 }),
    forms: ssjChain('vegetagt', {
      ssjHair: hair({ style: 'flame', n: 8, len: 0.46, lift: 0.98, bang: 0.05, color: 0xffe04a, tip: 0xfff6b0, part: 1 })
    }).concat([form({
      id: 'ssj4', name: 'Super Saiyan 4', kanji: '四', pwr: 3.0, spd: 2.1, def: 1.85,
      cost: 88, kiDrain: 10, aura: 0x59c8ff, fur: 0x8a5ad8,
      hair: hair({ style: 'flame', n: 10, len: 0.5, lift: 0.7, bang: 0.1, color: 0x141010, part: 1 }),
      eye: 0xf2d24b, glow: 1.3, sparks: 0.8, bulk: 1.25
    })]),
    quip: 'Even now, I close the gap.',
    bio: 'Older, calmer, and still absolutely certain he will surpass Kakarot.'
  });

  mk({
    id: 'gogeta_ssj4', name: 'Gogeta SSJ4', race: 'Fusion', era: 'GT', saga: 'GT',
    pwr: 10, spd: 10, def: 9, ki: 10, tec: 9, tier: 5, bulk: 1.2, h: 1.05,
    hair: HAIR.ssj4, aura: 0xff4d5a, head: {}, skin2: 0xd83a4a,
    fit: fit('fusion', 0x2b3a6b, 0xf2d24b, 0xf2f2f2, { vest: 1, sash: 0xf2d24b, fur: 0xd83a4a }),
    s1: nova('Big Bang Kamehameha', 0xff4d5a, { dmg: 1500, radius: 13 }),
    s2: rush('Dragon Fist Rush', 0xffb545, { hits: 12, dragon: 1 }),
    s3: barrage('×100 Volley', 0xff4d5a, { count: 20 }),
    s4: trick('Fusion Overdrive', 0xff4d5a, { mode: 'buff' }),
    ult: beam('×100 Big Bang Kamehameha', 0xff4d5a, { charge: 2.7, dmg: 4300, wide: 3.0 }),
    quip: 'You are looking at the strongest fusion in history.',
    bio: 'Golden-furred, red-eyed, and gone in ten minutes. Use them well.'
  });

  mk({
    id: 'baby_vegeta', name: 'Baby Vegeta', race: 'Tuffle', era: 'GT', saga: 'Baby',
    pwr: 9, spd: 8, def: 8, ki: 9, tec: 8, tier: 4, h: 1.0, bulk: 1.1,
    hair: HAIR.vegeta, skin: SK.tuffle, eye: 0xd83a4a, head: { tuffleMark: 1 },
    aura: 0xb46bff,
    fit: fit('armor', 0xf2f2f2, 0xb46bff, 0x2b3a6b, { shoulders: 1, skirt: 1, suit: 0x2b2b3a, cape: 1, capeC: 0xf2f2f2 }),
    s1: beam('Revenge Death Ball Beam', 0xb46bff, { charge: 1.4, dmg: 1400 }),
    s2: sphere('Revenge Death Ball', 0xb46bff, { charge: 1.8, dmg: 1800, radius: 15, sky: true }),
    s3: barrage('Tuffle Volley', 0xb46bff, { count: 18 }),
    s4: trick('Infect', 0xb46bff, { mode: 'drain' }),
    ult: sphere('Revenge Final Flash', 0xb46bff, { charge: 2.6, dmg: 3900, radius: 20, sky: true }),
    forms: [form({
      id: 'super', name: 'Super Baby 2', kanji: '侵', pwr: 2.6, spd: 1.7, def: 1.7,
      cost: 70, kiDrain: 7, aura: 0xb46bff, bulk: 1.3, h: 1.05, glow: 1.1, sparks: 0.6
    })],
    quip: 'A Tuffle rules the Saiyans at last.',
    bio: 'The last Tuffle, wearing the Prince of all Saiyans like a coat.'
  });

  mk({
    id: 'omega_shenron', name: 'Omega Shenron', race: 'Shadow Dragon', era: 'GT', saga: 'Shadow Dragons',
    pwr: 10, spd: 8, def: 9, ki: 10, tec: 7, tier: 5, h: 1.15, bulk: 1.25,
    skin: 0x3a6f5a, skin2: 0xf2d24b, eye: 0xd83a4a, hair: HAIR.omega,
    head: { horns: 'dragon', dragon: 1 }, tail: true, aura: 0xd83a4a,
    fit: fit('bio', 0x3a6f5a, 0xf2d24b, 0xd83a4a, { scales: 1, insect: 0 }),
    s1: beam('Negative Karma Ball Beam', 0xd83a4a, { charge: 1.4, dmg: 1500 }),
    s2: sphere('Negative Karma Ball', 0x8a5ad8, { charge: 2.0, dmg: 2000, radius: 16, sky: true }),
    s3: trick('Dragon Thunder', 0xf2d24b, { mode: 'storm' }),
    s4: disc('Ice Cannon Shards', 0x59c8ff, { dmg: 900, homing: 1 }),
    ult: sphere('Omega Annihilation', 0xd83a4a, { charge: 2.7, dmg: 4200, radius: 22, sky: true }),
    quip: 'Every wish ever made has a price. I am the bill.',
    bio: 'All seven Shadow Dragons in one body. The debt of a century of wishes.'
  });

  mk({
    id: 'beerus', name: 'Beerus', race: 'God of Destruction', era: 'Super', saga: 'Battle of Gods',
    pwr: 10, spd: 9, def: 8, ki: 10, tec: 10, tier: 5, h: 1.08, bulk: 0.85,
    skin: SK.cat, eye: 0xf2d24b, hair: HAIR.beerus, head: { catEars: 1, snout: 1 }, tail: true,
    aura: 0xb46bff,
    fit: fit('robe', 0xf2a83a, 0x2b3a6b, 0xf2f2f2, { sash: 0x2b3a6b, vest: 1, egypt: 1 }),
    s1: nova('Sphere of Destruction', 0xb46bff, { dmg: 1400, radius: 13 }),
    s2: trick('Hakai', 0xb46bff, { mode: 'hakai' }),
    s3: barrage('Wrath of the God of Destruction', 0xb46bff, { count: 20 }),
    s4: trick('God of Destruction\'s Nap', 0xb46bff, { mode: 'heal' }),
    ult: sphere('Destruction', 0xb46bff, { charge: 2.5, dmg: 4400, radius: 24, sky: true }),
    quip: 'You are more interesting than pudding. Barely.',
    bio: 'Destroyer of Universe 7. Motivated almost entirely by food.'
  });

  mk({
    id: 'whis', name: 'Whis', race: 'Angel', era: 'Super', saga: 'Battle of Gods',
    pwr: 10, spd: 10, def: 10, ki: 10, tec: 10, tier: 5, h: 1.14, bulk: 0.8,
    skin: SK.blue, eye: 0x59c8ff, hair: HAIR.whis, head: { halo: 1, elfEars: 1 },
    aura: 0x9fe8ff,
    fit: fit('robe', 0x2b3a6b, 0xf2f2f2, 0xf2d24b, { sash: 0xf2d24b, staff: 1, vest: 1 }),
    s1: trick('Autonomous Ultra Instinct', 0x9fe8ff, { mode: 'counter' }),
    s2: beam('Symphony of Destruction', 0x9fe8ff, { charge: 1.1, dmg: 1300 }),
    s3: trick('Temporal Do-Over', 0x9fe8ff, { mode: 'rewind' }),
    s4: barrage('Staff Volley', 0x9fe8ff, { count: 18 }),
    ult: beam('Angelic Judgement', 0x9fe8ff, { charge: 2.4, dmg: 4500, wide: 2.6 }),
    quip: 'Shall we begin? I have a lunch reservation.',
    bio: 'Attendant and teacher to a God of Destruction. Effortlessly untouchable.'
  });

  mk({
    id: 'hit', name: 'Hit', race: 'Alien', era: 'Super', saga: 'Universe 6',
    pwr: 8, spd: 9, def: 7, ki: 7, tec: 10, tier: 4, h: 1.1, bulk: 1.0,
    skin: SK.mag, eye: 0xf2d24b, hair: HAIR.hit, aura: 0x8a5ad8,
    fit: fit('jacket', 0x2b2b3a, 0x8a5ad8, 0xf2d24b, { armored: 1, jeans: 0x2b2b3a, coat: 1 }),
    s1: trick('Time Skip', 0x8a5ad8, { mode: 'timeskip' }),
    s2: rush('Pure Progress Rush', 0x8a5ad8, { hits: 10 }),
    s3: trick('Time Cage', 0x8a5ad8, { mode: 'bind' }),
    s4: rush('Flash Fist Crush', 0x8a5ad8, { hits: 1, heavy: 1, dmg: 1200 }),
    ult: rush('Time Skip / Flash Fist Crush', 0x8a5ad8, { hits: 6, heavy: 1, dmg: 3400 }),
    quip: 'I have already won. You simply have not noticed.',
    bio: 'The Legendary Assassin. Skips a tenth of a second and ends you inside it.'
  });

  mk({
    id: 'jiren', name: 'Jiren', race: 'Alien', era: 'Super', saga: 'Tournament of Power',
    pwr: 10, spd: 9, def: 10, ki: 9, tec: 8, tier: 5, h: 1.06, bulk: 1.32,
    skin: SK.ashen, eye: 0x1d2733, hair: HAIR.jiren, head: { bigEyes: 1 }, aura: 0xd8483f,
    fit: fit('gi', 0x2b2b3a, 0xd8483f, 0xf2f2f2, { belt: 0xd8483f, boots: 0xf2f2f2, pride: 1 }),
    s1: nova('Power Impact', 0xd8483f, { dmg: 1500, radius: 12 }),
    s2: beam('Glare Beam', 0xd8483f, { charge: 0.3, dmg: 700, thin: 1, fast: 1 }),
    s3: trick('Infinity Wall', 0xd8483f, { mode: 'shield' }),
    s4: rush('Meditative Counter', 0xd8483f, { hits: 1, heavy: 1, dmg: 1400 }),
    ult: nova('Heat Dome Attack', 0xd8483f, { dmg: 4400, radius: 22 }),
    forms: [form({
      id: 'full', name: 'Full Power', kanji: '全', pwr: 1.8, spd: 1.4, def: 1.7,
      cost: 60, kiDrain: 6, aura: 0xd8483f, glow: 1.3, sparks: 0.8
    })],
    quip: 'Strength is the only thing that never betrays you.',
    bio: 'The Pride Trooper who out-trained tragedy. Stronger than a God of Destruction.'
  });

  mk({
    id: 'toppo', name: 'Toppo', race: 'Alien', era: 'Super', saga: 'Tournament of Power',
    pwr: 8, spd: 6, def: 9, ki: 8, tec: 6, tier: 4, h: 1.16, bulk: 1.45,
    skin: SK.tan, hair: HAIR.toppo, head: { moustache: 1 }, aura: 0xb46bff,
    fit: fit('gi', 0x2b2b3a, 0xd8483f, 0xf2f2f2, { belt: 0xd8483f, boots: 0xf2f2f2, pride: 1 }),
    s1: rush('Justice Rush', 0xd8483f, { hits: 9 }),
    s2: nova('Justice Flash', 0xd8483f, { dmg: 1100, radius: 11 }),
    s3: barrage('Justice Torpedo', 0xd8483f, { count: 16 }),
    s4: trick('Pride Trooper Stance', 0xd8483f, { mode: 'shield' }),
    ult: nova('God of Destruction Toppo', 0xb46bff, { dmg: 3700, radius: 18 }),
    forms: [form({
      id: 'god', name: 'God of Destruction', kanji: '壊', pwr: 2.4, spd: 1.5, def: 1.9,
      cost: 70, kiDrain: 7, aura: 0xb46bff, glow: 1.2, sparks: 0.7, bulk: 1.15
    })],
    quip: 'JUSTICE!',
    bio: 'Leader of the Pride Troopers, and briefly a God of Destruction.'
  });

  mk({
    id: 'dyspo', name: 'Dyspo', race: 'Alien', era: 'Super', saga: 'Tournament of Power',
    pwr: 6, spd: 10, def: 5, ki: 6, tec: 7, tier: 3, h: 0.98, bulk: 0.88,
    skin: SK.purple, eye: 0xf2d24b, hair: HAIR.dyspo, head: { rabbitEars: 1 }, aura: 0xb46bff,
    fit: fit('gi', 0x2b2b3a, 0xd8483f, 0xf2f2f2, { belt: 0xd8483f, boots: 0xf2f2f2, pride: 1 }),
    s1: rush('Light Bullet', 0xb46bff, { hits: 14, dash: 1 }),
    s2: trick('Super Maximum Light Speed Mode', 0xb46bff, { mode: 'haste' }),
    s3: barrage('Justice Kick Volley', 0xb46bff, { count: 18 }),
    s4: beam('Circle Flash', 0xb46bff, { charge: 0.5, dmg: 620, thin: 1 }),
    ult: rush('Light Speed Onslaught', 0xb46bff, { hits: 24, dash: 1, dmg: 3000 }),
    quip: 'Too slow. Always too slow.',
    bio: 'The fastest Pride Trooper. Moves faster than sight, thinks slower than he should.'
  });

  mk({
    id: 'kefla', name: 'Kefla', race: 'Fusion', era: 'Super', saga: 'Tournament of Power', fem: 1,
    pwr: 9, spd: 8, def: 8, ki: 9, tec: 6, tier: 5, h: 1.0, bulk: 1.05,
    hair: HAIR.kefla, aura: 0x63ff9a, head: { potara: 0x63ff9a },
    fit: fit('fusion', 0x2f6f4a, 0xf2d24b, 0xf2f2f2, { crop: 1, sash: 0xf2d24b }),
    s1: beam('Gigantic Ray', 0x63ff9a, { charge: 1.1, dmg: 1300 }),
    s2: barrage('Gigantic Roar Volley', 0x63ff9a, { count: 20 }),
    s3: rush('Gigantic Rush', 0x63ff9a, { hits: 10 }),
    s4: nova('Fusion Burst', 0x63ff9a, { dmg: 1000, radius: 11 }),
    ult: beam('Gigantic Blaster', 0x2fd85a, { charge: 2.5, dmg: 4000, wide: 2.6 }),
    forms: [form({
      id: 'ssj', name: 'Super Saiyan', kanji: '超', pwr: 1.6, spd: 1.3, def: 1.25, cost: 30, kiDrain: 3.5,
      aura: 0xffd83a, hair: hair({ style: 'mane', n: 12, len: 0.32, lift: 0.7, back: 1.1, bang: 0.2, color: 0xffe04a, tip: 0xfff6b0 }), eye: 0x4fd4a8, glow: 0.9
    }), form({
      id: 'ssj2', name: 'Legendary Super Saiyan', kanji: '伝説', pwr: 2.7, spd: 1.7, def: 1.7, cost: 68, kiDrain: 7.5,
      aura: 0x8fff6a, bulk: 1.18, glow: 1.25, sparks: 1.2,
      hair: hair({ style: 'mane', n: 12, len: 0.34, lift: 0.75, back: 1.15, bang: 0.15, color: 0xd9f24a, tip: 0xf4ffb8 })
    })],
    quip: 'Two Saiyans, one very bad day for you.',
    bio: 'Caulifla and Kale fused. Raw power with no brakes fitted.'
  });

  mk({
    id: 'goku_black', name: 'Goku Black', short: 'Black', race: 'Kai', era: 'Super', saga: 'Future Trunks',
    pwr: 9, spd: 9, def: 7, ki: 9, tec: 8, tier: 4,
    hair: HAIR.black, eye: 0xd8483f, head: { potara: 0x63ff9a }, aura: 0xff7ad9,
    fit: fit('gi', 0x2b2b3a, 0xd8483f, 0xf2d24b, { belt: 0xf2d24b, sash: 0xd8483f, dark: 1 }),
    s1: beam('Black Kamehameha', 0xff7ad9, { charge: 1.0, dmg: 1050 }),
    s2: rush('Violent Fierce God Slicer', 0xff7ad9, { hits: 9, sword: 1 }),
    s3: barrage('God Slicer Volley', 0xff7ad9, { count: 16 }),
    s4: trick('Zamasu Regeneration', 0xff7ad9, { mode: 'heal' }),
    ult: beam('Divine Retribution', 0xff7ad9, { charge: 2.4, dmg: 3700, wide: 2.3 }),
    forms: [form({
      id: 'rose', name: 'Super Saiyan Rosé', kanji: '薔', pwr: 2.6, spd: 1.9, def: 1.5,
      cost: 70, kiDrain: 7.5, aura: 0xff7ad9,
      hair: hair({ n: 11, len: 0.40, lift: 0.72, bang: 0.3, color: 0xff9ec2, tip: 0xffffff }),
      eye: 0xff7ad9, glow: 1.2, sparks: 0.8
    })],
    quip: 'This body was wasted on a mortal.',
    bio: "A Kai who stole Goku's body to erase every mortal in existence."
  });

  mk({
    id: 'zamasu', name: 'Fused Zamasu', short: 'Zamasu', race: 'Kai', era: 'Super', saga: 'Future Trunks',
    pwr: 9, spd: 8, def: 10, ki: 9, tec: 8, tier: 5, h: 1.06, bulk: 1.15,
    skin: SK.green, skin2: SK.purple, eye: 0xf2f6ff, hair: HAIR.zamasu,
    head: { potara: 0x63ff9a, elfEars: 1, halfFace: 1 }, aura: 0xb46bff,
    fit: fit('robe', 0x2b3a6b, 0xf2d24b, 0xf2f2f2, { sash: 0xf2d24b, vest: 1, halo: 1 }),
    s1: rush('God Split Cut', 0xb46bff, { hits: 8, sword: 1 }),
    s2: beam('Holy Wrath', 0xb46bff, { charge: 1.2, dmg: 1250 }),
    s3: trick('Immortality', 0xb46bff, { mode: 'heal' }),
    s4: barrage('Divine Lasso', 0xb46bff, { count: 16 }),
    ult: nova('Zero Mortals Plan', 0xb46bff, { dmg: 4000, radius: 20 }),
    quip: 'Justice will be served. By me. Forever.',
    bio: 'An immortal god fused with a stolen body. Cannot be killed, only outlasted.'
  });

  mk({
    id: 'moro', name: 'Moro', race: 'Alien', era: 'Super', saga: 'Galactic Patrol',
    pwr: 9, spd: 7, def: 8, ki: 10, tec: 9, tier: 4, h: 1.12, bulk: 1.05,
    skin: SK.green, eye: 0xf2d24b, hair: HAIR.moro, head: { horns: 'goat', beard: 1 },
    aura: 0x63ff9a,
    fit: fit('robe', 0x2b2b3a, 0x63ff9a, 0xf2d24b, { sash: 0x63ff9a, vest: 1 }),
    s1: trick('Energy Drain', 0x63ff9a, { mode: 'drain' }),
    s2: beam('Wizard Beam', 0x63ff9a, { charge: 1.0, dmg: 1100 }),
    s3: swarm('Planet Eater Orbs', 0x63ff9a, { count: 12 }),
    s4: trick('Copy Ability', 0x63ff9a, { mode: 'copy' }),
    ult: sphere('Planet Devourer', 0x63ff9a, { charge: 2.5, dmg: 3900, radius: 20, sky: true }),
    quip: 'Your life force smells wonderful.',
    bio: 'A ten-million-year-old wizard who eats planets to stay young.'
  });

  mk({
    id: 'granolah', name: 'Granolah', race: 'Cerealian', era: 'Super', saga: 'Granolah',
    pwr: 9, spd: 9, def: 6, ki: 8, tec: 10, tier: 4, h: 1.02, skin: SK.cereal,
    eye: 0xd8483f, hair: HAIR.granolah, head: { eyepatch: 1, elfEars: 1 }, aura: 0x59c8ff,
    fit: fit('jacket', 0x2b3a4b, 0x59c8ff, 0xf2d24b, { armored: 1, jeans: 0x2b3a4b, scarf: 1 }),
    s1: beam('Sniper Shot', 0x59c8ff, { charge: 1.2, dmg: 1400, thin: 1, pierce: 1 }),
    s2: trick('Eye of the Hunter', 0x59c8ff, { mode: 'mark' }),
    s3: barrage('Rapid Rifle', 0x59c8ff, { count: 20, thin: 1 }),
    s4: rush('Hunter Rush', 0x59c8ff, { hits: 8 }),
    ult: beam('Ultimate Sniper Shot', 0x59c8ff, { charge: 2.6, dmg: 4100, thin: 1, pierce: 1 }),
    quip: 'One shot. That is all I have ever needed.',
    bio: 'The last Cerealian, who wished to be the strongest in the universe.'
  });

  mk({
    id: 'gas', name: 'Gas', race: 'Heeter', era: 'Super', saga: 'Granolah',
    pwr: 9, spd: 9, def: 8, ki: 8, tec: 8, tier: 4, h: 1.04, skin: 0xd8c8b8,
    eye: 0xd8483f, hair: HAIR.gas, aura: 0xff8a3d,
    fit: fit('jacket', 0x2b2b3a, 0xff8a3d, 0xf2f2f2, { armored: 1, jeans: 0x2b2b3a }),
    s1: rush('Ice Spear Rush', 0x59c8ff, { hits: 9, sword: 1 }),
    s2: barrage('Materialised Blades', 0x59c8ff, { count: 16 }),
    s3: trick('Wish Granted', 0xff8a3d, { mode: 'buff' }),
    s4: nova('Heeter Burst', 0xff8a3d, { dmg: 1000, radius: 11 }),
    ult: nova('Strongest in the Universe', 0xff8a3d, { dmg: 4000, radius: 19 }),
    forms: [form({
      id: 'full', name: 'Full Power Gas', kanji: '極', pwr: 2.4, spd: 1.7, def: 1.6,
      cost: 68, kiDrain: 7, aura: 0xff8a3d, bulk: 1.28, glow: 1.2,
      hair: hair({ style: 'mane', n: 10, len: 0.28, lift: 0.4, back: 1.6, bang: 0.2, color: 0xd8483f })
    })],
    quip: 'My brother wished me the strongest. Reality obeyed.',
    bio: 'A Heeter granted the title "strongest in the universe" by a Dragon.'
  });

  /* =============================== MOVIES ============================== */

  mk({
    id: 'janemba', name: 'Super Janemba', short: 'Janemba', race: 'Demon', era: 'Movie', saga: 'Fusion Reborn',
    pwr: 9, spd: 9, def: 8, ki: 9, tec: 8, tier: 5, h: 1.06, bulk: 1.05,
    skin: 0xf2d24b, skin2: 0xb02a2a, eye: 0x63ff9a, hair: HAIR.janemba,
    head: { horns: 'demon', demonMark: 1 }, aura: 0xb46bff,
    fit: fit('demon', 0xb02a2a, 0xf2d24b, 0x2b2b3a, { armored: 1, sash: 0x2b2b3a }),
    s1: trick('Dimension Sword', 0xb46bff, { mode: 'warp' }),
    s2: rush('Rakshasa Claw', 0xb46bff, { hits: 9, sword: 1 }),
    s3: barrage('Bunkai Teleport Volley', 0xb46bff, { count: 16 }),
    s4: trick('Hell\'s Gate', 0xb46bff, { mode: 'blink' }),
    ult: nova('Hell Gate Annihilation', 0xb46bff, { dmg: 3900, radius: 19 }),
    quip: '(a giggle that does not stop)',
    bio: 'The concentrated evil of every soul in Hell, given a body and a sword.'
  });

  mk({
    id: 'bojack', name: 'Bojack', race: 'Hera', era: 'Movie', saga: 'Bojack Unbound',
    pwr: 7, spd: 7, def: 7, ki: 7, tec: 6, tier: 3, h: 1.08, bulk: 1.28,
    skin: SK.teal, eye: 0xd8483f, hair: HAIR.bojack, head: { earring: 0xf2d24b },
    aura: 0x63ff9a,
    fit: fit('jacket', 0x2b3a4b, 0xd8582a, 0xf2d24b, { armored: 1, jeans: 0x2b3a4b, sash: 0xd8582a }),
    s1: beam('Galactic Buster', 0x63ff9a, { charge: 1.0, dmg: 950 }),
    s2: rush('Grand Smasher Rush', 0x63ff9a, { hits: 8 }),
    s3: barrage('Psycho Barrier Volley', 0x63ff9a, { count: 14 }),
    s4: nova('Full Power Burst', 0x63ff9a, { dmg: 850, radius: 10 }),
    ult: beam('Galactic Buster Max', 0x2fd85a, { charge: 2.3, dmg: 3200, wide: 2.3 }),
    forms: [form({
      id: 'full', name: 'Full Power', kanji: '全', pwr: 1.8, spd: 1.2, def: 1.5,
      cost: 40, kiDrain: 4, aura: 0x63ff9a, skin: 0x3a8f6a, bulk: 1.25, glow: 0.9
    })],
    quip: 'The galaxy was mine before your grandfather was born.',
    bio: 'A space pirate sealed away by the Kais, freed by a cracked star.'
  });

  mk({
    id: 'tapion', name: 'Tapion', race: 'Konatsian', era: 'Movie', saga: 'Wrath of the Dragon',
    pwr: 6, spd: 7, def: 5, ki: 5, tec: 8, tier: 2, h: 1.0,
    hair: HAIR.tapion, eye: 0x3fbf6a, aura: 0x63ff9a,
    fit: fit('jacket', 0x2f6f4a, 0xf2d24b, 0xd8582a, { armored: 1, jeans: 0x2f4a3a, cape: 1, capeC: 0x2f6f4a, sword: 1 }),
    s1: rush('Brave Sword Attack', 0x63ff9a, { hits: 8, sword: 1 }),
    s2: trick('Hero\'s Song', 0x63ff9a, { mode: 'bind' }),
    s3: barrage('Ocarina Volley', 0x63ff9a, { count: 12 }),
    s4: nova('Konatsian Burst', 0x63ff9a, { dmg: 620, radius: 8 }),
    ult: rush('Brave Cannon', 0x63ff9a, { hits: 14, sword: 1, dmg: 2600 }),
    quip: 'Stay back. You do not want to hear the music stop.',
    bio: 'A hero sealed in a music box with a monster locked inside him.'
  });

  mk({
    id: 'garlic_jr', name: 'Garlic Jr.', race: 'Makyan', era: 'Z', saga: 'Garlic Jr.',
    pwr: 5, spd: 5, def: 6, ki: 6, tec: 6, tier: 2, h: 0.7, bulk: 1.1,
    skin: SK.green, eye: 0xd8483f, hair: hair({ style: 'flat', n: 5, len: 0.1, lift: 0.4, color: 0xf2f2f2 }),
    head: { horns: 'demon' }, aura: 0x8a5ad8,
    fit: fit('demon', 0x2b2b3a, 0x8a5ad8, 0xf2d24b, { armored: 1, cape: 1, capeC: 0x2b2b3a }),
    s1: beam('Dead Zone', 0x8a5ad8, { charge: 1.3, dmg: 1000 }),
    s2: nova('Immortal Burst', 0x8a5ad8, { dmg: 700, radius: 9 }),
    s3: barrage('Makyan Volley', 0x8a5ad8, { count: 12 }),
    s4: trick('Immortality', 0x8a5ad8, { mode: 'heal' }),
    ult: nova('Dead Zone Vortex', 0x8a5ad8, { dmg: 2800, radius: 17 }),
    forms: [form({
      id: 'giant', name: 'Giant Form', kanji: '巨', pwr: 2.1, spd: 0.85, def: 1.9,
      cost: 42, kiDrain: 4, aura: 0x8a5ad8, bulk: 1.7, h: 1.55, glow: 0.7
    })],
    quip: 'I am immortal. You are merely stubborn.',
    bio: 'Wished himself immortal and has been insufferable ever since.'
  });

  /* ----------------------------------------------------------------------
     Normalisation, lookup and unlock rules.
     ------------------------------------------------------------------- */
  R.list = LIST;
  R.byId = {};
  LIST.forEach(function (c, i) { c.index = i; R.byId[c.id] = c; });

  R.get = function (id) { return R.byId[id] || R.byId.goku; };

  R.count = LIST.length;

  /* how many distinct playable states, counting transformations */
  R.formCount = LIST.reduce(function (n, c) { return n + 1 + c.forms.length; }, 0);

  /* Everyone is playable from the start — this is a present, not a grind.
     `starter` just controls who shows first in the select screen.        */
  R.STARTERS = ['goku', 'vegeta', 'gohan', 'trunks', 'piccolo', 'krillin',
    'frieza', 'cell', 'buu_kid', 'broly', 'gogeta', 'beerus'];

  R.ERAS = [
    { id: 'all', name: 'All Fighters' },
    { id: 'Z', name: 'Dragon Ball Z' },
    { id: 'Super', name: 'Dragon Ball Super' },
    { id: 'GT', name: 'Dragon Ball GT' },
    { id: 'Movie', name: 'Movies' },
    { id: 'DB', name: 'Dragon Ball' }
  ];

  R.filter = function (era) {
    if (!era || era === 'all') return LIST.slice();
    return LIST.filter(function (c) { return c.era === era; });
  };

  /* battle power shown on the select screen — pure flavour, but kids love it */
  R.power = function (c, formIdx) {
    var base = (c.pwr * 3 + c.spd + c.def + c.ki * 2 + c.tec) / 8;
    var mult = 1;
    for (var i = 0; i <= (formIdx === undefined ? -1 : formIdx); i++) {
      if (c.forms[i]) mult *= c.forms[i].pwr;
    }
    return Math.round(Math.pow(base, 3.4) * 180 * mult);
  };

})(DBZ);
