import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JournalPublicNav } from "@/components/journals/JournalPublicNav";
import { prisma } from "@/lib/prisma";

type JournalDetailPageProps = {
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

export default async function JournalDetailPage({ params }: JournalDetailPageProps) {
  const { slug } = await params;

  const journal = await prisma.journal.findFirst({
    where: {
      slug,
    },
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

  const currentIssue = journal.issues[0];
  const currentIssueFeaturedImage = resolveFeaturedImage(currentIssue?.featuredImageUrl);

  return (
    <main className="min-h-screen bg-red-950 px-6 py-8 text-yellow-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-2xl border border-yellow-500/50 bg-red-900 px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Journal Home</p>
              <h1 className="mt-1 text-2xl font-semibold text-yellow-50 sm:text-3xl">{journal.name}</h1>
              <p className="mt-1 text-sm text-yellow-100/85">{journal.description || "No journal description provided."}</p>
              <p className="mt-1 text-xs text-yellow-100/70">ISSN: {journal.issn || "Not provided"}</p>
            </div>

            <JournalPublicNav slug={journal.slug} active="HOME" />
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-yellow-100">Welcome to {journal.name}</h2>
          <p className="mt-3 text-sm leading-6 text-yellow-100/85">
            This is the public journal home page. Use the menu to open the current issue, browse archives, read journal information,
            or check announcements.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-yellow-500/30 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">Current</p>
              {currentIssueFeaturedImage && currentIssue ? (
                currentIssueFeaturedImage.external ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentIssueFeaturedImage.src}
                    alt={`Featured photo for volume ${currentIssue.volume} issue ${currentIssue.issueNumber}`}
                    loading="lazy"
                    className="mt-2 h-28 w-full rounded-lg border border-yellow-500/30 object-cover"
                  />
                ) : (
                  <Image
                    src={currentIssueFeaturedImage.src}
                    alt={`Featured photo for volume ${currentIssue.volume} issue ${currentIssue.issueNumber}`}
                    width={640}
                    height={280}
                    className="mt-2 h-28 w-full rounded-lg border border-yellow-500/30 object-cover"
                  />
                )
              ) : null}
              <p className="mt-2 text-sm text-yellow-100/85">
                {currentIssue
                  ? `Vol ${currentIssue.volume} No ${currentIssue.issueNumber} (${currentIssue.year})`
                  : "No published issue yet"}
              </p>
            </article>
            <article className="rounded-xl border border-yellow-500/30 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">Archives</p>
              <p className="mt-2 text-sm text-yellow-100/85">Published issues: {journal.issues.length}</p>
            </article>
            <article className="rounded-xl border border-yellow-500/30 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">ISSN</p>
              <p className="mt-2 text-sm text-yellow-100/85">{journal.issn || "Not provided"}</p>
            </article>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/journals/${journal.slug}/current`} className="rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800">
              Open current issue
            </Link>
            <Link href={`/journals/${journal.slug}/archives`} className="rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800">
              Open archives
            </Link>
            <Link href={`/journals/${journal.slug}/about`} className="rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800">
              About journal
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
