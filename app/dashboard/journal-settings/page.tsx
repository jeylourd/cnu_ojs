import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

export default async function JournalSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  const [journals, editors] = await Promise.all([
    prisma.journal.findMany({
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            issues: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "EDITOR"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  async function updateJournalSettings(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (currentSession.user.role !== "ADMIN") {
      redirect("/forbidden");
    }

    const journalId = String(formData.get("journalId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const issn = String(formData.get("issn") ?? "").trim();
    const editorId = String(formData.get("editorId") ?? "").trim();

    if (!journalId || !name || !editorId) {
      return;
    }

    await prisma.journal.update({
      where: { id: journalId },
      data: {
        name,
        description: description || null,
        issn: issn || null,
        editorId,
      },
    });

    revalidatePath("/dashboard/journal-settings");
    revalidatePath("/dashboard/journals");
    revalidatePath("/dashboard/publications");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Admin module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Configure journal settings</h1>
              <p className="mt-2 text-sm text-yellow-100/85">Maintain journal metadata and assign editorial ownership.</p>
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
          <DashboardSidebar role={session.user.role} currentPath="/dashboard/journal-settings" />

          <div>
            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Journal settings ({journals.length})</h2>

          {journals.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No journals found. Create one in Journal Management first.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {journals.map((journal) => (
                <article key={journal.id} className="rounded-xl border border-yellow-500/30 p-4">
                  <form action={updateJournalSettings} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="journalId" value={journal.id} />

                    <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                      Journal name
                      <input
                        type="text"
                        name="name"
                        defaultValue={journal.name}
                        required
                        className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                      />
                    </label>

                    <label className="block text-sm font-medium text-yellow-100">
                      ISSN
                      <input
                        type="text"
                        name="issn"
                        defaultValue={journal.issn ?? ""}
                        className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                      />
                    </label>

                    <label className="block text-sm font-medium text-yellow-100">
                      Editor assignment
                      <select
                        name="editorId"
                        defaultValue={journal.editorId}
                        required
                        className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                      >
                        {editors.map((editor) => (
                          <option key={editor.id} value={editor.id}>
                            {editor.name || editor.email} ({editor.role})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                      Description
                      <textarea
                        name="description"
                        rows={3}
                        defaultValue={journal.description ?? ""}
                        className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                      />
                    </label>

                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-yellow-200/80">
                        Slug: {journal.slug} · Submissions: {journal._count.submissions} · Issues: {journal._count.issues} · Current editor: {journal.editor.name || journal.editor.email}
                      </p>
                      <button
                        data-preloader="on"
                        type="submit"
                        className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                      >
                        Save settings
                      </button>
                    </div>
                  </form>
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
