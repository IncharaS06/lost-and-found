"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getDocs, limit, orderBy, query } from "firebase/firestore";
import { generateAdminPdfReport } from "@/app/lib/pdfReport";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

import { Shield, LogOut, Search, Filter } from "lucide-react";

type User = {
    uid: string;
    name: string;
    email: string;
    role: string;
    disabled?: boolean;
    disabledReason?: string;
    branch?: string;
    admissionYear?: number;
};

type Particle = { left: string; top: string; delay: string; duration: string };

function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // filters
    const [qText, setQText] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all"); // all | active | disabled

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

    // stable particles (no rerandom lag)
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
        let unsubUsers: null | (() => void) = null;

        const unsubAuth = onAuthStateChanged(auth, async (u) => {
            if (!u || !u.emailVerified) {
                router.replace("/auth");
                return;
            }

            const snap = await getDoc(doc(db, "users", u.uid));
            if (!snap.exists() || snap.data().role !== "admin") {
                router.replace("/dashboard");
                return;
            }

            unsubUsers = onSnapshot(
                collection(db, "users"),
                (snap2) => {
                    const arr = snap2.docs.map((d) => d.data()) as User[];
                    // optional: stable sort by role/name so table doesn't jump
                    arr.sort((a, b) => (a.role || "").localeCompare(b.role || "") || (a.name || "").localeCompare(b.name || ""));
                    setUsers(arr);
                    setLoading(false);
                },
                () => setLoading(false)
            );
        });

        return () => {
            unsubAuth();
            if (unsubUsers) unsubUsers();
        };
    }, [router]);

    const promoteToMaintainer = async (uid: string) => {
        if (!confirm("Promote this user to Maintainer?")) return;

        await updateDoc(doc(db, "users", uid), { role: "maintainer" });
        alert("User promoted to Maintainer");
    };

    const setDisabled = async (uid: string, disabled: boolean) => {
        const reason = disabled ? prompt("Reason to disable? (optional)") || "" : "";

        await updateDoc(doc(db, "users", uid), {
            disabled,
            disabledReason: disabled ? reason : "",
        });

        alert(disabled ? "User disabled" : "User enabled");
    };

    const downloadPdf = async () => {
        try {
            setLoading(true);

            const [lostSnap, foundSnap, claimsSnap, logsSnap] = await Promise.all([
                getDocs(query(collection(db, "lost_items"), orderBy("createdAt", "desc"), limit(500))),
                getDocs(query(collection(db, "found_items"), orderBy("createdAt", "desc"), limit(500))),
                getDocs(query(collection(db, "claims"), orderBy("createdAt", "desc"), limit(800))),
                getDocs(query(collection(db, "logs"), orderBy("createdAt", "desc"), limit(800))),
            ]);

            const lostItems = lostSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            const foundItems = foundSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            const claims = claimsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            const logs = logsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

            // you already have `users` in state
            generateAdminPdfReport({
                generatedBy: {
                    name: auth.currentUser?.displayName || "Admin",
                    email: auth.currentUser?.email || "",
                },
                users,
                lostItems,
                foundItems,
                claims,
                logs,
            });
        } catch (e: any) {
            console.error(e);
            alert(e?.message || "Failed to generate PDF.");
        } finally {
            setLoading(false);
        }
    };


    const roles = useMemo(() => {
        const set = new Set<string>();
        for (const u of users) if (u.role) set.add(u.role);
        return ["all", ...Array.from(set).sort()];
    }, [users]);

    const filtered = useMemo(() => {
        const t = qText.trim().toLowerCase();

        return users.filter((u) => {
            if (roleFilter !== "all" && (u.role || "") !== roleFilter) return false;
            if (statusFilter === "active" && u.disabled) return false;
            if (statusFilter === "disabled" && !u.disabled) return false;

            if (!t) return true;

            const hay = [u.name, u.email, u.role, u.branch, String(u.admissionYear || "")]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return hay.includes(t);
        });
    }, [users, qText, roleFilter, statusFilter]);

    if (loading) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-10">
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
                <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

                <div className="max-w-5xl mx-auto">
                    <div className="h-10 w-56 bg-white/10 rounded-xl animate-pulse" />
                    <div className="mt-4 h-12 w-full bg-white/10 rounded-2xl animate-pulse" />
                    <div className="mt-4 h-72 w-full bg-white/10 rounded-2xl animate-pulse" />
                    <p className="text-white/40 text-xs mt-6 text-center animate-pulse">
                        Loading admin panel…
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
                {/* Top Actions */}
                <div
                    className={cn(
                        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4",
                        "transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                    )}
                >
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => router.push("/admin/analytics")}
                            className="rounded-xl border border-green-700/50 bg-green-900/10 hover:bg-green-900/30 text-green-200 px-4 py-2 text-sm transition active:scale-[0.99]"
                        >
                            View Analytics
                        </button>

                        <button
                            onClick={downloadPdf}
                            className="rounded-xl border border-green-700/50 bg-green-900/10 hover:bg-green-900/30 text-green-200 px-4 py-2 text-sm transition active:scale-[0.99]"
                        >
                            Download Report (PDF)
                        </button>


                        <button
                            onClick={() => router.push("/admin/logs")}
                            className="rounded-xl border border-green-700/50 bg-green-900/10 hover:bg-green-900/30 text-green-200 px-4 py-2 text-sm transition active:scale-[0.99]"
                        >
                            View System Logs
                        </button>
                    </div>

                    <button
                        onClick={async () => {
                            await signOut(auth);
                            router.push("/auth");
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl border border-red-900/40 bg-red-900/10 hover:bg-red-900/20 text-white/80 hover:text-red-200 px-4 py-2 text-sm transition active:scale-[0.99]"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>

                {/* Header */}
                <header
                    className={cn(
                        "flex items-center justify-between mb-4",
                        "transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    )}
                    style={{ transitionDelay: "80ms" }}
                >
                    <div className="flex items-center gap-2 text-white">
                        <Shield className="h-5 w-5 text-green-400" />
                        <h1 className="font-semibold">Admin Panel</h1>
                    </div>

                    <span className="text-xs text-white/50">
                        Showing <span className="text-green-300">{filtered.length}</span> /{" "}
                        <span className="text-green-300">{users.length}</span>
                    </span>
                </header>

                {/* Filters */}
                <div
                    className={cn(
                        "rounded-2xl border border-green-800/30 bg-black/40 p-4",
                        "transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                    )}
                    style={{ transitionDelay: "140ms" }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                            <label className="text-white/60 text-xs flex items-center gap-2">
                                <Search className="h-3.5 w-3.5 text-green-400" />
                                Search
                            </label>
                            <input
                                value={qText}
                                onChange={(e) => setQText(e.target.value)}
                                placeholder="name, email, role, branch…"
                                className="mt-1 w-full rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 text-white text-sm outline-none focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>

                        <div>
                            <label className="text-white/60 text-xs flex items-center gap-2">
                                <Filter className="h-3.5 w-3.5 text-green-400" />
                                Role
                            </label>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 text-white text-sm outline-none focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20"
                            >
                                {roles.map((r) => (
                                    <option key={r} value={r}>
                                        {r === "all" ? "All roles" : r.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-white/60 text-xs">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 text-white text-sm outline-none focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20"
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="disabled">Disabled</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                        <button
                            onClick={() => {
                                setQText("");
                                setRoleFilter("all");
                                setStatusFilter("all");
                            }}
                            className="text-xs text-white/60 hover:text-green-300 transition"
                        >
                            Clear filters
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                <div
                    className={cn(
                        "mt-4 overflow-x-auto rounded-2xl border border-green-800/30 bg-black/30",
                        "transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                    )}
                    style={{ transitionDelay: "220ms" }}
                >
                    <table className="w-full">
                        <thead className="bg-black/60">
                            <tr className="text-white/70 text-xs">
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Email</th>
                                <th className="p-3 text-left">Role</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filtered.map((u, idx) => (
                                <tr
                                    key={u.uid}
                                    className={cn(
                                        "border-t border-green-900/30 text-sm text-white",
                                        "animate-fadeInUp"
                                    )}
                                    style={{ animationDelay: `${idx * 35}ms` }}
                                >
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span>{u.name || "-"}</span>
                                            {!!u.branch && (
                                                <span className="text-[11px] text-white/40">
                                                    {u.branch.toUpperCase()} {u.admissionYear ? `• ${u.admissionYear}` : ""}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-3 text-white/70">{u.email}</td>

                                    <td className="p-3">
                                        <span className="px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-300">
                                            {u.role?.toUpperCase?.() || "USER"}
                                        </span>
                                    </td>

                                    <td className="p-3">
                                        {u.disabled ? (
                                            <div className="flex flex-col">
                                                <span className="w-fit px-2 py-1 rounded-full text-xs bg-red-900/30 text-red-300">
                                                    DISABLED
                                                </span>
                                                {u.disabledReason ? (
                                                    <span className="text-[11px] text-white/40 mt-1 max-w-[260px] truncate">
                                                        {u.disabledReason}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span className="px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-300">
                                                ACTIVE
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-3">
                                        {u.role !== "admin" ? (
                                            <div className="flex flex-wrap gap-2">
                                                {(u.role === "student" || u.role === "teacher") && (
                                                    <button
                                                        onClick={() => promoteToMaintainer(u.uid)}
                                                        className="text-xs px-3 py-1 rounded-lg border border-green-700/40 bg-green-900/10 text-green-200 hover:bg-green-900/30 transition active:scale-[0.99]"
                                                    >
                                                        Promote → Maintainer
                                                    </button>
                                                )}

                                                {u.disabled ? (
                                                    <button
                                                        onClick={() => setDisabled(u.uid, false)}
                                                        className="text-xs px-3 py-1 rounded-lg bg-green-900/30 text-green-300 hover:bg-green-900/50 transition active:scale-[0.99]"
                                                    >
                                                        Enable
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setDisabled(u.uid, true)}
                                                        className="text-xs px-3 py-1 rounded-lg bg-red-900/30 text-red-300 hover:bg-red-900/50 transition active:scale-[0.99]"
                                                    >
                                                        Disable
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-white/40 text-xs">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filtered.length === 0 && (
                        <p className="text-center text-white/50 text-sm py-10">
                            No users found
                        </p>
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
            font-size: 16px !important; /* iOS zoom prevention */
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
