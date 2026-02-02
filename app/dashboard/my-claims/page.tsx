"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
    Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    XCircle,
    MapPin,
    Sparkles,
    Filter,
    ChevronRight,
} from "lucide-react";

type Claim = {
    id: string;

    itemType?: "lost" | "found";
    itemId?: string;
    itemTitle?: string;

    category?: string;
    location?: string;

    status?: "pending" | "approved" | "rejected";
    createdAt?: any;

    // ✅ assigner fields
    assignedMaintainerName?: string;
    collectionPoint?: string;
    officeHours?: string;

    rejectedReason?: string;
};

type Particle = { left: string; top: string; delay: string; duration: string };

function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

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

function StatusPill({ status }: { status?: Claim["status"] }) {
    if (status === "approved") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-900/30 border border-green-700/30 px-2 py-1 text-xs text-green-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approved
            </span>
        );
    }
    if (status === "rejected") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-900/30 border border-red-700/30 px-2 py-1 text-xs text-red-300">
                <XCircle className="h-3.5 w-3.5" />
                Rejected
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-900/30 border border-yellow-700/30 px-2 py-1 text-xs text-yellow-200">
            <Clock3 className="h-3.5 w-3.5" />
            Pending
        </span>
    );
}

function TabButton({
    active,
    label,
    count,
    onClick,
}: {
    active: boolean;
    label: string;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition active:scale-[0.99]",
                active
                    ? "bg-green-900/30 border border-green-700/40 text-green-200"
                    : "bg-black/30 border border-green-900/30 text-white/70 hover:text-green-200 hover:bg-green-900/20"
            )}
        >
            <span className="font-medium">{label}</span>
            <span
                className={cn(
                    "text-xs rounded-full px-2 py-0.5 border",
                    active
                        ? "bg-green-500/15 border-green-500/30 text-green-200"
                        : "bg-white/5 border-white/10 text-white/60"
                )}
            >
                {count}
            </span>

            {active && (
                <span className="absolute -bottom-[2px] left-1/2 h-[2px] w-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse" />
            )}
        </button>
    );
}

function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-green-800/20 bg-black/40 p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                    <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
                    <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
                </div>
                <div className="h-7 w-24 rounded-full bg-white/10 animate-pulse" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="h-16 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-16 rounded-xl bg-white/10 animate-pulse" />
            </div>

            <div className="mt-4 h-16 rounded-xl bg-white/10 animate-pulse" />
        </div>
    );
}

export default function MyClaimsPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<Claim[]>([]);
    const [err, setErr] = useState("");

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("all");

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
        const count = 14;
        return Array.from({ length: count }, (_, i) => {
            const rnd = (min: number, max: number) =>
                (min + Math.random() * (max - min)).toFixed(2);
            return {
                left: `${rnd(2, 98)}%`,
                top: `${rnd(2, 98)}%`,
                delay: `${(i * 0.35).toFixed(2)}s`,
                duration: `${rnd(12, 24)}s`,
            };
        });
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                router.push("/auth");
                return;
            }

            try {
                const qy = query(
                    collection(db, "claims"),
                    where("claimantUid", "==", u.uid),
                    orderBy("createdAt", "desc")
                );

                const snap = await getDocs(qy);
                const data: Claim[] = snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as any),
                }));

                setRows(data);
            } catch (e: any) {
                console.error(e);
                setErr(e?.message || "Failed to load claims.");
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [router]);

    const counts = useMemo(() => {
        const pending = rows.filter((r) => r.status === "pending").length;
        const approved = rows.filter((r) => r.status === "approved").length;
        const rejected = rows.filter((r) => r.status === "rejected").length;
        return { all: rows.length, pending, approved, rejected };
    }, [rows]);

    const filtered = useMemo(() => {
        if (tab === "all") return rows;
        return rows.filter((r) => r.status === tab);
    }, [rows, tab]);

    const empty = useMemo(() => !loading && rows.length === 0, [loading, rows]);

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-6">
            {/* Ambient */}
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

            <div className="max-w-2xl mx-auto relative">
                {/* Top */}
                <div
                    className={cn(
                        "flex items-center justify-between mb-4 transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                    )}
                >
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-white/70 hover:text-white transition active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>

                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-400 animate-pulse" />
                        <p className="text-white/80 text-sm font-medium">My Claims</p>
                    </div>
                </div>

                {/* Tabs */}
                <div
                    className={cn(
                        "flex items-center justify-between gap-3 rounded-2xl border border-green-800/20 bg-black/30 p-3 mb-4",
                        "transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    )}
                    style={{ transitionDelay: "90ms" }}
                >
                    <div className="flex flex-wrap gap-2">
                        <TabButton active={tab === "all"} label="All" count={counts.all} onClick={() => setTab("all")} />
                        <TabButton
                            active={tab === "pending"}
                            label="Pending"
                            count={counts.pending}
                            onClick={() => setTab("pending")}
                        />
                        <TabButton
                            active={tab === "approved"}
                            label="Approved"
                            count={counts.approved}
                            onClick={() => setTab("approved")}
                        />
                        <TabButton
                            active={tab === "rejected"}
                            label="Rejected"
                            count={counts.rejected}
                            onClick={() => setTab("rejected")}
                        />
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-white/50 text-xs">
                        <Filter className="h-3.5 w-3.5 text-green-400" />
                        Filter
                    </div>
                </div>

                {err && (
                    <div className="mb-4 rounded-2xl border border-red-800/30 bg-red-950/20 p-4">
                        <p className="text-red-300 text-sm font-semibold">Error</p>
                        <p className="text-white/70 text-sm mt-1">{err}</p>
                    </div>
                )}

                {/* Empty */}
                {empty && (
                    <div className="rounded-2xl border border-green-800/20 bg-black/40 p-6 text-center">
                        <p className="text-white/80 font-semibold">No claims yet</p>
                        <p className="text-white/50 text-sm mt-1">
                            Browse items and submit a claim to track it here.
                        </p>
                        <button
                            onClick={() => router.push("/dashboard/browse")}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 text-black font-semibold px-4 py-2 transition active:scale-[0.99]"
                        >
                            Browse Items
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* List */}
                {!empty && (
                    <div className="space-y-4">
                        {loading ? (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        ) : (
                            filtered.map((c, idx) => (
                                <div
                                    key={c.id}
                                    className={cn(
                                        "rounded-2xl border border-green-800/20 bg-black/40 p-5 shadow-xl shadow-green-900/10",
                                        "transition-all duration-700 ease-out",
                                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                                        "hover:border-green-600/30 hover:bg-black/50"
                                    )}
                                    style={{ transitionDelay: `${140 + idx * 60}ms` }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-white text-lg font-semibold">
                                                {c.itemTitle || "Item"}
                                            </p>
                                            <p className="text-white/60 text-xs mt-1">
                                                {c.itemType?.toUpperCase()} • {c.category || "Other"}
                                            </p>
                                        </div>

                                        <StatusPill status={c.status} />
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-xl border border-green-800/20 bg-black/40 p-3">
                                            <p className="text-white/50 text-xs">Location</p>
                                            <p className="text-white flex items-center gap-1 mt-1">
                                                <MapPin className="h-4 w-4 text-green-400" />
                                                {c.location || "-"}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-green-800/20 bg-black/40 p-3">
                                            <p className="text-white/50 text-xs">Submitted</p>
                                            <p className="text-white mt-1">{fmtDate(c.createdAt) || "-"}</p>
                                        </div>
                                    </div>

                                    {/* ✅ If approved, show collection details */}
                                    {c.status === "approved" && (
                                        <div className="mt-4 rounded-xl border border-green-800/20 bg-green-900/10 p-4">
                                            <p className="text-green-300 text-xs font-semibold">
                                                ✅ Collection Details
                                            </p>
                                            <p className="text-white text-sm mt-1">
                                                Collect from{" "}
                                                <span className="text-green-300">
                                                    {c.assignedMaintainerName || "Maintainer Office"}
                                                </span>
                                            </p>
                                            <p className="text-white/80 text-sm">
                                                📍 {c.collectionPoint || "Central Office / Security Desk"}
                                            </p>
                                            <p className="text-white/60 text-xs mt-1">
                                                🕒 {c.officeHours || "10:00 AM – 4:00 PM"}
                                            </p>
                                        </div>
                                    )}

                                    {/* If rejected show reason */}
                                    {c.status === "rejected" && c.rejectedReason && (
                                        <div className="mt-4 rounded-xl border border-red-800/20 bg-red-900/10 p-4">
                                            <p className="text-red-300 text-xs font-semibold">
                                                ❌ Rejection Reason
                                            </p>
                                            <p className="text-white/80 text-sm mt-1">{c.rejectedReason}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="text-center text-white/40 text-xs mt-6">
                    Secure • Campus-only • Verified handover
                </div>
            </div>

            {/* Animations */}
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

        @media (max-width: 768px) {
          button {
            -webkit-tap-highlight-color: transparent;
            min-height: 44px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-pulse {
            animation: none !important;
          }
        }
      `}</style>
        </div>
    );
}
