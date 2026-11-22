// The table: one module owns the DOM. It paints both rails (names, life,
// mana, Omen, turn chip), the three lanes with every creature card, and the
// player's hand; it also places hover tooltips and the keyword hints.

import { SUITS, KEYWORDS, LANES } from './cards.js';

export function createBoard(host, hooks) {
  const board = document.getElementById('board');
  const enemyRail = document.createElement('div');
  enemyRail.className = 'rail foe';
  const enemyLanes = document.createElement('div');
  enemyLanes.className = 'lanes lanes-enemy';
  const heroLanes = document.createElement('div');
  heroLanes.className = 'lanes lanes-hero';
  const heroHand = document.createElement('div');
  heroHand.className = 'hand-rail';
  const heroRail = document.createElement('div');
  heroRail.className = 'rail hero';
  board.append(enemyRail, enemyLanes, heroLanes, heroHand, heroRail);

  function railParts(who, world) {
    const hero = world.heroes[who];
    const mine = who === 'hero';
    const rail = mine ? heroRail : enemyRail;
    rail.innerHTML = '';
    const plate = document.createElement('div');
    plate.className = 'nameplate';
    plate.innerHTML = `<span class="who">${hero.name}</span>`;
    if (!mine) {
      const omen = document.createElement('span');
      omen.className = 'omen';
      omen.textContent = hooks.omen();
      plate.appendChild(omen);
    }
    const life = document.createElement('div');
    life.className = 'lifebar';
    const fillPct = Math.max(0, (hero.health / hero.maxHealth) * 100);
    life.innerHTML = `
      <div class="life-orb ${mine ? '' : 'enemy'} ${hero.health !== hero._shown ? 'dinged' : ''}">${hero.health}</div>
      <div class="life-track"><div class="life-fill ${mine ? '' : 'enemy'}" style="width:${fillPct}%"></div></div>`;
    const mana = document.createElement('div');
    mana.className = 'mana';
    let sparks = '';
    for (let i = 0; i < world.mana[`${who}Max`]; i++) {
      sparks += `<span class="spark ${i < world.mana[who] ? '' : 'spent'}"></span>`;
    }
    mana.innerHTML = sparks + `<span class="mana-count">${world.mana[who]}/${world.mana[`${who}Max`]}</span>`;
    const chip = document.createElement('div');
    chip.className = `turn-chip ${world.turn === who ? '' : 'theirs'} ${world.turn === who && who === 'hero' ? 'settling' : ''}`;
    chip.textContent = world.turn === who ? (mine ? 'Your turn' : 'Warden acts') : 'Waiting';
    rail.append(plate, life, mana, chip);
    if (!mine) {
      // the Warden's hand, face down, so both hands are always on the table
      const backs = document.createElement('div');
      backs.className = 'hand-backs';
      for (let i = 0; i < world.hands.enemy.length; i++) {
        const back = document.createElement('span');
        back.className = 'card-back';
        back.textContent = '✦';
        backs.appendChild(back);
      }
      plate.appendChild(backs);
    }
    hero._shown = hero.health;
  }

  function cardEl(card, opts) {
    const el = document.createElement('div');
    const suit = SUITS[card.def.suit];
    el.className = `card ${suit.color} ${card.def.charge ? 'spell' : ''} ${opts.cls ?? ''}`;
    el.dataset.cardId = card.id;
    const kw = (card.def.keywords ?? []).map((k) => KEYWORDS[k]).join('; ');
    el.innerHTML = `
      <span class="cost-coin">${card.def.cost}</span>
      <span class="glyph">${suit.glyph}</span>
      <span class="caption">${card.def.name}</span>
      ${card.def.charge ? '' : `<span class="stats"><span class="stat pow">${card.power}</span><span class="stat vig">${card.vigor}</span></span>`}`;
    if (opts.tip && kw) {
      el.addEventListener('mouseenter', (e) => showTip(opts.tip, el, `<b>${card.def.name}</b> — ${kw}`));
      el.addEventListener('mouseleave', hideTip);
    }
    return el;
  }

  function laneCells(who, world, playable, tip) {
    const wrap = who === 'hero' ? heroLanes : enemyLanes;
    wrap.innerHTML = '';
    for (const laneName of LANES) {
      const laneEl = document.createElement('div');
      laneEl.className = `lane ${playable?.includes(laneName) ? 'playable' : ''} ${hooks.hotLane?.(laneName) ? 'hot' : ''}`;
      laneEl.dataset.lane = laneName;
      const rune = document.createElement('span');
      rune.className = 'lane-rune';
      rune.textContent = laneName;
      laneEl.appendChild(rune);
      for (const card of world.lanes[laneName][who]) {
        const el = cardEl(card, { tip: who === 'hero' ? tip : null, cls: who === 'enemy' ? 'flip' : '' });
        laneEl.appendChild(el);
      }
      wrap.appendChild(laneEl);
    }
  }

  function handCells(world, playableIds, armedId, tip) {
    heroHand.innerHTML = '';
    for (const card of world.hands.hero) {
      const canPlay = playableIds.includes(card.id) || card.def.charge;
      const afford = card.def.cost <= world.mana.hero;
      const el = cardEl(card, {
        tip,
        cls: `${canPlay && afford ? 'hoverable' : ''} ${!afford ? 'unaffordable' : ''} ${armedId === card.id ? 'armed' : ''}`,
      });
      heroHand.appendChild(el);
    }
  }

  function showTip(host, cardEl, html) {
    hideTip();
    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.innerHTML = html;
    const r = cardEl.getBoundingClientRect();
    tip.style.left = `${Math.min(r.left, window.innerWidth - 260)}px`;
    tip.style.top = `${Math.max(8, r.top - 52)}px`;
    host.appendChild(tip);
  }
  function hideTip() {
    for (const t of document.querySelectorAll('.tip')) t.remove();
  }

  return { railParts, cardEl, laneCells, handCells, showTip, hideTip };
}
