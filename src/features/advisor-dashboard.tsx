import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mic, Square, Phone } from "lucide-react";
import { buildWorkflow, nextStage, genManualCode, genQrToken } from "@/lib/workflow";
import type { AppRole } from "@/lib/auth-context";

export function AdvisorDashboard({ stageFilter = "advisor" as AppRole, title = "Advisor" }: { stageFilter?: AppRole; title?: string } = {}) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("leave_requests")
      .select("*, profiles!leave_requests_student_id_fkey(*), leave_categories(name)")
      .eq("status", "pending").eq("current_stage", stageFilter)
      .order("ai_is_emergency", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setRequests(data ?? []));
  }, [user, refresh, stageFilter]);

  async function decide(req: any, action: "approve" | "reject" | "escalate", comment: string) {
    const chain = buildWorkflow({
      year: req.profiles?.year ?? null,
      hostel_resident: req.profiles?.hostel_resident ?? null,
      placement_eligible: req.profiles?.placement_eligible ?? null,
    }, req.ai_is_emergency);

    await supabase.from("approval_history").insert({
      request_id: req.id, approver_id: user!.id, stage: req.current_stage, action, comment,
    });

    if (action === "reject") {
      await supabase.from("leave_requests").update({ status: "rejected" }).eq("id", req.id);
      toast.success("Rejected");
    } else if (action === "escalate") {
      const next = nextStage(chain, req.current_stage as AppRole) ?? "hod";
      await supabase.from("leave_requests").update({ current_stage: next, status: "escalated" }).eq("id", req.id);
      await supabase.from("leave_requests").update({ status: "pending" }).eq("id", req.id);
      toast.success(`Escalated to ${next}`);
    } else {
      const next = nextStage(chain, req.current_stage as AppRole);
      if (next) {
        await supabase.from("leave_requests").update({ current_stage: next }).eq("id", req.id);
        toast.success(`Forwarded to ${next}`);
      } else {
        // Final approval → issue gate pass
        await supabase.from("leave_requests").update({ status: "approved" }).eq("id", req.id);
        await supabase.from("gate_passes").insert({
          request_id: req.id,
          student_id: req.student_id,
          qr_token: genQrToken(),
          manual_code: genManualCode(),
          valid_from: req.start_date,
          valid_until: new Date(new Date(req.end_date).getTime() + 86400000).toISOString(),
        });
        toast.success("Approved & gate pass issued");
      }
    }
    setRefresh(k => k + 1);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title} — pending approvals ({requests.length})</h2>
      {requests.length === 0 && <p className="text-muted-foreground">No pending requests at this stage.</p>}
      {requests.map(r => <ApprovalCard key={r.id} req={r} onDecide={decide} />)}
    </div>
  );
}

function ApprovalCard({ req, onDecide }: { req: any; onDecide: (r: any, a: any, c: string) => Promise<void> }) {
  const [comment, setComment] = useState("");
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const p = req.profiles ?? {};

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecorder(mr);
      setRecording(true);
    } catch { toast.error("Mic permission denied"); }
  }
  function stopRec() { recorder?.stop(); setRecording(false); }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{p.full_name} ({p.roll_number}) — {req.leave_categories?.name}</span>
          <div className="flex gap-2">
            {req.ai_is_emergency && <Badge variant="destructive">Emergency</Badge>}
            {req.ai_risk_score != null && (
              <Badge variant={req.ai_risk_score > 60 ? "destructive" : req.ai_risk_score > 30 ? "secondary" : "default"}>
                Risk {req.ai_risk_score}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          <div><b>Dates:</b> {req.start_date} → {req.end_date}</div>
          <div><b>CGPA:</b> {p.cgpa ?? "—"} • <b>Attendance:</b> {p.attendance_pct ?? "—"}%</div>
          <div><b>Year:</b> {p.year ?? "—"} • <b>Hostel:</b> {p.hostel_resident ? "Y" : "N"}</div>
        </div>
        <p className="text-sm bg-muted rounded p-2"><b>Reason:</b> {req.reason}</p>
        {req.ai_risk_explanation && (
          <p className="text-xs bg-accent/10 rounded p-2"><b>AI:</b> {req.ai_risk_explanation}</p>
        )}
        <div className="border rounded p-2 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium"><Phone className="size-4" /> Parent call recording</div>
          <div className="flex items-center gap-2">
            {!recording
              ? <Button size="sm" variant="outline" onClick={startRec}><Mic className="size-4 mr-1" /> Record</Button>
              : <Button size="sm" variant="destructive" onClick={stopRec}><Square className="size-4 mr-1" /> Stop</Button>}
            {p.parent_phone && <span className="text-xs text-muted-foreground">Parent: {p.parent_phone}</span>}
          </div>
          {audioUrl && <audio controls src={audioUrl} className="w-full h-9" />}
        </div>
        <Textarea placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => onDecide(req, "approve", comment)}>Approve / Forward</Button>
          <Button variant="secondary" onClick={() => onDecide(req, "escalate", comment)}>Escalate</Button>
          <Button variant="destructive" onClick={() => onDecide(req, "reject", comment)}>Reject</Button>
        </div>
      </CardContent>
    </Card>
  );
}