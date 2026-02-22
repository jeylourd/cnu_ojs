import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { prisma } from "@/lib/prisma";

type GalleyTypeValue = "PDF" | "HTML" | "XML" | "EPUB" | "OTHER";

const galleyTypes: GalleyTypeValue[] = ["PDF", "HTML", "XML", "EPUB", "OTHER"];
const productionRoles = new Set(["ADMIN", "EDITOR"]);

export default async function ProductionPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!productionRoles.has(session.user.role)) {
    redirect("/forbidden");
  }

  const submissions = await prisma.submission.findMany({
    where: {
      status: {
        in: ["ACCEPTED", "PUBLISHED"],
      },
    },
    include: {
      journal: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, email: true } },
      galleys: {
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  async function uploadGalley(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!productionRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const submissionId = String(formData.get("submissionId") ?? "").trim();
    const label = String(formData.get("label") ?? "").trim();
    const type = String(formData.get("type") ?? "PDF").trim() as GalleyTypeValue;
    const galleyFile = formData.get("galleyFile");

    if (!submissionId || !label || !galleyFile) {
      return;
    }

    if (!(galleyFile instanceof File) || galleyFile.size === 0) {
      return;
    }

    const maxBytes = 20 * 1024 * 1024;

    if (galleyFile.size > maxBytes) {
      return;
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "galleys");
    await mkdir(uploadsDir, { recursive: true });

    const extension = path.extname(galleyFile.name).toLowerCase();
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const filePath = path.join(uploadsDir, fileName);
    const fileBuffer = Buffer.from(await galleyFile.arrayBuffer());

    await writeFile(filePath, fileBuffer);

    const currentGalleys = await prisma.galley.findMany({
      where: { submissionId },
      orderBy: { sequence: "desc" },
      take: 1,
    });

    const nextSequence = currentGalleys.length > 0 ? currentGalleys[0].sequence + 1 : 0;

    await prisma.galley.create({
      data: {
        submissionId,
        label,
        type,
        fileUrl: `/uploads/galleys/${fileName}`,
        sequence: nextSequence,
      },
    });

    revalidatePath("/dashboard/production");
  }

  async function deleteGalley(formData: FormData) {
    "use server";

    const currentSession = await auth();

    if (!currentSession?.user) {
      redirect("/login");
    }

    if (!productionRoles.has(currentSession.user.role)) {
      redirect("/forbidden");
    }

    const galleyId = String(formData.get("galleyId") ?? "").trim();

    if (!galleyId) {
      return;
    }

    await prisma.galley.delete({
      where: { id: galleyId },
    });

    revalidatePath("/dashboard/production");
  }

  return (
    <main className="min-h-screen bg-red-950 px-6 py-10 text-yellow-100 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-yellow-500/50 bg-red-900 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Image src="/CNU-Logo.png" alt="Cebu Normal University logo" width={56} height={56} className="rounded-full border border-yellow-400/60" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Production module</p>
              <h1 className="mt-2 text-2xl font-semibold text-yellow-50">Galley &amp; production management</h1>
              <p className="mt-2 text-sm text-yellow-100/85">
                Upload production-ready files (PDF, HTML, XML) for accepted manuscripts.
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
          <DashboardSidebar role={session.user.role} currentPath="/dashboard/production" />

          <div>
            <section className="rounded-2xl border border-yellow-500/40 bg-red-900 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-yellow-50">Accepted submissions ({submissions.length})</h2>

              {submissions.length === 0 ? (
                <p className="mt-4 text-sm text-yellow-100/85">No accepted manuscripts ready for production.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {submissions.map((submission) => (
                    <article key={submission.id} className="rounded-xl border border-yellow-500/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold">{submission.title}</h3>
                          <p className="text-sm text-yellow-100/85">
                            Journal: {submission.journal.name} · Author: {submission.author.name || submission.author.email}
                          </p>
                          <p className="mt-1 text-xs text-yellow-200/80">
                            Status: {submission.status} · DOI: {submission.doi || "Not assigned"}
                          </p>
                        </div>

                        <form action={uploadGalley} className="grid w-full max-w-md gap-2 sm:grid-cols-2">
                          <input type="hidden" name="submissionId" value={submission.id} />

                          <input
                            type="text"
                            name="label"
                            required
                            placeholder="Label (e.g., PDF, HTML)"
                            className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                          />

                          <select
                            name="type"
                            required
                            className="rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 outline-none ring-yellow-400 focus:ring-2"
                          >
                            {galleyTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>

                          <input
                            type="file"
                            name="galleyFile"
                            required
                            className="sm:col-span-2 rounded-lg border border-yellow-500/40 bg-red-950 px-3 py-2 text-sm text-yellow-100 file:mr-3 file:rounded-md file:border-0 file:bg-yellow-400 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-red-950 outline-none ring-yellow-400 focus:ring-2"
                          />

                          <button
                            data-preloader="on"
                            type="submit"
                            className="sm:col-span-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-yellow-300"
                          >
                            Upload galley
                          </button>
                        </form>
                      </div>

                      {submission.galleys.length > 0 ? (
                        <div className="mt-4 rounded-lg bg-red-800/70 p-3">
                          <h4 className="text-sm font-semibold">Galleys ({submission.galleys.length})</h4>
                          <ul className="mt-2 space-y-2 text-xs">
                            {submission.galleys.map((galley) => (
                              <li key={galley.id} className="flex items-center justify-between rounded-md border border-yellow-500/30 p-2">
                                <div>
                                  <p className="font-medium">
                                    {galley.label} ({galley.type})
                                  </p>
                                  <a
                                    href={galley.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-yellow-300 underline hover:text-yellow-200"
                                  >
                                    Download
                                  </a>
                                </div>
                                <form action={deleteGalley}>
                                  <input type="hidden" name="galleyId" value={galley.id} />
                                  <button
                                    data-preloader="on"
                                    type="submit"
                                    className="rounded-lg border border-yellow-400/70 px-2 py-1 text-xs font-medium text-yellow-100 transition hover:bg-red-800"
                                  >
                                    Delete
                                  </button>
                                </form>
                              </li>
                            ))}
                          </ul>
                        </div>
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
