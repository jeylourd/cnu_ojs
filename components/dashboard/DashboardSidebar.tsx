import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppRole } from "@/lib/roles";

type DashboardSidebarProps = {
  role: AppRole;
  currentPath?: string;
};

const dashboardLinks: Array<{ href: string; label: string; roles?: AppRole[]; primary?: boolean }> = [
  { href: "/dashboard/submissions#new-submission", label: "New submission", roles: ["AUTHOR"] },
  { href: "/dashboard/submissions", label: "Open submission management" },
  { href: "/dashboard/reviews", label: "Open peer review module" },
  { href: "/dashboard/decisions", label: "Open editorial decisions", roles: ["ADMIN", "EDITOR"] },
  { href: "/dashboard/production", label: "Open production & galleys", roles: ["ADMIN", "EDITOR"] },
  { href: "/dashboard/publications", label: "Open issue publication module", roles: ["ADMIN", "EDITOR"] },
  { href: "/dashboard/announcements", label: "Open announcements manager", roles: ["ADMIN", "EDITOR"] },
  { href: "/dashboard/users", label: "Open user and role management", roles: ["ADMIN"] },
  { href: "/dashboard/journal-settings", label: "Open journal settings", roles: ["ADMIN"] },
  { href: "/dashboard/settings", label: "Open journal settings & pages", roles: ["ADMIN"] },
  { href: "/dashboard/activity", label: "Open platform activity monitor", roles: ["ADMIN"] },
  { href: "/dashboard/journals", label: "Open journal management", roles: ["ADMIN"], primary: true },
];

export async function DashboardSidebar({ role, currentPath = "" }: DashboardSidebarProps) {
  // Helper to check if a link is active
  const isActive = (href: string) => {
    const cleanHref = href.split("#")[0]; // Remove hash for comparison
    return currentPath === cleanHref || currentPath.startsWith(cleanHref + "/");
  };
  const session = await auth();
  
  let unreadCount = 0;
  if (session?.user?.id) {
    unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    });
  }

  const visibleLinks = dashboardLinks.filter((link) => !link.roles || link.roles.includes(role));

  return (
    <aside className="rounded-2xl border border-yellow-500/40 bg-red-900 p-5 shadow-sm lg:sticky lg:top-6 lg:h-fit">
      <h2 className="text-base font-semibold text-yellow-50">Dashboard sidebar</h2>
      <p className="mt-1 text-xs text-yellow-100/75">Quick access to your allowed modules</p>

      <nav className="mt-4 space-y-2" aria-label="Dashboard modules">
        <Link
          href="/dashboard/notifications"
          className={
            isActive("/dashboard/notifications")
              ? "relative block rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-400"
              : "relative block rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
          }
        >
          <span className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                isActive("/dashboard/notifications")
                  ? "bg-red-950 text-yellow-500"
                  : "bg-yellow-500 text-red-950"
              }`}>
                {unreadCount}
              </span>
            )}
          </span>
        </Link>

        {visibleLinks.map((link) => {
          const active = isActive(link.href);
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "block rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-400"
                  : link.primary
                    ? "block rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                    : "block rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
