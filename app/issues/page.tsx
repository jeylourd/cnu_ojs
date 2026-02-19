import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function IssuesCatalogPage() {
  const issues = await prisma.issue.findMany({
    where: {
      publishedAt: {
        not: null,
      },
    },
    include: {
      journal: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      submissions: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { year: "desc" }, { volume: "desc" }, { issueNumber: "desc" }],
  });

  return (
    <main className="min-h-screen bg-red-950 px-6 py-8 text-yellow-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">Public Catalog</p>
            <h1 className="mt-1 text-2xl font-semibold text-yellow-50 sm:text-3xl">Published Issues</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-yellow-100/85">
              Browse published journal issues and their published manuscripts.
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
              href="/journals"
              className="rounded-full border border-yellow-400/50 px-3 py-1.5 font-medium text-yellow-200 transition hover:bg-red-800"
            >
              Journals
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-yellow-400/50 px-3 py-1.5 font-medium text-yellow-200 transition hover:bg-red-800"
            >
              Sign in
            </Link>
          </nav>
        </header>

        {issues.length === 0 ? (
          <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
            <p className="text-sm text-yellow-100/85">No published issues yet.</p>
          </section>
        ) : (
          <section className="space-y-4">
            {issues.map((issue) => (
              <article key={issue.id} className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-yellow-50">
                      {issue.journal.name} · Vol {issue.volume} No {issue.issueNumber} ({issue.year})
                    </h2>
                    <p className="mt-1 text-sm text-yellow-100/85">{issue.title || "No issue title"}</p>
                    <p className="mt-1 text-xs text-yellow-100/70">
                      Published {issue.publishedAt ? new Date(issue.publishedAt).toLocaleString() : "-"}
                    </p>
                  </div>

                  <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-semibold text-red-950">
                    Articles: {issue.submissions.length}
                  </span>
                </div>

                <div className="mt-3">
                  <Link
                    href={`/journals/${issue.journal.slug}`}
                    className="mr-2 inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                  >
                    View journal page
                  </Link>
                  <Link
                    href={`/issues/${issue.id}`}
                    className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                  >
                    View issue details
                  </Link>
                </div>

                {issue.submissions.length === 0 ? (
                  <p className="mt-4 text-xs text-yellow-100/70">No published submissions in this issue.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {issue.submissions.map((submission) => (
                      <li key={submission.id} className="rounded-lg border border-yellow-500/30 p-3">
                        <p className="text-sm font-medium text-yellow-100">{submission.title}</p>
                        <p className="mt-1 text-xs text-yellow-100/80">
                          {submission.author.name || submission.author.email}
                        </p>
                        <p className="mt-1 text-xs text-yellow-100/70 line-clamp-3">{submission.abstract}</p>
                        {submission.manuscriptUrl ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(submission.manuscriptUrl.split("?")[0] ?? "").toLowerCase().endsWith(".pdf") ? (
                              <Link
                                href={`/issues/${issue.id}/articles/${submission.id}`}
                                className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                              >
                                View PDF
                              </Link>
                            ) : (
                              <a
                                href={submission.manuscriptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                              >
                                Open file
                              </a>
                            )}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
