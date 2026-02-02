"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Mail, Lock, ShieldCheck } from "lucide-react";

import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

type Particle = { left: string; top: string; delay: string; duration: string };

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const role = (sp.get("role") || "student").toLowerCase();
  const roleLabel = useMemo(
    () => (role === "teacher" ? "Teacher" : "Student"),
    [role]
  );

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const COLLEGE_DOMAIN = "vvce.ac.in";

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

  const particles = useMemo<Particle[]>(() => {
    const count = 12;
    return Array.from({ length: count }, (_, i) => {
      const rnd = (min: number, max: number) =>
        (min + Math.random() * (max - min)).toFixed(2);

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

    const em = email.trim().toLowerCase();
    if (!em.endsWith(`@${COLLEGE_DOMAIN}`)) {
      alert(`Only ${COLLEGE_DOMAIN} email IDs allowed`);
      return;
    }

    try {
      setLoading(true);

      const cred = await signInWithEmailAndPassword(auth, em, password);

      if (!cred.user.emailVerified) {
        alert("Verify your email first");
        return;
      }

      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const userRole = snap.exists()
        ? (snap.data().role || "student")
        : "student";

      if (userRole === "teacher") router.push("/teacher");
      else if (userRole === "maintainer") router.push("/maintainer");
      else if (userRole === "admin") router.push("/admin");
      else router.push("/dashboard");
    } catch (err: any) {
      alert(err?.message || "Login failed");
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
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

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
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push("/auth")}
            className="inline-flex items-center gap-2 text-white/70 hover:text-green-300 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 text-white/70">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            <span className="text-xs">{roleLabel} Login</span>
          </div>
        </div>

        <div
          className={cn(
            "mt-6 text-center transition-all duration-700 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          )}
        >
          <div className="mx-auto relative h-20 w-20">
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

          <h1 className="text-white text-2xl font-semibold mt-3">Lost & Found</h1>
          <p className="text-white/60 text-sm mt-1">Sign in with your VVCE email</p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-white/70 text-xs">Email</label>
            <div
              className={cn(
                fieldBase,
                "focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20"
              )}
            >
              <Mail className="h-4 w-4 text-green-400" />
              <input
                type="email"
                placeholder={`yourname@${COLLEGE_DOMAIN}`}
                className={inputBase}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-white/70 text-xs">Password</label>
            <div
              className={cn(
                fieldBase,
                "focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20"
              )}
            >
              <Lock className="h-4 w-4 text-green-400" />
              <input
                type="password"
                placeholder="••••••••"
                className={inputBase}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            disabled={loading}
            className={cn(
              "relative w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-3.5 font-medium transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
              "shadow-lg shadow-green-700/10"
            )}
          >
            <span className="relative">{loading ? "Signing in..." : "Login"}</span>
          </button>

          <p className="text-[11px] text-white/45 text-center pt-1">
            Your email must end with @{COLLEGE_DOMAIN}
          </p>
        </form>
      </div>

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
        .animate-float {
          animation: float infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
