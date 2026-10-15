import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Bell, Bot, CalendarClock, CheckSquare, FileText, LayoutDashboard, Leaf, LogOut, Mail, Menu, Moon, Plus,
  Search, Settings, Sun, Telescope, Users, UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CURRENT_USER, timeAgo, useStore } from "@/lib/store";
import { TaskDialog } from "./task-dialog";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "My Tasks", icon: CheckSquare },
  { to: "/team", label: "Team Tasks", icon: Users },
  { to: "/email", label: "AI Email Generator", icon: Mail },
  { to: "/meetings", label: "Meeting Summarizer", icon: FileText },
  { to: "/planner", label: "AI Task Planner", icon: CalendarClock },
  { to: "/research", label: "AI Research Assistant", icon: Telescope },
  { to: "/chat", label: "AI Workplace Chat", icon: Bot },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("roothr-theme", next ? "dark" : "light");
    setDark(next);
  };
  return { dark, toggle };
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Leaf className="h-5 w-5" />
      </span>
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold">RootHR AI</div>
          <div className="text-[10px] uppercase tracking-widest opacity-70">Simplify HR</div>
        </div>
      )}
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            title={n.label}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "justify-center px-0",
            )}
          >
            <n.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{n.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileMenu({ collapsed }: { collapsed?: boolean }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent", collapsed && "justify-center")}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brown text-xs font-bold text-primary-foreground">{CURRENT_USER.initials}</span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{CURRENT_USER.name}</div>
            <div className="truncate text-xs opacity-70">{CURRENT_USER.role}</div>
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>{CURRENT_USER.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><UserCircle className="mr-2 h-4 w-4" />Profile & settings</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/tasks" })}><CheckSquare className="mr-2 h-4 w-4" />My tasks</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const { openTaskDialog, notifications, markNotificationsRead, search, setSearch } = useStore();
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col gap-6 bg-sidebar p-3 text-sidebar-foreground transition-all md:flex", collapsed ? "w-[72px]" : "w-64")}>
        <div className="pt-2"><Brand collapsed={collapsed} /></div>
        <div className="flex-1 overflow-y-auto"><NavList collapsed={collapsed} /></div>
        <div className="border-t border-sidebar-border pt-3"><ProfileMenu collapsed={collapsed} /></div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-6 border-0 bg-sidebar p-4 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand />
          <div className="flex-1 overflow-y-auto"><NavList onNavigate={() => setMobileOpen(false)} /></div>
          <ProfileMenu />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar"><Menu className="h-5 w-5" /></Button>
          <form
            className="relative max-w-md flex-1"
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/tasks", search: { scope: "all" } }); }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, people, categories…" className="h-10 rounded-full bg-card pl-9" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
            <DropdownMenu onOpenChange={(o) => !o && markNotificationsRead()}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5">
                    <span className={cn("text-sm", !n.read && "font-semibold")}>{n.text}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(n.at)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => openTaskDialog()} className="ml-1 rounded-full">
              <Plus className="h-4 w-4" /><span className="hidden sm:inline">New Task</span>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8 animate-in fade-in duration-300">{children}</main>
      </div>
      <TaskDialog />
    </div>
  );
}
