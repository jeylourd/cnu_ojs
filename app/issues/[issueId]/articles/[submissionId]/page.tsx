import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

type PublishedArticleViewerPageProps = {
  params: Promise<{ issueId: string; submissionId: string }>;
};

export default async function PublishedArticleViewerPage({ params }: PublishedArticleViewerPageProps) {
  const { issueId, submissionId } = await params;

  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      publishedAt: { not: null },
    },
    select: {
      id: true,
      volume: true,
      issueNumber: true,
      year: true,
      journal: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!issue) {
    notFound();
  }

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      issueId: issue.id,
    },
    select: {
      id: true,
      title: true,
      abstract: true,
      manuscriptUrl: true,
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }

  const manuscriptPath = submission.manuscriptUrl?.split("?")[0] ?? "";
  const isPdf = manuscriptPath.toLowerCase().endsWith(".pdf");

  return (
    <main className="min-h-screen bg-red-950 px-6 py-8 text-yellow-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-yellow-500/50 bg-red-900 px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Published Article</p>
              <h1 className="mt-1 text-xl font-semibold text-yellow-50 sm:text-2xl">{submission.title}</h1>
              <p className="mt-1 text-xs text-yellow-100/80">{submission.author.name || submission.author.email}</p>
              <p className="mt-1 text-xs text-yellow-100/70">
                {issue.journal.name} · Vol {issue.volume} No {issue.issueNumber} ({issue.year})
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/issues/${issue.id}`}
                className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Back to issue
              </Link>
              <Link
                href={`/journals/${issue.journal.slug}/current`}
                className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Journal current
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-4 shadow-sm">
          {!submission.manuscriptUrl ? (
            <p className="text-sm text-yellow-100/85">No manuscript file is available for this article yet.</p>
          ) : isPdf ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <a
                  href={submission.manuscriptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                >
                  Open in new tab
                </a>
              </div>
              <iframe
                src={submission.manuscriptUrl}
                title={submission.title}
                className="h-[75vh] w-full rounded-lg border border-yellow-500/30 bg-red-950"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-yellow-100/85">This manuscript is not a PDF file, so inline viewing is unavailable.</p>
              <a
                href={submission.manuscriptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Open manuscript file
              </a>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-yellow-200/85">Abstract</h2>
          <p className="mt-2 text-sm leading-6 text-yellow-100/85">{submission.abstract}</p>
        </section>
      </div>
    </main>
  );
}
