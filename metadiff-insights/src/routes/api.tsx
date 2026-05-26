import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, Button } from "@/components/AppShell";
import { Play, Copy } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "API Explorer · MetaDiff" },
      { name: "description", content: "Browse and test the MetaDiff REST API: snapshots, diffs, risk and git endpoints." },
    ],
  }),
  component: ApiPage,
});

type Endpoint = { method: "GET" | "POST" | "DELETE"; path: string; summary: string; group: string; body?: string; response: string };
const endpoints: Endpoint[] = [
  { method: "POST", path: "/snapshots", group: "Snapshots", summary: "Ingest a new metadata snapshot",
    body: `{\n  "org_id": "prod-org-001",\n  "format": "xml",\n  "payload": "<base64>"\n}`,
    response: `{\n  "id": "SNAP-2114",\n  "fingerprint": "c7a8e1...",\n  "created_at": "2026-05-26T11:04:22Z"\n}` },
  { method: "GET",  path: "/snapshots", group: "Snapshots", summary: "List snapshots in workspace", response: `{\n  "snapshots": [\n    { "id": "SNAP-2114", "size": 4392123 }\n  ]\n}` },
  { method: "GET",  path: "/snapshots/{id}", group: "Snapshots", summary: "Fetch snapshot detail", response: `{ "id": "SNAP-2114", "tree": { ... } }` },
  { method: "POST", path: "/diff", group: "Diff", summary: "Generate a diff between two snapshots",
    body: `{\n  "base": "SNAP-2113",\n  "head": "SNAP-2114"\n}`,
    response: `{\n  "added": 58,\n  "removed": 14,\n  "modified": 221\n}` },
  { method: "GET",  path: "/risk/{diff_id}", group: "Risk", summary: "Risk score for a diff", response: `{\n  "score": 74,\n  "level": "HIGH"\n}` },
  { method: "GET",  path: "/git/commits", group: "Git", summary: "List recent commits", response: `[ { "sha": "a7f1b22" } ]` },
  { method: "DELETE", path: "/snapshots/{id}", group: "Snapshots", summary: "Delete a snapshot", response: `{ "deleted": true }` },
];

const methodTone: Record<Endpoint["method"], string> = {
  GET: "border-foreground/40 text-foreground",
  POST: "border-foreground text-foreground bg-foreground/5",
  DELETE: "border-hairline text-muted-foreground",
};

function ApiPage() {
  const [active, setActive] = useState(endpoints[3]);
  const groups = Array.from(new Set(endpoints.map(e => e.group)));

  return (
    <AppShell
      breadcrumb="WORKSPACE / API EXPLORER"
      title="API explorer"
      description="REST endpoints for snapshots, diffs, risk and git operations. Try requests inline."
      actions={<Button variant="outline" size="sm">v2.14.0 · OpenAPI</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="p-2 max-h-[700px] overflow-auto">
          {groups.map((g) => (
            <div key={g} className="mb-2">
              <div className="px-2 py-1.5 mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{g}</div>
              {endpoints.filter(e => e.group === g).map((e) => {
                const sel = e.path === active.path && e.method === active.method;
                return (
                  <button key={e.method + e.path} onClick={() => setActive(e)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-surface ${sel ? "bg-surface" : ""}`}>
                    <span className={`mono text-[10px] px-1.5 py-0.5 rounded border ${methodTone[e.method]}`}>{e.method}</span>
                    <span className="mono text-[12px] truncate">{e.path}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`mono text-[11px] px-2 py-1 rounded border ${methodTone[active.method]}`}>{active.method}</span>
              <span className="mono text-[14px] font-medium">{active.path}</span>
              <Button size="sm" className="ml-auto"><Play className="h-3.5 w-3.5" />Send request</Button>
            </div>
            <p className="text-[13px] text-muted-foreground mt-2">{active.summary}</p>
            <div className="mt-3 flex items-center gap-2 mono text-[11px]">
              <span className="text-muted-foreground">Base URL</span>
              <code className="px-2 py-1 rounded border border-hairline">https://api.metadiff.io</code>
              <button className="ml-auto p-1.5 rounded hover:bg-surface text-muted-foreground"><Copy className="h-3.5 w-3.5" /></button>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-0 overflow-hidden">
              <div className="px-4 h-10 flex items-center border-b border-hairline mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Request body</div>
              <pre className="font-mono text-[12px] p-4 leading-6 overflow-auto bg-background min-h-[180px]">{active.body || "// no body"}</pre>
            </Card>
            <Card className="p-0 overflow-hidden">
              <div className="px-4 h-10 flex items-center justify-between border-b border-hairline">
                <span className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Response · 200 OK</span>
                <span className="mono text-[10px] text-muted-foreground">application/json</span>
              </div>
              <pre className="font-mono text-[12px] p-4 leading-6 overflow-auto bg-background min-h-[180px]">{active.response}</pre>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
