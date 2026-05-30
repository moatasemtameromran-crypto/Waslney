import { useState } from "react";
import { Link, useLocation } from "wouter";
import { clearToken } from "@/lib/api";
import {
  LayoutDashboard, Users, Car, MapPin, BarChart2,
  Tag, Calendar, Settings, Bell, Shield, Trash2,
  Bus, LogOut, Menu, X, ChevronRight, ChevronDown,
  Navigation, Route, DollarSign, Globe, Home, FileText,
  Lightbulb, TicketCheck, UserCog, KeyRound, Building2,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: any;
  href?: string;
  section?: boolean;
  children?: { label: string; href: string; icon: any }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Shuttle", icon: Bus, section: false, children: [
    { label: "Stops", href: "/shuttle/stops", icon: MapPin },
    { label: "Routes", href: "/shuttle/routes", icon: Route },
    { label: "Vehicles", href: "/shuttle/vehicles", icon: Bus },
    { label: "Fare", href: "/shuttle/fare", icon: DollarSign },
    { label: "Trips", href: "/shuttle/trips", icon: Navigation },
    { label: "Passes", href: "/shuttle/passes", icon: TicketCheck },
  ]},
  { label: "Analytics", icon: BarChart2, href: "/analytics" },
  { label: "Promotions", icon: Tag, href: "/promotions" },
  { label: "Suggested Routes", icon: Lightbulb, href: "/suggested-routes" },
  { label: "Holidays", icon: Calendar, href: "/holidays" },
  { label: "Users", icon: Users, section: false, children: [
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Drivers", href: "/drivers", icon: Car },
    { label: "Delete Requests", href: "/delete-requests", icon: Trash2 },
    { label: "Driver Docs", href: "/driver-documents", icon: FileText },
  ]},
  { label: "Trips", icon: MapPin, href: "/trips" },
  { label: "Vehicle Types", icon: Car, href: "/vehicle-types" },
  { label: "Cancellation", icon: Shield, href: "/cancellation" },
  { label: "Cities", icon: Globe, href: "/cities" },
  { label: "HomeScreen", icon: Home, href: "/homescreen" },
  { label: "Pushes", icon: Bell, href: "/pushes" },
  { label: "Settings", icon: Settings, href: false, children: [
    { label: "General Settings", href: "/settings/general", icon: Settings },
    { label: "City Settings", href: "/settings/city", icon: Building2 },
    { label: "Manager Settings", href: "/settings/managers", icon: UserCog },
    { label: "Roles & Permissions", href: "/settings/roles", icon: KeyRound },
  ]} as any,
];

function NavLink({ item, collapsed, onClose }: { item: any; collapsed: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c: any) => location.startsWith(c.href));
  });

  if (item.children) {
    const anyActive = item.children.some((c: any) => location.startsWith(c.href));
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${anyActive ? "text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${collapsed ? "justify-center" : "justify-between"}`}
          title={collapsed ? item.label : undefined}
        >
          <div className="flex items-center gap-3">
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </div>
          {!collapsed && (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>
        {open && !collapsed && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
            {item.children.map((child: any) => {
              const active = location === child.href || location.startsWith(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onClose}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <child.icon size={15} className="flex-shrink-0" />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const active = location === item.href;
  return (
    <Link
      href={item.href!}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${collapsed ? "justify-center" : ""}`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} className="flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    clearToken();
    window.location.href = "/";
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:relative z-50 flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? "w-16" : "w-60"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-sidebar-border min-h-[60px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-sm">W</span>
            </div>
            {!collapsed && <span className="font-bold text-lg text-foreground tracking-tight">Waslney</span>}
          </div>
          <button className="lg:hidden p-1 rounded-lg hover:bg-secondary" onClick={() => setMobileOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.label} item={item} collapsed={collapsed} onClose={() => setMobileOpen(false)} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-2 space-y-0.5">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronRight size={16} className="rotate-180" /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[60px] border-b border-border flex items-center gap-4 px-4 lg:px-6 flex-shrink-0">
          <button className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-medium hidden sm:block">Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
