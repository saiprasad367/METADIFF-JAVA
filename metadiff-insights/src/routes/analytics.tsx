import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, SectionHeader, Button } from "@/components/AppShell";
import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import {
  fetchDashboardMetrics,
  fetchTrends,
  fetchHotspots,
  fetchPrediction
} from "@/lib/api";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · MetaDiff" },
      { name: "description", content: "Executive analytics: risk trends, failure rates and component churn." },
    ],
  }),
  component: AnalyticsPage,
});

function Area({ data, fill = false }: { data: number[]; fill?: boolean }) {
  const w = 600, h = 160;
  if (!data || data.length === 0) data = [0];
  const max = Math.max(...data), min = Math.min(...data);
  const step = w / (data.length - 1 || 1);
  const y = (v: number) => h - 12 - ((v - min) / (max - min + 0.0001)) * (h - 24);
  const d = data.map((v, i) => `${i ? "L" : "M"} ${i * step} ${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      {[0.25, 0.5, 0.75].map(p => <line key={p} x1="0" x2={w} y1={h * p} y2={h * p} stroke="currentColor" className="text-hairline" strokeWidth="0.5" />)}
      {fill && <path d={`${d} L ${w} ${h} L 0 ${h} Z`} className="fill-foreground/10" />}
      <path d={d} fill="none" stroke="currentColor" className="text-foreground" strokeWidth="1.75" />
      {data.map((v, i) => i % 3 === 0 && <circle key={i} cx={i * step} cy={y(v)} r="2" className="fill-background stroke-foreground" strokeWidth="1.5" />)}
    </svg>
  );
}

function AnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    fetchDashboardMetrics().then(setMetrics);
    fetchTrends().then(setTrends);
    fetchHotspots().then(setHotspots);
    fetchPrediction().then(setPrediction);
  }, []);

  const avgRisk = metrics ? String(metrics.avgRisk) : "...";
  const deploySuccess = metrics ? metrics.deploySuccess : "...";
  const avgLeadTime = metrics ? metrics.avgLeadTime : "...";

  return (
    <AppShell
      breadcrumb="WORKSPACE / ANALYTICS"
      title="Engineering analytics"
      description="Trends and intelligence across deployments, risk and component churn."
      actions={<Button variant="outline" size="sm">Last 90 days</Button>}
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Kpi label="Avg risk" value={avgRisk} delta={metrics?.riskDelta || "-6%"} up={metrics?.riskUp || false} />
        <Kpi label="Deploy success" value={deploySuccess} delta={metrics?.deploySuccessDelta || "+1.8%"} up={metrics?.deploySuccessUp || true} />
        <Kpi label="Avg lead time" value={avgLeadTime} delta={metrics?.avgLeadTimeDelta || "-12%"} up={metrics?.avgLeadTimeUp || false} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card className="p-5">
          <SectionHeader kicker="Trend" title="Risk score over time" />
          <Area data={trends?.riskScores || [64,58,62,55,60,52,57,49,54,46,52,48,44,42,46,40,38,42,36,40,34,38,32,36]} fill />
        </Card>
        <Card className="p-5">
          <SectionHeader kicker="Trend" title="Deployment frequency" />
          <Area data={trends?.deploymentFrequency || [12,14,18,16,22,24,20,28,32,30,34,36,40,38,42,46,44,50,52,48,54,58,56,62]} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <SectionHeader kicker="Hotspots" title="Most-changed components" />
          <div className="divide-y divide-hairline">
            {hotspots.map((c) => (
              <div key={c.name} className="grid grid-cols-[1.5fr_1fr_70px] items-center gap-3 py-2.5">
                <div className="text-[13px] mono">{c.name}</div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-foreground" style={{ width: `${(c.changes / (hotspots[0]?.changes || 142)) * 100}%` }} />
                </div>
                <div className="mono text-[12px] tabular-nums text-right">{c.changes}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 grid place-items-center rounded border border-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Prediction</div>
              <div className="text-[14px] font-semibold">Next deployment risk</div>
            </div>
          </div>
          <div className="font-display text-5xl font-bold tabular-nums">{prediction?.score || "61"}</div>
          <div className="mono text-[11px] text-muted-foreground mt-1">{prediction?.margin ? `±${prediction.margin}` : "±6"} · {prediction?.confidenceInterval || "94% confidence interval"}</div>
          <p className="text-[12.5px] mt-3 leading-relaxed text-foreground">
            {prediction?.description || "Based on the last 90 days of releases, the next planned cutover sits in the elevated band. Profile and permission changes are the dominant predictors."}
          </p>
          <div className="mt-3 pt-3 border-t border-hairline text-[11px] mono text-muted-foreground uppercase tracking-wider">
            Model: {prediction?.modelName || "gbr-v3"} · trained {prediction?.trainedDate || "2026-05-19"}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  return (
    <Card className="p-5">
      <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-display text-3xl font-bold tabular-nums">{value}</div>
        <div className="mono text-[11px] flex items-center gap-0.5 text-muted-foreground">
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </div>
      </div>
    </Card>
  );
}

