import { AdvisorDashboard } from "@/features/advisor-dashboard";
import type { AppRole } from "@/lib/auth-context";

export function StaffDashboard({ role }: { role: AppRole }) {
  const titleMap: Record<string, string> = { hod: "HOD", dean: "Dean", vp: "Vice Principal" };
  return <AdvisorDashboard stageFilter={role} title={titleMap[role] ?? role} />;
}