import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Plus, Trash2, QrCode as QrIcon } from "lucide-react";
import { analyzeLeaveRisk } from "@/lib/ai.functions";
import { buildWorkflow } from "@/lib/workflow";

type Category = { id: string; name: string };
type Slot = { start: string; end: string };
type Request = {
  id: string; reason: string; status: string; current_stage: string;
  start_date: string; end_date: string; ai_risk_score: number | null;
  ai_is_emergency: boolean | null; ai_risk_explanation: string | null;
  category_id: string;
};
type Pass = { id: string; qr_token: string; manual_code: string; valid_from: string; valid_until: string; active: boolean };

export function StudentDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("apply");
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // profile editor
  const [editingProfile, setEditingProfile] = useState(false);

  // form state
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [slots, setSlots] = useState<Slot[]>([{ start: "", end: "" }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: c }, { data: r }, { data: pa }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("leave_categories").select("id,name").order("name"),
        supabase.from("leave_requests").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("gate_passes").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      setCategories(c ?? []);
      setRequests((r as any) ?? []);
      setPasses((pa as any) ?? []);
      if (c?.[0]) setCategoryId(c[0].id);
    })();
  }, [user, refreshKey]);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const update = {
      full_name: String(fd.get("full_name") || profile.full_name),
      roll_number: String(fd.get("roll_number") || ""),
      year: Number(fd.get("year") || 1),
      department: String(fd.get("department") || ""),
      parent_phone: String(fd.get("parent_phone") || ""),
      cgpa: Number(fd.get("cgpa") || 0),
      attendance_pct: Number(fd.get("attendance_pct") || 0),
      hostel_resident: fd.get("hostel_resident") === "on",
      placement_eligible: fd.get("placement_eligible") === "on",
    };
    const { error } = await supabase.from("profiles").update(update).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    setEditingProfile(false);
    setRefreshKey((k) => k + 1);
  }

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !reason || slots.some(s => !s.start || !s.end)) {
      toast.error("Fill all fields");
      return;
    }
    setSubmitting(true);
    try {
      const starts = slots.map(s => new Date(s.start).getTime());
      const ends = slots.map(s => new Date(s.end).getTime());
      const start_date = new Date(Math.min(...starts)).toISOString().slice(0, 10);
      const end_date = new Date(Math.max(...ends)).toISOString().slice(0, 10);

      // AI analysis
      const { count: pastApproved } = await supabase.from("leave_requests")
        .select("*", { count: "exact", head: true }).eq("student_id", user!.id).eq("status", "approved");
      const { count: pastRejected } = await supabase.from("leave_requests")
        .select("*", { count: "exact", head: true }).eq("student_id", user!.id).eq("status", "rejected");

      const ai = await analyzeLeaveRisk({
        data: {
          reason,
          category: categories.find(c => c.id === categoryId)?.name ?? "",
          startDate: start_date, endDate: end_date,
          cgpa: profile?.cgpa ? Number(profile.cgpa) : null,
          attendancePct: profile?.attendance_pct ? Number(profile.attendance_pct) : null,
          pastLeaveCount: pastApproved ?? 0,
          pastRejectedCount: pastRejected ?? 0,
        },
      });

      const chain = buildWorkflow({
        year: profile?.year ?? null,
        hostel_resident: profile?.hostel_resident ?? null,
        placement_eligible: profile?.placement_eligible ?? null,
      }, ai.isEmergency);

      const { data: req, error } = await supabase.from("leave_requests").insert({
        student_id: user!.id,
        category_id: categoryId, reason, destination, start_date, end_date,
        current_stage: chain[0],
        ai_risk_score: ai.riskScore,
        ai_is_emergency: ai.isEmergency,
        ai_risk_explanation: ai.explanation,
      }).select().single();
      if (error) throw error;

      await supabase.from("leave_slots").insert(
        slots.map(s => ({
          request_id: req!.id,
          slot_start: new Date(s.start).toISOString(),
          slot_end: new Date(s.end).toISOString(),
        }))
      );

      toast.success(ai.isEmergency ? "Emergency detected — fast-tracked!" : "Leave submitted");
      setReason(""); setDestination(""); setSlots([{ start: "", end: "" }]);
      setRefreshKey(k => k + 1);
      setTab("my");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setSubmitting(false); }
  }

  if (!profile) return <div>Loading…</div>;

  // First time: prompt profile fill
  if (!profile.roll_number || editingProfile) {
    return (
      <Card className="max-w-xl">
        <CardHeader><CardTitle>Complete your profile</CardTitle>
          <CardDescription>Needed for workflow routing and AI risk analysis.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-3">
            <div><Label>Full name</Label><Input name="full_name" defaultValue={profile.full_name} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Roll number</Label><Input name="roll_number" defaultValue={profile.roll_number ?? ""} required /></div>
              <div><Label>Year</Label><Input name="year" type="number" min={1} max={5} defaultValue={profile.year ?? 1} /></div>
            </div>
            <div><Label>Department</Label><Input name="department" defaultValue={profile.department ?? ""} /></div>
            <div><Label>Parent phone</Label><Input name="parent_phone" defaultValue={profile.parent_phone ?? ""} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CGPA</Label><Input name="cgpa" type="number" step="0.01" min={0} max={10} defaultValue={profile.cgpa ?? ""} /></div>
              <div><Label>Attendance %</Label><Input name="attendance_pct" type="number" min={0} max={100} defaultValue={profile.attendance_pct ?? ""} /></div>
            </div>
            <div className="flex items-center gap-3"><Switch name="hostel_resident" defaultChecked={profile.hostel_resident} /><Label>Hostel resident</Label></div>
            <div className="flex items-center gap-3"><Switch name="placement_eligible" defaultChecked={profile.placement_eligible} /><Label>Placement eligible</Label></div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="apply">Apply</TabsTrigger>
        <TabsTrigger value="my">My Requests ({requests.length})</TabsTrigger>
        <TabsTrigger value="pass">Gate Pass</TabsTrigger>
        <TabsTrigger value="profile">Profile</TabsTrigger>
      </TabsList>

      <TabsContent value="apply">
        <Card>
          <CardHeader><CardTitle>Apply for leave</CardTitle>
            <CardDescription>AI will assess urgency and risk automatically.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={submitLeave} className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Destination</Label><Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Home / hospital / city" /></div>
              <div><Label>Reason</Label><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} required /></div>
              <div>
                <Label>Time slots (multi-slot supported)</Label>
                <div className="space-y-2">
                  {slots.map((s, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <Input type="datetime-local" value={s.start} onChange={e => {
                        const ns = [...slots]; ns[i].start = e.target.value; setSlots(ns);
                      }} />
                      <span className="pb-2">→</span>
                      <Input type="datetime-local" value={s.end} onChange={e => {
                        const ns = [...slots]; ns[i].end = e.target.value; setSlots(ns);
                      }} />
                      {slots.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setSlots([...slots, { start: "", end: "" }])}>
                    <Plus className="size-4 mr-1" /> Add slot
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={submitting}>{submitting ? "Analyzing & submitting…" : "Submit"}</Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="my">
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-muted-foreground">No requests yet.</p>}
          {requests.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="font-medium">{categories.find(c => c.id === r.category_id)?.name}</div>
                    <div className="text-sm text-muted-foreground">{r.start_date} → {r.end_date}</div>
                    <p className="text-sm mt-1">{r.reason}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                      {r.status}
                    </Badge>
                    {r.ai_is_emergency && <Badge variant="destructive">Emergency</Badge>}
                    {r.status === "pending" && <span className="text-xs text-muted-foreground">@ {r.current_stage}</span>}
                  </div>
                </div>
                {r.ai_risk_explanation && (
                  <p className="text-xs bg-muted p-2 rounded">
                    <b>AI ({r.ai_risk_score}/100):</b> {r.ai_risk_explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="pass">
        <div className="grid gap-4 md:grid-cols-2">
          {passes.length === 0 && <p className="text-muted-foreground">No active passes. They appear after final approval.</p>}
          {passes.map(p => <GatePassCard key={p.id} pass={p} />)}
        </div>
      </TabsContent>

      <TabsContent value="profile">
        <Card><CardContent className="p-6 space-y-2">
          <div><b>Name:</b> {profile.full_name}</div>
          <div><b>Roll:</b> {profile.roll_number}</div>
          <div><b>Year:</b> {profile.year} • <b>Dept:</b> {profile.department}</div>
          <div><b>CGPA:</b> {profile.cgpa} • <b>Attendance:</b> {profile.attendance_pct}%</div>
          <div><b>Hostel:</b> {profile.hostel_resident ? "Yes" : "No"} • <b>Placement-eligible:</b> {profile.placement_eligible ? "Yes" : "No"}</div>
          <Button variant="outline" onClick={() => setEditingProfile(true)}>Edit</Button>
        </CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}

function GatePassCard({ pass }: { pass: Pass }) {
  const [qrData, setQrData] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(pass.qr_token, { width: 240 }).then(setQrData);
  }, [pass.qr_token]);
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><QrIcon className="size-4" /> Gate Pass</CardTitle>
        <CardDescription>Valid {new Date(pass.valid_from).toLocaleString()} → {new Date(pass.valid_until).toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-3">
        {qrData && <img src={qrData} alt="QR" className="mx-auto rounded border" />}
        <div>
          <div className="text-xs text-muted-foreground">Manual code</div>
          <div className="font-mono text-2xl tracking-widest">{pass.manual_code}</div>
        </div>
        <Badge variant={pass.active ? "default" : "secondary"}>{pass.active ? "Active" : "Inactive"}</Badge>
      </CardContent>
    </Card>
  );
}