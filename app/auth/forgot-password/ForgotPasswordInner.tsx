"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebase";

const COLLEGE_DOMAIN = "vvce.ac.in";

type Particle = { left: string; top: string; delay: string; duration: string };

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function niceFirebaseError(code?: string) {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-not-found":
      return "No account found for this email. Please register.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return null;
  }
}

export default function ForgotPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const role = (sp.get("role") || "student").toLowerCase();
  const roleLabel = useMemo(() => (role === "teacher" ? "Teacher" : "Student"), [role]);

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // ✅ stable particles (no lag on re-render)
  const particles = useMemo<Particle[]>(() => {
    const count = 12;
    return Array.from({ length: count }, (_, i) => {
      const rnd = (min: number, max: number) => (min + Math.random() * (max - min)).toFixed(2);

      return {
        left: `${rnd(2, 98)}%`,
        top: `${rnd(2, 98)}%`,
        delay: `${(i * 0.4).toFixed(2)}s`,
        duration: `${rnd(12, 24)}s`,
      };
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const em = email.trim().toLowerCase();
    const domain = em.split("@")[1];

    if (!domain || domain !== COLLEGE_DOMAIN) {
      alert(`Only ${COLLEGE_DOMAIN} email IDs are allowed`);
      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(auth, em);

      alert("Password reset link sent. Check your inbox/spam.");
      router.push(`/auth/login?role=${role}`);
    } catch (err: any) {
      alert(niceFirebaseError(err?.code) || err?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const fieldBase =
    "mt-1 flex items-center gap-2 rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 transition";
  const inputBase =
    "w-full bg-transparent outline-none text-white placeholder:text-white/30 text-sm";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 flex items-center justify-center px-4 py-10">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

      {/* Particles */}
      <div className="pointer-events-none absolute inset-0">
        {(isMobile ? particles.slice(0, 7) : particles).map((p, i) => (
          <div
            key={i}
            className={cn(
              "absolute rounded-full bg-green-500/20 animate-float",
              isMobile ? "h-0.5 w-0.5" : "h-1 w-1"
            )}
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <div
        className={cn(
          "w-full max-w-md rounded-2xl border border-green-800/30 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl p-5 sm:p-7 shadow-2xl shadow-green-900/10",
          "transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/auth/login?role=${role}`)}
            className="inline-flex items-center gap-2 text-white/70 hover:text-green-300 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 text-white/70">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            <span className="text-xs">{roleLabel} Reset</span>
          </div>
        </div>

        {/* Header */}
        <div
          className={cn(
            "mt-6 flex flex-col items-center text-center",
            "transition-all duration-700 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          )}
        >
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border border-green-500/30 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-400/10 backdrop-blur-sm flex items-center justify-center">
              <Image
                src="/LOSTFOUND.png"
                alt="Lost & Found Logo"
                width={72}
                height={72}
                priority
                className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(34,197,94,0.25)]"
              />
            </div>
          </div>

          <h1 className="mt-3 text-white text-2xl font-semibold">Forgot password?</h1>
          <p className="mt-1 text-white/60 text-sm">
            Enter your {COLLEGE_DOMAIN} email to get a reset link.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div
            className={cn(
              "transition-all duration-700 delay-150",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            )}
          >
            <label className="text-white/70 text-xs">Email</label>
            <div
              className={cn(
                fieldBase,
                "focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20"
              )}
            >
              <Mail className="h-4 w-4 text-green-400" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`yourname@${COLLEGE_DOMAIN}`}
                className={inputBase}
                type="email"
                required
              />
            </div>
          </div>

          <button
            className={cn(
              "relative w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-3.5 font-medium transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
              "shadow-lg shadow-green-700/10"
            )}
            type="submit"
            disabled={loading}
          >
            {loading && (
              <span className="absolute inset-0 rounded-xl overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[shimmer_1.2s_infinite]" />
              </span>
            )}
            <span className="relative">{loading ? "Sending..." : "Send reset link"}</span>
          </button>
        </form>

        {/* Footer */}
        <p
          className={cn(
            "mt-5 text-xs text-white/50 text-center transition-all duration-700 delay-300",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          Tip: If you don’t see the mail, check Spam/Promotions.
        </p>
      </div>

      {/* Global keyframes */}
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
        @keyframes shimmer {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(120%);
          }
        }

        .animate-float {
          animation: float infinite ease-in-out;
        }

        @media (max-width: 768px) {
          button {
            -webkit-tap-highlight-color: transparent;
            min-height: 44px;
          }
          input {
            font-size: 16px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-spin,
          .animate-pulse,
          .animate-[shimmer_1.2s_infinite] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
