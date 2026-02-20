import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

type IssueDetailPageProps = {
  params: Promise<{ issueId: string }>;
};

export default async function IssueDetailPage({ params }: IssueDetailPageProps) {
  const { issueId } = await params;

  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
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
          issn: true,
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
  });

  if (!issue) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-8 text-yellow-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="rounded-2xl border border-yellow-500/50 bg-red-900 px-5 py-4 shadow-sm">
          {issue.featuredImageUrl ? (
            <Image
              src={issue.featuredImageUrl}
              alt={`Featured photo for ${issue.journal.name} volume ${issue.volume} issue ${issue.issueNumber}`}
              width={1600}
              height={900}
              className="mb-4 h-64 w-full rounded-xl border border-yellow-500/30 object-cover"
            />
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Issue Detail</p>
              <h1 className="text-2xl font-semibold text-yellow-50 sm:text-3xl">
                {issue.journal.name} · Vol {issue.volume} No {issue.issueNumber} ({issue.year})
              </h1>
              <p className="text-sm text-yellow-100/85">{issue.title || "No issue title"}</p>
              <p className="text-xs text-yellow-100/70">
                Published {issue.publishedAt ? new Date(issue.publishedAt).toLocaleString() : "-"}
                {issue.journal.issn ? ` · ISSN ${issue.journal.issn}` : ""}
              </p>
            </div>

            <nav className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex rounded-full border border-yellow-400/50 px-3 py-1.5 text-sm font-medium text-yellow-200 transition hover:bg-red-800"
              >
                Home
              </Link>
              <Link
                href="/journals"
                className="inline-flex rounded-full border border-yellow-400/50 px-3 py-1.5 text-sm font-medium text-yellow-200 transition hover:bg-red-800"
              >
                Journals
              </Link>
              <Link
                href="/issues"
                className="inline-flex rounded-full border border-yellow-400/50 px-3 py-1.5 text-sm font-medium text-yellow-200 transition hover:bg-red-800"
              >
                Back to issues
              </Link>
            </nav>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/issues"
              className="inline-flex rounded-lg border border-yellow-400/50 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
            >
              Back to issues
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-lg border border-yellow-400/50 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
            >
              Home
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-yellow-100">Published Articles ({issue.submissions.length})</h2>

          {issue.submissions.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/80">No published articles in this issue yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {issue.submissions.map((submission) => (
                <li key={submission.id} className="rounded-xl border border-yellow-500/30 p-4">
                  <h3 className="text-base font-semibold text-yellow-100">{submission.title}</h3>
                  <p className="mt-1 text-xs text-yellow-100/80">
                    {submission.author.name || submission.author.email}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-yellow-100/85">{submission.abstract}</p>
                  {submission.manuscriptUrl ? (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                  {submission.keywords.length > 0 ? (
                    <p className="mt-3 text-xs text-yellow-100/70">Keywords: {submission.keywords.join(", ")}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
