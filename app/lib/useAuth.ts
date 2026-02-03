"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";

export function useAuth(redirectTo = "/auth/login") {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (!u || !u.emailVerified) {
                router.replace(redirectTo);
            } else {
                setUser(u);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [router, redirectTo]);

    return { user, loading };
}
