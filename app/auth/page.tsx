"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  UserCog,
  UserPlus,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Mail,
  Lock,
  Smartphone,
  Menu,
  X,
} from "lucide-react";

type Particle = { left: string; top: string; delay: string; duration: string };

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function AuthPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ✅ Generate particles ONCE (stable positions = smooth performance)
  const particles = useMemo<Particle[]>(() => {
    const count = 15; // we’ll show fewer on mobile via slice
    return Array.from({ length: count }, (_, i) => {
      const rnd = (min: number, max: number) =>
        (min + Math.random() * (max - min)).toFixed(2);

      return {
        left: `${rnd(2, 98)}%`,
        top: `${rnd(2, 98)}%`,
        delay: `${(i * 0.4).toFixed(2)}s`,
        duration: `${rnd(10, 24)}s`,
      };
    });
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
    setMenuOpen(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-10">
      {/* Mobile background overlay */}
      <div className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm" />

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

      {/* Floating particles (stable) */}
      <div className="pointer-events-none fixed inset-0">
        {(isMobile ? particles.slice(0, 8) : particles).map((p, i) => (
          <div
            key={i}
            className={cn(
              "absolute rounded-full bg-green-500/20",
              isMobile ? "h-0.5 w-0.5" : "h-1 w-1",
              "animate-float"
            )}
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: isMobile ? "16s" : p.duration,
            }}
          />
        ))}

        {/* Desktop rings */}
        {!isMobile && (
          <>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full border border-green-500/10 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-8 rounded-full border border-green-500/5 animate-[spin_16s_linear_infinite_reverse]" />
                <div className="absolute inset-16 rounded-full border border-green-500/3 animate-[spin_26s_linear_infinite]" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-green-900/80 backdrop-blur-sm border border-green-700/50 active:scale-95 transition"
        aria-label="Toggle menu"
      >
        {menuOpen ? (
          <X className="h-5 w-5 text-green-300" />
        ) : (
          <Menu className="h-5 w-5 text-green-300" />
        )}
      </button>

      {/* Mobile info badge */}
      {isMobile && !menuOpen && (
        <div className="md:hidden fixed top-4 left-4 z-40">
          <div className={cn("flex items-center gap-2 bg-green-900/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-green-700/30", mounted ? "animate-slideIn" : "")}>
            <Smartphone className="h-4 w-4 text-green-300" />
            <span className="text-xs text-green-200">Mobile View</span>
          </div>
        </div>
      )}

      {/* Mobile menu overlay */}
      {menuOpen && isMobile && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-16 right-4 w-56 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-green-800/40 p-4 animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-green-300 font-semibold mb-3 text-sm">
              Quick Links
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: "Student Login",
                  path: "/auth/login?role=student",
                  icon: GraduationCap,
                },
                {
                  label: "Teacher Login",
                  path: "/auth/login?role=teacher",
                  icon: UserCog,
                },
                {
                  label: "Student Register",
                  path: "/auth/register?role=student",
                  icon: UserPlus,
                },
                {
                  label: "Teacher Register",
                  path: "/auth/register?role=teacher",
                  icon: BookOpen,
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item.path)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:text-green-300 hover:bg-green-900/30 transition flex items-center gap-2 active:scale-[0.99]"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div
        className={cn(
          "w-full max-w-[90vw] sm:max-w-md rounded-2xl border border-green-800/30 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl p-4 sm:p-6 md:p-8 shadow-2xl shadow-green-900/10",
          "transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          isMobile && "mt-8"
        )}
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="relative mb-3 sm:mb-4">
            <div
              className={cn(
                "absolute -inset-4 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-400/20 blur-lg animate-pulse",
                isMobile && "hidden sm:block"
              )}
            />

            <div className={cn("relative", isMobile ? "h-20 w-20 sm:h-28 sm:w-28" : "h-28 w-28")}>
              <div
                className="absolute inset-0 rounded-full border border-green-500/30 animate-spin"
                style={{ animationDuration: isMobile ? "8s" : "6s" }}
              />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-400/10 backdrop-blur-sm flex items-center justify-center">
                <div className="relative">
                  <Image
                    src="/LOSTFOUND.png"
                    alt="Lost & Found Logo"
                    width={isMobile ? 64 : 96}
                    height={isMobile ? 64 : 96}
                    priority
                    className={cn(
                      "object-contain drop-shadow-[0_0_24px_rgba(34,197,94,0.4)]",
                      isMobile ? "h-16 w-16" : "h-24 w-24"
                    )}
                  />
                  {!isMobile && (
                    <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-green-400 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mb-2">
            <h1
              className={cn(
                "font-bold bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 bg-clip-text text-transparent",
                isMobile ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
              )}
            >
              Lost & Found
            </h1>
            <div
              className={cn(
                "absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse",
                isMobile ? "w-20 h-0.5" : "w-24 h-0.5"
              )}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-white/70 mt-4">
            <ShieldCheck className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-green-400")} />
            <p className={cn("text-xs sm:text-sm", isMobile && "max-w-[250px]")}>
              College-only access • Verified emails required
            </p>
          </div>
        </div>

        {/* Sign In */}
        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 text-white/80 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-800 to-transparent" />
            <span className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
              <Lock className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3")} />
              Sign In
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-800 to-transparent" />
          </div>

          <button
            onClick={() => handleNavigation("/auth/login?role=student")}
            className={cn(
              "group w-full rounded-xl bg-gradient-to-r from-green-600/90 to-emerald-500/90 hover:from-green-500 hover:to-emerald-400 text-white font-medium",
              "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98]",
              "flex items-center justify-center gap-3",
              isMobile ? "py-3 text-sm" : "py-4 text-sm sm:text-base"
            )}
          >
            <div className="relative">
              <GraduationCap className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "group-hover:scale-110 transition-transform")} />
              <div className="absolute -inset-1 bg-green-400/20 rounded-full blur-sm group-hover:opacity-100 opacity-0 transition-opacity" />
            </div>
            <span>Student Login</span>
          </button>

          <button
            onClick={() => handleNavigation("/auth/login?role=teacher")}
            className={cn(
              "group w-full rounded-xl bg-gradient-to-r from-green-700/90 to-emerald-600/90 hover:from-green-600 hover:to-emerald-500 text-white font-medium",
              "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98]",
              "flex items-center justify-center gap-3",
              isMobile ? "py-3 text-sm" : "py-4 text-sm sm:text-base"
            )}
          >
            <div className="relative">
              <UserCog className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "group-hover:scale-110 transition-transform")} />
              <div className="absolute -inset-1 bg-green-400/20 rounded-full blur-sm group-hover:opacity-100 opacity-0 transition-opacity" />
            </div>
            <span>Teacher Login</span>
          </button>
        </div>

        {/* Create Account */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3 text-white/80 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-800 to-transparent" />
            <span className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
              <UserPlus className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3")} />
              Create Account
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-800 to-transparent" />
          </div>

          <button
            onClick={() => handleNavigation("/auth/register?role=student")}
            className={cn(
              "group w-full rounded-xl border border-green-600/50 bg-green-900/10 hover:bg-green-900/30 text-green-300 hover:text-green-200 font-medium backdrop-blur-sm",
              "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/10 active:scale-[0.98]",
              "flex items-center justify-center gap-3",
              isMobile ? "py-3 text-sm" : "py-4 text-sm sm:text-base"
            )}
          >
            <div className="relative">
              <GraduationCap className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "group-hover:scale-110 transition-transform")} />
              <div className="absolute -inset-1 bg-green-400/10 rounded-full blur-sm group-hover:opacity-100 opacity-0 transition-opacity" />
            </div>
            <span>Student Registration</span>
          </button>

          <button
            onClick={() => handleNavigation("/auth/register?role=teacher")}
            className={cn(
              "group w-full rounded-xl border border-green-700/50 bg-green-900/10 hover:bg-green-900/30 text-green-300 hover:text-green-200 font-medium backdrop-blur-sm",
              "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/10 active:scale-[0.98]",
              "flex items-center justify-center gap-3",
              isMobile ? "py-3 text-sm" : "py-4 text-sm sm:text-base"
            )}
          >
            <div className="relative">
              <BookOpen className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "group-hover:scale-110 transition-transform")} />
              <div className="absolute -inset-1 bg-green-400/10 rounded-full blur-sm group-hover:opacity-100 opacity-0 transition-opacity" />
            </div>
            <span>Teacher Registration</span>
          </button>
        </div>

        {/* Footer */}
        <div className={cn(isMobile ? "mt-6 pt-4" : "mt-8 pt-6", "border-t border-green-900/30")}>
          <div className="flex items-center justify-center gap-2 text-white/50">
            <Mail className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3", "text-green-400")} />
            <p className={cn(isMobile ? "text-xs" : "text-xs sm:text-sm")}>
              Only verified .edu email addresses allowed
            </p>
          </div>
        </div>

        {isMobile && <div className="h-6 sm:hidden" />}
      </div>

      {/* Mobile tap hint */}
      {isMobile && !menuOpen && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 animate-bounce-slow z-30">
          <div className="bg-green-900/70 backdrop-blur-sm px-4 py-2 rounded-full border border-green-700/40">
            <p className="text-xs text-green-200 font-medium">
              Tap buttons to continue
            </p>
          </div>
        </div>
      )}

      {/* Global keyframes (lightweight) */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-10px) translateX(5px);
          }
          66% {
            transform: translateY(5px) translateX(-5px);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes bounceSlow {
          0%,
          100% {
            transform: translateX(-50%) translateY(0);
          }
          50% {
            transform: translateX(-50%) translateY(-8px);
          }
        }

        .animate-float {
          animation: float infinite ease-in-out;
        }
        .animate-slideDown {
          animation: slideDown 0.25s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.25s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-bounce-slow {
          animation: bounceSlow 2s infinite;
        }

        /* Better mobile touch */
        @media (max-width: 768px) {
          button {
            -webkit-tap-highlight-color: transparent;
            min-height: 44px;
          }
        }

        /* Respect accessibility */
        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-slideDown,
          .animate-slideIn,
          .animate-fadeIn,
          .animate-bounce-slow,
          .animate-spin {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
