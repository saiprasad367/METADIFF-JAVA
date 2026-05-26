import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, SectionHeader, Button } from "@/components/AppShell";
import { User, Bell, Shield, Key, GitBranch, Database, Copy, Plus } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · MetaDiff" },
      { name: "description", content: "Workspace settings: profile, notifications, security, API keys and integrations." },
    ],
  }),
  component: SettingsPage,
});

const sections = [
  { id: "profile", icon: User,     label: "Profile" },
  { id: "notif",   icon: Bell,     label: "Notifications" },
  { id: "sec",     icon: Shield,   label: "Security" },
  { id: "keys",    icon: Key,      label: "API keys" },
  { id: "git",     icon: GitBranch,label: "Git integration" },
  { id: "db",      icon: Database, label: "Database" },
];

function SettingsPage() {
  return (
    <AppShell
      breadcrumb="WORKSPACE / SETTINGS"
      title="Workspace settings"
      description="Configure profile, security, integrations and infrastructure."
    >
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="p-2 h-fit sticky top-20">
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 px-2.5 py-2 rounded text-[13px] hover:bg-surface">
              <s.icon className="h-4 w-4 text-muted-foreground" /> {s.label}
            </a>
          ))}
        </Card>

        <div className="space-y-4">
          <Card className="p-5" id="profile">
            <SectionHeader kicker="Profile" title="User profile" />
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-full bg-foreground text-background grid place-items-center font-display text-lg font-bold">RV</div>
              <div>
                <div className="text-[14px] font-semibold">Riya Verma</div>
                <div className="mono text-[11px] text-muted-foreground">SRE LEAD · ACME PLATFORM</div>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">Change avatar</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Display name" value="Riya Verma" />
              <Field label="Email" value="riya.v@acme.io" />
              <Field label="Timezone" value="Asia/Kolkata (UTC+05:30)" />
              <Field label="Role" value="Owner" />
            </div>
          </Card>

          <Card className="p-5" id="notif">
            <SectionHeader kicker="Notifications" title="Alert preferences" />
            <Toggle label="Risk score crosses high threshold" desc="Email + in-app alert when score ≥ 70" on />
            <Toggle label="New snapshot uploaded" desc="In-app only" on />
            <Toggle label="Diff completion" desc="Notify on diff jobs finishing" />
            <Toggle label="Weekly digest" desc="Monday 09:00 in your timezone" on />
          </Card>

          <Card className="p-5" id="sec">
            <SectionHeader kicker="Security" title="Authentication" />
            <Toggle label="Two-factor authentication" desc="Required for org owners" on />
            <Toggle label="SSO enforcement" desc="SAML 2.0 via Okta" on />
            <Toggle label="Session timeout" desc="Sign out after 8h of inactivity" />
          </Card>

          <Card className="p-5" id="keys">
            <SectionHeader kicker="API keys" title="Programmatic access" action={<Button size="sm"><Plus className="h-3.5 w-3.5" />New key</Button>} />
            <div className="divide-y divide-hairline">
              {[{n: "ci-pipeline", c: "Created Apr 12 · Last used 4m ago"}, {n: "data-warehouse", c: "Created Jan 02 · Last used 1h ago"}].map(k => (
                <div key={k.n} className="py-3 flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium">{k.n}</div>
                    <div className="mono text-[11px] text-muted-foreground">md_live_••••••••••wQ7p · {k.c}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm">Revoke</Button>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5" id="git">
              <SectionHeader kicker="Integration" title="Git provider" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 grid place-items-center border border-hairline rounded"><GitBranch className="h-5 w-5" /></div>
                <div>
                  <div className="text-[13px] font-medium">GitHub Enterprise</div>
                  <div className="mono text-[11px] text-muted-foreground">acme-engineering / metadiff-snapshots · main</div>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">Reconfigure</Button>
              </div>
            </Card>

            <Card className="p-5" id="db">
              <SectionHeader kicker="Infrastructure" title="Database" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 grid place-items-center border border-hairline rounded"><Database className="h-5 w-5" /></div>
                <div>
                  <div className="text-[13px] font-medium">Postgres 16 · primary</div>
                  <div className="mono text-[11px] text-muted-foreground">db-prod-eu-west-1 · 99.99% uptime</div>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">Manage</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <div className="mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{label}</div>
      <input defaultValue={value} className="w-full h-9 px-3 rounded-md border border-hairline bg-elevated text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/30" />
    </label>
  );
}

function Toggle({ label, desc, on = false }: { label: string; desc: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-hairline last:border-b-0">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11.5px] text-muted-foreground">{desc}</div>
      </div>
      <button className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-foreground" : "bg-surface-strong"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${on ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  );
}
