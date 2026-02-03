import DisabledGuard from "../components/DisabledGuard";

export default function AdminLayout({
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
