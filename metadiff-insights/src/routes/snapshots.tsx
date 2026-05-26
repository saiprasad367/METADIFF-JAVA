import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, SectionHeader, Button } from "@/components/AppShell";
import { UploadCloud, FileJson, FileCode, FileArchive, Eye, GitCompareArrows, Trash2, ChevronRight, ChevronDown, Folder, File, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { fetchSnapshots, fetchSnapshotTree, uploadSnapshot, deleteSnapshot } from "@/lib/api";

export const Route = createFileRoute("/snapshots")({
  head: () => ({
    meta: [
      { title: "Snapshots · MetaDiff" },
      { name: "description", content: "Manage metadata snapshots: upload, version and explore configuration trees." },
    ],
  }),
  component: SnapshotsPage,
});

type Node = { name: string; type: "folder" | "file"; children?: Node[]; meta?: string };

function TreeView({ nodes, depth = 0 }: { nodes: Node[]; depth?: number }) {
  if (!nodes || nodes.length === 0) return <div className="text-[12px] text-muted-foreground p-3">No metadata structure found</div>;
  return (
    <ul className="text-[13px]">
      {nodes.map((n) => <TreeRow key={n.name} node={n} depth={depth} />)}
    </ul>
  );
}

function TreeRow({ node, depth }: { node: Node; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === "folder";
  return (
    <li>
      <button
        onClick={() => isFolder && setOpen((o) => !o)}
        className="flex items-center gap-1.5 w-full px-2 py-1 rounded hover:bg-surface text-left"
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        {isFolder ? (open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />) : <span className="w-3.5" />}
        {isFolder ? <Folder className="h-3.5 w-3.5" /> : <File className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="font-mono text-[12px]">{node.name}</span>
        {node.meta && (
          <span className={`ml-auto mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
            node.meta === "added" ? "border-foreground text-foreground" : "border-hairline text-muted-foreground"
          }`}>{node.meta}</span>
        )}
      </button>
      {isFolder && open && node.children && <TreeView nodes={node.children} depth={depth + 1} />}
    </li>
  );
}

function convertTreeToNodes(treeData: any): Node[] {
  if (!treeData) return [];
  const nodes: Node[] = [];
  for (const [key, value] of Object.entries(treeData)) {
    if (typeof value === "object" && value !== null) {
      const children: Node[] = [];
      for (const [childKey, childValue] of Object.entries(value)) {
        if (Array.isArray(childValue)) {
          children.push({
            name: childKey,
            type: "folder",
            children: childValue.map(v => ({ name: String(v), type: "file" }))
          });
        } else if (typeof childValue === "object" && childValue !== null) {
          const innerChildren: Node[] = [];
          for (const [innerKey, innerVal] of Object.entries(childValue)) {
            innerChildren.push({ name: `${innerKey}: ${JSON.stringify(innerVal)}`, type: "file" });
          }
          children.push({
            name: childKey,
            type: "folder",
            children: innerChildren
          });
        } else {
          children.push({ name: `${childKey}: ${childValue}`, type: "file" });
        }
      }
      nodes.push({ name: key, type: "folder", children });
    } else {
      nodes.push({ name: `${key}: ${value}`, type: "file" });
    }
  }
  return nodes;
}

function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [treeData, setTreeData] = useState<Node[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSnapshots = () => {
    setLoading(true);
    fetchSnapshots("", 0, 50).then((data: any) => {
      const content = data.content || [];
      setSnapshots(content);
      setLoading(false);
      if (content.length > 0 && !selectedId) {
        handleSelectSnapshot(content[0].id);
      }
    });
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleSelectSnapshot = (id: string) => {
    setSelectedId(id);
    setTreeLoading(true);
    fetchSnapshotTree(id).then((data) => {
      setTreeData(convertTreeToNodes(data));
      setTreeLoading(false);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    uploadSnapshot(files[0], "prod-org-001")
      .then(() => {
        loadSnapshots();
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this snapshot?")) {
      deleteSnapshot(id).then(() => {
        loadSnapshots();
        if (selectedId === id) {
          setSelectedId("");
          setTreeData([]);
        }
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AppShell
      breadcrumb="WORKSPACE / SNAPSHOTS"
      title="Snapshot management"
      description="Upload, browse and version metadata snapshots across your orgs."
      actions={
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          Upload snapshot
        </Button>
      }
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".json,.xml,.zip"
      />

      <Card className="p-6 mb-6">
        <div 
          onClick={() => fileInputRef.current?.click()} 
          className="border-2 border-dashed border-hairline rounded-md p-10 text-center hover:border-foreground/40 transition-colors cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
          ) : (
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" strokeWidth={1.5} />
          )}
          <div className="mt-3 font-display text-lg font-semibold">Drop metadata to ingest</div>
          <p className="text-[13px] text-muted-foreground mt-1">Or click to browse and upload — files are parsed, normalized and committed to Git.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm"><FileJson className="h-3.5 w-3.5" />.json</Button>
            <Button variant="outline" size="sm"><FileCode className="h-3.5 w-3.5" />.xml</Button>
            <Button variant="outline" size="sm"><FileArchive className="h-3.5 w-3.5" />.zip</Button>
          </div>
          <div className="mt-4 mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Max 250 MB · streaming parser · SHA-256 fingerprint</div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader kicker="Library" title="Snapshot explorer" action={
            <div className="flex gap-1">
              <Button variant="outline" size="sm">All orgs</Button>
              <Button variant="ghost" size="sm" onClick={loadSnapshots}>Refresh</Button>
            </div>
          } />
          
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {snapshots.map((s) => (
                <Card 
                  key={s.id} 
                  onClick={() => handleSelectSnapshot(s.id)}
                  className={`p-4 hover:border-foreground/30 transition-colors cursor-pointer ${selectedId === s.id ? "border-foreground" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mono text-[10px] text-muted-foreground">{s.id.substring(0, 8)}...</div>
                      <div className="font-medium text-[14px] truncate">{s.name}</div>
                    </div>
                    <span className="mono text-[10px] px-1.5 py-0.5 border border-hairline rounded text-muted-foreground">
                      {s.commitHash ? s.commitHash.substring(0, 7) : "pending"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <Field label="ORG" value={s.orgId} />
                    <Field label="WHEN" value={formatDate(s.createdAt)} />
                    <Field label="SIZE" value={formatSize(s.sizeBytes)} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-hairline flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleSelectSnapshot(s.id)}><Eye className="h-3.5 w-3.5" />Inspect</Button>
                    <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={(e) => handleDelete(s.id, e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeader kicker="Inspector" title="Snapshot tree" action={
            <span className="mono text-[10px] text-muted-foreground">
              {selectedId ? selectedId.substring(0, 8) + "..." : "none"}
            </span>
          } />
          <Card className="p-3 max-h-[640px] overflow-auto">
            {treeLoading ? (
              <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <TreeView nodes={treeData} />
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className="text-[12px] mono truncate" title={value}>{value}</div>
    </div>
  );
}

