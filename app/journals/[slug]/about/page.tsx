import { notFound } from "next/navigation";

import { JournalPublicNav } from "@/components/journals/JournalPublicNav";
import { prisma } from "@/lib/prisma";

type JournalAboutPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JournalAboutPage({ params }: JournalAboutPageProps) {
  const { slug } = await params;

  const journal = await prisma.journal.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      issn: true,
      editor: {
        select: {
          name: true,
          email: true,
        },
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
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">About</p>
              <h1 className="mt-1 text-2xl font-semibold text-yellow-50 sm:text-3xl">{journal.name}</h1>
            </div>

            <JournalPublicNav slug={journal.slug} active="ABOUT" />
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-500/40 bg-red-900/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-yellow-100">Journal Information</h2>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-yellow-500/30 p-4">
              <dt className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">Journal Name</dt>
              <dd className="mt-1 text-sm text-yellow-100">{journal.name}</dd>
            </div>
            <div className="rounded-xl border border-yellow-500/30 p-4">
              <dt className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">ISSN</dt>
              <dd className="mt-1 text-sm text-yellow-100">{journal.issn || "Not provided"}</dd>
            </div>
            <div className="rounded-xl border border-yellow-500/30 p-4 sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">Description and Scope</dt>
              <dd className="mt-1 text-sm leading-6 text-yellow-100/85">
                {journal.description || "No description provided yet."}
              </dd>
            </div>
            <div className="rounded-xl border border-yellow-500/30 p-4 sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.12em] text-yellow-200/80">Editorial Contact</dt>
              <dd className="mt-1 text-sm text-yellow-100/85">{journal.editor.name || journal.editor.email}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
