"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    getDocs,
    query,
    where,
    Timestamp,
    orderBy,
    limit,
    doc,
    getDoc,
} from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

import {
    ArrowLeft,
    BarChart3,
    MapPin,
    PackageSearch,
    Timer,
    Sparkles,
    Menu,
    X,
} from "lucide-react";

type UserProfile = { role?: string; name?: string };

type ItemRow = {
    id: string;
    status?: string;
    category?: string;
    createdAt?: any;
    lastSeenLocation?: string;
    foundLocation?: string;
    assignedMaintainerName?: string;
};

type ClaimRow = {
    id: string;
    status?: "pending" | "approved" | "rejected";
    category?: string;
    location?: string;
    createdAt?: any;
    verifiedAt?: any; // NOTE: keep this if your schema uses verifiedAt; otherwise update to reviewedAt
};

function fmtDate(v: any) {
    try {
        if (!v) return "";
        if (v instanceof Timestamp) return v.toDate().toLocaleString();
        if (v?.toDate) return v.toDate().toLocaleString();
        if (typeof v === "string") return new Date(v).toLocaleString();
        return "";
    } catch {
        return "";
    }
}

function toMillis(v: any) {
    try {
        if (!v) return null;
        if (v instanceof Timestamp) return v.toMillis();
        if (v?.toMillis) return v.toMillis();
        const t = new Date(v).getTime();
        return Number.isFinite(t) ? t : null;
    } catch {
        return null;
    }
}

function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

function topN(map: Record<string, number>, n = 5) {
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);
}

export default function AdminAnalyticsPage() {
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [lostItems, setLostItems] = useState<ItemRow[]>([]);
    const [foundItems, setFoundItems] = useState<ItemRow[]>([]);
    const [claims, setClaims] = useState<ClaimRow[]>([]);

    useEffect(() => {
        setMounted(true);
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u || !u.emailVerified) {
                router.replace("/auth");
                return;
            }

            try {
                setErr("");
                setLoading(true);

                // ✅ Reliable role check: users/{uid}
                const meSnap = await getDoc(doc(db, "users", u.uid));
                const me = meSnap.exists() ? (meSnap.data() as UserProfile) : {};
                const role = (me.role || "").toLowerCase();

                if (role !== "admin") {
                    router.replace("/dashboard");
                    return;
                }

                // Pull recent-ish data (you can increase limits later)
                const [lostSnap, foundSnap, claimSnap] = await Promise.all([
                    getDocs(
                        query(collection(db, "lost_items"), orderBy("createdAt", "desc"), limit(500))
                    ),
                    getDocs(
                        query(collection(db, "found_items"), orderBy("createdAt", "desc"), limit(500))
                    ),
                    getDocs(
                        query(collection(db, "claims"), orderBy("createdAt", "desc"), limit(800))
                    ),
                ]);

                setLostItems(lostSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
                setFoundItems(foundSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
                setClaims(claimSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
            } catch (e: any) {
                console.error(e);
                setErr(e?.message || "Failed to load analytics.");
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [router]);

    const stats = useMemo(() => {
        const totalLost = lostItems.length;
        const totalFound = foundItems.length;

        const openLost = lostItems.filter((x) => (x.status || "") === "open").length;
        const openFound = foundItems.filter((x) => (x.status || "") === "open").length;

        const approved = claims.filter((c) => c.status === "approved").length;
        const rejected = claims.filter((c) => c.status === "rejected").length;
        const pending = claims.filter((c) => c.status === "pending").length;

        // top categories
        const cat: Record<string, number> = {};
        for (const i of [...lostItems, ...foundItems]) {
            const k = (i.category || "Other").trim() || "Other";
            cat[k] = (cat[k] || 0) + 1;
        }

        // hotspots (locations from items + claims)
        const hot: Record<string, number> = {};
        for (const i of lostItems) {
            const loc = (i.lastSeenLocation || "").trim();
            if (loc) hot[loc] = (hot[loc] || 0) + 1;
        }
        for (const i of foundItems) {
            const loc = (i.foundLocation || "").trim();
            if (loc) hot[loc] = (hot[loc] || 0) + 1;
        }
        for (const c of claims) {
            const loc = (c.location || "").trim();
            if (loc) hot[loc] = (hot[loc] || 0) + 1;
        }

        // avg time-to-verify for approved claims
        const durations: number[] = [];
        for (const c of claims) {
            if (c.status !== "approved") continue;
            const a = toMillis(c.createdAt);
            const b = toMillis(c.verifiedAt); // if you store reviewedAt, rename this to reviewedAt in type + here
            if (a && b && b > a) durations.push(b - a);
        }
        const avgMs = durations.length
            ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length)
            : null;

        const avgHours = avgMs ? Math.round((avgMs / (1000 * 60 * 60)) * 10) / 10 : null;

        return {
            totalLost,
            totalFound,
            openLost,
            openFound,
            approved,
            rejected,
            pending,
            topCategories: topN(cat, 6),
            hotspots: topN(hot, 6),
            avgHours,
        };
    }, [lostItems, foundItems, claims]);

    const go = (path: string) => {
        router.push(path);
        setMenuOpen(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <p className="text-green-400 text-sm">Loading analytics…</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-6">
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
                        <h3 className="text-green-300 font-semibold mb-3 text-sm">Admin</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => go("/admin")}
                                className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/80 hover:text-green-300 hover:bg-green-900/30 transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Admin
                            </button>
                            <button
                                onClick={() => go("/admin/logs")}
                                className="w-full text-left px-3 py-2 rounded-xl text-sm text-white/80 hover:text-green-300 hover:bg-green-900/30 transition-colors flex items-center gap-2"
                            >
                                <Timer className="h-4 w-4" />
                                System Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className={cn(
                    "max-w-4xl mx-auto transition-all duration-700",
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
            >
                {/* Top bar */}
                <div className="flex items-center justify-between mb-5">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-white/70 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>

                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-green-400" />
                        <p className="text-white/80 text-sm font-medium">Admin Analytics</p>
                    </div>
                </div>

                {err && (
                    <div className="mb-4 rounded-2xl border border-red-800/30 bg-red-950/20 p-4">
                        <p className="text-red-300 text-sm font-semibold">Error</p>
                        <p className="text-white/70 text-sm mt-1">{err}</p>
                    </div>
                )}

                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KPI
                        title="Lost Items"
                        value={stats.totalLost}
                        icon={<PackageSearch className="h-4 w-4 text-green-300" />}
                        sub={`${stats.openLost} open`}
                    />
                    <KPI
                        title="Found Items"
                        value={stats.totalFound}
                        icon={<PackageSearch className="h-4 w-4 text-emerald-300" />}
                        sub={`${stats.openFound} open`}
                    />
                    <KPI
                        title="Pending Claims"
                        value={stats.pending}
                        icon={<Timer className="h-4 w-4 text-yellow-200" />}
                        sub="awaiting review"
                    />
                    <KPI
                        title="Approved Claims"
                        value={stats.approved}
                        icon={<Timer className="h-4 w-4 text-green-300" />}
                        sub={`${stats.rejected} rejected`}
                    />
                </div>

                {/* Insights */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-green-800/20 bg-black/40 p-5">
                        <p className="text-white/80 font-semibold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-green-400" />
                            Top Categories
                        </p>
                        <div className="mt-3 space-y-2">
                            {stats.topCategories.length === 0 ? (
                                <p className="text-white/50 text-sm">No data yet.</p>
                            ) : (
                                stats.topCategories.map(([k, v]) => <Row key={k} label={k} value={v} />)
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-green-800/20 bg-black/40 p-5">
                        <p className="text-white/80 font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-green-400" />
                            Hotspot Locations
                        </p>
                        <div className="mt-3 space-y-2">
                            {stats.hotspots.length === 0 ? (
                                <p className="text-white/50 text-sm">No data yet.</p>
                            ) : (
                                stats.hotspots.map(([k, v]) => <Row key={k} label={k} value={v} />)
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-green-800/20 bg-black/40 p-5">
                    <p className="text-white/80 font-semibold flex items-center gap-2">
                        <Timer className="h-4 w-4 text-green-400" />
                        Recovery Speed
                    </p>
                    <p className="text-white/60 text-sm mt-2">
                        Avg time to approve a claim:{" "}
                        <span className="text-green-300 font-semibold">
                            {stats.avgHours == null ? "—" : `${stats.avgHours} hours`}
                        </span>
                    </p>

                    <p className="text-white/40 text-xs mt-2">
                        (Calculated using claims where both createdAt and verifiedAt are present.)
                    </p>
                </div>

                <div className="text-center text-white/40 text-xs mt-6">
                    Admin-only • Campus-only • Analytics snapshot
                </div>
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

function KPI({
    title,
    value,
    icon,
    sub,
}: {
    title: string;
    value: any;
    icon: React.ReactNode;
    sub?: string;
}) {
    return (
        <div className="rounded-2xl border border-green-800/20 bg-black/40 p-4">
            <div className="flex items-center justify-between">
                <p className="text-white/50 text-xs">{title}</p>
                {icon}
            </div>
            <p className="text-white text-2xl font-semibold mt-2">{value}</p>
            {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
        </div>
    );
}

function Row({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-green-800/10 bg-black/30 px-3 py-2">
            <p className="text-white/70 text-sm truncate">{label}</p>
            <p className="text-green-300 font-semibold text-sm">{value}</p>
        </div>
    );
}
