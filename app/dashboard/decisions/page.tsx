import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

type DecisionStatus = "REVISION_REQUIRED" | "ACCEPTED" | "REJECTED";

const decisionStatuses: DecisionStatus[] = ["REVISION_REQUIRED", "ACCEPTED", "REJECTED"];
const decisionRoles = new Set(["ADMIN", "EDITOR"]);

export default async function EditorialDecisionPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!decisionRoles.has(session.user.role)) {
    redirect("/forbidden");
  }

  const submissions = await prisma.submission.findMany({
    include: {
      journal: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, email: true } },
      reviews: {
        select: {
          id: true,
          recommendation: true,
          score: true,
          submittedAt: true,
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
      updatedAt: "desc",
    },
  });

  async function recordDecision(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!decisionRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const submissionId = String(formData.get("submissionId") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim() as DecisionStatus;
    const notes = String(formData.get("notes") ?? "").trim();

    if (!submissionId || !decisionStatuses.includes(status)) {
      return;
    }

    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submissionId },
        data: { status },
      }),
      prisma.editorialDecision.create({
        data: {
          submissionId,
          decidedById: currentSession.user.id,
          status,
          notes: notes || null,
          decidedAt: new Date(),
        },
      }),
    ]);

    revalidatePath("/dashboard/decisions");
    revalidatePath("/dashboard/submissions");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Editorial module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Editorial decisions</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
              Record accept/reject/revision decisions with notes and timestamp history.
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

          <div>
            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Submissions ready for decisions ({submissions.length})</h2>

          {submissions.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No submissions available.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {submissions.map((submission) => {
                const submittedReviews = submission.reviews.filter((review) => !!review.submittedAt);

                return (
                  <article key={submission.id} className="rounded-xl border border-yellow-500/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold">{submission.title}</h3>
                        <p className="text-sm text-yellow-100/85">
                          Journal: {submission.journal.name} · Author: {submission.author.name || submission.author.email}
                        </p>
                        <p className="mt-1 text-xs text-yellow-200/80">
                          Current status: {submission.status} · Submitted reviews: {submittedReviews.length}
                        </p>
                      </div>

                      <form action={recordDecision} className="grid w-full max-w-md gap-2 sm:grid-cols-2">
                        <input type="hidden" name="submissionId" value={submission.id} />

                        <select
                          name="status"
                          defaultValue="REVISION_REQUIRED"
                          className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                        >
                          {decisionStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <button
                          data-preloader="on"
                          type="submit"
                          className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                        >
                          Record decision
                        </button>

                        <textarea
                          name="notes"
                          rows={3}
                          className="sm:col-span-2 rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                          placeholder="Decision notes for the editorial log"
                        />
                      </form>
                    </div>

                    <div className="mt-4 rounded-lg bg-red-800/70 p-3">
                      <h4 className="text-sm font-semibold">Decision history</h4>

                      {submission.decisions.length === 0 ? (
                        <p className="mt-2 text-xs text-yellow-200/80">No decisions recorded yet.</p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-xs">
                          {submission.decisions.map((decision) => (
                            <li key={decision.id} className="rounded-md border border-yellow-500/30 p-2">
                              <p className="font-medium">
                                {decision.status} · {new Date(decision.decidedAt).toLocaleString()} · by {decision.decidedBy.name || decision.decidedBy.email}
                              </p>
                              {decision.notes ? (
                                <p className="mt-1 text-yellow-100/85">{decision.notes}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
