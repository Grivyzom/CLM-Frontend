import { useEffect, useRef } from 'react';

/*
 * Arte algorítmico de fondo: campo de flujo (flow field).
 * Cientos de partículas siguen el ángulo de un ruido 3D (x, y, tiempo) y
 * dejan trazos de "tinta" que se desvanecen lentamente. El cursor curva el
 * campo a su alrededor. Los colores salen de los tokens CSS del tema
 * (--primary, --text-primary) y se releen al cambiar data-theme.
 *
 * - prefers-reduced-motion: se dibuja una sola composición estática.
 * - Pestaña oculta: el loop se pausa.
 */

// ── Ruido de valor 3D con permutación sembrada (determinista) ──
function createNoise3D(seed = 1337) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash = (x, y, z) => perm[perm[perm[x & 255] + (y & 255)] + (z & 255)] / 255;

  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
    const x00 = lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), u);
    const x10 = lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u);
    const x01 = lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u);
    const x11 = lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  };
}

const SCALE = 0.0016;      // frecuencia espacial del campo
const TIME_SPEED = 0.00012; // evolución temporal del campo
const SPEED = 0.9;          // px por frame
const FADE = 0.018;         // cuánto se borran los trazos por frame
const MOUSE_RADIUS = 160;

export default function FlowFieldBackground({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const noise = createNoise3D(20260);
    let width = 0, height = 0, dpr = 1;
    let particles = [];
    let colors = { accent: '#2563eb', ink: '#000', alphaInk: 0.1, alphaAccent: 0.22 };
    let raf = 0;
    let t = Math.random() * 1000;
    const mouse = { x: -9999, y: -9999, active: false };

    const readColors = () => {
      const cs = getComputedStyle(canvas);
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      colors = {
        accent: cs.getPropertyValue('--primary').trim() || '#2563eb',
        ink: cs.getPropertyValue('--text-primary').trim() || '#1c1917',
        alphaInk: dark ? 0.1 : 0.09,
        alphaAccent: dark ? 0.32 : 0.24,
      };
    };

    const spawn = (p) => {
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.px = p.x;
      p.py = p.y;
      p.life = 80 + Math.random() * 220;
      p.accent = Math.random() < 0.18;
      return p;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(900, Math.round((width * height) / 2600));
      particles = Array.from({ length: count }, () => spawn({}));
    };

    const step = () => {
      // Desvanecer trazos previos manteniendo el canvas transparente
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${FADE})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      const inkPath = new Path2D();
      const accentPath = new Path2D();

      for (const p of particles) {
        const n = noise(p.x * SCALE, p.y * SCALE, t);
        let angle = n * Math.PI * 2.6;

        if (mouse.active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_RADIUS * MOUSE_RADIUS) {
            // Remolino tangencial alrededor del cursor
            const k = 1 - Math.sqrt(d2) / MOUSE_RADIUS;
            angle += k * k * Math.PI * 0.9;
          }
        }

        p.px = p.x;
        p.py = p.y;
        p.x += Math.cos(angle) * SPEED;
        p.y += Math.sin(angle) * SPEED;
        p.life -= 1;

        if (p.life <= 0 || p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10) {
          spawn(p);
          continue;
        }

        const path = p.accent ? accentPath : inkPath;
        path.moveTo(p.px, p.py);
        path.lineTo(p.x, p.y);
      }

      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.globalAlpha = colors.alphaInk;
      ctx.strokeStyle = colors.ink;
      ctx.stroke(inkPath);
      ctx.globalAlpha = colors.alphaAccent;
      ctx.strokeStyle = colors.accent;
      ctx.stroke(accentPath);
      ctx.globalAlpha = 1;

      t += TIME_SPEED * 16;
    };

    const loop = () => {
      step();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      if (reduced) {
        // Composición estática: acumular trazos sin animar
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < 140; i++) step();
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduced) start();
    };

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onPointerLeave = () => { mouse.active = false; };

    readColors();
    resize();
    start();

    const ro = new ResizeObserver(() => { resize(); start(); });
    ro.observe(canvas);

    const mo = new MutationObserver(() => {
      readColors();
      ctx.clearRect(0, 0, width, height);
      if (reduced) start();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    document.addEventListener('visibilitychange', onVisibility);
    if (!reduced) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
