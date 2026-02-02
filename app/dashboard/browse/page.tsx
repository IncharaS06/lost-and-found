"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/lib/firebase";

import { ArrowLeft, Search, MapPin, Tag, Sparkles } from "lucide-react";

type Item = {
  id: string;
  title?: string;
  category?: string;

  // ✅ base64 image saved in Firestore (data:image/webp;base64,...)
  imageData?: string | null;

  // optional legacy URL if you used storage earlier
  imageUrl?: string | null;

  status: "lost" | "found";
  createdAt?: any;

  lastSeenLocation?: string;
  foundLocation?: string;
};

type Particle = { left: string; top: string; delay: string; duration: string };

const CATEGORIES = [
  "All",
  "Wallet",
  "ID Card",
  "Keys",
  "Phone",
  "Laptop",
  "Charger",
  "Bag",
  "Watch",
  "Earbuds",
  "Book",
  "Other",
];

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function BrowsePage() {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u || !u.emailVerified) router.replace("/auth");
    });

    const lostQ = query(collection(db, "lost_items"), orderBy("createdAt", "desc"));
    const foundQ = query(collection(db, "found_items"), orderBy("createdAt", "desc"));

    const unsubLost = onSnapshot(
      lostQ,
      (snap) => {
        const lostItems: Item[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
          status: "lost",
        }));

        setItems((prev) => {
          const foundOnly = prev.filter((x) => x.status === "found");
          return [...lostItems, ...foundOnly];
        });

        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubFound = onSnapshot(
      foundQ,
      (snap) => {
        const foundItems: Item[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
          status: "found",
        }));

        setItems((prev) => {
          const lostOnly = prev.filter((x) => x.status === "lost");
          return [...lostOnly, ...foundItems];
        });

        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      unsubAuth();
      unsubLost();
      unsubFound();
    };
  }, [router]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((i) => {
      const text =
        `${i.title || ""} ${i.lastSeenLocation || ""} ${i.foundLocation || ""}`.toLowerCase();

      const matchSearch = !s || text.includes(s);
      const matchCat = category === "All" || (i.category || "") === category;

      return matchSearch && matchCat;
    });
  }, [items, search, category]);

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-8">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-6 w-36 rounded bg-white/10 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-green-800/30 bg-black/40 p-4">
                <div className="h-40 w-full rounded-xl bg-white/10 animate-pulse" />
                <div className="mt-3 h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                <div className="mt-2 h-3 w-1/3 rounded bg-white/10 animate-pulse" />
                <div className="mt-4 h-10 w-full rounded-xl bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs mt-6 text-center animate-pulse">
            Loading items…
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

      <div className="max-w-6xl mx-auto relative">
        {/* Top bar */}
        <div
          className={cn(
            "flex items-center justify-between mb-4 transition-all duration-700 ease-out",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          )}
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-white/70 hover:text-green-300 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-400 animate-pulse" />
            <h1 className="text-white font-semibold">Browse Items</h1>
          </div>
        </div>

        {/* Filters */}
        <div
          className={cn(
            "flex flex-col sm:flex-row gap-3 mb-5 transition-all duration-700 ease-out",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          )}
          style={{ transitionDelay: "120ms" }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 flex-1 focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20 transition">
            <Search className="h-4 w-4 text-green-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item or location"
              className="w-full bg-transparent outline-none text-white text-sm placeholder:text-white/30"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-green-800/30 bg-black/40 px-3 py-3">
            <Tag className="h-4 w-4 text-green-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-black/0 text-white text-sm outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-black">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i, idx) => (
            <div
              key={i.id}
              className={cn(
                "rounded-2xl border border-green-800/30 bg-black/40 p-4",
                "transition-all duration-300 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-0.5",
                "animate-fadeInUp"
              )}
              style={{ animationDelay: `${idx * 35}ms` }}
            >
              {/* Image */}
              <div className="relative overflow-hidden rounded-xl border border-green-800/20 bg-black/30">
                {i.imageData ? (
                  <img
                    src={i.imageData}
                    alt={i.title || "Item"}
                    className="h-40 w-full object-cover transition-transform duration-500 hover:scale-[1.04]"
                  />
                ) : i.imageUrl ? (
                  <img
                    src={i.imageUrl}
                    alt={i.title || "Item"}
                    className="h-40 w-full object-cover transition-transform duration-500 hover:scale-[1.04]"
                  />
                ) : (
                  <div className="h-40 w-full flex items-center justify-center">
                    <p className="text-white/40 text-xs">No image</p>
                  </div>
                )}

                {/* overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                {/* badge */}
                <div className="absolute top-2 right-2">
                  <span
                    className={cn(
                      "text-[11px] px-2 py-1 rounded-full border backdrop-blur-sm",
                      i.status === "lost"
                        ? "bg-red-900/35 text-red-200 border-red-800/30 shadow-[0_0_18px_rgba(239,68,68,0.15)]"
                        : "bg-green-900/35 text-green-200 border-green-800/30 shadow-[0_0_18px_rgba(34,197,94,0.15)]"
                    )}
                  >
                    {i.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="mt-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-white font-medium leading-tight">
                    {i.title || "Untitled"}
                  </h3>
                </div>

                <p className="text-white/60 text-xs mt-1">{i.category || "Other"}</p>

                {(i.lastSeenLocation || i.foundLocation) && (
                  <p className="mt-2 flex items-center gap-1 text-white/60 text-xs">
                    <MapPin className="h-3 w-3 text-green-400" />
                    <span className="truncate">{i.lastSeenLocation || i.foundLocation}</span>
                  </p>
                )}

                <button
                  onClick={() =>
                    router.push(
                      i.status === "lost"
                        ? `/dashboard/claim?type=lost&id=${i.id}`
                        : `/dashboard/claim?type=found&id=${i.id}`
                    )
                  }
                  className="mt-3 w-full rounded-xl border border-green-700/50 bg-green-900/10 hover:bg-green-900/30 text-green-200 py-2.5 text-sm transition active:scale-[0.99]"
                >
                  Claim / Contact
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-white/50 text-sm mt-10">
            No matching items found
          </p>
        )}
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
