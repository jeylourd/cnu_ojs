import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { auth, signOut } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";
import { AppRole } from "@/lib/roles";

const roleModules: Record<AppRole, string[]> = {
  ADMIN: ["Manage users and role assignments", "Configure journal settings", "Monitor platform activity", "Manage journal announcements"],
  EDITOR: ["Assign reviewers", "Track review progress", "Issue editorial decisions", "Publish journal announcements"],
  REVIEWER: ["View assigned manuscripts", "Submit recommendations", "Manage review deadlines"],
  AUTHOR: ["Create new submissions", "Track manuscript status", "Upload revisions"],
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const modules = roleModules[role] ?? [];
  const canManageAnnouncements = role === "ADMIN" || role === "EDITOR";
  const isAdmin = role === "ADMIN";

  const [recentAnnouncements, totalUsers, totalJournals, totalSubmissions, totalIssues, publishedIssues, recentUsers, recentSubmissions, recentReviews, recentDecisions, recentPublishedIssues] =
    await Promise.all([
      prisma.announcement.findMany({
        where: canManageAnnouncements ? undefined : { publishedAt: { not: null } },
        include: {
          journal: { select: { name: true } },
          createdBy: { select: { name: true, email: true } },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      isAdmin ? prisma.user.count() : Promise.resolve(0),
      isAdmin ? prisma.journal.count() : Promise.resolve(0),
      isAdmin ? prisma.submission.count() : Promise.resolve(0),
      isAdmin ? prisma.issue.count() : Promise.resolve(0),
      isAdmin ? prisma.issue.count({ where: { publishedAt: { not: null } } }) : Promise.resolve(0),
      isAdmin
        ? prisma.user.findMany({
            select: { id: true, name: true, email: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.submission.findMany({
            select: {
              id: true,
              title: true,
              createdAt: true,
              author: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.review.findMany({
            where: { submittedAt: { not: null } },
            select: {
              id: true,
              submittedAt: true,
              reviewer: { select: { name: true, email: true } },
              submission: { select: { title: true } },
            },
            orderBy: { submittedAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.editorialDecision.findMany({
            select: {
              id: true,
              status: true,
              decidedAt: true,
              decidedBy: { select: { name: true, email: true } },
              submission: { select: { title: true } },
            },
            orderBy: { decidedAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.issue.findMany({
            where: { publishedAt: { not: null } },
            select: {
              id: true,
              volume: true,
              issueNumber: true,
              year: true,
              publishedAt: true,
              journal: { select: { name: true } },
            },
            orderBy: { publishedAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

  const activityFeed = isAdmin
    ? [
        ...recentUsers.map((item) => ({
          id: `user-${item.id}`,
          label: "New user registered",
          actor: item.name || item.email,
          when: item.createdAt,
        })),
        ...recentSubmissions.map((item) => ({
          id: `submission-${item.id}`,
          label: `Submission created: ${item.title}`,
          actor: item.author.name || item.author.email,
          when: item.createdAt,
        })),
        ...recentReviews.map((item) => ({
          id: `review-${item.id}`,
          label: `Review submitted for: ${item.submission.title}`,
          actor: item.reviewer.name || item.reviewer.email,
          when: item.submittedAt ?? new Date(0),
        })),
        ...recentDecisions.map((item) => ({
          id: `decision-${item.id}`,
          label: `${item.status} recorded for: ${item.submission.title}`,
          actor: item.decidedBy.name || item.decidedBy.email,
          when: item.decidedAt,
        })),
        ...recentPublishedIssues.map((item) => ({
          id: `issue-${item.id}`,
          label: `Issue published: ${item.journal.name} Vol ${item.volume} No ${item.issueNumber} (${item.year})`,
          actor: "System",
          when: item.publishedAt ?? new Date(0),
        })),
      ]
        .sort((left, right) => right.when.getTime() - left.when.getTime())
        .slice(0, 8)
    : [];

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Role dashboard</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Welcome, {session.user.name}</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
              Signed in as <span className="font-medium">{session.user.email}</span> · Role <span className="font-semibold">{role}</span>
              </p>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              data-preloader="on"
              type="submit"
              className="rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <DashboardSidebar role={session.user.role} currentPath="/dashboard" />

          <div className="space-y-6">
            <article className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Dashboard overview</h2>
              <p className="mt-2 text-sm text-yellow-100/85">Your active modules: {modules.join(" · ")}</p>
            </article>

            {isAdmin ? (
              <article className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-yellow-50">Platform activity monitor</h2>
                  <Link
                    href="/dashboard/activity"
                    className="rounded-lg border border-yellow-400/70 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                  >
                    Open full monitor
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-yellow-500/30 bg-red-800/55 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-yellow-300">Users</p>
                    <p className="mt-1 text-xl font-semibold text-yellow-50">{totalUsers}</p>
                  </div>
                  <div className="rounded-lg border border-yellow-500/30 bg-red-800/55 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-yellow-300">Journals</p>
                    <p className="mt-1 text-xl font-semibold text-yellow-50">{totalJournals}</p>
                  </div>
                  <div className="rounded-lg border border-yellow-500/30 bg-red-800/55 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-yellow-300">Submissions</p>
                    <p className="mt-1 text-xl font-semibold text-yellow-50">{totalSubmissions}</p>
                  </div>
                  <div className="rounded-lg border border-yellow-500/30 bg-red-800/55 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-yellow-300">Issues</p>
                    <p className="mt-1 text-xl font-semibold text-yellow-50">{totalIssues}</p>
                  </div>
                  <div className="rounded-lg border border-yellow-500/30 bg-red-800/55 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-yellow-300">Published</p>
                    <p className="mt-1 text-xl font-semibold text-yellow-50">{publishedIssues}</p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {activityFeed.map((item) => (
                    <li key={item.id} className="rounded-lg border border-yellow-500/25 bg-red-800/50 px-3 py-2">
                      <p className="text-sm font-medium text-yellow-50">{item.label}</p>
                      <p className="mt-0.5 text-xs text-yellow-200/80">
                        {item.actor} · {item.when.toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}

            <article className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-yellow-50">Journal announcements</h2>
                <Link
                  href="/dashboard/announcements"
                  className="rounded-lg border border-yellow-400/70 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                >
                  Open announcements
                </Link>
              </div>

              {recentAnnouncements.length === 0 ? (
                <p className="mt-4 text-sm text-yellow-100/85">No announcements available yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {recentAnnouncements.map((announcement) => (
                    <li key={announcement.id} className="rounded-lg border border-yellow-500/25 bg-red-800/50 px-3 py-2">
                      <p className="text-sm font-medium text-yellow-50">{announcement.title}</p>
                      <p className="mt-0.5 text-xs text-yellow-200/80">
                        {announcement.journal.name} · {announcement.createdBy.name || announcement.createdBy.email}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
