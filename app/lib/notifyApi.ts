// app/lib/notifyApi.ts
import { auth } from "@/app/lib/firebase";

/**
 * Internal helper to call notify backend with Firebase ID token
 */
async function callNotifyApi(
    path: string,
    body: Record<string, any>
) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Not authenticated");
    }

    // Firebase ID token (proves identity to backend)
    const idToken = await user.getIdToken();

    const base = process.env.NEXT_PUBLIC_NOTIFY_API;
    if (!base) {
        console.warn("NEXT_PUBLIC_NOTIFY_API not set");
        return;
    }

    const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Notification API failed");
    }

    return res.json();
}

/* ---------------- PUBLIC FUNCTIONS ---------------- */

/**
 * Call after a student submits a claim
 */
export async function notifyClaimCreated(claimId: string) {
    try {
        return await callNotifyApi("/notify/claim-created", { claimId });
    } catch (e) {
        console.warn("notifyClaimCreated failed:", e);
    }
}

/**
 * Call after maintainer approves/rejects a claim
 */
export async function notifyClaimStatus(claimId: string) {
    try {
        return await callNotifyApi("/notify/claim-status", { claimId });
    } catch (e) {
        console.warn("notifyClaimStatus failed:", e);
    }
}
