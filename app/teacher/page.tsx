"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/app/lib/firebase";

import {
    GraduationCap,
    ShieldCheck,
    LogOut,
    Sparkles,
    ChevronRight,
    Users,
    Wrench,
    Menu,
    X,
} from "lucide-react";

function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

export default function TeacherHub() {
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);

        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const go = (path: string) => {
        router.push(path);
        setMenuOpen(false);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-6 flex items-center justify-center">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

            {/* Floating particles (lightweight) */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0">
                    {[...Array(isMobile ? 8 : 14)].map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "absolute rounded-full bg-green-500/20 animate-float",
                                isMobile ? "h-0.5 w-0.5" : "h-1 w-1"
                            )}
                            style={{
                                left: `${(i * 100) / (isMobile ? 8 : 14)}%`,
                                top: `${(i * 70) % 100}%`,
                                animationDelay: `${i * 0.35}s`,
                                animationDuration: `${isMobile ? 16 : 10 + (i % 6) * 2}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Mobile menu button */}
            <button
                onClick={() => setMenuOpen((s) => !s)}
                className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-green-900/80 backdrop-blur-sm border border-green-700/50"
                aria-label="Toggle menu"
            >
                {menuOpen ? (
                    <X className="h-5 w-5 text-green-300" />
                ) : (
                    <Menu className="h-5 w-5 text-green-300" />
                )}
            </button>

            {/* Mobile menu overlay */}
            {menuOpen && isMobile && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm animate-fadeIn"
                    onClick={() => setMenuOpen(false)}
                >
                    <div
                        className="absolute top-16 right-4 w-56 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-green-800/40 p-4 animate-slideDown"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-green-300 font-semibold mb-3 text-sm">
                            Teacher Hub
                        </h3>

                        <div className="space-y-2">
                            <button
                                onClick={() => go("/dashboard")}
                                className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/80 hover:text-green-300 hover:bg-green-900/30 transition-colors flex items-center gap-2"
                            >
                                <Users className="h-4 w-4" />
                                Student Dashboard
                            </button>

                            <button
                                onClick={() => go("/maintainer")}
                                className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/80 hover:text-green-300 hover:bg-green-900/30 transition-colors flex items-center gap-2"
                            >
                                <Wrench className="h-4 w-4" />
                                Maintainer Panel
                            </button>

                            <div className="h-px bg-green-800/30 my-2" />

                            <button
                                onClick={async () => {
                                    await signOut(auth);
                                    router.replace("/auth");
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-sm text-red-300 hover:text-red-200 hover:bg-red-900/20 transition-colors flex items-center gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div
                className={cn(
                    "w-full max-w-md rounded-2xl border border-green-800/30 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl p-5 sm:p-7 shadow-2xl shadow-green-900/10 transition-all duration-700",
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
            >
                {/* Header */}
                <div className="flex flex-col items-center text-center">
                    {/* Logo ring */}
                    <div className="relative mb-4">
                        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-400/20 blur-lg animate-pulse" />
                        <div className={cn("relative h-24 w-24", isMobile && "h-20 w-20")}>
                            <div
                                className="absolute inset-0 rounded-full border border-green-500/30 animate-spin"
                                style={{ animationDuration: isMobile ? "8s" : "6s" }}
                            />
                            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-400/10 flex items-center justify-center">
                                <div className="relative">
                                    <Image
                                        src="/LOSTFOUND.png"
                                        alt="Lost & Found Logo"
                                        width={isMobile ? 64 : 80}
                                        height={isMobile ? 64 : 80}
                                        priority
                                        className={cn(
                                            "object-contain drop-shadow-[0_0_24px_rgba(34,197,94,0.45)]",
                                            isMobile ? "h-16 w-16" : "h-20 w-20"
                                        )}
                                    />
                                    {!isMobile && (
                                        <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-green-400 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-green-200/90">
                        <ShieldCheck className="h-5 w-5 text-green-400" />
                        <h1 className="text-white text-xl font-semibold">Teacher Access</h1>
                    </div>

                    <p className="text-white/60 text-sm mt-2">
                        Choose how you want to continue
                    </p>
                </div>

                {/* Buttons */}
                <div className="mt-6 space-y-3">
                    <button
                        onClick={() => go("/dashboard")}
                        className={cn(
                            "group w-full rounded-xl border border-green-600/50 bg-green-900/10 hover:bg-green-900/30 text-green-200 font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/10 active:scale-[0.98]",
                            "py-3.5 flex items-center justify-between px-4"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-green-300 group-hover:scale-110 transition-transform" />
                            Student Dashboard
                        </span>
                        <ChevronRight className="h-5 w-5 text-green-300/80 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                        onClick={() => go("/maintainer")}
                        className={cn(
                            "group w-full rounded-xl bg-gradient-to-r from-green-600/90 to-emerald-500/90 hover:from-green-500 hover:to-emerald-400 text-black font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98]",
                            "py-3.5 flex items-center justify-between px-4"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            Maintainer Panel
                        </span>
                        <ChevronRight className="h-5 w-5 opacity-90 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                        onClick={async () => {
                            await signOut(auth);
                            router.replace("/auth");
                        }}
                        className="w-full mt-2 rounded-xl border border-red-800/30 bg-red-900/10 hover:bg-red-900/20 text-red-300 hover:text-red-200 py-3 text-sm transition active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-5 border-t border-green-900/30">
                    <p className="text-center text-white/45 text-xs">
                        Campus-only • Verified emails • Role-based access
                    </p>
                </div>

                {/* Mobile safe space */}
                {isMobile && <div className="h-4 sm:hidden" />}
            </div>

            {/* Global animations */}
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
            transform: translateY(6px) translateX(-5px);
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
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float infinite ease-in-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.25s ease-out;
        }

        @media (max-width: 768px) {
          button,
          [role="button"] {
            -webkit-tap-highlight-color: transparent;
            min-height: 44px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-pulse,
          .animate-float,
          .animate-spin {
            animation: none !important;
          }
        }
      `}</style>
        </div>
    );
}
