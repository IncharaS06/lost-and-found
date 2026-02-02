"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

import {
  CheckCircle2,
  XCircle,
  Clock3,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  User,
  Mail,
  MapPin,
  CalendarDays,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

// ✅ ADD THIS IMPORT
import { notifyClaimStatus } from "@/app/lib/notifyApi";

type UserProfile = {
  name?: string;
  email?: string;
  role?: string;
};

type ClaimRow = {
  id: string;

  itemType?: "lost" | "found";
  itemId?: string;
  itemTitle?: string;
  category?: string;
  location?: string;

  claimantUid?: string;
  claimantEmail?: string;
  proofText?: string;

  status?: "pending" | "approved" | "rejected";

  // assigner fields
  assignedMaintainerUid?: string;
  assignedMaintainerName?: string;
  collectionPoint?: string;
  officeHours?: string;

  rejectedReason?: string;

  createdAt?: any;

  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: any;
};

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function fmtDate(v: any) {
  try {
    if (!v) return "—";
    if (v?.toDate) return v.toDate().toLocaleString();
    if (typeof v === "string") return new Date(v).toLocaleString();
    return "—";
  } catch {
    return "—";
  }
}

function StatusPill({ status }: { status?: ClaimRow["status"] }) {
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

export default function MaintainerPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [me, setMe] = useState<UserProfile | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [err, setErr] = useState("");

  // UI filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "pending"
  );

  // Actions
  const [busyId, setBusyId] = useState<string | null>(null);

  const role = useMemo(() => (me?.role || "").toLowerCase(), [me]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  async function loadClaims(userUid: string, userRole: string) {
    setErr("");

    const base = collection(db, "claims");

    // admin sees all, maintainer sees assigned only
    const qy =
      userRole === "admin"
        ? query(base, orderBy("createdAt", "desc"))
        : query(
            base,
            where("assignedMaintainerUid", "==", userUid),
            orderBy("createdAt", "desc")
          );

    const snap = await getDocs(qy);
    const data: ClaimRow[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    setRows(data);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }

      setUid(u.uid);

      try {
        const profSnap = await getDoc(doc(db, "users", u.uid));
        const prof = (profSnap.exists() ? (profSnap.data() as UserProfile) : {}) as UserProfile;

        const r = (prof.role || "").toLowerCase();
        if (r !== "maintainer" && r !== "admin") {
          router.push("/dashboard");
          return;
        }

        setMe(prof);

        await loadClaims(u.uid, r);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const filteredRows = useMemo(() => {
    const s = search.trim().toLowerCase();

    return rows.filter((c) => {
      const matchStatus = statusFilter === "all" ? true : c.status === statusFilter;

      const blob = `${c.itemTitle || ""} ${c.category || ""} ${c.location || ""} ${
        c.claimantEmail || ""
      } ${c.itemType || ""}`.toLowerCase();

      const matchSearch = !s || blob.includes(s);

      return matchStatus && matchSearch;
    });
  }, [rows, search, statusFilter]);

  const pendingCount = useMemo(
    () => rows.filter((r) => (r.status || "pending") === "pending").length,
    [rows]
  );

  const approveClaim = async (c: ClaimRow) => {
    if (!uid) return;
    if (!c.itemId || !c.itemType) return alert("Invalid claim: missing item link.");
    if (busyId) return;

    try {
      setBusyId(c.id);

      // update claim
      await updateDoc(doc(db, "claims", c.id), {
        status: "approved",
        rejectedReason: "",
        verifiedByUid: uid,
        verifiedByName: me?.name || "",
        verifiedAt: serverTimestamp(),
      });

      // update the item as ready for pickup
      const col = c.itemType === "found" ? "found_items" : "lost_items";
      await updateDoc(doc(db, col, c.itemId), {
        status: "ready_for_pickup",
        lastActionAt: serverTimestamp(),
      });

      // 🔔 notify student (safe even if backend not hosted yet)
      await notifyClaimStatus(c.id);

      alert("Approved ✅ Student can collect the item.");

      // reload
      await loadClaims(uid, role);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Approval failed.");
    } finally {
      setBusyId(null);
    }
  };

  const rejectClaim = async (c: ClaimRow) => {
    if (!uid) return;
    if (busyId) return;

    const reason = prompt("Rejection reason (required):") || "";
    if (!reason.trim()) return alert("Rejection reason is required.");

    try {
      setBusyId(c.id);

      await updateDoc(doc(db, "claims", c.id), {
        status: "rejected",
        rejectedReason: reason.trim(),
        verifiedByUid: uid,
        verifiedByName: me?.name || "",
        verifiedAt: serverTimestamp(),
      });

      // 🔔 notify student (safe even if backend not hosted yet)
      await notifyClaimStatus(c.id);

      alert("Rejected ❌");

      await loadClaims(uid, role);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Rejection failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-green-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-6">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

      <div
        className={cn(
          "max-w-3xl mx-auto transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-right">
            <p className="text-white/80 text-sm font-medium flex items-center justify-end gap-2">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              Maintainer Panel
            </p>
            <p className="text-white/40 text-xs">
              {me?.name || "Maintainer"} • {role.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Header stats + actions */}
        <div className="rounded-2xl border border-green-800/25 bg-black/40 p-5 shadow-xl shadow-green-900/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-white font-semibold text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-green-400" />
                Claims Overview
              </p>
              <p className="text-white/50 text-sm mt-1">
                Pending claims: <span className="text-green-300 font-semibold">{pendingCount}</span>
              </p>
            </div>

            <button
              onClick={async () => {
                if (!uid) return;
                try {
                  setLoading(true);
                  await loadClaims(uid, role);
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-700/40 bg-green-900/10 hover:bg-green-900/25 text-green-200 px-4 py-2 text-sm transition active:scale-[0.99]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-green-800/30 bg-black/35 px-3 py-3">
              <Search className="h-4 w-4 text-green-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, category, location, claimant email…"
                className="w-full bg-transparent outline-none text-white text-sm placeholder:text-white/30"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-green-800/30 bg-black/35 px-3 py-3">
              <Filter className="h-4 w-4 text-green-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-transparent outline-none text-white text-sm"
              >
                <option value="pending" className="bg-black">
                  Pending
                </option>
                <option value="approved" className="bg-black">
                  Approved
                </option>
                <option value="rejected" className="bg-black">
                  Rejected
                </option>
                <option value="all" className="bg-black">
                  All
                </option>
              </select>
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-red-800/30 bg-red-950/20 p-4">
            <p className="text-red-300 text-sm font-semibold">Error</p>
            <p className="text-white/70 text-sm mt-1">{err}</p>
          </div>
        )}

        {/* Empty */}
        {filteredRows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-green-800/20 bg-black/40 p-6 text-center">
            <p className="text-white/80 font-semibold">No matching claims</p>
            <p className="text-white/50 text-sm mt-1">
              Try changing status filter or clearing search.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredRows.map((c) => {
              const isPending = (c.status || "pending") === "pending";
              const isBusy = busyId === c.id;

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-green-800/20 bg-black/40 p-5 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white text-lg font-semibold">{c.itemTitle || "Item"}</p>
                      <p className="text-white/60 text-xs mt-1">
                        {(c.itemType || "—").toUpperCase()} • {c.category || "Other"} •{" "}
                        {c.location || "-"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusPill status={c.status} />
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-1 text-xs text-white/60">
                          <Sparkles className="h-3.5 w-3.5 text-green-300" />
                          Action needed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-green-800/20 bg-black/35 p-3">
                      <p className="text-white/50 text-xs flex items-center gap-2">
                        <Mail className="h-4 w-4 text-green-400" />
                        Claimant
                      </p>
                      <p className="text-white text-sm mt-1">{c.claimantEmail || "unknown"}</p>
                    </div>

                    <div className="rounded-xl border border-green-800/20 bg-black/35 p-3">
                      <p className="text-white/50 text-xs flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-green-400" />
                        Submitted
                      </p>
                      <p className="text-white text-sm mt-1">{fmtDate(c.createdAt)}</p>
                    </div>

                    <div className="rounded-xl border border-green-800/20 bg-black/35 p-3">
                      <p className="text-white/50 text-xs flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-400" />
                        Pickup
                      </p>
                      <p className="text-white text-sm mt-1">
                        {c.collectionPoint || "Office"}
                      </p>
                    </div>
                  </div>

                  {/* Proof */}
                  <div className="mt-3 rounded-xl border border-green-800/20 bg-black/40 p-3">
                    <p className="text-white/50 text-xs flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-400" />
                      Claim Proof
                    </p>
                    <p className="text-white text-sm mt-2 whitespace-pre-wrap">{c.proofText || "-"}</p>
                  </div>

                  {/* Pickup details */}
                  <div className="mt-3 rounded-xl border border-green-800/20 bg-green-900/10 p-3">
                    <p className="text-green-300 text-xs font-semibold">Pickup Details</p>
                    <p className="text-white text-sm mt-1">
                      {c.assignedMaintainerName || me?.name || "Maintainer Office"}
                    </p>
                    <p className="text-white/80 text-sm">
                      📍 {c.collectionPoint || "Office"}
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      🕒 {c.officeHours || "10:00 AM – 4:00 PM"}
                    </p>
                  </div>

                  {/* Rejected reason */}
                  {c.status === "rejected" && c.rejectedReason && (
                    <div className="mt-3 rounded-xl border border-red-800/20 bg-red-900/10 p-3">
                      <p className="text-red-300 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Rejection Reason
                      </p>
                      <p className="text-white/80 text-sm mt-1">{c.rejectedReason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {isPending && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => approveClaim(c)}
                        disabled={isBusy}
                        className={cn(
                          "flex-1 rounded-xl bg-green-600 hover:bg-green-500 text-black font-semibold py-3 transition active:scale-[0.99]",
                          isBusy ? "opacity-60" : ""
                        )}
                      >
                        {isBusy ? "Approving..." : "Approve"}
                      </button>

                      <button
                        onClick={() => rejectClaim(c)}
                        disabled={isBusy}
                        className={cn(
                          "flex-1 rounded-xl bg-red-600 hover:bg-red-500 text-black font-semibold py-3 transition active:scale-[0.99]",
                          isBusy ? "opacity-60" : ""
                        )}
                      >
                        {isBusy ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  )}

                  {c.status !== "pending" && c.verifiedByName && (
                    <p className="text-white/40 text-xs mt-3">
                      Verified by {c.verifiedByName} • {fmtDate(c.verifiedAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center text-white/40 text-xs mt-6">
          Secure • Assigned claims only • Audit-ready
        </div>
      </div>

      {/* Global tweaks */}
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
