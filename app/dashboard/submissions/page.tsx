import { revalidatePath } from "next/cache";
import { mkdir, stat, writeFile } from "node:fs/promises";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ContributorFields } from "@/components/submissions/ContributorFields";
import { prisma } from "@/lib/prisma";
import { sendSubmissionNotificationEmail } from "@/lib/mailer";

type SubmissionStatusValue =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REVISION_REQUIRED"
  | "ACCEPTED"
  | "REJECTED"
  | "PUBLISHED";

const editableStatuses: SubmissionStatusValue[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "REVISION_REQUIRED",
  "ACCEPTED",
  "REJECTED",
  "PUBLISHED",
];

const createAllowedRoles = new Set(["AUTHOR"]);
const statusManageRoles = new Set(["ADMIN", "EDITOR"]);

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    return "PDF";
  }

  if (extension === ".doc") {
    return "DOC";
  }

  if (extension === ".docx") {
    return "DOCX";
  }

  return extension.replace(".", "").toUpperCase() || "FILE";
}

function getOriginalFilenameFromUrl(manuscriptUrl: string) {
  try {
    const parsedUrl = new URL(manuscriptUrl, "http://localhost");
    const filename = parsedUrl.searchParams.get("name")?.trim();

    return filename || "manuscript";
  } catch {
    return "manuscript";
  }
}

export default async function SubmissionManagementPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const canCreateSubmission = createAllowedRoles.has(role);
  const canManageStatus = statusManageRoles.has(role);

  const journals = await prisma.journal.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const submissions = await prisma.submission.findMany({
    where:
      role === "AUTHOR"
        ? { authorId: session.user.id }
        : role === "REVIEWER"
          ? { reviews: { some: { reviewerId: session.user.id } } }
          : undefined,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      journal: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      decisions: {
        include: {
          decidedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          decidedAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const manuscriptMetaBySubmissionId = new Map<string, { type: string; size: string }>();

  await Promise.all(
    submissions.map(async (submission) => {
      if (!submission.manuscriptUrl || !submission.manuscriptUrl.startsWith("/uploads/manuscripts/")) {
        return;
      }

      try {
        const fileOnlyUrl = submission.manuscriptUrl.split("?")[0] ?? submission.manuscriptUrl;
        const relativeFilePath = fileOnlyUrl.replace(/^\//, "");
        const absoluteFilePath = path.join(process.cwd(), "public", relativeFilePath);
        const fileStats = await stat(absoluteFilePath);

        manuscriptMetaBySubmissionId.set(submission.id, {
          type: getFileTypeLabel(absoluteFilePath),
          size: formatFileSize(fileStats.size),
        });
      } catch {
        return;
      }
    }),
  );

  async function createSubmission(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!createAllowedRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const journalId = String(formData.get("journalId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const abstract = String(formData.get("abstract") ?? "").trim();
    const keywordInput = String(formData.get("keywords") ?? "").trim();
    const funding = String(formData.get("funding") ?? "").trim();
    const license = String(formData.get("license") ?? "").trim();
    const language = String(formData.get("language") ?? "en").trim();
    const contributorsData = String(formData.get("contributorsData") ?? "").trim();
    const manuscriptFile = formData.get("manuscriptFile");

    if (!journalId || !title || !abstract) {
      return;
    }

    const keywords = keywordInput
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    let contributors: Array<{
      givenName: string;
      familyName: string;
      email?: string;
      affiliation?: string;
      orcid?: string;
      role: string;
      isPrimary: boolean;
      sequence: number;
    }> = [];

    try {
      if (contributorsData) {
        contributors = JSON.parse(contributorsData);
      }
    } catch {
      contributors = [];
    }

    let manuscriptUrl: string | null = null;

    if (manuscriptFile instanceof File && manuscriptFile.size > 0) {
      const maxBytes = 10 * 1024 * 1024;

      if (manuscriptFile.size > maxBytes) {
        return;
      }

      const originalName = manuscriptFile.name || "manuscript";
      const safeOriginalName = path.basename(originalName).trim();
      const extension = path.extname(originalName).toLowerCase();
      const allowedExtensions = new Set([".pdf", ".doc", ".docx"]);

      if (!allowedExtensions.has(extension)) {
        return;
      }

      const uploadsDir = path.join(process.cwd(), "public", "uploads", "manuscripts");
      await mkdir(uploadsDir, { recursive: true });

      const fileName = `${Date.now()}-${randomUUID()}${extension}`;
      const filePath = path.join(uploadsDir, fileName);
      const fileBuffer = Buffer.from(await manuscriptFile.arrayBuffer());

      await writeFile(filePath, fileBuffer);
      const filenameQuery = safeOriginalName ? `?name=${encodeURIComponent(safeOriginalName)}` : "";
      manuscriptUrl = `/uploads/manuscripts/${fileName}${filenameQuery}`;
    }

    await prisma.submission.create({
      data: {
        journalId,
        authorId: currentSession.user.id,
        title,
        abstract,
        keywords,
        manuscriptUrl,
        funding: funding || null,
        license: license || null,
        language,
        status: "SUBMITTED",
        submittedAt: new Date(),
        contributors: {
          create: contributors.map((c, idx) => ({
            givenName: c.givenName,
            familyName: c.familyName,
            email: c.email || null,
            affiliation: c.affiliation || null,
            orcid: c.orcid || null,
            role: c.role as "AUTHOR" | "TRANSLATOR" | "EDITOR",
            isPrimary: c.isPrimary,
            sequence: idx,
          })),
        },
      },
    });

    // Get the journal and editors for notifications
    const journal = await prisma.journal.findUnique({
      where: { id: journalId },
      include: {
        editor: true,
      },
    });

    if (journal) {
      // Create notification for the journal editor
      await prisma.notification.create({
        data: {
          userId: journal.editorId,
          type: "SUBMISSION_CREATED",
          title: "New Submission",
          message: `New submission "${title}" by ${currentSession.user.name} to ${journal.name}`,
          link: "/dashboard/submissions",
        },
      });

      // Send email to the editor
      try {
        await sendSubmissionNotificationEmail(
          journal.editor.email,
          journal.editor.name,
          title,
          currentSession.user.name,
          journal.name,
          journalId
        );
      } catch (error) {
        console.error("[Submission] Failed to send notification email:", error);
      }
    }

    revalidatePath("/dashboard/submissions");
  }

  async function updateSubmissionStatus(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!statusManageRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const submissionId = String(formData.get("submissionId") ?? "").trim();
    const nextStatus = String(formData.get("status") ?? "").trim() as SubmissionStatusValue;

    if (!submissionId || !editableStatuses.includes(nextStatus)) {
      return;
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: nextStatus,
      },
    });

    revalidatePath("/dashboard/submissions");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Submission module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Submission management</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
              Create manuscript submissions and monitor status workflow.
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
          <DashboardSidebar role={session.user.role} currentPath="/dashboard/submissions" />

          <div className="space-y-8">
            {canCreateSubmission ? (
              <section id="new-submission" className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-yellow-50">Create submission</h2>

            {journals.length === 0 ? (
              <p className="mt-4 text-sm text-yellow-100/85">No journals available yet. Ask admin to create journals first.</p>
            ) : (
              <form action={createSubmission} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                  Journal
                  <select
                    name="journalId"
                    required
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                  >
                    {journals.map((journal) => (
                      <option key={journal.id} value={journal.id}>
                        {journal.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                  Title
                  <input
                    type="text"
                    name="title"
                    required
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                    placeholder="Effects of ..."
                  />
                </label>

                <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                  Abstract
                  <textarea
                    name="abstract"
                    required
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                    placeholder="Write the manuscript abstract"
                  />
                </label>

                <label className="block text-sm font-medium text-yellow-100">
                  Keywords (comma-separated)
                  <input
                    type="text"
                    name="keywords"
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                    placeholder="nursing, care, education"
                  />
                </label>

                <label className="block text-sm font-medium text-yellow-100">
                  Language
                  <select
                    name="language"
                    defaultValue="en"
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                  >
                    <option value="en">English</option>
                    <option value="tl">Filipino</option>
                    <option value="ceb">Cebuano</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                  Funding (optional)
                  <textarea
                    name="funding"
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                    placeholder="Funding sources, grant numbers, or acknowledgments"
                  />
                </label>

                <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                  License (optional)
                  <input
                    type="text"
                    name="license"
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                    placeholder="CC BY 4.0, All Rights Reserved, etc."
                  />
                </label>

                <ContributorFields />

                <label className="block text-sm font-medium text-yellow-100">
                  Upload manuscript (PDF/DOC/DOCX)
                  <input
                    type="file"
                    name="manuscriptFile"
                    accept=".pdf,.doc,.docx"
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 file:mr-3 file:rounded-md file:border-0 file:bg-yellow-400 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-red-950 outline-none ring-yellow-400 focus:ring-2"
                  />
                  <span className="mt-1 block text-xs text-yellow-200/80">Max file size: 10MB</span>
                </label>

                <div className="sm:col-span-2">
                  <button
                    data-preloader="on"
                    type="submit"
                    className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                  >
                    Submit manuscript
                  </button>
                </div>
              </form>
            )}
              </section>
            ) : (
              <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-yellow-50">Create submission</h2>
                <p className="mt-3 text-sm text-yellow-100/85">Only author accounts can create a new submission. You can still view and manage submission records based on your role permissions.</p>
              </section>
            )}

            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Submissions ({submissions.length})</h2>

          {submissions.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No submissions found for your role.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-yellow-500/40 text-left">
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 pr-4 font-medium">Journal</th>
                    <th className="py-2 pr-4 font-medium">Author</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Latest decision</th>
                    <th className="py-2 pr-4 font-medium">Submitted</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => {
                    const latestDecision = submission.decisions[0];

                    return (
                      <tr key={submission.id} className="border-b border-yellow-500/20 align-top">
                        <td className="py-2 pr-4">
                          <p className="font-medium">{submission.title}</p>
                          <p className="mt-1 text-xs text-yellow-200/80">
                            {submission.keywords.length > 0 ? submission.keywords.join(", ") : "No keywords"}
                          </p>
                        </td>
                        <td className="py-2 pr-4">{submission.journal.name}</td>
                        <td className="py-2 pr-4">{submission.author.name || submission.author.email}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded-full bg-red-800 px-2.5 py-1 text-xs font-medium text-yellow-100">{submission.status}</span>
                        </td>
                        <td className="py-2 pr-4">
                          {latestDecision ? (
                            <div>
                              <p className="text-xs font-medium">{latestDecision.status}</p>
                              <p className="mt-1 text-xs text-yellow-200/80">
                                {new Date(latestDecision.decidedAt).toLocaleString()} · by {latestDecision.decidedBy.name || latestDecision.decidedBy.email}
                              </p>
                              {latestDecision.notes ? (
                                <p className="mt-1 text-xs text-yellow-100/85">{latestDecision.notes}</p>
                              ) : null}

                              {submission.decisions.length > 1 ? (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-xs font-medium text-yellow-100/85">
                                    View full timeline ({submission.decisions.length})
                                  </summary>
                                  <ul className="mt-2 space-y-2">
                                    {submission.decisions.map((decision) => (
                                      <li key={decision.id} className="rounded-md border border-yellow-500/30 p-2">
                                        <p className="text-xs font-medium">{decision.status}</p>
                                        <p className="mt-1 text-xs text-yellow-200/80">
                                          {new Date(decision.decidedAt).toLocaleString()} · by {decision.decidedBy.name || decision.decidedBy.email}
                                        </p>
                                        {decision.notes ? (
                                          <p className="mt-1 text-xs text-yellow-100/85">{decision.notes}</p>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-yellow-200/70">No decision yet</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-yellow-200/80">
                          {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-col gap-2">
                            {submission.manuscriptUrl ? (
                              <div>
                                <a
                                  href={submission.manuscriptUrl}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex w-fit rounded-lg border border-yellow-400/70 px-2.5 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                                >
                                  Download {getOriginalFilenameFromUrl(submission.manuscriptUrl)}
                                </a>
                                {manuscriptMetaBySubmissionId.get(submission.id) ? (
                                  <p className="mt-1 text-xs text-yellow-200/80">
                                    {manuscriptMetaBySubmissionId.get(submission.id)?.type} · {manuscriptMetaBySubmissionId.get(submission.id)?.size}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-yellow-200/70">No manuscript file</span>
                            )}

                            {canManageStatus ? (
                              <form action={updateSubmissionStatus} className="flex items-center gap-2">
                                <input type="hidden" name="submissionId" value={submission.id} />
                                <select
                                  name="status"
                                  defaultValue={submission.status}
                                  className="rounded-lg border border-yellow-500/40 bg-red-950 px-2 py-1.5 text-xs text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                                >
                                  {editableStatuses.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  data-preloader="on"
                                  type="submit"
                                  className="rounded-lg border border-yellow-400/70 px-2.5 py-1.5 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                                >
                                  Update
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
