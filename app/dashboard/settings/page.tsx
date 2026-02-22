import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

const settingsRoles = new Set(["ADMIN", "EDITOR"]);

export default async function JournalSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!settingsRoles.has(session.user.role)) {
    redirect("/forbidden");
  }

  const journals = await prisma.journal.findMany({
    include: {
      settings: true,
      _count: {
        select: {
          customPages: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  async function updateSettings(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!settingsRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const journalId = String(formData.get("journalId") ?? "").trim();
    const primaryColor = String(formData.get("primaryColor") ?? "").trim();
    const accentColor = String(formData.get("accentColor") ?? "").trim();
    const aboutText = String(formData.get("aboutText") ?? "").trim();
    const contactEmail = String(formData.get("contactEmail") ?? "").trim();
    const enableSubmissions = formData.get("enableSubmissions") === "on";
    const enableAnnouncements = formData.get("enableAnnouncements") === "on";

    if (!journalId) {
      return;
    }

    await prisma.journalSettings.upsert({
      where: { journalId },
      create: {
        journalId,
        primaryColor: primaryColor || "#991b1b",
        accentColor: accentColor || "#fbbf24",
        aboutText: aboutText || null,
        contactEmail: contactEmail || null,
        enableSubmissions,
        enableAnnouncements,
      },
      update: {
        primaryColor: primaryColor || "#991b1b",
        accentColor: accentColor || "#fbbf24",
        aboutText: aboutText || null,
        contactEmail: contactEmail || null,
        enableSubmissions,
        enableAnnouncements,
      },
    });

    revalidatePath("/dashboard/journal-settings");
  }

  async function createCustomPage(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!settingsRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const journalId = String(formData.get("journalId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const published = formData.get("published") === "on";

    if (!journalId || !slug || !title || !content) {
      return;
    }

    const currentPages = await prisma.customPage.findMany({
      where: { journalId },
      orderBy: { sequence: "desc" },
      take: 1,
    });

    const nextSequence = currentPages.length > 0 ? currentPages[0].sequence + 1 : 0;

    await prisma.customPage.create({
      data: {
        journalId,
        slug,
        title,
        content,
        published,
        sequence: nextSequence,
      },
    });

    revalidatePath("/dashboard/journal-settings");
  }

  async function deleteCustomPage(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!settingsRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const pageId = String(formData.get("pageId") ?? "").trim();

    if (!pageId) {
      return;
    }

    await prisma.customPage.delete({
      where: { id: pageId },
    });

    revalidatePath("/dashboard/journal-settings");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Settings module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Journal settings &amp; custom pages</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
                Configure journal branding, features, and create custom content pages.
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
          <DashboardSidebar role={session.user.role} currentPath="/dashboard/settings" />

          <div className="space-y-8">
            {journals.map((journal) => (
              <section key={journal.id} className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-yellow-50">{journal.name}</h2>

                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-yellow-50">General settings</h3>
                    <form action={updateSettings} className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="journalId" value={journal.id} />

                      <label className="block text-sm font-medium text-yellow-100">
                        Primary color
                        <input
                          type="color"
                          name="primaryColor"
                          defaultValue={journal.settings?.primaryColor ?? "#991b1b"}
                          className="mt-1 h-10 w-full rounded-lg border border-yellow-500/40 bg-red-950 outline-none ring-yellow-400 focus:ring-2"
                        />
                      </label>

                      <label className="block text-sm font-medium text-yellow-100">
                        Accent color
                        <input
                          type="color"
                          name="accentColor"
                          defaultValue={journal.settings?.accentColor ?? "#fbbf24"}
                          className="mt-1 h-10 w-full rounded-lg border border-yellow-500/40 bg-red-950 outline-none ring-yellow-400 focus:ring-2"
                        />
                      </label>

                      <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                        About text
                        <textarea
                          name="aboutText"
                          rows={4}
                          defaultValue={journal.settings?.aboutText ?? ""}
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                          placeholder="Describe the journal's mission and scope"
                        />
                      </label>

                      <label className="block text-sm font-medium text-yellow-100">
                        Contact email
                        <input
                          type="email"
                          name="contactEmail"
                          defaultValue={journal.settings?.contactEmail ?? ""}
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                          placeholder="editor@journal.edu"
                        />
                      </label>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-yellow-100">
                          <input
                            type="checkbox"
                            name="enableSubmissions"
                            defaultChecked={journal.settings?.enableSubmissions ?? true}
                            className="h-4 w-4 rounded border-yellow-500/40 bg-red-950 text-yellow-400 focus:ring-2 focus:ring-yellow-400"
                          />
                          Enable submissions
                        </label>

                        <label className="flex items-center gap-2 text-sm font-medium text-yellow-100">
                          <input
                            type="checkbox"
                            name="enableAnnouncements"
                            defaultChecked={journal.settings?.enableAnnouncements ?? true}
                            className="h-4 w-4 rounded border-yellow-500/40 bg-red-950 text-yellow-400 focus:ring-2 focus:ring-yellow-400"
                          />
                          Enable announcements
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          data-preloader="on"
                          type="submit"
                          className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                        >
                          Save settings
                        </button>
                      </div>
                    </form>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-yellow-50">Custom pages ({journal._count.customPages})</h3>
                    <form action={createCustomPage} className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="journalId" value={journal.id} />

                      <label className="block text-sm font-medium text-yellow-100">
                        Slug
                        <input
                          type="text"
                          name="slug"
                          required
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                          placeholder="about-us"
                        />
                      </label>

                      <label className="block text-sm font-medium text-yellow-100">
                        Title
                        <input
                          type="text"
                          name="title"
                          required
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                          placeholder="About Us"
                        />
                      </label>

                      <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                        Content
                        <textarea
                          name="content"
                          required
                          rows={6}
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                          placeholder="Page content (Markdown or HTML supported)"
                        />
                      </label>

                      <label className="flex items-center gap-2 text-sm font-medium text-yellow-100">
                        <input
                          type="checkbox"
                          name="published"
                          className="h-4 w-4 rounded border-yellow-500/40 bg-red-950 text-yellow-400 focus:ring-2 focus:ring-yellow-400"
                        />
                        Published
                      </label>

                      <div className="flex justify-end">
                        <button
                          data-preloader="on"
                          type="submit"
                          className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                        >
                          Create page
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
