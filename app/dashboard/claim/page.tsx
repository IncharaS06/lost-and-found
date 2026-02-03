// app/dashboard/claim/page.tsx
import ClaimInner from "./ClaimInner";

export default function Page({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const typeRaw = searchParams?.type;
  const idRaw = searchParams?.id;

  const type = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  return <ClaimInner type={type} id={id} />;
}
