import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

const announcementRoles = new Set(["ADMIN", "EDITOR"]);

type DashboardAnnouncementsPageProps = {
  searchParams?: Promise<{ journalId?: string }>;
};

export default async function DashboardAnnouncementsPage({ searchParams }: DashboardAnnouncementsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!announcementRoles.has(session.user.role)) {
    redirect("/forbidden");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const manageableJournals = await prisma.journal.findMany({
    where: session.user.role === "ADMIN" ? undefined : { editorId: session.user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  const selectedJournalId =
    manageableJournals.find((journal) => journal.id === resolvedSearchParams?.journalId)?.id ?? manageableJournals[0]?.id ?? null;

  const announcements = await prisma.announcement.findMany({
    where: selectedJournalId ? { journalId: selectedJournalId } : undefined,
    include: {
      journal: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  async function createAnnouncement(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!announcementRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const journalId = String(formData.get("journalId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const shouldPublish = String(formData.get("publishNow") ?? "") === "on";

    if (!journalId || !title || !content) {
      return;
    }

    const journal = await prisma.journal.findUnique({
      where: { id: journalId },
      select: {
        id: true,
        slug: true,
        editorId: true,
      },
    });

    if (!journal) {
      return;
    }

    if (currentSession.user.role === "EDITOR" && journal.editorId !== currentSession.user.id) {
      redirect("/forbidden");
    }

    await prisma.announcement.create({
      data: {
        journalId,
        createdById: currentSession.user.id,
        title,
        content,
        publishedAt: shouldPublish ? new Date() : null,
      },
    });

    revalidatePath("/dashboard/announcements");
    revalidatePath(`/journals/${journal.slug}/announcements`);
  }

  async function publishAnnouncement(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!announcementRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const announcementId = String(formData.get("announcementId") ?? "").trim();

    if (!announcementId) {
      return;
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        journal: {
          select: {
            id: true,
            editorId: true,
            slug: true,
          },
        },
      },
    });

    if (!announcement) {
      return;
    }

    if (currentSession.user.role === "EDITOR" && announcement.journal.editorId !== currentSession.user.id) {
      redirect("/forbidden");
    }

    await prisma.announcement.update({
      where: { id: announcement.id },
      data: {
        publishedAt: announcement.publishedAt ? null : new Date(),
      },
    });

    revalidatePath("/dashboard/announcements");
    revalidatePath(`/journals/${announcement.journal.slug}/announcements`);
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Editorial module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Journal announcements</h1>
              <p className="mt-2 text-sm text-yellow-100/85">Create and publish announcement posts visible on each journal&apos;s public announcements page.</p>
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
          <DashboardSidebar role={session.user.role} currentPath="/dashboard/announcements" />

          <div className="space-y-8">
            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Create announcement</h2>

          {manageableJournals.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No manageable journals found for this account.</p>
          ) : (
            <form action={createAnnouncement} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-yellow-100">
                Journal
                <select
                  name="journalId"
                  required
                  defaultValue={selectedJournalId ?? ""}
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                >
                  {manageableJournals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-yellow-100 sm:mt-7">
                <input type="checkbox" name="publishNow" defaultChecked className="h-4 w-4 accent-yellow-400" />
                Publish now (publicly visible)
              </label>

              <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                Title
                <input
                  type="text"
                  name="title"
                  required
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                  placeholder="Editorial notice"
                />
              </label>

              <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                Content
                <textarea
                  name="content"
                  rows={5}
                  required
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                  placeholder="Write announcement details here..."
                />
              </label>

              <div className="sm:col-span-2">
                <button
                  data-preloader="on"
                  type="submit"
                  className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                >
                  Save announcement
                </button>
              </div>
            </form>
          )}
            </section>

            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-yellow-50">Announcement list ({announcements.length})</h2>
            <form method="get" className="flex items-center gap-2 text-sm">
              <label className="text-yellow-100">Journal</label>
              <select
                name="journalId"
                defaultValue={selectedJournalId ?? ""}
                className="rounded-lg border border-yellow-500/40 bg-red-950 px-2 py-1.5 text-xs text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
              >
                {manageableJournals.map((journal) => (
                  <option key={journal.id} value={journal.id}>
                    {journal.name}
                  </option>
                ))}
              </select>
              <button
                data-preloader="on"
                type="submit"
                className="rounded-lg border border-yellow-400/70 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
              >
                Filter
              </button>
            </form>
          </div>

          {announcements.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No announcements yet for this journal.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {announcements.map((announcement) => (
                <article key={announcement.id} className="rounded-xl border border-yellow-500/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-yellow-50 break-words">{announcement.title}</h3>
                      <p className="mt-1 text-xs text-yellow-200/80">
                        Journal: {announcement.journal.name} · By {announcement.createdBy.name || announcement.createdBy.email}
                      </p>
                      <p className="mt-1 text-xs text-yellow-200/80">
                        {announcement.publishedAt
                          ? `Published ${new Date(announcement.publishedAt).toLocaleString()}`
                          : "Draft (not public yet)"}
                      </p>
                    </div>

                    <form action={publishAnnouncement}>
                      <input type="hidden" name="announcementId" value={announcement.id} />
                      <button
                        data-preloader="on"
                        type="submit"
                        className="rounded-lg border border-yellow-400/70 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                      >
                        {announcement.publishedAt ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-yellow-100/85 whitespace-pre-line break-words">{announcement.content}</p>

                  <div className="mt-3">
                    <Link
                      href={`/journals/${announcement.journal.slug}/announcements`}
                      className="inline-flex rounded-lg border border-yellow-400/50 px-3 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                    >
                      Open public page
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
