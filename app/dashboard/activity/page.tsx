import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { PaginationNav } from "@/components/ui/PaginationNav";
import { prisma } from "@/lib/prisma";

type ActivityItem = {
  id: string;
  label: string;
  actor: string;
  when: Date;
  type: "USERS" | "SUBMISSIONS" | "REVIEWS" | "DECISIONS" | "PUBLICATIONS";
};

type RecentUserItem = { id: string; name: string; email: string; createdAt: Date };
type RecentSubmissionItem = {
  id: string;
  title: string;
  createdAt: Date;
  author: { name: string; email: string };
};
type RecentReviewItem = {
  id: string;
  submittedAt: Date | null;
  reviewer: { name: string; email: string };
  submission: { title: string };
};
type RecentDecisionItem = {
  id: string;
  status: string;
  decidedAt: Date;
  decidedBy: { name: string; email: string };
  submission: { title: string };
};
type RecentPublishedIssueItem = {
  id: string;
  volume: number;
  issueNumber: number;
  year: number;
  publishedAt: Date | null;
  journal: { name: string };
};

type PlatformActivityPageProps = {
  searchParams?: Promise<{
    days?: string;
    type?: string;
    q?: string;
    page?: string;
  }>;
};

const dayOptions = [7, 30, 90] as const;
const activityTypeOptions = ["ALL", "USERS", "SUBMISSIONS", "REVIEWS", "DECISIONS", "PUBLICATIONS"] as const;

export default async function PlatformActivityPage({ searchParams }: PlatformActivityPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedDays = Number.parseInt(String(resolvedSearchParams?.days ?? "30"), 10);
  const selectedDays = dayOptions.includes(requestedDays as (typeof dayOptions)[number]) ? requestedDays : 30;
  const selectedType = activityTypeOptions.includes(String(resolvedSearchParams?.type ?? "ALL") as (typeof activityTypeOptions)[number])
    ? (String(resolvedSearchParams?.type ?? "ALL") as (typeof activityTypeOptions)[number])
    : "ALL";
  const query = String(resolvedSearchParams?.q ?? "").trim();
  const normalizedQuery = query.toLowerCase();
  const requestedPage = Number.parseInt(String(resolvedSearchParams?.page ?? "1"), 10);
  const page = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const pageSize = 10;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - selectedDays);

  const [
    totalUsers,
    totalJournals,
    totalSubmissions,
    totalIssues,
    publishedIssues,
    recentUsers,
    recentSubmissions,
    recentReviews,
    recentDecisions,
    recentPublishedIssues,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.journal.count(),
    prisma.submission.count(),
    prisma.issue.count(),
    prisma.issue.count({ where: { publishedAt: { not: null } } }),
    prisma.user.findMany({
      where: { createdAt: { gte: sinceDate } },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.submission.findMany({
      where: { createdAt: { gte: sinceDate } },
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.review.findMany({
      where: { submittedAt: { not: null, gte: sinceDate } },
      select: {
        id: true,
        submittedAt: true,
        reviewer: { select: { name: true, email: true } },
        submission: { select: { title: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 20,
    }),
    prisma.editorialDecision.findMany({
      where: { decidedAt: { gte: sinceDate } },
      select: {
        id: true,
        status: true,
        decidedAt: true,
        decidedBy: { select: { name: true, email: true } },
        submission: { select: { title: true } },
      },
      orderBy: { decidedAt: "desc" },
      take: 20,
    }),
    prisma.issue.findMany({
      where: { publishedAt: { not: null, gte: sinceDate } },
      select: {
        id: true,
        volume: true,
        issueNumber: true,
        year: true,
        publishedAt: true,
        journal: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
    }),
  ]);

  const activity: ActivityItem[] = [
    ...recentUsers.map((item: RecentUserItem) => ({
      id: `user-${item.id}`,
      label: "New user registered",
      actor: item.name || item.email,
      when: item.createdAt,
      type: "USERS" as const,
    })),
    ...recentSubmissions.map((item: RecentSubmissionItem) => ({
      id: `submission-${item.id}`,
      label: `Submission created: ${item.title}`,
      actor: item.author.name || item.author.email,
      when: item.createdAt,
      type: "SUBMISSIONS" as const,
    })),
    ...recentReviews.map((item: RecentReviewItem) => ({
      id: `review-${item.id}`,
      label: `Review submitted for: ${item.submission.title}`,
      actor: item.reviewer.name || item.reviewer.email,
      when: item.submittedAt ?? new Date(0),
      type: "REVIEWS" as const,
    })),
    ...recentDecisions.map((item: RecentDecisionItem) => ({
      id: `decision-${item.id}`,
      label: `${item.status} recorded for: ${item.submission.title}`,
      actor: item.decidedBy.name || item.decidedBy.email,
      when: item.decidedAt,
      type: "DECISIONS" as const,
    })),
    ...recentPublishedIssues.map((item: RecentPublishedIssueItem) => ({
      id: `issue-${item.id}`,
      label: `Issue published: ${item.journal.name} Vol ${item.volume} No ${item.issueNumber} (${item.year})`,
      actor: "System",
      when: item.publishedAt ?? new Date(0),
      type: "PUBLICATIONS" as const,
    })),
  ]
    .sort((left, right) => right.when.getTime() - left.when.getTime())
    .slice(0, 200);

  const filteredActivity = activity.filter((item) => {
    const matchesType = selectedType === "ALL" ? true : item.type === selectedType;
    const matchesQuery = normalizedQuery ? `${item.label} ${item.actor}`.toLowerCase().includes(normalizedQuery) : true;
    return matchesType && matchesQuery;
  });

  const totalItems = filteredActivity.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedActivity = filteredActivity.slice((safePage - 1) * pageSize, safePage * pageSize);

  const buildActivityLink = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("days", String(selectedDays));
    if (selectedType !== "ALL") {
      params.set("type", selectedType);
    }
    if (query) {
      params.set("q", query);
    }
    params.set("page", String(nextPage));
    return `/dashboard/activity?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/cnu-logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Admin module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Monitor platform activity</h1>
              <p className="mt-2 text-sm text-yellow-100/85">Overview of key system activity and recent events from the last {selectedDays} days.</p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <DashboardSidebar role={session.user.role} />

          <div className="space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <article className="rounded-xl border border-yellow-500/40 bg-red-900 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-yellow-300">Users</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-50">{totalUsers}</p>
          </article>
          <article className="rounded-xl border border-yellow-500/40 bg-red-900 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-yellow-300">Journals</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-50">{totalJournals}</p>
          </article>
          <article className="rounded-xl border border-yellow-500/40 bg-red-900 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-yellow-300">Submissions</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-50">{totalSubmissions}</p>
          </article>
          <article className="rounded-xl border border-yellow-500/40 bg-red-900 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-yellow-300">Issues</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-50">{totalIssues}</p>
          </article>
          <article className="rounded-xl border border-yellow-500/40 bg-red-900 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-yellow-300">Published</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-50">{publishedIssues}</p>
              </article>
            </section>

            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Filter activity feed</h2>

          <form className="mt-4 grid gap-3 sm:grid-cols-4" method="get">
            <input type="hidden" name="page" value="1" />
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-yellow-200/85">
              Range
              <select
                name="days"
                defaultValue={String(selectedDays)}
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm normal-case tracking-normal text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              >
                {dayOptions.map((days) => (
                  <option key={days} value={days}>
                    Last {days} days
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-yellow-200/85">
              Type
              <select
                name="type"
                defaultValue={selectedType}
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm normal-case tracking-normal text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              >
                {activityTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === "ALL" ? "All activity" : type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-yellow-200/85 sm:col-span-2">
              Search label/actor
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search feed"
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm normal-case tracking-normal text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              />
            </label>

            <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-red-950 transition hover:bg-yellow-300"
              >
                Apply filters
              </button>
              <Link
                href="/dashboard/activity"
                className="rounded-lg border border-yellow-400/70 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Reset
              </Link>
            </div>
          </form>
            </section>

            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Recent activity feed ({filteredActivity.length})</h2>

          {totalItems === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No activity matches your current filters.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <ul className="space-y-3">
                {paginatedActivity.map((item) => (
                  <li key={item.id} className="rounded-lg border border-yellow-500/25 bg-red-800/60 p-3">
                    <p className="text-sm font-medium text-yellow-50">{item.label}</p>
                    <p className="mt-1 text-xs text-yellow-200/80">
                      Type: {item.type} · Actor: {item.actor} · {item.when.toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-yellow-200/85">
                <p>
                  Page {safePage} of {totalPages}
                </p>
                <PaginationNav currentPage={safePage} totalPages={totalPages} buildHref={buildActivityLink} />
              </div>
            </div>
          )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
