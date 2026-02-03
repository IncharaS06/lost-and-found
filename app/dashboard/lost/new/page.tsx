"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";
import { resolveAssignee } from "@/app/lib/assigner";

import {
    ArrowLeft,
    MapPin,
    CalendarDays,
    FileText,
    ShieldCheck,
    Upload,
    Sparkles,
    X,
    Image as ImageIcon,
} from "lucide-react";

type UserProfile = {
    name?: string;
    email?: string;
    role?: string;
};

type Particle = { left: string; top: string; delay: string; duration: string };

async function fileToCompressedDataUrl(file: File, maxSize = 900, quality = 0.7): Promise<string> {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);

    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const scale = Math.min(1, maxSize / Math.max(w, h));
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");

    ctx.drawImage(img, 0, 0, nw, nh);

    // Use WebP for smaller size
    const dataUrl = canvas.toDataURL("image/webp", quality);

    URL.revokeObjectURL(url);
    return dataUrl;
}

/* ---------- UI helpers ---------- */
function cn(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}

function Field({
    label,
    icon,
    children,
}: {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="text-white/70 text-xs">{label}</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 transition focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20">
                {icon}
                {children}
            </div>
        </div>
    );
}

export default function ReportLostPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [uid, setUid] = useState<string | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("ID Card");
    const [color, setColor] = useState("");
    const [lastSeenLocation, setLastSeenLocation] = useState("");
    const [lostDate, setLostDate] = useState("");
    const [description, setDescription] = useState("");
    const [secretProof, setSecretProof] = useState("");

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);

    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Get current year for date restriction
    const currentYear = new Date().getFullYear();
    const minDate = `${currentYear}-01-01`;
    const maxDate = `${currentYear}-12-31`;

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

            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                if (snap.exists()) setUser(snap.data() as UserProfile);
            } catch {
                // ignore
            }

            setLoading(false);
        });

        return () => unsub();
    }, [router]);

    const pickFile = (f: File | null) => {
        setFile(f);
        if (!f) {
            if (preview) URL.revokeObjectURL(preview);
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(f);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(url);
    };

    const removeFile = () => pickFile(null);

    // Get photo prompt based on category and title
    const getPhotoPrompt = () => {
        const itemName = title.toLowerCase() || category.toLowerCase();

        if (category === "ID Card") {
            return "Front side (show name and photo clearly)";
        } else if (category === "Wallet") {
            return "Show wallet open with cards visible";
        } else if (category === "Phone") {
            return "Front and back (show model, color, case)";
        } else if (category === "Keys") {
            return "All keys on keychain clearly visible";
        } else if (category === "Laptop") {
            return "Open laptop showing screen and stickers";
        } else if (category === "Bag") {
            return "Whole bag from multiple angles";
        } else if (category === "Notebook") {
            return "Cover and first page with writing";
        } else if (category === "Charger") {
            return "Plug type and cable length visible";
        } else if (category === "Water Bottle") {
            return "Show brand logo and distinctive marks";
        } else {
            return "Clear photo showing unique features";
        }
    };

    const submit = async () => {
        if (submitting) return;

        const t = title.trim();
        const loc = lastSeenLocation.trim();

        if (!uid) return;
        if (!t) return alert("Please enter item title.");
        if (!category) return alert("Please select a category.");
        if (!loc) return alert("Please enter last seen location.");
        if (!lostDate) return alert("Please pick the lost date.");
        if (!secretProof.trim()) return alert("Please enter a hidden proof detail (required).");

        // Validate date is within current year
        const selectedYear = new Date(lostDate).getFullYear();
        if (selectedYear !== currentYear) {
            return alert(`Please select a date within ${currentYear} only.`);
        }

        setSubmitting(true);
        try {
            let imageData = "";

            if (file) {
                // basic image compression
                imageData = await fileToCompressedDataUrl(file, 900, 0.7);

                // basic size safety (Firestore ~1MB per doc)
                if (imageData.length > 850_000) {
                    // try more compression
                    imageData = await fileToCompressedDataUrl(file, 700, 0.6);
                }
                if (imageData.length > 950_000) {
                    alert("Image is still too large. Please choose a smaller image.");
                    setSubmitting(false);
                    return;
                }
            }

            // ✅ ASSIGNER: auto-pick maintainer based on location + category
            const assignee = await resolveAssignee(db, {
                location: lastSeenLocation,
                category,
            });

            await addDoc(collection(db, "lost_items"), {
                title: title.trim(),
                category,
                color: color.trim(),
                lastSeenLocation: lastSeenLocation.trim(),
                lostDate, // yyyy-mm-dd
                description: description.trim(),
                secretProof: secretProof.trim(), // hidden
                imageData, // ✅ base64 data URL (webp)
                status: "open",

                // ✅ Must match rules:
                reportedBy: uid,

                reporterEmail: user?.email || auth.currentUser?.email || "",
                reporterName: user?.name || "",

                // ✅ Assigner fields
                assignedMaintainerUid: assignee.assignedMaintainerUid,
                assignedMaintainerName: assignee.assignedMaintainerName,
                collectionPoint: assignee.collectionPoint,
                officeHours: assignee.officeHours,

                createdAt: serverTimestamp(),
            });

            alert(
                `Lost item reported!\nAssigned to: ${assignee.assignedMaintainerName}\nCollect at: ${assignee.collectionPoint} (${assignee.officeHours})`
            );
            router.push("/dashboard");
        } catch (e: any) {
            console.error(e);
            alert(e?.message || "Failed to submit.");
        } finally {
            setSubmitting(false);
        }
    };

    const proofLen = secretProof.trim().length;
    const minProof = 8;
    const proofOk = proofLen >= minProof;

    if (loading) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 px-4 py-8">
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
                <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />

                <div className="max-w-xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="h-6 w-24 rounded bg-white/10 animate-pulse" />
                        <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
                    </div>

                    <div className="mt-5 rounded-2xl border border-green-800/30 bg-black/40 p-5">
                        <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
                        <div className="mt-4 space-y-3">
                            <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                            </div>
                            <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                            <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                            <div className="h-24 rounded-xl bg-white/10 animate-pulse" />
                            <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                            <div className="h-40 rounded-xl bg-white/10 animate-pulse" />
                            <div className="h-11 rounded-xl bg-white/10 animate-pulse" />
                        </div>
                    </div>

                    <p className="text-white/40 text-xs mt-6 text-center animate-pulse">Loading…</p>
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
                        <p className="text-white/80 text-sm font-medium">Report Lost Item</p>
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
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            submit();
                        }}
                        className="space-y-4"
                    >
                        <Field label="Item Title" icon={<FileText className="h-4 w-4 text-green-400" />}>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-transparent outline-none text-white text-sm placeholder:text-white/30"
                                placeholder="e.g., Wallet / ID Card / Keys"
                            />
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-white/70 text-xs">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 text-white text-sm outline-none transition focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20"
                                >
                                    <option>ID Card</option>
                                    <option>Wallet</option>
                                    <option>Phone</option>
                                    <option>Keys</option>
                                    <option>Notebook</option>
                                    <option>Bag</option>
                                    <option>Laptop</option>
                                    <option>Charger</option>
                                    <option>Water Bottle</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <Field label="Color (optional)">
                                <input
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-full bg-transparent outline-none text-white text-sm placeholder:text-white/30"
                                    placeholder="e.g., Black"
                                />
                            </Field>
                        </div>

                        <Field
                            label="Last Seen Location"
                            icon={<MapPin className="h-4 w-4 text-green-400" />}
                        >
                            <input
                                value={lastSeenLocation}
                                onChange={(e) => setLastSeenLocation(e.target.value)}
                                className="w-full bg-transparent outline-none text-white text-sm placeholder:text-white/30"
                                placeholder="e.g., Library / Canteen / Lab Block"
                            />
                        </Field>

                        <Field label="Lost Date" icon={<CalendarDays className="h-4 w-4 text-green-400" />}>
                            <input
                                type="date"
                                value={lostDate}
                                onChange={(e) => setLostDate(e.target.value)}
                                min={minDate}
                                max={maxDate}
                                className="w-full bg-transparent outline-none text-white text-sm"
                                title={`Select date in ${currentYear} only`}
                            />
                            <div className="mt-1 text-xs text-white/50">
                                Only {currentYear} dates allowed
                            </div>
                        </Field>

                        <div>
                            <label className="text-white/70 text-xs">Description (optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 text-white text-sm outline-none min-h-[90px] transition focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20 placeholder:text-white/30"
                                placeholder="Extra details (brand, stickers, etc.)"
                            />
                        </div>

                        <div>
                            <label className="text-white/70 text-xs flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-green-400" />
                                Hidden Proof Detail (required)
                            </label>

                            <input
                                value={secretProof}
                                onChange={(e) => setSecretProof(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 text-white text-sm outline-none transition focus:border-green-500/60 focus:ring-2 focus:ring-green-500/20 placeholder:text-white/30"
                                placeholder="Unique mark, serial digits, scratch, etc."
                            />

                            <div className="mt-1 flex items-center justify-between">
                                <p className="text-white/50 text-xs">
                                    Not shown publicly. Maintainer uses it to verify claims.
                                </p>
                                <p className={cn("text-xs", proofOk ? "text-green-300/80" : "text-white/40")}>
                                    {proofLen}/{minProof}+
                                </p>
                            </div>
                        </div>

                        {/* Upload */}
                        <div className="rounded-2xl border border-green-800/30 bg-black/40 p-4">
                            <div className="flex items-center justify-between">
                                <label className="text-white/70 text-xs flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-green-400" />
                                    Upload Image (optional)
                                </label>

                                {preview && (
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-800/30 bg-red-900/10 px-2 py-1 text-xs text-red-200 hover:bg-red-900/20 transition active:scale-95"
                                    >
                                        <X className="h-3 w-3" />
                                        Remove
                                    </button>
                                )}
                            </div>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => pickFile(e.target.files?.[0] || null)}
                                className="mt-2 text-white/70 text-xs"
                            />

                            {!preview && (
                                <div className="mt-3 rounded-xl border border-green-800/20 bg-black/30 p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-10 w-10 rounded-xl bg-green-900/20 border border-green-800/20 flex items-center justify-center">
                                            <ImageIcon className="h-5 w-5 text-green-300/80" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white/70 text-sm font-medium">Add a clear photo</p>
                                            <p className="text-white/40 text-xs">
                                                Helps matching + faster verification (auto-compressed to WebP).
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-green-900/10 border border-green-800/20 rounded-lg p-3 mt-2">
                                        <p className="text-green-300/80 text-xs font-medium mb-1">📸 Photo Tip:</p>
                                        <p className="text-white/70 text-xs">
                                            {getPhotoPrompt()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {preview && (
                                <div className="mt-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-green-300/80 text-xs">✅ Photo added</p>
                                        <div className="text-white/50 text-xs">
                                            {getPhotoPrompt()}
                                        </div>
                                    </div>
                                    <div className="rounded-xl overflow-hidden border border-green-800/30">
                                        <Image
                                            src={preview}
                                            alt="preview"
                                            width={900}
                                            height={520}
                                            className="w-full h-auto object-cover transition-transform duration-500 hover:scale-[1.02]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !proofOk}
                            className={cn(
                                "w-full rounded-xl py-3 font-semibold transition active:scale-[0.99]",
                                submitting || !proofOk
                                    ? "bg-green-900/40 text-white/40 cursor-not-allowed"
                                    : "bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/10"
                            )}
                        >
                            {submitting ? "Submitting..." : "Submit Lost Item"}
                        </button>
                    </form>
                </div>

                <div className="text-center text-white/40 text-xs mt-5">
                    Campus-only • Secure • Verified handover
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
          input,
          select,
          textarea {
            font-size: 16px !important; /* iOS zoom prevention */
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