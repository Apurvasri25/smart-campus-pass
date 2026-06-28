import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, FileCheck, AlertTriangle, DoorOpen, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { seedDemoData, DEMO_CREDENTIALS } from "@/lib/seed.functions";
import { toast } from "sonner";

export function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, requests: 0, emergencies: 0, logs: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);
  const seed = useServerFn(seedDemoData);

  async function runSeed() {
    setSeeding(true);
    try {
      const res: any = await seed();
      toast.success(`Seeded ${res.users} demo users + sample leaves`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e?.message ?? "Seed failed");
    } finally { setSeeding(false); }
  }

  useEffect(() => {
    (async () => {
      const [u, r, e, l, ulist] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("leave_requests").select("*", { count: "exact", head: true }),
        supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("ai_is_emergency", true),
        supabase.from("gate_logs").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*, user_roles(role)").limit(50),
      ]);
      setStats({ users: u.count ?? 0, requests: r.count ?? 0, emergencies: e.count ?? 0, logs: l.count ?? 0 });
      setUsers(ulist.data ?? []);
    })();
  }, []);

  const cards = [
    { label: "Users", value: stats.users, icon: Users },
    { label: "Leave requests", value: stats.requests, icon: FileCheck },
    { label: "Emergencies", value: stats.emergencies, icon: AlertTriangle },
    { label: "Gate events", value: stats.logs, icon: DoorOpen },
  ];

  return (
    <Tabs defaultValue="analytics">
      <TabsList>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="workflow">Workflow rules</TabsTrigger>
        <TabsTrigger value="seed">Demo data</TabsTrigger>
      </TabsList>
      <TabsContent value="analytics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(c => (
            <Card key={c.label}>
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold">{c.value}</div>
                  <div className="text-sm text-muted-foreground">{c.label}</div>
                </div>
                <c.icon className="size-8 text-primary opacity-50" />
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="users">
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.id}><CardContent className="p-3 flex justify-between">
              <div>
                <div className="font-medium">{u.full_name}</div>
                <div className="text-xs text-muted-foreground">{u.email} • {u.roll_number ?? "—"}</div>
              </div>
              <div className="flex gap-1">{(u.user_roles ?? []).map((r: any, i: number) =>
                <Badge key={i} variant="secondary" className="capitalize">{r.role}</Badge>)}</div>
            </CardContent></Card>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="workflow">
        <Card><CardHeader><CardTitle>Approval workflow rules</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>The system uses a rule-based engine that builds the approval chain dynamically per request:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>All requests start at <b>Advisor</b></li>
              <li>Hostel residents → add <b>HOD</b></li>
              <li>Placement-eligible students → add <b>Dean</b></li>
              <li>Final-year (year ≥ 4) → add <b>VP</b></li>
              <li>AI-detected emergency → fast-track to advisor only</li>
            </ul>
            <p className="text-muted-foreground mt-2">Rules live in <code>src/lib/workflow.ts</code> and are easily extended.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="seed">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="size-5" /> Seed demo data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Creates demo accounts (one per role), seeded profiles with CGPA & attendance, and a handful of sample leave requests at different approval stages.</p>
            <Button onClick={runSeed} disabled={seeding}>
              {seeding ? "Seeding…" : "Run seed"}
            </Button>
            <div>
              <div className="font-medium mb-2">Demo credentials (password <code>Demo@1234</code>):</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {DEMO_CREDENTIALS.map((c) => (
                  <div key={c.email} className="border rounded p-2">
                    <div className="font-mono text-xs">{c.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">{c.role} • {c.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}