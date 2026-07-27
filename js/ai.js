/* ============================================================================
   Dragon Ball Z: Saiyan Cephas — opponent intelligence

   The AI drives a Fighter through exactly the same functions the player's
   buttons do. It never reads a private variable and never cheats on damage:
   the difficulty tiers change how *fast it notices* and *how well it chooses*,
   not what it is allowed to do.

   Three layers:
     1. Perception  — a snapshot of the opponent delayed by reaction time.
     2. Reflexes    — guard / vanish / dodge rolls made against that snapshot.
     3. Planning    — utility scoring over the whole move list, re-run on a
                      timer, with hysteresis so it does not twitch.
   ==========================================================================*/
(function (C) {
  'use strict';

  var M = C.M, Mv = C.Moves;
  var _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

  function AI(f, diffId, opts) {
    opts = opts || {};
    this.f = f;
    this.setDifficulty(diffId);
    this.think = 0;
    this.plan = 'neutral';
    this.planT = 0;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.vanishCd = 0;
    this.guardCd = 0;
    this.specialCd = 0;
    this.dashCd = 0;
    this.transformCd = 2.5;
    this.chargeGoal = 0;
    this.mem = { hp: 1, dist: 10, theirState: 'idle', theirHp: 1, ki: 50 };
    this.buf = [];
    this.rng = M.seeded((opts.seed || 1) * 7919 + 13);
    this.personality = opts.personality || pickPersonality(f, this.rng);
    this.hitStreak = 0;
    this.lastDamageT = 0;
    this.t = 0;
  }

  /* Personalities nudge the utility weights so two Elite opponents do not
     play identically. Assigned from the character's own stat spread.    */
  function pickPersonality(f, rng) {
    var s = f.spec;
    var p = { rusher: 0.5, zoner: 0.5, patient: 0.5, showoff: 0.5 };
    p.rusher = M.sat(0.2 + (s.spd - 5) * 0.08 + (s.pwr - 5) * 0.05);
    p.zoner = M.sat(0.2 + (s.ki - 5) * 0.09 + (s.tec - 5) * 0.04);
    p.patient = M.sat(0.25 + (s.tec - 5) * 0.07 + (s.def - 5) * 0.04);
    p.showoff = M.sat(0.2 + rng() * 0.6);
    return p;
  }

  AI.prototype.setDifficulty = function (id) {
    this.diffId = id;
    this.D = C.diff(id);
    this.f.dmgOut = this.D.dmgOut;
  };

  /* ------------------------------------------------------------ perception
     Everything the AI reacts to goes through this delay line, so a Rookie
     genuinely notices a beam 0.6s late while Legendary sees it at 0.12s. */
  AI.prototype.perceive = function (dt) {
    var f = this.f, t = f.target;
    if (!t) return;
    this.buf.push({
      t: this.t,
      state: t.state, hp: t.hp / t.maxHp, ki: t.ki,
      x: t.pos.x, y: t.pos.y, z: t.pos.z,
      act: t.act ? t.act.type : null,
      arch: t.act && t.act.def ? t.act.def.arch : null,
      phase: t.act ? t.act.phase : null,
      charging: t.state === 'charge',
      dist: f.distTo(t)
    });
    var cutoff = this.t - this.D.react;
    var snap = this.buf[0];
    while (this.buf.length > 1 && this.buf[0].t < cutoff) { snap = this.buf.shift(); }
    if (this.buf.length > 90) this.buf.splice(0, this.buf.length - 90);
    this.see = snap;
  };

  /* --------------------------------------------------------------- threat
     Is something dangerous pointed at me right now? Returns 0..1.       */
  AI.prototype.threat = function () {
    var f = this.f, worst = 0, kind = null;
    var i, p;
    for (i = 0; i < Mv.projs.length; i++) {
      p = Mv.projs[i];
      if (!p.owner || p.owner.team === f.team) continue;
      var to = _v.copy(f.chest(_v2)).sub(p.pos);
      var d = to.length();
      if (d > 26) continue;
      var closing = p.vel.dot(to.normalize());
      if (closing < 4) continue;
      var eta = d / Math.max(1, closing);
      var s = M.sat(1 - eta / 0.9) * M.clamp(p.dmg / 700, 0.3, 1.4);
      if (s > worst) { worst = s; kind = 'proj'; this.threatObj = p; }
    }
    for (i = 0; i < Mv.beams.length; i++) {
      var b = Mv.beams[i];
      if (!b.owner || b.owner.team === f.team) continue;
      var rel = _v.copy(f.chest(_v2)).sub(b.origin);
      var along = rel.dot(b.dir);
      if (along < 0) continue;
      var perp = rel.addScaledVector(b.dir, -along).length();
      if (perp < b.width * 5 + f.radius && along < b.len + 18) {
        var s2 = M.sat(1 - perp / (b.width * 5 + f.radius)) * 1.2;
        if (s2 > worst) { worst = s2; kind = 'beam'; this.threatObj = b; }
      }
    }
    /* an opponent winding up a special in my face */
    if (this.see && this.see.act === 'special' && this.see.phase === 'wind' && this.see.dist < 22) {
      var s3 = 0.75;
      if (s3 > worst) { worst = s3; kind = 'wind'; }
    }
    this.threatKind = kind;
    return worst;
  };

  /* --------------------------------------------------------------- reflexes
     Called by moves.js the instant a melee blow would land.            */
  AI.prototype.wantsVanish = function () {
    var f = this.f, D = this.D;
    if (this.vanishCd > 0 || f.ki < 20) return false;
    var chance = D.vanish;
    /* more likely the deeper the combo, and when hurt */
    var atk = f.hitBy;
    if (atk) chance *= 1 + Math.min(1.4, atk.combo * 0.22);
    if (f.hp / f.maxHp < 0.32) chance *= 1.4;
    chance *= 0.5 + this.personality.patient * 0.8;
    if (this.rng() < chance) {
      this.vanishCd = M.lerp(3.2, 0.9, D.skill) * (0.6 + this.rng() * 0.8);
      this.postVanish = 0.35;
      return true;
    }
    return false;
  };

  /* ---------------------------------------------------------------- update */
  AI.prototype.update = function (dt, world) {
    var f = this.f;
    this.t += dt;
    if (!f.alive) return;
    this.vanishCd -= dt; this.guardCd -= dt; this.specialCd -= dt;
    this.dashCd -= dt; this.transformCd -= dt; this.planT -= dt;
    this.strafeT -= dt;
    if (this.postVanish > 0) this.postVanish -= dt;

    this.perceive(dt);
    var t = f.target;
    if (!t || !t.alive) { this.idle(dt); return; }

    /* beam struggles are a mash contest — the AI mashes at its skill level */
    var st = Mv.inStruggle(f);
    if (st) {
      Mv.pushStruggle(f, dt * (0.35 + this.D.skill * 1.15));
      return;
    }

    if (f.state === 'ko' || f.state === 'down' || f.state === 'rise') return;

    var dist = f.distTo(t);
    var hpFrac = f.hp / f.maxHp;
    var theirHp = t.hp / t.maxHp;

    /* ---- reflex layer -------------------------------------------------- */
    var threat = this.threat();
    if (threat > 0.35 && this.guardCd <= 0) {
      var react = this.D.guard * (0.7 + this.D.skill * 0.6);
      if (this.rng() < react) {
        if (this.threatKind === 'beam' && f.ki > 22 && this.dashCd <= 0) {
          /* sidestep out of a beam rather than eat it */
          var side = _v.set(Math.cos(f.yaw), 0, -Math.sin(f.yaw)).multiplyScalar(this.strafe);
          side.y = 0.45;
          f.startDash(side.normalize());
          this.dashCd = 0.9;
          this.guardCd = 0.5;
          return;
        }
        f.setGuard(true);
        this.guardHold = 0.45 + this.rng() * 0.4;
        this.guardCd = 0.8;
      } else {
        this.guardCd = 0.35;
      }
    }
    if (this.guardHold > 0) {
      this.guardHold -= dt;
      if (this.guardHold <= 0) f.setGuard(false);
      else { this.aimAt(t, dt); return; }
    }

    /* ---- punish a whiff ------------------------------------------------ */
    if (this.see && this.see.act === 'melee' && this.see.phase === 'rec' &&
      dist < 6 && this.rng() < this.D.skill * dt * 9) {
      this.doMelee(world);
      return;
    }

    /* ---- transformation ------------------------------------------------ */
    if (this.transformCd <= 0 && f.canTransform() && f.canAct()) {
      var pressure = (1 - hpFrac) * 0.8 + (theirHp > hpFrac ? 0.4 : 0) + this.personality.showoff * 0.25;
      var want = pressure > (1.05 - this.D.skill * 0.55);
      if (want && dist > 5) {
        f.setState('transform');
        f.transform();
        this.transformCd = 12;
        return;
      }
      this.transformCd = 1.4;
    }

    /* ---- planning ------------------------------------------------------ */
    if (this.planT <= 0) { this.replan(dist, hpFrac, theirHp, world); }

    this.execute(dt, dist, world);
  };

  AI.prototype.replan = function (dist, hpFrac, theirHp, world) {
    var f = this.f, t = f.target, D = this.D, P = this.personality;
    var s = {};

    var kiFrac = f.ki / f.maxKi;

    /* ---- approach / brawl ---- */
    s.brawl = 0.45 + D.aggro * 0.7 + P.rusher * 0.5;
    s.brawl *= dist < 4 ? 1.35 : (dist < 14 ? 1.0 : 0.55);
    if (f.spec.pwr >= 7) s.brawl *= 1.12;
    if (t.state === 'charge') s.brawl *= 1.9;               /* punish charging */
    if (t.state === 'down' || t.state === 'blow') s.brawl *= 1.5;

    /* ---- zoning with ki ---- */
    s.zone = 0.30 + P.zoner * 0.8;
    s.zone *= dist > 9 ? 1.35 : 0.55;
    s.zone *= kiFrac > 0.25 ? 1 : 0.25;

    /* ---- big special ---- */
    s.special = 0;
    if (this.specialCd <= 0 && kiFrac > 0.30) {
      s.special = 0.75 + D.skill * 0.75 + P.showoff * 0.3;
      s.special *= dist > 6 && dist < 55 ? 1.3 : 0.5;
      if (t.state === 'charge' || t.state === 'down' || t.bound > 0) s.special *= 1.8;
      if (t.state === 'beam') s.special *= 1.6;             /* meet it head-on */
    }

    /* ---- ultimate ---- */
    s.ult = 0;
    if (f.ult >= 100) {
      s.ult = 1.0 + D.skill * 0.9;
      s.ult *= (theirHp < 0.45 ? 1.6 : 1);
      s.ult *= dist < 45 ? 1 : 0.3;
      if (t.bound > 0 || t.state === 'down' || t.state === 'blow') s.ult *= 1.9;
    }

    /* ---- recharge ---- */
    s.charge = 0;
    if (kiFrac < 0.55) {
      s.charge = (0.62 - kiFrac) * 2.4 + P.patient * 0.4;
      s.charge *= dist > 16 ? 1.5 : (dist > 8 ? 0.7 : 0.12);
      s.charge *= (1 - D.aggro * 0.4);
    }

    /* ---- back off and breathe ---- */
    s.retreat = 0;
    if (hpFrac < 0.3) s.retreat = (0.35 - hpFrac) * 2.6 * (1 - D.aggro * 0.5) + P.patient * 0.3;
    if (t.combo > 2) s.retreat += 0.4;
    s.retreat *= dist < 8 ? 1.4 : 0.5;

    /* pick the best with a dash of noise scaled inversely to skill */
    var noise = (1 - D.skill) * 0.55;
    var best = null, bestV = -1;
    for (var k in s) {
      var v = s[k] + (this.rng() - 0.5) * noise;
      if (v > bestV) { bestV = v; best = k; }
    }
    /* hysteresis: keep doing the current thing unless clearly beaten */
    if (this.plan !== best && s[this.plan] !== undefined && s[this.plan] > bestV * 0.82) best = this.plan;

    this.plan = best;
    this.planT = M.lerp(0.85, 0.32, D.skill) * (0.7 + this.rng() * 0.6);
    this.scores = s;
  };

  AI.prototype.aimAt = function (t, dt) {
    this.f.faceTarget(dt);
  };

  AI.prototype.execute = function (dt, dist, world) {
    var f = this.f, t = f.target, D = this.D;
    f.setGuard(false);

    switch (this.plan) {
      case 'brawl': this.brawl(dt, dist, world); break;
      case 'zone': this.zone(dt, dist, world); break;
      case 'special': this.useSpecial(dt, dist, world, false); break;
      case 'ult': this.useSpecial(dt, dist, world, true); break;
      case 'charge': this.recharge(dt, dist); break;
      case 'retreat': this.retreat(dt, dist); break;
      default: this.neutral(dt, dist); break;
    }
  };

  /* ------------------------------------------------------------- behaviours */
  AI.prototype.moveToward = function (want, dt, boost) {
    var f = this.f;
    var d = _v.copy(want).sub(f.pos);
    var len = d.length();
    if (len < 0.001) return;
    d.multiplyScalar(1 / len);
    if (Math.abs(d.y) > 0.05 || want.y > 1.2) f.flying = true;
    f.move(d, dt, boost);
  };

  AI.prototype.orbitPoint = function (t, radius, height, dt) {
    var f = this.f;
    if (this.strafeT <= 0) {
      this.strafeT = 0.9 + this.rng() * 1.6;
      if (this.rng() < 0.4) this.strafe = -this.strafe;
    }
    var ang = Math.atan2(f.pos.x - t.pos.x, f.pos.z - t.pos.z) + this.strafe * dt * (1.1 + this.D.skill);
    var want = _v2.set(
      t.pos.x + Math.sin(ang) * radius,
      t.pos.y + height,
      t.pos.z + Math.cos(ang) * radius);
    this.moveToward(want, dt);
  };

  AI.prototype.brawl = function (dt, dist, world) {
    var f = this.f, t = f.target, D = this.D;
    var reach = 2.4 + f.radius * 0.4 + t.radius * 0.4;

    if (dist > 17) {
      /* close the gap with a boost dash */
      if (this.dashCd <= 0 && f.ki > 18 && this.rng() < 0.7) {
        var d = _v.copy(t.chest(_v2)).sub(f.chest(_v3)).normalize();
        f.startDash(d);
        this.dashCd = 0.7 + this.rng() * 0.5;
        return;
      }
      this.moveToward(t.chest(_v), dt, true);
      return;
    }

    if (dist > 5.5) {
      this.moveToward(t.chest(_v), dt, dist > 10);
      /* the auto-close on melee handles the last stretch */
      if (dist < 15 && f.canAct() && this.rng() < (0.35 + D.aggro * 0.5) * dt * 12) {
        this.doMelee(world);
      }
      return;
    }

    /* in the pocket: mix strikes with small repositioning */
    if (f.canAct()) {
      var comboLen = D.comboLen;
      if (f.combo >= comboLen && this.rng() < 0.5) {
        /* finish with the heavy launcher */
        C.Moves.melee(f, world, true);
        this.specialCd = Math.min(this.specialCd, 0.4);
      } else {
        this.doMelee(world);
      }
    } else {
      this.orbitPoint(t, reach * 1.2, 0.2, dt);
    }
  };

  AI.prototype.doMelee = function (world) {
    var f = this.f;
    f.holdAttack = this.rng() < this.D.skill * 0.8;
    f.autoCombo = true;
    C.Moves.melee(f, world, false);
  };

  AI.prototype.zone = function (dt, dist, world) {
    var f = this.f, t = f.target;
    var want = M.lerp(11, 19, this.personality.zoner);
    if (dist < want - 3) {
      var away = _v.copy(f.pos).sub(t.pos).normalize();
      away.y = 0.25;
      this.moveToward(_v2.copy(f.pos).addScaledVector(away, 6), dt);
    } else if (dist > want + 6) {
      this.moveToward(t.chest(_v), dt);
    } else {
      this.orbitPoint(t, want, 1.5, dt);
    }
    if (f.canAct() || f.state === 'guard') {
      if (this.rng() < (0.5 + this.D.skill * 0.5)) C.Moves.kiBlast(f, world);
    }
  };

  AI.prototype.useSpecial = function (dt, dist, world, ult) {
    var f = this.f, t = f.target;
    if (!f.canAct()) { this.orbitPoint(t, Math.max(6, dist), 0.8, dt); return; }

    var pick;
    if (ult) {
      pick = f.spec.ult;
    } else {
      /* choose a move that fits the distance */
      var opts = [f.spec.s1, f.spec.s2, f.spec.s3, f.spec.s4].filter(Boolean);
      var scored = opts.map(function (m) {
        var v = 1;
        if (m.arch === 'beam') v = dist > 7 ? 1.5 : 0.4;
        else if (m.arch === 'sphere') v = dist > 9 ? 1.4 : 0.5;
        else if (m.arch === 'barrage') v = dist > 5 && dist < 26 ? 1.2 : 0.5;
        else if (m.arch === 'disc') v = dist > 6 ? 1.3 : 0.6;
        else if (m.arch === 'nova') v = dist < 9 ? 1.6 : 0.25;
        else if (m.arch === 'rush') v = dist < 20 ? 1.5 : 0.4;
        else if (m.arch === 'swarm') v = dist > 8 ? 1.2 : 0.6;
        else if (m.arch === 'buff') v = 0.7;
        else if (m.arch === 'trick') v = 0.9;
        return { m: m, v: v * (0.7 + Math.random() * 0.6) };
      }).sort(function (a, b) { return b.v - a.v; });
      pick = scored.length ? scored[0].m : null;
    }
    if (!pick) { this.plan = 'brawl'; return; }

    if (C.Moves.special(f, world, pick, ult)) {
      this.specialCd = M.lerp(3.4, 1.2, this.D.skill) * (0.7 + this.rng() * 0.7);
      this.planT = 0.5;
    } else {
      this.plan = f.ki < 30 ? 'charge' : 'brawl';
      this.planT = 0.3;
    }
  };

  AI.prototype.recharge = function (dt, dist) {
    var f = this.f, t = f.target;
    if (dist < 11) {
      var away = _v.copy(f.pos).sub(t.pos);
      away.y = 0;
      if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
      away.normalize();
      away.y = 0.35;
      f.flying = true;
      this.moveToward(_v2.copy(f.pos).addScaledVector(away, 12), dt, true);
      f.stopCharge();
      return;
    }
    if (f.canAct() || f.state === 'charge') {
      f.startCharge();
      if (f.ki > this.chargeGoal) {
        this.chargeGoal = 0;
        f.stopCharge();
        this.plan = 'brawl';
        this.planT = 0.2;
      } else if (!this.chargeGoal) {
        this.chargeGoal = M.lerp(55, 95, this.rng());
      }
    }
  };

  AI.prototype.retreat = function (dt, dist) {
    var f = this.f, t = f.target;
    var away = _v.copy(f.pos).sub(t.pos);
    away.y = 0.4;
    if (away.lengthSq() < 1e-4) away.set(1, 0.4, 0);
    away.normalize();
    f.flying = true;
    if (this.dashCd <= 0 && f.ki > 15) {
      f.startDash(away);
      this.dashCd = 1.2;
      return;
    }
    this.moveToward(_v2.copy(f.pos).addScaledVector(away, 14), dt, true);
    if (dist > 16 && f.canAct()) { this.plan = 'charge'; this.planT = 0.2; }
  };

  AI.prototype.neutral = function (dt, dist) {
    var f = this.f, t = f.target;
    this.orbitPoint(t, M.clamp(dist, 6, 13), 0.6, dt);
  };

  AI.prototype.idle = function (dt) {
    this.f.stopCharge();
  };

  C.AI = AI;

  /* Fighter hook used by moves.js so the defender gets a say. */
  C.Fighter.prototype.aiWantsVanish = function () {
    return this.ai ? this.ai.wantsVanish() : false;
  };

})(DBZ);
