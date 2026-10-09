"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  PlusCircle,
  ListChecks,
  FolderOpen,
  FileText,
  BadgeDollarSign,
  Calculator,
  ArrowLeftRight,
  ReceiptText,
  Users,
  BarChart3,
  Settings,
  Search,
  Bell,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  UserRound,
  CheckCircle2,
  Clock3,
  LogOut,
} from "lucide-react";

const RAW_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Clients", href: "/clients", icon: Building2 },
      { label: "Work Register", href: "/work-register", icon: ClipboardList },
      { label: "Tasks & Deadlines", href: "/tasks", icon: Clock3 },
      {
        label: "Checklist / Requisition",
        href: "/checklist-requisition",
        icon: ListChecks,
      },
      { label: "Documents", href: "/documents", icon: FolderOpen },
      { label: "Working Papers", href: "/working-papers", icon: FileText },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Services & Fees", href: "/services-fees", icon: BadgeDollarSign },
      { label: "Fee Calculator", href: "/fee-calculator", icon: Calculator },
      { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
      { label: "Billing", href: "/billing", icon: ReceiptText },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Team", href: "/team", icon: Users },
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Audit Trail", href: "/audit-log", icon: ShieldCheck },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Users", href: "/users", icon: Users },
    ],
  },
];

const allItems = RAW_GROUPS.flatMap((g: any) => g.items);

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  const groups = useMemo(() => {
    if (!user) return [];
    return RAW_GROUPS.map(section => {
      const filteredItems = section.items.filter((item: any) => {
        if (user.role === "JUNIOR") {
           if (item.href === "/settings" || item.href === "/transactions" || item.href === "/billing" || item.href === "/users" || item.href === "/audit-log") return false;
        }
        if (user.role === "SENIOR") {
           if (item.href === "/settings" || item.href === "/users" || item.href === "/audit-log") return false;
        }
        if (user.role === "MANAGER") {
           if (item.href === "/users") return false;
        }
        return true;
      });
      return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);
  }, [user]);

  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;

    return allItems.filter((item) =>
      item.label.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    function closeMenus(e: MouseEvent) {
      const target = e.target as Node;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }

      if (notifyRef.current && !notifyRef.current.contains(target)) {
        setNotificationOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  function navigate(href: string) {
    router.push(href);
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <div
      className="min-h-screen bg-[#cfe9dd]"
      style={
        {
          "--sidebar-width": collapsed ? "84px" : "260px",
        } as React.CSSProperties
      }
    >
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/10 bg-gradient-to-b from-[#315f55] to-[#294f48] lg:flex"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="flex h-[74px] items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff8e8] text-[#315f55] shadow-sm">
              <ShieldCheck size={20} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[17px] font-black tracking-tight text-white">
                  RJSC Office
                </div>

                <div className="mt-0.5 truncate text-[10px] text-[#cde5da]">
                  Internal Automation System
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="grid h-8 w-8 place-items-center rounded-lg text-[#cde5da] transition hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={17} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="mx-auto mt-3 grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronRight size={18} />
          </button>
        )}

        <nav className="app-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              {!collapsed && (
                <div className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.15em] text-[#a9cec0]">
                  {group.label}
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item: any) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={
                        active
                          ? `group relative flex min-h-[44px] items-center rounded-xl bg-[#fff8e8] text-[#294d45] shadow-sm ${
                              collapsed
                                ? "justify-center px-2"
                                : "gap-3 px-3"
                            }`
                          : `group flex min-h-[44px] items-center rounded-xl text-[#e4f0eb] transition hover:bg-white/10 hover:text-white ${
                              collapsed
                                ? "justify-center px-2"
                                : "gap-3 px-3"
                            }`
                      }
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#79b993]" />
                      )}

                      <div
                        className={
                          active
                            ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#dcefe4] text-[#47765a]"
                            : "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#c6ded5] transition group-hover:bg-white/10 group-hover:text-white"
                        }
                      >
                        <Icon size={17} />
                      </div>

                      {!collapsed && (
                        <span className="flex-1 text-[14px] font-semibold">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 p-3">
          <Link
            href="/settings"
            title={collapsed ? "FAMES & R · Settings" : undefined}
            className={
              collapsed
                ? "grid place-items-center rounded-2xl border border-white/10 bg-[#3b6d62] p-3 transition hover:bg-[#44786c]"
                : "block rounded-2xl border border-white/10 bg-[#3b6d62] p-4 shadow-inner transition hover:bg-[#44786c]"
            }
          >
            {collapsed ? (
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff8e8] text-[10px] font-black text-[#315f55]">
                F&R
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff8e8] text-[10px] font-black text-[#315f55]">
                    F&R
                  </div>

                  <div>
                    <div className="text-xs font-black text-white">
                      FAMES & R
                    </div>

                    <div className="mt-1 text-[10px] text-[#c8dfd6]">
                      RJSC Department
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-black/10 px-3 py-2 text-[10px] text-[#dbece6]">
                  Internal use only · Open settings
                </div>
              </>
            )}
          </Link>
        </div>
      </aside>

      <main className="shell-main min-h-screen">
        <header className="sticky top-0 z-30 border-b border-[#e6dfcf] bg-[#fffaf0]/95 backdrop-blur">
          <div className="flex h-[72px] items-center justify-between gap-4 px-5 lg:px-7">
            <div>
              <div className="text-sm font-black text-[#292a26]">
                FAMES & R Chartered Accountants
              </div>

              <div className="mt-1 text-[11px] text-[#7e827a]">
                RJSC Department · Internal Use Only
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div ref={searchRef} className="relative">
                <button
                  onClick={() => {
                    setSearchOpen((v) => !v);
                    setNotificationOpen(false);
                    setProfileOpen(false);
                  }}
                  className="flex h-10 items-center gap-2 rounded-xl border border-[#ddd7c9] bg-white/80 px-3 text-sm text-[#6b7069] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <Search size={16} />
                  <span className="hidden sm:inline">Search</span>
                </button>

                {searchOpen && (
                  <div className="absolute right-0 top-12 w-[330px] overflow-hidden rounded-2xl border border-[#ddd7c9] bg-[#fffaf0] shadow-2xl">
                    <div className="border-b border-[#e8dfcd] p-3">
                      <div className="relative">
                        <Search
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d9189]"
                        />

                        <input
                          autoFocus
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search pages..."
                          className="h-10 w-full rounded-xl border border-[#ded7c8] bg-white pl-9 pr-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <div className="max-h-[330px] overflow-y-auto p-2">
                      {results.map((item: any) => {
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.href}
                            onClick={() => navigate(item.href)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#dff1e7]"
                          >
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#dff1e7] text-[#47765a]">
                              <Icon size={15} />
                            </div>

                            <span className="text-sm font-semibold text-[#353731]">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div ref={notifyRef} className="relative">
                <button
                  onClick={() => {
                    setNotificationOpen((v) => !v);
                    setSearchOpen(false);
                    setProfileOpen(false);
                  }}
                  className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#ddd7c9] bg-white/80 text-[#607069] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <Bell size={16} />

                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#eb7b67] ring-2 ring-white" />
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-12 w-[330px] rounded-2xl border border-[#ddd7c9] bg-[#fffaf0] p-3 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-black text-[#34352f]">
                        Notifications
                      </div>

                      <span className="rounded-full bg-[#fce9e4] px-2 py-1 text-[10px] font-bold text-[#bd5f4d]">
                        2 New
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Notification
                        icon={<Clock3 size={15} />}
                        title="DEMO-001 due this week"
                        text="Annual Return · Due 15-Oct-2026"
                        tone="coral"
                      />

                      <Notification
                        icon={<CheckCircle2 size={15} />}
                        title="Working paper ready"
                        text="Manager review required"
                        tone="sage"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div ref={profileRef} className="relative">
                <button
                  onClick={() => {
                    setProfileOpen((v) => !v);
                    setSearchOpen(false);
                    setNotificationOpen(false);
                  }}
                  className="ml-1 flex items-center gap-2 rounded-xl border border-[#ddd7c9] bg-white/80 p-1.5 pr-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#47765a] text-xs font-black text-white">
                    ZI
                  </div>

                  <div className="hidden sm:block">
                    <div className="text-xs font-black text-[#353731]">
                      Md. Zahirul Islam
                    </div>

                    <div className="text-[10px] text-[#8d9189]">
                      Manager
                    </div>
                  </div>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-12 w-[245px] rounded-2xl border border-[#ddd7c9] bg-[#fffaf0] p-2 shadow-2xl">
                    <div className="border-b border-[#e8dfcd] p-3">
                      <div className="font-black text-[#34352f]">
                        Md. Zahirul Islam
                      </div>

                      <div className="mt-1 text-xs text-[#858a83]">
                        Manager · RJSC Department
                      </div>
                    </div>

                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#454842] transition hover:bg-[#dff1e7]"
                    >
                      <Settings size={16} />
                      System Settings
                    </Link>

                    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#83877f]">
                      <UserRound size={16} />
                      Profile & Logout after auth
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="app-content p-5 lg:p-6 xl:p-7">
          <div className="app-content-inner">{children}</div>
        </div>
      </main>
    </div>
  );
}

function Notification({
  icon,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: "coral" | "sage";
}) {
  const cls =
    tone === "coral"
      ? "bg-[#fce9e4] text-[#b85e4c]"
      : "bg-[#dff1e7] text-[#47765a]";

  return (
    <div className="flex gap-3 rounded-xl border border-black/5 bg-white/60 p-3">
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${cls}`}>
        {icon}
      </div>

      <div>
        <div className="text-xs font-black text-[#363832]">
          {title}
        </div>

        <div className="mt-1 text-[11px] text-[#80857d]">
          {text}
        </div>
      </div>
    </div>
  );
}
