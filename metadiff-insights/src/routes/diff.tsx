import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, SectionHeader, Button } from "@/components/AppShell";
import { ArrowLeftRight, Plus, Minus, Pencil, Tag, Play, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchSnapshots, createDiff, fetchDiffReport, fetchDiffVisualization } from "@/lib/api";

export const Route = createFileRoute("/diff")({
  head: () => ({
    meta: [
      { title: "Diff Analysis · MetaDiff" },
      { name: "description", content: "Compare snapshots and visualize structural metadata changes." },
    ],
  }),
  component: DiffPage,
});

// DNA-strand change stream. Each segment is one change.
const segments = Array.from({ length: 48 }, (_, i) => {
  const kinds = ["added", "removed", "modified", "unchanged"] as const;
  const weight = [0.18, 0.12, 0.22, 0.48];
  let r = Math.random(), acc = 0, k: typeof kinds[number] = "unchanged";
  for (let j = 0; j < kinds.length; j++) { acc += weight[j]; if (r < acc) { k = kinds[j]; break; } }
  return { i, k };
});

function Heat({ v }: { v: number }) {
  const alpha = (v / 100).toFixed(2);
  return (
    <div className="relative h-7 rounded border border-hairline overflow-hidden">
      <div className="absolute inset-0" style={{ background: `oklch(0.18 0 0 / ${alpha})` }} />
      <div className="relative h-full px-2 flex items-center justify-end mono text-[11px] tabular-nums" style={{ color: v > 55 ? "white" : "oklch(0.32 0 0)" }}>{v}</div>
    </div>
  );
}

function DnaStream() {
  const w = 960, h = 120;
  const cx = (i: number) => 20 + i * ((w - 40) / segments.length);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
      <path d={`M 20 60 Q ${w/2} 0 ${w-20} 60`} fill="none" stroke="currentColor" className="text-foreground/20" strokeWidth="1" strokeDasharray="6 6" />
      <path d={`M 20 60 Q ${w/2} 120 ${w-20} 60`} fill="none" stroke="currentColor" className="text-foreground/20" strokeWidth="1" strokeDasharray="6 6" />
      {segments.map((s) => {
        const x = cx(s.i);
        const top = 60 + Math.sin(s.i * 0.5) * 28;
        const bot = 60 - Math.sin(s.i * 0.5) * 28;
        const color =
          s.k === "added" ? "text-foreground" :
          s.k === "removed" ? "text-foreground/60" :
          s.k === "modified" ? "text-foreground/85" :
          "text-foreground/15";
        return (
          <g key={s.i} className={color}>
            <line x1={x} y1={top} x2={x} y2={bot} stroke="currentColor" strokeWidth={s.k === "unchanged" ? 1 : 2.5} strokeLinecap="round" />
            <circle cx={x} cy={top} r={s.k === "unchanged" ? 1.2 : 2.4} fill="currentColor" />
            <circle cx={x} cy={bot} r={s.k === "unchanged" ? 1.2 : 2.4} fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}

function SnapshotPane({ side, name }: { side: "BEFORE" | "AFTER"; name: string }) {
  const lines = side === "BEFORE"
    ? ["<Profile>", "  <userPermissions>", "    <name>ManageUsers</name>", "    <enabled>false</enabled>", "  </userPermissions>", "  <fieldPermissions>", "    <field>Account.Tier__c</field>", "    <readable>true</readable>", "  </fieldPermissions>", "</Profile>"]
    : ["<Profile>", "  <userPermissions>", "    <name>ManageUsers</name>", "    <enabled>true</enabled>", "  </userPermissions>", "  <fieldPermissions>", "    <field>Account.Tier__c</field>", "    <readable>true</readable>", "    <editable>true</editable>", "  </fieldPermissions>", "</Profile>"];
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 h-10 border-b border-hairline">
        <div className="mono text-[10px] text-muted-foreground">{side}</div>
        <div className="text-[12px] font-medium">{name}</div>
      </div>
      <pre className="font-mono text-[12px] leading-6 p-4 overflow-x-auto bg-background">
{lines.map((l, i) => {
  const mark = side === "AFTER" && (i === 3 || i === 8);
  return (
    <div key={i} className={`flex gap-3 ${mark ? "bg-foreground/5" : ""}`}>
      <span className="text-muted-foreground select-none w-6 text-right">{i + 1}</span>
      <span>{l}</span>
      {mark && <span className="mono text-[10px] ml-auto px-1 border border-foreground rounded">+</span>}
    </div>
  );
})}
      </pre>
    </Card>
  );
}

function DiffPage() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const [diffRunning, setDiffRunning] = useState(false);
  const [diffReport, setDiffReport] = useState<any>(null);
  const [vizMatrix, setVizMatrix] = useState<any[]>([]);

  useEffect(() => {
    fetchSnapshots("", 0, 50).then((data: any) => {
      const content = data.content || [];
      setSnapshots(content);
      if (content.length >= 2) {
        setBeforeId(content[1].id);
        setAfterId(content[0].id);
        handleRunDiff(content[1].id, content[0].id);
      }
    });
  }, []);

  const handleRunDiff = (bId = beforeId, aId = afterId) => {
    if (!bId || !aId) return;
    setDiffRunning(true);
    createDiff(bId, aId).then((response: any) => {
      const diffId = response.id;
      // fetch report
      fetchDiffReport(diffId).then((report) => {
        setDiffReport(report);
        setDiffRunning(false);
      });
      fetchDiffVisualization(diffId).then((viz) => {
        if (viz && viz.matrix) {
          setVizMatrix(viz.matrix);
        }
      });
    }).catch(() => {
      setDiffRunning(false);
    });
  };

  const beforeName = snapshots.find(s => s.id === beforeId)?.name || beforeId || "SNAP-BEFORE";
  const afterName = snapshots.find(s => s.id === afterId)?.name || afterId || "SNAP-AFTER";

  return (
    <AppShell
      breadcrumb="WORKSPACE / DIFF ANALYSIS"
      title="Structural diff workspace"
      description="Compare two snapshots and visualize component-level changes, dependencies and impact."
      actions={
        <>
          <select 
            value={beforeId} 
            onChange={(e) => setBeforeId(e.target.value)}
            className="h-9 px-3 rounded-md border border-hairline bg-elevated text-[13px] focus:outline-none"
          >
            <option value="">Select Before Snapshot</option>
            {snapshots.map(s => <option key={s.id} value={s.id}>{s.name} ({s.format})</option>)}
          </select>
          <select 
            value={afterId} 
            onChange={(e) => setAfterId(e.target.value)}
            className="h-9 px-3 rounded-md border border-hairline bg-elevated text-[13px] focus:outline-none"
          >
            <option value="">Select After Snapshot</option>
            {snapshots.map(s => <option key={s.id} value={s.id}>{s.name} ({s.format})</option>)}
          </select>
          <Button size="sm" onClick={() => handleRunDiff()} disabled={diffRunning}>
            {diffRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run diff
          </Button>
        </>
      }
    >
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
        <Summary icon={Plus} label="Added"     value={diffReport ? String(diffReport.addedCount) : "..."}  desc="components introduced" />
        <Summary icon={Minus} label="Removed"  value={diffReport ? String(diffReport.removedCount) : "..."}  desc="components deleted" />
        <Summary icon={Pencil} label="Modified" value={diffReport ? String(diffReport.modifiedCount) : "..."} desc="components changed" />
        <Summary icon={Tag} label="Renamed"   value={diffReport ? String(diffReport.renamedCount) : "..."}   desc="components moved" />
      </div>

      <Card className="p-5 mb-6">
        <SectionHeader kicker="Signature visualization" title="DNA change stream" action={
          <span className="mono text-[10px] text-muted-foreground">
            {beforeName.substring(0, 15)} → {afterName.substring(0, 15)}
          </span>
        } />
        <p className="text-[12px] text-muted-foreground mb-2">Every vertical strand is one component change between the two snapshots. Strand intensity encodes change type.</p>
        <DnaStream />
        <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-muted-foreground">
          <Legend tone="bg-foreground" label="Added" />
          <Legend tone="bg-foreground/85" label="Modified" />
          <Legend tone="bg-foreground/60" label="Removed" />
          <Legend tone="bg-foreground/15" label="Unchanged" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <SnapshotPane side="BEFORE" name={beforeName} />
        <SnapshotPane side="AFTER" name={afterName} />
      </div>

      {diffReport && diffReport.changes && diffReport.changes.length > 0 && (
        <Card className="p-5 mb-6">
          <SectionHeader kicker="Changes" title="Detailed modifications log" />
          <div className="divide-y divide-hairline">
            {diffReport.changes.map((c: any, index: number) => (
              <div key={index} className="flex justify-between items-center py-2.5 text-[13px] mono">
                <div>{c.componentName}</div>
                <div className="flex gap-4 items-center">
                  <span className="text-muted-foreground">{c.componentType}</span>
                  <span className="mono text-[10px] px-1.5 py-0.5 border border-hairline rounded">{c.changeType}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <SectionHeader kicker="Impact" title="Component impact matrix" />
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 items-center mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground pb-2 border-b border-hairline">
          <div>Component Type</div><div>Added</div><div>Modified</div><div>Removed</div>
        </div>
        <div className="divide-y divide-hairline">
          {vizMatrix.length > 0 ? (
            vizMatrix.map((m: any) => (
              <div key={m.category} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 items-center py-2.5">
                <div className="text-[13px] mono">{m.category}</div>
                <Heat v={m.added} />
                <Heat v={m.modified} />
                <Heat v={m.removed} />
              </div>
            ))
          ) : (
            [
              { category: "Sales.profile",       risk: 86, complexity: 72, deps: 14 },
              { category: "Admin.profile",       risk: 91, complexity: 88, deps: 22 },
              { category: "Account.object",      risk: 41, complexity: 36, deps: 9 },
              { category: "OrderTrigger.cls",    risk: 67, complexity: 58, deps: 11 },
              { category: "PermSet_A",           risk: 58, complexity: 44, deps: 7 }
            ].map((m) => (
              <div key={m.category} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 items-center py-2.5">
                <div className="text-[13px] mono">{m.category}</div>
                <Heat v={m.risk} />
                <Heat v={m.complexity} />
                <Heat v={m.deps * 4} />
              </div>
            ))
          )}
        </div>
      </Card>
    </AppShell>
  );
}

function Summary({ icon: Icon, label, value, desc }: { icon: any; label: string; value: string; desc: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="font-display text-3xl font-bold mt-2 tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </Card>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return <div className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${tone}`} /><span>{label}</span></div>;
}

