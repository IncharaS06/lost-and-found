// app/maintainer/claim/page.tsx
import MaintainerClaimInner from "./ClaimInner";

export default function Page({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const idRaw = searchParams?.id;
  const claimId = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  return <MaintainerClaimInner claimId={claimId || ""} />;
}
