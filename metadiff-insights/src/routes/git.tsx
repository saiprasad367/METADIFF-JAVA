import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, SectionHeader, Button } from "@/components/AppShell";
import { GitCommit, GitBranch, GitMerge, Play, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchGitHistory, compareCommits } from "@/lib/api";

export const Route = createFileRoute("/git")({
  head: () => ({
    meta: [
      { title: "Git History · MetaDiff" },
      { name: "description", content: "Versioned snapshots stored with Git: timeline, graph and commit comparison." },
    ],
  }),
  component: GitPage,
});

const lanes = { main: 40, hotfix: 80, feature: 120 };

function GitGraph({ graphData = [] }: { graphData: any[] }) {
  const rowH = 56;
  const w = 200;
  const h = Math.max(100, graphData.length * rowH);
  const yFor = (sha: string) => {
    const idx = graphData.findIndex(g => g.sha === sha);
    return idx === -1 ? rowH / 2 : idx * rowH + rowH / 2;
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {graphData.map((c) => (c.parents || []).map((p: string) => {
        const py = yFor(p);
        const parentCommit = graphData.find(g => g.sha === p);
        const pLane = parentCommit ? parentCommit.lane : "main";
        const x1 = lanes[(c.lane || "main") as keyof typeof lanes] || 40;
        const x2 = lanes[(pLane || "main") as keyof typeof lanes] || 40;
        return (
          <path key={c.sha + p} d={`M ${x1} ${yFor(c.sha)} C ${x1} ${(yFor(c.sha) + py) / 2}, ${x2} ${(yFor(c.sha) + py) / 2}, ${x2} ${py}`}
            fill="none" stroke="currentColor" className="text-foreground/40" strokeWidth="1.5" />
        );
      }))}
      {graphData.map((c) => {
        const x = lanes[(c.lane || "main") as keyof typeof lanes] || 40;
        const y = yFor(c.sha);
        return (
          <g key={c.sha}>
            <circle cx={x} cy={y} r={c.merge ? 7 : 5} fill="white" stroke="currentColor" className="text-foreground" strokeWidth="2" />
            {c.merge && <circle cx={x} cy={y} r={2} className="fill-foreground" />}
          </g>
        );
      })}
    </svg>
  );
}

function GitPage() {
  const [commitsList, setCommitsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commitA, setCommitA] = useState("");
  const [commitB, setCommitB] = useState("");
  const [compareData, setCompareData] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    fetchGitHistory(50).then((data: any) => {
      setCommitsList(data || []);
      setLoading(false);
      if (data && data.length >= 2) {
        setCommitA(data[1].sha);
        setCommitB(data[0].sha);
        handleCompare(data[1].sha, data[0].sha);
      }
    });
  }, []);

  const handleCompare = (cAs = commitA, cBs = commitB) => {
    if (!cAs || !cBs) return;
    setCompareLoading(true);
    compareCommits(cAs, cBs).then((res) => {
      setCompareData(res);
      setCompareLoading(false);
    }).catch(() => {
      setCompareLoading(false);
    });
  };

  const getGraphData = () => {
    return commitsList.map((c, i) => ({
      sha: c.sha,
      lane: c.branch === "hotfix" ? "hotfix" : c.branch === "feature" ? "feature" : "main",
      parents: i < commitsList.length - 1 ? [commitsList[i+1].sha] : [],
      merge: c.message.toLowerCase().includes("merge") || c.message.toLowerCase().includes("release")
    }));
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AppShell
      breadcrumb="WORKSPACE / GIT HISTORY"
      title="Version control"
      description="Every snapshot lives as a Git commit. Inspect lineage, branches and compare any two points in time."
      actions={
        <>
          <Button variant="outline" size="sm"><GitBranch className="h-3.5 w-3.5" />main</Button>
          <Button size="sm"><GitMerge className="h-3.5 w-3.5" />Open PR</Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[260px_1fr] mb-6">
        <Card className="p-3">
          <SectionHeader kicker="Topology" title="Branch graph" />
          <div className="overflow-auto">
            {loading ? <div className="p-4 text-center">Loading graph...</div> : <GitGraph graphData={getGraphData()} />}
          </div>
          <div className="mt-3 pt-3 border-t border-hairline space-y-1.5 text-[11px] mono text-muted-foreground">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-foreground" /> main</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-foreground/60" /> hotfix</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-foreground/30" /> feature</div>
          </div>
        </Card>
 
        <Card className="p-0 overflow-hidden">
          <div className="px-4 h-10 flex items-center border-b border-hairline mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Commit timeline
          </div>
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <ul>
              {commitsList.map((c) => (
                <li key={c.sha} className="px-4 py-3.5 border-b border-hairline last:border-b-0 hover:bg-surface flex items-center gap-4">
                  <GitCommit className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium truncate">{c.message}</div>
                    <div className="mono text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 border border-hairline rounded">{c.sha}</span>
                      <span>{c.branch}</span><span>·</span>
                      <span>{c.author}</span><span>·</span>
                      <span>{formatDate(c.timestamp)}</span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="font-display text-base font-semibold tabular-nums">{c.changes}</div>
                    <div className="mono text-[10px] text-muted-foreground uppercase tracking-wider">changes</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
 
      <Card className="p-5">
        <SectionHeader kicker="Compare" title="Commit comparison" action={
          <Button size="sm" onClick={() => handleCompare()} disabled={compareLoading}>
            {compareLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Generate diff
          </Button>
        } />
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 block">Commit A (Before)</label>
            <select 
              value={commitA} 
              onChange={(e) => setCommitA(e.target.value)}
              className="w-full h-11 px-3 rounded-md border border-hairline bg-elevated text-[13px] focus:outline-none"
            >
              <option value="">Select Commit A</option>
              {commitsList.map(c => <option key={c.sha} value={c.sha}>{c.sha} - {c.message}</option>)}
            </select>
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 block">Commit B (After)</label>
            <select 
              value={commitB} 
              onChange={(e) => setCommitB(e.target.value)}
              className="w-full h-11 px-3 rounded-md border border-hairline bg-elevated text-[13px] focus:outline-none"
            >
              <option value="">Select Commit B</option>
              {commitsList.map(c => <option key={c.sha} value={c.sha}>{c.sha} - {c.message}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          <Tag label="Added" v={compareData ? String(compareData.added) : "..."} />
          <Tag label="Removed" v={compareData ? String(compareData.removed) : "..."} />
          <Tag label="Modified" v={compareData ? String(compareData.modified) : "..."} />
          <Tag label="Files touched" v={compareData ? String(compareData.filesTouched) : "..."} />
        </div>
      </Card>
    </AppShell>
  );
}

function Tag({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded border border-hairline p-3">
      <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold tabular-nums">{v}</div>
    </div>
  );
}
