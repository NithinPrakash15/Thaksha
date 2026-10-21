import { useEffect, useState, useRef } from "react";
import { Sparkles, Gift, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

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
 * High-end golden sparkle confetti canvas animation
 * Runs for 5 seconds on first visit, then cleanly detaches.
 */
export function LaunchConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (Date.now() >= LAUNCH_EXPIRY_TIMESTAMP) return;

    const alreadySeen = sessionStorage.getItem("thaksha_launch_celebration_seen");
    if (alreadySeen) return;

    sessionStorage.setItem("thaksha_launch_celebration_seen", "true");
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
    const particleCount = 75;

    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * -height * 0.5,
      size: Math.random() * 6 + 3,
      speedY: Math.random() * 2.5 + 1.2,
      speedX: (Math.random() - 0.5) * 1.5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.5 + 0.5,
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
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          // Subtle star/shimmer
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
 * Grand Launch Celebration Top Announcement Bar
 * Displays live countdown timer + 1-click copy coupon code "LAUNCH15"
 */
export function LaunchTopBar() {
  const isLaunch = useIsLaunchDay();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 24,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!isLaunch) return;

    const updateTimer = () => {
      const diff = Math.max(0, LAUNCH_EXPIRY_TIMESTAMP - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isLaunch]);

  if (!isLaunch) return null;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("LAUNCH15");
    setCopied(true);
    toast.success("Coupon code LAUNCH15 copied! Enjoy 15% off at checkout.", {
      icon: "🎉",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#171412] via-[#2A231C] to-[#171412] text-[#F3EFEA] border-b border-[#C59B63]/40 py-2.5 px-4 z-40 text-xs shadow-md">
      {/* Subtle gold ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,155,99,0.18)_0,transparent_75%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
        {/* Left: Headline & Celebration Tag */}
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C59B63] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C59B63]"></span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-serif tracking-wider text-[11px] md:text-xs text-[#E5C38E] uppercase font-semibold">
            <Sparkles size={13} className="text-[#C59B63] animate-pulse" />
            <span>Grand Launch Day Exclusive</span>
          </span>
          <span className="hidden lg:inline text-[#9D968D]">•</span>
          <span className="hidden lg:inline text-[11px] text-[#D8D2C7]">
            Celebrate our official opening with 15% off all handcrafted neem rituals.
          </span>
        </div>

        {/* Center / Right: Coupon + Countdown Timer */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyCode}
            className="group inline-flex items-center gap-1.5 bg-[#C59B63] hover:bg-[#d4a86f] text-[#1B1816] px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition-all transform hover:scale-105 active:scale-95 shadow-sm"
            title="Click to copy coupon code"
          >
            <Gift size={12} />
            <span>Use Code:</span>
            <span className="underline decoration-black/30 font-mono font-extrabold">LAUNCH15</span>
            {copied ? <Check size={12} className="text-green-900" /> : <Copy size={11} className="opacity-70 group-hover:opacity-100" />}
          </button>

          {/* Countdown Clock */}
          <div className="flex items-center gap-1 font-mono text-[11px] text-[#E5C38E] bg-black/40 px-2 py-0.5 rounded border border-[#C59B63]/30">
            <span className="text-[9px] uppercase tracking-wider text-[#9D968D] font-sans mr-1">Ends in:</span>
            <span className="font-bold">{pad(timeLeft.hours)}h</span>:
            <span className="font-bold">{pad(timeLeft.minutes)}m</span>:
            <span className="font-bold text-[#F4E3B5]">{pad(timeLeft.seconds)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating Launch Day Welcome Pill (Bottom Right)
 * Dismissable by the customer.
 */
export function LaunchFloatingBadge() {
  const isLaunch = useIsLaunchDay();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("thaksha_launch_badge_dismissed")) {
      setDismissed(true);
    }
  }, []);

  if (!isLaunch || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("thaksha_launch_badge_dismissed", "true");
  };

  return (
    <aside
      aria-label="Grand Launch announcement"
      className="fixed bottom-4 right-4 z-40 max-w-sm rounded-lg border border-[#C59B63]/60 bg-[#171412]/95 backdrop-blur-md p-3.5 text-[#F3EFEA] shadow-2xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#C59B63]/20 border border-[#C59B63]/50 flex items-center justify-center flex-shrink-0 text-[#C59B63]">
          <Sparkles size={16} />
        </div>
        <div className="flex-1 pr-1 text-xs">
          <p className="font-serif font-bold text-[#E5C38E] tracking-wide">
            We Are Officially Live! 🎉
          </p>
          <p className="text-[11px] text-[#B8B1A5] mt-0.5 leading-relaxed">
            Welcome to Thaksha. Orders placed on launch day receive complimentary express delivery and sacred care packaging.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#9D968D] hover:text-[#F3EFEA] p-0.5 transition-colors"
          aria-label="Dismiss launch notification"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
}
