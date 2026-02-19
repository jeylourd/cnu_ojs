import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default async function JournalManagementPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  const journals = await prisma.journal.findMany({
    include: {
      editor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  async function createJournal(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (currentSession.user.role !== "ADMIN") {
      redirect("/forbidden");
    }

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const issn = String(formData.get("issn") ?? "").trim();

    if (!name) {
      return;
    }

    const baseSlug = toSlug(name);

    if (!baseSlug) {
      return;
    }

    let slug = baseSlug;
    let index = 1;

    while (await prisma.journal.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${index}`;
      index += 1;
    }

    await prisma.journal.create({
      data: {
        name,
        slug,
        description: description || null,
        issn: issn || null,
        editorId: currentSession.user.id,
      },
    });

    revalidatePath("/dashboard/journals");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Admin module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Journal management</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
              Create and manage journals for your OJS platform.
              </p>
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
          <DashboardSidebar role={session.user.role} />

          <div className="space-y-8">
            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Create new journal</h2>

          <form action={createJournal} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
              Journal name
              <input
                type="text"
                name="name"
                required
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                placeholder="College of Nursing Journal"
              />
            </label>

            <label className="block text-sm font-medium text-yellow-100">
              ISSN (optional)
              <input
                type="text"
                name="issn"
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                placeholder="1234-5678"
              />
            </label>

            <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
              Description (optional)
              <textarea
                name="description"
                rows={3}
                className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                placeholder="Scope, audience, and publication focus"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
              >
                Create journal
              </button>
            </div>
          </form>
            </section>

            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Existing journals ({journals.length})</h2>

          {journals.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No journals yet. Create the first one above.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-yellow-500/40 text-left">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Slug</th>
                    <th className="py-2 pr-4 font-medium">ISSN</th>
                    <th className="py-2 pr-4 font-medium">Editor</th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((journal) => (
                    <tr key={journal.id} className="border-b border-yellow-500/20">
                      <td className="py-2 pr-4">{journal.name}</td>
                      <td className="py-2 pr-4 text-yellow-200/80">{journal.slug}</td>
                      <td className="py-2 pr-4">{journal.issn ?? "-"}</td>
                      <td className="py-2 pr-4">{journal.editor.name || journal.editor.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
