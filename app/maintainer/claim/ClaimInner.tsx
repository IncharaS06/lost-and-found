"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin,
  Clock3,
  User,
  MessageSquare,
  AlertTriangle,
  Package,
} from "lucide-react";

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

type Claim = {
  itemType?: "lost" | "found";
  itemId?: string;

  itemTitle?: string;
  category?: string;
  location?: string;

  proofText?: string;
  claimantEmail?: string;

  status?: "pending" | "approved" | "rejected";
  createdAt?: any;

  assignedMaintainerName?: string;
  collectionPoint?: string;
  officeHours?: string;

  rejectedReason?: string;
};

type AnyItem = {
  title?: string;
  category?: string;

  secretProof?: string; // lost-only secret
  imageData?: string;

  lastSeenLocation?: string;
  foundLocation?: string;
};

export default function ClaimInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const claimId = sp.get("id") || "";

  const [claim, setClaim] = useState<Claim | null>(null);
  const [item, setItem] = useState<AnyItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.emailVerified) {
        router.replace("/auth");
        return;
      }

      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (!userSnap.exists() || userSnap.data().role !== "maintainer") {
        router.replace("/dashboard");
        return;
      }

      if (!claimId) {
        router.replace("/maintainer");
        return;
      }

      const claimSnap = await getDoc(doc(db, "claims", claimId));
      if (!claimSnap.exists()) {
        router.replace("/maintainer");
        return;
      }

      const c = claimSnap.data() as Claim;
      setClaim(c);

      const col = c.itemType === "lost" ? "lost_items" : "found_items";
      if (c.itemId) {
        const itemSnap = await getDoc(doc(db, col, c.itemId));
        if (itemSnap.exists()) setItem(itemSnap.data() as AnyItem);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router, claimId]);

  const title = useMemo(() => claim?.itemTitle || item?.title || "Item", [claim, item]);
  const category = useMemo(() => claim?.category || item?.category || "Other", [claim, item]);

  const location = useMemo(() => {
    return claim?.location || item?.lastSeenLocation || item?.foundLocation || "—";
  }, [claim, item]);

  const statusPill = useMemo(() => {
    const s = claim?.status || "pending";
    if (s === "approved") return "bg-green-900/30 border-green-700/30 text-green-300";
    if (s === "rejected") return "bg-red-900/30 border-red-700/30 text-red-300";
    return "bg-yellow-900/30 border-yellow-700/30 text-yellow-200";
  }, [claim]);

  const updateStatus = async (status: "approved" | "rejected") => {
    if (!claimId || !claim?.itemType || !claim?.itemId) return;
    if (busy) return;

    if (status === "rejected") {
      const rr = rejectReason.trim();
      if (!rr) {
        alert("Please enter a rejection reason.");
        return;
      }
    }

    setBusy(status);
    try {
      await updateDoc(doc(db, "claims", claimId), {
        status,
        reviewedAt: serverTimestamp(),
        rejectedReason: status === "rejected" ? rejectReason.trim() : "",
      });

      if (status === "approved") {
        const col = claim.itemType === "lost" ? "lost_items" : "found_items";
        await updateDoc(doc(db, col, claim.itemId), {
          status: "returned",
          returnedAt: serverTimestamp(),
        });
      }

      alert(`Claim ${status}`);
      router.push("/maintainer");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to update claim.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-green-400 text-sm">Loading claim…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-6">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

      <div
        className={cn(
          "max-w-xl mx-auto transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
      >
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.push("/maintainer")}
            className="inline-flex items-center gap-2 text-white/70 hover:text-green-300 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 text-white/70">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            <span className="text-xs">Verify Claim</span>
          </div>
        </div>

        <div className="rounded-2xl border border-green-800/25 bg-black/40 p-5 shadow-xl shadow-green-900/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white text-lg font-semibold">{title}</p>
              <p className="text-white/60 text-xs mt-1">
                {claim?.itemType?.toUpperCase() || "—"} • {category}
              </p>
            </div>

            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", statusPill)}>
              <Sparkles className="h-3.5 w-3.5" />
              {(claim?.status || "pending").toUpperCase()}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-green-800/20 bg-black/35 p-3">
              <p className="text-white/50 text-xs flex items-center gap-1">
                <MapPin className="h-4 w-4 text-green-400" />
                Location
              </p>
              <p className="text-white text-sm mt-1">{location}</p>
            </div>

            <div className="rounded-xl border border-green-800/20 bg-black/35 p-3">
              <p className="text-white/50 text-xs flex items-center gap-1">
                <Clock3 className="h-4 w-4 text-green-400" />
                Office Hours
              </p>
              <p className="text-white text-sm mt-1">{claim?.officeHours || "10:00 AM – 4:00 PM"}</p>
            </div>
          </div>

          {(claim?.assignedMaintainerName || claim?.collectionPoint) && (
            <div className="mt-3 rounded-xl border border-green-800/20 bg-green-900/10 p-3">
              <p className="text-green-200 text-xs font-semibold">Collection Point</p>
              <p className="text-white text-sm mt-1">{claim?.assignedMaintainerName || "Maintainer Office"}</p>
              <p className="text-white/80 text-sm">📍 {claim?.collectionPoint || "Central Office / Security Desk"}</p>
            </div>
          )}
        </div>

        {item?.imageData && (
          <div className="mt-4 rounded-2xl border border-green-800/25 bg-black/40 p-4 overflow-hidden">
            <p className="text-white/70 text-xs mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-green-400" />
              Item photo
            </p>
            <img
              src={item.imageData}
              alt={title}
              className="w-full h-auto max-h-[260px] object-cover rounded-xl border border-green-800/20"
            />
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-green-800/25 bg-black/40 p-5">
            <p className="text-white/80 font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              Item Secret Proof
            </p>
            <p className="text-white/60 text-sm mt-2 whitespace-pre-wrap">{item?.secretProof || "—"}</p>
            <p className="text-white/40 text-xs mt-2">(Hidden field saved while reporting the item)</p>
          </div>

          <div className="rounded-2xl border border-green-800/25 bg-black/40 p-5">
            <p className="text-white/80 font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-400" />
              Claimant Proof
            </p>
            <p className="text-white/60 text-sm mt-2 whitespace-pre-wrap">{claim?.proofText || "—"}</p>

            <div className="mt-3 rounded-xl border border-green-800/20 bg-black/35 p-3">
              <p className="text-white/50 text-xs flex items-center gap-2">
                <User className="h-4 w-4 text-green-400" />
                Claimant
              </p>
              <p className="text-white text-sm mt-1">{claim?.claimantEmail || "—"}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-green-800/25 bg-black/40 p-5">
          <p className="text-white/80 font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-green-400" />
            Decision Notes
          </p>

          <div className="mt-3">
            <label className="text-white/60 text-xs">Rejection reason (required only if rejecting)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g., proof mismatch / incorrect details / item not yours…"
              className="mt-2 w-full rounded-xl border border-green-800/25 bg-black/35 px-3 py-3 text-white text-sm outline-none min-h-[90px] placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => updateStatus("approved")}
            disabled={!!busy}
            className={cn(
              "rounded-2xl bg-green-600 hover:bg-green-500 text-black font-semibold py-3 flex items-center justify-center gap-2 transition active:scale-[0.99]",
              busy ? "opacity-60" : ""
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy === "approved" ? "Approving..." : "Approve"}
          </button>

          <button
            onClick={() => updateStatus("rejected")}
            disabled={!!busy}
            className={cn(
              "rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold py-3 flex items-center justify-center gap-2 transition active:scale-[0.99]",
              busy ? "opacity-60" : ""
            )}
          >
            <XCircle className="h-4 w-4" />
            {busy === "rejected" ? "Rejecting..." : "Reject"}
          </button>
        </div>

        <p className="text-center text-white/40 text-xs mt-5">Tip: Approve only if proof matches clearly.</p>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          button,
          [role="button"] {
            -webkit-tap-highlight-color: transparent;
            min-height: 44px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
