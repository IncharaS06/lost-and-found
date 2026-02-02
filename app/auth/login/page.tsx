"use client";

import { Suspense } from "react";
import LoginInner from "./LoginInner";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-green-400 text-sm">Loading…</p>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
