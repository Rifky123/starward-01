// The duel's state machine. World holds both heroes, the three lanes, both
// decks and hands, whose turn it is, and the event log the table acts on.
// Pure logic: no DOM, no timers, so seeds and play-tests replay exactly.

import { LANES, START_HEALTH, HAND_MAX, buildDecks, makeCard } from './cards.js';

export const EVENT_ARRIVE = 'arrive';
export const EVENT_ATTACK = 'attack';
export const EVENT_DEATH = 'death';
export const EVENT_DAMAGE = 'damage';
export const EVENT_SPELL = 'spell';
export const EVENT_TURN = 'turn';
export const EVENT_END = 'end';

export function createWorld(seed) {
  const random = createSeededRandom(seed);
  const [heroDeck, enemyDeck] = buildDecks(random);
  const world = {
    seed,
    random,
    heroes: { hero: { name: 'You, the Dawn Claimant', health: START_HEALTH, maxHealth: START_HEALTH }, enemy: { name: 'Warden of Dusk', health: START_HEALTH, maxHealth: START_HEALTH } },
    lanes: Object.fromEntries(LANES.map((l) => [l, { hero: [], enemy: [] }])),
    decks: { hero: heroDeck, enemy: enemyDeck },
    hands: { hero: [], enemy: [] },
    mana: { hero: 0, enemy: 0, heroMax: 0, enemyMax: 0 },
    turn: 'hero',
    turnNumber: 0,
    over: null, // null | 'victory' | 'defeat'
    log: [],
    // transient animation requests the table consumes and clears
    fx: [],
  };
  for (let i = 0; i < 3; i++) drawCard(world, 'hero');
  for (let i = 0; i < 4; i++) drawCard(world, 'enemy');
  world.hands.hero = world.hands.hero; // dealt face-up below
  return world;
}

/** mulberry32: tiny, fast, seed-replayable. */
export function createSeededRandom(seed) {
  let s = seed >>> 0;
  return {
    next() {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) { return Math.floor(this.next() * n); },
  };
}

export function drawCard(world, who) {
  const hand = world.hands[who];
  if (hand.length >= HAND_MAX || world.decks[who].length === 0) return null;
  const card = world.decks[who].shift();
  hand.push(card);
  return card;
}

export function beginTurn(world, who) {
  world.turn = who;
  world.turnNumber += 1;
  const mana = world.mana;
  const cap = Math.min(mana[`${who}Max`] + 1, 10);
  mana[`${who}Max`] = cap;
  mana[who] = cap;
  for (const lane of Object.values(world.lanes)) {
    for (const c of lane[who]) { c.justArrived = false; c.hasAttacked = false; }
  }
  drawCard(world, who);
  world.log.push({ event: EVENT_TURN, who });
}

/** Every lane where `who` may legally play the armed card right now. */
export function legalLanes(world, who, card) {
  if (card.def.charge || card.def.cost > world.mana[who]) return [];
  return LANES.filter((l) => world.lanes[l][who].length < 2);
}

/** Lane the spell may land on, for cards that need one. */
export function spellNeedsLane(card) {
  return card.def.key === 'gravemark';
}

export function playCard(world, who, cardId, laneName) {
  const hand = world.hands[who];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;
  const card = hand[idx];
  const lanes = legalLanes(world, who, card);
  if (card.def.charge) {
    world.mana[who] -= card.def.cost;
    hand.splice(idx, 1);
    resolveSpell(world, who, card, laneName);
    return card;
  }
  if (!lanes.includes(laneName)) return null;
  world.mana[who] -= card.def.cost;
  hand.splice(idx, 1);
  world.lanes[laneName][who].push(card);
  world.log.push({ event: EVENT_ARRIVE, card, lane: laneName });
  applyArrival(world, who, card, laneName);
  return card;
}

function applyArrival(world, who, card, laneName) {
  const keywords = card.def.keywords ?? [];
  if (keywords.includes('Spark')) {
    const foe = who === 'hero' ? 'enemy' : 'hero';
    damageHero(world, foe, card.power);
    world.fx.push({ kind: 'spark', lane: laneName, who });
  }
  if (keywords.includes('Mend')) healHero(world, who, 2);
}

/** Which enemy creatures a creature may strike: Guard redirects inside the lane. */
export function attackTargets(world, attacker, laneName) {
  const foe = attacker.owner === 'hero' ? 'enemy' : 'hero';
  const lane = world.lanes[laneName];
  const guards = lane[foe].filter((c) => (c.def.keywords ?? []).includes('Guard'));
  const pool = guards.length > 0 ? guards : lane[foe];
  const targets = pool.map((c) => ({ kind: 'creature', card: c }));
  if (guards.length === 0) targets.push({ kind: 'hero', who: foe });
  return targets;
}

export function canAttack(card) {
  const kw = card.def.keywords ?? [];
  const ready = !card.hasAttacked && (card.power > 0) &&
    (!card.justArrived || kw.includes('Rush'));
  return ready;
}

export function attack(world, attackerId, laneName, target) {
  for (const lane of Object.values(world.lanes)) {
    const attacker = [...lane.hero, ...lane.enemy].find((c) => c.id === attackerId);
    if (!attacker || !canAttack(attacker)) continue;
    if (!attackTargets(world, attacker, laneName).some((t) =>
      t.kind === 'hero' ? t.who === target.who : t.card.id === target.card?.id)) return null;
    attacker.hasAttacked = true;
    world.log.push({ event: EVENT_ATTACK, card: attacker, lane: laneName, target });
    strike(world, attacker, target, laneName);
    return attacker;
  }
  return null;
}

function strike(world, attacker, target, laneName) {
  const foe = attacker.owner === 'hero' ? 'enemy' : 'hero';
  world.fx.push({ kind: 'lunge', cardId: attacker.id,
    lx: attacker.owner === 'hero' ? 0 : 0,
    ly: attacker.owner === 'hero' ? -46 : 46 });
  if (target.kind === 'hero') {
    damageHero(world, foe, attacker.power);
    hitCreatureFx(world, null);
  } else {
    const victim = target.card;
    victim.vigor -= attacker.power;
    attacker.vigor -= victim.power;
    world.fx.push({ kind: 'hit', cardId: victim.id });
    world.fx.push({ kind: 'hit', cardId: attacker.id });
    world.log.push({ event: EVENT_DAMAGE, card: victim, amount: attacker.power });
    reapDead(world, laneName);
  }
}

/** Gravemark: a dying creature's lane-wide parting damage. */
function gravemarkBlast(world, dying, laneName) {
  const lane = world.lanes[laneName];
  const foe = dying.owner === 'hero' ? 'enemy' : 'hero';
  for (const c of [...lane.hero, ...lane.enemy]) {
    if (c === dying) continue;
    c.vigor -= 1;
  }
  world.fx.push({ kind: 'grave', lane: laneName });
  reapDead(world, laneName);
}

/** Remove the dead, run Echo and Gravemark chains, end the duel if a hero falls. */
function reapDead(world, laneName) {
  for (const who of ['hero', 'enemy']) {
    const lane = world.lanes[laneName][who];
    for (let i = lane.length - 1; i >= 0; i--) {
      const c = lane[i];
      if (c.vigor > 0) continue;
      lane.splice(i, 1);
      world.fx.push({ kind: 'death', cardId: c.id, lane: laneName });
      world.log.push({ event: EVENT_DEATH, card: c, lane: laneName });
      if ((c.def.keywords ?? []).includes('Echo')) {
        const foe = who === 'hero' ? 'enemy' : 'hero';
        for (const t of world.lanes[laneName][foe]) t.vigor -= 1;
        reapDead(world, laneName);
      }
      if (c.def.key === 'grave-touched') gravemarkBlast(world, c, laneName);
    }
  }
  checkEnd(world);
}

function resolveSpell(world, who, card, laneName) {
  const foe = who === 'hero' ? 'enemy' : 'hero';
  world.log.push({ event: EVENT_SPELL, card });
  world.fx.push({ kind: 'cast', cardId: card.id });
  switch (card.def.key) {
    case 'embernova': {
      for (const lane of Object.values(world.lanes)) {
        for (const c of lane[foe]) { c.vigor -= 3; world.fx.push({ kind: 'hit', cardId: c.id }); }
      }
      break;
    }
    case 'stillwater': healHero(world, who, 5); break;
    case 'starfall': {
      let best = null;
      for (const lane of Object.values(world.lanes)) {
        for (const c of lane[foe]) if (!best || c.power > best.power) best = c;
      }
      if (best) {
        best.vigor -= 4;
        world.fx.push({ kind: 'hit', cardId: best.id });
      }
      break;
    }
    case 'gravemark': {
      const lane = laneName ? world.lanes[laneName] : null;
      if (lane) {
        for (const c of [...lane.hero, ...lane.enemy]) c.graveMarked = true;
        world.fx.push({ kind: 'grave', lane: laneName });
      }
      break;
    }
    default: break;
  }
  for (const name of Object.keys(world.lanes)) reapDead(world, name);
}

function damageHero(world, who, amount) {
  world.heroes[who].health -= amount;
  world.fx.push({ kind: 'hero-hit', who, amount });
  world.log.push({ event: EVENT_DAMAGE, hero: who, amount });
  checkEnd(world);
}

function healHero(world, who, amount) {
  world.heroes[who].health = Math.min(world.heroes[who].health + amount, world.heroes[who].maxHealth);
  world.fx.push({ kind: 'heal', who, amount });
}

function hitCreatureFx(world) { /* hero strikes carry their own fx */ }

export function checkEnd(world) {
  if (world.over) return;
  if (world.heroes.enemy.health <= 0) world.over = 'victory';
  else if (world.heroes.hero.health <= 0) world.over = 'defeat';
  if (world.over) world.log.push({ event: EVENT_END, result: world.over });
}

/** Drain the fx queue the table has consumed. */
export function takeFx(world) {
  const fx = world.fx;
  world.fx = [];
  return fx;
}

/** The Warden's readable plan for this turn, shown as the Omen line. */
export function readOmen(world) {
  const hand = world.hands.enemy;
  if (hand.length === 0) return 'The Warden gathers dust and waits.';
  const affordable = hand.filter((c) => c.def.cost <= world.mana.enemy);
  if (affordable.length === 0) return 'The Warden hoards starlight, saving for a greater card.';
  affordable.sort((a, b) => b.def.cost - a.def.cost);
  const plan = affordable[0];
  const lane = LANES[world.random.int(LANES.length)];
  if (plan.def.charge) return `The Warden means to loose ${plan.def.name} — ${plan.def.charge}`;
  const laneWord = { dawn: 'the dawn lane', noon: 'the noon lane', dusk: 'the dusk lane' }[lane];
  const guard = (plan.def.keywords ?? []).includes('Guard') ? ' to bar your road' : '';
  const rush = (plan.def.keywords ?? []).includes('Rush') ? ' and it strikes at once' : '';
  return `The Warden means to raise ${plan.def.name} in ${laneWord}${guard}${rush}.`;
}
