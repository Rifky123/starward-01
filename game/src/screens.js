// Overlay screens: the title with its how-to, the victory flourish with its
// star burst, and the defeat with the Warden's courtesy. One show() per mood.

const CREST = '✦ ▲ ● ■ ◆';

export function showTitle(overlay, hooks) {
  overlay.innerHTML = `
    <div class="panel">
      <div class="crest">${CREST}</div>
      <h1>Starward</h1>
      <div class="sub">a duel of the night court</div>
      <p class="lead">The Warden of Dusk holds the night. Call creatures of
      Ember, Tide, Bloom and Stone to three lanes, spend your starlight well,
      and cast the Warden down before it casts you down.</p>
      <p class="lead">A card's <b>coin</b> is its starlight cost. <b>⚔ power</b>
      strikes, <b>❦ vigor</b> endures. Click a card, then a lane. Then click
      your creatures to strike — or press <b>Space</b> to end your turn.</p>
      <button class="bigbtn" id="btn-begin">Begin the duel</button>
      <p class="hint">M mutes sound · R begins again · the Omen shows the Warden's plan</p>
    </div>`;
  overlay.classList.add('show');
  overlay.querySelector('#btn-begin').focus();
  overlay.querySelector('#btn-begin').addEventListener('click', hooks.begin);
}

export function showVictory(overlay, hooks) {
  overlay.innerHTML = `
    <div class="panel">
      <div class="crest">👑</div>
      <h1 class="victory">Dawn Claimed</h1>
      <div class="sub">the night court yields — the Warden bows, and the stars keep their word</div>
      <button class="bigbtn" id="btn-again">Duel again</button>
      <p class="hint">R also begins a new duel</p>
    </div>`;
  overlay.classList.add('show');
  overlay.querySelector('#btn-again').addEventListener('click', hooks.restart);
  starBurst(overlay);
}

export function showDefeat(overlay, hooks) {
  overlay.innerHTML = `
    <div class="panel">
      <div class="crest">☾</div>
      <h1 class="defeat">Dusk Falls</h1>
      <div class="sub">the Warden keeps the night — it bows anyway, as a courteous warden should</div>
      <button class="bigbtn" id="btn-again">Rise again</button>
      <p class="hint">R also begins a new duel</p>
    </div>`;
  overlay.classList.add('show');
  overlay.querySelector('#btn-again').addEventListener('click', hooks.restart);
}

function starBurst(overlay) {
  for (let i = 0; i < 26; i++) {
    const star = document.createElement('span');
    star.className = 'confetti-star';
    star.textContent = ['✦', '★', '✧', '⭑'][i % 4];
    star.style.left = '50%';
    star.style.top = '40%';
    star.style.setProperty('--dx', `${(Math.random() - 0.5) * 700}px`);
    star.style.setProperty('--dy', `${(Math.random() - 0.6) * 500}px`);
    star.style.animationDelay = `${Math.random() * 0.4}s`;
    overlay.appendChild(star);
  }
}

export function hideOverlay(overlay) {
  overlay.classList.remove('show');
  overlay.innerHTML = '';
}
