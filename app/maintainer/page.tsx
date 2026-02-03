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
import { notifyClaimStatus } from "@/app/lib/notifyApi";

import {
  ShieldCheck,
  ArrowLeft,
  Search,
  Filter,
  Package,
  ClipboardList,
  Pencil,
  X,
  Save,
  Eye,
  CheckCircle2,
  Hand,
} from "lucide-react";

/* ================= TYPES ================= */
type UserRole = "student" | "teacher" | "maintainer" | "admin";

type UserProfile = {
  name?: string;
  role?: UserRole | string;
};

type ClaimRow = {
  id: string;

  itemTitle?: string;
  category?: string;
  claimantEmail?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: any;

  assignedMaintainerUid?: string;

  collectionPoint?: string;
  officeHours?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupContactEmail?: string;
  pickupNote?: string;

  verifiedByName?: string;
  verifiedAt?: any;
};

type FoundRow = {
  id: string;

  title?: string;
  category?: string;
  status?: "pending" | "approved" | "handed_over";
  createdAt?: any;

  assignedMaintainerUid?: string;

  foundByName?: string;
  foundByEmail?: string;
  foundLocation?: string;
  description?: string;
  imageUrl?: string;

  // handover details (optional)
  handoverToName?: string;
  handoverToEmail?: string;
  handoverNote?: string;

  approvedByName?: string;
  approvedAt?: any;
  handedOverAt?: any;
};

type LostRow = {
  id: string;
  title?: string;
  category?: string;
  status?: string;
  reportedBy?: string;
  createdAt?: any;
};

/* ================= HELPERS ================= */
function fmtDate(v: any) {
  try {
    if (!v) return "—";
    if (v?.toDate) return v.toDate().toLocaleString();
    if (typeof v === "string" || typeof v === "number") return new Date(v).toLocaleString();
    return "—";
  } catch {
    return "—";
  }
}

function normRole(r: any): string {
  return String(r || "").toLowerCase().trim();
}

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

/* ================= PAGE ================= */
export default function MaintainerPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const role = useMemo(() => normRole(me?.role), [me]);

  const [err, setErr] = useState("");

  // tabs + search
  const [tab, setTab] = useState<"claims" | "lost" | "found">("claims");
  const [search, setSearch] = useState("");

  // claims
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "pending"
  );
  const [busyApproveClaimId, setBusyApproveClaimId] = useState<string | null>(null);

  // claims edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [activeClaim, setActiveClaim] = useState<ClaimRow | null>(null);
  const [savingClaim, setSavingClaim] = useState(false);

  // lost items
  const [lostItems, setLostItems] = useState<LostRow[]>([]);

  // found items
  const [foundItems, setFoundItems] = useState<FoundRow[]>([]);
  const [busyApproveFoundId, setBusyApproveFoundId] = useState<string | null>(null);
  const [busyHandoverFoundId, setBusyHandoverFoundId] = useState<string | null>(null);

  // found details modal
  const [foundOpen, setFoundOpen] = useState(false);
  const [activeFound, setActiveFound] = useState<FoundRow | null>(null);
  const [savingFound, setSavingFound] = useState(false);

  /* ================= LOADERS ================= */
  async function loadClaims(userUid: string, userRole: string) {
    const base = collection(db, "claims");
    const qy =
      userRole === "admin" || userRole === "teacher"
        ? query(base, orderBy("createdAt", "desc"))
        : query(base, where("assignedMaintainerUid", "==", userUid), orderBy("createdAt", "desc"));

    const snap = await getDocs(qy);
    setClaims(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  }

  async function loadLostItems() {
    const snap = await getDocs(query(collection(db, "lost_items"), orderBy("createdAt", "desc")));
    setLostItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  }

  async function loadFoundItems(userUid: string, userRole: string) {
    const base = collection(db, "found_items");

    // Admin/Teacher: all found items
    // Maintainer: only assigned (you can remove this if you want them to see all)
    const qy =
      userRole === "admin" || userRole === "teacher"
        ? query(base, orderBy("createdAt", "desc"))
        : query(base, where("assignedMaintainerUid", "==", userUid), orderBy("createdAt", "desc"));

    const snap = await getDocs(qy);
    setFoundItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  }

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setErr("");

      if (!u) {
        router.replace("/auth");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (!snap.exists()) {
          router.replace("/auth");
          return;
        }

        const prof = snap.data() as UserProfile;
        const r = normRole(prof.role);

        if (!["teacher", "maintainer", "admin"].includes(r)) {
          router.replace("/dashboard");
          return;
        }

        setUid(u.uid);
        setMe(prof);

        await Promise.all([loadClaims(u.uid, r), loadLostItems(), loadFoundItems(u.uid, r)]);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || "Failed to load maintainer panel.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  /* ================= FILTERED LIST ================= */
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    if (tab === "claims") {
      return claims.filter((c) => {
        const st = (c.status || "pending") as any;
        const okStatus = statusFilter === "all" ? true : st === statusFilter;

        const blob = `${c.itemTitle || ""} ${c.category || ""} ${c.claimantEmail || ""} ${c.collectionPoint || ""
          }`.toLowerCase();

        return okStatus && (!s || blob.includes(s));
      });
    }

    if (tab === "lost") {
      return lostItems.filter((x) => {
        const blob = `${x.title || ""} ${x.category || ""} ${x.status || ""} ${x.reportedBy || ""
          }`.toLowerCase();
        return !s || blob.includes(s);
      });
    }

    return foundItems.filter((x) => {
      const blob = `${x.title || ""} ${x.category || ""} ${x.status || ""} ${x.foundByName || ""
        } ${x.foundLocation || ""}`.toLowerCase();
      return !s || blob.includes(s);
    });
  }, [tab, search, statusFilter, claims, lostItems, foundItems]);

  /* ================= ACTIONS (CLAIMS) ================= */
  async function approveClaim(c: ClaimRow) {
    if (!uid) return;
    if (busyApproveClaimId) return;

    try {
      setBusyApproveClaimId(c.id);

      await updateDoc(doc(db, "claims", c.id), {
        status: "approved",
        verifiedByName: me?.name || "",
        verifiedAt: serverTimestamp(),
      });

      await notifyClaimStatus(c.id);
      await loadClaims(uid, role || "maintainer");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Approve failed.");
    } finally {
      setBusyApproveClaimId(null);
    }
  }

  async function savePickupClaim() {
    if (!activeClaim || !uid) return;
    if (savingClaim) return;

    setSavingClaim(true);
    try {
      await updateDoc(doc(db, "claims", activeClaim.id), {
        collectionPoint: activeClaim.collectionPoint || "",
        officeHours: activeClaim.officeHours || "",
        pickupContactName: activeClaim.pickupContactName || "",
        pickupContactPhone: activeClaim.pickupContactPhone || "",
        pickupContactEmail: activeClaim.pickupContactEmail || "",
        pickupNote: activeClaim.pickupNote || "",
      });

      setEditOpen(false);
      setActiveClaim(null);

      await loadClaims(uid, role || "maintainer");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to save pickup details.");
    } finally {
      setSavingClaim(false);
    }
  }

  /* ================= ACTIONS (FOUND) ================= */
  async function approveFound(f: FoundRow) {
    if (!uid) return;
    if (busyApproveFoundId) return;

    try {
      setBusyApproveFoundId(f.id);

      await updateDoc(doc(db, "found_items", f.id), {
        status: "approved",
        approvedByName: me?.name || "",
        approvedAt: serverTimestamp(),
      });

      await loadFoundItems(uid, role || "maintainer");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Approve failed.");
    } finally {
      setBusyApproveFoundId(null);
    }
  }

  async function markHandedOver(f: FoundRow) {
    if (!uid) return;
    if (busyHandoverFoundId) return;

    try {
      setBusyHandoverFoundId(f.id);

      await updateDoc(doc(db, "found_items", f.id), {
        status: "handed_over",
        handedOverAt: serverTimestamp(),
      });

      await loadFoundItems(uid, role || "maintainer");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Handover update failed.");
    } finally {
      setBusyHandoverFoundId(null);
    }
  }

  async function saveFoundDetails() {
    if (!activeFound || !uid) return;
    if (savingFound) return;

    setSavingFound(true);
    try {
      await updateDoc(doc(db, "found_items", activeFound.id), {
        handoverToName: activeFound.handoverToName || "",
        handoverToEmail: activeFound.handoverToEmail || "",
        handoverNote: activeFound.handoverNote || "",
      });

      setFoundOpen(false);
      setActiveFound(null);

      await loadFoundItems(uid, role || "maintainer");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to save handover details.");
    } finally {
      setSavingFound(false);
    }
  }

  /* ================= UI ================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-green-400">
        Loading…
      </div>
    );
  }

  const tabLabel = tab === "claims" ? "Claims" : tab === "lost" ? "Lost Items" : "Found Items";

  return (
    <div className="min-h-screen bg-black px-4 py-6">
      {/* HEADER */}
      <div className="max-w-5xl mx-auto flex justify-between mb-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/70 hover:text-white transition"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="text-white/80 flex items-center gap-2">
          <ShieldCheck className="text-green-400" size={16} />
          <span>Maintainer Panel</span>
          <span className="text-white/40 text-xs">({(role || "role").toUpperCase()})</span>
        </div>
      </div>

      {/* ERROR */}
      {err && (
        <div className="max-w-5xl mx-auto mb-4 rounded-xl border border-red-800/30 bg-red-900/10 p-3">
          <p className="text-red-300 text-sm">{err}</p>
        </div>
      )}

      {/* TABS */}
      <div className="max-w-5xl mx-auto flex gap-2 mb-4">
        {[
          { k: "claims" as const, l: "Claims", i: ClipboardList },
          { k: "lost" as const, l: "Lost Items", i: Package },
          { k: "found" as const, l: "Found Items", i: Package },
        ].map(({ k, l, i: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "px-4 py-2 rounded-lg flex items-center gap-2",
              tab === k ? "bg-green-600 text-black" : "bg-white/10 text-white"
            )}
          >
            <Icon size={14} />
            {l}
          </button>
        ))}
      </div>

      {/* SEARCH + FILTERS */}
      <div className="max-w-5xl mx-auto bg-white/5 p-4 rounded-xl">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="flex-1 flex items-center gap-2 bg-black/40 border border-green-800/30 rounded-lg px-3">
            <Search size={14} className="text-green-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tabLabel.toLowerCase()}…`}
              className="w-full bg-transparent py-2 text-white outline-none"
            />
          </div>

          {tab === "claims" && (
            <div className="flex items-center gap-2 bg-black/40 border border-green-800/30 rounded-lg px-3">
              <Filter size={14} className="text-green-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-white outline-none py-2"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="max-w-5xl mx-auto mt-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="border border-green-800/20 rounded-xl p-6 bg-white/5 text-center">
            <p className="text-white/80 font-semibold">No records found</p>
            <p className="text-white/50 text-sm mt-1">Try changing filters or search.</p>
          </div>
        ) : tab === "claims" ? (
          (filtered as ClaimRow[]).map((c) => (
            <div key={c.id} className="border border-green-800/20 rounded-xl p-4 bg-white/5">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">{c.itemTitle || "Item"}</p>
                  <p className="text-white/50 text-xs">
                    {c.claimantEmail || "unknown"} • {fmtDate(c.createdAt)}
                  </p>
                </div>

                <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80">
                  {(c.status || "pending").toUpperCase()}
                </span>
              </div>

              <div className="mt-3 text-sm text-white/70">
                📍 {c.collectionPoint || "Not set"}
                <br />
                🕒 {c.officeHours || "Not set"}
              </div>

              <div className="mt-4 flex gap-3 flex-wrap">
                {(c.status || "pending") === "pending" && (
                  <button
                    onClick={() => approveClaim(c)}
                    disabled={busyApproveClaimId === c.id}
                    className="bg-green-600 disabled:opacity-60 px-4 py-2 rounded-lg text-black font-semibold"
                  >
                    {busyApproveClaimId === c.id ? "Approving…" : "Approve"}
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveClaim(c);
                    setEditOpen(true);
                  }}
                  className="bg-yellow-600 px-4 py-2 rounded-lg text-black font-semibold flex items-center gap-2"
                >
                  <Pencil size={14} /> Edit Pickup
                </button>
              </div>
            </div>
          ))
        ) : tab === "lost" ? (
          (filtered as LostRow[]).map((x) => (
            <div key={x.id} className="border border-green-800/20 rounded-xl p-4 bg-white/5">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">{x.title || "Item"}</p>
                  <p className="text-white/50 text-xs">
                    {x.category || "—"} • {fmtDate(x.createdAt)}
                  </p>
                </div>

                <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80">
                  {(x.status || "—").toUpperCase()}
                </span>
              </div>

              <div className="mt-3 text-sm text-white/70">👤 Reported by: {x.reportedBy || "—"}</div>
            </div>
          ))
        ) : (
          (filtered as FoundRow[]).map((f) => (
            <div key={f.id} className="border border-green-800/20 rounded-xl p-4 bg-white/5">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">{f.title || "Item"}</p>
                  <p className="text-white/50 text-xs">
                    {f.category || "—"} • {fmtDate(f.createdAt)}
                  </p>
                </div>

                <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80">
                  {(f.status || "pending").toUpperCase()}
                </span>
              </div>

              <div className="mt-3 text-sm text-white/70">
                🙋 Found by: {f.foundByName || "—"} {f.foundByEmail ? `(${f.foundByEmail})` : ""}
                <br />
                📍 Location: {f.foundLocation || "—"}
              </div>

              <div className="mt-4 flex gap-3 flex-wrap">
                <button
                  onClick={() => {
                    setActiveFound(f);
                    setFoundOpen(true);
                  }}
                  className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2"
                >
                  <Eye size={16} /> View Details
                </button>

                {(f.status || "pending") === "pending" && (
                  <button
                    onClick={() => approveFound(f)}
                    disabled={busyApproveFoundId === f.id}
                    className="bg-green-600 disabled:opacity-60 px-4 py-2 rounded-lg text-black font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    {busyApproveFoundId === f.id ? "Approving…" : "Approve"}
                  </button>
                )}

                {(f.status || "pending") === "approved" && (
                  <button
                    onClick={() => markHandedOver(f)}
                    disabled={busyHandoverFoundId === f.id}
                    className="bg-yellow-600 disabled:opacity-60 px-4 py-2 rounded-lg text-black font-semibold flex items-center gap-2"
                  >
                    <Hand size={16} />
                    {busyHandoverFoundId === f.id ? "Updating…" : "Mark Handed Over"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= CLAIMS MODAL ================= */}
      {editOpen && activeClaim && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-950 w-full max-w-md rounded-xl p-5 border border-green-800/30">
            <div className="flex justify-between mb-4">
              <h3 className="text-white font-semibold">Pickup Details</h3>
              <button
                onClick={() => {
                  setEditOpen(false);
                  setActiveClaim(null);
                }}
              >
                <X className="text-white/60" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <input
                value={activeClaim.collectionPoint || ""}
                onChange={(e) => setActiveClaim({ ...activeClaim, collectionPoint: e.target.value })}
                placeholder="Collection Point"
                className="w-full bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white"
              />

              <input
                value={activeClaim.officeHours || ""}
                onChange={(e) => setActiveClaim({ ...activeClaim, officeHours: e.target.value })}
                placeholder="Office Hours"
                className="w-full bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white"
              />

              <input
                value={activeClaim.pickupContactName || ""}
                onChange={(e) =>
                  setActiveClaim({ ...activeClaim, pickupContactName: e.target.value })
                }
                placeholder="Contact Name"
                className="w-full bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white"
              />

              <input
                value={activeClaim.pickupContactPhone || ""}
                onChange={(e) =>
                  setActiveClaim({ ...activeClaim, pickupContactPhone: e.target.value })
                }
                placeholder="Phone"
                className="w-full bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white"
              />

              <input
                value={activeClaim.pickupContactEmail || ""}
                onChange={(e) =>
                  setActiveClaim({ ...activeClaim, pickupContactEmail: e.target.value })
                }
                placeholder="Email"
                className="w-full bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white"
              />

              <textarea
                value={activeClaim.pickupNote || ""}
                onChange={(e) => setActiveClaim({ ...activeClaim, pickupNote: e.target.value })}
                placeholder="Note for student"
                className="w-full min-h-[90px] bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <button
              disabled={savingClaim}
              onClick={savePickupClaim}
              className="mt-4 w-full bg-green-600 disabled:opacity-60 py-2 rounded-lg text-black font-semibold flex items-center justify-center gap-2"
            >
              <Save size={16} /> {savingClaim ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* ================= FOUND DETAILS MODAL ================= */}
      {foundOpen && activeFound && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-950 w-full max-w-lg rounded-xl p-5 border border-green-800/30">
            <div className="flex justify-between mb-4">
              <h3 className="text-white font-semibold">Found Item Details</h3>
              <button
                onClick={() => {
                  setFoundOpen(false);
                  setActiveFound(null);
                }}
              >
                <X className="text-white/60" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-white/80">
              <div className="rounded-lg bg-white/5 p-3 border border-green-800/20">
                <p className="text-white font-semibold">{activeFound.title || "Item"}</p>
                <p className="text-white/50 text-xs mt-1">
                  {activeFound.category || "—"} • {fmtDate(activeFound.createdAt)}
                </p>

                <p className="text-white/70 mt-2">
                  <span className="text-white/50">Status:</span>{" "}
                  {(activeFound.status || "pending").toUpperCase()}
                </p>

                <p className="text-white/70 mt-1">
                  <span className="text-white/50">Found by:</span> {activeFound.foundByName || "—"}{" "}
                  {activeFound.foundByEmail ? `(${activeFound.foundByEmail})` : ""}
                </p>

                <p className="text-white/70 mt-1">
                  <span className="text-white/50">Location:</span> {activeFound.foundLocation || "—"}
                </p>

                {activeFound.description && (
                  <p className="text-white/70 mt-2">
                    <span className="text-white/50">Description:</span> {activeFound.description}
                  </p>
                )}

                {activeFound.imageUrl && (
                  <a
                    href={activeFound.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-green-300 underline text-xs"
                  >
                    View Image
                  </a>
                )}
              </div>

              {/* Handover inputs */}
              <div className="rounded-lg bg-white/5 p-3 border border-green-800/20">
                <p className="text-white font-semibold mb-2">Handover Details</p>

                <input
                  value={activeFound.handoverToName || ""}
                  onChange={(e) => setActiveFound({ ...activeFound, handoverToName: e.target.value })}
                  placeholder="Handover to (Name)"
                  className="w-full bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white mb-2"
                />

                <input
                  value={activeFound.handoverToEmail || ""}
                  onChange={(e) =>
                    setActiveFound({ ...activeFound, handoverToEmail: e.target.value })
                  }
                  placeholder="Handover to (Email)"
                  className="w-full bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white mb-2"
                />

                <textarea
                  value={activeFound.handoverNote || ""}
                  onChange={(e) => setActiveFound({ ...activeFound, handoverNote: e.target.value })}
                  placeholder="Note / Proof reference (optional)"
                  className="w-full min-h-[90px] bg-black/40 border border-green-800/30 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <button
                disabled={savingFound}
                onClick={saveFoundDetails}
                className="mt-2 w-full bg-green-600 disabled:opacity-60 py-2 rounded-lg text-black font-semibold flex items-center justify-center gap-2"
              >
                <Save size={16} /> {savingFound ? "Saving…" : "Save Details"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
