import { useEffect, useState, useRef } from "react";
import { Sparkles, X } from "lucide-react";
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
 * Creative: Luxury Golden Neem Leaves & Starlight Shower
 * Runs gently for 5 seconds on first visit, then cleanly detaches.
 * Custom SVG/Canvas golden neem leaves fluttering gently in 3D rotation.
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
    const particleCount = 75;

    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * -height * 0.6,
      size: Math.random() * 6 + 3.5,
      speedY: Math.random() * 2.0 + 0.9,
      speedX: (Math.random() - 0.5) * 1.4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.6 + 0.4,
      shape: Math.random() > 0.5 ? "leaf" : Math.random() > 0.4 ? "star" : "dust",
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

        if (p.shape === "leaf") {
          // Curved sacred neem leaf
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.4);
          ctx.quadraticCurveTo(p.size * 0.65, 0, 0, p.size * 1.4);
          ctx.quadraticCurveTo(-p.size * 0.65, 0, 0, -p.size * 1.4);
          ctx.fill();

          // Central leaf vein
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.1);
          ctx.lineTo(0, p.size * 1.1);
          ctx.stroke();
        } else if (p.shape === "star") {
          // 4-pointed shimmering starlight
          ctx.beginPath();
          const s = p.size;
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(0, 0, s, 0);
          ctx.quadraticCurveTo(0, 0, 0, s);
          ctx.quadraticCurveTo(0, 0, -s, 0);
          ctx.quadraticCurveTo(0, 0, 0, -s);
          ctx.fill();
        } else {
          // Soft golden dust
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
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
 * Creative: Interactive Golden Click Sparkles (Micro-interaction)
 * Delicate luxury starburst on cursor click anywhere on the page.
 */
export function LaunchClickSparkles() {
  const isLaunch = useIsLaunchDay();

  useEffect(() => {
    if (!isLaunch) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = `${e.clientX}px`;
      container.style.top = `${e.clientY}px`;
      container.style.pointerEvents = "none";
      container.style.zIndex = "9999";
      document.body.appendChild(container);

      const sparkleCount = 6;
      for (let i = 0; i < sparkleCount; i++) {
        const star = document.createElement("div");
        const angle =
          (i * (360 / sparkleCount) + Math.random() * 25) * (Math.PI / 180);
        const distance = Math.random() * 32 + 18;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        star.innerHTML = "✦";
        star.style.position = "absolute";
        star.style.left = "0px";
        star.style.top = "0px";
        star.style.color = [
          "#C59B63",
          "#E5C38E",
          "#F4E3B5",
          "#D4AF37",
        ][Math.floor(Math.random() * 4)];
        star.style.fontSize = `${Math.random() * 5 + 10}px`;
        star.style.lineHeight = "1";
        star.style.userSelect = "none";
        star.style.transition = "all 0.55s cubic-bezier(0.16, 1, 0.3, 1)";
        star.style.transform = "translate(-50%, -50%) scale(1)";
        star.style.opacity = "1";

        container.appendChild(star);

        requestAnimationFrame(() => {
          star.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`;
          star.style.opacity = "0";
        });
      }

      setTimeout(() => {
        container.remove();
      }, 650);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [isLaunch]);

  return null;
}

function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 harmonious chord
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.3);
    });
  } catch {
    // Non-blocking fallback if browser policy blocks audio
  }
}

/**
 * Creative: Grand Ceremonial Ribbon-Cutting Unveiling
 * The entire website is softly blurred in the background.
 * A majestic ceremonial silk ribbon spans edge-to-edge across the centre.
 * The visitor taps the central golden medallion with golden scissors to cut the ribbon.
 * The ribbon parts outwards to the left & right, starlight bursts forth,
 * and the blur dissolves smoothly, unveiling the site!
 */
export function LaunchCeremonialRibbon() {
  const isLaunch = useIsLaunchDay();
  const [isCut, setIsCut] = useState(false);
  const [isUnveiled, setIsUnveiled] = useState(false);
  const [isCutting, setIsCutting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("thaksha_ribbon_cut_done")) {
      setIsCut(true);
      setIsUnveiled(true);
    }

    const handleReopen = () => {
      setIsCut(false);
      setIsUnveiled(false);
      setIsCutting(false);
      sessionStorage.removeItem("thaksha_ribbon_cut_done");
    };

    window.addEventListener("thaksha:reopen_ribbon", handleReopen);
    return () => window.removeEventListener("thaksha:reopen_ribbon", handleReopen);
  }, []);

  if (!isLaunch || isUnveiled) return null;

  const handleCutRibbon = () => {
    if (isCutting || isCut) return;
    setIsCutting(true);
    playCelebrationChime();

    // Trigger instant sparkle bursts from center in multiple waves
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    [-60, -30, 0, 30, 60].forEach((dx, i) => {
      setTimeout(() => {
        const ev = new MouseEvent("click", {
          clientX: cx + dx,
          clientY: cy + (i % 2 === 0 ? -20 : 20),
        });
        window.dispatchEvent(ev);
      }, i * 80);
    });

    toast.success("⚜️ The Inaugural Ribbon has been cut! Welcome to Thaksha.", {
      icon: "✂️",
    });

    // Animate ribbon cut, then dissolve background blur & unveil store
    setTimeout(() => {
      setIsCut(true);
    }, 250);

    setTimeout(() => {
      setIsUnveiled(true);
      sessionStorage.setItem("thaksha_ribbon_cut_done", "true");
    }, 1150);
  };

  const handleSkip = () => {
    setIsCut(true);
    setIsUnveiled(true);
    sessionStorage.setItem("thaksha_ribbon_cut_done", "true");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Inaugural Ribbon Unveiling Ceremony"
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-between py-10 px-4 transition-all duration-1000 select-none overflow-hidden ${
        isCutting
          ? "opacity-0 backdrop-blur-none pointer-events-none"
          : "opacity-100 backdrop-blur-xl md:backdrop-blur-2xl"
      }`}
      style={{
        background: isCutting
          ? "transparent"
          : "radial-gradient(circle at center, rgba(30, 24, 18, 0.88) 0%, rgba(12, 10, 8, 0.96) 100%)",
      }}
    >
      {/* Top Heritage Emblem (Above the Ribbon) */}
      <div
        className={`flex flex-col items-center text-center transition-all duration-700 ${
          isCutting ? "-translate-y-12 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-[#C59B63]/20 blur-xl animate-pulse" />
          <img
            src="/thaksha-logo.png"
            alt="Thaksha Logo"
            className="relative h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-[0_0_20px_rgba(197,155,99,0.5)]"
          />
        </div>
        <h1 className="font-serif text-3xl md:text-5xl text-[#EFECE6] uppercase tracking-[0.35em] font-semibold mt-3">
          Thaksha
        </h1>
        <p className="text-[#C59B63] text-[10px] md:text-xs uppercase tracking-[0.35em] font-medium mt-1">
          Artisanal Handcrafted Neem Wood Rituals
        </p>
        <div className="mt-2 inline-flex items-center gap-2 bg-[#C59B63]/15 border border-[#C59B63]/40 px-3 py-1 rounded-full text-[9px] uppercase tracking-[0.25em] text-[#E5C38E]">
          <Sparkles size={10} className="text-[#C59B63] animate-pulse" />
          <span>Official Inauguration • October 2026</span>
          <Sparkles size={10} className="text-[#C59B63] animate-pulse" />
        </div>
      </div>

      {/* The Great Big Ribbon Spanning Across the Centre */}
      <div className="relative w-full my-auto flex items-center justify-center">
        {/* Horizontal Ribbon Container */}
        <div className="relative w-full h-24 sm:h-28 md:h-36 flex items-center shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Left Ribbon Half */}
          <div
            className={`w-1/2 h-full flex items-center justify-end pr-10 md:pr-16 bg-gradient-to-r from-[#631212] via-[#8C1B1B] to-[#A32222] border-y-4 border-[#E5C38E] shadow-2xl relative transition-all duration-1000 ease-out ${
              isCut
                ? "-translate-x-[125%] -rotate-6 opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            {/* Inner Embroidered Gold Stitch Lines */}
            <div className="absolute inset-x-0 top-1.5 border-t border-dashed border-[#F4E3B5]/50" />
            <div className="absolute inset-x-0 bottom-1.5 border-b border-dashed border-[#F4E3B5]/50" />
            <div className="hidden lg:flex items-center gap-3 text-[#F4E3B5]/90 font-serif text-xs uppercase tracking-[0.3em] font-semibold">
              <span>⚜️ Pure Mature Neem Wood</span>
              <span>•</span>
              <span>Handcrafted in Kerala ⚜️</span>
            </div>
            {/* Satin sheen reflection */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/30 pointer-events-none" />
          </div>

          {/* Right Ribbon Half */}
          <div
            className={`w-1/2 h-full flex items-center justify-start pl-10 md:pl-16 bg-gradient-to-r from-[#A32222] via-[#8C1B1B] to-[#631212] border-y-4 border-[#E5C38E] shadow-2xl relative transition-all duration-1000 ease-out ${
              isCut
                ? "translate-x-[125%] rotate-6 opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            {/* Inner Embroidered Gold Stitch Lines */}
            <div className="absolute inset-x-0 top-1.5 border-t border-dashed border-[#F4E3B5]/50" />
            <div className="absolute inset-x-0 bottom-1.5 border-b border-dashed border-[#F4E3B5]/50" />
            <div className="hidden lg:flex items-center gap-3 text-[#F4E3B5]/90 font-serif text-xs uppercase tracking-[0.3em] font-semibold">
              <span>⚜️ Zero Static Glide</span>
              <span>•</span>
              <span>Lifetime Form Guarantee ⚜️</span>
            </div>
            {/* Satin sheen reflection */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/30 pointer-events-none" />
          </div>
        </div>

        {/* Centre Ceremonial Rosette Medallion & Golden Scissors Button */}
        <div
          className={`absolute z-30 transition-all duration-700 ease-out ${
            isCut
              ? "scale-150 opacity-0 pointer-events-none"
              : "scale-100 opacity-100"
          }`}
        >
          <button
            onClick={handleCutRibbon}
            disabled={isCutting}
            className="group relative flex flex-col items-center justify-center size-28 sm:size-32 md:size-36 rounded-full bg-gradient-to-tr from-[#8E6934] via-[#F3E5AB] to-[#8E6934] p-1.5 shadow-[0_0_50px_rgba(229,195,142,0.65)] hover:shadow-[0_0_70px_rgba(229,195,142,0.95)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            title="Click to cut the ceremonial inaugural ribbon and unveil Thaksha"
          >
            {/* Outer Radiating Glow Pulse */}
            <span className="absolute -inset-3 rounded-full border-2 border-[#E5C38E]/50 animate-ping pointer-events-none" />

            {/* Rosette scalloped edges / fluted ring */}
            <div className="size-full rounded-full bg-gradient-to-b from-[#1C1612] via-[#2A2019] to-[#14100D] border-2 border-[#E5C38E] flex flex-col items-center justify-center p-2 text-center shadow-inner relative overflow-hidden">
              {/* Shimmer light pass */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Ceremonial Gold Scissors */}
              <span
                className={`text-2xl sm:text-3xl md:text-4xl text-[#E5C38E] filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-transform duration-300 ${
                  isCutting
                    ? "-rotate-45 scale-125"
                    : "group-hover:rotate-12 group-hover:scale-110"
                }`}
              >
                ✂️
              </span>

              <span className="font-serif text-[10px] sm:text-[11px] md:text-xs uppercase tracking-[0.22em] text-[#F4E3B5] font-bold mt-1 leading-tight">
                Tap To Cut
              </span>
              <span className="text-[8px] uppercase tracking-[0.25em] text-[#C59B63] font-medium mt-0.5">
                Unveil Site
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Subtitle & Bypass Option */}
      <div
        className={`flex flex-col items-center text-center transition-all duration-700 ${
          isCutting ? "translate-y-12 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <p className="font-serif italic text-sm md:text-base text-[#D8D2C7]/80 max-w-md">
          "Sculpted from nature. Anointed by rituals. Unveiled for you today."
        </p>
        <button
          onClick={handleSkip}
          className="mt-4 text-[10px] uppercase tracking-[0.25em] text-[#A69F94] hover:text-[#EFECE6] border-b border-[#A69F94]/30 hover:border-[#EFECE6] pb-0.5 transition-colors cursor-pointer"
        >
          Enter Sanctuary Directly →
        </button>
      </div>
    </div>
  );
}

/**
 * Grand Inaugural Ribbon (Top Bar)
 * High-end luxury ceremonial banner celebrating Day 1 inauguration.
 */
export function LaunchTopBar() {
  const isLaunch = useIsLaunchDay();

  if (!isLaunch) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#141210] via-[#241F1A] to-[#141210] text-[#EFECE6] border-b border-[#C59B63]/40 py-2 px-4 z-40 text-xs shadow-md">
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
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("thaksha:reopen_ribbon"))}
            className="mt-2 text-[9px] uppercase tracking-[0.2em] text-[#C59B63] hover:text-[#E5C38E] flex items-center gap-1 font-serif underline underline-offset-2 transition-colors cursor-pointer"
          >
            <span>✂️ Replay Ribbon Unveiling</span>
          </button>
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

/**
 * Diagonal Inaugural Corner Sash for Hero Showcase Image
 */
export function LaunchInauguralSash() {
  const isLaunch = useIsLaunchDay();
  if (!isLaunch) return null;

  return (
    <div className="absolute -top-1 -right-1 z-30 overflow-hidden w-36 h-36 pointer-events-none">
      <div className="absolute top-7 -right-10 w-48 bg-gradient-to-r from-[#94713E] via-[#C59B63] to-[#94713E] text-[#141210] py-1 text-center shadow-lg transform rotate-45 text-[9px] font-serif font-extrabold tracking-[0.25em] uppercase border-y border-[#F3EFEA]/30">
        ⚜️ Maiden Debut
      </div>
    </div>
  );
}

/**
 * Ambient Golden Stardust for Hero Background
 */
export function LaunchAmbientDust() {
  const isLaunch = useIsLaunchDay();
  if (!isLaunch) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(197,155,99,0.12)_0,transparent_70%)] blur-3xl animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[radial-gradient(circle,rgba(229,195,142,0.10)_0,transparent_70%)] blur-2xl" />
    </div>
  );
}
