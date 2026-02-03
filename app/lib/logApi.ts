import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

/**
 * Writes an audit log to Firestore:
 * logs/{id} => { action, message, actorUid, targetUid, createdAt }
 */
export async function writeLog(params: {
    action: string;
    message: string;
    targetUid?: string;
}) {
    const actorUid = auth.currentUser?.uid || "";
    await addDoc(collection(db, "logs"), {
        action: params.action,
        message: params.message,
        actorUid,
        targetUid: params.targetUid || "",
        createdAt: serverTimestamp(),
    });
}
