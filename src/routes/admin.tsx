import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Tirumala Guide" },
      { name: "description", content: "Restricted area for Tirumala Guide administrators." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — Tirumala Guide" },
      { property: "og:description", content: "Restricted administrator area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Access = "checking" | "admin" | "claimable" | "denied";

function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const checkAccess = async (s: Session) => {
    setAccess("checking");
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: s.user.id, _role: "admin" });
    if (isAdmin) return setAccess("admin");
    const { data: exists } = await supabase.rpc("admin_exists");
    setAccess(exists ? "denied" : "claimable");
  };

  useEffect(() => {
    if (session) void checkAccess(session);
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-aubergine-grad text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex min-h-11 items-center gap-2 font-display text-lg">
            <ShieldCheck className="size-5 text-accent" aria-hidden /> Tirumala Guide · Admin
          </Link>
          {session ? (
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => supabase.auth.signOut()}>
              <LogOut className="size-4" /> Sign out
            </Button>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {session === undefined ? (
          <Centered><Loader2 className="size-6 animate-spin" /></Centered>
        ) : !session ? (
          <AuthForm />
        ) : access === "checking" ? (
          <Centered><Loader2 className="size-6 animate-spin" /></Centered>
        ) : access === "claimable" ? (
          <Centered>
            <div className="max-w-md rounded-2xl bg-card p-6 text-center shadow-soft ring-1 ring-border">
              <h1 className="text-2xl text-primary">First-time setup</h1>
              <p className="mt-2 text-sm text-muted-foreground">No administrator exists yet. The first signed-in account can claim the admin role. After that, nobody else can.</p>
              <Button className="mt-4 min-h-12 w-full" onClick={async () => {
                const { data, error } = await supabase.rpc("claim_first_admin");
                if (error || !data) toast.error("Could not claim admin role");
                void checkAccess(session);
              }}>Make me the administrator</Button>
            </div>
          </Centered>
        ) : access === "denied" ? (
          <Centered>
            <div className="max-w-md rounded-2xl bg-card p-6 text-center shadow-soft ring-1 ring-border">
              <h1 className="text-2xl text-primary">No access</h1>
              <p className="mt-2 text-sm text-muted-foreground">Signed in as {session.user.email}, but this account is not an administrator.</p>
            </div>
          </Centered>
        ) : (
          <AdminPanel />
        )}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[50vh] place-items-center">{children}</div>;
}

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  };

  return (
    <Centered>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 shadow-soft ring-1 ring-border">
        <h1 className="text-2xl text-primary">{mode === "in" ? "Administrator sign in" : "Create account"}</h1>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
        </div>
        <Button type="submit" disabled={busy} className="min-h-12 w-full">{busy ? <Loader2 className="size-4 animate-spin" /> : mode === "in" ? "Sign in" : "Sign up"}</Button>
        <button type="button" className="min-h-11 w-full text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
        <p className="text-xs text-muted-foreground">Signing in does not grant editing rights. Only accounts with the administrator role can change content.</p>
      </form>
    </Centered>
  );
}
