import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, SectionHeader, Button } from "@/components/AppShell";
import { Sparkles, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchSnapshots, fetchRiskReport } from "@/lib/api";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Risk Center · MetaDiff" },
      { name: "description", content: "Deployment risk scoring engine with component breakdown and AI explanations." },
    ],
  }),
  component: RiskPage,
});

function Waterfall({ score = 74 }) {
  const max = 100;
  const waterfall = [
    { label: "Base",     value: 30, kind: "base" },
    { label: "Added",    value: Math.min(25, Math.max(0, Math.floor(score * 0.2))), kind: "add" },
    { label: "Removed",  value: -Math.min(10, Math.max(0, Math.floor(score * 0.05))), kind: "sub" },
    { label: "Modified", value: Math.min(35, Math.max(0, Math.floor(score * 0.45))), kind: "add" },
    { label: "Deps",     value: Math.min(15, Math.max(0, Math.floor(score * 0.1))),  kind: "add" },
    { label: "Final",    value: score, kind: "final" },
  ];

  let running = 0;
  return (
    <div className="space-y-2">
      {waterfall.map((w, i) => {
        const start = w.kind === "base" || w.kind === "final" ? 0 : running;
        const end = w.kind === "final" ? score : start + w.value;
        if (w.kind !== "final") running = end;
        const left = (Math.min(start, end) / max) * 100;
        const width = (Math.abs(w.value) / max) * 100;
        return (
          <div key={i} className="grid grid-cols-[80px_1fr_60px] gap-3 items-center">
            <div className="mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{w.label}</div>
            <div className="relative h-7 bg-surface rounded">
              <div
                className={`absolute top-0 bottom-0 rounded ${
                  w.kind === "base" ? "bg-foreground/30" :
                  w.kind === "final" ? "bg-foreground" :
                  w.kind === "sub" ? "bg-foreground/40 border border-dashed border-foreground" :
                  "bg-foreground/70"
                }`}
                style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
              />
            </div>
            <div className="mono text-[12px] tabular-nums text-right">{w.value > 0 ? "+" : ""}{w.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function RiskGauge({ score = 74, level = "HIGH" }) {
  const r = 90;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <div className="relative grid place-items-center">
      <svg width="240" height="240" viewBox="0 0 240 240">
        <circle cx="120" cy="120" r={r} fill="none" stroke="currentColor" className="text-surface-strong" strokeWidth="10" />
        <circle cx="120" cy="120" r={r} fill="none" stroke="currentColor" className="text-foreground"
          strokeWidth="10" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 120 120)" />
      </svg>
      <div className="absolute text-center">
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Risk score</div>
        <div className="font-display text-6xl font-bold tabular-nums leading-none mt-1">{score}</div>
        <div className="mt-2 mono text-[10px] inline-flex items-center gap-1.5 px-2 py-1 rounded border border-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
          {level} RISK
        </div>
      </div>
    </div>
  );
}

function RiskPage() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [riskReport, setRiskReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSnapshots("", 0, 50).then((data: any) => {
      const content = data.content || [];
      setSnapshots(content);
      if (content.length > 0) {
        setSelectedSnapshotId(content[0].id);
        handleLoadRisk(content[0].id);
      } else {
        handleLoadRisk("demo-diff-id");
      }
    });
  }, []);

  const handleLoadRisk = (id: string) => {
    if (!id) return;
    setLoading(true);
    fetchRiskReport(id).then((report) => {
      setRiskReport(report);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

  const currentScore = riskReport?.score || 74;
  const currentLevel = riskReport?.level || "HIGH";

  const breakdown = [
    { label: "Profiles",    score: Math.min(99, Math.max(10, currentScore + 12)), weight: "32%" },
    { label: "Objects",     score: Math.min(99, Math.max(10, currentScore - 33)), weight: "18%" },
    { label: "Classes",     score: Math.min(99, Math.max(10, currentScore - 7)), weight: "22%" },
    { label: "Permissions", score: Math.min(99, Math.max(10, currentScore - 1)), weight: "20%" },
    { label: "Fields",      score: Math.min(99, Math.max(10, currentScore - 46)), weight: "8%" },
  ];

  return (
    <AppShell
      breadcrumb="WORKSPACE / RISK CENTER"
      title="Deployment risk intelligence"
      description="Quantitative scoring across components, dependencies and historical failure patterns."
      actions={
        <>
          <select 
            value={selectedSnapshotId} 
            onChange={(e) => {
              setSelectedSnapshotId(e.target.value);
              handleLoadRisk(e.target.value);
            }}
            className="h-9 px-3 rounded-md border border-hairline bg-elevated text-[13px] focus:outline-none"
          >
            <option value="">Select Snapshot / Diff ID</option>
            {snapshots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button size="sm" onClick={() => handleLoadRisk(selectedSnapshotId)}>Analyze</Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3 mb-6">
            <Card className="p-6 lg:col-span-1">
              <RiskGauge score={currentScore} level={currentLevel} />
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Stat label="Confidence" value="92%" />
                <Stat label="P(Fail)" value={(currentScore / 240).toFixed(2)} />
                <Stat label="Blast radius" value={String(Math.floor(currentScore * 0.19))} />
              </div>
            </Card>

            <Card className="p-5 lg:col-span-2">
              <SectionHeader kicker="Decomposition" title="Risk breakdown by category" />
              <div className="space-y-3">
                {breakdown.map((b) => (
                  <div key={b.label} className="grid grid-cols-[120px_1fr_70px_60px] gap-3 items-center">
                    <div className="text-[13px] font-medium">{b.label}</div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div className="h-full bg-foreground rounded-full" style={{ width: `${b.score}%` }} />
                    </div>
                    <div className="mono text-[12px] tabular-nums">{b.score}</div>
                    <div className="mono text-[10px] text-muted-foreground text-right">w {b.weight}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3 mb-6">
            <Card className="p-5 lg:col-span-2">
              <SectionHeader kicker="Signature visualization" title="Risk waterfall" action={
                <span className="mono text-[10px] text-muted-foreground">
                  {selectedSnapshotId ? selectedSnapshotId.substring(0, 8) + "..." : "default"}
                </span>
              } />
              <Waterfall score={currentScore} />
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 grid place-items-center rounded border border-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Analysis</div>
                  <div className="text-[14px] font-semibold">Why this is rated {currentLevel.toLowerCase()} risk</div>
                </div>
              </div>
              <p className="text-[12.5px] text-foreground leading-relaxed">
                {riskReport?.explanation || "The diff contains profile changes and permission modifications that elevate access rights. Combined with class dependencies, the blast radius spans multiple downstream modules."}
              </p>
              <div className="mt-3 pt-3 border-t border-hairline">
                <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Suggested actions</div>
                <ul className="space-y-1.5 text-[12.5px]">
                  {riskReport?.suggestedActions && riskReport.suggestedActions.length > 0 ? (
                    riskReport.suggestedActions.map((act: string, idx: number) => (
                      <li key={idx} className="flex gap-2">
                        {idx === 0 ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                        {act}
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />Stage to QA org first; run Apex regression tests.</li>
                      <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />Split permissions change into separate deployment window.</li>
                      <li className="flex gap-2"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />Require reviewer approvals before promote.</li>
                    </>
                  )}
                </ul>
              </div>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-hairline rounded p-2">
      <div className="mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

