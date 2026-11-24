"use client";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Hero background: a quiet grid of ascii glyphs standing in for pixels.
 * The mouse carries a soft light with it — glyphs inside that light grow
 * and resolve into denser characters, and the canvas behind them lightens,
 * as if the cursor were pushing the grid up into a little bump of relief.
 * Reads its colours from the current --theme tokens, so it matches both
 * the light and dark palette without any colour of its own.
 */

const CELL = 26; // px between glyph centres
const RADIUS = 170; // px: how far the cursor's light reaches
const MAX_SCALE = 2.3; // glyph size at the very centre of the cursor, relative to its resting size
const BASE_FONT = 12; // px, resting glyph size
// Canvas text doesn't resolve CSS custom properties, so the mono stack is
// spelled out here (matches --font-mono in globals.css).
const MONO_FONT = '"Cascadia Mono", ui-monospace, "SF Mono", Consolas, monospace';
// Ascii "density ramp" — low to high ink, like a classic ascii-art shader.
const GLYPHS = [".", "·", ":", "+", "#"];

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Resolves `var(--name)` into a real rgb()/rgba() string via a hidden probe node. */
function makeColorReader() {
  const probe = document.createElement("span");
  probe.style.position = "fixed";
  probe.style.left = "-9999px";
  probe.style.top = "0";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  return {
    read(name: string): [number, number, number] {
      probe.style.color = `var(${name})`;
      const c = getComputedStyle(probe).color; // "rgb(r, g, b)" or "rgba(r, g, b, a)"
      const m = c.match(/[\d.]+/g);
      if (!m) return [0, 0, 0];
      return [Number(m[0]), Number(m[1]), Number(m[2])];
    },
    dispose() {
      probe.remove();
    },
  };
}

export default function AsciiField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    const reader = makeColorReader();
    let dim: [number, number, number] = [0, 0, 0];
    let glow: [number, number, number] = [0, 0, 0];

    function readColors() {
      dim = reader.read("--text-tertiary");
      glow = reader.read("--accent-light-2");
    }
    readColors();
    const themeObserver = new MutationObserver(readColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let width = 0;
    let height = 0;
    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Target = raw cursor position (null when the cursor is far from this field).
    // Cur/influence ease toward it, which is what gives the bump its sense of weight.
    let targetX: number | null = null;
    let targetY: number | null = null;
    let curX = 0;
    let curY = 0;
    let influence = 0;

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const near = x > -RADIUS && x < width + RADIUS && y > -RADIUS && y < height + RADIUS;
      targetX = near ? x : null;
      targetY = near ? y : null;
    }
    function onLeave() {
      targetX = null;
      targetY = null;
    }

    let raf = 0;
    function draw() {
      ctx!.clearRect(0, 0, width, height);

      if (targetX !== null && targetY !== null) {
        curX += (targetX - curX) * 0.16;
        curY += (targetY - curY) * 0.16;
        influence += (1 - influence) * 0.12;
      } else {
        influence += (0 - influence) * 0.1;
      }

      // The "turns lighter" halo: a soft radial wash that rides with the cursor.
      if (influence > 0.01) {
        const grad = ctx!.createRadialGradient(curX, curY, 0, curX, curY, RADIUS * 1.2);
        grad.addColorStop(0, `rgba(${glow[0]}, ${glow[1]}, ${glow[2]}, ${0.24 * influence})`);
        grad.addColorStop(1, `rgba(${glow[0]}, ${glow[1]}, ${glow[2]}, 0)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, width, height);
      }

      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      const cols = Math.ceil(width / CELL) + 1;
      const rows = Math.ceil(height / CELL) + 1;

      for (let r = 0; r < rows; r++) {
        const y = r * CELL;
        for (let c = 0; c < cols; c++) {
          const x = c * CELL;
          let glyph = GLYPHS[0];
          let scale = 1;
          let [cr, cg, cb] = dim;
          let alpha = 0.5;

          if (influence > 0.01) {
            const d = Math.hypot(x - curX, y - curY);
            if (d < RADIUS) {
              const t = smoothstep(1 - d / RADIUS) * influence;
              scale = 1 + t * (MAX_SCALE - 1);
              glyph = GLYPHS[Math.round(t * (GLYPHS.length - 1))];
              cr = dim[0] + (glow[0] - dim[0]) * t;
              cg = dim[1] + (glow[1] - dim[1]) * t;
              cb = dim[2] + (glow[2] - dim[2]) * t;
              alpha = 0.5 + t * 0.5;
            }
          }

          ctx!.font = `${Math.round(BASE_FONT * scale * 10) / 10}px ${MONO_FONT}`;
          ctx!.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
          ctx!.fillText(glyph, x, y);
        }
      }

      raf = requestAnimationFrame(draw);
    }
    draw();

    if (!reduced) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      reader.dispose();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // <canvas> is a replaced element: `inset-0` alone pins its top-left corner
  // but won't stretch it like a <div> — it keeps the 300x150 intrinsic
  // default. `block h-full w-full` is what actually makes it fill its box.
  return <canvas ref={canvasRef} aria-hidden className={`block h-full w-full ${className}`} />;
}
