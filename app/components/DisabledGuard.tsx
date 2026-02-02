"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

import { ShieldAlert, LogOut, Info } from "lucide-react";

function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

export default function DisabledGuard() {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<string>("Not specified");
    const [count, setCount] = useState(5);
    const [busy, setBusy] = useState(false);

    const firedRef = useRef(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) return;
            if (firedRef.current) return;

            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                const data = snap.exists() ? (snap.data() as any) : null;

                if (data?.disabled === true) {
                    firedRef.current = true;
                    setReason((data?.disabledReason || "Not specified") as string);
                    setOpen(true);

                    // countdown
                    let t = 5;
                    setCount(t);

                    const iv = setInterval(() => {
                        t -= 1;
                        setCount(Math.max(0, t));
                        if (t <= 0) clearInterval(iv);
                    }, 1000);

                    // auto sign out after 5 sec
                    setTimeout(async () => {
                        try {
                            setBusy(true);
                            await signOut(auth);
                        } catch {
                            // ignore
                        } finally {
                            setBusy(false);
                            router.replace("/auth");
                        }
                    }, 5000);
                }
            } catch {
                // ignore
            }
        });

        return () => unsub();
    }, [router]);

    const handleExitNow = async () => {
        if (busy) return;
        try {
            setBusy(true);
            await signOut(auth);
        } catch {
            // ignore
        } finally {
            setBusy(false);
            router.replace("/auth");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" />

            {/* Ambient blobs */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-red-500/10 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-green-500/10 blur-3xl animate-pulse [animation-delay:900ms]" />

            {/* Modal */}
            <div className="absolute inset-0 flex items-center justify-center px-4">
                <div
                    className={cn(
                        "w-full max-w-md rounded-2xl border border-red-800/30",
                        "bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl",
                        "p-5 sm:p-7 shadow-2xl shadow-red-900/10",
                        "animate-fadeInUp"
                    )}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-900/25 border border-red-800/30 flex items-center justify-center">
                                <ShieldAlert className="h-5 w-5 text-red-300" />
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-lg">Access Disabled</h2>
                                <p className="text-white/55 text-xs mt-0.5">
                                    Your account is temporarily restricted.
                                </p>
                            </div>
                        </div>

                        <div className="text-white/40 text-xs">
                            Redirecting in <span className="text-red-300 font-semibold">{count}s</span>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="mt-4 rounded-xl border border-red-800/20 bg-black/30 p-4">
                        <p className="text-white/70 text-sm font-medium">Reason</p>
                        <p className="text-white/60 text-sm mt-1 leading-relaxed">{reason}</p>
                    </div>

                    {/* Hint */}
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-green-800/20 bg-green-900/10 p-4">
                        <Info className="h-4 w-4 text-green-300 mt-0.5" />
                        <p className="text-green-100/70 text-xs leading-relaxed">
                            If you think this is a mistake, contact the Admin/Maintainer for re-enable.
                            After sign out, you can try logging in again once enabled.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={handleExitNow}
                            disabled={busy}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 font-medium transition active:scale-[0.99] disabled:opacity-60"
                        >
                            <LogOut className="h-4 w-4" />
                            {busy ? "Signing out…" : "Sign out now"}
                        </button>
                    </div>

                    <p className="mt-4 text-center text-[11px] text-white/40">
                        Security notice: disabled accounts are automatically logged out.
                    </p>
                </div>
            </div>

            {/* Animations */}
            <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 200ms ease-out both; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 420ms ease-out both; }

        @media (max-width: 768px) {
          button { -webkit-tap-highlight-color: transparent; min-height: 44px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn,
          .animate-fadeInUp,
          .animate-pulse {
            animation: none !important;
          }
        }
      `}</style>
        </div>
    );
}
