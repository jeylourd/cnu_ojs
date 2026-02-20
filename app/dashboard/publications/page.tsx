import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

const publicationRoles = new Set(["ADMIN", "EDITOR"]);

function normalizeIssueImageUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export default async function PublicationManagementPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!publicationRoles.has(session.user.role)) {
    redirect("/forbidden");
  }

  const manageableJournals = await prisma.journal.findMany({
    where: session.user.role === "ADMIN" ? undefined : { editorId: session.user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const manageableJournalIds = manageableJournals.map((journal) => journal.id);

  const issues = await prisma.issue.findMany({
    where: {
      journalId: {
        in: manageableJournalIds,
      },
    },
    include: {
      journal: {
        select: {
          id: true,
          name: true,
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
          createdAt: "desc",
        },
      },
    },
    orderBy: [{ year: "desc" }, { volume: "desc" }, { issueNumber: "desc" }],
  });

  const assignableSubmissions = await prisma.submission.findMany({
    where: {
      status: {
        in: ["ACCEPTED", "PUBLISHED"],
      },
      issueId: null,
      journalId: {
        in: manageableJournalIds,
      },
    },
    include: {
      journal: {
        select: {
          id: true,
          name: true,
        },
      },
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
  });

  const revalidatePublicPublicationPaths = (journalSlug: string, issueId: string) => {
    revalidatePath("/issues");
    revalidatePath(`/issues/${issueId}`);
    revalidatePath("/journals");
    revalidatePath(`/journals/${journalSlug}`);
    revalidatePath(`/journals/${journalSlug}/current`);
    revalidatePath(`/journals/${journalSlug}/archives`);
  };

  async function createIssue(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!publicationRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const journalId = String(formData.get("journalId") ?? "").trim();
    const volume = Number.parseInt(String(formData.get("volume") ?? "").trim(), 10);
    const issueNumber = Number.parseInt(String(formData.get("issueNumber") ?? "").trim(), 10);
    const year = Number.parseInt(String(formData.get("year") ?? "").trim(), 10);
    const title = String(formData.get("title") ?? "").trim();
    const featuredImageUrl = normalizeIssueImageUrl(String(formData.get("featuredImageUrl") ?? ""));

    if (!journalId || Number.isNaN(volume) || Number.isNaN(issueNumber) || Number.isNaN(year)) {
      return;
    }

    const journal = await prisma.journal.findUnique({
      where: { id: journalId },
      select: { id: true, editorId: true },
    });

    if (!journal) {
      return;
    }

    if (currentSession.user.role === "EDITOR" && journal.editorId !== currentSession.user.id) {
      redirect("/forbidden");
    }

    try {
      await prisma.issue.create({
        data: {
          journalId,
          volume,
          issueNumber,
          year,
          title: title || null,
          featuredImageUrl,
        },
      });
    } catch {
      return;
    }

    revalidatePath("/dashboard/publications");
  }

  async function updateIssueFeaturedPhoto(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!publicationRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const issueId = String(formData.get("issueId") ?? "").trim();
    const featuredImageUrlInput = String(formData.get("featuredImageUrl") ?? "");
    const featuredImageUrl = normalizeIssueImageUrl(featuredImageUrlInput);

    if (!issueId) {
      return;
    }

    if (featuredImageUrlInput.trim() && !featuredImageUrl) {
      return;
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        journal: {
          select: {
            editorId: true,
            slug: true,
          },
        },
      },
    });

    if (!issue) {
      return;
    }

    if (currentSession.user.role === "EDITOR" && issue.journal.editorId !== currentSession.user.id) {
      redirect("/forbidden");
    }

    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        featuredImageUrl,
      },
    });

    revalidatePath("/dashboard/publications");
    if (issue.publishedAt) {
      revalidatePublicPublicationPaths(issue.journal.slug, issue.id);
    }
  }

  async function assignSubmissionToIssue(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!publicationRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const issueId = String(formData.get("issueId") ?? "").trim();
    const submissionId = String(formData.get("submissionId") ?? "").trim();

    if (!issueId || !submissionId) {
      return;
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
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

    if (!issue) {
      return;
    }

    if (currentSession.user.role === "EDITOR" && issue.journal.editorId !== currentSession.user.id) {
      redirect("/forbidden");
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        journalId: true,
        status: true,
      },
    });

    if (!submission || (submission.status !== "ACCEPTED" && submission.status !== "PUBLISHED")) {
      return;
    }

    if (submission.journalId !== issue.journalId) {
      return;
    }

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        issueId: issue.id,
        status: issue.publishedAt ? "PUBLISHED" : "ACCEPTED",
      },
    });

    revalidatePath("/dashboard/publications");
    revalidatePath("/dashboard/submissions");
    if (issue.publishedAt) {
      revalidatePublicPublicationPaths(issue.journal.slug, issue.id);
    }
  }

  async function publishIssue(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!publicationRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const issueId = String(formData.get("issueId") ?? "").trim();

    if (!issueId) {
      return;
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        journal: {
          select: {
            editorId: true,
            slug: true,
          },
        },
      },
    });

    if (!issue) {
      return;
    }

    if (currentSession.user.role === "EDITOR" && issue.journal.editorId !== currentSession.user.id) {
      redirect("/forbidden");
    }

    await prisma.$transaction([
      prisma.issue.update({
        where: { id: issue.id },
        data: {
          publishedAt: new Date(),
        },
      }),
      prisma.submission.updateMany({
        where: {
          issueId: issue.id,
          status: {
            not: "PUBLISHED",
          },
        },
        data: {
          status: "PUBLISHED",
        },
      }),
    ]);

    revalidatePath("/dashboard/publications");
    revalidatePath("/dashboard/submissions");
    revalidatePublicPublicationPaths(issue.journal.slug, issue.id);
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Publication module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Issue and publication management</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
              Create journal issues, assign accepted submissions, and mark issues as published.
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
              <h2 className="text-lg font-semibold text-yellow-50">Create volume / issue</h2>

          {manageableJournals.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No manageable journals found for this account.</p>
          ) : (
            <form action={createIssue} className="mt-4 grid gap-4 sm:grid-cols-4">
              <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                Journal
                <select
                  name="journalId"
                  required
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                >
                  {manageableJournals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-yellow-100">
                Volume
                <input
                  type="number"
                  name="volume"
                  min={1}
                  required
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-medium text-yellow-100">
                Issue
                <input
                  type="number"
                  name="issueNumber"
                  min={1}
                  required
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-medium text-yellow-100">
                Year
                <input
                  type="number"
                  name="year"
                  min={1900}
                  max={3000}
                  required
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                />
              </label>

              <label className="block text-sm font-medium text-yellow-100 sm:col-span-3">
                Issue title (optional)
                <input
                  type="text"
                  name="title"
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                  placeholder="Special Issue on Community Health"
                />
              </label>

              <label className="block text-sm font-medium text-yellow-100 sm:col-span-4">
                Featured photo URL (optional)
                <input
                  type="text"
                  name="featuredImageUrl"
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                  placeholder="https://example.com/issue-cover.jpg or /uploads/issues/cover.jpg"
                />
              </label>

              <div className="sm:col-span-4">
                <button
                  data-preloader="on"
                  type="submit"
                  className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                >
                  Create issue
                </button>
              </div>
            </form>
          )}
            </section>

            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Assign accepted submissions</h2>

          {assignableSubmissions.length === 0 || issues.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">
              Need at least one assignable submission and one issue to assign publication.
            </p>
          ) : (
            <form action={assignSubmissionToIssue} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-yellow-100">
                Assignable submission
                <select
                  name="submissionId"
                  required
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                >
                  {assignableSubmissions.map((submission) => (
                    <option key={submission.id} value={submission.id}>
                      [{submission.status}] {submission.title} ({submission.journal.name})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-yellow-100">
                Target issue
                <select
                  name="issueId"
                  required
                  className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                >
                  {issues.map((issue) => (
                    <option key={issue.id} value={issue.id}>
                      [{issue.publishedAt ? "Published" : "Draft"}] {issue.journal.name} · Vol {issue.volume} No {issue.issueNumber} ({issue.year})
                    </option>
                  ))}
                </select>
              </label>

              <div className="sm:col-span-2">
                <button
                  data-preloader="on"
                  type="submit"
                  className="rounded-lg border border-yellow-400/70 px-4 py-2.5 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
                >
                  Assign to issue
                </button>
              </div>
            </form>
          )}
            </section>

            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Issue publication list ({issues.length})</h2>

          {issues.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No issues created yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {issues.map((issue) => (
                <article key={issue.id} className="rounded-xl border border-yellow-500/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold">
                        {issue.journal.name} · Vol {issue.volume} No {issue.issueNumber} ({issue.year})
                      </h3>
                      <p className="mt-1 text-sm text-yellow-100/85">{issue.title || "No issue title"}</p>
                      <p className="mt-1 text-xs text-yellow-200/80">
                        {issue.publishedAt
                          ? `Published on ${new Date(issue.publishedAt).toLocaleString()}`
                          : "Draft issue"}
                      </p>
                    </div>

                    <form action={publishIssue}>
                      <input type="hidden" name="issueId" value={issue.id} />
                      <button
                        data-preloader="on"
                        type="submit"
                        className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!!issue.publishedAt}
                      >
                        {issue.publishedAt ? "Already published" : "Mark as published"}
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 rounded-lg border border-yellow-500/25 p-3">
                    {issue.featuredImageUrl ? (
                      <Image
                        src={issue.featuredImageUrl}
                        alt={`Featured photo for ${issue.journal.name} volume ${issue.volume} issue ${issue.issueNumber}`}
                        width={1200}
                        height={650}
                        className="mb-3 h-44 w-full rounded-lg border border-yellow-500/30 object-cover"
                      />
                    ) : (
                      <p className="mb-3 text-xs text-yellow-100/70">No featured photo set for this issue.</p>
                    )}

                    <form action={updateIssueFeaturedPhoto} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input type="hidden" name="issueId" value={issue.id} />
                      <input
                        type="text"
                        name="featuredImageUrl"
                        defaultValue={issue.featuredImageUrl ?? ""}
                        className="w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                        placeholder="https://example.com/issue-cover.jpg or /uploads/issues/cover.jpg"
                      />
                      <button
                        data-preloader="on"
                        type="submit"
                        className="rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:bg-red-800"
                      >
                        Save photo
                      </button>
                    </form>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-semibold">Assigned submissions ({issue.submissions.length})</h4>
                    {issue.submissions.length === 0 ? (
                      <p className="mt-2 text-xs text-yellow-200/80">No submissions assigned yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-xs">
                        {issue.submissions.map((submission) => (
                          <li key={submission.id} className="rounded-md border border-yellow-500/30 p-2">
                            <p className="font-medium">{submission.title}</p>
                            <p className="mt-1 text-yellow-100/85">
                              Author: {submission.author.name || submission.author.email} · Status: {submission.status}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
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
