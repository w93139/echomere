'use client';

import { useEffect, useRef } from 'react';
import './RippleDistortion.css';

const MAX_RIPPLES = 24;

function drawBackdrop(context, width, height, now) {
  context.fillStyle = '#050506';
  context.fillRect(0, 0, width, height);

  const centerX = width * 0.53;
  const centerY = height * 0.49;
  const span = Math.max(width, height);
  const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, span * 0.72);
  glow.addColorStop(0, '#020203');
  glow.addColorStop(0.11, '#050407');
  glow.addColorStop(0.24, '#17111d');
  glow.addColorStop(0.43, '#0c151a');
  glow.addColorStop(0.7, '#09070b');
  glow.addColorStop(1, '#030304');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const shimmer = Math.sin(now / 3_800) * 0.035;
  context.save();
  context.translate(centerX, centerY);
  context.rotate(-0.17);
  context.scale(1, 0.46);
  context.globalCompositeOperation = 'screen';
  for (let index = 0; index < 8; index += 1) {
    const radius = span * (0.13 + index * 0.055);
    const alpha = Math.max(0.012, 0.09 - index * 0.009) + shimmer;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.strokeStyle = index % 2 === 0
      ? `rgba(102, 186, 191, ${alpha})`
      : `rgba(170, 112, 179, ${alpha * 0.82})`;
    context.lineWidth = Math.max(2, span * (0.016 - index * 0.0014));
    context.shadowBlur = span * 0.035;
    context.shadowColor = index % 2 === 0 ? '#4a979f' : '#8c5d94';
    context.stroke();
  }
  context.restore();

  const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, span * 0.18);
  core.addColorStop(0, 'rgba(0, 0, 0, 1)');
  core.addColorStop(0.42, 'rgba(1, 1, 2, .98)');
  core.addColorStop(0.72, 'rgba(4, 3, 6, .72)');
  core.addColorStop(1, 'rgba(5, 5, 6, 0)');
  context.fillStyle = core;
  context.fillRect(0, 0, width, height);
}

export default function RippleDistortion({
  brushSize = 100,
  strength = 0.1,
  rings = 3,
  spread = 5,
  enabled = true,
  onReady,
  className = '',
  style,
}) {
  const canvasRef = useRef(null);
  const ripplesRef = useRef([]);
  const pointerRef = useRef({ x: -1, y: -1 });
  const readyCallbackRef = useRef(onReady);

  useEffect(() => {
    readyCallbackRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 1;
    let height = 1;
    let frame = 0;
    let disposed = false;
    let ready = false;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const addRipple = (event) => {
      if (!enabled || reducedMotion) return;
      const bounds = canvas.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) return;

      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const previous = pointerRef.current;
      if (Math.hypot(x - previous.x, y - previous.y) < 18) return;
      pointerRef.current = { x, y };
      ripplesRef.current.push({ x, y, bornAt: performance.now() });
      if (ripplesRef.current.length > MAX_RIPPLES) ripplesRef.current.shift();
    };

    const render = (now) => {
      if (disposed) return;
      context.clearRect(0, 0, width, height);
      drawBackdrop(context, width, height, now);

      if (!ready) {
        ready = true;
        readyCallbackRef.current?.();
      }

      const lifetime = 2_300;
      const rippleCount = Math.max(1, Math.min(6, Math.round(rings)));
      ripplesRef.current = ripplesRef.current.filter((ripple) => now - ripple.bornAt < lifetime);

      context.save();
      context.globalCompositeOperation = 'screen';
      for (const ripple of ripplesRef.current) {
        const progress = Math.min(1, (now - ripple.bornAt) / lifetime);
        const opacity = (1 - progress) ** 2 * Math.min(0.42, 0.12 + strength);
        const maxRadius = Math.max(brushSize, brushSize * spread * 0.55);
        for (let index = 0; index < rippleCount; index += 1) {
          const radius = progress * maxRadius - index * 13;
          if (radius <= 0) continue;
          context.beginPath();
          context.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
          context.strokeStyle = `rgba(226, 232, 220, ${opacity / (index + 1)})`;
          context.lineWidth = Math.max(0.6, 2.2 - progress * 1.5);
          context.stroke();
        }
      }
      context.restore();

      frame = window.requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('pointermove', addRipple, { passive: true });
    resize();

    frame = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', addRipple);
    };
  }, [brushSize, enabled, rings, spread, strength]);

  return (
    <div className={`ripple-distortion ${className}`.trim()} style={style} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
