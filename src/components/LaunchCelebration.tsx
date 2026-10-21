import { useEffect, useState, useRef } from "react";
import { Sparkles, X } from "lucide-react";

// Exact 24-36 hour launch window: expires October 22, 2026 at 23:59:59 IST
export const LAUNCH_EXPIRY_TIMESTAMP = new Date("2026-10-22T23:59:59+05:30").getTime();

export function useIsLaunchDay() {
  const [isLaunch, setIsLaunch] = useState(false);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setIsLaunch(now < LAUNCH_EXPIRY_TIMESTAMP);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  return isLaunch;
}

/**
 * Luxury Champagne-Gold Starlight Shower
 * Runs gently for 5 seconds on first visit, then cleanly detaches.
 * Pure luxury aesthetic (no discount, pure prestige celebration).
 */
export function LaunchConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (Date.now() >= LAUNCH_EXPIRY_TIMESTAMP) return;

    const alreadySeen = sessionStorage.getItem("thaksha_launch_decor_seen");
    if (alreadySeen) return;

    sessionStorage.setItem("thaksha_launch_decor_seen", "true");
    setActive(true);

    const timer = setTimeout(() => {
      setActive(false);
    }, 5500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const colors = ["#C59B63", "#E5C38E", "#F4E3B5", "#8E6934", "#FFF8EE", "#D4AF37"];
    const particleCount = 80;

    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * -height * 0.6,
      size: Math.random() * 5 + 2.5,
      speedY: Math.random() * 2.2 + 0.8,
      speedX: (Math.random() - 0.5) * 1.2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.6 + 0.4,
      shape: Math.random() > 0.4 ? "rect" : "star",
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100] transition-opacity duration-1000"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

/**
 * Grand Inaugural Ribbon (Top Bar)
 * High-end luxury ceremonial banner celebrating Day 1 inauguration.
 * Zero discount / offer language. Pure prestige brand presence.
 */
export function LaunchTopBar() {
  const isLaunch = useIsLaunchDay();

  if (!isLaunch) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#141210] via-[#241F1A] to-[#141210] text-[#EFECE6] border-b border-[#C59B63]/40 py-2.5 px-4 z-40 text-xs shadow-md">
      {/* Subtle gold ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,155,99,0.15)_0,transparent_75%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-4 text-center">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C59B63] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C59B63]"></span>
          </span>
          <span className="font-serif tracking-[0.28em] text-[10px] md:text-[11px] text-[#E5C38E] uppercase font-semibold inline-flex items-center gap-1.5">
            <Sparkles size={12} className="text-[#C59B63] animate-pulse" />
            <span>Official Inauguration</span>
          </span>
        </div>

        <span className="hidden sm:inline text-[#C59B63]/60">•</span>

        <p className="font-serif tracking-[0.2em] text-[10px] md:text-[11px] text-[#D8D2C7] uppercase font-light">
          Celebrating the debut of Thaksha • Handcrafted Neem Rituals Now Live
        </p>
      </div>
    </div>
  );
}

/**
 * Luxury Floating Inaugural Seal (Bottom Corner)
 * Prestigious brand debut emblem, dismissable with X.
 */
export function LaunchFloatingBadge() {
  const isLaunch = useIsLaunchDay();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("thaksha_inaugural_badge_dismissed")) {
      setDismissed(true);
    }
  }, []);

  if (!isLaunch || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("thaksha_inaugural_badge_dismissed", "true");
  };

  return (
    <aside
      aria-label="Official Inauguration Badge"
      className="fixed bottom-5 right-5 z-40 max-w-sm rounded-lg border border-[#C59B63]/50 bg-[#141210]/95 backdrop-blur-md p-4 text-[#EFECE6] shadow-2xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#C59B63]/15 border border-[#C59B63]/40 flex items-center justify-center flex-shrink-0 text-[#C59B63]">
          <Sparkles size={17} />
        </div>
        <div className="flex-1 pr-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#C59B63] font-semibold">
              Inaugural Day
            </span>
          </div>
          <p className="font-serif text-sm font-semibold text-[#EFECE6] mt-0.5 tracking-wide">
            Welcome to Thaksha
          </p>
          <p className="text-[11px] text-[#A69F94] mt-1 leading-relaxed">
            Every comb and brush is hand-carved from seasoned mature neem wood and cured with organic botanical oils.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#9D968D] hover:text-[#EFECE6] p-0.5 transition-colors"
          aria-label="Dismiss inaugural notification"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
}
