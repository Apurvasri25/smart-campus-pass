import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SecurityDashboard() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [direction, setDirection] = useState<"exit" | "entry">("exit");
  const [logs, setLogs] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    supabase.from("gate_logs")
      .select("*, profiles!gate_logs_student_id_fkey(full_name, roll_number)")
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setLogs(data ?? []));
  }, [refresh]);

  async function verify(by: "qr" | "code") {
    const val = by === "qr" ? token : code;
    if (!val) return toast.error("Enter value");
    const { data: pass } = await supabase.from("gate_passes")
      .select("*, profiles!gate_passes_student_id_fkey(full_name, roll_number)")
      .eq(by === "qr" ? "qr_token" : "manual_code", val)
      .eq("active", true).maybeSingle();

    if (!pass) return toast.error("Invalid or inactive pass");
    const now = new Date();
    if (now < new Date(pass.valid_from) || now > new Date(pass.valid_until)) {
      return toast.error("Pass not in valid window");
    }

    const { error } = await supabase.from("gate_logs").insert({
      pass_id: pass.id, student_id: pass.student_id, guard_id: user!.id,
      direction, verified_via: by,
    });
    if (error) return toast.error(error.message);

    const p = (pass as any).profiles;
    toast.success(`${direction.toUpperCase()} verified: ${p?.full_name} (${p?.roll_number})`);
    setCode(""); setToken("");
    setRefresh(k => k + 1);
  }

  return (
    <Tabs defaultValue="verify">
      <TabsList>
        <TabsTrigger value="verify">Verify pass</TabsTrigger>
        <TabsTrigger value="logs">Recent logs ({logs.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="verify">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>QR scan</CardTitle>
              <CardDescription>Paste/scan the QR token, or use manual code on the right.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exit">Exit</SelectItem>
                  <SelectItem value="entry">Entry</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="QR token" value={token} onChange={(e) => setToken(e.target.value)} />
              <Button onClick={() => verify("qr")} className="w-full">Verify QR</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Manual code</CardTitle>
              <CardDescription>Fallback when QR isn't scannable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="ABCD2345" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono tracking-widest" />
              <Button onClick={() => verify("code")} className="w-full">Verify Code</Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="logs">
        <div className="space-y-2">
          {logs.map(l => (
            <Card key={l.id}><CardContent className="p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{l.profiles?.full_name} ({l.profiles?.roll_number})</div>
                <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()} • via {l.verified_via}</div>
              </div>
              <Badge variant={l.direction === "exit" ? "secondary" : "default"}>{l.direction}</Badge>
            </CardContent></Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}