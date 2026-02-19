import Link from "next/link";

import { AppRole } from "@/lib/roles";

type DashboardSidebarProps = {
  role: AppRole;
};

const dashboardLinks: Array<{ href: string; label: string; roles?: AppRole[]; primary?: boolean }> = [
  { href: "/dashboard/submissions#new-submission", label: "New submission", roles: ["AUTHOR"] },
  { href: "/dashboard/submissions", label: "Open submission management" },
  { href: "/dashboard/reviews", label: "Open peer review module" },
  { href: "/dashboard/decisions", label: "Open editorial decisions", roles: ["ADMIN", "EDITOR"] },
  { href: "/dashboard/publications", label: "Open issue publication module", roles: ["ADMIN", "EDITOR"] },
  { href: "/dashboard/announcements", label: "Open announcements manager", roles: ["ADMIN", "EDITOR"] },
  { href: "/dashboard/users", label: "Open user and role management", roles: ["ADMIN"] },
  { href: "/dashboard/journal-settings", label: "Open journal settings", roles: ["ADMIN"] },
  { href: "/dashboard/activity", label: "Open platform activity monitor", roles: ["ADMIN"] },
  { href: "/dashboard/journals", label: "Open journal management", roles: ["ADMIN"], primary: true },
];

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const visibleLinks = dashboardLinks.filter((link) => !link.roles || link.roles.includes(role));

  return (
    <aside className="rounded-2xl border border-yellow-500/40 bg-red-900 p-5 shadow-sm lg:sticky lg:top-6 lg:h-fit">
      <h2 className="text-base font-semibold text-yellow-50">Dashboard sidebar</h2>
      <p className="mt-1 text-xs text-yellow-100/75">Quick access to your allowed modules</p>

      <nav className="mt-4 space-y-2" aria-label="Dashboard modules">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.primary
                ? "block rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                : "block rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
