import dynamic from "next/dynamic";

const ClaimClient = dynamic(() => import("./ClaimInner"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center text-white/60 text-sm">
      Loading…
    </div>
  ),
});

export default function Page() {
  return <ClaimClient />;
}

