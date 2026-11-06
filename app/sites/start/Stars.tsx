import { useEffect, useRef } from "react";

const STAR_COUNT = 1000;

type Star = {
  x: number; // 0..1 of viewport width
  y: number; // 0..1 of viewport height
  radius: number;
  opacity: number;
  pulse: number; // extra scale at peak
  period: number; // ms for grow + shrink
  delay: number; // ms before it starts pulsing
};

const makeStar = (): Star => ({
  x: Math.random(),
  y: Math.random(),
  radius: Math.random() * 0.5 + 0.5,
  opacity: Math.random() * 0.25 + 0.75,
  pulse: Math.random() * 0.2 + 0.4,
  period: (Math.random() * 1000 + 1000) * 2,
  delay: Math.random() * 1500,
});

/** Full-screen twinkling starfield on a black background. */
export function Stars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;

    const stars = Array.from({ length: STAR_COUNT }, makeStar);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, width, height);
      g.fillStyle = "#fff";

      for (const s of stars) {
        let scale = 1;
        if (!reduceMotion && now > s.delay) {
          // Triangle wave 0 -> 1 -> 0 over one period.
          const t = ((now - s.delay) % s.period) / s.period;
          scale += s.pulse * (1 - Math.abs(2 * t - 1));
        }
        g.globalAlpha = s.opacity;
        g.beginPath();
        g.arc(s.x * width, s.y * height, s.radius * scale, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />;
}
