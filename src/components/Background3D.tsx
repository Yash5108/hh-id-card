'use client';

import { useEffect, useRef } from 'react';

export default function Background3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // === DRAWING HELPERS ===

    const drawSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(0.4, '#B0E0E6');
      grad.addColorStop(0.7, '#FFD59E');
      grad.addColorStop(1, '#FFB347');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h * 0.6);
    };

    const drawSun = (t: number) => {
      const sunX = w * 0.78;
      const sunY = h * 0.18 + Math.sin(t * 0.3) * 5;
      const sunR = Math.min(w, h) * 0.06;

      // Glow
      const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 4);
      glow.addColorStop(0, 'rgba(255, 200, 50, 0.4)');
      glow.addColorStop(0.5, 'rgba(255, 180, 50, 0.1)');
      glow.addColorStop(1, 'rgba(255, 180, 50, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sunX - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 8);

      // Sun body
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF3B0';
      ctx.fill();
    };

    const drawClouds = (t: number) => {
      const drawCloud = (cx: number, cy: number, size: number) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.arc(cx + size * 1.2, cy - size * 0.3, size * 0.8, 0, Math.PI * 2);
        ctx.arc(cx - size * 1.0, cy - size * 0.1, size * 0.7, 0, Math.PI * 2);
        ctx.arc(cx + size * 0.5, cy - size * 0.6, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      };

      drawCloud(w * 0.15 + Math.sin(t * 0.1) * 20, h * 0.12, w * 0.03);
      drawCloud(w * 0.45 + Math.sin(t * 0.08 + 1) * 15, h * 0.08, w * 0.025);
      drawCloud(w * 0.7 + Math.sin(t * 0.12 + 2) * 25, h * 0.15, w * 0.02);
    };

    const drawSea = (t: number) => {
      const seaTop = h * 0.55;
      const seaGrad = ctx.createLinearGradient(0, seaTop, 0, h * 0.72);
      seaGrad.addColorStop(0, '#1CA3CC');
      seaGrad.addColorStop(0.5, '#0E8AAB');
      seaGrad.addColorStop(1, '#0B7B9B');
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, seaTop, w, h * 0.17);

      // Waves
      for (let row = 0; row < 4; row++) {
        const waveY = seaTop + row * (h * 0.04);
        ctx.beginPath();
        ctx.moveTo(0, waveY);
        for (let x = 0; x <= w; x += 4) {
          const y = waveY + Math.sin((x / (w * 0.08)) + t * (0.8 + row * 0.2) + row) * (4 - row * 0.5)
            + Math.sin((x / (w * 0.15)) + t * 0.5 + row * 2) * 2;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.08 - row * 0.015})`;
        ctx.fill();
      }
    };

    const drawBeach = () => {
      const beachTop = h * 0.68;
      const beachGrad = ctx.createLinearGradient(0, beachTop, 0, h);
      beachGrad.addColorStop(0, '#F4D35E');
      beachGrad.addColorStop(0.3, '#EEC643');
      beachGrad.addColorStop(0.6, '#D4A843');
      beachGrad.addColorStop(1, '#C99A3C');
      ctx.fillStyle = beachGrad;
      ctx.fillRect(0, beachTop, w, h - beachTop);

      // Sand texture (small dots)
      ctx.fillStyle = 'rgba(180, 140, 60, 0.15)';
      for (let i = 0; i < 200; i++) {
        const sx = (i * 137.5) % w;
        const sy = beachTop + ((i * 97.3) % (h - beachTop));
        ctx.fillRect(sx, sy, 2, 1);
      }
    };

    const drawCoconutTree = (baseX: number, baseY: number, height: number, lean: number, t: number) => {
      const sway = Math.sin(t * 0.5 + baseX * 0.01) * 3;

      // Trunk
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = height * 0.06;
      ctx.strokeStyle = '#6B4226';
      ctx.lineCap = 'round';

      const cp1x = baseX + lean * 0.4 + sway * 0.3;
      const cp1y = baseY - height * 0.5;
      const topX = baseX + lean + sway;
      const topY = baseY - height;

      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(cp1x, cp1y, topX, topY);
      ctx.stroke();

      // Trunk texture lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(90, 55, 30, 0.3)';
      for (let i = 0.1; i < 0.9; i += 0.07) {
        const tx = baseX + (cp1x - baseX) * i * 2 * (1 - i) + (topX - baseX) * i * i;
        const ty = baseY + (cp1y - baseY) * i * 2 * (1 - i) + (topY - baseY) * i * i;
        ctx.beginPath();
        ctx.arc(tx, ty, height * 0.025, 0, Math.PI);
        ctx.stroke();
      }

      // Fronds (leaves)
      const frondCount = 7;
      const frondLen = height * 0.45;
      for (let i = 0; i < frondCount; i++) {
        const angle = ((i / frondCount) * Math.PI * 1.8) - Math.PI * 0.9;
        const frondSway = Math.sin(t * 0.7 + i * 0.8) * 0.08;
        const endX = topX + Math.cos(angle + frondSway) * frondLen;
        const endY = topY + Math.sin(angle + frondSway) * frondLen * 0.6 - frondLen * 0.2;

        // Main stem
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#2D5F2E';
        const midX = topX + (endX - topX) * 0.5 + Math.sin(angle) * 10;
        const midY = topY + (endY - topY) * 0.4 - 15;
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.stroke();

        // Leaf segments
        for (let j = 0.15; j < 0.95; j += 0.08) {
          const px = topX + (midX - topX) * j * 2 * (1 - j) + (endX - topX) * j * j;
          const py = topY + (midY - topY) * j * 2 * (1 - j) + (endY - topY) * j * j;
          const leafLen = frondLen * 0.15 * (1 - Math.abs(j - 0.5) * 1.5);
          const perpAngle = angle + Math.PI / 2;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(perpAngle) * leafLen, py + Math.sin(perpAngle) * leafLen * 0.5);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = i % 2 === 0 ? '#3A7D3A' : '#2D6B2D';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - Math.cos(perpAngle) * leafLen, py - Math.sin(perpAngle) * leafLen * 0.5);
          ctx.stroke();
        }
      }

      // Coconuts (cluster at the top)
      const coconutR = height * 0.03;
      const coconuts = [
        { dx: -coconutR * 1.5, dy: coconutR * 0.5 },
        { dx: coconutR * 1.2, dy: coconutR * 0.8 },
        { dx: 0, dy: -coconutR * 0.5 },
      ];
      coconuts.forEach(({ dx, dy }) => {
        ctx.beginPath();
        ctx.arc(topX + dx, topY + dy + coconutR * 2, coconutR, 0, Math.PI * 2);
        ctx.fillStyle = '#5C3A1E';
        ctx.fill();
        ctx.strokeStyle = '#3D2510';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Highlight
        ctx.beginPath();
        ctx.arc(topX + dx - coconutR * 0.2, topY + dy + coconutR * 1.6, coconutR * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
      });

      ctx.restore();
    };

    const drawBeachElements = () => {
      // A few ground coconuts on the beach
      const drawGroundCoconut = (x: number, y: number) => {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#6B4226';
        ctx.fill();
        ctx.strokeStyle = '#4A2D15';
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      drawGroundCoconut(w * 0.08, h * 0.78);
      drawGroundCoconut(w * 0.12, h * 0.80);
      drawGroundCoconut(w * 0.88, h * 0.76);

      // Small shells
      ctx.fillStyle = 'rgba(255, 240, 220, 0.6)';
      [
        [w * 0.2, h * 0.82], [w * 0.5, h * 0.85],
        [w * 0.75, h * 0.80], [w * 0.35, h * 0.78],
      ].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawBirds = (t: number) => {
      ctx.strokeStyle = 'rgba(50, 50, 50, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      const drawBird = (x: number, y: number, size: number, phase: number) => {
        const flap = Math.sin(t * 3 + phase) * size * 0.3;
        ctx.beginPath();
        ctx.moveTo(x - size, y + flap);
        ctx.quadraticCurveTo(x - size * 0.3, y - size * 0.3, x, y);
        ctx.quadraticCurveTo(x + size * 0.3, y - size * 0.3, x + size, y + flap);
        ctx.stroke();
      };

      drawBird(w * 0.3 + Math.sin(t * 0.2) * 30, h * 0.1, 12, 0);
      drawBird(w * 0.35 + Math.sin(t * 0.2) * 30, h * 0.13, 8, 1);
      drawBird(w * 0.55 + Math.sin(t * 0.15) * 20, h * 0.07, 10, 2);
    };

    // === ANIMATION LOOP ===
    let startTime = performance.now();

    const animate = () => {
      const t = (performance.now() - startTime) / 1000;

      ctx.clearRect(0, 0, w, h);

      drawSky();
      drawSun(t);
      drawClouds(t);
      drawSea(t);
      drawBeach();

      // Coconut trees at various positions
      drawCoconutTree(w * 0.05, h * 0.72, h * 0.45, w * 0.03, t);
      drawCoconutTree(w * 0.15, h * 0.73, h * 0.38, -w * 0.02, t);
      drawCoconutTree(w * 0.88, h * 0.71, h * 0.42, -w * 0.04, t);
      drawCoconutTree(w * 0.95, h * 0.74, h * 0.35, -w * 0.02, t);

      drawBeachElements();
      drawBirds(t);

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}