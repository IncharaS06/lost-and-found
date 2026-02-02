"use client";

import { Suspense } from "react";
import ClaimInner from "./ClaimInner";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white/60 text-sm">
          Loading…
        </div>
      }
    >
      <ClaimInner />
    </Suspense>
  );
}
