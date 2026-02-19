import Link from "next/link";
import { Prisma } from "@prisma/client";

import { PaginationNav } from "@/components/ui/PaginationNav";
import { prisma } from "@/lib/prisma";

type JournalsCatalogPageProps = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

export default async function JournalsCatalogPage({ searchParams }: JournalsCatalogPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = String(resolvedSearchParams?.q ?? "").trim();
  const requestedPage = Number.parseInt(String(resolvedSearchParams?.page ?? "1"), 10);
  const page = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
  const pageSize = 8;

  const where: Prisma.JournalWhereInput = {};

  if (query) {
    where.OR = [
      {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        issn: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  const totalJournals = await prisma.journal.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalJournals / pageSize));
  const safePage = Math.min(page, totalPages);

  const journals = await prisma.journal.findMany({
    where,
    include: {
      issues: {
        where: {
          publishedAt: {
            not: null,
          },
        },
        orderBy: [{ publishedAt: "desc" }, { year: "desc" }, { volume: "desc" }, { issueNumber: "desc" }],
        select: {
          id: true,
          volume: true,
          issueNumber: true,
          year: true,
          title: true,
          publishedAt: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  const buildPageLink = (nextPage: number) => {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    params.set("page", String(nextPage));
    return `/journals?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-red-950 px-6 py-8 text-yellow-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">Public Catalog</p>
            <h1 className="mt-1 text-2xl font-semibold text-yellow-50 sm:text-3xl">Journals</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-yellow-100/85">
              Browse all journals and open each journal page to view published issues and articles.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-full border border-yellow-400/50 px-3 py-1.5 font-medium text-yellow-200 transition hover:bg-red-800"
            >
              Home
            </Link>
            <Link
              href="/issues"
              className="rounded-full border border-yellow-400/50 px-3 py-1.5 font-medium text-yellow-200 transition hover:bg-red-800"
            >
              Published Issues
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-yellow-400/50 px-3 py-1.5 font-medium text-yellow-200 transition hover:bg-red-800"
            >
              Sign in
            </Link>
          </nav>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-4 shadow-sm">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="page" value="1" />
            <label className="min-w-[220px] flex-1 text-xs font-semibold uppercase tracking-[0.12em] text-yellow-200/85">
              Search journals
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search by name, ISSN, or description"
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm normal-case tracking-normal text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
            >
              Search
            </button>

            <Link
              href="/journals"
              className="rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
            >
              Reset
            </Link>
          </form>
        </section>

        {totalJournals === 0 ? (
          <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
            <p className="text-sm text-yellow-100/85">No journals found{query ? ` for "${query}"` : ""}.</p>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="grid gap-4 sm:grid-cols-2">
              {journals.map((journal) => {
                const latestIssue = journal.issues[0];

                return (
                  <article key={journal.id} className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-5 shadow-sm">
                    <h2 className="text-xl font-semibold text-yellow-50">{journal.name}</h2>
                    <p className="mt-1 text-xs text-yellow-100/75">ISSN: {journal.issn || "Not provided"}</p>
                    <p className="mt-2 text-sm text-yellow-100/85 line-clamp-3">{journal.description || "No journal description available."}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-yellow-400 px-2.5 py-1 font-semibold text-red-950">
                        Published issues: {journal.issues.length}
                      </span>
                      {latestIssue ? (
                        <span className="rounded-full border border-yellow-400/50 px-2.5 py-1 text-yellow-100/85">
                          Latest: Vol {latestIssue.volume} No {latestIssue.issueNumber} ({latestIssue.year})
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <Link
                        href={`/journals/${journal.slug}`}
                        className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                      >
                        Open journal page
                      </Link>
                    </div>
                  </article>
                );
              })}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-500/30 bg-red-900/70 px-4 py-3 text-xs text-yellow-200/85">
              <p>
                Page {safePage} of {totalPages} · Showing {journals.length} of {totalJournals} journals
              </p>

              <div className="flex items-center gap-2">
                <PaginationNav currentPage={safePage} totalPages={totalPages} buildHref={buildPageLink} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
