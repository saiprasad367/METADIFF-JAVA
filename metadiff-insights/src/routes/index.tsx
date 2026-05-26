import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, SectionHeader, Button } from "@/components/AppShell";
import {
  TrendingUp, TrendingDown, ArrowUpRight, Database, GitCompareArrows,
  ShieldAlert, GitCommit, Plus, Download, Activity, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { fetchDashboardMetrics } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · MetaDiff" },
      { name: "description", content: "Operational overview of metadata snapshots, diffs and deployment risk." },
    ],
  }),
  component: DashboardPage,
});

// Risk Constellation: deployments as nodes, position by category, size by risk
const nodes = [
  { id: "DEP-2104", x: 18, y: 22, r: 22, risk: 86, cat: "Profiles", label: "Sales Profile" },
  { id: "DEP-2105", x: 35, y: 35, r: 12, risk: 41, cat: "Objects", label: "Account.cls" },
  { id: "DEP-2106", x: 55, y: 18, r: 16, risk: 58, cat: "Permissions", label: "PermSet.A" },
  { id: "DEP-2107", x: 72, y: 30, r: 9, risk: 22, cat: "Fields", label: "Lead.email__c" },
  { id: "DEP-2108", x: 82, y: 55, r: 18, risk: 67, cat: "Classes", label: "OrderTrigger" },
  { id: "DEP-2109", x: 62, y: 65, r: 26, risk: 91, cat: "Profiles", label: "Admin Profile" },
  { id: "DEP-2110", x: 40, y: 72, r: 11, risk: 34, cat: "Fields", label: "Opp.stage" },
  { id: "DEP-2111", x: 22, y: 58, r: 14, risk: 49, cat: "Classes", label: "QuoteCalc" },
  { id: "DEP-2112", x: 50, y: 48, r: 8, risk: 18, cat: "Fields", label: "Contact.tier" },
];
const edges: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[1,5],[5,6],[6,7],[7,1],[8,1],[5,4]];

function HeroMetric({ m }: { m: any }) {
  const Icon = m.icon;
  return (
    <Card className="p-5 hover:border-foreground/20 transition-colors">
      <div className="flex items-center justify-between">
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{m.label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-3xl font-bold tabular-nums">{m.value}</div>
        <div className={`mono text-[11px] flex items-center gap-0.5 ${m.up ? "text-foreground" : "text-muted-foreground"}`}>
          {m.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {m.delta}
        </div>
      </div>
      <Sparkline up={m.up} />
      <div className="mt-2 text-[11px] text-muted-foreground">{m.sub}</div>
    </Card>
  );
}

function Sparkline({ up }: { up: boolean }) {
  const pts = up
    ? [22,18,20,15,17,12,14,8,10,6]
    : [10,12,9,14,11,16,13,18,15,20];
  const d = pts.map((y, i) => `${i === 0 ? "M" : "L"} ${i * 10} ${y}`).join(" ");
  return (
    <svg viewBox="0 0 90 24" className="mt-3 w-full h-8">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.25" className="text-foreground" />
      <path d={`${d} L 90 24 L 0 24 Z`} fill="currentColor" className="text-foreground/5" />
    </svg>
  );
}

function ConstellationMap() {
  return (
    <Card className="p-5">
      <SectionHeader
        kicker="Signature visualization"
        title="Deployment Health Radar"
        action={<Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />Export</Button>}
      />
      <p className="text-[12px] text-muted-foreground mb-3">
        Each node is a live deployment. Size encodes risk score, position groups by component category, lines reveal dependencies.
      </p>
      <div className="relative rounded-md border border-hairline bg-background dot-bg overflow-hidden" style={{ aspectRatio: "16/8" }}>
        <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {edges.map(([a, b], i) => (
            <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
              stroke="currentColor" className="text-foreground/15" strokeWidth="0.2" strokeDasharray="0.6 0.6" />
          ))}
          {nodes.map((n) => {
            const tone = n.risk > 70 ? "fill-foreground" : n.risk > 45 ? "fill-foreground/60" : "fill-foreground/25";
            const stroke = n.risk > 70 ? "stroke-foreground" : "stroke-foreground/40";
            return (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={n.r / 8 + 1.5} className={`${tone} ${stroke}`} strokeWidth="0.25" />
                <circle cx={n.x} cy={n.y} r={n.r / 8 + 3} fill="none" className="stroke-foreground/15" strokeWidth="0.15" />
              </g>
            );
          })}
        </svg>
        {nodes.map((n) => (
          <div key={n.id} className="absolute -translate-x-1/2 mono text-[9px] uppercase tracking-wider text-muted-foreground pointer-events-none"
            style={{ left: `${n.x}%`, top: `calc(${n.y}% + 18px)` }}>
            {n.label}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <Legend tone="bg-foreground" label="Critical · risk > 70" />
        <Legend tone="bg-foreground/60" label="Elevated · 45–70" />
        <Legend tone="bg-foreground/25" label="Stable · < 45" />
        <div className="ml-auto mono text-[10px]">9 ACTIVE DEPLOYMENTS · UPDATED 12s AGO</div>
      </div>
    </Card>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
      <span>{label}</span>
    </div>
  );
}

const activity = [
  { t: "12s ago", kind: "DIFF", title: "Diff generated · SNAP-2104 → SNAP-2105", meta: "47 changes detected · risk 67" },
  { t: "4m ago", kind: "RISK", title: "Risk recalculated for Admin Profile", meta: "raised from 71 → 86" },
  { t: "18m ago", kind: "SNAP", title: "Snapshot created · prod-org-001", meta: "fingerprint c7a8e1…" },
  { t: "1h ago", kind: "COMMIT", title: "Commit a7f1b22 stored", meta: "release/2026-05-26 · 32 files" },
  { t: "3h ago", kind: "DIFF", title: "Diff generated · SNAP-2098 → SNAP-2102", meta: "12 changes detected · risk 18" },
];

function ActivityTimeline() {
  return (
    <Card className="p-5 h-full">
      <SectionHeader kicker="Operations log" title="Recent activity" action={<Button variant="ghost" size="sm">View all<ArrowUpRight className="h-3.5 w-3.5" /></Button>} />
      <ol className="relative ml-2 border-l border-hairline">
        {activity.map((a, i) => (
          <li key={i} className="pl-5 pb-5 last:pb-0 relative">
            <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-background border border-foreground" />
            <div className="flex items-center gap-2 text-[11px] mono text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded border border-hairline">{a.kind}</span>
              <span>{a.t}</span>
            </div>
            <div className="mt-1 text-[13px] font-medium">{a.title}</div>
            <div className="text-[12px] text-muted-foreground">{a.meta}</div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const services = [
  { name: "Database", uptime: "99.99%", status: "ok", latency: "12ms" },
  { name: "Git Service", uptime: "99.97%", status: "ok", latency: "84ms" },
  { name: "Diff Engine", uptime: "99.92%", status: "ok", latency: "210ms" },
  { name: "API Gateway", uptime: "99.85%", status: "degraded", latency: "418ms" },
];

function SystemHealth() {
  return (
    <Card className="p-5">
      <SectionHeader kicker="Infrastructure" title="System health" />
      <div className="divide-y divide-hairline -mx-1">
        {services.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-1 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              {s.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-foreground" /> : <AlertTriangle className="h-4 w-4 text-foreground" />}
              <div>
                <div className="text-[13px] font-medium">{s.name}</div>
                <div className="text-[11px] text-muted-foreground mono">{s.status === "ok" ? "OPERATIONAL" : "DEGRADED"} · {s.uptime}</div>
              </div>
            </div>
            <div className="mono text-[11px] text-muted-foreground tabular-nums">{s.latency}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardMetrics().then(setData);
  }, []);

  const displayMetrics = data ? [
    { label: "Total Snapshots", value: data.totalSnapshots.toLocaleString(), delta: data.deploySuccessDelta, up: data.deploySuccessUp, icon: Database, sub: `Success rate: ${data.deploySuccess}` },
    { label: "Diffs Generated", value: data.totalDiffs.toLocaleString(), delta: data.riskDelta, up: data.riskUp, icon: GitCompareArrows, sub: "Computed structural comparisons" },
    { label: "Risky Deployments", value: data.riskyDeployments.toString(), delta: data.riskDelta, up: data.riskUp, icon: ShieldAlert, sub: `Average Risk: ${data.avgRisk}` },
    { label: "Git Commits", value: data.totalCommits.toLocaleString(), delta: "+24.0%", up: true, icon: GitCommit, sub: "Versioned repository snapshots" },
  ] : [
    { label: "Total Snapshots", value: "...", delta: "", up: true, icon: Database, sub: "" },
    { label: "Diffs Generated", value: "...", delta: "", up: true, icon: GitCompareArrows, sub: "" },
    { label: "Risky Deployments", value: "...", delta: "", up: false, icon: ShieldAlert, sub: "" },
    { label: "Git Commits", value: "...", delta: "", up: true, icon: GitCommit, sub: "" },
  ];

  return (
    <AppShell
      breadcrumb="WORKSPACE / DASHBOARD"
      title="Operational overview"
      description="Live metrics across snapshots, diffs and deployment risk for the Acme Platform workspace."
      actions={
        <>
          <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" />Export report</Button>
          <Button size="sm"><Plus className="h-3.5 w-3.5" />New snapshot</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {displayMetrics.map((m) => <HeroMetric key={m.label} m={m} />)}
      </div>


      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2"><ConstellationMap /></div>
        <ActivityTimeline />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SystemHealth />
        <Card className="p-5 lg:col-span-2">
          <SectionHeader kicker="Throughput" title="Diff engine load (24h)" action={<span className="mono text-[10px] text-muted-foreground">REQ/MIN</span>} />
          <BarSeries />
        </Card>
      </div>
    </AppShell>
  );
}

function BarSeries() {
  const data = [12,18,14,22,28,24,30,38,42,36,44,48,52,46,40,52,58,62,54,48,44,38,30,22];
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1.5 h-40">
      {data.map((v, i) => (
        <div key={i} className="flex-1 bg-foreground/85 hover:bg-foreground transition-colors rounded-t-sm" style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  );
}
