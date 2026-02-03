"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";

export function useRoleGuard(allowedRoles: string[], redirectTo = "/dashboard") {
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u || !u.emailVerified) {
                router.replace("/auth/login");
                setLoading(false);
                return;
            }

            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                const r = (snap.exists() ? (snap.data() as any)?.role : null) as string | null;
                const normalized = (r || "").toLowerCase();

                setRole(normalized);

                if (!allowedRoles.map(s => s.toLowerCase()).includes(normalized)) {
                    router.replace(redirectTo);
                }
            } catch {
                router.replace(redirectTo);
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [allowedRoles, redirectTo, router]);

    return { loading, role };
}
