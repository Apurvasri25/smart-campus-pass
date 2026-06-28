import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, ShieldCheck, BrainCircuit, GitBranch } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartLeave — AI Leave & Gate Pass System" },
      { name: "description", content: "AI-powered leave approval, QR gate passes, and security verification for campuses." },
      { property: "og:title", content: "SmartLeave — AI Leave & Gate Pass System" },
      { property: "og:description", content: "AI-powered leave approval, QR gate passes, and security verification for campuses." },
    ],
  }),
  component: Index,
});

function Index() {
  const features = [
    { icon: BrainCircuit, title: "AI Risk Scoring", desc: "Emergency detection + CGPA/attendance-aware decisions." },
    { icon: GitBranch, title: "Dynamic Workflows", desc: "Approval chain adapts to year, hostel and placement status." },
    { icon: QrCode, title: "QR Gate Passes", desc: "Scannable passes with manual code fallback." },
    { icon: ShieldCheck, title: "Verified Entry/Exit", desc: "Tamper-proof logs at every gate." },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShieldCheck className="size-6 text-primary" />
            SmartLeave
          </div>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl md:text-6xl font-bold tracking-tight text-foreground">
          AI-Powered Leave & Gate Pass Management
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Apply, approve, escalate and verify — all on one production-ready platform built for modern campuses.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/auth">Get started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto grid gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="p-6">
              <f.icon className="size-8 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
