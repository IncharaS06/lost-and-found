"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    getDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    limit,
    Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

type Log = {
    id: string;
    action?: string;
    actorUid?: string;
    targetUid?: string;
    message?: string;
    createdAt?: any; // Timestamp | string | null
};

type Particle = { left: string; top: string; delay: string; duration: string };

function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

function fmtDate(v: any) {
    try {
        if (!v) return "—";
        if (v instanceof Timestamp) return v.toDate().toLocaleString();
        if (v?.toDate) return v.toDate().toLocaleString();
        if (typeof v === "string") return new Date(v).toLocaleString();
        return "—";
    } catch {
        return "—";
    }
}

export default function AdminLogsPage() {
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // UI controls
    const [qText, setQText] = useState("");
    const [actionFilter, setActionFilter] = useState("all");

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

    // stable particles (no rerandom on state changes)
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
        setLoading(true);
        setErr("");

        let unsubLogs: null | (() => void) = null;

        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            try {
                if (!u || !u.emailVerified) {
                    router.replace("/auth");
                    return;
                }

                // ✅ Admin guard
                const userSnap = await getDoc(doc(db, "users", u.uid));
                const role = (userSnap.exists() ? userSnap.data()?.role : "") as string;

                if (!role || String(role).toLowerCase() !== "admin") {
                    router.replace("/dashboard");
                    return;
                }

                // ✅ CHOOSE ONE PATH (IMPORTANT)
                // If your logs are saved in root collection:
                const logsRef = collection(db, "logs");

                // If your logs are saved as /admin/logs subcollection, use this instead:
                // const logsRef = collection(db, "admin", "logs");

                const qLogs = query(
                    logsRef,
                    orderBy("createdAt", "desc"),
                    limit(300) // keeps UI fast
                );

                unsubLogs = onSnapshot(
                    qLogs,
                    (snap2) => {
                        const arr = snap2.docs.map((d) => {
                            const data = d.data() as any;
                            return {
                                id: d.id,
                                ...data,
                            } as Log;
                        });

                        // ✅ Debug: see what you’re actually receiving
                        console.log(
                            "[logs] fetched:",
                            arr.length,
                            arr.slice(0, 3).map((x) => ({
                                id: x.id,
                                action: x.action,
                                createdAt: x.createdAt,
                                message: x.message,
                            }))
                        );

                        setLogs(arr);
                        setLoading(false);
                    },
                    (error) => {
                        console.error("[logs] snapshot error:", error);
                        setErr(error?.message || "Failed to load logs.");
                        setLoading(false);
                    }
                );
            } catch (e: any) {
                console.error(e);
                setErr(e?.message || "Failed to load logs.");
                setLoading(false);
            }
        });

        return () => {
            unsubAuth();
            if (unsubLogs) unsubLogs();
        };
    }, [router]);

    const actions = useMemo(() => {
        const set = new Set<string>();
        for (const l of logs) if (l.action) set.add(l.action);
        return ["all", ...Array.from(set).sort()];
    }, [logs]);

    const filtered = useMemo(() => {
        const t = qText.trim().toLowerCase();
        return logs.filter((l) => {
            const action = l.action || "";
            if (actionFilter !== "all" && action !== actionFilter) return false;
            if (!t) return true;

            const hay = [
                action,
                l.message || "",
                l.actorUid || "",
                l.targetUid || "",
                fmtDate(l.createdAt),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return hay.includes(t);
        });
    }, [logs, qText, actionFilter]);

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // ignore
        }
    };

    if (loading) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-8">
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
                <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-5">
                        <div className="h-6 w-20 rounded bg-white/10 animate-pulse" />
                        <div className="h-6 w-36 rounded bg-white/10 animate-pulse" />
                    </div>

                    <div className="rounded-2xl border border-green-800/30 bg-black/40 p-4">
                        <div className="h-10 w-full rounded bg-white/10 animate-pulse" />
                    </div>

                    <div className="space-y-3 mt-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-xl border border-green-800/30 bg-black/40 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="h-6 w-28 rounded-full bg-white/10 animate-pulse" />
                                    <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
                                </div>
                                <div className="mt-3 h-4 w-4/5 rounded bg-white/10 animate-pulse" />
                                <div className="mt-2 h-3 w-3/5 rounded bg-white/10 animate-pulse" />
                            </div>
                        ))}
                    </div>

                    <p className="text-white/40 text-xs mt-6 text-center animate-pulse">
                        Loading system logs…
                    </p>
                </div>
            </div>
        );
    }

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

            <div className="max-w-5xl mx-auto relative">
                {/* Top bar */}
                <div
                    className={cn(
                        "flex items-center justify-between mb-5 transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                    )}
                >
                    <button
                        onClick={() => router.push("/admin")}
                        className="text-white/70 hover:text-green-300 text-sm transition active:scale-95"
                    >
                        ← Back
                    </button>

                    <h1 className="text-white font-semibold">System Logs</h1>
                </div>

                {err && (
                    <div className="mb-4 rounded-xl border border-red-800/30 bg-red-900/10 p-3 text-red-200 text-sm">
                        {err}
                    </div>
                )}

                {/* Controls */}
                <div
                    className={cn(
                        "rounded-2xl border border-green-800/30 bg-black/40 p-4",
                        "transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                    )}
                    style={{ transitionDelay: "120ms" }}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="text-white/60 text-xs">Search</label>
                            <input
                                value={qText}
                                onChange={(e) => setQText(e.target.value)}
                                placeholder="Search action, message, actor UID, target UID…"
                                className="mt-1 w-full rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 text-white text-sm outline-none focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>

                        <div>
                            <label className="text-white/60 text-xs">Action</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 text-white text-sm outline-none focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20"
                            >
                                {actions.map((a) => (
                                    <option key={a} value={a}>
                                        {a === "all" ? "All actions" : a}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                        <span>
                            Showing <span className="text-green-300">{filtered.length}</span> of{" "}
                            <span className="text-green-300">{logs.length}</span>
                        </span>
                        <button
                            onClick={() => {
                                setQText("");
                                setActionFilter("all");
                            }}
                            className="text-white/60 hover:text-green-300 transition"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Logs */}
                <div className="space-y-3 mt-4">
                    {filtered.map((l, idx) => (
                        <div
                            key={l.id}
                            className={cn(
                                "rounded-xl border border-green-800/30 bg-black/40 p-4",
                                "transition-all duration-300 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-0.5",
                                "animate-fadeInUp"
                            )}
                            style={{ animationDelay: `${idx * 40}ms` }}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-300">
                                    {l.action || "unknown"}
                                </span>
                                <span className="text-white/40 text-xs">{fmtDate(l.createdAt)}</span>
                            </div>

                            {l.message && <p className="mt-2 text-white text-sm leading-relaxed">{l.message}</p>}

                            <div className="mt-2 text-xs text-white/50 space-y-1">
                                {l.actorUid && (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate">Actor UID: {l.actorUid}</p>
                                        <button
                                            onClick={() => copy(l.actorUid!)}
                                            className="text-green-300/80 hover:text-green-200 transition"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                )}
                                {l.targetUid && (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate">Target UID: {l.targetUid}</p>
                                        <button
                                            onClick={() => copy(l.targetUid!)}
                                            className="text-green-300/80 hover:text-green-200 transition"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <p className="text-center text-white/50 text-sm mt-10">No logs found</p>
                    )}
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

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 520ms ease-out both;
        }

        @media (max-width: 768px) {
          button {
            -webkit-tap-highlight-color: transparent;
            min-height: 44px;
          }
          input,
          select {
            font-size: 16px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-pulse,
          .animate-fadeInUp {
            animation: none !important;
          }
        }
      `}</style>
        </div>
    );
}
