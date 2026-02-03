"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

import { ArrowLeft, ShieldCheck, MapPin, Sparkles, AlertTriangle } from "lucide-react";

// ✅ ADD THIS IMPORT
import { notifyClaimCreated } from "@/app/lib/notifyApi";

type AnyItem = {
    id: string;
    title?: string;
    category?: string;

    // lost
    lastSeenLocation?: string;

    // found
    foundLocation?: string;

    status?: string;

    // ✅ images (support all formats)
    imageData?: string | null;     // old: data:image/...;base64,...
    imageBase64?: string | null;   // new: PURE base64
    imageMime?: string | null;     // new: image/webp
    imageUrl?: string | null;      // legacy URL

    // ✅ assigner fields
    assignedMaintainerUid?: string;
    assignedMaintainerName?: string;
    collectionPoint?: string;
    officeHours?: string;
};

type Particle = { left: string; top: string; delay: string; duration: string };

function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

function getLocation(item: AnyItem) {
    return item.lastSeenLocation || item.foundLocation || "";
}

function getItemImageSrc(item: AnyItem): string | null {
    // 1) old base64 data URL
    if (item.imageData && String(item.imageData).startsWith("data:")) {
        return item.imageData;
    }

    // 2) new pure base64 + mime
    if (item.imageBase64 && item.imageBase64.length > 0) {
        const mime = item.imageMime || "image/webp";
        return `data:${mime};base64,${item.imageBase64}`;
    }

    // 3) legacy URL
    if (item.imageUrl && item.imageUrl.length > 0) {
        return item.imageUrl;
    }

    return null;
}

export default function ClaimPage() {
    const router = useRouter();
    const sp = useSearchParams();

    // expected params:
    // ?type=lost|found&id=<docId>
    const type = (sp.get("type") || "lost").toLowerCase();
    const id = sp.get("id") || "";

    const [loading, setLoading] = useState(true);
    const [uid, setUid] = useState<string | null>(null);

    const [item, setItem] = useState<AnyItem | null>(null);
    const [err, setErr] = useState("");

    const [proofText, setProofText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const colName = useMemo(() => (type === "found" ? "found_items" : "lost_items"), [type]);

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

    // stable particles
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
            setUid(u.uid);

            if (!id) {
                setErr("Missing item id.");
                setLoading(false);
                return;
            }

            try {
                const ref = doc(db, colName, id);
                const snap = await getDoc(ref);

                if (!snap.exists()) {
                    setErr("Item not found.");
                    setItem(null);
                } else {
                    setItem({ id: snap.id, ...(snap.data() as any) });
                }
            } catch (e: any) {
                console.error(e);
                setErr(e?.message || "Failed to load item.");
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [router, id, colName]);

    const submitClaim = async () => {
        if (submitting) return;
        if (!uid) return;
        if (!item) return;

        const p = proofText.trim();
        if (!p) {
            alert("Please enter proof details.");
            return;
        }

        setSubmitting(true);
        try {
            const assignedMaintainerUid = item.assignedMaintainerUid || "CENTRAL";
            const assignedMaintainerName = item.assignedMaintainerName || "Central Lost & Found";
            const collectionPoint = item.collectionPoint || "Central Office / Security Desk";
            const officeHours = item.officeHours || "10:00 AM – 4:00 PM";

            const ref = await addDoc(collection(db, "claims"), {
                // link item
                itemType: type === "found" ? "found" : "lost",
                itemId: item.id,
                itemTitle: item.title || "",
                category: item.category || "Other",
                location: getLocation(item),

                // claimant
                claimantUid: uid,
                claimantEmail: auth.currentUser?.email || "",
                proofText: p,

                status: "pending",
                createdAt: serverTimestamp(),

                // ✅ copy assigner info to the claim (so maintainer can filter)
                assignedMaintainerUid,
                assignedMaintainerName,
                collectionPoint,
                officeHours,
            });

            // 🔔 notify maintainer (safe even if backend is not hosted yet)
            await notifyClaimCreated(ref.id);

            alert("Claim submitted. Maintainer will verify your proof.");
            router.push("/dashboard/my-claims");
        } catch (e: any) {
            console.error(e);
            alert(e?.message || "Failed to submit claim.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-8">
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
                <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />
                <div className="max-w-xl mx-auto">
                    <div className="h-6 w-24 rounded bg-white/10 animate-pulse" />
                    <div className="mt-4 rounded-2xl border border-green-800/30 bg-black/40 p-5">
                        <div className="h-6 w-2/3 rounded bg-white/10 animate-pulse" />
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="h-20 rounded-xl bg-white/10 animate-pulse" />
                            <div className="h-20 rounded-xl bg-white/10 animate-pulse" />
                        </div>
                        <div className="mt-4 h-20 rounded-xl bg-white/10 animate-pulse" />
                        <div className="mt-4 h-28 rounded-xl bg-white/10 animate-pulse" />
                        <div className="mt-4 h-11 rounded-xl bg-white/10 animate-pulse" />
                    </div>
                    <p className="text-white/40 text-xs mt-6 text-center animate-pulse">Loading…</p>
                </div>
            </div>
        );
    }

    if (err) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-red-950/20 px-4 py-6">
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-red-500/10 blur-3xl animate-pulse" />
                <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-red-500/10 blur-3xl animate-pulse [animation-delay:900ms]" />
                <div className="max-w-xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-white/70 hover:text-white transition active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>

                    <div className="mt-6 rounded-2xl border border-red-800/30 bg-red-950/20 p-5">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-300" />
                            <p className="text-red-300 text-sm font-semibold">Error</p>
                        </div>
                        <p className="text-white/70 text-sm mt-2">{err}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!item) return null;

    // assigned office defaults
    const assignedMaintainerName = item.assignedMaintainerName || "Central Lost & Found";
    const collectionPoint = item.collectionPoint || "Central Office / Security Desk";
    const officeHours = item.officeHours || "10:00 AM – 4:00 PM";

    const proofLen = proofText.trim().length;
    const minProof = 12;
    const proofOk = proofLen >= minProof;

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

            <div className="max-w-xl mx-auto relative">
                <div
                    className={cn(
                        "flex items-center justify-between mb-5 transition-all duration-700 ease-out",
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
                        <p className="text-white/80 text-sm font-medium">Claim Item</p>
                    </div>
                </div>

                <div
                    className={cn(
                        "rounded-2xl border border-green-800/30 bg-black/40 p-5 shadow-xl shadow-green-900/10",
                        "transition-all duration-700 ease-out",
                        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                    )}
                    style={{ transitionDelay: "120ms" }}
                >
                    <p className="text-white text-lg font-semibold">{item.title || "Item"}</p>

                    {/* ✅ Item Photo */}
                    {(() => {
                        const src = getItemImageSrc(item);
                        if (!src) return null;
                        return (
                            <div className="mt-3 rounded-xl overflow-hidden border border-green-800/20 bg-black/30">
                                <img src={src} alt={item.title || "Item"} className="h-48 w-full object-cover" />
                            </div>
                        );
                    })()}

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-green-800/20 bg-black/40 p-3">
                            <p className="text-white/50 text-xs">Category</p>
                            <p className="text-white">{item.category || "Other"}</p>
                        </div>

                        <div className="rounded-xl border border-green-800/20 bg-black/40 p-3">
                            <p className="text-white/50 text-xs flex items-center gap-1">
                                <MapPin className="h-4 w-4 text-green-400" />
                                Location
                            </p>
                            <p className="text-white">{getLocation(item) || "-"}</p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-green-800/20 bg-green-900/10 p-3">
                        <p className="text-green-300 text-xs font-semibold">Assigned Office</p>
                        <p className="text-white text-sm mt-1">{assignedMaintainerName}</p>
                        <p className="text-white/80 text-sm">📍 {collectionPoint}</p>
                        <p className="text-white/60 text-xs mt-1">🕒 {officeHours}</p>
                    </div>

                    <div className="mt-4">
                        <label className="text-white/70 text-xs flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-green-400" />
                            Proof Details (hidden verification)
                        </label>

                        <textarea
                            value={proofText}
                            onChange={(e) => setProofText(e.target.value)}
                            className={cn(
                                "mt-2 w-full rounded-xl border bg-black/40 px-3 py-3 text-white text-sm outline-none min-h-[120px] transition",
                                "border-green-800/30 focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20"
                            )}
                            placeholder="Describe unique marks / last 4 digits / sticker / scratch, etc."
                        />

                        <div className="mt-1 flex items-center justify-between">
                            <p className="text-white/50 text-xs">Provide details only the real owner would know.</p>
                            <p className={cn("text-xs", proofOk ? "text-green-300/80" : "text-white/40")}>
                                {proofLen}/{minProof}+
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={submitClaim}
                        disabled={submitting || !proofOk}
                        className={cn(
                            "mt-4 w-full rounded-xl py-3 font-semibold transition active:scale-[0.99]",
                            submitting || !proofOk
                                ? "bg-green-900/40 text-white/40 cursor-not-allowed"
                                : "bg-green-500 hover:bg-green-400 text-black"
                        )}
                    >
                        {submitting ? "Submitting..." : "Submit Claim"}
                    </button>
                </div>

                <div className="text-center text-white/40 text-xs mt-5">Campus-only • Secure verification</div>
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
          textarea {
            font-size: 16px !important;
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
