import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JournalPublicNav } from "@/components/journals/JournalPublicNav";
import { prisma } from "@/lib/prisma";

type JournalCurrentPageProps = {
  params: Promise<{ slug: string }>;
};

function resolveFeaturedImage(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return {
      src: trimmed,
      external: false,
    };
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return {
      src: parsed.toString(),
      external: true,
    };
  } catch {
    return null;
  }
}

export default async function JournalCurrentPage({ params }: JournalCurrentPageProps) {
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
        include: {
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
        take: 1,
      },
    },
  });

  if (!journal) {
    notFound();
  }

  const currentIssue = journal.issues[0];
  const currentIssueFeaturedImage = resolveFeaturedImage(currentIssue?.featuredImageUrl);

  return (
    <main className="min-h-screen bg-red-950 px-6 py-8 text-yellow-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-2xl border border-yellow-500/50 bg-red-900 px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Current Issue</p>
              <h1 className="mt-1 text-2xl font-semibold text-yellow-50 sm:text-3xl">{journal.name}</h1>
            </div>

            <JournalPublicNav slug={journal.slug} active="CURRENT" />
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
          {!currentIssue ? (
            <p className="text-sm text-yellow-100/85">No current published issue yet for this journal.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-yellow-500/30 p-4">
                {currentIssueFeaturedImage ? (
                  currentIssueFeaturedImage.external ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentIssueFeaturedImage.src}
                      alt={`Featured photo for ${journal.name} volume ${currentIssue.volume} issue ${currentIssue.issueNumber}`}
                      loading="lazy"
                      className="mb-4 h-56 w-full rounded-lg border border-yellow-500/30 object-cover"
                    />
                  ) : (
                    <Image
                      src={currentIssueFeaturedImage.src}
                      alt={`Featured photo for ${journal.name} volume ${currentIssue.volume} issue ${currentIssue.issueNumber}`}
                      width={1400}
                      height={750}
                      className="mb-4 h-56 w-full rounded-lg border border-yellow-500/30 object-cover"
                    />
                  )
                ) : null}

                <h2 className="text-lg font-semibold text-yellow-50">
                  Vol {currentIssue.volume} No {currentIssue.issueNumber} ({currentIssue.year})
                </h2>
                <p className="mt-1 text-sm text-yellow-100/85">{currentIssue.title || "No issue title"}</p>
                <p className="mt-1 text-xs text-yellow-100/70">
                  Published {currentIssue.publishedAt ? new Date(currentIssue.publishedAt).toLocaleString() : "-"}
                </p>
                <div className="mt-3">
                  <Link
                    href={`/issues/${currentIssue.id}`}
                    className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                  >
                    View full issue page
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-yellow-200/85">
                  Published Articles ({currentIssue.submissions.length})
                </h3>
                {currentIssue.submissions.length === 0 ? (
                  <p className="mt-2 text-xs text-yellow-100/75">No published articles yet in the current issue.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {currentIssue.submissions.map((submission) => (
                      <li key={submission.id} className="rounded-lg border border-yellow-500/25 p-3">
                        <p className="text-sm font-medium text-yellow-100">{submission.title}</p>
                        <p className="mt-1 text-xs text-yellow-100/80">{submission.author.name || submission.author.email}</p>
                        <p className="mt-1 text-xs text-yellow-100/70 line-clamp-3">{submission.abstract}</p>
                        {submission.manuscriptUrl ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(submission.manuscriptUrl.split("?")[0] ?? "").toLowerCase().endsWith(".pdf") ? (
                              <Link
                                href={`/issues/${currentIssue.id}/articles/${submission.id}`}
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
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
