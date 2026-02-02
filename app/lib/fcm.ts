// app/lib/fcm.ts
import { getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

// ✅ You MUST add this in .env.local (Next.js exposes NEXT_PUBLIC_ variables)
// NEXT_PUBLIC_FCM_VAPID_KEY=xxxxxx
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || "";

/**
 * Requests notification permission, fetches FCM token,
 * and saves token under users/{uid}.fcmTokens[token]=true
 */
export async function enablePushNotifications(): Promise<{
    ok: boolean;
    token?: string;
    reason?: string;
}> {
    try {
        if (!VAPID_KEY) {
            return { ok: false, reason: "Missing NEXT_PUBLIC_FCM_VAPID_KEY" };
        }

        // Only works in browser
        if (typeof window === "undefined") {
            return { ok: false, reason: "Not in browser" };
        }

        // FCM not supported on some browsers
        const supported = await isSupported();
        if (!supported) return { ok: false, reason: "FCM not supported" };

        // Must be logged in
        const u = auth.currentUser;
        if (!u) return { ok: false, reason: "Not logged in" };

        // Ask permission
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
            return { ok: false, reason: "Permission denied" };
        }

        const messaging = getMessaging(); // uses firebase app initialized in your firebase.ts

        // token
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) return { ok: false, reason: "No token generated" };

        // Save token (as map to avoid array duplicates)
        // users/{uid}: { fcmTokens: { "<token>": true } }
        await setDoc(
            doc(db, "users", u.uid),
            {
                fcmTokens: { [token]: true },
                fcmUpdatedAt: new Date().toISOString(),
            },
            { merge: true }
        );

        return { ok: true, token };
    } catch (e: any) {
        console.error(e);
        return { ok: false, reason: e?.message || "Failed to enable notifications" };
    }
}
