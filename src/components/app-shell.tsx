import { type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth, primaryRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LogOut } from "lucide-react";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { user, roles, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    if (typeof window !== "undefined") navigate({ to: "/auth" });
    return null;
  }

  const role = primaryRole(roles);

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold">
            <ShieldCheck className="size-5 text-primary" />
            SmartLeave
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="capitalize">{role}</Badge>
            <span className="hidden sm:inline text-sm text-muted-foreground">{user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {title && <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>}
        {children}
      </main>
    </div>
  );
}