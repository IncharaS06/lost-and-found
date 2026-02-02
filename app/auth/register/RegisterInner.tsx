"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  ShieldCheck,
  GraduationCap,
  UserCog,
} from "lucide-react";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

const COLLEGE_DOMAIN = "vvce.ac.in";

// ✅ Allowed VVCE branch codes
const ALLOWED_BRANCHES = new Set([
  "cse",
  "ise",
  "ece",
  "eee",
  "me",
  "cv",
  "civ",
  "aiml",
  "ai",
  "ds",
]);

// ✅ Student email parser: vvce<yy><branch><4-digit-roll>@vvce.ac.in
function parseStudentVvceEmail(email: string) {
  const e = email.trim().toLowerCase();
  const re = /^vvce(\d{2})([a-z]{2,5})(\d{4})@vvce\.ac\.in$/;
  const m = e.match(re);
  if (!m) return null;

  const year = Number(m[1]);
  const branch = m[2];
  const roll = Number(m[3]);

  if (year < 15 || year > 35) return null;
  if (!ALLOWED_BRANCHES.has(branch)) return null;
  if (roll < 1 || roll > 9999) return null;

  return { year, branch, roll, normalized: e };
}

// ✅ Teacher email validator: anything@vvce.ac.in
function parseTeacherEmail(email: string) {
  const e = email.trim().toLowerCase();
  const re = /^[a-z0-9._%+-]+@vvce\.ac\.in$/;
  if (!re.test(e)) return null;
  return { normalized: e };
}

// ✅ Password strength
function validatePassword(pw: string) {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must include 1 uppercase letter";
  if (!/[0-9]/.test(pw)) return "Password must include 1 number";
  return null;
}

function niceFirebaseError(code?: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please login.";
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet and try again.";
    default:
      return null;
  }
}

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function RegisterInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const role = (sp.get("role") || "student").toLowerCase();
  const roleLabel = useMemo(
    () => (role === "teacher" ? "Teacher" : "Student"),
    [role]
  );
  const RoleIcon = role === "teacher" ? UserCog : GraduationCap;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const nm = name.trim();
    const em = email.trim();

    if (!nm) return alert("Please enter your name");
    if (password !== confirm) return alert("Passwords do not match");

    const pwErr = validatePassword(password);
    if (pwErr) return alert(pwErr);

    // ✅ Role-based email validation
    let normalizedEmail = "";
    let admissionYear: number | null = null;
    let branch: string | null = null;
    let rollNo: number | null = null;

    if (role === "teacher") {
      const parsedT = parseTeacherEmail(em);
      if (!parsedT) {
        alert(`Invalid email.\n\nUse: yourname@${COLLEGE_DOMAIN}`);
        return;
      }
      normalizedEmail = parsedT.normalized;
    } else {
      const parsedS = parseStudentVvceEmail(em);
      if (!parsedS) {
        alert(
          `Invalid student email format.\n\nUse:\nvvce<yy><branch><4-digit-roll>@${COLLEGE_DOMAIN}\n\nExample:\nvvce22ise0078@${COLLEGE_DOMAIN}`
        );
        return;
      }
      normalizedEmail = parsedS.normalized;
      admissionYear = parsedS.year;
      branch = parsedS.branch;
      rollNo = parsedS.roll;
    }

    try {
      setLoading(true);

      const cred = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: nm,
        email: normalizedEmail,
        emailDomain: COLLEGE_DOMAIN,
        role: role === "teacher" ? "teacher" : "student",

        // student-only fields
        admissionYear,
        branch,
        rollNo,

        // required by rules
        disabled: false,
        disabledReason: "",

        createdAt: serverTimestamp(),
      });

      await sendEmailVerification(cred.user);

      alert("Account created! Verify your email, then login.");
      router.push(`/auth/login?role=${role}`);
    } catch (err: any) {
      alert(
        niceFirebaseError(err?.code) ||
          err?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldBase =
    "mt-1 flex items-center gap-2 rounded-xl border border-green-800/30 bg-black/40 px-3 py-3 transition";
  const inputBase =
    "w-full bg-transparent outline-none text-white placeholder:text-white/30 text-sm";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-black to-green-950/30 flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl animate-pulse" />

      <div
        className={cn(
          "w-full max-w-md rounded-2xl border border-green-800/30 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl p-5 sm:p-7 shadow-2xl shadow-green-900/10",
          "transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/auth")}
            className="inline-flex items-center gap-2 text-white/70 hover:text-green-300 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 text-white/70">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            <span className="text-xs">{roleLabel} Registration</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          <RoleIcon className="h-8 w-8 text-green-400" />
          <Image
            src="/LOSTFOUND.png"
            alt="Lost & Found Logo"
            width={90}
            height={90}
            priority
            className="mt-3 h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-[0_0_18px_rgba(34,197,94,0.25)]"
          />
          <h1 className="mt-3 text-white text-2xl font-semibold">
            Create {roleLabel} Account
          </h1>
          <p className="mt-1 text-white/60 text-sm">
            Use your official VVCE college email ID
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-white/70 text-xs">Full Name</label>
            <div className={cn(fieldBase, "focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20")}>
              <User className="h-4 w-4 text-green-400" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className={inputBase}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-white/70 text-xs">Email</label>
            <div className={cn(fieldBase, "focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20")}>
              <Mail className="h-4 w-4 text-green-400" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === "teacher"
                    ? `yourname@${COLLEGE_DOMAIN}`
                    : `vvce22ise0078@${COLLEGE_DOMAIN}`
                }
                className={inputBase}
                type="email"
                required
              />
            </div>

            <p className="mt-2 text-[11px] text-white/45">
              {role === "teacher"
                ? `Example: faculty@${COLLEGE_DOMAIN}`
                : `Format: vvce<yy><branch><roll>@${COLLEGE_DOMAIN}`}
            </p>
          </div>

          <div>
            <label className="text-white/70 text-xs">Password</label>
            <div className={cn(fieldBase, "focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20")}>
              <Lock className="h-4 w-4 text-green-400" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                className={inputBase}
                type="password"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-white/70 text-xs">Confirm Password</label>
            <div className={cn(fieldBase, "focus-within:border-green-500/60 focus-within:ring-2 focus-within:ring-green-500/20")}>
              <Lock className="h-4 w-4 text-green-400" />
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={inputBase}
                type="password"
                required
              />
            </div>
          </div>

          <button
            className={cn(
              "relative w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-3.5 font-medium transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed",
              "shadow-lg shadow-green-700/10"
            )}
            type="submit"
            disabled={loading}
          >
            <span className="relative">
              {loading ? "Creating..." : "Register"}
            </span>
          </button>
        </form>

        <p className="mt-5 text-xs text-white/50 text-center">
          {role === "teacher"
            ? `Only valid @${COLLEGE_DOMAIN} email IDs are allowed`
            : `Only valid VVCE USN-formatted email IDs are allowed`}
        </p>
      </div>
    </div>
  );
}
