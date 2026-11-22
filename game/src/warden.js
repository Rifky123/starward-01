// The Warden of Dusk — the opponent. Its mind is deliberately readable: the
// Omen line announces the card it means to play, so the player can counter.
// Play proceeds in two visible beats (cast, then strike) with a pause between.

import { LANES } from './cards.js';
import { legalLanes, canAttack, attackTargets, drawCard } from './world.js';

/** Pick the card the Warden plays and the lane it plays it in. */
export function choosePlay(world) {
  const hand = world.hands.enemy;
  const affordable = hand.filter((c) => legalLanes(world, 'enemy', c).length > 0);
  if (affordable.length === 0) return null;
  // The Warden values creatures over spells, bigger over smaller, and
  // answers a threatened lane by playing there.
  affordable.sort((a, b) => scorePlay(world, b) - scorePlay(world, a));
  const pick = affordable[0];
  const lanes = legalLanes(world, 'enemy', pick);
  const lane = pickLane(world, pick, lanes);
  return { card: pick, lane };
}

function scorePlay(world, card) {
  let score = card.def.cost * 2;
  if (card.def.charge) score += 3;
  if ((card.def.keywords ?? []).includes('Guard')) score += 1;
  return score;
}

function pickLane(world, card, lanes) {
  // Prefer the lane where the player's strongest creature stands, to fight it.
  let best = lanes[0];
  let bestThreat = -1;
  for (const laneName of lanes) {
    const foes = world.lanes[laneName].hero;
    const threat = foes.reduce((m, c) => Math.max(m, c.power), 0);
    if (threat > bestThreat) { bestThreat = threat; best = laneName; }
  }
  return best;
}

/** One strike per beat; the table drives the Warden beat by beat. */
export function chooseAttack(world) {
  for (const laneName of LANES) {
    const lane = world.lanes[laneName].enemy;
    for (const card of lane) {
      if (!canAttack(card)) continue;
      const targets = attackTargets(world, card, laneName);
      if (targets.length === 0) continue;
      // Hit the face when unguarded; otherwise trade into the biggest threat.
      const heroTarget = targets.find((t) => t.kind === 'hero');
      if (heroTarget) return { card, laneName, target: heroTarget };
      targets.sort((a, b) => b.card.power - a.card.power);
      return { card, laneName, target: targets[0] };
    }
  }
  return null;
}

export function endEnemyTurn(world) {
  drawCard(world, 'enemy');
}
