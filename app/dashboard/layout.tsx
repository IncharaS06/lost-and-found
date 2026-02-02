import DisabledGuard from "../components/DisabledGuard";

export default function DashboardLayout({
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
