import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

type ReviewRecommendationValue = "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT";

const recommendationOptions: ReviewRecommendationValue[] = ["ACCEPT", "MINOR_REVISION", "MAJOR_REVISION", "REJECT"];
const canAssignRoles = new Set(["ADMIN", "EDITOR"]);

export default async function ReviewsManagementPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const canAssign = canAssignRoles.has(role);

  const reviewers = canAssign
    ? await prisma.user.findMany({
        where: { role: "REVIEWER" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      })
    : [];

  const assignableSubmissions = canAssign
    ? await prisma.submission.findMany({
        include: {
          journal: { select: { id: true, name: true } },
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const reviews = await prisma.review.findMany({
    where:
      role === "REVIEWER"
        ? { reviewerId: session.user.id }
        : role === "AUTHOR"
          ? { submission: { authorId: session.user.id } }
          : undefined,
    include: {
      submission: {
        select: {
          id: true,
          title: true,
          status: true,
          journal: { select: { id: true, name: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      },
      reviewer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  async function assignReviewer(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!canAssignRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const submissionId = String(formData.get("submissionId") ?? "").trim();
    const reviewerId = String(formData.get("reviewerId") ?? "").trim();

    if (!submissionId || !reviewerId) {
      return;
    }

    try {
      await prisma.review.create({
        data: {
          submissionId,
          reviewerId,
        },
      });

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: "UNDER_REVIEW" },
      });
    } catch {
      return;
    }

    revalidatePath("/dashboard/reviews");
    revalidatePath("/dashboard/submissions");
  }

  async function submitReview(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (currentSession.user.role !== "REVIEWER") {
      redirect("/forbidden");
    }

    const reviewId = String(formData.get("reviewId") ?? "").trim();
    const recommendation = String(formData.get("recommendation") ?? "").trim() as ReviewRecommendationValue;
    const scoreRaw = String(formData.get("score") ?? "").trim();
    const commentsToAuthor = String(formData.get("commentsToAuthor") ?? "").trim();
    const commentsToEditor = String(formData.get("commentsToEditor") ?? "").trim();

    if (!reviewId || !recommendationOptions.includes(recommendation)) {
      return;
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, reviewerId: true },
    });

    if (!review || review.reviewerId !== currentSession.user.id) {
      redirect("/forbidden");
    }

    const parsedScore = Number.parseInt(scoreRaw, 10);
    const score = Number.isNaN(parsedScore) ? null : Math.max(1, Math.min(5, parsedScore));

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        recommendation,
        score,
        commentsToAuthor: commentsToAuthor || null,
        commentsToEditor: commentsToEditor || null,
        submittedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/reviews");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Peer review module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Reviewer assignment and workload</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
              Assign reviewers and submit recommendations across review rounds.
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
            {canAssign ? (
              <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-yellow-50">Assign reviewer</h2>

            {assignableSubmissions.length === 0 || reviewers.length === 0 ? (
              <p className="mt-4 text-sm text-yellow-100/85">
                Add submissions and reviewer accounts first to start assignments.
              </p>
            ) : (
              <form action={assignReviewer} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-yellow-100">
                  Submission
                  <select
                    name="submissionId"
                    required
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                  >
                    {assignableSubmissions.map((submission) => (
                      <option key={submission.id} value={submission.id}>
                        {submission.title} ({submission.journal.name})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-yellow-100">
                  Reviewer
                  <select
                    name="reviewerId"
                    required
                    className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                  >
                    {reviewers.map((reviewer) => (
                      <option key={reviewer.id} value={reviewer.id}>
                        {reviewer.name || reviewer.email}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="sm:col-span-2">
                  <button
                    data-preloader="on"
                    type="submit"
                    className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                  >
                    Assign reviewer
                  </button>
                </div>
              </form>
            )}
              </section>
            ) : null}

            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Review assignments ({reviews.length})</h2>

          {reviews.length === 0 ? (
            <p className="mt-4 text-sm text-yellow-100/85">No review assignments found.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-yellow-500/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{review.submission.title}</h3>
                      <p className="text-sm text-yellow-100/85">
                        Journal: {review.submission.journal.name} · Author: {review.submission.author.name || review.submission.author.email}
                      </p>
                      <p className="mt-1 text-xs text-yellow-200/80">
                        Reviewer: {review.reviewer.name || review.reviewer.email} · Status: {review.submission.status}
                      </p>
                    </div>

                    <span className="rounded-full bg-red-800 px-2.5 py-1 text-xs font-medium text-yellow-100">
                      {review.submittedAt ? "Submitted" : "Pending"}
                    </span>
                  </div>

                  {role === "REVIEWER" ? (
                    <form action={submitReview} className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="reviewId" value={review.id} />

                      <label className="block text-sm font-medium text-yellow-100">
                        Recommendation
                        <select
                          name="recommendation"
                          defaultValue={review.recommendation ?? "MAJOR_REVISION"}
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                        >
                          {recommendationOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm font-medium text-yellow-100">
                        Score (1-5)
                        <input
                          type="number"
                          min={1}
                          max={5}
                          name="score"
                          defaultValue={review.score ?? ""}
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                        />
                      </label>

                      <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                        Comments to author
                        <textarea
                          name="commentsToAuthor"
                          rows={3}
                          defaultValue={review.commentsToAuthor ?? ""}
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                        />
                      </label>

                      <label className="block text-sm font-medium text-yellow-100 sm:col-span-2">
                        Comments to editor
                        <textarea
                          name="commentsToEditor"
                          rows={3}
                          defaultValue={review.commentsToEditor ?? ""}
                          className="mt-1 w-full rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                        />
                      </label>

                      <div className="sm:col-span-2">
                        <button
                          data-preloader="on"
                          type="submit"
                          className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                        >
                          Submit review
                        </button>
                      </div>
                    </form>
                  ) : null}
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
