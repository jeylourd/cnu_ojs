import { notFound } from "next/navigation";

import { JournalPublicNav } from "@/components/journals/JournalPublicNav";
import { prisma } from "@/lib/prisma";

type JournalAnnouncementsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JournalAnnouncementsPage({ params }: JournalAnnouncementsPageProps) {
  const { slug } = await params;

  const journal = await prisma.journal.findFirst({
    where: { slug },
    include: {
      announcements: {
        where: {
          publishedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          publishedAt: true,
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 10,
      },
      issues: {
        where: {
          publishedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          title: true,
          volume: true,
          issueNumber: true,
          year: true,
          publishedAt: true,
        },
        orderBy: [{ publishedAt: "desc" }, { year: "desc" }, { volume: "desc" }, { issueNumber: "desc" }],
        take: 3,
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
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Announcements</p>
              <h1 className="mt-1 text-2xl font-semibold text-yellow-50 sm:text-3xl">{journal.name}</h1>
            </div>

            <JournalPublicNav slug={journal.slug} active="ANNOUNCEMENTS" />
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-yellow-100">Latest Updates</h2>

          {journal.announcements.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/80">No announcements yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {journal.announcements.map((announcement) => (
                <li key={announcement.id} className="rounded-xl border border-yellow-500/30 p-4">
                  <p className="text-sm font-semibold text-yellow-50 break-words">{announcement.title}</p>
                  <p className="mt-1 text-sm text-yellow-100/85 whitespace-pre-line break-words">
                    {announcement.content}
                  </p>
                  <p className="mt-1 text-xs text-yellow-100/70">
                    {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleString() : "-"} · by {announcement.createdBy.name || announcement.createdBy.email}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {journal.issues.length > 0 ? (
            <div className="mt-6 rounded-xl border border-yellow-500/30 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">Related recently published issues</p>
              <ul className="mt-2 space-y-1 text-sm text-yellow-100/85">
                {journal.issues.map((issue) => (
                  <li key={issue.id}>
                    Vol {issue.volume} No {issue.issueNumber} ({issue.year}) {issue.title ? `· ${issue.title}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
