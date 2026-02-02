"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const LOADER_MS = 5000; // ✅ 5 seconds

export default function RouteLoader() {
    const pathname = usePathname();

    const [show, setShow] = useState(false);
    const firstLoad = useRef(true);

    useEffect(() => {
        // ✅ Don’t block first load (so your entry page can show normally)
        if (firstLoad.current) {
            firstLoad.current = false;
            return;
        }

        setShow(true);
        const t = setTimeout(() => setShow(false), LOADER_MS);
        return () => clearTimeout(t);
    }, [pathname]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#020f08] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                {/* clean universal loader */}
                <div className="h-10 w-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
                <p className="text-green-400 text-sm tracking-wide">Loading…</p>
            </div>
        </div>
    );
}
