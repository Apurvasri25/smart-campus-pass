import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth, primaryRole } from "@/lib/auth-context";
import { StudentDashboard } from "@/features/student-dashboard";
import { AdvisorDashboard } from "@/features/advisor-dashboard";
import { SecurityDashboard } from "@/features/security-dashboard";
import { StaffDashboard } from "@/features/staff-dashboard";
import { AdminDashboard } from "@/features/admin-dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SmartLeave" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { roles } = useAuth();
  const role = primaryRole(roles);

  return (
    <AppShell>
      {role === "student" && <StudentDashboard />}
      {role === "advisor" && <AdvisorDashboard />}
      {(role === "hod" || role === "dean" || role === "vp") && <StaffDashboard role={role} />}
      {role === "security" && <SecurityDashboard />}
      {role === "admin" && <AdminDashboard />}
    </AppShell>
  );
}