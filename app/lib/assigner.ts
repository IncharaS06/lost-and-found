// app/lib/assigner.ts
import {
    collection,
    getDocs,
    limit,
    query,
    where,
    type Firestore,
} from "firebase/firestore";

export type Assignee = {
    assignedMaintainerUid: string;
    assignedMaintainerName: string;
    collectionPoint: string;
    officeHours: string;
};

type MaintainerProfile = {
    role?: string;
    name?: string;
    locations?: string[];
    categories?: string[];
    collectionPoint?: string;
    officeHours?: string;
};

function norm(s: string) {
    return (s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^a-z0-9 ]/g, "");
}

function fallbackCentral(): Assignee {
    return {
        assignedMaintainerUid: "CENTRAL",
        assignedMaintainerName: "Central Lost & Found",
        collectionPoint: "Central Office / Security Desk",
        officeHours: "10:00 AM – 4:00 PM",
    };
}

/**
 * Auto-assign maintainer by:
 * 1) matching location (users.role == "maintainer" AND locations contains location)
 * 2) else matching category (users.role == "maintainer" AND categories contains category)
 * 3) else fallback to central
 */
export async function resolveAssignee(
    db: Firestore,
    input: { location: string; category: string }
): Promise<Assignee> {
    const loc = norm(input.location);
    const cat = norm(input.category);

    // 1) match by location
    try {
        if (loc) {
            const q1 = query(
                collection(db, "users"),
                where("role", "==", "maintainer"),
                where("locations", "array-contains", loc),
                limit(1)
            );
            const s1 = await getDocs(q1);
            if (!s1.empty) {
                const d = s1.docs[0];
                const m = d.data() as MaintainerProfile;
                return {
                    assignedMaintainerUid: d.id,
                    assignedMaintainerName: m.name || "Maintainer",
                    collectionPoint: m.collectionPoint || "Maintainer Office",
                    officeHours: m.officeHours || "10:00 AM – 4:00 PM",
                };
            }
        }
    } catch {
        // ignore and try category match
    }

    // 2) match by category
    try {
        if (cat) {
            const q2 = query(
                collection(db, "users"),
                where("role", "==", "maintainer"),
                where("categories", "array-contains", cat),
                limit(1)
            );
            const s2 = await getDocs(q2);
            if (!s2.empty) {
                const d = s2.docs[0];
                const m = d.data() as MaintainerProfile;
                return {
                    assignedMaintainerUid: d.id,
                    assignedMaintainerName: m.name || "Maintainer",
                    collectionPoint: m.collectionPoint || "Maintainer Office",
                    officeHours: m.officeHours || "10:00 AM – 4:00 PM",
                };
            }
        }
    } catch {
        // ignore
    }

    // 3) fallback
    return fallbackCentral();
}
