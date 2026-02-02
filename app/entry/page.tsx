"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EntryPage() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push("/auth");
        }, 2000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">

            {/* App Title */}
            <h1 className="text-white text-3xl font-bold tracking-wide mb-2">
                Lost & Found
            </h1>

            {/* Tagline */}
            <p className="text-gray-400 text-sm mb-6">
                Find what’s yours. Return what’s not.
            </p>

            {/* GIF */}
            <div className="w-64 h-64 sm:w-72 sm:h-72">
                <Image
                    src="/LOSTFOUND.gif"
                    alt="Lost and Found Entry"
                    width={300}
                    height={300}
                    className="object-contain"
                    priority
                />
            </div>

            {/* Sub text */}
            <p className="text-gray-500 text-xs mt-6 animate-pulse">
                Loading…
            </p>
        </div>
    );
}
