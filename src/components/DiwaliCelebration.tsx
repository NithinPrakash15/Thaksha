import { useEffect, useState, useRef } from "react";

// Active throughout the Diwali 2026 festive window (Oct 23 - Nov 5, 2026)
export const DIWALI_EXPIRY_TIMESTAMP = new Date("2026-11-05T23:59:59+05:30").getTime();

export function useIsDiwaliSeason() {
  const [isDiwali, setIsDiwali] = useState(true);

  useEffect(() => {
    const check = () => {
      setIsDiwali(Date.now() < DIWALI_EXPIRY_TIMESTAMP);
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  return isDiwali;
}

/**
 * Beautiful Artisanal Brass / Terracotta Diya with Flickering Flame
 */
export function DiyaIcon({ className = "w-6 h-6", glowing = true }: { className?: string; glowing?: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Diya Glow Aura */}
      {glowing && (
        <span className="absolute -top-1 size-4 rounded-full bg-amber-400/50 blur-md animate-diya-glow pointer-events-none" />
      )}

      <svg viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        {/* Flame */}
        <g className="animate-diya-flame" style={{ transformOrigin: "20px 14px" }}>
          {/* Outer Orange Flame */}
          <path
            d="M20 2C20 2 25 7.5 25 11C25 13.8 22.8 16 20 16C17.2 16 15 13.8 15 11C15 7.5 20 2 20 2Z"
            fill="url(#diyaFlameOuter)"
          />
          {/* Inner Golden Core */}
          <path
            d="M20 5C20 5 23 8.5 23 11C23 12.6 21.7 14 20 14C18.3 14 17 12.6 17 11C17 8.5 20 5 20 5Z"
            fill="url(#diyaFlameInner)"
          />
          {/* Hot White Heart */}
          <ellipse cx="20" cy="11.5" rx="1.5" ry="2.2" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* Diya Oil Lamp Base (Sculpted Terracotta/Brass) */}
        <path
          d="M6 18C7.5 25 13 28 20 28C27 28 32.5 25 34 18C34 18 36 15 32 15C25 16 15 16 8 15C4 15 6 18 6 18Z"
          fill="url(#diyaBaseGrad)"
        />
        {/* Base Rim Highlight */}
        <path
          d="M7 16.5C13 18 27 18 33 16.5"
          stroke="#FDE047"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.8"
        />
        {/* Decorative Rim Dots */}
        <circle cx="14" cy="20" r="0.9" fill="#FEF08A" opacity="0.75" />
        <circle cx="20" cy="21" r="1.1" fill="#FEF08A" opacity="0.9" />
        <circle cx="26" cy="20" r="0.9" fill="#FEF08A" opacity="0.75" />

        <defs>
          <linearGradient id="diyaFlameOuter" x1="20" y1="2" x2="20" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F97316" />
            <stop offset="0.6" stopColor="#EAB308" />
            <stop offset="1" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="diyaFlameInner" x1="20" y1="5" x2="20" y2="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEF08A" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="diyaBaseGrad" x1="6" y1="15" x2="34" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9A3412" />
            <stop offset="0.5" stopColor="#B45309" />
            <stop offset="1" stopColor="#78350F" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Diwali Golden Sparkler & Firefly Dust Canvas
 * Gentle, floating golden embers and sparkler sparks rising calmly from the bottom.
 */
export function DiwaliSparklerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDiwali = useIsDiwaliSeason();

  useEffect(() => {
    if (!isDiwali) return;
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

    const particleCount = 42;
    const colors = ["#F59E0B", "#FCD34D", "#FEF08A", "#FB923C", "#EA580C", "#FFF8E7"];

    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.8 + 1.2,
      speedY: Math.random() * 0.7 + 0.35,
      speedX: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.65 + 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulseSpeed: Math.random() * 0.03 + 0.015,
      pulsePhase: Math.random() * Math.PI * 2,
      shape: Math.random() > 0.35 ? "sparkle" : "dot",
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += Math.sin(p.pulsePhase) * 0.4 + p.speedX;
        p.pulsePhase += p.pulseSpeed;

        const currentOpacity = Math.max(
          0.1,
          p.opacity * (0.6 + 0.4 * Math.sin(p.pulsePhase))
        );

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentOpacity;

        if (p.shape === "sparkle") {
          // 4-point sparkler star
          const s = p.size * 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(0, 0, s, 0);
          ctx.quadraticCurveTo(0, 0, 0, s);
          ctx.quadraticCurveTo(0, 0, -s, 0);
          ctx.quadraticCurveTo(0, 0, 0, -s);
          ctx.fill();
        } else {
          // Soft golden ember
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Respawn when reaching the top
        if (p.y < -20) {
          p.y = height + 10;
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
  }, [isDiwali]);

  if (!isDiwali) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[25]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

/**
 * Diwali Festive Top Announcement Bar
 * Warm royal maroon & gold gradient with animated flickering Diyas
 */
export function DiwaliTopBanner() {
  const isDiwali = useIsDiwaliSeason();
  if (!isDiwali) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#1A0B05] via-[#2F140A] to-[#1A0B05] text-[#FDF8F0] border-b border-[#F59E0B]/30 py-2.5 px-4 z-40 text-xs shadow-md">
      {/* Warm ambient flame glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14)_0,transparent_75%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        {/* Left Diya */}
        <div className="hidden sm:flex items-center">
          <DiyaIcon className="w-5 h-5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-serif tracking-[0.25em] text-[10px] md:text-[11px] text-[#FDE68A] uppercase font-bold inline-flex items-center gap-1.5">
            <span className="sm:hidden"><DiyaIcon className="w-4 h-4" /></span>
            <span>Shubh Deepavali</span>
          </span>
        </div>

        <span className="hidden sm:inline text-[#F59E0B]/60">•</span>

        <p className="font-serif tracking-[0.18em] text-[10px] md:text-[11px] text-[#EFE7D8] uppercase font-light">
          May the divine light illuminate your rituals • Seasoned Solid Neem Woodcare
        </p>

        {/* Right Diya */}
        <div className="hidden sm:flex items-center">
          <DiyaIcon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

/**
 * Traditional Marigold & Mango Leaf Toran Border Accent
 * Subtle floral garland lining beneath the top banner
 */
export function DiwaliToranAccent() {
  const isDiwali = useIsDiwaliSeason();
  if (!isDiwali) return null;

  return (
    <div className="relative w-full overflow-hidden h-2.5 bg-gradient-to-r from-transparent via-[#F59E0B]/15 to-transparent pointer-events-none z-30">
      <div className="flex items-center justify-around w-full opacity-60">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="text-[9px] text-[#D97706] transform hover:scale-125 transition-transform"
            style={{
              animation: `diya-pulse 2.5s ease-in-out infinite ${i * 0.12}s`,
            }}
          >
            {i % 2 === 0 ? "🌼" : "🍃"}
          </span>
        ))}
      </div>
    </div>
  );
}



/**
 * Interactive Diwali Sparkler Embers on Cursor Click
 * Emits miniature phuljhadi sparkler bursts on user clicks.
 */
export function DiwaliClickSparkler() {
  const isDiwali = useIsDiwaliSeason();

  useEffect(() => {
    if (!isDiwali) return;

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

      const sparkCount = 7;
      const sparkColors = ["#F59E0B", "#FCD34D", "#FEF08A", "#FB923C", "#EA580C"];

      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement("div");
        const angle = (i * (360 / sparkCount) + Math.random() * 20) * (Math.PI / 180);
        const distance = Math.random() * 34 + 18;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        spark.innerHTML = i % 2 === 0 ? "✦" : "•";
        spark.style.position = "absolute";
        spark.style.left = "0px";
        spark.style.top = "0px";
        spark.style.color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
        spark.style.fontSize = `${Math.random() * 6 + 10}px`;
        spark.style.lineHeight = "1";
        spark.style.userSelect = "none";
        spark.style.transition = "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
        spark.style.transform = "translate(-50%, -50%) scale(1)";
        spark.style.opacity = "1";

        container.appendChild(spark);

        requestAnimationFrame(() => {
          spark.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`;
          spark.style.opacity = "0";
        });
      }

      setTimeout(() => {
        container.remove();
      }, 700);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [isDiwali]);

  return null;
}

/**
 * Hanging Traditional Deepavali Brass Lamps (Thooku Vilakku)
 * Suspended on either side of the page with smooth, realistic pendulum swaying motion.
 */
export function HangingDiwaliLamps() {
  const isDiwali = useIsDiwaliSeason();
  if (!isDiwali) return null;

  return (
    <>
      {/* Left Hanging Lamp */}
      <div
        className="fixed top-0 left-1.5 sm:left-4 md:left-8 z-30 pointer-events-none animate-hanging-lamp-left"
        aria-hidden="true"
      >
        <HangingLampSvg />
      </div>

      {/* Right Hanging Lamp */}
      <div
        className="fixed top-0 right-1.5 sm:right-4 md:right-8 z-30 pointer-events-none animate-hanging-lamp-right"
        aria-hidden="true"
      >
        <HangingLampSvg />
      </div>
    </>
  );
}

function HangingLampSvg() {
  return (
    <div className="relative w-12 sm:w-16 md:w-20 h-56 sm:h-72 md:h-84 select-none">
      {/* Ambient Warm Golden Halation behind the flame */}
      <div className="absolute top-[64%] left-1/2 -translate-x-1/2 -translate-y-1/2 size-12 sm:size-16 rounded-full bg-amber-400/35 blur-xl animate-diya-glow pointer-events-none" />

      <svg
        viewBox="0 0 70 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(180,83,9,0.35)]"
      >
        <defs>
          <linearGradient id="hangingBrassGrad" x1="15" y1="0" x2="55" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.3" stopColor="#D97706" />
            <stop offset="0.7" stopColor="#92400E" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>

          <linearGradient id="hangingChainLink" x1="33" y1="0" x2="37" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.5" stopColor="#B45309" />
            <stop offset="1" stopColor="#78350F" />
          </linearGradient>

          <linearGradient id="hangingLampFlame" x1="35" y1="165" x2="35" y2="200" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEF08A" />
            <stop offset="0.35" stopColor="#F59E0B" />
            <stop offset="0.75" stopColor="#EA580C" />
            <stop offset="1" stopColor="#DC2626" />
          </linearGradient>
        </defs>

        {/* Ceiling Anchor Ring */}
        <circle cx="35" cy="5" r="4" stroke="url(#hangingBrassGrad)" strokeWidth="2.2" />

        {/* Interlocking Brass Chain */}
        <g stroke="url(#hangingChainLink)" strokeWidth="2" fill="none">
          <line x1="35" y1="8" x2="35" y2="155" strokeDasharray="6 4" strokeWidth="2.5" />
          {[18, 36, 54, 72, 90, 108, 126, 144].map((y) => (
            <ellipse key={y} cx="35" cy={y} rx="3.2" ry="5.5" stroke="#FDE047" strokeWidth="1.3" opacity="0.85" />
          ))}
        </g>

        {/* Top Canopy Finial (Artisanal brass dome/bell) */}
        <path
          d="M31 155 C31 151 39 151 39 155 L44 163 C44 165 26 165 26 163 Z"
          fill="url(#hangingBrassGrad)"
        />
        <circle cx="35" cy="153" r="2.5" fill="#FEF08A" />

        {/* Triple Suspension Chains holding the Lamp Bowl */}
        <path d="M31 164 L19 205" stroke="#B45309" strokeWidth="1.5" strokeDasharray="3 2" />
        <path d="M35 165 L35 203" stroke="#D97706" strokeWidth="1.5" strokeDasharray="3 2" />
        <path d="M39 164 L51 205" stroke="#B45309" strokeWidth="1.5" strokeDasharray="3 2" />

        {/* Flickering Flame (centered inside the lamp bowl) */}
        <g className="animate-diya-flame" style={{ transformOrigin: "35px 200px" }}>
          {/* Outer Flame */}
          <path
            d="M35 168 C35 168 43 182 43 192 C43 198 39.4 202 35 202 C30.6 202 27 198 27 192 C27 182 35 168 35 168 Z"
            fill="url(#hangingLampFlame)"
          />
          {/* Inner Golden Flame */}
          <path
            d="M35 177 C35 177 40 186 40 193 C40 197 37.8 199.5 35 199.5 C32.2 199.5 30 197 30 193 C30 186 35 177 35 177 Z"
            fill="#FEF08A"
          />
          {/* Hot White Heart */}
          <ellipse cx="35" cy="194" rx="2" ry="3.5" fill="#FFFFFF" opacity="0.9" />
        </g>

        {/* Deepam Oil Lamp Bowl (Sculpted Brass) */}
        <ellipse cx="35" cy="204" rx="22" ry="5" fill="#B45309" />
        <ellipse cx="35" cy="203" rx="20" ry="3.8" fill="#F59E0B" />
        <ellipse cx="35" cy="203" rx="17" ry="2.6" fill="#78350F" />

        {/* Bowl Basin Body */}
        <path
          d="M13 204 C15 220 23 226 35 226 C47 226 55 220 57 204 C52 208 44 210 35 210 C26 210 18 208 13 204 Z"
          fill="url(#hangingBrassGrad)"
        />

        {/* Decorative Rim Studs / Beads */}
        <circle cx="18" cy="207" r="1.2" fill="#FEF08A" />
        <circle cx="26" cy="209" r="1.3" fill="#FEF08A" />
        <circle cx="35" cy="210" r="1.5" fill="#FEF08A" />
        <circle cx="44" cy="209" r="1.3" fill="#FEF08A" />
        <circle cx="52" cy="207" r="1.2" fill="#FEF08A" />

        {/* Bowl Pedestal Base */}
        <path d="M30 226 L40 226 L38 234 L32 234 Z" fill="#92400E" />

        {/* Bottom Pendant Bell / Tassel Droplet */}
        <line x1="35" y1="234" x2="35" y2="246" stroke="#B45309" strokeWidth="1.8" />
        <circle cx="35" cy="242" r="1.8" fill="#FDE047" />

        {/* Hanging Brass Bell */}
        <path
          d="M35 246 C31 249 28 256 28 261 L42 261 C42 256 39 249 35 246 Z"
          fill="url(#hangingBrassGrad)"
        />
        <ellipse cx="35" cy="261" rx="7" ry="2" fill="#B45309" />
        {/* Bell Clapper droplet */}
        <circle cx="35" cy="265" r="2.2" fill="#FDE047" />
        <line x1="35" y1="261" x2="35" y2="265" stroke="#78350F" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

