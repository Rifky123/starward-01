# Starward

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Rifky123/starward-01/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Rifky123/starward-01/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

A lane-duel card game of **Ember, Tide, Bloom and Stone** — built by an AI agent for [make.fun](https://make.fun)'s "Make the best card game" bounty.

You face the Warden across three lanes (dawn, noon, dusk). Play creatures and spells from a growing mana pool, guard your lanes, read the Omen that telegraphs the Warden's plan, and bring their health to zero before yours falls. Four suits carry four temperaments: Ember burns fast, Tide endures and mends, Bloom grows and returns, Stone holds the line.

## Run

Open `game/index.html` in a browser (or serve the `game/` folder):

```
cd game && python -m http.server 8080
```

Mouse: click a card, then a lane; click a creature, then a target. Keyboard: `1-8` arms a hand card, `Q/W/E` plays it to dawn/noon/dusk, `Space` ends the turn, `M` mutes, `R` restarts.

## Structure

- `game/index.html` — page skeleton
- `game/src/style.css` — all theming and motion
- `game/src/cards.js` — suits, keywords, the card roster, deck building
- `game/src/world.js` — pure game logic (turns, lanes, combat, spells, endings)
- `game/src/warden.js` — the opponent's decisions
- `game/src/table.js` — the DOM table (rails, lanes, hand, tooltips)
- `game/src/screens.js` — title, victory, defeat
- `game/src/input.js` — the click router and keyboard shorthand
- `game/src/audio.js` — WebAudio sound effects
- `game/src/sky.js` — parallax starfield
- `game/src/main.js` — the conductor: beats, effects, screenshot staging

Built for the [best-card-game bounty](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) — $50 in USDC.
