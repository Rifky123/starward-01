// Starward — card definitions and constants. One place for the four suits, the
// keyword texts, and the whole roster: creatures with cost / power / vigor,
// and star (spell) cards with a one-word charge.

export const SUITS = {
  ember: { label: 'Ember', color: 'ember', glyph: '▲', blurb: 'fierce, striking first' },
  tide: { label: 'Tide', color: 'tide', glyph: '●', blurb: 'patient, warding the lane' },
  bloom: { label: 'Bloom', color: 'bloom', glyph: '✦', blurb: 'woven, casting sparks' },
  stone: { label: 'Stone', color: 'stone', glyph: '■', blurb: 'stubborn, holding ground' },
};

export const KEYWORDS = {
  Rush: 'may attack the turn it arrives',
  Guard: 'enemies in its lane must strike it first',
  Spark: 'when it arrives, deal its power to the enemy hero',
  Mend: 'when it arrives, restore 2 health to your hero',
  Echo: 'when it dies, deal 1 damage to every enemy creature in its lane',
};

export const START_HEALTH = 30;
export const MAX_MANA = 10;
export const HAND_MAX = 8;
export const LANES = ['dawn', 'noon', 'dusk'];

/** The whole roster. power/vigor only on creatures; charge marks a star card. */
export const CARDS = [
  { key: 'cinderwhelp', name: 'Cinderwhelp', suit: 'ember', cost: 1, power: 2, vigor: 1, keywords: ['Rush'] },
  { key: 'ashbrand', name: 'Ashbrand', suit: 'ember', cost: 2, power: 3, vigor: 2, keywords: [] },
  { key: 'pyrelord', name: 'Pyrelord Kaal', suit: 'ember', cost: 5, power: 5, vigor: 4, keywords: ['Rush'] },
  { key: 'embernova', name: 'Ember Nova', suit: 'ember', cost: 4, charge: 'Deal 3 damage to every enemy creature.' },
  { key: 'tidecaller', name: 'Tidecaller', suit: 'tide', cost: 2, power: 1, vigor: 4, keywords: ['Guard'] },
  { key: 'depthsworn', name: 'Depthsworn Bulwark', suit: 'tide', cost: 4, power: 3, vigor: 7, keywords: ['Guard'] },
  { key: 'moonwarden', name: 'Moonwarden', suit: 'tide', cost: 3, power: 2, vigor: 3, keywords: ['Mend'] },
  { key: 'stillwater', name: 'Stillwater Veil', suit: 'tide', cost: 2, charge: 'Restore 5 health to your hero.' },
  { key: 'bloomweaver', name: 'Bloomweaver', suit: 'bloom', cost: 2, power: 2, vigor: 2, keywords: ['Spark'] },
  { key: 'starlance', name: 'Starlance Adept', suit: 'bloom', cost: 4, power: 3, vigor: 3, keywords: ['Spark'] },
  { key: 'veilseer', name: 'Veilseer Ilun', suit: 'bloom', cost: 6, power: 4, vigor: 5, keywords: ['Spark', 'Rush'] },
  { key: 'starfall', name: 'Starfall', suit: 'bloom', cost: 3, charge: 'Deal 4 damage to the strongest enemy creature.' },
  { key: 'cragward', name: 'Cragward', suit: 'stone', cost: 1, power: 1, vigor: 3, keywords: ['Guard'] },
  { key: 'oathbound', name: 'Oathbound Sentry', suit: 'stone', cost: 3, power: 2, vigor: 5, keywords: ['Guard'] },
  { key: 'mountainsire', name: 'Mountainsire Ur', suit: 'stone', cost: 6, power: 6, vigor: 7, keywords: [] },
  { key: 'gravemark', name: 'Gravemark', suit: 'stone', cost: 2, charge: 'A dying enemy creature deals 1 damage to every creature in its lane.' },
];

/** A card instance the duel actually plays: a definition plus its own state. */
export function makeCard(def, owner) {
  return {
    id: `${def.key}-${Math.floor(Math.random() * 1e9).toString(36)}`,
    def,
    owner,
    power: def.power ?? 0,
    vigor: def.vigor ?? 0,
    hasAttacked: false,
    justArrived: true,
  };
}

/** Build both libraries and shuffle them with the seeded random. */
export function buildDecks(random) {
  const one = [];
  for (const def of CARDS) {
    const copies = def.charge ? 2 : 3;
    for (let i = 0; i < copies; i++) one.push(def);
  }
  return [shuffle(one.map((d) => makeCard(d, 'hero')), random),
          shuffle(one.map((d) => makeCard(d, 'enemy')), random)];
}

/** Fisher–Yates driven by the duel's seeded random, so seeds replay. */
function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = random.int(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
