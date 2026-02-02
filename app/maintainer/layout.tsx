import DisabledGuard from "../components/DisabledGuard";

export default function MaintainerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <DisabledGuard />
            {children}
        </>
    );
}
