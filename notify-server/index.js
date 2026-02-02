// notify-server/index.js
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Put service account JSON in an env var or file
// Recommended: env var SERVICE_ACCOUNT_JSON
const svc = process.env.SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.SERVICE_ACCOUNT_JSON)
    : null;

if (!svc) {
    console.error("Missing SERVICE_ACCOUNT_JSON env var");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(svc),
});

const db = admin.firestore();

/* ----------------- helpers ----------------- */
async function verifyIdToken(req) {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) throw new Error("Missing Bearer token");
    const decoded = await admin.auth().verifyIdToken(match[1]);
    return decoded; // { uid, email, ... }
}

async function getUserRole(uid) {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return (snap.data().role || "").toLowerCase();
}

async function getUserTokens(uid) {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return [];
    const tokensMap = snap.data().fcmTokens || {};
    return Object.keys(tokensMap);
}

async function sendToUser(uid, title, body, data = {}) {
    const tokens = await getUserTokens(uid);
    if (!tokens.length) return { ok: false, reason: "No tokens" };

    const message = {
        tokens,
        notification: { title, body },
        data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
    };

    const res = await admin.messaging().sendEachForMulticast(message);
    return { ok: true, successCount: res.successCount, failureCount: res.failureCount };
}

/* ----------------- APIs ----------------- */

/**
 * Student calls this after creating a claim:
 * POST /notify/claim-created { claimId }
 */
app.post("/notify/claim-created", async (req, res) => {
    try {
        const decoded = await verifyIdToken(req);
        const callerUid = decoded.uid;

        const role = await getUserRole(callerUid);
        if (!["student", "teacher"].includes(role)) {
            return res.status(403).json({ error: "Only student/teacher can call" });
        }

        const { claimId } = req.body;
        if (!claimId) return res.status(400).json({ error: "Missing claimId" });

        const claimSnap = await db.collection("claims").doc(claimId).get();
        if (!claimSnap.exists) return res.status(404).json({ error: "Claim not found" });

        const claim = claimSnap.data();

        // ✅ Ensure caller is the claimant
        if (claim.claimantUid !== callerUid) {
            return res.status(403).json({ error: "Not your claim" });
        }

        const maintainerUid = claim.assignedMaintainerUid;
        if (!maintainerUid) return res.json({ ok: false, reason: "No maintainer assigned" });

        const title = "New Claim Submitted";
        const body = `Item: ${claim.itemTitle || "Item"} • ${claim.category || ""}`;

        const out = await sendToUser(maintainerUid, title, body, {
            type: "claim_created",
            claimId,
        });

        return res.json(out);
    } catch (e) {
        console.error(e);
        return res.status(401).json({ error: e.message || "Auth failed" });
    }
});

/**
 * Maintainer calls this after approving/rejecting:
 * POST /notify/claim-status { claimId }
 */
app.post("/notify/claim-status", async (req, res) => {
    try {
        const decoded = await verifyIdToken(req);
        const callerUid = decoded.uid;

        const role = await getUserRole(callerUid);
        if (!["maintainer", "teacher", "admin"].includes(role)) {
            return res.status(403).json({ error: "Only maintainer/teacher/admin can call" });
        }

        const { claimId } = req.body;
        if (!claimId) return res.status(400).json({ error: "Missing claimId" });

        const claimSnap = await db.collection("claims").doc(claimId).get();
        if (!claimSnap.exists) return res.status(404).json({ error: "Claim not found" });

        const claim = claimSnap.data();

        // ✅ Maintainer must match assignment (admin bypass)
        if (role !== "admin" && claim.assignedMaintainerUid !== callerUid) {
            return res.status(403).json({ error: "Not assigned to you" });
        }

        const studentUid = claim.claimantUid;
        if (!studentUid) return res.json({ ok: false, reason: "No claimant" });

        let title = "Claim Update";
        let body = `Item: ${claim.itemTitle || "Item"}`;

        if (claim.status === "approved") {
            title = "Claim Approved ✅";
            body =
                `Approved for "${claim.itemTitle || "Item"}"\n` +
                `Collect: ${claim.collectionPoint || "Office"}\n` +
                `Time: ${claim.officeHours || "10 AM – 4 PM"}`;
        } else if (claim.status === "rejected") {
            title = "Claim Rejected ❌";
            body =
                `Rejected for "${claim.itemTitle || "Item"}"\n` +
                `Reason: ${claim.rejectedReason || "Not specified"}`;
        }

        const out = await sendToUser(studentUid, title, body, {
            type: "claim_status",
            claimId,
            status: claim.status || "",
        });

        return res.json(out);
    } catch (e) {
        console.error(e);
        return res.status(401).json({ error: e.message || "Auth failed" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Notify server running on", PORT));
