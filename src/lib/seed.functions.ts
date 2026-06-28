import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type DemoUser = {
  email: string;
  password: string;
  full_name: string;
  role: "student" | "advisor" | "warden" | "hod" | "dean" | "vp" | "security" | "admin";
  roll_number?: string;
  year?: number;
  department?: string;
  hostel_resident?: boolean;
  placement_eligible?: boolean;
  cgpa?: number;
  attendance_pct?: number;
  parent_phone?: string;
};

const DEMO_USERS: DemoUser[] = [
  { email: "admin@smartleave.demo", password: "Demo@1234", full_name: "System Admin", role: "admin" },
  { email: "advisor@smartleave.demo", password: "Demo@1234", full_name: "Dr. Anita Rao", role: "advisor", department: "CSE" },
  { email: "warden@smartleave.demo", password: "Demo@1234", full_name: "Mr. Vikram Singh", role: "warden", department: "Hostel" },
  { email: "hod@smartleave.demo", password: "Demo@1234", full_name: "Dr. Suresh Kumar", role: "hod", department: "CSE" },
  { email: "dean@smartleave.demo", password: "Demo@1234", full_name: "Dr. Meera Iyer", role: "dean", department: "Academics" },
  { email: "vp@smartleave.demo", password: "Demo@1234", full_name: "Prof. Ramesh Nair", role: "vp", department: "Administration" },
  { email: "security@smartleave.demo", password: "Demo@1234", full_name: "Gate Officer", role: "security" },
  // Students with varied profiles
  { email: "student1@smartleave.demo", password: "Demo@1234", full_name: "Arjun Sharma",
    role: "student", roll_number: "CSE21001", year: 3, department: "CSE",
    hostel_resident: true, placement_eligible: false, cgpa: 8.7, attendance_pct: 92, parent_phone: "+919876500001" },
  { email: "student2@smartleave.demo", password: "Demo@1234", full_name: "Priya Menon",
    role: "student", roll_number: "CSE20015", year: 4, department: "CSE",
    hostel_resident: true, placement_eligible: true, cgpa: 9.1, attendance_pct: 88, parent_phone: "+919876500002" },
  { email: "student3@smartleave.demo", password: "Demo@1234", full_name: "Rahul Verma",
    role: "student", roll_number: "ECE22042", year: 2, department: "ECE",
    hostel_resident: false, placement_eligible: false, cgpa: 6.4, attendance_pct: 71, parent_phone: "+919876500003" },
  { email: "student4@smartleave.demo", password: "Demo@1234", full_name: "Sneha Reddy",
    role: "student", roll_number: "CSE20088", year: 4, department: "CSE",
    hostel_resident: true, placement_eligible: true, cgpa: 8.2, attendance_pct: 85, parent_phone: "+919876500004" },
];

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Authorization: caller must be admin, OR no admin exists yet (bootstrap).
    const { data: admins } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "admin");
    const isAdmin = (admins ?? []).some((r) => r.user_id === context.userId);
    if ((admins ?? []).length > 0 && !isAdmin) {
      throw new Response("Forbidden — admin only", { status: 403 });
    }

    const created: Record<string, string> = {};
    const log: string[] = [];

    // 1) Create or fetch auth users
    for (const u of DEMO_USERS) {
      // Try to find existing first
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((x) => x.email === u.email);
      let id = existing?.id;
      if (!id) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: u.email, password: u.password, email_confirm: true,
          user_metadata: { full_name: u.full_name, role: u.role },
        });
        if (error) { log.push(`auth create failed ${u.email}: ${error.message}`); continue; }
        id = data.user!.id;
        log.push(`created auth user ${u.email}`);
      } else {
        log.push(`reusing auth user ${u.email}`);
      }
      created[u.email] = id!;

      // Upsert profile fields
      await supabaseAdmin.from("profiles").upsert({
        id, email: u.email, full_name: u.full_name,
        roll_number: u.roll_number ?? null, year: u.year ?? null,
        department: u.department ?? null,
        hostel_resident: u.hostel_resident ?? false,
        placement_eligible: u.placement_eligible ?? false,
        cgpa: u.cgpa ?? null, attendance_pct: u.attendance_pct ?? null,
        parent_phone: u.parent_phone ?? null,
      });

      // Ensure role row
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: id, role: u.role }, { onConflict: "user_id,role" }
      );
    }

    // 2) Sample leave requests for the students
    const { data: cats } = await supabaseAdmin.from("leave_categories").select("id, name");
    const catByName: Record<string, string> = {};
    (cats ?? []).forEach((c) => (catByName[c.name] = c.id));

    const today = new Date();
    const day = (offset: number) => {
      const d = new Date(today); d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };

    const samples = [
      { email: "student1@smartleave.demo", category: "Medical",
        reason: "Fever and weakness; doctor advised 2 days rest.",
        start: day(1), end: day(2), stage: "advisor", risk: 22, emergency: false,
        ai_text: "Low risk: strong CGPA 8.7 and 92% attendance; short medical leave." },
      { email: "student2@smartleave.demo", category: "Academic",
        reason: "Selected for inter-college hackathon at IIT Madras.",
        start: day(3), end: day(5), stage: "hod", risk: 18, emergency: false,
        ai_text: "Low risk: placement-eligible final-year, strong record." },
      { email: "student3@smartleave.demo", category: "Personal",
        reason: "Family function at hometown; need to travel.",
        start: day(2), end: day(4), stage: "advisor", risk: 68, emergency: false,
        ai_text: "Elevated risk: attendance 71% and CGPA 6.4 — monitor closely." },
      { email: "student4@smartleave.demo", category: "Emergency",
        reason: "Father admitted to hospital after accident — urgent travel needed.",
        start: day(0), end: day(2), stage: "advisor", risk: 35, emergency: true,
        ai_text: "Emergency detected: hospitalization keyword. Fast-track to advisor." },
    ];

    for (const s of samples) {
      const studentId = created[s.email];
      if (!studentId || !catByName[s.category]) continue;

      // Skip if a similar pending request already exists
      const { data: existing } = await supabaseAdmin.from("leave_requests")
        .select("id").eq("student_id", studentId).eq("reason", s.reason).maybeSingle();
      if (existing) { log.push(`leave exists for ${s.email}`); continue; }

      const { data: req, error } = await supabaseAdmin.from("leave_requests").insert({
        student_id: studentId, category_id: catByName[s.category],
        reason: s.reason, destination: "Hometown",
        start_date: s.start, end_date: s.end,
        status: "pending", current_stage: s.stage,
        ai_risk_score: s.risk, ai_is_emergency: s.emergency,
        ai_risk_explanation: s.ai_text,
      }).select("id").single();
      if (error) { log.push(`leave insert failed: ${error.message}`); continue; }

      await supabaseAdmin.from("leave_slots").insert({
        request_id: req!.id, slot_start: `${s.start}T08:00:00Z`, slot_end: `${s.end}T20:00:00Z`,
      });
      log.push(`seeded leave for ${s.email}`);
    }

    return { ok: true, users: Object.keys(created).length, log };
  });

export const DEMO_CREDENTIALS = DEMO_USERS.map((u) => ({
  email: u.email, password: u.password, role: u.role, name: u.full_name,
}));