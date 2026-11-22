// The sky: three parallax star layers the stage keeps drifting behind the
// duel. Cheap DOM dots moved on a single rAF, paused while the tab hides.

const LAYERS = [
  { count: 70, size: [1, 2.2], speed: 4, opacity: 0.5 },
  { count: 46, size: [2, 3.4], speed: 9, opacity: 0.75 },
  { count: 18, size: [3, 5], speed: 16, opacity: 1 },
];

export function createSky(host) {
  const layers = LAYERS.map((layer) => {
    const dots = [];
    for (let i = 0; i < layer.count; i++) {
      const el = document.createElement('span');
      el.className = 'star';
      const size = layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.opacity = String(layer.opacity * (0.5 + Math.random() * 0.5));
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      host.appendChild(el);
      dots.push({ el, x: Math.random() * 100, y: Math.random() * 100 });
    }
    return { ...layer, dots };
  });

  let running = true;
  let last = performance.now();
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    last = performance.now();
  });

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (running) {
      for (const layer of layers) {
        for (const dot of layer.dots) {
          dot.y += layer.speed * dt;
          if (dot.y > 100) { dot.y = -2; dot.x = Math.random() * 100; }
          dot.el.style.transform = `translate(${dot.x * window.innerWidth / 100}px, ${dot.y * window.innerHeight / 100}px)`;
        }
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
