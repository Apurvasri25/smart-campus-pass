import type { AppRole } from "@/lib/auth-context";

export type ProfileLite = {
  year: number | null;
  hostel_resident: boolean | null;
  placement_eligible: boolean | null;
};

export function buildWorkflow(profile: ProfileLite, isEmergency: boolean): AppRole[] {
  if (isEmergency) return ["advisor"];
  const chain: AppRole[] = ["advisor"];
  if (profile.hostel_resident) chain.push("warden");
  chain.push("hod");
  if (profile.placement_eligible) chain.push("dean");
  if ((profile.year ?? 0) >= 4) chain.push("vp");
  return chain;
}

export function nextStage(chain: AppRole[], current: AppRole): AppRole | null {
  const i = chain.indexOf(current);
  if (i < 0 || i >= chain.length - 1) return null;
  return chain[i + 1];
}

export function genManualCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function genQrToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  );
}