"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ROLE_LABELS, formatDateTime } from "@/lib/ui";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Icon } from "./Icon";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isCustomer } = useCurrentUser();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: crs } = useQuery({ queryKey: ["crs", "", ""], queryFn: () => api.changeRequests.list() });
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications.list,
    refetchInterval: 20_000,
  });
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const total = crs?.length ?? 0;

  const navLink = (href: string, label: string, badge?: string) => {
    const active = pathname === href || (href !== "/change-requests" && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-all ${
          active ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <span>{label}</span>
        {badge && (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-code font-semibold ${
              active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200/60"
            }`}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  async function openNotifications() {
    setNotifOpen((o) => !o);
    if (!notifOpen && unread > 0) {
      await api.notifications.markAllRead();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  async function signOut() {
    await api.logout();
    queryClient.clear();
    router.replace("/login");
  }

  const initials = user?.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="h-14 max-w-[1720px] mx-auto px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/change-requests" className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-md bg-primary text-white flex items-center justify-center font-headline font-bold text-[13px] shrink-0">
              C
            </span>
            <span className="font-headline font-bold text-[17px] text-primary tracking-tight">ChangeOps</span>
          </Link>
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/70 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[12px] font-medium text-slate-700">HTX Governance</span>
            <span className="text-slate-300">|</span>
            <span className="font-code text-[11px] text-slate-500">GitLab SSO</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {navLink("/change-requests", "Change Requests", String(total))}
          {navLink("/calendar", "Maintenance Calendar")}
          {!isCustomer && navLink("/change-requests/new", "Submit Request")}
          {isCustomer && navLink("/admin/system-assets", "System Inventory")}
          {isCustomer && navLink("/admin/vendor-orgs", "Vendor Orgs")}
          {isCustomer && navLink("/admin/users", "Users & Access")}
        </nav>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <div className="hidden sm:flex items-center relative w-56">
            <Icon name="search" className="absolute left-2.5 text-slate-400 text-[17px]" />
            <input
              className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-md text-[12px] placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
              placeholder="Quick search CR#, systems..."
              type="text"
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push("/change-requests");
              }}
            />
          </div>

          <div className="relative">
            <button
              aria-label="Notifications"
              onClick={openNotifications}
              className="relative w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Icon name="notifications" className="text-[19px]" />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                <p className="px-4 py-2.5 text-[11px] font-code uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  Notifications
                </p>
                {(!notifications || notifications.length === 0) && (
                  <p className="px-4 py-6 text-sm text-slate-400 text-center">No notifications yet.</p>
                )}
                {notifications?.map((n) => (
                  <div key={n.id} className="px-4 py-3 border-b border-slate-100 last:border-0">
                    <p className="text-[13px] font-medium text-slate-900">{n.title}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-slate-400 font-code mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <div className="relative">
            <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center gap-2 pl-1">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary ring-1 ring-slate-200 flex items-center justify-center text-[11px] font-semibold">
                {initials}
              </span>
              <span className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-[12px] font-semibold text-slate-900">{user?.name}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">{user ? ROLE_LABELS[user.role] : ""}</span>
              </span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                <button
                  onClick={signOut}
                  className="w-full text-left px-3.5 py-2 text-[12px] text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
