"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

import {
    LogOut,
    PackageSearch,
    PlusCircle,
    ClipboardList,
    ShieldCheck,
    Sparkles,
    Menu,
    X,
    ChevronRight,
    Search,
} from "lucide-react";

type UserProfile = {
    name: string;
    email: string;
    role: "student" | "teacher" | "maintainer" | "admin";
};

type Particle = { left: string; top: string; delay: string; duration: string };

function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

function SkeletonLine({ w = "w-40" }: { w?: string }) {
    return <div className={cn("h-3 rounded bg-white/10 animate-pulse", w)} />;
}

function QuickTile({
    icon: Icon,
    title,
    onClick,
}: {
    icon: any;
    title: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="rounded-2xl border border-green-800/25 bg-black/35 p-3 text-left hover:border-green-600/50 hover:bg-green-900/10 transition active:scale-[0.99]"
        >
            <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-green-500/10 border border-green-700/20 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5 text-green-300" />
                </div>
                <p className="text-white/85 text-sm font-medium">{title}</p>
            </div>
        </button>
    );
}

export default function DashboardPage() {
    const router = useRouter();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [menuOpen, setMenuOpen] = useState(false);
    const [search, setSearch] = useState("");

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

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            if (!fbUser) {
                router.replace("/auth");
                return;
            }

            if (!fbUser.emailVerified) {
                alert("Please verify your email first.");
                await signOut(auth);
                router.replace("/auth");
                return;
            }

            const snap = await getDoc(doc(db, "users", fbUser.uid));
            if (!snap.exists()) {
                await signOut(auth);
                router.replace("/auth");
                return;
            }

            const data = snap.data() as UserProfile;

            // 🔐 Route by role
            if (data.role === "admin") {
                router.replace("/admin");
                return;
            }
            if (data.role === "maintainer") {
                router.replace("/maintainer");
                return;
            }

            setUser(data);
            setLoading(false);
        });

        return () => unsub();
    }, [router]);

    const particles = useMemo<Particle[]>(() => {
        const count = 16;
        return Array.from({ length: count }, (_, i) => ({
            left: `${(2 + Math.random() * 96).toFixed(2)}%`,
            top: `${(2 + Math.random() * 96).toFixed(2)}%`,
            delay: `${(i * 0.35).toFixed(2)}s`,
            duration: `${(12 + Math.random() * 16).toFixed(2)}s`,
        }));
    }, []);

    const actions = useMemo(
        () => [
            {
                key: "lost",
                icon: PlusCircle,
                title: "Report Lost Item",
                desc: "Report something you lost inside campus",
                path: "/dashboard/lost/new",
                gradient: "from-green-600/90 to-emerald-500/90",
            },
            {
                key: "found",
                icon: PackageSearch,
                title: "Report Found Item",
                desc: "Submit an item you found",
                path: "/dashboard/found/new",
                gradient: "from-green-700/90 to-emerald-600/90",
            },
            {
                key: "claims",
                icon: ClipboardList,
                title: "My Claims",
                desc: "Track your submitted claims",
                path: "/dashboard/my-claims",
                gradient: "from-green-800/70 to-emerald-700/70",
            },
            {
                key: "browse",
                icon: Search,
                title: "Browse Lost & Found",
                desc: "Search and claim items",
                path: "/dashboard/browse",
                gradient: "from-green-900/40 to-emerald-900/30",
            },
        ],
        []
    );

    const filteredActions = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return actions;
        return actions.filter(
            (a) =>
                a.title.toLowerCase().includes(s) || a.desc.toLowerCase().includes(s)
        );
    }, [actions, search]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
                <div className="w-full max-w-md rounded-2xl border border-green-800/25 bg-black/50 p-5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/10 animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <SkeletonLine w="w-44" />
                            <SkeletonLine w="w-28" />
                        </div>
                    </div>
                    <div className="mt-5 space-y-3">
                        <div className="h-14 rounded-2xl bg-white/10 animate-pulse" />
                        <div className="h-14 rounded-2xl bg-white/10 animate-pulse" />
                        <div className="h-14 rounded-2xl bg-white/10 animate-pulse" />
                    </div>
                    <p className="mt-4 text-green-300/80 text-xs text-center">
                        Loading dashboard…
                    </p>
                </div>
            </div>
        );
    }

    const roleLabel = user?.role === "teacher" ? "Teacher" : "Student";

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-6">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

            {/* Particles */}
            <div className="pointer-events-none absolute inset-0">
                {(isMobile ? particles.slice(0, 8) : particles).map((p, i) => (
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

            {/* Mobile menu button */}
            <button
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-xl bg-green-900/70 backdrop-blur-sm border border-green-700/40 active:scale-95"
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
                    className="md:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-sm animate-fadeIn"
                    onClick={() => setMenuOpen(false)}
                >
                    <div
                        className="absolute top-16 right-4 w-56 rounded-2xl border border-green-800/35 bg-gray-900/95 backdrop-blur-xl p-4 animate-slideDown"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-green-200 font-semibold text-sm">Quick Actions</p>
                            <Sparkles className="h-4 w-4 text-green-400 animate-pulse" />
                        </div>

                        <div className="mt-3 space-y-2">
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    router.push("/dashboard/browse");
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/80 hover:text-green-200 hover:bg-green-900/30 transition flex items-center gap-2"
                            >
                                <Search className="h-4 w-4" />
                                Browse
                            </button>

                            <button
                                onClick={async () => {
                                    setMenuOpen(false);
                                    await signOut(auth);
                                    router.push("/auth");
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/80 hover:text-red-300 hover:bg-red-900/20 transition flex items-center gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto relative">
                {/* Header */}
                <header
                    className={cn(
                        "flex items-center justify-between mb-6 transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute -inset-3 rounded-full bg-green-500/10 blur-xl animate-pulse" />
                            <Image
                                src="/LOSTFOUND.png"
                                alt="Lost & Found"
                                width={44}
                                height={44}
                                className="relative h-11 w-11"
                                priority
                            />
                        </div>
                        <div>
                            <h1 className="text-white font-semibold leading-tight">
                                Lost & Found
                            </h1>
                            <p className="text-white/60 text-xs">
                                {roleLabel} Dashboard • VVCE
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            await signOut(auth);
                            router.push("/auth");
                        }}
                        className="hidden md:inline-flex items-center gap-2 text-white/70 hover:text-red-400 transition active:scale-95"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </header>

                {/* Welcome + Search */}
                <div
                    className={cn(
                        "mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4 transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    )}
                    style={{ transitionDelay: "90ms" }}
                >
                    {/* Welcome Card */}
                    <div className="lg:col-span-2 rounded-2xl border border-green-800/25 bg-black/40 p-5 shadow-xl shadow-green-900/10">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-2xl bg-green-500/10 border border-green-700/20 flex items-center justify-center">
                                    <ShieldCheck className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">
                                        Welcome,{" "}
                                        <span className="text-green-200">{user?.name}</span>
                                    </p>
                                    <p className="text-white/60 text-xs">{user?.email}</p>
                                </div>
                            </div>

                            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-green-900/25 border border-green-700/25 px-3 py-1 text-xs text-green-200">
                                <Sparkles className="h-3.5 w-3.5 text-green-400" />
                                Verified
                            </span>
                        </div>

                        {/* Quick tiles */}
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <QuickTile
                                icon={Search}
                                title="Browse"
                                onClick={() => router.push("/dashboard/browse")}
                            />
                            <QuickTile
                                icon={ClipboardList}
                                title="My Claims"
                                onClick={() => router.push("/dashboard/my-claims")}
                            />
                            <QuickTile
                                icon={PlusCircle}
                                title="Report Lost"
                                onClick={() => router.push("/dashboard/lost/new")}
                            />
                        </div>
                    </div>

                    {/* Search Card */}
                    <div className="rounded-2xl border border-green-800/25 bg-black/35 p-5">
                        <p className="text-white/80 text-sm font-semibold mb-3">
                            Quick Search
                        </p>
                        <div className="flex items-center gap-2 rounded-xl border border-green-800/25 bg-black/40 px-3 py-3">
                            <Search className="h-4 w-4 text-green-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Type: lost, found, claim…"
                                className="w-full bg-transparent outline-none text-white text-sm placeholder:text-white/30"
                            />
                        </div>

                        <button
                            onClick={() => router.push("/dashboard/browse")}
                            className="mt-3 w-full rounded-xl border border-green-700/40 bg-green-900/10 hover:bg-green-900/25 text-green-200 py-2.5 text-sm transition active:scale-[0.99]"
                        >
                            Open Browse
                        </button>

                        <p className="mt-3 text-white/40 text-xs">
                            Tip: Use Browse to claim items quickly.
                        </p>
                    </div>
                </div>

                {/* Actions Grid */}
                <div
                    className={cn(
                        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    )}
                    style={{ transitionDelay: "160ms" }}
                >
                    {filteredActions.map((a, idx) => (
                        <ActionCard
                            key={a.key}
                            icon={a.icon}
                            title={a.title}
                            desc={a.desc}
                            gradient={a.gradient}
                            delayMs={200 + idx * 70}
                            mounted={mounted}
                            onClick={() => router.push(a.path)}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="text-center text-white/40 text-xs mt-6">
                    Campus-only • Secure • Verified access
                </div>
            </div>

            {/* Global Animations */}
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
          .animate-float,
          .animate-pulse {
            animation: none !important;
          }
          * {
            scroll-behavior: auto !important;
          }
        }
      `}</style>
        </div>
    );
}

/* ---------------- Components ---------------- */

function ActionCard({
    icon: Icon,
    title,
    desc,
    onClick,
    gradient,
    mounted,
    delayMs,
}: {
    icon: any;
    title: string;
    desc: string;
    onClick: () => void;
    gradient: string;
    mounted: boolean;
    delayMs: number;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-2xl border border-green-800/25 bg-black/40 p-5 text-left",
                "transition-all duration-300 hover:border-green-600/50 hover:bg-black/50 hover:shadow-xl hover:shadow-green-900/10 active:scale-[0.99]",
                "focus:outline-none focus:ring-2 focus:ring-green-500/30",
                "transition-[transform,opacity] duration-700 ease-out",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            )}
            style={{ transitionDelay: `${delayMs}ms` }}
        >
            {/* Glow layer */}
            <div
                className={cn(
                    "pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity",
                    "bg-green-500/15"
                )}
            />

            {/* Gradient strip */}
            <div
                className={cn(
                    "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                    gradient
                )}
            />

            <div className="flex items-start justify-between gap-3">
                <div className="h-11 w-11 rounded-2xl bg-green-500/10 border border-green-700/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-green-300 group-hover:scale-110 transition-transform" />
                </div>

                <ChevronRight className="h-5 w-5 text-white/25 group-hover:text-green-300 group-hover:translate-x-0.5 transition" />
            </div>

            <h3 className="mt-4 text-white font-semibold">{title}</h3>
            <p className="text-white/60 text-xs mt-1 leading-relaxed">{desc}</p>

            {/* subtle bottom highlight */}
            <div className="mt-4 h-1.5 rounded-full bg-green-500/10 group-hover:bg-green-500/15 transition-colors" />
        </button>
    );
}
