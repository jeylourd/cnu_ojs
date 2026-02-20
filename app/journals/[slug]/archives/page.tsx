import Link from "next/link";
import { notFound } from "next/navigation";

import { JournalPublicNav } from "@/components/journals/JournalPublicNav";
import { prisma } from "@/lib/prisma";

type JournalArchivesPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JournalArchivesPage({ params }: JournalArchivesPageProps) {
  const { slug } = await params;

  const journal = await prisma.journal.findFirst({
    where: { slug },
    include: {
      issues: {
        where: {
          publishedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          volume: true,
          issueNumber: true,
          year: true,
          title: true,
          featuredImageUrl: true,
          publishedAt: true,
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { year: "desc" }, { volume: "desc" }, { issueNumber: "desc" }],
      },
    },
  });

  if (!journal) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-8 text-yellow-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-2xl border border-yellow-500/50 bg-red-900 px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Archives</p>
              <h1 className="mt-1 text-2xl font-semibold text-yellow-50 sm:text-3xl">{journal.name}</h1>
            </div>

            <JournalPublicNav slug={journal.slug} active="ARCHIVES" />
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-yellow-100">Published Issues ({journal.issues.length})</h2>

          {journal.issues.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/80">No published issues yet for this journal.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {journal.issues.map((issue) => (
                <article key={issue.id} className="rounded-xl border border-yellow-500/30 p-4">
                  {issue.featuredImageUrl ? (
                    <div className="mb-4 overflow-hidden rounded-lg border border-yellow-500/30 bg-red-950">
                      <img
                        src={issue.featuredImageUrl}
                        alt={`Featured image for ${issue.title || `Volume ${issue.volume} Issue ${issue.issueNumber}`}`}
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-yellow-50">
                        Vol {issue.volume} No {issue.issueNumber} ({issue.year})
                      </h3>
                      <p className="mt-1 text-sm text-yellow-100/85">{issue.title || "No issue title"}</p>
                      <p className="mt-1 text-xs text-yellow-100/70">
                        Published {issue.publishedAt ? new Date(issue.publishedAt).toLocaleString() : "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-semibold text-red-950">
                        Articles: {issue._count.submissions}
                      </span>
                      <Link
                        href={`/issues/${issue.id}`}
                        className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                      >
                        View issue
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
