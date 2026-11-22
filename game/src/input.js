// Input: the mouse does the talking (card, then lane; creature, then target),
// the keyboard does the shorthand (1..8 plays that card, Q/W/E aims it at a
// lane, Space ends the turn, M mutes, R restarts). One click router, three
// armed states: nothing, a hand card waiting for a lane, an attacker waiting
// for a target.

export function createInput(stage, hooks) {
  let armed = null; // null | {cardId, spellLane:true} | {cardId, attackerId}

  stage.addEventListener('click', (e) => {
    const laneEl = e.target.closest('.lane');
    const cardEl = e.target.closest('.card');
    const heroFace = e.target.closest('.hero-face');

    // armed hand card waiting for a lane: a lane click casts or plays
    if (armed && armed.cardId && !armed.attackerId && laneEl) {
      const lane = laneEl.dataset.lane;
      const id = armedRef.cardId;
      armed = null;
      hooks.routeHandToLane(id, lane);
      return;
    }
    // armed attacker waiting for a target: a card or the enemy face
    if (armed && armed.attackerId) {
      if (cardEl && cardEl.classList.contains('targetable')) {
        const victim = cardEl.dataset.cardId;
        armed = null;
        hooks.strike(armedRef.attackerId, victim);
        return;
      }
      if (heroFace) {
        armed = null;
        hooks.strikeHero(armedRef.attackerId);
        return;
      }
      if (!cardEl) { armed = null; hooks.disarm(); }
      return;
    }
    // nothing armed: a hand card arms, a hero creature arms as attacker
    if (cardEl && cardEl.closest('.hand-rail')) {
      armed = hooks.armHand(cardEl.dataset.cardId);
      armedRef = { cardId: cardEl.dataset.cardId };
      return;
    }
    if (cardEl && cardEl.closest('.lanes-hero')) {
      armed = hooks.armAttacker(cardEl.dataset.cardId);
      armedRef = { attackerId: cardEl.dataset.cardId };
      return;
    }
    if (!cardEl) { armed = null; hooks.disarm(); }
  });

  let armedRef = null;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); hooks.endTurn(); armed = null; }
    else if (e.key === 'm' || e.key === 'M') hooks.mute();
    else if (e.key === 'r' || e.key === 'R') hooks.restart();
    else if (e.key >= '1' && e.key <= '8') {
      const id = hooks.handIdAt(Number(e.key) - 1);
      if (id) { armed = hooks.armHand(id); armedRef = { cardId: id }; }
    } else if (['q', 'w', 'e'].includes(e.key.toLowerCase())) {
      const lane = { q: 'dawn', w: 'noon', e: 'dusk' }[e.key.toLowerCase()];
      if (armed && armed.cardId) { armed = null; hooks.routeHandToLane(armedRef.cardId, lane); }
    }
  });

  return { get armed() { return armed; }, disarm() { armed = null; hooks.disarm(); } };
}
