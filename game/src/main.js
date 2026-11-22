// Starward's conductor. It wires the sky, the table, the input and the Warden
// together, runs the turn beats with pauses so every move reads, plays the
// sounds the events call for, and stages the four screenshot scenes via
// ?shot=title|table|win|loss (&seed=N) with window.__shotReady.

import { LANES, CARDS, makeCard } from './cards.js';
import { legalLanes, canAttack, attackTargets, takeFx } from './world.js';
import { createWorld, beginTurn, playCard, attack, readOmen } from './world.js';
import { createSky } from './sky.js';
import { createBoard } from './table.js';
import { showTitle, showVictory, showDefeat, hideOverlay } from './screens.js';
import { sfx } from './audio.js';
import { createInput } from './input.js';

const stage = document.getElementById('stage');
const overlay = document.getElementById('overlay');
const status = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const sky = createSky(document.getElementById('skyfield'));
let world = createWorld(seed);
const board = createBoard(stage, {
  omen: () => (world.turn === 'hero' ? readOmen(world) : 'The Warden moves…'),
  hotLane: (lane) => armed?.spellLane === true || Boolean(armed?.attackerId),
});
const input = createInput(stage, makeHooks());
let armed = null;
let muted = false;
let wardenTimer = null;

// ---------- flow ----------
function newGame() {
  world = createWorld(seed ^ (Date.now() & 0xffff));
  hideOverlay(overlay);
  beginTurn(world, 'hero');
  paint();
  sfx.turn();
}

function paint() {
  const playable = armed?.cardId ? legalLanes(world, 'hero', findCard(world.hands.hero, armed.cardId)) : [];
  board.railParts('enemy', world);
  board.railParts('hero', world);
  board.laneCells('enemy', world, null, null);
  board.laneCells('hero', world, armed?.cardId ? playable : null, stage);
  const playableIds = world.hands.hero.filter((c) => legalLanes(world, 'hero', c).length > 0 || c.def.charge).map((c) => c.id);
  board.handCells(world, playableIds, armed?.cardId ?? null, stage);
  markTargets();
  announce();
}

function findCard(list, id) { return list.find((c) => c.id === id); }

/** Ring the cards that may legally receive the armed attacker. */
function markTargets() {
  if (!armed?.attackerId) return;
  const attacker = findCreature(armed.attackerId);
  if (!attacker) return;
  const targets = attackTargets(world, attacker, attackerLaneOf(attacker.id));
  for (const t of targets) {
    const el = t.kind === 'hero'
      ? document.querySelector('.rail.foe .life-orb')
      : document.querySelector(`.card[data-card-id="${t.card.id}"]`);
    if (el) {
      el.classList.add('targetable');
      if (t.kind === 'hero') el.classList.add('hero-face');
    }
  }
}

function findCreature(id) {
  for (const lane of Object.values(world.lanes)) {
    for (const who of ['hero', 'enemy']) {
      const c = findCard(lane[who], id);
      if (c) return c;
    }
  }
  return null;
}

function attackerLaneOf(id) {
  for (const [name, lane] of Object.entries(world.lanes)) {
    if (findCard(lane.hero, id) || findCard(lane.enemy, id)) return name;
  }
  return LANES[0];
}

function announce() {
  status.textContent = world.over
    ? `The duel is over: ${world.over === 'victory' ? 'you win' : 'the Warden wins'}.`
    : `${world.heroes.hero.health} to your name, ${world.heroes.enemy.health} to the Warden's. ${world.turn === 'hero' ? 'Your turn.' : 'The Warden acts.'}`;
}

// ---------- input hooks ----------
function makeHooks() {
  return {
    armHand(cardId) {
      const card = findCard(world.hands.hero, cardId);
      if (!card || card.def.cost > world.mana.hero) return null;
      if (card.def.charge) return { cardId, spellLane: card.def.key === 'gravemark' };
      if (legalLanes(world, 'hero', card).length === 0) return null;
      armed = { cardId };
      paint();
      return { cardId };
    },
    armAttacker(cardId) {
      const card = findCreature(cardId);
      if (!card || card.owner !== 'hero' || !canAttack(card)) return null;
      armed = { attackerId: cardId };
      paint();
      return { attackerId: cardId };
    },
    routeHandToLane(cardId, lane) {
      const card = findCard(world.hands.hero, cardId);
      if (card?.def.charge) {
        castCharge(card, lane);
      } else {
        const played = playCard(world, 'hero', cardId, lane);
        if (played) sfx.play();
      }
      armed = null;
      paint();
    },
    strike(attackerId, victimId) {
      const attacker = findCreature(attackerId);
      const lane = attackerLaneOf(attackerId);
      const victim = findCreature(victimId);
      const done = attack(world, attackerId, lane, { kind: 'creature', card: victim });
      if (done) sfx.strike();
      armed = null;
      paint();
    },
    strikeHero(attackerId) {
      const lane = attackerLaneOf(attackerId);
      const foe = world.turn === 'hero' ? 'enemy' : 'hero';
      const done = attack(world, attackerId, lane, { kind: 'hero', who: foe });
      if (done) sfx.heroHit();
      armed = null;
      paint();
    },
    disarm() { armed = null; paint(); },
    endTurn() { if (world.turn === 'hero' && !world.over) wardenBeat(); },
    mute() { muted = !muted; sfx.toggle(!muted); },
    restart() { if (world.over || confirm('Begin a new duel?')) newGame(); },
    begin() { newGame(); },
  };
}

function castCharge(card, lane) {
  const played = playCard(world, 'hero', card.id, lane);
  if (played) sfx.spell();
}

// ---------- the Warden's beats ----------
function wardenBeat() {
  clearTimeout(wardenTimer);
  // beat 1: announce and play
  const play = wardenPlay();
  wardenTimer = setTimeout(() => wardenStrike(), 1400);
}

function wardenPlay() {
  const plan = wardenChoose();
  if (!plan) return;
  const played = playCard(world, 'enemy', plan.card.id, plan.lane);
  if (played) sfx.play();
  paint();
}

function wardenStrike() {
  const plan = wardenChooseAttack();
  if (plan) {
    const done = attack(world, plan.card.id, plan.laneName, plan.target);
    if (done) {
      if (plan.target.kind === 'hero') sfx.heroHit(); else sfx.strike();
    }
    paint();
    wardenTimer = setTimeout(wardenStrike, 900);
    return;
  }
  wardenTimer = setTimeout(wardenYield, 700);
}

function wardenYield() {
  beginTurn(world, 'hero');
  sfx.turn();
  paint();
}

// The Warden's decisions, imported lazily so the table module stays decoupled.
import { choosePlay, chooseAttack } from './warden.js';
function wardenChoose() { return choosePlay(world); }
function wardenChooseAttack() { return chooseAttack(world); }

// ---------- fx + end ----------
function consumeFx() {
  const fx = takeFx(world);
  for (const f of fx) {
    switch (f.kind) {
      case 'lunge': {
        const el = document.querySelector(`.card[data-card-id="${f.cardId}"]`);
        if (el) el.classList.add('lunge');
        break;
      }
      case 'hit': {
        const el = document.querySelector(`.card[data-card-id="${f.cardId}"]`);
        if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 320); }
        break;
      }
      case 'death': {
        const el = document.querySelector(`.card[data-card-id="${f.cardId}"]`);
        if (el) { el.classList.add('dying'); setTimeout(() => el.remove(), 430); }
        sfx.death();
        break;
      }
      case 'hero-hit': sfx.heroHit(); break;
      case 'heal': sfx.heal(); break;
      case 'spark': case 'cast': sfx.spell(); break;
      default: break;
    }
  }
}

setInterval(() => { if (!world.over) consumeFx(); checkOver(); }, 250);

function checkOver() {
  if (!world.over || overlay.classList.contains('show')) return;
  if (world.over === 'victory') { sfx.victory(); showVictory(overlay, {}); }
  else { sfx.defeat(); showDefeat(overlay, {}); }
}

// ---------- title ----------
showTitle(overlay, { begin: () => newGame() });

// ---------- screenshot staging ----------
if (shot) stageShot();

function stageShot() {
  // Rebuild a fresh world with the seed, run a scripted opening so every
  // scene shows the game at its best, then set __shotReady for the camera.
  world = createWorld(seed);
  hideOverlay(overlay);
  beginTurn(world, 'hero');
  const script = {
    // title: the overlay itself is the scene
    title() { showTitle(overlay, {}); },
    // table: a mid-game table with a contested lane and a full hand
    table() {
      stageTableScene();
    },
    // win: a near-finished duel where the Warden falls
    win() {
      world.heroes.enemy.health = 0;
      world.over = 'victory';
      paint();
    },
    loss() {
      world.heroes.hero.health = 0;
      world.over = 'defeat';
      paint();
    },
  };
  (script[shot] ?? script.table)();
  paint();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

function stageTableScene() {
  // A mid-game table worth showing: contested lanes on both sides, a full
  // hand, real cards built by the game's own factory so numbers stay honest.
  const def = (key) => CARDS.find((d) => d.key === key);
  const heroHand = world.hands.hero;
  heroHand.length = 0;
  for (const key of ['pyrelord', 'tidecaller', 'bloomweaver', 'embernova', 'oathbound', 'stillwater']) {
    heroHand.push(makeCard(def(key), 'hero'));
  }
  world.mana.heroMax = 6; world.mana.hero = 6;
  world.mana.enemyMax = 6; world.mana.enemy = 2;
  world.heroes.enemy.health = 24; world.heroes.hero.health = 26;
  const put = (laneName, who, key, power, vigor) => {
    const c = makeCard(def(key), who);
    if (power !== undefined) c.power = power;
    if (vigor !== undefined) c.vigor = vigor;
    c.justArrived = false; c.hasAttacked = false;
    world.lanes[laneName][who].push(c);
  };
  put('dawn', 'hero', 'tidecaller', 1, 4);
  put('noon', 'hero', 'bloomweaver', 2, 2);
  put('dusk', 'hero', 'ashbrand', 3, 2);
  put('dawn', 'enemy', 'cragward', 1, 2);
  put('noon', 'enemy', 'depthsworn', 3, 5);
  put('dusk', 'enemy', 'moonwarden', 2, 3);
}
