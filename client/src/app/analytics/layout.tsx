import { AuthProvider } from "@/contexts/AuthContext";
import DashboardShell from "@/components/DashboardShell";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
