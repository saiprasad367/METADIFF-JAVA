import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Database, GitCompareArrows, ShieldAlert, GitBranch,
  BarChart3, Code2, Settings, Search, Bell, Sun, ChevronDown, Command,
} from "lucide-react";
import { Logo } from "./Logo";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/snapshots", label: "Snapshots", icon: Database },
  { to: "/diff", label: "Diff Analysis", icon: GitCompareArrows },
  { to: "/risk", label: "Risk Center", icon: ShieldAlert },
  { to: "/git", label: "Git History", icon: GitBranch },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/api", label: "API Explorer", icon: Code2 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-hairline bg-elevated">
      <div className="h-14 px-4 flex items-center border-b border-hairline">
        <Logo />
      </div>

      <div className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Workspace
      </div>
      <button className="mx-3 mb-4 flex items-center justify-between rounded-md border border-hairline bg-background px-3 py-2 text-left text-sm hover:bg-surface transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded bg-foreground text-background grid place-items-center text-[11px] font-bold">A</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">Acme Platform</div>
            <div className="truncate text-[11px] text-muted-foreground mono">prod-org-001</div>
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Navigation
      </div>
      <nav className="px-2 flex-1 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                active ? "bg-surface text-foreground font-medium" : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-foreground" />}
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-md border border-hairline bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-foreground">Diff Engine</span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground mono">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground pulse-dot" /> OPERATIONAL
          </span>
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">v2.14.0 · 99.98% uptime</div>
      </div>
    </aside>
  );
}

import { useState, useEffect } from "react";
import { fetchNotifications, markNotificationAsRead } from "@/lib/api";

function Topbar() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const loadNotifications = () => {
    fetchNotifications().then(setNotifications);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter(n => !n.read);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markNotificationAsRead(id).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    });
  };

  return (
    <header className="h-14 shrink-0 border-b border-hairline bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="h-full px-4 md:px-6 flex items-center gap-3">
        <div className="flex-1 max-w-xl relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search snapshots, diffs, commits…"
            className="w-full h-9 pl-9 pr-16 rounded-md border border-hairline bg-elevated text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/30"
          />
          <span className="kbd absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5"><Command className="h-3 w-3" />K</span>
        </div>
        <div className="ml-auto flex items-center gap-1 relative">
          <button className="h-9 w-9 grid place-items-center rounded-md hover:bg-surface text-muted-foreground hover:text-foreground transition-colors">
            <Sun className="h-4 w-4" />
          </button>
          
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-surface text-muted-foreground hover:text-foreground transition-colors relative"
          >
            <Bell className="h-4 w-4" />
            {unread.length > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-foreground pulse-dot" />
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-11 w-80 bg-elevated border border-hairline rounded-lg shadow-xl py-2 z-50 text-[13px]">
              <div className="px-4 py-2 border-b border-hairline font-semibold flex justify-between items-center">
                <span>Alerts & Notifications</span>
                <span className="mono text-[10px] bg-surface px-1.5 py-0.5 rounded text-muted-foreground">
                  {unread.length} unread
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-hairline">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-muted-foreground">No alerts active</div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`px-4 py-3 hover:bg-surface transition-colors cursor-pointer ${!n.read ? "bg-surface/30 font-medium" : ""}`}
                      onClick={(e) => !n.read && handleMarkAsRead(n.id, e)}
                    >
                      <div className="flex justify-between gap-1 items-start">
                        <div className="font-medium text-[13px]">{n.title}</div>
                        {!n.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0 mt-1.5" />
                        )}
                      </div>
                      <div className="text-[12px] text-muted-foreground mt-1 leading-normal">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mx-2 h-6 w-px bg-hairline" />
          <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-surface transition-colors">
            <div className="h-7 w-7 rounded-full bg-foreground text-background grid place-items-center text-[11px] font-semibold">RV</div>
            <div className="hidden lg:block text-left leading-tight">
              <div className="text-[12px] font-medium">Riya Verma</div>
              <div className="text-[10px] text-muted-foreground mono">SRE LEAD</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}


export function AppShell({
  title,
  description,
  actions,
  breadcrumb,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 min-w-0">
          <div className="border-b border-hairline bg-elevated">
            <div className="px-4 md:px-8 py-6 max-w-[1500px] mx-auto">
              {breadcrumb && (
                <div className="mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  {breadcrumb}
                </div>
              )}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
                  {description && (
                    <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>
                  )}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
              </div>
            </div>
          </div>
          <div className="px-4 md:px-8 py-6 max-w-[1500px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function Card({ children, className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-lg border border-hairline bg-elevated ${className}`} {...rest}>{children}</div>
  );
}

export function SectionHeader({ kicker, title, action }: { kicker?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-3 gap-4">
      <div>
        {kicker && <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{kicker}</div>}
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Button({
  children, variant = "default", size = "md", className = "", ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost"; size?: "sm" | "md" }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50";
  const sizes = { sm: "h-8 px-3 text-[12px]", md: "h-9 px-3.5 text-[13px]" };
  const variants = {
    default: "bg-foreground text-background hover:bg-ink",
    outline: "border border-hairline bg-elevated hover:bg-surface text-foreground",
    ghost: "hover:bg-surface text-foreground",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>{children}</button>;
}
